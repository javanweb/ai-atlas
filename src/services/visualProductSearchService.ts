/**
 * سرویس فرانت‌اند «جستجوی بصری محصول» — Atlas Visual Product Search
 * ---------------------------------------------------------------------------
 * نکته‌ی مهم: نام فایل تصویر هرگز به سرور ارسال نمی‌شود. فقط پیکسل‌ها.
 * هیچ درصد شباهتی در هیچ‌کدام از انواع زیر وجود ندارد.
 */

export type VisualSearchResultType = 'EXACT' | 'SIMILAR' | 'NO_MATCH';

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
  reason: string;
}

export interface VisualSearchResponse {
  success: boolean;
  resultType: VisualSearchResultType;
  message: string;
  subMessage?: string;
  exactMatch?: VisualSearchItem;
  similarMatches: VisualSearchItem[];
  customRequest?: {
    available: boolean;
    title: string;
    message: string;
    ctaLabel: string;
  };
  queryId: string;
  aiAssisted: boolean;
  error?: string;
}

export interface CustomRequestInput {
  imageBase64?: string;
  description: string;
  quantity: string;
  contactName: string;
  contactPhone: string;
  company?: string;
  extraNotes?: string;
  queryId?: string;
}

export type CustomRequestStatus =
  | 'new'
  | 'under_review'
  | 'can_manufacture'
  | 'can_supply'
  | 'need_more_info'
  | 'closed';

export interface CustomRequestRecord extends CustomRequestInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: CustomRequestStatus;
  imageDataUrl?: string;
  adminNote?: string;
  statusHistory: { status: CustomRequestStatus; at: string; note?: string }[];
}

export interface IndexStatusPayload {
  ready: boolean;
  building: boolean;
  provider: string;
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

export interface VisualSearchLog {
  id: string;
  createdAt: string;
  resultType: VisualSearchResultType;
  thumbnailDataUrl?: string;
  exactSku?: string;
  similarSkus: string[];
  candidateCount: number;
  aiAssisted: boolean;
  totalTimeMs: number;
  bestInternalScore: number;
  exactPath: string;
  notes: string[];
}

export interface VisualSearchSettings {
  minSimilarResults: number;
  maxSimilarResults: number;
  similarScoreFloor: number;
  candidateScoreFloor: number;
  exactVectorFloor: number;
  useAiVerification: boolean;
  maxAiCandidates: number;
  preferredSimilarResults: number;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // پیام خطای سرور را ترجیح می‌دهیم (مثلاً «ایندکس‌سازی دیگری در حال اجراست»)
    const raw = await res.text().catch(() => '');
    let serverError = '';
    try {
      const parsed = JSON.parse(raw);
      serverError = String(parsed?.error || parsed?.message || '');
    } catch {
      serverError = raw.slice(0, 160);
    }
    throw new Error(serverError || `خطای سرور (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`خطای سرور (${res.status})`);
  return res.json() as Promise<T>;
}

export const visualProductSearchService = {
  /** جستجو با تصویر — فقط پیکسل ارسال می‌شود، نه نام فایل */
  async search(fileOrDataUrl: File | string): Promise<VisualSearchResponse> {
    const imageBase64 = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : await this.fileToDataUrl(fileOrDataUrl);
    return postJson<VisualSearchResponse>('/api/visual-search/search', { imageBase64 });
  },

  async submitCustomRequest(input: CustomRequestInput): Promise<{ success: boolean; requestId: string }> {
    return postJson('/api/visual-search/requests', input);
  },

  async getIndexStatus(): Promise<{ success: boolean; status: IndexStatusPayload }> {
    return getJson('/api/visual-search/index/status');
  },

  async reindex(reset = false): Promise<{ success: boolean; message: string }> {
    return postJson('/api/visual-search/index/reindex', { reset });
  },

  async reindexProduct(productId: string): Promise<{ success: boolean; records: number }> {
    return postJson('/api/visual-search/index/product', { productId });
  },

  async addProductImage(productId: string, file: File, imageType = 'gallery'): Promise<{ success: boolean; vectors: number }> {
    const imageBase64 = await this.fileToDataUrl(file);
    return postJson(`/api/visual-search/index/product/${encodeURIComponent(productId)}/images`, {
      imageBase64,
      imageType,
    });
  },

  async getLogs(limit = 100): Promise<{ success: boolean; logs: VisualSearchLog[]; stats: any }> {
    return getJson(`/api/visual-search/logs?limit=${limit}`);
  },

  async clearLogs(): Promise<{ success: boolean }> {
    const res = await fetch('/api/visual-search/logs', { method: 'DELETE' });
    return res.json();
  },

  async getRequests(): Promise<{ success: boolean; requests: CustomRequestRecord[]; stats: any }> {
    return getJson('/api/visual-search/requests');
  },

  async updateRequestStatus(id: string, status: CustomRequestStatus, adminNote?: string) {
    const res = await fetch(`/api/visual-search/requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote }),
    });
    return res.json();
  },

  async deleteRequest(id: string) {
    const res = await fetch(`/api/visual-search/requests/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.json();
  },

  async getSettings(): Promise<{ success: boolean; settings: VisualSearchSettings; meta: any }> {
    return getJson('/api/visual-search/settings');
  },

  async saveSettings(patch: Partial<VisualSearchSettings>) {
    return postJson<{ success: boolean; settings: VisualSearchSettings }>('/api/visual-search/settings', patch);
  },

  async selfTest(sample = 5) {
    return getJson<{
      success: boolean;
      total: number;
      passed: number;
      accuracy: number;
      results: { sku: string; resultType: string; matchedSku?: string; passed: boolean; ms: number }[];
    }>(`/api/visual-search/self-test?sample=${sample}`);
  },

  /** تبدیل File به dataURL — هیچ نامی از فایل به سرور نمی‌رود */
  fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = e => reject(e);
      reader.readAsDataURL(file);
    });
  },
};

export const CUSTOM_REQUEST_STATUS_LABELS: Record<CustomRequestStatus, string> = {
  new: 'جدید',
  under_review: 'در حال بررسی',
  can_manufacture: 'امکان ساخت',
  can_supply: 'امکان تأمین',
  need_more_info: 'نیاز به اطلاعات بیشتر',
  closed: 'بسته‌شده',
};
