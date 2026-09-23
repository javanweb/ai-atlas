/**
 * Atlas Visual Product Search — Core Types
 * ---------------------------------------------------------------------------
 * ماژول مستقل «جستجوی بصری محصول» برای هایپر صنعت اطلس.
 *
 * قواعد بنیادین این ماژول (طبق نقشه راه):
 *  ۱. هیچ‌جای خط لوله (pipeline) به نام فایل، EXIF، متادیتا یا کد محصول وابسته نیست.
 *     تنها ورودی، پیکسل‌های تصویر است (Buffer).
 *  ۲. درصد شباهت هرگز به کاربر نمایش داده نمی‌شود. امتیازها فقط داخلی هستند.
 *  ۳. اصل حاکم: «پیدا نکردن بهتر از معرفی محصول اشتباه است.»
 */

// ---------------------------------------------------------------------------
// 1) موجودیت‌های دامنه (Domain Entities)
// ---------------------------------------------------------------------------

export type ImageType =
  | 'main'       // تصویر اصلی محصول
  | 'catalog'    // تصویر کاتالوگ رسمی
  | 'gallery'    // زاویه دوم / سوم
  | 'closeup'    // نمای نزدیک
  | 'packaging';

export interface ProductRecord {
  /** شناسه ثابت داخلی محصول */
  id: string;
  /** کد نمایشی محصول (ممکن است تغییر کند) */
  sku: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoryName: string;
  subcategory: string;
  description?: string;
  /** مسیر صفحه محصول در سایت */
  productUrl: string;
  /** تصویر اصلی */
  mainImage: string;
  /** آدرس عمومی تصویر اصلی (برای نمایش در فرانت) */
  mainImageUrl: string;
  /** همه تصاویر ثبت‌شده محصول */
  images: ProductImageRecord[];
  stock: number;
  price: number;
  /** آیا امکان ساخت/تأمین سفارشی وجود دارد؟ */
  customOrderAvailable: boolean;
  /** وضعیت «فقط استعلامی» */
  inquiryOnly: boolean;
  cataloguePage?: number;
  forzaCode?: string;
  specs?: { key: string; value: string }[];
}

export interface ProductImageRecord {
  id: string;
  productId: string;
  /** مسیر تصویر در سرور (منبع embedding) */
  imagePath: string;
  /** آدرس عمومی برای نمایش در فرانت */
  imageUrl: string;
  imageType: ImageType;
  /** هش محتوای فایل — برای تشخیص «تصویر تغییر کرده» */
  contentHash: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 2) لایه Embedding (قابل تعویض)
// ---------------------------------------------------------------------------

/**
 * «نماینده‌ی» یک تصویر: بردار بصری + امضای ساختاری (برای راستی‌آزمایی دقیق).
 * امضای ساختاری برای تصمیم EXACT استفاده می‌شود، نه برای بازیابی.
 */
export interface ImageSignature {
  /** شبکه‌ی عصبی محلی — 512 بُعد، L2 نرمال‌شده */
  embedding: Float32Array;
  /** dHash 256 بیتی (۶۴ کاراکتر hex) */
  dHash: string;
  /** pHash 64 بیتی (۱۶ کاراکتر hex) */
  pHash: string;
  /** aHash 64 بیتی (۱۶ کاراکتر hex) */
  aHash: string;
  /** امضای هندسی/ساختاری — مستقل از رنگ و نور */
  structure: StructureSignature;
  /** هیستوگرام رنگ نرمال‌شده (۶۴ سطل) */
  colorHistogram: number[];
}

export interface StructureSignature {
  /** نسبت ابعاد جسم اصلی (پس از ایزوله‌سازی) */
  aspectRatio: number;
  /** نسبت پرشدگی جسم (مساحت جسم / مساحت کادر) */
  fillRatio: number;
  /** تعداد حفره‌ها/سوراخ‌های داخلی قابل شمارش */
  holeCount: number;
  /** تعداد اجزای متصل برجسته (پره/دندانه‌ی جدا) */
  componentCount: number;
  /** پروفایل محیطی نرمال‌شده ریزی/درشتی لبه‌ها */
  edgeDensity: number;
  /** امضای شعاعی ۱۶ بخشی (شکل کلی) */
  radial: number[];
  /** هیستوگرام جهت لبه ۱۲ سطلی */
  orientation: number[];
}

export type EmbeddingProviderName = 'local-visual-v1' | 'gemini-multimodal';

export interface EmbeddingRecord {
  id: string;
  productId: string;
  sku: string;
  imagePath: string;
  imageUrl: string;
  imageType: ImageType;
  /** نوع «نما»ی این بردار: full | object | object-rot180 | object-flip */
  view: EmbeddingView;
  provider: EmbeddingProviderName;
  dim: number;
  /** بردار ۵۱۲ بُعدی، نرمال‌شده */
  vector: Float32Array;
  /** امضای ساختاری + هش‌ها (فقط برای نمای full ذخیره می‌شود) */
  signature?: SerializedSignature;
}

export interface SerializedSignature {
  dHash: string;
  pHash: string;
  aHash: string;
  structure: StructureSignature;
  colorHistogram: number[];
}

export type EmbeddingView = 'full' | 'object' | 'object-rot180' | 'object-flip';

export const EMBEDDING_VIEWS: EmbeddingView[] = ['full', 'object', 'object-rot180', 'object-flip'];

export interface EmbeddingProvider {
  readonly name: EmbeddingProviderName;
  readonly dim: number;
  /** آیا این ارائه‌دهنده در محیط فعلی در دسترس است؟ */
  isAvailable(): boolean;
  /**
   * تولید امضاهای تصویر (embedding + امضای ساختاری).
   * ورودی فقط Buffer است — هیچ نام فایل یا متادیتایی وارد این تابع نمی‌شود.
   */
  analyzeImage(buffer: Buffer): Promise<ImageSignature>;
}

// ---------------------------------------------------------------------------
// 3) لایه Vector Store (قابل تعویض: JSON محلی / Qdrant / ...)
// ---------------------------------------------------------------------------

export interface VectorSearchHit {
  id: string;
  productId: string;
  imagePath: string;
  imageUrl: string;
  imageType: ImageType;
  view: EmbeddingView;
  /** شباهت کسینوسی در بازه ۰..۱ (بالاتر = نزدیک‌تر) */
  similarity: number;
}

export interface VectorStore {
  readonly kind: string;
  init(): Promise<void>;
  /** تعداد بردارهای ذخیره‌شده */
  count(): Promise<number>;
  upsert(records: EmbeddingRecord[]): Promise<void>;
  deleteByProduct(productId: string): Promise<number>;
  deleteByImage(imagePath: string): Promise<number>;
  /** جستجوی نزدیک‌ترین همسایه‌ها */
  search(queryVectors: SearchQueryVector[], limit: number): Promise<VectorSearchHit[]>;
  /**
   * بهترین بردار هر محصول (بدون برش زودهنگام).
   * چون شباهت برداری در تصاویر صنعتیِ هم‌خانواده اشباع می‌شود، مرحله‌ی بازیابی
   * نباید با limit کوچک، کاندیدای درست را حذف کند؛ رتبه‌بندی واقعی در
   * مرحله‌ی Re-ranking (ساختار + هش) انجام می‌شود.
   */
  bestByProduct(queryVectors: SearchQueryVector[], maxProducts?: number): Promise<VectorSearchHit[]>;
  /** لیست شناسه محصولاتی که موجودیت برداری دارند (برای وضعیت ایندکس) */
  indexedProductIds(): Promise<string[]>;
  /** پاک‌سازی کامل */
  reset(): Promise<void>;
  /** آمار سلامت انبار برداری */
  health(): Promise<{ kind: string; vectors: number; ok: boolean; detail?: string }>;
}

export interface SearchQueryVector {
  view: EmbeddingView;
  vector: Float32Array;
}

// ---------------------------------------------------------------------------
// 4) نتیجه جستجو — سه حالت رسمی
// ---------------------------------------------------------------------------

export type VisualSearchResultType = 'EXACT' | 'SIMILAR' | 'NO_MATCH';

/** دلیل داخلی تصمیم — برای لاگ/پنل مدیریت، هرگز برای کاربر */
export interface DecisionTrace {
  retrievalTimeMs: number;
  decisionTimeMs: number;
  totalTimeMs: number;
  candidateCount: number;
  verifiedCount: number;
  aiVerificationUsed: boolean;
  bestInternalScore: number;
  exactPath:
    | 'near-duplicate-structure'
    | 'rescaled-same-image'
    | 'ai-confirmed-exact'
    | 'none';
  downgrades: number;
  notes: string[];
}

/** آیتم نمایش‌داده‌شده به کاربر (بدون هیچ امتیازی) */
export interface VisualSearchItem {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  categoryName: string;
  subcategory: string;
  productUrl: string;
  imageUrl: string;
  stock: number;
  price: number;
  inquiryOnly: boolean;
  customOrderAvailable: boolean;
  cataloguePage?: number;
  forzaCode?: string;
  /** جمله‌ی فارسی غیرعددی که توضیح می‌دهد چرا این کالا پیشنهاد شده */
  reason: string;
}

export interface VisualSearchResponse {
  success: boolean;
  resultType: VisualSearchResultType;
  /** پیام فارسی آماده نمایش */
  message: string;
  /** پیام تکمیلی (مثلاً پیشنهاد ساخت سفارشی) */
  subMessage?: string;
  /** فقط در حالت EXACT پر می‌شود */
  exactMatch?: VisualSearchItem;
  /** فقط در حالت SIMILAR پر می‌شود (۳ تا ۶ مورد) */
  similarMatches: VisualSearchItem[];
  /** فقط در حالت NO_MATCH فعال است */
  customRequest?: {
    available: boolean;
    title: string;
    message: string;
    ctaLabel: string;
  };
  /** شناسه لاگ این جستجو (برای پیگیری در پنل مدیریت) */
  queryId: string;
  /** آیا موتور هوش مصنوعی در تصمیم‌گیری مشارکت داشت */
  aiAssisted: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// 5) درخواست ساخت / تأمین سفارشی
// ---------------------------------------------------------------------------

export type CustomRequestStatus =
  | 'new'                 // جدید
  | 'under_review'        // در حال بررسی
  | 'can_manufacture'     // امکان ساخت
  | 'can_supply'          // امکان تأمین
  | 'need_more_info'      // نیاز به اطلاعات بیشتر
  | 'closed';             // بسته‌شده

export interface CustomRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: CustomRequestStatus;
  /** تصویر ارسالی (dataURL) */
  imageDataUrl?: string;
  /** توضیحات قطعه */
  description: string;
  quantity: string;
  contactName: string;
  contactPhone: string;
  company?: string;
  extraNotes?: string;
  /** شناسه‌ی جستجوی متناظر (اگر از مسیر NO_MATCH آمده باشد) */
  queryId?: string;
  /** یادداشت کارشناس */
  adminNote?: string;
  statusHistory: { status: CustomRequestStatus; at: string; note?: string }[];
}

// ---------------------------------------------------------------------------
// 6) لاگ جستجو (برای پنل مدیریت)
// ---------------------------------------------------------------------------

export interface VisualSearchLog {
  id: string;
  createdAt: string;
  resultType: VisualSearchResultType;
  /** تصویر بندانگشتی (اسلیم) برای بازبینی در پنل */
  thumbnailDataUrl?: string;
  exactSku?: string;
  similarSkus: string[];
  candidateCount: number;
  aiAssisted: boolean;
  totalTimeMs: number;
  bestInternalScore: number;
  exactPath: DecisionTrace['exactPath'];
  notes: string[];
}

// ---------------------------------------------------------------------------
// 7) وضعیت ایندکس
// ---------------------------------------------------------------------------

export interface IndexStatus {
  ready: boolean;
  building: boolean;
  provider: EmbeddingProviderName;
  vectorStore: string;
  indexedProducts: number;
  totalProducts: number;
  indexedImages: number;
  totalImages: number;
  vectors: number;
  imagesWithoutEmbedding: { sku: string; image: string; reason: string }[];
  errors: { sku: string; image: string; message: string }[];
  lastIndexedAt?: string;
  lastDurationMs?: number;
  progress: { processed: number; total: number; current?: string };
  vectorDatabase: { kind: string; vectors: number; ok: boolean; detail?: string };
}

export interface VisualSearchSettings {
  /** حداقل تعداد نتایج مشابه برای نمایش حالت SIMILAR (۳ تا ۶) */
  minSimilarResults: number;
  /** حداکثر تعداد نتایج مشابه */
  maxSimilarResults: number;
  /** آستانه‌ی سخت‌گیرانه‌ی شباهت بصری برای حالت SIMILAR */
  similarScoreFloor: number;
  /** آستانه‌ی شباهت برای ورود کاندیدا به راستی‌آزمایی AI */
  candidateScoreFloor: number;
  /** آستانه‌ی شباهت برداری لازم برای تأیید EXACT توسط AI */
  exactVectorFloor: number;
  /** استفاده از راستی‌آزمایی چهره‌به‌چهره‌ی AI */
  useAiVerification: boolean;
  /** حداکثر تعداد کاندیدا برای راستی‌آزمایی AI */
  maxAiCandidates: number;
  /** تعداد نتایج مشابه پیشنهادی (۳ تا ۶) */
  preferredSimilarResults: number;
}
