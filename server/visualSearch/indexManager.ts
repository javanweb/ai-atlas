/**
 * Atlas Visual Product Search — Index Manager
 * ---------------------------------------------------------------------------
 * طبق نقشه راه (§۷ و §۱۸):
 *   • Batch Indexing اولیه روی همه‌ی تصاویر محصولات
 *   • Indexing خودکار برای محصول جدید / تصویر جدید / تصویر تغییریافته
 *   • حذف بردارها هنگام حذف محصول
 *   • Re-index کامل از پنل مدیریت
 *   • گزارش وضعیت: تعداد محصولات دارای embedding، تصاویر بدون embedding، خطاها
 */

import fs from 'fs';
import path from 'path';
import type {
  EmbeddingRecord,
  EmbeddingProvider,
  ImageSignature,
  IndexStatus,
  VectorStore,
} from './types';
import {
  EMBEDDING_VIEWS,
  type EmbeddingView,
} from './types';
import {
  RUNTIME_DIR,
  ensureRuntimePaths,
  hashFileContent,
  loadProductRecords,
  productCount,
  totalImageCount,
} from './catalog';
import { getEmbeddingProvider } from './embeddingProviders';
import { createVectorStore, getVectorStore } from './vectorStore';
import { analyzeImageVariants } from './visualEncoder';
import { readIndexMeta, writeIndexMeta } from './store';

/**
 * نسخه‌ی فرمت ایندکس.
 * افزایش این عدد باعث می‌شود ایندکس‌های قدیمی نامعتبر تلقی و بازسازی شوند
 * (نسخه ۲: امضای ساختاری به‌تفکیک «نما» + حذف امضا از رکوردهای برداری)
 * (نسخه ۳: هش‌های ادراکی روی جسم ایزوله‌شده به‌تفکیک نما)
 * (نسخه ۷: امضاهای محلی برای هر ۴ نما حتی وقتی موتور ابری فقط یک نما بردار می‌گیرد
 *          ⇒ تشخیص «همان تصویر» نسبت به چرخش ۹۰/۱۸۰ درجه و آینه مقاوم ماند)
 * (نسخه ۸: «نمای بردار» در متادیتای ایندکس ثبت می‌شود و تغییر آن بازسازی را
 *          اجباری می‌کند + نمای پیش‌فرض Jina از «جسم بریده» به «تصویر کامل»
 *          تغییر کرد؛ آزمون واقعی نشان داد نمای کامل در عکس‌های موبایل به‌مراتب
 *          بهتر عمل می‌کند — فراخوانی «جسم بریده» همان تصویر را تقریباً یکسان
 *          کد می‌کرد و محصول را در رتبه‌ی ۳-۶ می‌نشاند، در حالی که نمای کامل
 *          همان محصول را رتبه‌ی ۱ می‌آورد با حاشیه‌ی اطمینان از مزاحم‌ها)
 */
const INDEX_VERSION = 8;

interface BuildState {
  building: boolean;
  processed: number;
  total: number;
  current: string;
  startedAt: number;
  errors: { sku: string; image: string; message: string }[];
  /** هش محتوای هر تصویر در زمان آخرین ایندکس → تشخیص تغییر تصویر */
  imageHashes: Map<string, string>;
}

const state: BuildState = {
  building: false,
  processed: 0,
  total: 0,
  current: '',
  startedAt: 0,
  errors: [],
  imageHashes: new Map(),
};

let ready = false;
let lastIndexedAt: string | undefined;
let lastDurationMs: number | undefined;

function provider(): EmbeddingProvider {
  return getEmbeddingProvider();
}

function store(): VectorStore {
  return getVectorStore();
}

/** تولید بردار برای همه‌ی نماها برای یک تصویر (منبع: مسیر فایل روی سرور) */
async function embedImage(
  sku: string,
  productId: string,
  absPath: string,
  imageUrl: string,
  imageType: EmbeddingRecord['imageType'],
  prov: EmbeddingProvider
): Promise<{
  records: EmbeddingRecord[];
  signatures: { view: EmbeddingView; signature: ReturnType<typeof serializeSignature> }[];
}> {
  const buffer = fs.readFileSync(absPath);
  const p = prov as unknown as {
    analyzeVariants?: (b: Buffer) => Promise<
      { view: EmbeddingView; signature: ImageSignature; skipVector?: boolean }[]
    >;
  };
  const variants = p.analyzeVariants
    ? await p.analyzeVariants(buffer)
    : [{ view: 'full' as EmbeddingView, signature: await prov.analyzeImage(buffer) }];

  const records: EmbeddingRecord[] = [];
  const signatures: { view: EmbeddingView; signature: ReturnType<typeof serializeSignature> }[] = [];
  for (const { view, signature, skipVector } of variants) {
    // امضا (هش/ساختار) برای همه‌ی نماها ذخیره می‌شود؛ رکورد برداری فقط برای
    // نماهایی که بردار معتبر دارند (بردارهای موتورهای مختلف قابل اختلاط نیستند).
    if (!skipVector && signature.embedding.length === prov.dim) {
      records.push({
        id: `${sku}::${view}`,
        productId,
        sku,
        imagePath: absPath,
        imageUrl,
        imageType,
        view,
        provider: prov.name,
        dim: signature.embedding.length,
        vector: signature.embedding,
        // امضای ساختاری در فایل signatures ذخیره می‌شود (کلید: productId::view)
        signature: undefined,
      });
    }
    signatures.push({ view, signature: serializeSignature(signature) });
  }
  return { records, signatures };
}

const SIGNATURES_PATH_SUFFIX = '.signatures.json';

function serializeSignature(sig: ImageSignature) {
  return {
    dHash: sig.dHash,
    pHash: sig.pHash,
    aHash: sig.aHash,
    structure: sig.structure,
    colorHistogram: sig.colorHistogram,
  };
}

/** فایل امضاهای ساختاری همه‌ی محصولات (برای راستی‌آزمایی EXACT آفلاین) */
function signaturesPath(): string {
  ensureRuntimePaths();
  return path.join(RUNTIME_DIR, `signatures${SIGNATURES_PATH_SUFFIX}`);
}

export interface SignatureFile {
  version: number;
  /** کلید: `${productId}::${view}` — نگهداری امضای ساختاری هر «نما» از هر تصویر */
  entries: Record<string, ReturnType<typeof serializeSignature>>;
}

let signatureCache: SignatureFile | null = null;

function signatureKey(productId: string, view: EmbeddingView): string {
  return `${productId}::${view}`;
}

export function loadSignatureFile(): SignatureFile {
  if (signatureCache) return signatureCache;
  try {
    const p = signaturesPath();
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as SignatureFile;
      // نسخه‌ی ۱ فقط نمای full را ذخیره می‌کرد → با نسخه‌ی جدید بازسازی می‌شود
      if (parsed && parsed.version === INDEX_VERSION && parsed.entries) {
        signatureCache = parsed;
        return signatureCache;
      }
    }
  } catch {
    /* ignore */
  }
  signatureCache = { version: INDEX_VERSION, entries: {} };
  return signatureCache;
}

function persistSignatureFile(): void {
  if (!signatureCache) return;
  try {
    ensureRuntimePaths();
    fs.writeFileSync(signaturesPath(), JSON.stringify(signatureCache));
  } catch (e: any) {
    console.warn('[VisualSearch] signature persist failed:', e?.message);
  }
}

function setSignature(
  productId: string,
  view: EmbeddingView,
  signature: ReturnType<typeof serializeSignature>
): void {
  const file = loadSignatureFile();
  file.entries[signatureKey(productId, view)] = signature;
}

/** امضای ساختاری همه‌ی نماهای یک محصول (برای راستی‌آزمایی EXACT و Re-ranking) */
export function getSignaturesForProduct(
  productId: string
): Partial<Record<EmbeddingView, ReturnType<typeof serializeSignature>>> {
  const file = loadSignatureFile();
  const out: Partial<Record<EmbeddingView, ReturnType<typeof serializeSignature>>> = {};
  for (const view of EMBEDDING_VIEWS) {
    const sig = file.entries[signatureKey(productId, view)];
    if (sig) out[view] = sig;
  }
  return out;
}

/** همه‌ی امضاهای ذخیره‌شده به‌تفکیک محصول و نما (برای رتبه‌بندی کامل کاتالوگ) */
export function getAllSignatures(): Record<
  string,
  Partial<Record<EmbeddingView, ReturnType<typeof serializeSignature>>>
> {
  const file = loadSignatureFile();
  const out: Record<string, Partial<Record<EmbeddingView, ReturnType<typeof serializeSignature>>>> = {};
  for (const [key, sig] of Object.entries(file.entries)) {
    const idx = key.lastIndexOf('::');
    if (idx === -1) continue;
    const productId = key.slice(0, idx);
    const view = key.slice(idx + 2) as EmbeddingView;
    if (!out[productId]) out[productId] = {};
    out[productId][view] = sig;
  }
  return out;
}

/** سازگاری با کدهای قدیمی: امضای نمای full */
export function getSignatureForProduct(productId: string) {
  return getSignaturesForProduct(productId).full;
}

// ---------------------------------------------------------------------------
// ساخت ایندکس
// ---------------------------------------------------------------------------

export interface BuildOptions {
  /** فقط تصاویر جدید یا تغییریافته پردازش شوند (پیش‌فرض: true) */
  incremental?: boolean;
  /** پاک‌سازی کامل انبار برداری قبل از ساخت */
  reset?: boolean;
  /** تعداد تصویر پردازش‌شده در هر دسته (پیشرفت/حافظه) */
  batchSize?: number;
  onProgress?: (processed: number, total: number, current: string) => void;
}

/**
 * ساخت/به‌روزرسانی ایندکس برداری همه‌ی تصاویر محصولات.
 * این فرآیند Batch است و در پس‌زمینه اجرا می‌شود.
 */
/**
 * «امضای نماهای فعالِ بردار» — برای تشخیص تغییر تنظیمات نما.
 * مثلاً 'object' در برابر 'full' یا 'full,object'.
 */
function activeViewSignature(prov?: EmbeddingProvider): string {
  const p = prov || provider();
  const anyP = p as unknown as { viewSignature?: () => string; views?: () => string[] };
  try {
    if (typeof anyP.viewSignature === 'function') return anyP.viewSignature();
    if (typeof anyP.views === 'function') return anyP.views().join(',');
  } catch {
    /* ignore */
  }
  return SUPPORTED_VIEWS.join(',');
}

/** ذخیره‌ی متادیتای ایندکس (نسخه، ارائه‌دهنده، هش تصاویر) — برای ادامه‌ی افزایشی */
async function persistMeta(prov: EmbeddingProvider): Promise<void> {
  try {
    const st = store();
    writeIndexMeta({
      ...readIndexMeta(),
      version: INDEX_VERSION,
      provider: prov.name,
      views: activeViewSignature(prov),
      dim: prov.dim,
      vectorCount: await st.count(),
      durationMs: Date.now() - (state.startedAt || Date.now()),
      lastIndexedAt: new Date().toISOString(),
      imageHashes: Object.fromEntries(state.imageHashes),
    } as Parameters<typeof writeIndexMeta>[0]);
  } catch (e: any) {
    console.warn('[VisualSearch] persistMeta failed:', e?.message);
  }
}

export async function buildIndex(options: BuildOptions = {}): Promise<{
  processed: number;
  skipped: number;
  errors: number;
  durationMs: number;
}> {
  if (state.building) throw new Error('ایندکس‌سازی در حال اجراست؛ لطفاً تا پایان آن صبر کنید.');
  const started = Date.now();
  state.building = true;
  state.errors = [];
  state.processed = 0;
  state.startedAt = started;

  const prov = provider();
  const st = store();
  const products = loadProductRecords(true);
  const totalImages = products.reduce((s, p) => s + p.images.length, 0);
  state.total = totalImages;

  try {
    await st.init();
    if (options.reset) {
      await st.reset();
      signatureCache = { version: INDEX_VERSION, entries: {} };
      state.imageHashes.clear();
      try {
        fs.writeFileSync(signaturesPath(), JSON.stringify(signatureCache));
      } catch {
        /* best effort */
      }
    }

    loadSignatureFile();
    let processed = 0;
    let skipped = 0;

    /** یک تصویر: بررسی تغییر، تولید بردار، ذخیره */
    const handleImage = async (
      product: (typeof products)[number],
      image: (typeof products)[number]['images'][number]
    ): Promise<void> => {
      state.current = `${product.sku} — ${image.imageType}`;
      const contentHash = hashFileContent(image.imagePath);

      // ایندکس افزایشی: اگر تصویر تغییری نکرده، از نو پردازش نشود
      if (options.incremental !== false && contentHash && state.imageHashes.get(image.imagePath) === contentHash) {
        const existing = getSignaturesForProduct(product.id);
        if (Object.keys(existing).length > 0) {
          skipped++;
          state.processed++;
          options.onProgress?.(state.processed, state.total, state.current);
          return;
        }
      }

      try {
        const { records, signatures } = await embedImage(
          product.sku,
          product.id,
          image.imagePath,
          image.imageUrl,
          image.imageType,
          prov
        );
        await st.upsert(records);
        for (const sig of signatures) setSignature(product.id, sig.view, sig.signature);
        state.imageHashes.set(image.imagePath, contentHash || `${image.imagePath}:${Date.now()}`);
        processed++;
      } catch (e: any) {
        state.errors.push({
          sku: product.sku,
          image: image.imagePath.split(/[\\/]/).pop() || image.imagePath,
          message: e?.message || 'خطای پردازش تصویر',
        });
      }
      state.processed++;
      options.onProgress?.(state.processed, state.total, state.current);

      // هر ۲۵ تصویر، پیشرفت روی دیسک ذخیره می‌شود تا در صورت قطع/ری‌استارت،
      // ایندکس‌سازی «افزایشی» ادامه پیدا کند و از صفر شروع نشود.
      if (state.processed % 25 === 0) {
        persistSignatureFile();
        await persistMeta(prov);
        const fl = st as unknown as { flush?: () => Promise<void> };
        if (fl.flush) await fl.flush();
      }
    };

    const tasks: { product: (typeof products)[number]; image: (typeof products)[number]['images'][number] }[] = [];
    for (const product of products) for (const image of product.images) tasks.push({ product, image });

    // ارائه‌دهنده‌های محلی تک‌رشته‌ای‌اند (مصرف CPU)؛ ارائه‌دهنده‌های ابری با
    // چند کارگر موازی اجرا می‌شوند تا درخواست‌ها به‌صورت دسته‌ای ارسال شوند.
    const workers =
      prov.name === 'local-visual-v1' ? 1 : Math.max(1, Number(process.env.VISUAL_SEARCH_INDEX_CONCURRENCY || 4));
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(workers, tasks.length) }, async () => {
        while (cursor < tasks.length) {
          const task = tasks[cursor++];
          await handleImage(task.product, task.image);
        }
      })
    );

    persistSignatureFile();
    // ذخیره‌ی اتمی انبار برداری
    const flushable = st as unknown as { flush?: () => Promise<void> };
    if (flushable.flush) await flushable.flush();

    lastIndexedAt = new Date().toISOString();
    lastDurationMs = Date.now() - started;

    writeIndexMeta({
      version: INDEX_VERSION,
      provider: prov.name,
      // «امضای نما» باید در متادیتای نهایی هم ثبت شود؛ در غیر این صورت
      // تغییر تنظیمات نما در بوت بعدی تشخیص داده نمی‌شود.
      views: activeViewSignature(prov),
      dim: prov.dim,
      builtAt: lastIndexedAt,
      durationMs: lastDurationMs,
      productCount: products.length,
      imageCount: totalImages,
      vectorCount: await st.count(),
      imageHashes: Object.fromEntries(state.imageHashes),
      errors: state.errors,
    });

    ready = true;
    console.log(
      `[VisualSearch] Index built: ${processed} images processed, ${skipped} unchanged, ${state.errors.length} errors in ${lastDurationMs}ms`
    );
    return { processed, skipped, errors: state.errors.length, durationMs: lastDurationMs };
  } finally {
    state.building = false;
    state.current = '';
  }
}

/** راه‌اندازی اولیه‌ی ماژول در زمان بالا آمدن سرور */
export async function initVisualSearch(): Promise<void> {
  const st = createVectorStore();
  await st.init();
  const meta = readIndexMeta();

  // بازیابی هش‌های محتوا از وضعیت قبلی → ایندکس افزایشی واقعی پس از ری‌استارت
  if (meta) {
    lastIndexedAt = meta.builtAt;
    lastDurationMs = meta.durationMs;
    for (const [imagePath, hash] of Object.entries(meta.imageHashes || {})) {
      state.imageHashes.set(imagePath, hash);
    }
  }

  const existing = await st.count();
  const products = loadProductRecords(true);
  const expectedImages = products.reduce((s, p) => s + p.images.length, 0);
  // هر ارائه‌دهنده ممکن است نمای کمتری تولید کند (مثلاً Jina دو نما) —
  // پس انتظار بردارها بر اساس همان ارائه‌دهنده‌ی فعال محاسبه می‌شود.
  const activeViews = Math.max(1, provider().maxViews || SUPPORTED_VIEWS.length);
  const expectedVectors = expectedImages * activeViews;

  if (products.length === 0) {
    console.log('[VisualSearch] کاتالوگ خالی است؛ ایندکس ساخته نشد.');
    return;
  }

  const schemaChanged = !meta || meta.version !== INDEX_VERSION;
  // اگر «تركیب نماهای بردار» عوض شده باشد (مثلاً از جسم بریده به تصویر کامل)،
  // بردارهای ذخیره‌شده در فضای دیگری هستند و باید از صفر ساخته شوند.
  const viewsChanged = !!meta?.views && meta.views !== activeViewSignature();
  // اگر ارائه‌دهنده‌ی بردار عوض شده باشد (مثلاً از محلی به Jina)، بردارهای قبلی
  // در فضای برداری دیگری هستند و مقایسه‌ی آن‌ها بی‌معناست ⇒ بازسازی کامل الزامی است.
  const providerChanged = !!meta?.provider && meta.provider !== provider().name;
  const incomplete = existing < expectedVectors;
  ready = !incomplete && !schemaChanged && !providerChanged && !viewsChanged;

  if (existing === 0 || schemaChanged || incomplete || providerChanged || viewsChanged) {
    console.log(
      providerChanged
        ? `[VisualSearch] ارائه‌دهنده‌ی بردار تغییر کرده است (${meta?.provider} → ${provider().name}) — بازسازی کامل ایندکس آغاز شد...`
        : viewsChanged
          ? `[VisualSearch] ترکیب نمای بردار تغییر کرده است (${meta?.views} → ${activeViewSignature()}) — بازسازی کامل ایندکس آغاز شد...`
          : `[VisualSearch] ایندکس ناقص/نامعتبر است (${existing}/${expectedVectors} بردار) — بازسازی کامل در پس‌زمینه آغاز شد...`
    );
    // بازسازی کامل در پس‌زمینه تا بالا آمدن سرور بلاک نشود
    setTimeout(() => {
      // اگر فقط «ناقص» است (نه تغییر نسخه/ارائه‌دهنده)، افزایشی ادامه بده؛
      // در غیر این صورت ساخت کامل از صفر لازم است.
      const incrementalResume = incomplete && !schemaChanged && !providerChanged && !viewsChanged;
      void buildIndex({ incremental: incrementalResume, reset: !incrementalResume }).catch(e =>
        console.error('[VisualSearch] auto rebuild failed:', e?.message)
      );
    }, 400);
  } else {
    console.log(
      `[VisualSearch] ایندکس بارگذاری شد: ${existing} بردار برای ${expectedImages} تصویر کاتالوگ (آماده‌ی جستجو)`
    );
    // اگر متادیتای ایندکس قدیمی باشد و «امضای نما» را نداشته باشد، همان‌جا
    // ثبت می‌شود تا تغییر بعدی تنظیمات نما بدون ابهام تشخیص داده شود.
    if (!meta?.views || !meta?.dim) {
      try {
        writeIndexMeta({
          ...(meta || {
            version: INDEX_VERSION,
            provider: provider().name,
            builtAt: new Date().toISOString(),
            durationMs: 0,
            productCount: products.length,
            imageCount: expectedImages,
            vectorCount: existing,
            errors: [],
          }),
          version: INDEX_VERSION,
          provider: provider().name,
          views: activeViewSignature(),
          dim: provider().dim,
        } as Parameters<typeof writeIndexMeta>[0]);
      } catch {
        /* ignore */
      }
    }
    // بازبینی تفاوت‌ها در پس‌زمینه (تصاویر جدید/تغییریافته)
    setTimeout(() => {
      void buildIndex({ incremental: true }).catch(() => undefined);
    }, 5000);
  }
}

/** ایندکس‌سازی یک محصول (محصول جدید یا تصویر تغییریافته) */
export async function reindexProduct(productId: string): Promise<{ productId: string; records: number }> {
  const products = loadProductRecords(true);
  const product = products.find(p => p.id === productId || p.sku === productId);
  if (!product) throw new Error(`محصول ${productId} در کاتالوگ یافت نشد.`);

  const st = store();
  await st.init();
  await st.deleteByProduct(product.id);

  const sigFile = loadSignatureFile();
  for (const view of EMBEDDING_VIEWS) delete sigFile.entries[`${product.id}::${view}`];

  const prov = provider();
  let count = 0;
  for (const image of product.images) {
    const { records, signatures } = await embedImage(
      product.sku,
      product.id,
      image.imagePath,
      image.imageUrl,
      image.imageType,
      prov
    );
    await st.upsert(records);
    for (const sig of signatures) setSignature(product.id, sig.view, sig.signature);
    state.imageHashes.set(image.imagePath, hashFileContent(image.imagePath));
    count += records.length;
  }
  persistSignatureFile();
  const flushable = st as unknown as { flush?: () => Promise<void> };
  if (flushable.flush) await flushable.flush();
  return { productId: product.id, records: count };
}

/** حذف کامل بردارهای یک محصول (محصول حذف‌شده از کاتالوگ) */
export async function removeProductFromIndex(productId: string): Promise<number> {
  const st = store();
  await st.init();
  const removed = await st.deleteByProduct(productId);
  const sigFile = loadSignatureFile();
  for (const view of EMBEDDING_VIEWS) delete sigFile.entries[`${productId}::${view}`];
  persistSignatureFile();
  const flushable = st as unknown as { flush?: () => Promise<void> };
  if (flushable.flush) await flushable.flush();
  return removed;
}

/** ثبت تصویر جدید برای یک محصول + تولید فوری بردار (§۱۸) */
export async function addProductImage(input: {
  productId: string;
  absPath: string;
  imageUrl: string;
  imageType: EmbeddingRecord['imageType'];
}): Promise<number> {
  const product = loadProductRecords(true).find(p => p.id === input.productId || p.sku === input.productId);
  if (!product) throw new Error('محصول یافت نشد.');
  const prov = provider();
  const st = store();
  await st.init();
  const { records, signatures } = await embedImage(
    product.sku,
    product.id,
    input.absPath,
    input.imageUrl,
    input.imageType,
    prov
  );
  await st.upsert(records);
  // برای تصاویر اضافی، امضاها فقط اگر موجود نباشند نوشته می‌شوند (تصویر اصلی اولویت دارد)
  for (const sig of signatures) {
    const key = `${product.id}::${sig.view}`;
    if (!loadSignatureFile().entries[key]) setSignature(product.id, sig.view, sig.signature);
  }
  persistSignatureFile();
  const flushable = st as unknown as { flush?: () => Promise<void> };
  if (flushable.flush) await flushable.flush();
  return records.length;
}

// ---------------------------------------------------------------------------
// وضعیت ایندکس
// ---------------------------------------------------------------------------

export async function getIndexStatus(): Promise<IndexStatus> {
  const st = store();
  const products = loadProductRecords();
  const indexedIds = await st.indexedProductIds();
  const indexedSet = new Set(indexedIds);

  const totalImages = products.reduce((s, p) => s + p.images.length, 0);
  const indexedImages = products.reduce(
    (s, p) => s + (indexedSet.has(p.id) ? p.images.length : 0),
    0
  );

  const withoutEmbedding: { sku: string; image: string; reason: string }[] = [];
  for (const p of products) {
    if (!indexedSet.has(p.id)) {
      withoutEmbedding.push({
        sku: p.sku,
        image: p.images[0]?.imagePath.split(/[\\/]/).pop() || '—',
        reason: 'تصویر این محصول هنوز پردازش نشده است',
      });
      continue;
    }
    for (const img of p.images.slice(1)) {
      // تصاویر اضافی چندگانه: اگر محصول ایندکس شده باشد ثبت شده‌اند
      void img;
    }
    if (Object.keys(getSignaturesForProduct(p.id)).length === 0) {
      withoutEmbedding.push({
        sku: p.sku,
        image: p.images[0]?.imagePath.split(/[\\/]/).pop() || '—',
        reason: 'امضای ساختاری ثبت نشده — نیاز به Re-index',
      });
    }
  }

  const health = await st.health();

  return {
    ready: indexedSet.size >= products.length && products.length > 0,
    building: state.building,
    provider: provider().name,
    vectorStore: st.kind,
    indexedProducts: indexedSet.size,
    totalProducts: products.length,
    indexedImages,
    totalImages,
    vectors: await st.count(),
    imagesWithoutEmbedding: withoutEmbedding.slice(0, 60),
    errors: state.errors.slice(-40),
    lastIndexedAt,
    lastDurationMs,
    progress: {
      processed: state.processed,
      total: state.total || totalImages,
      current: state.current || undefined,
    },
    vectorDatabase: {
      kind: health.kind,
      vectors: health.vectors,
      ok: health.ok,
      detail: health.detail,
    },
  };
}

/**
 * پایش خودکار کاتالوگ (§۱۸): هر چند دقیقه یک‌بار کاتالوگ بازخوانی می‌شود و
 * اگر محصول جدید یا تصویر تغییریافته‌ای وجود داشته باشد، بردارهایش ساخته می‌شود.
 * همچنین محصولات حذف‌شده از کاتالوگ، از ایندکس پاک می‌شوند.
 */
export function startAutoIndexWatch(intervalMs = 10 * 60 * 1000): NodeJS.Timeout {
  const timer = setInterval(async () => {
    if (state.building) return;
    try {
      const products = loadProductRecords(true);
      const st = store();
      await st.init();
      const indexed = new Set(await st.indexedProductIds());
      const alive = new Set(products.map(p => p.id));

      // حذف بردارهای محصولاتی که دیگر در کاتالوگ نیستند
      for (const id of indexed) {
        if (!alive.has(id)) {
          await st.deleteByProduct(id);
          for (const view of EMBEDDING_VIEWS) delete loadSignatureFile().entries[`${id}::${view}`];
          console.log(`[VisualSearch] محصول حذف‌شده از ایندکس پاک شد: ${id}`);
        }
      }
      persistSignatureFile();

      // ایندکس افزایشی (فقط تصاویر جدید/تغییریافته)
      await buildIndex({ incremental: true });
    } catch (e: any) {
      console.warn('[VisualSearch] auto-index watch error:', e?.message);
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export function isIndexBuilding(): boolean {
  return state.building;
}

export function isReady(): boolean {
  return ready;
}

export const SUPPORTED_VIEWS = EMBEDDING_VIEWS;
export { productCount, totalImageCount, writeIndexMeta };
