/**
 * Atlas Visual Product Search — HTTP API
 * ---------------------------------------------------------------------------
 * همه‌ی نقاط پایانی ماژول جستجوی بصری.
 *
 *  کاربر / فرانت‌اند:
 *    POST   /api/visual-search/search            جستجو با تصویر (سه حالت خروجی)
 *    POST   /api/visual-search/requests          ثبت درخواست ساخت/تأمین سفارشی
 *    GET    /api/visual-search/health            آمادگی موتور
 *
 *  پنل مدیریت:
 *    GET    /api/visual-search/index/status      وضعیت ایندکس و انبار برداری
 *    POST   /api/visual-search/index/reindex     بازسازی کامل ایندکس
 *    POST   /api/visual-search/index/product     ایندکس یک محصول (افزودن/به‌روزرسانی)
 *    DELETE /api/visual-search/index/product/:id حذف بردارهای محصول
 *    POST   /api/visual-search/index/product/:id/images   افزودن تصویر جدید به محصول
 *    GET    /api/visual-search/logs              لاگ جستجوها + آمار
 *    DELETE /api/visual-search/logs              پاک‌سازی لاگ
 *    GET    /api/visual-search/requests          فهرست درخواست‌های سفارشی
 *    PATCH  /api/visual-search/requests/:id      تغییر وضعیت درخواست
 *    DELETE /api/visual-search/requests/:id      حذف درخواست
 *    GET    /api/visual-search/settings          تنظیمات سیاست تصمیم‌گیری
 *    POST   /api/visual-search/settings          به‌روزرسانی تنظیمات
 *    GET    /api/visual-search/self-test         تست خودکار موتور (EXACT روی تصویر کاتالوگ)
 */

import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import type { CustomRequestStatus, IndexStatus } from './types';
import {
  addProductImage,
  buildIndex,
  getIndexStatus,
  isIndexBuilding,
  removeProductFromIndex,
  reindexProduct,
} from './indexManager';
import { searchByImage } from './searchEngine';
import { createVerifier, isAiVerificationConfigured } from './verifier';
import {
  addImageToManifest,
  loadProductRecords,
  resolveImagePath,
  RUNTIME_DIR,
  ensureRuntimePaths,
} from './catalog';
import {
  appendSearchLog,
  clearSearchLogs,
  createCustomRequest,
  deleteCustomRequest,
  getCustomRequests,
  getLogStats,
  getSearchLogs,
  getSettings,
  saveSettings,
  updateCustomRequestStatus,
} from './store';
import { createEmbeddingProvider, getEmbeddingProvider } from './embeddingProviders';

const router = express.Router();
router.use(express.json({ limit: '30mb' }));

const VALID_STATUSES: CustomRequestStatus[] = [
  'new',
  'under_review',
  'can_manufacture',
  'can_supply',
  'need_more_info',
  'closed',
];

// ---------------------------------------------------------------------------
// آمادگی و سلامت
// ---------------------------------------------------------------------------

router.get('/health', async (_req: Request, res: Response) => {
  const status = await getIndexStatus();
  res.json({
    ok: status.ready,
    provider: status.provider,
    vectorStore: status.vectorStore,
    indexedProducts: status.indexedProducts,
    totalProducts: status.totalProducts,
    building: status.building,
  });
});

// ---------------------------------------------------------------------------
// جستجو
// ---------------------------------------------------------------------------

router.post('/search', async (req: Request, res: Response) => {
  const started = Date.now();
  try {
    const { imageBase64 } = req.body || {};
    // توجه: نام فایل، EXIF و متادیتا هرگز خوانده یا استفاده نمی‌شود — حتی اگر ارسال شود.
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        resultType: 'NO_MATCH',
        message: 'تصویری برای جستجو دریافت نشد.',
        similarMatches: [],
      });
    }

    const verifier = createVerifier();
    const { response, trace, thumbnail } = await searchByImage({ imageBase64, verifier });

    // ثبت لاگ (با تصویر بندانگشتی برای بازبینی در پنل مدیریت)
    try {
      appendSearchLog({
        resultType: response.resultType,
        thumbnailDataUrl: thumbnail || undefined,
        exactSku: response.exactMatch?.sku,
        similarSkus: response.similarMatches.map(m => m.sku),
        candidateCount: trace.candidateCount,
        aiAssisted: trace.aiVerificationUsed,
        totalTimeMs: Date.now() - started,
        bestInternalScore: trace.bestInternalScore,
        exactPath: trace.exactPath,
        notes: trace.notes,
      });
    } catch {
      /* لاگ نباید جستجو را متوقف کند */
    }

    // امتیازها هرگز در پاسخ به کاربر ارسال نمی‌شوند (تنها اقلام نمایشی)
    res.json({
      ...response,
      queryId: response.queryId || trace.notes[0] || '',
      _internal: undefined,
    });
  } catch (e: any) {
    console.error('[VisualSearch] search failed:', e?.message);
    res.status(500).json({
      success: false,
      resultType: 'NO_MATCH',
      message: 'بررسی تصویر با خطا مواجه شد. لطفاً تصویر دیگری را امتحان کنید.',
      similarMatches: [],
      error: e?.message,
    });
  }
});

// ---------------------------------------------------------------------------
// کالیبراسیون و شفافیت (فقط پنل مدیریت)
// ---------------------------------------------------------------------------

/**
 * تحلیل داخلی یک تصویر: کاندیداها، امتیازهای بصری/ساختاری و مسیر تصمیم.
 * خروجی این نقطه پایانی هرگز به کاربر نمایش داده نمی‌شود (فقط پنل مدیریت).
 */
router.post('/debug/score', async (req: Request, res: Response) => {
  try {
    const { imageBase64, weights } = req.body || {};
    if (!imageBase64) return res.status(400).json({ success: false, error: 'تصویر لازم است.' });
    let normalizedWeights: { vector: number; structure: number; hash: number } | undefined;
    if (weights && typeof weights === 'object') {
      const v = Number(weights.vector);
      const st = Number(weights.structure);
      const h = Number(weights.hash);
      if ([v, st, h].every(n => Number.isFinite(n) && n >= 0) && v + st + h > 0) {
        const sum = v + st + h;
        normalizedWeights = { vector: v / sum, structure: st / sum, hash: h / sum };
      }
    }
    let candidates: any[] = [];
    const { response, trace } = await searchByImage({
      imageBase64,
      weights: normalizedWeights,
      verifier: createVerifier(undefined),
      onCandidates: rows => {
        candidates = rows;
      },
    });
    res.json({ success: true, resultType: response.resultType, message: response.message, trace, candidates });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

// ---------------------------------------------------------------------------
// درخواست ساخت / تأمین سفارشی
// ---------------------------------------------------------------------------

router.post('/requests', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const {
      imageBase64,
      description,
      quantity,
      contactName,
      contactPhone,
      company,
      extraNotes,
      queryId,
    } = body;

    if (!contactName || !contactPhone) {
      return res.status(400).json({ success: false, error: 'نام و شماره تماس الزامی است.' });
    }
    if (!description || String(description).trim().length < 5) {
      return res
        .status(400)
        .json({ success: false, error: 'لطفاً توضیحاتی درباره قطعه موردنیاز وارد کنید.' });
    }

    const request = createCustomRequest({
      imageDataUrl: typeof imageBase64 === 'string' && imageBase64 ? imageBase64 : undefined,
      description: String(description),
      quantity: String(quantity || ''),
      contactName: String(contactName),
      contactPhone: String(contactPhone),
      company: company ? String(company) : undefined,
      extraNotes: extraNotes ? String(extraNotes) : undefined,
      queryId: queryId ? String(queryId) : undefined,
    });

    console.log(`[VisualSearch] درخواست ساخت/تأمین سفارشی ثبت شد: ${request.id}`);
    res.json({ success: true, requestId: request.id, message: 'درخواست شما با موفقیت ثبت شد.' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'ثبت درخواست ناموفق بود.' });
  }
});

router.get('/requests', (_req: Request, res: Response) => {
  res.json({ success: true, requests: getCustomRequests(), stats: getLogStats() });
});

router.patch('/requests/:id', (req: Request, res: Response) => {
  const { status, adminNote } = req.body || {};
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: 'وضعیت نامعتبر است.' });
  }
  const updated = updateCustomRequestStatus(req.params.id, status, adminNote);
  if (!updated) return res.status(404).json({ success: false, error: 'درخواست یافت نشد.' });
  res.json({ success: true, request: updated });
});

router.delete('/requests/:id', (req: Request, res: Response) => {
  const ok = deleteCustomRequest(req.params.id);
  res.json({ success: ok });
});

// ---------------------------------------------------------------------------
// ایندکس
// ---------------------------------------------------------------------------

router.get('/index/status', async (_req: Request, res: Response) => {
  const status: IndexStatus = await getIndexStatus();
  res.json({ success: true, status });
});

router.post('/index/reindex', async (req: Request, res: Response) => {
  try {
    // قفل ایندکس‌سازی: جلوگیری از اجرای هم‌زمان دو فرآیند (رقابت و ایندکس ناقص)
    if (isIndexBuilding()) {
      return res.status(409).json({
        success: false,
        error: 'ایندکس‌سازی دیگری در حال اجراست؛ لطفاً تا پایان آن صبر کنید.',
        building: true,
      });
    }
    const reset = req.body?.reset === true;
    // اجرای غیرمسدودکننده: بلافاصله پاسخ می‌دهیم و پیشرفت را از status می‌خوانیم
    void buildIndex({ reset, incremental: !reset })
      .then(r => console.log(`[VisualSearch] Re-index کامل شد: ${JSON.stringify(r)}`))
      .catch(e => console.error('[VisualSearch] Re-index failed:', e?.message));
    res.json({
      success: true,
      message: reset
        ? 'بازسازی کامل ایندکس در پس‌زمینه آغاز شد (پاک‌سازی + ایندکس از صفر).'
        : 'ایندکس‌سازی افزایشی در پس‌زمینه آغاز شد.',
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

router.post('/index/product', async (req: Request, res: Response) => {
  try {
    const productId = String(req.body?.productId || '').trim();
    if (!productId) return res.status(400).json({ success: false, error: 'شناسه محصول لازم است.' });
    const result = await reindexProduct(productId);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message });
  }
});

router.delete('/index/product/:id', async (req: Request, res: Response) => {
  try {
    const removed = await removeProductFromIndex(req.params.id);
    res.json({ success: true, removedVectors: removed });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message });
  }
});

/** افزودن تصویر جدید (زاویه دوم/نمای نزدیک) به یک محصول + تولید فوری بردار */
router.post('/index/product/:id/images', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const { imageBase64, imageType = 'gallery', fileName } = req.body || {};
    if (!imageBase64) return res.status(400).json({ success: false, error: 'تصویر لازم است.' });

    const product = loadProductRecords(true).find(p => p.id === productId || p.sku === productId);
    if (!product) return res.status(404).json({ success: false, error: 'محصول یافت نشد.' });

    ensureRuntimePaths();
    const dir = path.join(RUNTIME_DIR, 'product-images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const dataUrl = String(imageBase64).match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    const buffer = dataUrl ? Buffer.from(dataUrl[3], 'base64') : Buffer.from(String(imageBase64), 'base64');
    // نام فایل ذخیره‌سازی کاملاً تصادفی است تا هیچ ردی از نام اصلی باقی نماند
    const storedName = `${productId.replace(/[^\w-]/g, '')}-${Date.now()}-${Math.round(
      Math.random() * 1e6
    )}.jpg`;
    const absPath = path.join(dir, storedName);
    fs.writeFileSync(absPath, buffer);
    void fileName; // نام فایل ورودی نادیده گرفته می‌شود (طبق §۲۱)

    addImageToManifest(productId, absPath, imageType);
    const records = await addProductImage({
      productId,
      absPath,
      imageUrl: `/api/visual-search/image?sku=${encodeURIComponent(productId)}&file=${storedName}`,
      imageType,
    });

    res.json({ success: true, imageId: storedName, vectors: records });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

/** سرو کردن تصاویر افزوده‌شده (تصاویر زاویه دوم که در مخزن نیستند) */
router.get('/image', (req: Request, res: Response) => {
  const sku = String(req.query.sku || '');
  const file = String(req.query.file || '');
  const index = Number(req.query.i ?? -1);

  const product = loadProductRecords().find(p => p.id === sku || p.sku === sku);
  if (!product) return res.status(404).end();

  let target: string | undefined;
  if (file) target = path.join(RUNTIME_DIR, 'product-images', path.basename(file));
  else if (index >= 0) target = product.images[index]?.imagePath;

  if (!target || !fs.existsSync(target)) return res.status(404).end();
  res.sendFile(target);
});

// ---------------------------------------------------------------------------
// لاگ‌ها
// ---------------------------------------------------------------------------

router.get('/logs', (req: Request, res: Response) => {
  const limit = Math.min(300, Math.max(1, Number(req.query.limit) || 100));
  res.json({ success: true, logs: getSearchLogs(limit), stats: getLogStats() });
});

router.delete('/logs', (_req: Request, res: Response) => {
  clearSearchLogs();
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// تنظیمات
// ---------------------------------------------------------------------------

router.get('/settings', async (_req: Request, res: Response) => {
  const status = await getIndexStatus();
  res.json({
    success: true,
    settings: getSettings(),
    meta: {
      provider: status.provider,
      vectorStore: status.vectorStore,
      aiAvailable: isAiVerificationConfigured(),
      embeddingProvider: getEmbeddingProvider().name,
      supportedEmbeddingProviders: ['local-visual-v1', 'gemini-multimodal'],
      supportedVectorStores: ['json-file', 'qdrant', 'memory'],
    },
  });
});

router.post('/settings', (req: Request, res: Response) => {
  try {
    const settings = saveSettings(req.body || {});
    res.json({ success: true, settings });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message });
  }
});

// ---------------------------------------------------------------------------
// تست خودکار موتور (Self-Test)
// ---------------------------------------------------------------------------

/**
 * تست سلامت سرتاسری: یک تصویر کاتالوگ را به‌عنوان «عکس کاربر» می‌فرستد و
 * انتظار دارد نتیجه EXACT همان محصول باشد. اگر این تست رد شود یعنی زنجیره‌ی
 * Embedding → Vector Search → Exact Verification مشکل دارد.
 */
router.get('/self-test', async (req: Request, res: Response) => {
  try {
    const sample = Math.max(1, Math.min(100, Number(req.query.sample) || 5));
    const products = loadProductRecords().filter(p => p.images.length > 0);
    const results: { sku: string; resultType: string; matchedSku?: string; passed: boolean; ms: number }[] = [];

    const step = Math.max(1, Math.floor(products.length / sample));
    for (let i = 0; i < products.length && results.length < sample; i += step) {
      const product = products[i];
      const abs = resolveImagePath(product.mainImage) || product.images[0].imagePath;
      if (!abs || !fs.existsSync(abs)) continue;
      const dataUrl = `data:image/png;base64,${fs.readFileSync(abs).toString('base64')}`;
      const t0 = Date.now();
      const { response } = await searchByImage({
        imageBase64: dataUrl,
        verifier: createVerifier(undefined), // تست باید آفلاین و قطعی باشد
      });
      const matched = response.exactMatch?.sku;
      results.push({
        sku: product.sku,
        resultType: response.resultType,
        matchedSku: matched,
        passed: response.resultType === 'EXACT' && matched === product.sku,
        ms: Date.now() - t0,
      });
    }

    const passed = results.filter(r => r.passed).length;
    res.json({
      success: true,
      total: results.length,
      passed,
      accuracy: results.length ? Number((passed / results.length).toFixed(3)) : 0,
      results,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message });
  }
});

// ---------------------------------------------------------------------------
// متادیتای موتور (برای نمایش در پنل مدیریت)
// ---------------------------------------------------------------------------

router.get('/info', async (_req: Request, res: Response) => {
  const provider = getEmbeddingProvider();
  const status = await getIndexStatus();
  res.json({
    success: true,
    module: 'Atlas Visual Product Search',
    version: 1,
    embedding: { provider: provider.name, dim: provider.dim, available: provider.isAvailable() },
    vectorStore: status.vectorStore,
    aiVerification: isAiVerificationConfigured(),
    pipeline: [
      'Image Preprocessing',
      'Visual Feature Extraction',
      'Image Embedding (4 views)',
      'Vector Search (kNN)',
      'Grouping by Product ID',
      'Virtual Re-ranking',
      'Exact Verification',
      'Exact / Similar / No Match Decision',
    ],
  });
});

export const visualSearchRouter = router;
export { createEmbeddingProvider };
