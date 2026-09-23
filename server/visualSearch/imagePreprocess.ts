/**
 * Atlas Visual Product Search — Image Preprocessing
 * ---------------------------------------------------------------------------
 * هدف: آماده‌سازی تصویر کاربر و تصاویر کاتالوگ برای استخراج ویژگی بصری،
 * به‌گونه‌ای که سیستم نسبت به موارد زیر مقاوم باشد:
 *   • پس‌زمینه متفاوت          • نور متفاوت
 *   • زاویه/چرخش محصول         • فاصله و سایز متفاوت در کادر
 *   • کیفیت پایین / عکس موبایل • وجود چند شیء در تصویر
 *
 * ⚠️ هیچ‌یک از توابع این فایل نام فایل، EXIF یا متادیتا را نمی‌خواند.
 *    ورودی همیشه فقط Buffer پیکسل است. (چرخش خودکار EXIF صرفاً برای
 *    «تصحیح نمایش» انجام می‌شود و هرگز به‌عنوان سیگنال تطبیق استفاده نمی‌شود.)
 */

import sharp from 'sharp';

export interface NormalizedImage {
  /** تصویر نرمال‌شده (JPEG) — برای ارسال به مدل بینایی */
  buffer: Buffer;
  /** بافر خاکستری ۲۵۶×۲۵۶ نرمال‌شده‌ی نور — پایه‌ی استخراج ویژگی */
  gray: Float32Array;
  /** بافر RGB ۲۵۶×۲۵۶ نرمال‌شده — برای ویژگی‌های رنگ */
  rgb: Uint8Array;
  width: number;
  height: number;
  /** کادر جسم اصلی تشخیص‌داده‌شده (نسبت ۰..۱) */
  objectBox: NormBox;
  /** آیا جسم اصلی با اطمینان ایزوله شد؟ */
  objectIsolated: boolean;
}

export interface NormBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ANALYSIS_SIZE = 256;

/**
 * شفافیت (Alpha) را روی پس‌زمینه‌ی سفید ترکیب می‌کند.
 * تصاویر کاتالوگ PNG با کانال آلفا هستند؛ اگر آلفا نادیده گرفته شود،
 * بسته به مسیر پردازش، پس‌زمینه سیاه یا سفید می‌شود و مقایسه‌ی دو عکس
 * از یک محصول بی‌دلیل شکست می‌خورد. این تابع همه‌جا یکسان عمل می‌کند.
 */
export async function flattenWhite(input: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(input).metadata();
    if (!meta.hasAlpha) return input;
    return await sharp(input).flatten({ background: '#ffffff' }).toBuffer();
  } catch {
    return input;
  }
}

/** تبدیل Buffer به dataURL (فقط برای نمایش/ذخیره) */
export function toDataUrl(buffer: Buffer, mime = 'image/jpeg'): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/** استخراج Buffer از dataURL یا base64 خام یا آدرس http — بدون هیچ وابستگی به نام فایل */
export async function decodeImageInput(input: string): Promise<Buffer> {
  const trimmed = (input || '').trim();
  if (!trimmed) throw new Error('تصویری دریافت نشد.');

  if (/^https?:\/\//i.test(trimmed)) {
    const resp = await fetch(trimmed);
    if (!resp.ok) throw new Error('دریافت تصویر از آدرس ناموفق بود.');
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > 12 * 1024 * 1024) throw new Error('حجم تصویر بیش از حد مجاز است.');
    return buf;
  }

  const dataUrlMatch = trimmed.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (dataUrlMatch) return Buffer.from(dataUrlMatch[3], 'base64');
  return Buffer.from(trimmed, 'base64');
}

/**
 * نرمال‌سازی کامل یک تصویر ورودی.
 * خروجی: نسخه‌ی JPEG تمیزشده + بافر خاکستری/رنگی ۲۵۶×۲۵۶ + کادر جسم اصلی.
 */
export async function normalizeForAnalysis(input: Buffer): Promise<NormalizedImage> {
  // ۱) تصحیح نمایش (EXIF orientation) + محدودسازی ابعاد + حذف نویز سبک
  //    median(1) نویز عکس موبایل را بدون از دست دادن لبه‌ها کاهش می‌دهد.
  let base: Buffer;
  try {
    base = await sharp(await flattenWhite(input))
      .rotate() // فقط تصحیح نمایش
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .median(1)
      .flatten({ background: '#ffffff' }) // خروجی همیشه بدون آلفا
      .toBuffer();
  } catch {
    base = input;
  }

  const meta = await sharp(base).metadata();
  const width = meta.width || ANALYSIS_SIZE;
  const height = meta.height || ANALYSIS_SIZE;

  // ۲) جسم اصلی را تشخیص بده (پس‌زمینه‌ی شلوغ / چند شیء)
  const detection = await detectMainObject(base);

  // ۳) بافرهای تحلیلی ۲۵۶×۲۵۶ با نرمال‌سازی نور (CLAHE سبک + gray-world)
  const gray = await buildNormalizedGray(base);
  const rgb = await buildNormalizedRgb(base);

  // ۴) نسخه‌ی تمیز JPEG برای ارسال به مدل بینایی
  let jpeg: Buffer;
  try {
    jpeg = await sharp(base).resize(640, 640, { fit: 'inside' }).jpeg({ quality: 86 }).toBuffer();
  } catch {
    jpeg = base;
  }

  return {
    buffer: jpeg,
    gray,
    rgb,
    width,
    height,
    objectBox: detection.box,
    objectIsolated: detection.confident,
  };
}

/**
 * تشخیص جسم اصلی تصویر — بدون یادگیری ماشین، کاملاً هندسی:
 *   ۱. نگاشت بزرگ‌نمایی لبه (gradient magnitude)
 *   ۲. آستانه‌گذاری Otsu روی نگاشت لبه
 *   ۳. برچسب‌گذاری اجزای متصل (flood fill روی شبکه‌ی کوچک)
 *   ۴. انتخاب مؤلفه‌ی غالب با ترکیب «مساحت» و «نزدیکی به مرکز»
 * این کار باعث می‌شود وقتی چند قطعه در قاب است، قطعه‌ی اصلی (نه پس‌زمینه) انتخاب شود.
 */
export async function detectMainObject(
  base: Buffer,
  gridSize = 96
): Promise<{ box: NormBox; confident: boolean }> {
  let raw: Buffer;
  try {
    raw = await sharp(base)
      .resize(gridSize, gridSize, { fit: 'fill' })
      .grayscale()
      .blur(0.6)
      .raw()
      .toBuffer();
  } catch {
    return { box: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }, confident: false };
  }

  // gradient magnitude
  const mag = new Float32Array(gridSize * gridSize);
  let maxMag = 0;
  for (let y = 1; y < gridSize - 1; y++) {
    for (let x = 1; x < gridSize - 1; x++) {
      const i = y * gridSize + x;
      const gx = raw[i + 1] - raw[i - 1];
      const gy = raw[i + gridSize] - raw[i - gridSize];
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[i] = m;
      if (m > maxMag) maxMag = m;
    }
  }
  if (maxMag <= 0) {
    return { box: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }, confident: false };
  }

  // Otsu روی مقادیر gradient
  const hist = new Array(64).fill(0);
  for (let i = 0; i < mag.length; i++) {
    const b = Math.min(63, Math.floor((mag[i] / maxMag) * 63));
    hist[b]++;
  }
  let bestT = 0.25;
  let bestVar = -1;
  const total = gridSize * gridSize;
  for (let t = 1; t < 63; t++) {
    let w0 = 0;
    let w1 = 0;
    let s0 = 0;
    let s1 = 0;
    for (let b = 0; b < 64; b++) {
      if (b <= t) {
        w0 += hist[b];
        s0 += hist[b] * b;
      } else {
        w1 += hist[b];
        s1 += hist[b] * b;
      }
    }
    if (w0 === 0 || w1 === 0) continue;
    const m0 = s0 / w0;
    const m1 = s1 / w1;
    const between = (w0 / total) * (w1 / total) * (m0 - m1) * (m0 - m1);
    if (between > bestVar) {
      bestVar = between;
      bestT = t / 63;
    }
  }
  const threshold = Math.max(0.12, Math.min(0.55, bestT * maxMag));

  // ماسک دودویی «لبه‌دار»
  const mask = new Uint8Array(gridSize * gridSize);
  for (let i = 0; i < mask.length; i++) mask[i] = mag[i] >= threshold ? 1 : 0;

  // اجزای متصل ۸-همسایگی
  const label = new Int32Array(gridSize * gridSize).fill(-1);
  const comps: { minX: number; minY: number; maxX: number; maxY: number; area: number }[] = [];
  const stack: number[] = [];
  const cx = (gridSize - 1) / 2;
  const cy = (gridSize - 1) / 2;

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || label[start] !== -1) continue;
    const id = comps.length;
    let minX = gridSize;
    let minY = gridSize;
    let maxX = 0;
    let maxY = 0;
    let area = 0;
    stack.length = 0;
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % gridSize;
      const py = (p - px) / gridSize;
      area++;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
          const np = ny * gridSize + nx;
          if (mask[np] === 1 && label[np] === -1) {
            label[np] = id;
            stack.push(np);
          }
        }
      }
    }
    comps.push({ minX, minY, maxX, maxY, area });
  }

  if (comps.length === 0) {
    return { box: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }, confident: false };
  }

  // مؤلفه‌ی غالب: ترکیب مساحت + نزدیکی به مرکز + نسبت پرشدگی کادر
  let best = comps[0];
  let bestScore = -1;
  for (const c of comps) {
    if (c.area < gridSize * gridSize * 0.004) continue; // نویز
    const cxc = (c.minX + c.maxX) / 2;
    const cyc = (c.minY + c.maxY) / 2;
    const dist = Math.sqrt((cxc - cx) ** 2 + (cyc - cy) ** 2) / gridSize;
    const bx = (c.maxX - c.minX + 1) / gridSize;
    const by = (c.maxY - c.minY + 1) / gridSize;
    const fill = c.area / ((c.maxX - c.minX + 1) * (c.maxY - c.minY + 1));
    const score = c.area * (1 - 0.65 * dist) * (0.6 + 0.4 * fill) * (0.7 + 0.3 * Math.max(bx, by));
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  // محتوای «لبه» به‌تنهایی کادر جسم نیست؛ حاشیه‌ی امن اضافه می‌کنیم
  const pad = 0.06;
  const box: NormBox = {
    x: Math.max(0, best.minX / gridSize - pad),
    y: Math.max(0, best.minY / gridSize - pad),
    w: 0,
    h: 0,
  };
  box.w = Math.min(1 - box.x, (best.maxX - best.minX + 1) / gridSize + pad * 2);
  box.h = Math.min(1 - box.y, (best.maxY - best.minY + 1) / gridSize + pad * 2);

  const bigEnough = box.w * box.h >= 0.06 && box.w * box.h <= 0.98;
  const confident = bigEnough && comps.length >= 1;
  return { box, confident };
}

/** بافر خاکستری ۲۵۶×۲۵۶ با نرمال‌سازی نور (CLAHE سبک + کشش کنتراست محلی) */
export async function buildNormalizedGray(base: Buffer): Promise<Float32Array> {
  const size = ANALYSIS_SIZE;
  const flat = await flattenWhite(base);
  const raw = await sharp(flat)
    .resize(size, size, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  const small = 16;
  const smallRaw = await sharp(flat)
    .resize(small, small, { fit: 'fill' })
    .grayscale()
    .blur(3)
    .raw()
    .toBuffer();

  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const sx = Math.min(small - 1, Math.floor((x / size) * small));
      const sy = Math.min(small - 1, Math.floor((y / size) * small));
      const illum = smallRaw[sy * small + sx] || 1;
      // تقسیم بر روشنایی محلی => حذف سایه و گرادیان نور پس‌زمینه
      let v = raw[i] / Math.max(18, illum);
      v = v * 118;
      out[i] = Math.max(0, Math.min(255, v)) / 255;
    }
  }

  // کشش کنتراست سراسری بر اساس صدک ۲ و ۹۸
  const sorted = Float32Array.from(out).sort();
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const span = Math.max(0.08, hi - lo);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(1, (out[i] - lo) / span));
  return out;
}

/**
 * بافر خاکستری ۲۵۶×۲۵۶ با «نرمال‌سازی ملایم نور».
 *
 * تفاوت با buildNormalizedGray: آن تابع برای ارسال به مدل بینایی، کنتراست را
 * تا مرز سیاه/سفید می‌کشد (binarize-like). برای استخراج ویژگی ماشینی این کار
 * جزئیات داخلی قطعه (دنده، سوراخ، پله، ریب) را نابود می‌کند و باعث می‌شود دو
 * قطعه‌ی هم‌خانواده تقریباً یکسان دیده شوند. این تابع فقط سایه‌ی نور را برمی‌دارد
 * و جزئیات را حفظ می‌کند.
 */
export async function buildMildGray(base: Buffer): Promise<Float32Array> {
  const size = ANALYSIS_SIZE;
  const flat = await flattenWhite(base);
  const raw = await sharp(flat).resize(size, size, { fit: 'fill' }).grayscale().raw().toBuffer();
  const small = 16;
  const smallRaw = await sharp(flat)
    .resize(small, small, { fit: 'fill' })
    .grayscale()
    .blur(3)
    .raw()
    .toBuffer();

  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const sx = Math.min(small - 1, Math.floor((x / size) * small));
      const sy = Math.min(small - 1, Math.floor((y / size) * small));
      const illum = smallRaw[sy * small + sx] || 1;
      // حذف سایه/گرادیان نور با تقسیم بر روشنایی محلی — بدون کشش کنتراست سراسری
      const v = (raw[i] / Math.max(28, illum)) * 150;
      out[i] = Math.max(0, Math.min(255, v)) / 255;
    }
  }
  return out;
}

/** بافر RGB ۲۵۶×۲۵۶ با اصلاح تعادل سفیدی (gray-world) */
export async function buildNormalizedRgb(base: Buffer): Promise<Uint8Array> {
  const size = ANALYSIS_SIZE;
  const raw = await sharp(await flattenWhite(base)).resize(size, size, { fit: 'fill' }).removeAlpha().raw().toBuffer();

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const px = size * size;
  for (let i = 0; i < px; i++) {
    sumR += raw[i * 3];
    sumG += raw[i * 3 + 1];
    sumB += raw[i * 3 + 2];
  }
  const avg = (sumR + sumG + sumB) / 3 || 1;
  const gainR = Math.max(0.6, Math.min(1.7, avg / Math.max(1, sumR / px)));
  const gainG = Math.max(0.6, Math.min(1.7, avg / Math.max(1, sumG / px)));
  const gainB = Math.max(0.6, Math.min(1.7, avg / Math.max(1, sumB / px)));

  const out = new Uint8Array(px * 3);
  for (let i = 0; i < px; i++) {
    out[i * 3] = Math.max(0, Math.min(255, Math.round(raw[i * 3] * gainR)));
    out[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(raw[i * 3 + 1] * gainG)));
    out[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(raw[i * 3 + 2] * gainB)));
  }
  return out;
}

/** برش کادر جسم اصلی از یک Buffer (با حاشیه امن) */
export async function cropToBox(buffer: Buffer, box: NormBox, padRatio = 0.04): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const W = meta.width || 0;
  const H = meta.height || 0;
  if (!W || !H) return buffer;

  let left = Math.round((box.x - box.w * padRatio) * W);
  let top = Math.round((box.y - box.h * padRatio) * H);
  let width = Math.round(box.w * (1 + padRatio * 2) * W);
  let height = Math.round(box.h * (1 + padRatio * 2) * H);

  left = Math.max(0, Math.min(W - 8, left));
  top = Math.max(0, Math.min(H - 8, top));
  width = Math.max(8, Math.min(W - left, width));
  height = Math.max(8, Math.min(H - top, height));

  if (width < 16 || height < 16) return buffer;
  try {
    return await sharp(buffer).extract({ left, top, width, height }).toBuffer();
  } catch {
    return buffer;
  }
}

/** چرخش ۹۰ درجه (برای مقاوم‌سازی نسبت به جهت قرارگیری قطعه در قاب) */
export async function rotate90(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).rotate(90).toBuffer();
  } catch {
    return buffer;
  }
}

/** آینه افقی (قطعات متقارن در عکس کاربر ممکن است آینه‌شده دیده شوند) */
export async function flipHorizontal(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).flop().toBuffer();
  } catch {
    return buffer;
  }
}

/** بندانگشتی سبک برای لاگ/پنل مدیریت */
export async function buildThumbnail(buffer: Buffer, size = 160): Promise<string> {
  try {
    const thumb = await sharp(buffer)
      .resize(size, size, { fit: 'inside' })
      .jpeg({ quality: 62 })
      .toBuffer();
    return toDataUrl(thumb);
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// «وضعیت کانونی» جسم (Canonical Pose)
// ---------------------------------------------------------------------------
/**
 * چرخش تصویر به‌گونه‌ای که محور اصلی جسم (Principal Axis) افقی شود.
 *
 * چرا؟ عکس کاربر از یک قطعه می‌تواند با هر زاویه‌ای گرفته شود (مثلاً تسمه‌ای که
 * اریب روی میز افتاده). اگر پیش از استخراج ویژگی، جسم را به وضعیت کانونی
 * ببریم، بردارهای دو عکس از یک جسم (با زاویه‌های متفاوت) به هم نزدیک می‌شوند.
 *
 * محور اصلی از ممان‌های مرتبه‌ی دوم ماسک جسم محاسبه می‌شود:
 *   θ = ۰.۵ · atan2(۲μ۱۱ , μ۲۰ − μ۰۲)
 * (کاملاً آفلاین و قطعی — هیچ متادیتا/نام فایلی دخیل نیست.)
 */
export interface CanonicalObject {
  /** آرایه‌ی خاکستری ۲۵۶×۲۵۶ در وضعیت کانونی */
  gray: Float32Array;
  /** آرایه‌ی RGB ۲۵۶×۲۵۶ در وضعیت کانونی */
  rgb: Uint8Array;
  /** زاویه‌ی چرخش اعمال‌شده (درجه) */
  angleDeg: number;
  /** نسبت ابعاد جسم (عرض/ارتفاع) پس از کانونی‌سازی */
  aspect: number;
  /** آیا ماسک جسم با اطمینان استخراج شد؟ */
  masked: boolean;
}

interface MaskStats {
  count: number;
  cx: number;
  cy: number;
  theta: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  bg: number;
  threshold: number;
  mask: Uint8Array;
}

/** ماسک جسم + ممان‌ها روی آرایه‌ی خاکستری (بدون هیچ وابستگی خارجی) */
function maskStats(gray: Float32Array, size: number): MaskStats | null {
  // رنگ پس‌زمینه ≈ میانه‌ی حاشیه‌ی تصویر
  const border: number[] = [];
  const step = Math.max(1, Math.floor(size / 64));
  for (let x = 0; x < size; x += step) {
    border.push(gray[x], gray[(size - 1) * size + x]);
  }
  for (let y = 0; y < size; y += step) {
    border.push(gray[y * size], gray[y * size + size - 1]);
  }
  border.sort((a, b) => a - b);
  const bg = border[Math.floor(border.length / 2)] ?? 1;

  const mass = new Float32Array(size * size);
  let massSum = 0;
  for (let i = 0; i < mass.length; i++) {
    const m = Math.abs(gray[i] - bg);
    mass[i] = m;
    massSum += m;
  }
  if (massSum / (size * size) < 0.006) return null; // جسمی از پس‌زمینه جدا نشد

  // آستانه‌ی اوتسو روی نقشه‌ی فاصله از پس‌زمینه
  const T = otsu(mass);

  const mask = new Uint8Array(size * size);
  let count = 0;
  let sx = 0;
  let sy = 0;
  let minX = size;
  let minY = size;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (mass[y * size + x] <= T) continue;
      mask[y * size + x] = 1;
      count++;
      sx += x;
      sy += y;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (count < size * size * 0.01) return null;

  const cx = sx / count;
  const cy = sy / count;
  let m20 = 0;
  let m02 = 0;
  let m11 = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (mass[y * size + x] <= T) continue;
      const dx = x - cx;
      const dy = y - cy;
      m20 += dx * dx;
      m02 += dy * dy;
      m11 += dx * dy;
    }
  }
  const theta = 0.5 * Math.atan2(2 * m11, m20 - m02);
  return { count, cx, cy, theta, bbox: { x0: minX, y0: minY, x1: maxX, y1: maxY }, bg, threshold: T, mask };
}

/** آستانه‌ی اوتسو برای یک نقشه‌ی شدت */
function otsu(values: Float32Array): number {
  const bins = 64;
  let max = 0;
  for (let i = 0; i < values.length; i++) if (values[i] > max) max = values[i];
  if (max <= 0) return 0;
  const hist = new Float64Array(bins);
  for (let i = 0; i < values.length; i++) {
    hist[Math.min(bins - 1, Math.floor((values[i] / max) * (bins - 1)))]++;
  }
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < bins; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVar = -1;
  for (let i = 0; i < bins; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) {
      bestVar = between;
      best = i;
    }
  }
  return (best / (bins - 1)) * max;
}

/** نمونه‌برداری دوخطی از آرایه‌ی خاکستری */
function sampleBilinear(gray: Float32Array, size: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x > size - 1 || y > size - 1) return 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(size - 1, x0 + 1);
  const y1 = Math.min(size - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const a = gray[y0 * size + x0];
  const b = gray[y0 * size + x1];
  const c = gray[y1 * size + x0];
  const d = gray[y1 * size + x1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

/** نمونه‌برداری دوخطی از آرایه‌ی RGB */
function sampleRgbBilinear(rgb: Uint8Array, size: number, x: number, y: number): [number, number, number] {
  if (x < 0 || y < 0 || x > size - 1 || y > size - 1) return [128, 128, 128];
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(size - 1, x0 + 1);
  const y1 = Math.min(size - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const out: [number, number, number] = [0, 0, 0];
  const w = [
    (1 - fx) * (1 - fy),
    fx * (1 - fy),
    (1 - fx) * fy,
    fx * fy,
  ];
  const idx = [y0 * size + x0, y0 * size + x1, y1 * size + x0, y1 * size + x1];
  for (let c = 0; c < 3; c++) {
    out[c] =
      rgb[idx[0] * 3 + c] * w[0] +
      rgb[idx[1] * 3 + c] * w[1] +
      rgb[idx[2] * 3 + c] * w[2] +
      rgb[idx[3] * 3 + c] * w[3];
  }
  return out;
}

/** چرخش آرایه‌های نرمال‌شده حول مرکز، با مقیاس ثابت تا محتوا در کادر بماند */
function rotateArrays(
  gray: Float32Array,
  rgb: Uint8Array,
  size: number,
  angleRad: number
): { gray: Float32Array; rgb: Uint8Array } {
  const outGray = new Float32Array(size * size);
  const outRgb = new Uint8Array(size * size * 3);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const scale = 1 / (Math.abs(cos) + Math.abs(sin));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) * scale;
      const dy = (y - cy) * scale;
      const sx = cos * dx + sin * dy + cx;
      const sy = -sin * dx + cos * dy + cy;
      const i = y * size + x;
      outGray[i] = sampleBilinear(gray, size, sx, sy);
      const [r, g, b] = sampleRgbBilinear(rgb, size, sx, sy);
      outRgb[i * 3] = Math.max(0, Math.min(255, Math.round(r)));
      outRgb[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(g)));
      outRgb[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }
  return { gray: outGray, rgb: outRgb };
}

/** برش کادر ماسک و جاگذاری «متقارن با حفظ نسبت ابعاد» در قاب مربعی */
function reframeToSquare(
  gray: Float32Array,
  rgb: Uint8Array,
  size: number,
  box: { x0: number; y0: number; x1: number; y1: number },
  mask?: Uint8Array,
  padRatio = 0.05,
  stretch = false
): { gray: Float32Array; rgb: Uint8Array; aspect: number; mask: Uint8Array | null } {
  const bw = Math.max(4, box.x1 - box.x0 + 1);
  const bh = Math.max(4, box.y1 - box.y0 + 1);
  const inner = size * (1 - 2 * padRatio);
  const scale = stretch ? Math.max(inner / bw, inner / bh) : Math.min(inner / bw, inner / bh);
  const dw = bw * scale;
  const dh = bh * scale;
  const ox = (size - dw) / 2;
  const oy = (size - dh) / 2;

  const outGray = new Float32Array(size * size).fill(0.5);
  const outRgb = new Uint8Array(size * size * 3).fill(128);
  const outMask = mask ? new Uint8Array(size * size) : null;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = box.x0 + ((x - ox) / dw) * bw;
      const gy = box.y0 + ((y - oy) / dh) * bh;
      if (gx < box.x0 - 0.5 || gy < box.y0 - 0.5 || gx > box.x1 + 0.5 || gy > box.y1 + 0.5) continue;
      const i = y * size + x;
      outGray[i] = sampleBilinear(gray, size, gx, gy);
      const [r, g, b] = sampleRgbBilinear(rgb, size, gx, gy);
      outRgb[i * 3] = Math.max(0, Math.min(255, Math.round(r)));
      outRgb[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(g)));
      outRgb[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(b)));
      if (outMask) {
        const mx = Math.round(gx);
        const my = Math.round(gy);
        if (mx >= 0 && my >= 0 && mx < size && my < size && mask![my * size + mx]) outMask[i] = 1;
      }
    }
  }
  return { gray: outGray, rgb: outRgb, aspect: bw / bh, mask: outMask };
}

/**
 * حذف «نوارهای سراسری» از ماسک.
 * اگر یک ردیف یا ستون تقریباً تمام‌عرض پوشیده شده باشد، آن ساختار پس‌زمینه است
 * (نوارهای پس‌زمینه‌ی کاتالوگ، لبه‌ی میز کار، خط افق) نه جسم اصلی.
 */
function filterStripes(mask: Uint8Array, size: number, ratio = 0.82): Uint8Array {
  const out = Uint8Array.from(mask);
  for (let y = 0; y < size; y++) {
    let c = 0;
    for (let x = 0; x < size; x++) c += mask[y * size + x];
    if (c / size >= ratio) for (let x = 0; x < size; x++) out[y * size + x] = 0;
  }
  for (let x = 0; x < size; x++) {
    let c = 0;
    for (let y = 0; y < size; y++) c += mask[y * size + x];
    if (c / size >= ratio) for (let y = 0; y < size; y++) out[y * size + x] = 0;
  }
  return out;
}

/** بستنِ مورفولوژیک ماسک (پرکردن سوراخ‌های ریز داخل جسم) */
function closeMask(mask: Uint8Array, size: number, iterations = 3): Uint8Array {
  let cur = mask;
  const dilate = (src: Uint8Array) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 0;
        for (let dy = -1; dy <= 1 && !v; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            if (src[ny * size + nx]) {
              v = 1;
              break;
            }
          }
        }
        out[y * size + x] = v;
      }
    }
    return out;
  };
  const erode = (src: Uint8Array) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let v = 1;
        for (let dy = -1; dy <= 1 && v; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size || !src[ny * size + nx]) {
              v = 0;
              break;
            }
          }
        }
        out[y * size + x] = v;
      }
    }
    return out;
  };
  for (let i = 0; i < iterations; i++) cur = dilate(cur);
  for (let i = 0; i < iterations; i++) cur = erode(cur);
  return cur;
}

/** ماسک نهایی جسم در قاب کانونی (۱ = جسم) */
function canonicalMask(gray: Float32Array, size: number): Uint8Array | null {
  const stats = maskStats(gray, size);
  if (!stats) return null;
  const bg = stats.bg;
  const mask = new Uint8Array(size * size);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = Math.abs(gray[i] - bg) > 0.06 ? 1 : 0;
  }
  const closed = closeMask(mask, size, 3);
  const stripped = filterStripes(closed, size);
  let count = 0;
  for (let i = 0; i < stripped.length; i++) count += stripped[i];
  return count > size * size * 0.02 ? stripped : null;
}

/**
 * ساخت «وضعیت کانونی» جسم:
 *   ۱) برش ناحیه‌ی جسم با حاشیه‌ی امن (تا پس‌زمینه برای تخمین رنگ پس‌زمینه بماند)
 *   ۲) نرمال‌سازی ملایم نور + تعادل رنگ
 *   ۳) چرخش به وضعیت کانونی (محور اصلی افقی)
 *   ۴) قاب‌بندی مجدد متقارن با حفظ نسبت ابعاد
 *   ۵) بی‌اثرکردن پس‌زمینه (پیکسل‌های خارج از جسم → خاکستری خنثی)
 */
export async function buildCanonicalObject(
  buffer: Buffer,
  box: NormBox,
  opts: { padRatio?: number; size?: number; stretch?: boolean } = {}
): Promise<CanonicalObject> {
  const size = opts.size ?? ANALYSIS_SIZE;
  // حاشیه‌ی سخاوتمندانه: هم فضا برای چرخش می‌دهد، هم تخمین رنگ پس‌زمینه را ممکن می‌کند
  const padRatio = opts.padRatio ?? 0.14;

  const cropped = await flattenWhite(await cropToBox(buffer, box, padRatio));
  const square = await sharp(cropped)
    .resize(size, size, { fit: 'contain', background: { r: 250, g: 250, b: 250 } })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 92 })
    .toBuffer();

  const gray0 = await buildMildGray(square);
  const rgb0 = await buildNormalizedRgb(square);

  const stats = maskStats(gray0, size);
  if (!stats) {
    const neutral = neutralizeBackground(gray0, rgb0, size, null);
    return { gray: neutral.gray, rgb: neutral.rgb, angleDeg: 0, aspect: 1, masked: false };
  }

  // چرخش به وضعیت کانونی (محور اصلی افقی)
  const angleDeg = (stats.theta * 180) / Math.PI;
  const rotated = rotateArrays(gray0, rgb0, size, -stats.theta);

  // قاب‌بندی مجدد روی جسم (تا زاویه‌ی چرخش روی کادر اثر نگذارد)
  const stats2 = maskStats(rotated.gray, size);
  const srcStats = stats2 ?? stats;
  const bbox = srcStats.bbox;
  const degenerate = (bbox.x1 - bbox.x0 + 1) * (bbox.y1 - bbox.y0 + 1) > size * size * 0.94;
  const reframed = reframeToSquare(
    rotated.gray,
    rotated.rgb,
    size,
    degenerate ? stats.bbox : bbox,
    srcStats.threshold ? srcStats.mask : undefined,
    0.05,
    opts.stretch === true
  );

  // پس‌زمینه خنثی شود تا عکس روی میز کارگاه با عکس کاتالوگِ پس‌زمینه‌سفید یکسان دیده شود
  const finalMask = reframed.mask ? closeMask(reframed.mask, size, 3) : canonicalMask(reframed.gray, size);
  const neutral = neutralizeBackground(reframed.gray, reframed.rgb, size, finalMask);
  return {
    gray: neutral.gray,
    rgb: neutral.rgb,
    angleDeg,
    aspect: reframed.aspect,
    masked: true,
  };
}

/** پیکسل‌های خارج از ماسک جسم را به خاکستری خنثی تبدیل می‌کند */
function neutralizeBackground(
  gray: Float32Array,
  rgb: Uint8Array,
  size: number,
  mask: Uint8Array | null
): { gray: Float32Array; rgb: Uint8Array } {
  if (!mask) return { gray, rgb };
  const outGray = new Float32Array(gray.length);
  const outRgb = new Uint8Array(rgb.length);
  for (let i = 0; i < gray.length; i++) {
    const keep = mask[i] === 1;
    outGray[i] = keep ? gray[i] : 0.5;
    outRgb[i * 3] = keep ? rgb[i * 3] : 128;
    outRgb[i * 3 + 1] = keep ? rgb[i * 3 + 1] : 128;
    outRgb[i * 3 + 2] = keep ? rgb[i * 3 + 2] : 128;
  }
  void size;
  return { gray: outGray, rgb: outRgb };
}

/** چرخش ۱۸۰ درجه‌ی آرایه‌های نرمال‌شده */
export function rotateArrays180(gray: Float32Array, rgb: Uint8Array): { gray: Float32Array; rgb: Uint8Array } {
  const n = gray.length;
  const outGray = new Float32Array(n);
  for (let i = 0; i < n; i++) outGray[i] = gray[n - 1 - i];
  const outRgb = new Uint8Array(rgb.length);
  for (let i = 0; i < n; i++) {
    const j = n - 1 - i;
    outRgb[i * 3] = rgb[j * 3];
    outRgb[i * 3 + 1] = rgb[j * 3 + 1];
    outRgb[i * 3 + 2] = rgb[j * 3 + 2];
  }
  return { gray: outGray, rgb: outRgb };
}

/** آینه‌ی افقی آرایه‌های نرمال‌شده */
export function flipArrays(gray: Float32Array, rgb: Uint8Array): { gray: Float32Array; rgb: Uint8Array } {
  const size = Math.round(Math.sqrt(gray.length));
  const outGray = new Float32Array(gray.length);
  const outRgb = new Uint8Array(rgb.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = y * size + (size - 1 - x);
      const dst = y * size + x;
      outGray[dst] = gray[src];
      outRgb[dst * 3] = rgb[src * 3];
      outRgb[dst * 3 + 1] = rgb[src * 3 + 1];
      outRgb[dst * 3 + 2] = rgb[src * 3 + 2];
    }
  }
  return { gray: outGray, rgb: outRgb };
}
