/**
 * Atlas Visual Product Search — Embedding Providers
 * ---------------------------------------------------------------------------
 * طبق نقشه راه (§۷): تولید Embedding باید یک لایه‌ی مستقل و قابل تعویض باشد.
 *
 *   EmbeddingProvider
 *      ├── local-visual-v1     ← پیش‌فرض: کاملاً محلی، آفلاین، قطعی (۵۱۲ بُعد)
 *      └── gemini-multimodal   ← اختیاری: وقتی GEMINI_API_KEY موجود باشد
 *
 * هر دو ارائه‌دهنده «امضای ساختاری» را از موتور محلی می‌گیرند، چون تصمیم
 * EXACT باید مستقل از دسترس‌پذیری سرویس ابری باشد.
 *
 * انتخاب با VISUAL_SEARCH_EMBEDDING_PROVIDER انجام می‌شود:
 *    'local' (پیش‌فرض) | 'gemini' | 'auto'
 */

import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';
import type {
  EmbeddingProvider,
  EmbeddingProviderName,
  EmbeddingView,
  ImageSignature,
  StructureSignature,
} from './types';
import { EMBEDDING_DIM, analyzeImageVariants, buildEmbedding } from './visualEncoder';
import { cropToBox, normalizeForAnalysis } from './imagePreprocess';

// ---------------------------------------------------------------------------
// ۱) ارائه‌دهنده‌ی محلی (پیش‌فرض)
// ---------------------------------------------------------------------------

/**
 * موتور بصری محلی:
 *   • یک‌بار نرمال‌سازی تصویر (نور، ابعاد، تشخیص جسم اصلی)
 *   • تولید بردار ۵۱۲ بُعدی برای ۴ «نما»: full / object / object-rot180 / object-flip
 *   • استخراج هش‌های ادراکی و امضای ساختاری برای راستی‌آزمایی
 *
 * هیچ وابستگی به شبکه، API و نام فایل ندارد.
 */
export class LocalVisualProvider implements EmbeddingProvider {
  readonly name: EmbeddingProviderName = 'local-visual-v1';
  readonly dim: number = EMBEDDING_DIM;
  /** بیشترین تعداد نمای پشتیبانی‌شده — برای کنترل هزینه‌ی پردازش کاتالوگ */
  readonly maxViews: number = 4;

  isAvailable(): boolean {
    return true;
  }

  async analyzeImage(buffer: Buffer): Promise<ImageSignature> {
    const variants = await analyzeImageVariants(buffer, { views: this.views() });
    const full = variants.find(v => v.view === 'full') || variants[0];
    return full.signature;
  }

  /** همه‌ی نماها در یک پاس (مورد استفاده‌ی ایندکس‌ساز) */
  async analyzeVariants(buffer: Buffer): Promise<{ view: EmbeddingView; signature: ImageSignature }[]> {
    return analyzeImageVariants(buffer, { views: this.views() });
  }

  /** امضای نماهای بردار — تغییر آن، ایندکس را نامعتبر می‌کند (بازسازی اجباری) */
  viewSignature(): string {
    return this.views().join(',');
  }

  protected views(): EmbeddingView[] {
    return ['full', 'object', 'object-rot180', 'object-flip'];
  }
}

// ---------------------------------------------------------------------------
// ۲) ارائه‌دهنده‌ی Gemini (اختیاری)
// ---------------------------------------------------------------------------

/**
 * embedding چندرسانه‌ای Gemini + امضای ساختاری محلی.
 * اگر مدل چندرسانه‌ای در دسترس نباشد، این ارائه‌دهنده «در دسترس نیست»
 * اعلام می‌کند و سیستم به‌صورت شفاف روی موتور محلی برمی‌گردد (بدون خطا برای کاربر).
 */
export class GeminiMultimodalProvider extends LocalVisualProvider {
  override readonly name: EmbeddingProviderName = 'gemini-multimodal';
  private ai: GoogleGenAI | null;
  private workingModel: string | null = null;
  private failedModels = new Set<string>();
  private static readonly CANDIDATE_MODELS = [
    'gemini-embedding-2',
    'gemini-embedding-2-preview',
    'gemini-embedding-001',
  ];

  constructor(apiKey?: string) {
    super();
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  override isAvailable(): boolean {
    return !!this.ai && this.failedModels.size < GeminiMultimodalProvider.CANDIDATE_MODELS.length;
  }

  /** فقط دو نما برای کنترل هزینه/زمان (تماس‌های شبکه‌ای گران‌اند) */
  protected override views(): EmbeddingView[] {
    return ['full', 'object'];
  }

  private async embedJpeg(jpeg: Buffer): Promise<Float32Array | null> {
    if (!this.ai) return null;
    const models = this.workingModel
      ? [this.workingModel]
      : GeminiMultimodalProvider.CANDIDATE_MODELS.filter(m => !this.failedModels.has(m));

    for (const model of models) {
      try {
        const res: any = await this.ai.models.embedContent({
          model,
          contents: [{ inlineData: { mimeType: 'image/jpeg', data: jpeg.toString('base64') } }],
          config: { outputDimensionality: EMBEDDING_DIM },
        } as any);
        const values =
          res?.embeddings?.[0]?.values || res?.embedding?.values || res?.embeddings?.[0]?.value || null;
        if (Array.isArray(values) && values.length) {
          this.workingModel = model;
          const out = new Float32Array(EMBEDDING_DIM);
          for (let i = 0; i < Math.min(values.length, EMBEDDING_DIM); i++) out[i] = Number(values[i]) || 0;
          return out;
        }
      } catch (e: any) {
        this.failedModels.add(model);
      }
    }
    return null;
  }

  override async analyzeVariants(
    buffer: Buffer
  ): Promise<{ view: EmbeddingView; signature: ImageSignature }[]> {
    // امضاهای ساختاری و هش‌ها همیشه محلی محاسبه می‌شوند
    const local = await analyzeImageVariants(buffer, { views: this.views() });
    if (!this.ai || !this.isAvailable()) return local;

    const norm = await normalizeForAnalysis(buffer);
    const objectJpeg = norm.objectIsolated
      ? await cropToBox(norm.buffer, norm.objectBox)
      : norm.buffer;

    for (const variant of local) {
      const jpeg = variant.view === 'object' ? objectJpeg : norm.buffer;
      const vec = await this.embedJpeg(jpeg);
      if (vec) {
        // بردار ابری جای بردار محلی را می‌گیرد، ولی امضای ساختاری محلی می‌ماند
        variant.signature.embedding = vec;
      }
    }
    return local;
  }

  /** ساخت بردار محلی به‌عنوان پشتیبان (برای مواقعی که شبکه قطع است) */
  fallbackEmbedding(gray: Float32Array, rgb: Uint8Array, structure: StructureSignature): Float32Array {
    void structure;
    const box = { x: 0, y: 0, w: 1, h: 1 };
    return buildEmbedding(gray, rgb, box, {
      mask: new Uint8Array(128 * 128),
      size: 128,
      fill: 0,
      componentCount: 0,
      holeCount: 0,
      bbox: { x0: 0, y0: 0, x1: 127, y1: 127 },
    });
  }
}


// ---------------------------------------------------------------------------
// ۳) ارائه‌دهنده‌ی Jina AI (jina-clip-v2) — بردار چندرسانه‌ای واقعی
// ---------------------------------------------------------------------------

/**
 * Jina AI CLIP v2: یک مدل چندرسانه‌ای واقعی (تصویر و متن در یک فضای برداری).
 *
 * چرا لازم است؟
 *   بردار محلی (local-visual-v1) کاملاً آفلاین است و برای «تصویر کاتالوگ در برابر
 *   تصویر کاتالوگ» بسیار دقیق عمل می‌کند؛ اما برای «عکس واقعی گرفته‌شده با موبایل
 *   از قطعه روی میز کار» - که پس‌زمینه، زاویه، نور و فاصله کاملاً متفاوت است -
 *   مدل‌های چندرسانه‌ای آموزش‌دیده روی تصاویر واقعی نتیجه‌ی بهتری می‌دهند.
 *
 * نکات پیاده‌سازی:
 *   • امضای ساختاری و هش‌های ادراکی همیشه محلی محاسبه می‌شوند (تصمیم EXACT
 *     نباید به دسترس‌پذیری سرویس ابری وابسته باشد).
 *   • درخواست‌ها «دسته‌ای» (micro-batch) ارسال می‌شوند تا ایندکس‌سازی کاتالوگ
 *     سریع و کم‌هزینه باشد.
 *   • در صورت خطای شبکه/کلید، این ارائه‌دهنده «در دسترس نیست» اعلام می‌کند و
 *     سیستم شفافاً روی موتور محلی برمی‌گردد (ایندکس با موتور محلی بازسازی می‌شود).
 */
export class JinaClipProvider extends LocalVisualProvider {
  readonly model: string;
  /**
   * نام ارائه‌دهنده به «مدل» گره خورده است تا تغییر مدل، ایندکس را خودکار
   * بازسازی کند (بردارهای دو مدل مختلف قابل مقایسه نیستند).
   */
  override readonly name: EmbeddingProviderName;
  override readonly dim: number;
  /** تعداد نماهایی که با Jina بردار می‌گیرند (هر نما = یک تصویر ارسالی = هزینه) */
  readonly maxViews: number;
  private viewList: EmbeddingView[];

  private apiKey: string | null;
  private unavailableReason: string | null = null;
  private failures = 0;
  private static readonly ENDPOINT = 'https://api.jina.ai/v1/embeddings';
  private static readonly MAX_FAILURES = 5;

  /**
   * محدودکننده‌ی نرخ بر پایه‌ی «بودجه‌ی توکن در دقیقه».
   * کلیدهای Jina سقف توکن در دقیقه دارند (پلن رایگان: ۱۰۰٫۰۰۰ توکن/دقیقه و
   * هر تصویر jina-clip-v2 برابر ۴٫۰۰۰ توکن است)؛ اگر به سقف نخوریم، ایندکس‌سازی
   * کاتالوگ با خطای ۴۲۹ متوقف می‌شود. این کنترل‌گر پیش از هر درخواست، بودجه‌ی
   * پنجره‌ی لغزان را بررسی و در صورت لزوم صبر می‌کند.
   */
  /**
   * هزینه‌ی توکن هر تصویر نزد Jina به «ابعاد ارسالی» بستگی دارد:
   *   • تا ~۲۲۴ پیکسل → ۱٫۰۰۰ توکن
   *   • بزرگ‌تر از آن  → ۴٫۰۰۰ توکن (کاشی‌کاشی شدن تصویر)
   * چون مدل‌های CLIP در هر حال تصویر را به ~۲۲۴ پیکسل می‌رسانند، ارسال نسخه‌ی
   * کوچک هیچ افت کیفی ندارد ولی هزینه و زمان ایندکس‌سازی را تا ۴ برابر کم می‌کند.
   */
  private static readonly MAX_SEND_PX = Number(process.env.JINA_MAX_PX || 224);
  private static readonly TOKENS_SMALL = 1000;
  private static readonly TOKENS_LARGE = 4000;
  private tokenBudgetPerMin: number;
  private spent: { at: number; tokens: number }[] = [];
  private assumedTokens = 0;
  private static readonly BATCH_SIZE = Number(process.env.JINA_BATCH_SIZE || 16);
  /** فاصله‌ی زمانی جمع‌آوری دسته (میلی‌ثانیه) — بزرگ‌تر = درخواست‌های کمتر و حجیم‌تر */
  private static readonly BATCH_WINDOW_MS = Number(process.env.JINA_BATCH_WINDOW_MS || 250);

  constructor(apiKey?: string | null) {
    super();
    this.apiKey = JinaClipProvider.resolveKey(apiKey);
    this.model = (process.env.JINA_MODEL || 'jina-clip-v2').trim();
    this.name = this.model.startsWith('jina-clip-v1') ? 'jina-clip-v1' : 'jina-clip-v2';
    this.dim = Number(process.env.JINA_DIM || (this.model === 'jina-clip-v1' ? 768 : 1024));
    const viewsEnv = (process.env.JINA_VIEWS || 'object').trim();
    this.viewList = viewsEnv
      .split(',')
      .map(v => v.trim())
      .filter((v): v is EmbeddingView => v === 'object' || v === 'full' || v === 'object-rot180' || v === 'object-flip');
    if (!this.viewList.length) this.viewList = ['object'];
    this.maxViews = this.viewList.length;
    // ۱۰٪ حاشیه‌ی امن تا خطای ۴۲۹ نگیریم
    const budget = Number(process.env.JINA_TOKEN_BUDGET_PER_MIN || 100000);
    this.tokenBudgetPerMin = Math.max(1000, Math.floor(budget * 0.9));
  }

  /** چند ثانیه باید صبر کنیم تا بودجه‌ی پنجره‌ی لغزان اجازه‌ی این درخواست را بدهد */
  private waitSecondsFor(tokens: number): number {
    const now = Date.now();
    this.spent = this.spent.filter(x => now - x.at < 60000);
    const used = this.spent.reduce((s, x) => s + x.tokens, 0);
    if (used + tokens <= this.tokenBudgetPerMin) return 0;
    // قدیمی‌ترین مصرف تا چه زمانی از پنجره خارج می‌شود
    let needed = used + tokens - this.tokenBudgetPerMin;
    for (const item of this.spent) {
      needed -= item.tokens;
      if (needed <= 0) return Math.max(0.5, (60000 - (now - item.at)) / 1000 + 0.3);
    }
    return 61;
  }

  /** صف micro-batch */
  private queue: { buffer: Buffer; resolve: (v: Float32Array | null) => void }[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private inFlight = false;

  /** کلید باید واقعی باشد؛ مقدار نمونه/خالی باعث غیرفعال‌شدن تماس‌های شبکه می‌شود */
  private static resolveKey(apiKey?: string | null): string | null {
    const raw = (apiKey || process.env.JINA_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!raw) return null;
    const placeholder = /^(paste|your|xxx|test|change|todo|placeholder)/i.test(raw) || raw.length < 20;
    if (placeholder || !raw.startsWith('jina_')) return null;
    return raw;
  }

  override isAvailable(): boolean {
    return !!this.apiKey && !this.unavailableReason && this.failures < JinaClipProvider.MAX_FAILURES;
  }

  protected override views(): EmbeddingView[] {
    return this.viewList;
  }

  /** ارسال دسته‌ای به Jina و برگرداندن بردارها به همان ترتیب ورودی */
  private async callApi(images: Buffer[]): Promise<(Float32Array | null)[]> {
    if (!this.apiKey) return images.map(() => null);

    // احترام به سقف توکن در دقیقه (پنجره‌ی لغزان)
    const need = JinaClipProvider.TOKENS_SMALL * images.length;
    this.assumedTokens = need;
    let wait = this.waitSecondsFor(need);
    let guard = 0;
    while (wait > 0 && guard++ < 40) {
      console.log(`[VisualSearch] محدودیت نرخ Jina — ${Math.ceil(wait)} ثانیه صبر… (بودجه ${this.tokenBudgetPerMin} توکن/دقیقه)`);
      await new Promise(r => setTimeout(r, wait * 1000));
      wait = this.waitSecondsFor(need);
    }
    this.spent.push({ at: Date.now(), tokens: need });

    const body = {
      model: this.model,
      input: images.map(b => ({
        image: `data:image/jpeg;base64,${b.toString('base64')}`,
      })),
      dimensions: this.dim,
    };

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(JinaClipProvider.ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (res.status === 401 || res.status === 403) {
            this.unavailableReason = 'کلید Jina نامعتبر است';
            console.error('[VisualSearch] Jina key rejected:', text.slice(0, 200));
            return images.map(() => null);
          }
          if (res.status === 429) {
            // سقف توکن/درخواست در دقیقه — بودجه را محافظه‌کارانه کم کن و صبر کن
            const reduced = Math.max(20000, Math.floor(this.tokenBudgetPerMin * 0.6));
            if (reduced !== this.tokenBudgetPerMin) {
              console.warn(
                `[VisualSearch] Jina 429 — کاهش بودجه‌ی توکن به ${reduced}/دقیقه و تلاش مجدد`
              );
              this.tokenBudgetPerMin = reduced;
            }
            await new Promise(r => setTimeout(r, 30000));
            continue;
          }
          if (res.status >= 500) {
            await new Promise(r => setTimeout(r, 800 * attempt));
            continue;
          }
          console.error('[VisualSearch] Jina error', res.status, text.slice(0, 200));
          this.failures++;
          return images.map(() => null);
        }
        const json: any = await res.json();
        // ثبت «مصرف واقعی» اعلام‌شده توسط سرویس (به‌جای تخمین) در پنجره‌ی نرخ
        const actual = Number(json?.usage?.total_tokens);
        if (Number.isFinite(actual) && actual > 0) {
          const last = this.spent[this.spent.length - 1];
          if (last && last.tokens === this.assumedTokens) last.tokens = actual;
        }
        const rows: any[] = json?.data || [];
        const out: (Float32Array | null)[] = images.map(() => null);
        for (const row of rows) {
          const idx = Number(row?.index ?? -1);
          const vec = row?.embedding;
          if (!Array.isArray(vec) || idx < 0 || idx >= out.length) continue;
          const f = new Float32Array(this.dim);
          for (let i = 0; i < Math.min(this.dim, vec.length); i++) f[i] = Number(vec[i]) || 0;
          out[idx] = f;
        }
        this.failures = 0;
        return out;
      } catch (e: any) {
        if (attempt === 3) {
          this.failures++;
          console.error('[VisualSearch] Jina request failed:', e?.message);
        } else {
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }
    }
    return images.map(() => null);
  }

  /** آماده‌سازی تصویر برای ارسال: حداکثر ۲۲۴ پیکسل (کاهش ۴ برابری هزینه) */
  private async prepareForSend(buffer: Buffer): Promise<Buffer> {
    try {
      const meta = await sharp(buffer).metadata();
      const maxSide = Math.max(meta.width || 0, meta.height || 0);
      if (maxSide > 0 && maxSide <= JinaClipProvider.MAX_SEND_PX) return buffer;
      return await sharp(buffer)
        .flatten({ background: '#ffffff' })
        .resize(JinaClipProvider.MAX_SEND_PX, JinaClipProvider.MAX_SEND_PX, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch {
      return buffer;
    }
  }

  /** الحاق به صف و انتظار تا پر شدن دسته یا گذشت چند میلی‌ثانیه */
  private enqueue(buffer: Buffer): Promise<Float32Array | null> {
    return new Promise(resolve => {
      this.queue.push({ buffer, resolve });
      if (this.queue.length >= JinaClipProvider.BATCH_SIZE) {
        void this.flushQueue();
        return;
      }
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          void this.flushQueue();
        }, JinaClipProvider.BATCH_WINDOW_MS);
      }
    });
  }

  private async flushQueue(): Promise<void> {
    if (this.inFlight || !this.queue.length) return;
    this.inFlight = true;
    const batch = this.queue.splice(0, JinaClipProvider.BATCH_SIZE);
    try {
      const vectors = await this.callApi(batch.map(b => b.buffer));
      batch.forEach((item, i) => item.resolve(vectors[i] || null));
    } catch {
      batch.forEach(item => item.resolve(null));
    } finally {
      this.inFlight = false;
      if (this.queue.length) void this.flushQueue();
    }
  }

  /** بردار یک تصویر (برای مسیر پرس‌وجو) */
  async embedBuffer(buffer: Buffer): Promise<Float32Array | null> {
    return this.enqueue(await this.prepareForSend(buffer));
  }

  /**
   * امضاهای ساختاری/هش برای **هر ۴ نما** محلی و رایگان محاسبه می‌شوند
   * (چون تشخیص «همان تصویر» باید نسبت به چرخش ۹۰/۱۸۰ درجه و آینه مقاوم باشد)
   * ولی بردار Jina فقط برای نماهای تعیین‌شده گرفته می‌شود؛ بقیه با پرچم
   * skipVector علامت می‌خورند تا وارد انبار برداری نشوند (هزینه‌ی API).
   */
  override async analyzeVariants(
    buffer: Buffer
  ): Promise<{ view: EmbeddingView; signature: ImageSignature; skipVector?: boolean }[]> {
    const allViews: EmbeddingView[] = ['full', 'object', 'object-rot180', 'object-flip'];
    const local = await analyzeImageVariants(buffer, { views: allViews });
    const marked = local.map(v => ({
      ...v,
      skipVector: !this.viewList.includes(v.view),
    }));
    if (!this.isAvailable()) return marked;

    try {
      const norm = await normalizeForAnalysis(buffer);
      const objectJpeg = norm.objectIsolated
        ? await cropToBox(norm.buffer, norm.objectBox)
        : norm.buffer;
      const jpegFor = (view: EmbeddingView) => (view === 'object' ? objectJpeg : norm.buffer);

      const targets = marked.filter(v => !v.skipVector);
      const results = await Promise.all(
        targets.map(async v => this.enqueue(await this.prepareForSend(jpegFor(v.view))))
      );
      let ok = 0;
      targets.forEach((variant, i) => {
        const vec = results[i];
        if (vec && vec.length) {
          variant.signature.embedding = vec;
          ok++;
        }
      });
      if (ok === 0) this.failures++;
      return marked;
    } catch (e: any) {
      console.error('[VisualSearch] Jina analyzeVariants failed:', e?.message);
      return marked;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let providerInstance: EmbeddingProvider | null = null;

export function createEmbeddingProvider(apiKey?: string): EmbeddingProvider {
  if (providerInstance) return providerInstance;
  const mode = (process.env.VISUAL_SEARCH_EMBEDDING_PROVIDER || 'local').toLowerCase();

  // Jina AI CLIP v2 — بردار چندرسانه‌ای واقعی (پیشنهادی برای عکس‌های واقعی کاربران)
  if (mode === 'jina' || mode === 'auto') {
    const jina = new JinaClipProvider();
    if (jina.isAvailable()) {
      providerInstance = jina;
      console.log(
        `[VisualSearch] Embedding provider: Jina ${jina.model} (${jina.dim} بُعد، ${jina.maxViews} نما — امضای ساختاری و هش‌ها محلی)`
      );
      return providerInstance;
    }
    if (mode === 'jina') {
      console.warn(
        '[VisualSearch] JINA_API_KEY مطمئن/معتبر نیست — موتور محلی فعال شد. برای فعال‌سازی Jina، کلید واقعی را در .env بگذارید.'
      );
    }
  }

  if (mode === 'gemini' || mode === 'auto') {
    const provider = new GeminiMultimodalProvider(apiKey);
    if (provider.isAvailable()) {
      providerInstance = provider;
      console.log('[VisualSearch] Embedding provider: gemini-multimodal (با پشتیبان محلی)');
      return providerInstance;
    }
  }

  providerInstance = new LocalVisualProvider();
  console.log('[VisualSearch] Embedding provider: local-visual-v1 (کاملاً محلی و آفلاین)');
  return providerInstance;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  return providerInstance || createEmbeddingProvider();
}

export function setEmbeddingProvider(provider: EmbeddingProvider): void {
  providerInstance = provider;
}
