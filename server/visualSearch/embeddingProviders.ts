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
  readonly dim = EMBEDDING_DIM;
  /** بیشترین تعداد نمای پشتیبانی‌شده — برای کنترل هزینه‌ی پردازش کاتالوگ */
  readonly maxViews = 4;

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
// Factory
// ---------------------------------------------------------------------------

let providerInstance: EmbeddingProvider | null = null;

export function createEmbeddingProvider(apiKey?: string): EmbeddingProvider {
  if (providerInstance) return providerInstance;
  const mode = (process.env.VISUAL_SEARCH_EMBEDDING_PROVIDER || 'local').toLowerCase();

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
