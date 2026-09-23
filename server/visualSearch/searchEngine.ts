/**
 * Atlas Visual Product Search — Search Engine (Decision Core)
 * ---------------------------------------------------------------------------
 * خط لوله‌ی کامل جستجو (طبق نقشه راه §۳ و §۸):
 *
 *   عکس کاربر
 *     ↓ نرمال‌سازی و پردازش تصویر (بدون هیچ وابستگی به نام فایل)
 *     ↓ استخراج ویژگی بصری + Embedding (۴ نما)
 *     ↓ جستجوی برداری (kNN) در انبار برداری
 *     ↓ گروه‌بندی نتایج بر اساس Product ID + انتخاب بهترین تصویر هر محصول
 *     ↓ رتبه‌بندی مجدد بصری (Re-ranking ساختاری + تأیید AI اختیاری)
 *     ↓ تصمیم نهایی: EXACT / SIMILAR / NO_MATCH
 *     ↓ خروجی فرانت‌اند (بدون هیچ درصد شباهتی)
 */

import crypto from 'crypto';
import type {
  DecisionTrace,
  EmbeddingView,
  ImageSignature,
  ProductRecord,
  SearchQueryVector,
  VectorSearchHit,
  VisualSearchItem,
  VisualSearchResponse,
  VisualSearchSettings,
} from './types';
import { getEmbeddingProvider } from './embeddingProviders';
import { getVectorStore } from './vectorStore';
import { hammingDistance } from './visualEncoder';
import { loadProductRecords } from './catalog';
import { getAllSignatures, getSignaturesForProduct, isReady } from './indexManager';
import { getSettings } from './store';
import {
  type PairVerification,
  type VisualVerifier,
  createVerifier,
  isAiVerificationConfigured,
  prepareVerificationJpeg,
  structureAgreement,
  verifyNearDuplicate,
  DUPLICATE_MARGIN_RATIO,
} from './verifier';
import fs from 'fs';
import { buildThumbnail, toDataUrl } from './imagePreprocess';

/**
 * وزن‌های پیش‌فرض ترکیب سیگنال‌ها (کالیبره‌شده روی مجموعه‌ی آزمایشی اطلس).
 * قابل بازتعریف با متغیر محیطی VISUAL_SEARCH_WEIGHTS به شکل "v,s,h".
 */
export const FUSION_WEIGHTS = (() => {
  const raw = process.env.VISUAL_SEARCH_WEIGHTS;
  if (raw) {
    const parts = raw.split(',').map(Number);
    if (parts.length === 3 && parts.every(n => Number.isFinite(n) && n >= 0)) {
      const sum = parts[0] + parts[1] + parts[2] || 1;
      return { vector: parts[0] / sum, structure: parts[1] / sum, hash: parts[2] / sum };
    }
  }
  return { vector: 0.32, structure: 0.34, hash: 0.34 };
})();

export interface SearchOptions {
  /** تصویر کاربر به‌صورت dataURL یا base64 خام — نام فایل هرگز ارسال/استفاده نمی‌شود */
  imageBase64: string;
  verifier?: VisualVerifier;
  settings?: VisualSearchSettings;
  /** بازتعریف وزن‌های ترکیب سیگنال‌ها (فقط برای کالیبراسیون/پنل مدیریت) */
  weights?: { vector: number; structure: number; hash: number };
  /** فقط برای پنل مدیریت/کالیبراسیون: دریافت فهرست داخلی کاندیداها و امتیازها */
  onCandidates?: (rows: {
    sku: string;
    name: string;
    vectorScore: number;
    structureScore: number;
    hashSimilarity: number;
    combined: number;
    exact: boolean;
  }[]) => void;
}

interface Candidate {
  product: ProductRecord;
  hit: VectorSearchHit;
  signature?: ImageSignature;
  vectorScore: number;
  structureScore: number;
  /** شباهت مبتنی بر هش ادراکی — سیگنال تمایزدهنده‌ی محلی و غیراشباع */
  hashSimilarity: number;
  combined: number;
  pair?: PairVerification;
  secondOpinion?: boolean;
  exact: boolean;
  exactPath: DecisionTrace['exactPath'];
  rationale: string;
}

/** جمله‌های فارسی «بدون عدد» برای توضیح دلیل پیشنهاد */
const REASON_EXACT_STRUCTURE = 'تصویر ارسالی شما با تصویر این کالا در کاتالوگ اطلس منطبق است.';
const REASON_EXACT_AI = 'ظاهر، هندسه و ساختار این قطعه با تصویر این کالا در کاتالوگ اطلس منطبق است.';

function reasonForSimilar(c: Candidate): string {
  if (c.pair?.verdict === 'very_similar' && c.pair.rationale) {
    return 'هم‌خانواده و بسیار نزدیک از نظر شکل و ساختار با قطعه‌ی شما.';
  }
  if (c.structureScore >= 0.75) {
    return 'فرم و ساختار کلی این کالا با قطعه‌ی شما بسیار نزدیک است.';
  }
  return 'از نظر ظاهر و کاربرد صنعتی، گزینه‌ای نزدیک به قطعه‌ی شما است.';
}

function toItem(product: ProductRecord, reason: string): VisualSearchItem {
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    categoryName: product.categoryName,
    subcategory: product.subcategory,
    productUrl: product.productUrl,
    imageUrl: product.mainImageUrl,
    stock: product.stock,
    price: product.price,
    inquiryOnly: product.inquiryOnly,
    customOrderAvailable: product.customOrderAvailable,
    cataloguePage: product.cataloguePage,
    forzaCode: product.forzaCode,
    reason,
  };
}

function readCatalogImageBuffer(hit: VectorSearchHit): Buffer | null {
  try {
    if (!hit.imagePath || !fs.existsSync(hit.imagePath)) return null;
    return fs.readFileSync(hit.imagePath);
  } catch {
    return null;
  }
}

/**
 * جستجوی بصری کامل.
 * خروجی: پاسخ آماده برای کاربر با یکی از سه وضعیت EXACT / SIMILAR / NO_MATCH.
 */
export async function searchByImage(options: SearchOptions): Promise<{
  response: VisualSearchResponse;
  trace: DecisionTrace;
  thumbnail: string;
}> {
  const settings = options.settings || getSettings();
  const totalStart = Date.now();

  const baseResponse = (partial: Partial<VisualSearchResponse>): VisualSearchResponse => ({
    success: true,
    resultType: 'NO_MATCH',
    message: '',
    similarMatches: [],
    queryId: '',
    aiAssisted: false,
    ...partial,
  });

  const trace: DecisionTrace = {
    retrievalTimeMs: 0,
    decisionTimeMs: 0,
    totalTimeMs: 0,
    candidateCount: 0,
    verifiedCount: 0,
    aiVerificationUsed: false,
    bestInternalScore: 0,
    exactPath: 'none',
    downgrades: 0,
    notes: [],
  };

  // ۰) موتور باید آماده باشد
  if (!isReady()) {
    return {
      response: baseResponse({
        success: false,
        message: 'موتور جستجوی تصویری در حال آماده‌سازی است. لطفاً چند لحظه بعد دوباره تلاش کنید.',
        error: 'INDEX_NOT_READY',
      }),
      trace,
      thumbnail: '',
    };
  }

  // ۱) پردازش تصویر + استخراج ویژگی (نام فایل هیچ نقشی ندارد)
  const rawBuffer = await decodeUserImage(options.imageBase64);
  const thumbnail = await buildThumbnail(rawBuffer, 150);

  const provider = getEmbeddingProvider();
  const providerAny = provider as unknown as {
    analyzeVariants?: (b: Buffer) => Promise<{ view: EmbeddingView; signature: ImageSignature }[]>;
  };
  const variants = providerAny.analyzeVariants
    ? await providerAny.analyzeVariants(rawBuffer)
    : [{ view: 'full' as EmbeddingView, signature: await provider.analyzeImage(rawBuffer) }];

  const queryVectors: SearchQueryVector[] = variants.map(v => ({
    view: v.view,
    vector: v.signature.embedding,
  }));
  /** امضای پرس‌وجو به تفکیک نما — برای انطباق ساختاری چندنما (مقاوم به چرخش/آینه) */
  const querySignatures = new Map<EmbeddingView, ImageSignature>();
  for (const v of variants) querySignatures.set(v.view, v.signature);

  // ۲) بازیابی (Retrieval): بهترین بردار هر محصول — بدون برش زودهنگام
  const retrievalStart = Date.now();
  const store = getVectorStore();
  const hits = await store.bestByProduct(queryVectors, 2000);
  trace.retrievalTimeMs = Date.now() - retrievalStart;

  if (hits.length === 0) {
    return {
      response: baseResponse({
        resultType: 'NO_MATCH',
        message: 'محصول موردنظر شما در کاتالوگ ما پیدا نشد.',
        subMessage:
          'در صورت نیاز، امکان بررسی ساخت یا تأمین محصول موردنظر شما به‌صورت سفارشی وجود دارد.',
        customRequest: customRequestBlock(),
        queryId: '',
      }),
      trace,
      thumbnail,
    };
  }

  // ۳) گروه‌بندی بر اساس Product ID (بهترین بردار هر محصول از قبل انتخاب شده)
  const products = loadProductRecords();
  const byId = new Map(products.map(p => [p.id, p]));
  const bestPerProduct = new Map<string, VectorSearchHit>();
  for (const hit of hits) {
    const prev = bestPerProduct.get(hit.productId);
    if (!prev || hit.similarity > prev.similarity) bestPerProduct.set(hit.productId, hit);
  }
  trace.candidateCount = bestPerProduct.size;
  trace.notes.push(`بازیابی: ${bestPerProduct.size} محصول با شباهت برداری مقدماتی.`);

  // ۴) رتبه‌بندی مجدد بصری (Re-ranking)
  const decisionStart = Date.now();
  const candidates: Candidate[] = [];
  const allSignatures = getAllSignatures();
  const emptyHit = (productId: string): VectorSearchHit => ({
    id: `${productId}::none`,
    productId,
    imagePath: '',
    imageUrl: '',
    imageType: 'catalog',
    view: 'full',
    similarity: 0,
  });
  for (const product of products) {
    const productId = product.id;
    const hit = bestPerProduct.get(productId) || emptyHit(productId);

    // امتیاز ساختاری و هش: بهترین انطباق بین «همه‌ی نماهای پرس‌وجو» و «همه‌ی نماهای کالا»
    // (مقاوم به چرخش ۹۰ درجه، آینه و تفاوت پس‌زمینه)
    const catalogSignatures = allSignatures[productId] || {};
    let structureScore = 0;
    let bestHashDistance = Number.MAX_SAFE_INTEGER;
    for (const qSig of querySignatures.values()) {
      for (const cSig of Object.values(catalogSignatures)) {
        if (!cSig) continue;
        const score = structureAgreement(qSig.structure, cSig.structure);
        if (score > structureScore) structureScore = score;

        // فاصله‌ی ترکیبی هش‌های ادراکی (نرمال‌شده) — سیگنالی که برخلاف شباهت
        // کسینوسی اشباع نمی‌شود و برای تمایز کالاهای بسیار شبیه حیاتی است.
        const dHash = hammingDistance(qSig.dHash, cSig.dHash) / 256;
        const pHash = hammingDistance(qSig.pHash, cSig.pHash) / 64;
        const dist = 0.6 * dHash + 0.4 * pHash;
        if (dist < bestHashDistance) bestHashDistance = dist;
      }
    }
    const hashSimilarity = bestHashDistance === Number.MAX_SAFE_INTEGER ? 0 : Math.max(0, 1 - bestHashDistance);

    const vectorScore = Math.max(0, Math.min(1, hit.similarity));
    // ترکیب سه سیگنال مستقل: بردار بصری + ساختار هندسی + هش ادراکی
    // (وزن‌ها کالیبره‌شده‌اند: شباهت برداری روی کاتالوگ‌های هم‌خانواده اشباع
    //  می‌شود، در حالی که ساختار و هش قدرت تمایز بیشتری دارند.)
    const w = options.weights ?? FUSION_WEIGHTS;
    const combined = w.vector * vectorScore + w.structure * structureScore + w.hash * hashSimilarity;

    candidates.push({
      product,
      hit,
      vectorScore,
      structureScore,
      hashSimilarity,
      combined,
      exact: false,
      exactPath: 'none',
      rationale: '',
    });
  }

  candidates.sort((a, b) => b.combined - a.combined);
  const ranked = candidates.filter(c => c.combined >= settings.candidateScoreFloor || c.vectorScore >= 0.6);
  trace.bestInternalScore = Number((candidates[0]?.combined || 0).toFixed(4));

  options.onCandidates?.(
    candidates.slice(0, 10).map(c => ({
      sku: c.product.sku,
      name: c.product.name,
      vectorScore: Number(c.vectorScore.toFixed(4)),
      structureScore: Number(c.structureScore.toFixed(4)),
      hashSimilarity: Number(c.hashSimilarity.toFixed(4)),
      combined: Number(c.combined.toFixed(4)),
      exact: c.exact,
    }))
  );

  // ۵) مسیر اول تشخیص EXACT: Near-Duplicate آفلاین (قطعی، بدون نیاز به AI)
  //
  // ⚠️ گارد ابهام: کاتالوگ اطلس برای برخی کدها تصویر تقریباً یکسان دارد
  // (مثلاً دو تسمه با طول مختلف و همان عکس کاتالوگ). در چنین شرایطی نمی‌توان
  // از تصویر تشخیص داد کدام کد همان قطعه است؛ پس ادعای EXACT داده نمی‌شود.
  let exactCandidate: Candidate | null = null;
  const duplicateClaims: {
    candidate: Candidate;
    structureScore: number;
    hashDistance: number;
    combinedDistance: number;
    path: 'near-duplicate-structure' | 'rescaled-same-image';
  }[] = [];

  for (const c of candidates) {
    const catalogSignatures = getSignaturesForProduct(c.product.id);
    for (const qSig of querySignatures.values()) {
      for (const cSig of Object.values(catalogSignatures)) {
        if (!cSig) continue;
        const asSignature: ImageSignature = {
          embedding: new Float32Array(0),
          dHash: cSig.dHash,
          pHash: cSig.pHash,
          aHash: cSig.aHash,
          structure: cSig.structure,
          colorHistogram: cSig.colorHistogram,
        };
        const verdict = verifyNearDuplicate(qSig, asSignature);
        if (verdict.isExact) {
          duplicateClaims.push({
            candidate: c,
            structureScore: verdict.structureScore,
            hashDistance: verdict.hashDistance,
            combinedDistance: verdict.combinedDistance,
            path: verdict.path === 'rescaled-same-image' ? 'rescaled-same-image' : 'near-duplicate-structure',
          });
          break;
        }
      }
      if (duplicateClaims.some(d => d.candidate === c)) break;
    }
  }

  if (duplicateClaims.length > 0) {
    // محصولات متمایزی که همه ادعای «همان تصویر» دارند
    const distinctClaimants = Array.from(new Set(duplicateClaims.map(d => d.candidate.product.id)));
    const winner = duplicateClaims[0];

    // گارد حاشیه: اگر کالای هم‌خانواده‌ای «تقریباً به همان اندازه» نزدیک باشد،
    // نمی‌توان از تصویر تشخیص داد کدام کد همان قطعه است ⇒ ادعای EXACT رد می‌شود.
    const runnerUpDistance = candidates
      .filter(c => c.product.id !== winner.candidate.product.id)
      .reduce((min, c) => Math.min(min, 1 - c.hashSimilarity), Number.MAX_SAFE_INTEGER);
    const hasClearMargin =
      runnerUpDistance === Number.MAX_SAFE_INTEGER ||
      winner.combinedDistance <= runnerUpDistance * DUPLICATE_MARGIN_RATIO ||
      runnerUpDistance > 0.12;

    if (distinctClaimants.length === 1 && hasClearMargin) {
      duplicateClaims.length = 0;
      duplicateClaims.push(winner);
      exactCandidate = winner.candidate;
      winner.candidate.exact = true;
      winner.candidate.exactPath = winner.path;
      winner.candidate.rationale = REASON_EXACT_STRUCTURE;
      trace.exactPath = winner.path;
      trace.notes.push(
        `تطابق قطعی تصویری (${winner.path}) با ${winner.candidate.product.sku} — فاصله هش ${winner.hashDistance}، انطباق ساختاری ${winner.structureScore.toFixed(3)}`
      );
    } else {
      trace.notes.push(
        distinctClaimants.length > 1
          ? `ابهام در تطابق قطعی: ${distinctClaimants.length} کالای مختلف تصویر یکسانی با عکس کاربر دارند ` +
              `(${distinctClaimants.slice(0, 4).join(' , ')}) — برای جلوگیری از معرفی محصول اشتباه، ادعای محصول دقیق رد شد.`
          : `کالای هم‌خانواده‌ی نزدیکی وجود دارد (فاصله هش رقیب: ${runnerUpDistance.toFixed(3)}) — ادعای محصول دقیق رد شد (سیاست: پیدا نکردن بهتر از معرفی اشتباه است).`
      );
    }
  }

  // ۶) مسیر دوم: راستی‌آزمایی چهره‌به‌چهره با AI (اختیاری)
  const verifier = options.verifier || createVerifier();
  const aiEnabled = settings.useAiVerification && verifier.isAvailable() && !exactCandidate;

  if (aiEnabled) {
    trace.aiVerificationUsed = true;
    const aiPool = ranked.slice(0, settings.maxAiCandidates);
    const userJpeg = await prepareVerificationJpeg(rawBuffer);

    // فراخوانی‌های جداگانه و کنترل‌شده (۳ به‌صورت موازی) برای دقت بالاتر
    const CONCURRENCY = 3;
    for (let i = 0; i < aiPool.length; i += CONCURRENCY) {
      const chunk = aiPool.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (c, j) => {
          if (j > 0) await new Promise(r => setTimeout(r, 300 * j));
          const buf = readCatalogImageBuffer(c.hit);
          if (!buf) return null;
          const candJpeg = await prepareVerificationJpeg(buf);
          const pair = await verifier.verifyPair(userJpeg, candJpeg, c.product.sku);
          return { c, pair, candJpeg };
        })
      );
      for (const r of results) {
        if (!r || !r.pair) continue;
        r.c.pair = r.pair;
        trace.verifiedCount++;
        // MP-۲۰: هر ادعای «همان قطعه» با نظر دوم مستقل بازبینی می‌شود
        if (r.pair.verdict === 'exact_match') {
          const ok = await verifier.secondOpinion(userJpeg, r.candJpeg);
          r.c.secondOpinion = ok;
          if (ok) {
            r.c.exact = true;
            r.c.exactPath = 'ai-confirmed-exact';
            r.c.rationale = REASON_EXACT_AI;
          } else {
            r.c.pair = {
              ...r.pair,
              verdict: 'very_similar',
              rationale:
                (r.pair.rationale ? `${r.pair.rationale} — ` : '') +
                'راستی‌آزمایی دوم مستقل، قطعیت انطباق را تأیید نکرد.',
            };
            trace.downgrades++;
          }
        }
      }
    }

    const aiExact = aiPool.find(c => c.exact && c.exactPath === 'ai-confirmed-exact');
    if (aiExact && aiExact.vectorScore >= settings.exactVectorFloor) {
      exactCandidate = aiExact;
      trace.exactPath = 'ai-confirmed-exact';
      trace.notes.push(
        `تأیید چهره‌به‌چهره با نظر دوم مستقل برای ${aiExact.product.sku} (شباهت برداری ${aiExact.vectorScore.toFixed(3)})`
      );
    } else {
      if (aiExact) {
        // ادعای exact توسط AI، ولی شباهت برداری پایین‌تر از حد مجاز ⇒ تنزل (سیاست محافظه‌کارانه)
        aiExact.exact = false;
        aiExact.exactPath = 'none';
        trace.downgrades++;
        trace.notes.push(
          `ادعای تطابق ${aiExact.product.sku} به دلیل پایین بودن شباهت برداری تنزل داده شد (Better No Match Than Wrong Match).`
        );
      }
    }
  } else if (!exactCandidate) {
    trace.notes.push(
      !isAiVerificationConfigured()
        ? 'کلید هوش مصنوعی تنظیم نشده؛ تصمیم‌گیری فقط بر پایه‌ی تطابق ساختاری دقیق و بدون AI انجام شد.'
        : settings.useAiVerification
          ? 'راستی‌آزمایی هوش مصنوعی در این جستجو نتیجه‌ای برنگرداند.'
          : 'راستی‌آزمایی هوش مصنوعی بر اساس تنظیمات غیرفعال است.'
    );
  }

  // ۷) تصمیم نهایی
  trace.decisionTimeMs = Date.now() - decisionStart;
  trace.totalTimeMs = Date.now() - totalStart;
  const queryId = `QS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex')}`;

  // ---- حالت EXACT: فقط همان یک محصول، هیچ مشابهی نمایش داده نمی‌شود ----
  if (exactCandidate) {
    trace.notes.push('نتیجه: EXACT — تنها محصول منطبق نمایش داده می‌شود (بدون فهرست مشابه‌ها).');
    return {
      response: baseResponse({
        resultType: 'EXACT',
        message: 'محصول موردنظر شما پیدا شد.',
        exactMatch: toItem(exactCandidate.product, exactCandidate.rationale),
        queryId,
        aiAssisted: trace.aiVerificationUsed,
      }),
      trace,
      thumbnail,
    };
  }

  // ---- حالت SIMILAR: ۳ تا ۶ کالای نزدیک از نظر شکل و ظاهر ----
  const similarPool = ranked
    .filter(c => c.combined >= settings.similarScoreFloor)
    .slice(0, settings.maxSimilarResults);

  if (similarPool.length >= settings.minSimilarResults) {
    const items = similarPool
      .slice(0, Math.max(settings.minSimilarResults, Math.min(settings.maxSimilarResults, similarPool.length)))
      .map(c => toItem(c.product, reasonForSimilar(c)));
    trace.notes.push(`نتیجه: SIMILAR — ${items.length} کالای نزدیک نمایش داده می‌شود.`);
    return {
      response: baseResponse({
        resultType: 'SIMILAR',
        message: 'محصول دقیق موردنظر شما پیدا نشد، اما محصولات مشابه زیر را پیدا کردیم.',
        similarMatches: items,
        queryId,
        aiAssisted: trace.aiVerificationUsed,
      }),
      trace,
      thumbnail,
    };
  }

  // ---- حالت NO_MATCH: هیچ کالای مناسبی وجود ندارد ----
  trace.notes.push(
    similarPool.length === 0
      ? 'نتیجه: NO_MATCH — هیچ کاندیدای نزدیکی از نظر ساختار و ظاهر یافت نشد.'
      : `نتیجه: NO_MATCH — تنها ${similarPool.length} کاندیدای نزدیک یافت شد که کمتر از حد لازم (${settings.minSimilarResults}) است؛ برای جلوگیری از پیشنهاد اشتباه، نتیجه‌ای نمایش داده نشد.`
  );
  return {
    response: baseResponse({
      resultType: 'NO_MATCH',
      message: 'محصول موردنظر شما در کاتالوگ ما پیدا نشد.',
      subMessage:
        'در صورت نیاز، امکان بررسی ساخت یا تأمین محصول موردنظر شما به‌صورت سفارشی وجود دارد.',
      customRequest: customRequestBlock(),
      queryId,
      aiAssisted: trace.aiVerificationUsed,
    }),
    trace,
    thumbnail,
  };
}

function customRequestBlock() {
  return {
    available: true,
    title: 'درخواست ساخت / تأمین سفارشی',
    message:
      'کارشناسان فنی اطلس تصویر و مشخصات قطعه‌ی شما را بررسی می‌کنند و نتیجه را با شما تماس می‌گیرند.',
    ctaLabel: 'درخواست ساخت / تأمین سفارشی',
  };
}

/** استخراج Buffer از ورودی کاربر — نام فایل هرگز خوانده یا استفاده نمی‌شود */
async function decodeUserImage(imageBase64: string): Promise<Buffer> {
  const trimmed = (imageBase64 || '').trim();
  if (!trimmed) throw new Error('تصویری برای جستجو ارسال نشد.');

  // آدرس تصویر (مثلاً نمونه‌های آزمایشی داخلی) → فقط پیکسل‌ها دریافت می‌شود
  let buffer: Buffer;
  if (/^https?:\/\//i.test(trimmed)) {
    const resp = await fetch(trimmed);
    if (!resp.ok) throw new Error('دریافت تصویر ناموفق بود.');
    buffer = Buffer.from(await resp.arrayBuffer());
  } else {
    const dataUrl = trimmed.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    buffer = dataUrl ? Buffer.from(dataUrl[3], 'base64') : Buffer.from(trimmed, 'base64');
  }
  if (!buffer.length) throw new Error('تصویر ارسالی قابل خواندن نیست.');
  if (buffer.length > 12 * 1024 * 1024) throw new Error('حجم تصویر بیش از حد مجاز (۱۲ مگابایت) است.');
  return buffer;
}

export { toDataUrl };
