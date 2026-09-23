/**
 * Atlas Visual Product Search — Vector Store Abstraction
 * ---------------------------------------------------------------------------
 * طبق نقشه راه (§۶): انبار برداری باید «قابل تعویض» باشد؛ تغییر موتور برداری
 * نباید کل سیستم را تحت تأثیر قرار دهد. بنابراین:
 *
 *    interface VectorStore   ← قرارداد ثابت
 *        ├── JsonVectorStore      (پیش‌فرض، بدون سرویس خارجی، پایدار روی دیسک)
 *        ├── QdrantVectorStore    (اختیاری، وقتی QDRANT_URL تنظیم شود)
 *        └── InMemoryVectorStore  (برای تست)
 *
 * انتخاب انبار با متغیر محیطی VISUAL_SEARCH_VECTOR_STORE انجام می‌شود:
 *    'json' (پیش‌فرض) | 'qdrant' | 'memory'
 *
 * نکته‌ی مقیاس‌پذیری: در پیاده‌سازی JSON، بردارها به‌صورت Int8 کوانتیزه و
 * Base64 ذخیره می‌شوند (هر ۵۱۲ بُعد ≈ ۶۹۰ بایت) و جستجو با ضرب داخلی
 * برداری انجام می‌شود؛ همین قرارداد با Qdrant هم بدون تغییر کد بالادستی کار می‌کند.
 */

import fs from 'fs';
import path from 'path';
import type {
  EmbeddingRecord,
  EmbeddingProviderName,
  EmbeddingView,
  ImageType,
  SearchQueryVector,
  VectorSearchHit,
  VectorStore,
} from './types';
import { RUNTIME_DIR, ensureRuntimePaths } from './catalog';

// ---------------------------------------------------------------------------
// کدگذاری فشرده‌ی بردار: Float32 (-1..1) → Int8 → Base64
// ---------------------------------------------------------------------------

export function encodeVector(vec: Float32Array): string {
  const bytes = Buffer.alloc(vec.length);
  for (let i = 0; i < vec.length; i++) {
    const clamped = Math.max(-1, Math.min(1, vec[i]));
    bytes[i] = Math.round(clamped * 127) & 0xff;
  }
  return bytes.toString('base64');
}

export function decodeVector(b64: string, dim?: number): Float32Array {
  const bytes = Buffer.from(b64, 'base64');
  const out = new Float32Array(dim || bytes.length);
  for (let i = 0; i < out.length && i < bytes.length; i++) {
    const signed = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
    out[i] = signed / 127;
  }
  return out;
}

/**
 * کدگذاری دقیق Float32 → Base64.
 * بردارهای ابری (مثل Jina CLIP با ۱۰۲۴ بُعد) با ۸ بیت کوانتیزه نمی‌شوند؛
 * چون اطلاعات جهت‌دار آن‌ها ظریف‌تر است و کوانتیزاسیون دقت بازیابی را کم می‌کند.
 */
export function encodeVectorF32(vec: Float32Array): string {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength).toString('base64');
}

export function decodeVectorF32(b64: string, dim: number): Float32Array {
  const buf = Buffer.from(b64, 'base64');
  const out = new Float32Array(dim);
  const src = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  for (let i = 0; i < dim && i < src.length; i++) out[i] = src[i];
  return out;
}

interface SerializedRecord {
  id: string;
  productId: string;
  sku: string;
  imagePath: string;
  imageUrl: string;
  imageType: ImageType;
  view: EmbeddingView;
  provider: EmbeddingProviderName;
  dim: number;
  vector: string; // base64 (Int8 یا Float32 بر اساس encoding)
  encoding?: 'int8' | 'f32';
  signature?: EmbeddingRecord['signature'];
}

function normalize(vec: Float32Array): void {
  let n = 0;
  for (let i = 0; i < vec.length; i++) n += vec[i] * vec[i];
  n = Math.sqrt(n);
  if (n > 1e-9) for (let i = 0; i < vec.length; i++) vec[i] /= n;
}

/**
 * ضرب داخلی — فقط برای بردارهای هم‌ابعاد.
 * اگر ابعاد متفاوت باشند (مثلاً ایندکسی با موتور محلی ۵۱۲ بُعدی و پرس‌وجویی
 * با موتور ابری ۱۰۲۴ بُعدی)، به‌جای امتیاز بی‌معنا، منفی بی‌نهایت برمی‌گردد
 * تا آن رکورد از رتبه‌بندی حذف شود.
 */
function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return Number.NEGATIVE_INFINITY;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// ---------------------------------------------------------------------------
// ۱) In-Memory Store (پایه‌ی مشترک)
// ---------------------------------------------------------------------------

interface StoredVector {
  meta: Omit<EmbeddingRecord, 'vector' | 'signature'>;
  vector: Float32Array;
  signature?: EmbeddingRecord['signature'];
}

export class InMemoryVectorStore implements VectorStore {
  readonly kind: string = 'memory';
  protected vectors: StoredVector[] = [];
  protected byId = new Map<string, number>();

  async init(): Promise<void> {
    /* nothing to load */
  }

  async count(): Promise<number> {
    return this.vectors.length;
  }

  async upsert(records: EmbeddingRecord[]): Promise<void> {
    for (const rec of records) {
      const vec = Float32Array.from(rec.vector);
      normalize(vec);
      const meta = {
        id: rec.id,
        productId: rec.productId,
        sku: rec.sku,
        imagePath: rec.imagePath,
        imageUrl: rec.imageUrl,
        imageType: rec.imageType,
        view: rec.view,
        provider: rec.provider,
        dim: rec.dim,
      };
      const existing = this.byId.get(rec.id);
      if (existing !== undefined) {
        this.vectors[existing] = { meta, vector: vec, signature: rec.signature };
      } else {
        this.byId.set(rec.id, this.vectors.length);
        this.vectors.push({ meta, vector: vec, signature: rec.signature });
      }
    }
  }

  async deleteByProduct(productId: string): Promise<number> {
    const before = this.vectors.length;
    this.vectors = this.vectors.filter(v => v.meta.productId !== productId);
    this.reindexIds();
    return before - this.vectors.length;
  }

  async deleteByImage(imagePath: string): Promise<number> {
    const before = this.vectors.length;
    this.vectors = this.vectors.filter(v => v.meta.imagePath !== imagePath);
    this.reindexIds();
    return before - this.vectors.length;
  }

  protected reindexIds(): void {
    this.byId.clear();
    this.vectors.forEach((v, i) => this.byId.set(v.meta.id, i));
  }

  async search(queryVectors: SearchQueryVector[], limit: number): Promise<VectorSearchHit[]> {
    if (!queryVectors.length || !this.vectors.length) return [];
    const best = new Map<string, VectorSearchHit>();
    for (const q of queryVectors) {
      const qv = Float32Array.from(q.vector);
      normalize(qv);
      for (const stored of this.vectors) {
        if (stored.vector.length !== qv.length) continue; // ابعاد ناهمخوان (ایندکس قدیمی)
        const sim = dot(qv, stored.vector);
        const prev = best.get(stored.meta.id);
        if (!prev || sim > prev.similarity) {
          best.set(stored.meta.id, {
            id: stored.meta.id,
            productId: stored.meta.productId,
            imagePath: stored.meta.imagePath,
            imageUrl: stored.meta.imageUrl,
            imageType: stored.meta.imageType,
            view: stored.meta.view,
            similarity: sim,
          });
        }
      }
    }
    return Array.from(best.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * بهترین بردار هر محصول — بدون برش زودهنگام بر اساس امتیاز.
   * (تمامی محصولات با بهترین شباهت برداری‌شان برگردانده می‌شوند تا مرحله‌ی
   * Re-ranking بتواند با سیگنال‌های دقیق‌تر تصمیم بگیرد.)
   */
  async bestByProduct(queryVectors: SearchQueryVector[], maxProducts = 2000): Promise<VectorSearchHit[]> {
    if (!queryVectors.length || !this.vectors.length) return [];
    const prep = queryVectors.map(q => {
      const v = Float32Array.from(q.vector);
      normalize(v);
      return v;
    });
    const best = new Map<string, number>();
    for (const stored of this.vectors) {
      // مقایسه بر پایه‌ی «هم‌ابعادیِ همان پرس‌وجو با همان بردار ذخیره‌شده» انجام
      // می‌شود؛ نه بر پایه‌ی ابعاد اولین پرس‌وجو (پرس‌وجو می‌تواند چند نما با
      // ابعاد مختلف داشته باشد و بردارهای ذخیره‌شده یک ابعاد ثابت).
      let top = -Infinity;
      for (const qv of prep) {
        if (qv.length !== stored.vector.length) continue;
        const sim = dot(qv, stored.vector);
        if (sim > top) top = sim;
      }
      if (top === -Infinity) continue; // ابعاد ناهمخوان (ایندکس قدیمی / موتور دیگر)
      const prev = best.get(stored.meta.productId);
      if (prev === undefined || top > prev) best.set(stored.meta.productId, top);
    }
    const byProduct = new Map<string, StoredVector>();
    for (const v of this.vectors) {
      const prev = byProduct.get(v.meta.productId);
      if (!prev) byProduct.set(v.meta.productId, v);
    }
    return Array.from(best.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxProducts)
      .map(([productId, similarity]) => {
        const sv = byProduct.get(productId)!;
        return {
          id: sv.meta.id,
          productId,
          imagePath: sv.meta.imagePath,
          imageUrl: sv.meta.imageUrl,
          imageType: sv.meta.imageType,
          view: sv.meta.view,
          similarity,
        };
      });
  }

  async indexedProductIds(): Promise<string[]> {
    return Array.from(new Set(this.vectors.map(v => v.meta.productId)));
  }

  async reset(): Promise<void> {
    this.vectors = [];
    this.byId.clear();
  }

  async health() {
    return { kind: this.kind, vectors: this.vectors.length, ok: true };
  }

  /** دسترسی به امضای ساختاری ذخیره‌شده (برای راستی‌آزمایی EXACT) */
  getSignature(id: string): EmbeddingRecord['signature'] | undefined {
    const idx = this.byId.get(id);
    return idx === undefined ? undefined : this.vectors[idx].signature;
  }

  getSignatureByImagePath(imagePath: string): EmbeddingRecord['signature'] | undefined {
    const found = this.vectors.find(v => v.meta.imagePath === imagePath && v.signature);
    return found?.signature;
  }

  getAllRecords(): { meta: StoredVector['meta']; signature?: EmbeddingRecord['signature'] }[] {
    return this.vectors.map(v => ({ meta: v.meta, signature: v.signature }));
  }
}

// ---------------------------------------------------------------------------
// ۲) JSON Store (پیش‌فرض — پایدار روی دیسک، بدون سرویس خارجی)
// ---------------------------------------------------------------------------

export class JsonVectorStore extends InMemoryVectorStore {
  override readonly kind = 'json-file';
  private filePath: string;
  private dirty = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(fileName = 'vector-index.json') {
    super();
    ensureRuntimePaths();
    this.filePath = path.join(RUNTIME_DIR, fileName);
  }

  override async init(): Promise<void> {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as {
          version: number;
          records: SerializedRecord[];
        };
        this.vectors = [];
        this.byId.clear();
        for (const rec of data.records || []) {
          const vec = rec.encoding === 'f32' ? decodeVectorF32(rec.vector, rec.dim) : decodeVector(rec.vector, rec.dim);
          normalize(vec);
          const meta = {
            id: rec.id,
            productId: rec.productId,
            sku: rec.sku,
            imagePath: rec.imagePath,
            imageUrl: rec.imageUrl,
            imageType: rec.imageType,
            view: rec.view,
            provider: rec.provider,
            dim: rec.dim,
          };
          this.byId.set(rec.id, this.vectors.length);
          this.vectors.push({ meta, vector: vec, signature: rec.signature });
        }
        console.log(`[VisualSearch] Vector store loaded: ${this.vectors.length} vectors from disk.`);
      }
    } catch (e: any) {
      console.warn('[VisualSearch] Vector store load failed, starting empty:', e?.message);
    }
  }

  override async upsert(records: EmbeddingRecord[]): Promise<void> {
    await super.upsert(records);
    this.scheduleFlush();
  }

  override async deleteByProduct(productId: string): Promise<number> {
    const n = await super.deleteByProduct(productId);
    if (n > 0) this.scheduleFlush();
    return n;
  }

  override async deleteByImage(imagePath: string): Promise<number> {
    const n = await super.deleteByImage(imagePath);
    if (n > 0) this.scheduleFlush();
    return n;
  }

  override async reset(): Promise<void> {
    await super.reset();
    await this.flush();
  }

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 1500);
  }

  async flush(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    const records: SerializedRecord[] = this.vectors.map(v => ({
      ...v.meta,
      encoding: (v.meta.dim || v.vector.length) > 512 ? ('f32' as const) : ('int8' as const),
      vector:
        (v.meta.dim || v.vector.length) > 512 ? encodeVectorF32(v.vector) : encodeVector(v.vector),
      signature: v.signature,
    }));
    const tmp = `${this.filePath}.tmp`;
    try {
      ensureRuntimePaths();
      fs.writeFileSync(tmp, JSON.stringify({ version: 1, records }));
      fs.renameSync(tmp, this.filePath);
    } catch (e: any) {
      console.error('[VisualSearch] Vector store flush failed:', e?.message);
    }
  }

  override async health() {
    let ok = true;
    let detail: string | undefined;
    try {
      ensureRuntimePaths();
      fs.accessSync(path.dirname(this.filePath), fs.constants.W_OK);
      if (fs.existsSync(this.filePath)) {
        detail = `${(fs.statSync(this.filePath).size / 1024 / 1024).toFixed(1)} MB روی دیسک`;
      } else {
        detail = 'فایل ایندکس هنوز ساخته نشده';
      }
    } catch (e: any) {
      ok = false;
      detail = e?.message;
    }
    return { kind: this.kind, vectors: this.vectors.length, ok, detail };
  }
}

// ---------------------------------------------------------------------------
// ۳) Qdrant Store (اختیاری — همان قرارداد، بدون تغییر در بقیه‌ی سیستم)
// ---------------------------------------------------------------------------

export class QdrantVectorStore implements VectorStore {
  readonly kind = 'qdrant';
  private url: string;
  private apiKey?: string;
  private collection: string;
  private ready = false;

  constructor(opts: { url: string; apiKey?: string; collection?: string }) {
    this.url = opts.url.replace(/\/$/, '');
    this.apiKey = opts.apiKey;
    this.collection = opts.collection || 'atlas_visual_products';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'api-key': this.apiKey } : {}),
    };
  }

  private async request(method: string, endpoint: string, body?: unknown): Promise<any> {
    const res = await fetch(`${this.url}${endpoint}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Qdrant ${method} ${endpoint} → ${res.status} ${text.slice(0, 200)}`);
    }
    return res.json().catch(() => ({}));
  }

  async init(): Promise<void> {
    try {
      const info = await this.request('GET', `/collections/${this.collection}`).catch(() => null);
      if (!info || info?.status === 'error' || !info?.result) {
        await this.request('PUT', `/collections/${this.collection}`, {
          vectors: { size: 512, distance: 'Cosine', on_disk: true },
        });
      }
      this.ready = true;
      console.log(`[VisualSearch] Qdrant ready: ${this.url} / ${this.collection}`);
    } catch (e: any) {
      this.ready = false;
      console.warn('[VisualSearch] Qdrant unavailable, falling back to no-op:', e?.message);
    }
  }

  private pointId(id: string): string {
    // Qdrant نیاز به UUID یا عدد دارد → هش قطعی از شناسه می‌سازیم
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const hex = Math.abs(h).toString(16).padStart(8, '0');
    return `${hex}-0000-4000-8000-${Math.abs(h ^ 0x9e3779b9).toString(16).padStart(12, '0')}`.slice(0, 36);
  }

  async count(): Promise<number> {
    if (!this.ready) return 0;
    try {
      const r = await this.request('POST', `/collections/${this.collection}/points/count`, { exact: true });
      return r?.result?.count ?? 0;
    } catch {
      return 0;
    }
  }

  async upsert(records: EmbeddingRecord[]): Promise<void> {
    if (!this.ready || !records.length) return;
    const points = records.map(rec => ({
      id: this.pointId(rec.id),
      vector: Array.from(rec.vector),
      payload: {
        recordId: rec.id,
        productId: rec.productId,
        sku: rec.sku,
        imagePath: rec.imagePath,
        imageUrl: rec.imageUrl,
        imageType: rec.imageType,
        view: rec.view,
        provider: rec.provider,
      },
    }));
    for (let i = 0; i < points.length; i += 256) {
      await this.request('PUT', `/collections/${this.collection}/points?wait=true`, {
        points: points.slice(i, i + 256),
      });
    }
  }

  async deleteByProduct(productId: string): Promise<number> {
    if (!this.ready) return 0;
    await this.request('POST', `/collections/${this.collection}/points/delete?wait=true`, {
      filter: { must: [{ key: 'productId', match: { value: productId } }] },
    });
    return 0;
  }

  async deleteByImage(imagePath: string): Promise<number> {
    if (!this.ready) return 0;
    await this.request('POST', `/collections/${this.collection}/points/delete?wait=true`, {
      filter: { must: [{ key: 'imagePath', match: { value: imagePath } }] },
    });
    return 0;
  }

  async search(queryVectors: SearchQueryVector[], limit: number): Promise<VectorSearchHit[]> {
    if (!this.ready || !queryVectors.length) return [];
    const best = new Map<string, VectorSearchHit>();
    for (const q of queryVectors) {
      const res = await this.request('POST', `/collections/${this.collection}/points/search`, {
        vector: Array.from(q.vector),
        limit,
        with_payload: true,
      });
      for (const hit of res?.result || []) {
        const p = hit.payload || {};
        const id = p.recordId || String(hit.id);
        const similarity = hit.score;
        const prev = best.get(id);
        if (!prev || similarity > prev.similarity) {
          best.set(id, {
            id,
            productId: p.productId,
            imagePath: p.imagePath,
            imageUrl: p.imageUrl,
            imageType: (p.imageType as ImageType) || 'catalog',
            view: (p.view as EmbeddingView) || 'full',
            similarity,
          });
        }
      }
    }
    return Array.from(best.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async bestByProduct(queryVectors: SearchQueryVector[], maxProducts = 2000): Promise<VectorSearchHit[]> {
    // در Qdrant پیاده‌سازی گروه‌بندی از طریق فیلتر پشتیبانی می‌شود؛ برای سادگی
    // و سازگاری، از جستجوی گسترده استفاده و در حافظه گروه‌بندی می‌کنیم.
    const hits = await this.search(queryVectors, Math.max(256, maxProducts * 4));
    const best = new Map<string, VectorSearchHit>();
    for (const hit of hits) {
      const prev = best.get(hit.productId);
      if (!prev || hit.similarity > prev.similarity) best.set(hit.productId, hit);
    }
    return Array.from(best.values()).slice(0, maxProducts);
  }

  async indexedProductIds(): Promise<string[]> {
    if (!this.ready) return [];
    try {
      const res = await this.request('POST', `/collections/${this.collection}/points/scroll`, {
        limit: 10000,
        with_payload: ['productId'],
        with_vector: false,
      });
      const ids = new Set<string>();
      for (const p of res?.result?.points || []) if (p.payload?.productId) ids.add(p.payload.productId);
      return Array.from(ids);
    } catch {
      return [];
    }
  }

  async reset(): Promise<void> {
    if (!this.ready) return;
    await this.request('DELETE', `/collections/${this.collection}`);
    await this.init();
  }

  async health() {
    if (!this.ready) return { kind: this.kind, vectors: 0, ok: false, detail: 'اتصال برقرار نشد' };
    try {
      const vectors = await this.count();
      return { kind: this.kind, vectors, ok: true, detail: `${this.url}/${this.collection}` };
    } catch (e: any) {
      return { kind: this.kind, vectors: 0, ok: false, detail: e?.message };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let storeInstance: VectorStore | null = null;

export function createVectorStore(): VectorStore {
  if (storeInstance) return storeInstance;
  const kind = (process.env.VISUAL_SEARCH_VECTOR_STORE || 'json').toLowerCase();
  if (kind === 'qdrant' && process.env.QDRANT_URL) {
    storeInstance = new QdrantVectorStore({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collection: process.env.QDRANT_COLLECTION,
    });
  } else if (kind === 'memory') {
    storeInstance = new InMemoryVectorStore();
  } else {
    storeInstance = new JsonVectorStore();
  }
  return storeInstance;
}

export function getVectorStore(): VectorStore {
  return storeInstance || createVectorStore();
}
