/**
 * Atlas Visual Product Search — Module Entry (barrel)
 * ---------------------------------------------------------------------------
 * ماژول مستقل «جستجوی بصری محصول» اطلس.
 *
 * معماری ماژول:
 *   imagePreprocess.ts   → پردازش تصویر، تشخیص جسم اصلی، نرمال‌سازی نور
 *   visualEncoder.ts     → استخراج ویژگی بصری + Embedding ۵۱۲ بُعدی + امضای ساختاری
 *   embeddingProviders   → لایه‌ی قابل تعویض تولید Embedding (محلی / Gemini)
 *   vectorStore.ts       → لایه‌ی قابل تعویض انبار برداری (JSON / Qdrant / Memory)
 *   catalog.ts           → دفتر محصولات و تصاویر (چند تصویر برای هر محصول)
 *   indexManager.ts      → ایندکس‌سازی دسته‌ای، خودکار و بازسازی
 *   verifier.ts          → راستی‌آزمایی EXACT (near-duplicate و AI + نظر دوم)
 *   searchEngine.ts      → خط لوله‌ی جستجو و تصمیم سه‌حالته
 *   store.ts             → تنظیمات، درخواست‌های سفارشی، لاگ‌ها
 *   routes.ts            → API
 */

export { visualSearchRouter } from './routes';
export {
  initVisualSearch,
  isReady,
  isIndexBuilding,
  buildIndex,
  getIndexStatus,
  reindexProduct,
  removeProductFromIndex,
  addProductImage,
  startAutoIndexWatch,
} from './indexManager';
export { searchByImage } from './searchEngine';
export { createVerifier } from './verifier';
export { getSettings, saveSettings, DEFAULT_SETTINGS } from './store';
export { loadProductRecords, ensureRuntimePaths, RUNTIME_DIR } from './catalog';
export { createVectorStore, getVectorStore } from './vectorStore';
export { createEmbeddingProvider, getEmbeddingProvider } from './embeddingProviders';
export type * from './types';
