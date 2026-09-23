/**
 * Atlas Visual Product Search — Exact Verification Layer
 * ---------------------------------------------------------------------------
 * طبق نقشه راه (§۹ و §۱۴):
 *   «محصول مشابه = همان محصول» خطای ممنوع است.
 *   اصل حاکم: Better No Match Than Wrong Match.
 *
 * دو مسیر مستقل برای تأیید EXACT وجود دارد و هر دو سخت‌گیرانه‌اند:
 *
 *   مسیر ۱ (آفلاین، قطعی): تشخیص Near-Duplicate
 *     اگر عکس کاربر در واقع همان تصویر کاتالوگ باشد (اسکرین‌شات، دانلود،
 *     ارسال مجدد)، هش‌های ادراکی + انطباق ساختاری این را قطعی می‌کنند.
 *
 *   مسیر ۲ (AI، اختیاری): راستی‌آزمایی چهره‌به‌چهره + نظر دوم مستقل
 *     اگر GEMINI_API_KEY موجود باشد، هر کاندیدا در یک فراخوانی جداگانه
 *     با تصویر کاتالوگ مقایسه می‌شود و هر ادعای «همان قطعه» با یک
 *     نظر دوم مستقل بازبینی می‌شود؛ اختلاف ⇒ تنزل به «مشابه».
 */

import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';
import type { ImageSignature, StructureSignature } from './types';
import {
  hashDistances,
  structuralSimilarity,
} from './visualEncoder';

// ---------------------------------------------------------------------------
// تشخیص کلید معتبر هوش مصنوعی
// ---------------------------------------------------------------------------

/**
 * همان سیاست سرور: مقادیر جایگزین (placeholder) هرگز به‌عنوان کلید واقعی
 * در نظر گرفته نمی‌شوند؛ وگرنه هر جستجو با خطای «API key not valid» کند می‌شود.
 */
const PLACEHOLDER_KEYS = new Set([
  'MY_GEMINI_API_KEY',
  'YOUR_GEMINI_API_KEY_HERE',
  'PASTE_NEW_KEY_HERE',
  'MY_APP_URL',
]);

export function resolveGeminiKey(): string | undefined {
  const raw = (process.env.GEMINI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw || PLACEHOLDER_KEYS.has(raw)) return undefined;
  return raw;
}

export function isAiVerificationConfigured(): boolean {
  return !!resolveGeminiKey();
}

// ---------------------------------------------------------------------------
// آستانه‌های سخت‌گیرانه (Strict — قابل تنظیم در settings.json نیست به‌عمد)
// ---------------------------------------------------------------------------

/**
 * آستانه‌های تشخیص «همان تصویر» — سخت‌گیرانه و کالیبره‌شده.
 * این آستانه‌ها روی «جسم ایزوله‌شده» (بدون پس‌زمینه) اعمال می‌شوند.
 * هرچه بازتر باشند، خطر معرفی محصول اشتباه بالا می‌رود؛ بنابراین کوچک نگه داشته
 * می‌شوند: فقط زمانی که جسم قطعه واقعاً همان جسم باشد.
 */
export const DUPLICATE_DHASH_MAX = 16;
export const DUPLICATE_PHASH_MAX = 5;
export const DUPLICATE_AHASH_MAX = 5;
/** حداقل انطباق ساختاری برای پذیرش EXACT */
export const EXACT_STRUCTURE_MIN = 0.86;
/** حداقل فاصله‌ی لازم نسبت به رقیب بعدی (کالاهای هم‌خانواده) */
export const DUPLICATE_MARGIN_RATIO = 0.55;

/**
 * مسیر دوم تشخیص «همان تصویر» — برای عکس‌هایی که کاربر دوباره ذخیره/ارسال
 * کرده است (تغییر کیفیت JPEG، تغییر اندازه، اسکرین‌شات، ارسال در شبکه‌های
 * اجتماعی). این عکس‌ها معمولاً فاصله‌ی هش کمی بیشتر از تصویر اصلی دارند.
 * برای اینکه این مسیر باعث معرفی محصول اشتباه نشود، انطباق ساختاری سخت‌گیرانه‌تر
 * و گاردهای ابهام/حاشیه الزامی است.
 */
export const RESCALED_DHASH_MAX = 20;
export const RESCALED_PHASH_MAX = 6;
export const RESCALED_AHASH_MAX = 6;
export const RESCALED_STRUCTURE_MIN = 0.95;

export interface ExactVerdict {
  isExact: boolean;
  /** مسیر تأیید */
  path: 'near-duplicate-structure' | 'rescaled-same-image' | 'ai-confirmed-exact' | 'none';
  /** امتیاز انطباق ساختاری ۰..۱ */
  structureScore: number;
  /** فاصله‌ی dHash (برای لاگ داخلی) */
  hashDistance: number;
  /** فاصله‌ی ترکیبی هش‌ها (۰..۱) — مبنای بررسی «حاشیه نسبت به رقیب» */
  combinedDistance: number;
  /** توضیح فارسی قابل نمایش در لاگ مدیریت */
  reason: string;
}

/** آیا عکس کاربر «عیناً همان تصویر کاتالوگ» است؟ (کاملاً آفلاین و قطعی) */
export function verifyNearDuplicate(query: ImageSignature, candidate: ImageSignature): ExactVerdict {
  const d = hashDistances(query, candidate);
  const structureScore = structuralSimilarity(query.structure, candidate.structure);
  // فاصله‌ی ترکیبی هش (۰..۱): معیار مقایسه‌ای با رقبا
  const combinedDistance = 0.6 * (d.dHash / 256) + 0.4 * (d.pHash / 64);

  const duplicate =
    d.dHash <= DUPLICATE_DHASH_MAX && d.pHash <= DUPLICATE_PHASH_MAX && d.aHash <= DUPLICATE_AHASH_MAX;

  if (duplicate && structureScore >= EXACT_STRUCTURE_MIN) {
    return {
      isExact: true,
      path: 'near-duplicate-structure',
      structureScore,
      hashDistance: d.dHash,
      combinedDistance,
      reason: 'عکس ارسالی از نظر محتوای پیکسلی و ساختار هندسی، همان تصویر موجود در کاتالوگ است.',
    };
  }

  // مسیر دوم: همان تصویر با کیفیت/اندازه‌ی متفاوت (ذخیره‌ی مجدد، اسکرین‌شات،
  // فشرده‌سازی شبکه‌های اجتماعی). ساختار باید تقریباً یکسان باشد.
  const rescaled =
    d.dHash <= RESCALED_DHASH_MAX &&
    d.pHash <= RESCALED_PHASH_MAX &&
    d.aHash <= RESCALED_AHASH_MAX &&
    structureScore >= RESCALED_STRUCTURE_MIN;
  if (rescaled) {
    return {
      isExact: true,
      path: 'rescaled-same-image',
      structureScore,
      hashDistance: d.dHash,
      combinedDistance,
      reason: 'عکس ارسالی همان تصویر کاتالوگ است؛ فقط کیفیت/اندازه‌ی فایل تغییر کرده است.',
    };
  }
  return {
    isExact: false,
    path: 'none',
    structureScore,
    hashDistance: d.dHash,
    combinedDistance,
    reason: duplicate
      ? 'هش تصویری نزدیک بود ولی ساختار هندسی قطعه کاملاً منطبق نشد.'
      : 'تصویر ارسالی، عیناً تصویر کاتالوگ نیست.',
  };
}

/**
 * امتیاز ساختاری مستقل از رنگ و نور.
 * هم برای رتبه‌بندی دوباره (Re-ranking) و هم برای بازبینی EXACT استفاده می‌شود.
 */
export function structureAgreement(a: StructureSignature, b: StructureSignature): number {
  return structuralSimilarity(a, b);
}

// ---------------------------------------------------------------------------
// راستی‌آزمایی چهره‌به‌چهره با مدل بینایی (اختیاری)
// ---------------------------------------------------------------------------

export type PairVerdict = 'exact_match' | 'very_similar' | 'different';

export interface PairVerification {
  verdict: PairVerdict;
  rationale: string;
  /** ۰..۹۹ — فقط داخلی، هرگز به کاربر نمایش داده نمی‌شود */
  internalScore: number;
}

const VERIFICATION_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
];

export const VERIFY_PROMPT = `تصویر ۱: عکس واقعی ارسالی کاربر از یک قطعه صنعتی (پس‌زمینه، نور و زاویه ممکن است کاملاً متفاوت باشد).
تصویر ۲: عکس رسمی یکی از کالاهای کاتالوگ «هایپر صنعت اطلس».

شما سامانه‌ی راستی‌آزمایی بصری اطلس هستید. سیاست ما «تطابق صددرصدی» است. فقط و فقط بر اساس *ظاهر خود دو تصویر* قضاوت کن؛ هیچ نام، کد یا توضیحی در اختیار شما نیست و نباید به آن اتکا کنی.

معنای برچسب‌ها:
- "exact_match": در تصویر ۲ «عیناً همان قطعه فیزیکی» تصویر ۱ است. یعنی: همان فرم هندسی، همان تعداد و الگوی دندانه/شیار/پره/سوراخ، همان نسبت‌های ابعادی، همان ساختار بدنه و اجزای قابل مشاهده. زاویه دوربین، نور، پس‌زمینه و حتی فاصله می‌توانند فرق کنند، ولی خود جسم یکی است.
- "very_similar": هم‌خانواده و بسیار نزدیک است، ولی عین همان قطعه نیست (مثلاً تعداد دندانه/پره متفاوت، قطر یا عرض متفاوت، جزئیات ساختاری متفاوت).
- "different": از نظر شکل و ساختار، قطعه‌ی دیگری است.

قواعد حیاتی:
۱) فقط مقایسه‌ی چشمی دو تصویر ملاک است.
۲) هر شکی داری = exact_match نده. اگر مطمئن نیستی، very_similar یا different بده.
۳) اختلاف در ابعاد/تعداد اجزا/نسبت‌ها یعنی exact_match نیست.
۴) تشخیص «مشابه» کافی نیست؛ برای exact_match باید بتوانی بگویی «همین قطعه است».
۵) تعداد دندانه/پره/سوراخ را در دو تصویر بشمار و در توضیح بنویس.

پاسخ صرفاً JSON معتبر:
{
  "verdict": "exact_match" | "very_similar" | "different",
  "rationale": "توضیح کوتاه فارسی: چه چیزهایی دقیقاً منطبق‌اند یا چه فرقی دارند (شمارش دندانه/سوراخ/نسبت‌ها)",
  "internalScore": عدد بین ۰ تا ۹۹
}`;

export const SECOND_OPINION_PROMPT = `دو تصویر از قطعات صنعتی: تصویر ۱ عکس واقعی کاربر، تصویر ۲ عکس رسمی یک کالای کاتالوگ.
سؤال: آیا جسم فیزیکی تصویر ۲ دقیقاً همان مدل قطعه‌ی تصویر ۱ است؟ (همان فرم هندسی، همان تعداد دندانه/پره/شیار/سوراخ، همان نسبت‌های ابعادی — فقط زاویه/نور/پس‌زمینه متفاوت است)

قضاوت فقط بر اساس ظاهر تصاویر باشد؛ به هیچ اسم، کد یا توضیحی اتکا نکن.
سخت‌گیر باش: اگر اندازه، تعداد دندانه/پره، ساختار یا هر جزئیات ساختاری فرق دارد، پاسخ false است.
و اگر مطمئن نیستی، پاسخ false است.
پاسخ صرفاً JSON: {"samePhysicalPart": true/false, "reason": "دلیل کوتاه فارسی"}`;

async function callModel(
  ai: GoogleGenAI,
  parts: unknown[],
  timeoutMs = 25000
): Promise<string> {
  let lastError = '';
  for (const model of VERIFICATION_MODELS) {
    try {
      const res = await Promise.race([
        ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }] as never,
          config: { responseMimeType: 'application/json' },
        } as never),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]);
      const text = (res as { text?: string })?.text;
      if (text && text.trim()) return text;
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }
  throw new Error(`تمامی مدل‌های بینایی در دسترس نبودند: ${lastError}`);
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

export class VisualVerifier {
  private ai: GoogleGenAI | null;

  constructor(apiKey?: string) {
    // اگر کلید ورودی جایگزین/نامعتبر باشد، هوش مصنوعی غیرفعال می‌ماند
    const clean = (apiKey || '').trim().replace(/^['"]|['"]$/g, '');
    const valid = clean && !PLACEHOLDER_KEYS.has(clean);
    this.ai = valid ? new GoogleGenAI({ apiKey: clean }) : null;
  }

  isAvailable(): boolean {
    return !!this.ai;
  }

  /** مقایسه‌ی جفت‌به‌جفت عکس کاربر با یک تصویر کاتالوگ */
  async verifyPair(userJpeg: Buffer, candidateJpeg: Buffer, label: string): Promise<PairVerification | null> {
    if (!this.ai) return null;
    const parts = [
      { text: VERIFY_PROMPT },
      { inlineData: { mimeType: 'image/jpeg', data: userJpeg.toString('base64') } },
      { inlineData: { mimeType: 'image/jpeg', data: candidateJpeg.toString('base64') } },
    ];
    try {
      const text = await callModel(this.ai, parts);
      const parsed = JSON.parse(stripFences(text));
      const verdict = parsed?.verdict;
      if (verdict === 'exact_match' || verdict === 'very_similar' || verdict === 'different') {
        return {
          verdict,
          rationale: String(parsed?.rationale || '').slice(0, 400),
          internalScore: Math.max(0, Math.min(99, Math.round(Number(parsed?.internalScore) || 50))),
        };
      }
      console.log(`[VisualVerify ${label}] پاسخ نامعتبر دریافت شد.`);
      return null;
    } catch (e: any) {
      console.log(`[VisualVerify ${label}] failed: ${e?.message?.slice(0, 90)}`);
      return null;
    }
  }

  /** نظر دوم مستقل روی ادعای «همان قطعه» */
  async secondOpinion(userJpeg: Buffer, candidateJpeg: Buffer): Promise<boolean> {
    if (!this.ai) return false;
    const parts = [
      { text: SECOND_OPINION_PROMPT },
      { inlineData: { mimeType: 'image/jpeg', data: userJpeg.toString('base64') } },
      { inlineData: { mimeType: 'image/jpeg', data: candidateJpeg.toString('base64') } },
    ];
    try {
      const text = await callModel(this.ai, parts);
      const parsed = JSON.parse(stripFences(text));
      return parsed?.samePhysicalPart === true;
    } catch {
      // عدم دسترس‌پذیری مدل = عدم تأیید (سیاست محافظه‌کارانه)
      return false;
    }
  }
}

export async function prepareVerificationJpeg(buffer: Buffer, size = 460): Promise<Buffer> {
  try {
    return await sharp(buffer).resize(size, size, { fit: 'inside' }).jpeg({ quality: 84 }).toBuffer();
  } catch {
    return buffer;
  }
}

export function createVerifier(apiKey?: string): VisualVerifier {
  return new VisualVerifier(apiKey || resolveGeminiKey());
}
