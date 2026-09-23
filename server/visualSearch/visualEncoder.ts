/**
 * Atlas Visual Product Search — Visual Encoder (Local, deterministic, offline)
 * ---------------------------------------------------------------------------
 * «شبکه‌ی عصبی محلی» ماژول جستجوی بصری.
 *
 * این فایل از پیکسل‌های تصویر یک بردار ویژگی ۵۱۲ بُعدی (Image Embedding)
 * می‌سازد که فقط به «ظاهر، شکل، هندسه و ساختار» قطعه حساس است و نسبت به
 * پس‌زمینه، نور، فاصله، کیفیت و جهت قرارگیری مقاوم است.
 *
 * چیدمان ۵۱۲ بُعدی (ثابت — تضمین سازگاری ایندکس و پرس‌وجو):
 *   HOG سطح ۰ (۱×۱ × ۸ جهت)                      =   8
 *   HOG سطح ۱ (۲×۲ × ۸ جهت)                      =  32
 *   HOG سطح ۲ (۴×۴ × ۸ جهت)                      = 128
 *   HOG ریز (۶×۶ × ۶ جهت)                        = 216
 *   شبکه رنگ (۳×۳ × ۶: میانگین RGB + انحراف RGB) =  54
 *   هیستوگرام شدت (۱۶ سطل)                        =  16
 *   پروفایل تصویر سایه‌نما (۱۲ عمودی + ۱۲ افقی)   =  24
 *   امضای شعاعی شکل (۱۶ بخش زاویه‌ای)             =  16
 *   ممان‌های شکل نرمال‌شده                         =   6
 *   تراکم لبه چندمقیاسه (۳ مقیاس × ۴ ناحیه)        =  12
 *                                                 ------
 *                                                   512
 *
 * ⚠️ هیچ نام فایل / EXIF / متادیتا / کد محصول در این محاسبات دخالت ندارد.
 */

import sharp from 'sharp';
import type {
  EmbeddingView,
  ImageSignature,
  StructureSignature,
} from './types';
import {
  type NormBox,
  buildCanonicalObject,
  buildNormalizedGray,
  buildNormalizedRgb,
  cropToBox,
  detectMainObject,
  flipArrays,
  flipHorizontal,
  normalizeForAnalysis,
  rotate90,
  rotateArrays180,
} from './imagePreprocess';

export const EMBEDDING_DIM = 512;
export const ANALYSIS = 256;

// ---------------------------------------------------------------------------
// هش‌های ادراکی (برای تشخیص «همان تصویر» — Strict Duplicate Detection)
// ---------------------------------------------------------------------------

function bitsToHex(bits: string): string {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** 256 بیتی dHash */
async function computeDHash(buffer: Buffer): Promise<string> {
  const raw = await sharp(buffer).resize(17, 16, { fit: 'fill' }).grayscale().raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) bits += raw[y * 17 + x] > raw[y * 17 + x + 1] ? '1' : '0';
  }
  return bitsToHex(bits);
}

/** 64 بیتی aHash */
async function computeAHash(buffer: Buffer): Promise<string> {
  const raw = await sharp(buffer).resize(8, 8, { fit: 'fill' }).grayscale().raw().toBuffer();
  const mean = raw.reduce((a, b) => a + b, 0) / 64;
  let bits = '';
  for (let i = 0; i < 64; i++) bits += raw[i] > mean ? '1' : '0';
  return bitsToHex(bits);
}

/** 64 بیتی pHash (DCT) */
async function computePHash(buffer: Buffer): Promise<string> {
  const N = 32;
  const M = 8;
  const pixels = await sharp(buffer).resize(N, N, { fit: 'fill' }).grayscale().raw().toBuffer();
  const cos = (u: number, x: number) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
  const c = (u: number) => (u === 0 ? Math.SQRT1_2 : 1);
  const dct = new Float64Array(M * M);
  for (let u = 0; u < M; u++) {
    for (let v = 0; v < M; v++) {
      let s = 0;
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) s += pixels[y * N + x] * cos(u, x) * cos(v, y);
      }
      dct[u * M + v] = c(u) * c(v) * s;
    }
  }
  const sorted = Array.from(dct).sort((a, b) => a - b);
  const med = sorted[32];
  let bits = '';
  for (let i = 0; i < 64; i++) bits += dct[i] > med ? '1' : '0';
  return bitsToHex(bits);
}

/**
 * نمونه‌برداری نزولی با میانگین‌گیری ناحیه‌ای (بدون sharp).
 */
function downsampleGray(gray: Float32Array, size: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let oy = 0; oy < h; oy++) {
    const y0 = (oy * size) / h;
    const y1 = ((oy + 1) * size) / h;
    for (let ox = 0; ox < w; ox++) {
      const x0 = (ox * size) / w;
      const x1 = ((ox + 1) * size) / w;
      let sum = 0;
      let n = 0;
      for (let y = Math.floor(y0); y < Math.min(size, Math.ceil(y1)); y++) {
        for (let x = Math.floor(x0); x < Math.min(size, Math.ceil(x1)); x++) {
          sum += gray[y * size + x];
          n++;
        }
      }
      out[oy * w + ox] = n ? (sum / n) * 255 : 0;
    }
  }
  return out;
}

/** dHash ۲۵۶ بیتی از آرایه‌ی خاکستری (۱۷×۱۶) */
export function dHashFromGray(gray: Float32Array, size: number): string {
  const cell = downsampleGray(gray, size, 17, 16);
  let bits = '';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) bits += cell[y * 17 + x] > cell[y * 17 + x + 1] ? '1' : '0';
  }
  return bitsToHex(bits);
}

/** aHash ۶۴ بیتی از آرایه‌ی خاکستری (۸×۸) */
export function aHashFromGray(gray: Float32Array, size: number): string {
  const cell = downsampleGray(gray, size, 8, 8);
  let sum = 0;
  for (let i = 0; i < 64; i++) sum += cell[i];
  const mean = sum / 64;
  let bits = '';
  for (let i = 0; i < 64; i++) bits += cell[i] > mean ? '1' : '0';
  return bitsToHex(bits);
}

/** pHash ۶۴ بیتی (DCT) از آرایه‌ی خاکستری (۳۲×۳۲ → ضرایب ۸×۸) */
export function pHashFromGray(gray: Float32Array, size: number): string {
  const N = 32;
  const M = 8;
  const px = downsampleGray(gray, size, N, N);
  const cos = (u: number, x: number) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
  const c = (u: number) => (u === 0 ? Math.SQRT1_2 : 1);
  const dct = new Float64Array(M * M);
  for (let u = 0; u < M; u++) {
    for (let v = 0; v < M; v++) {
      let acc = 0;
      for (let x = 0; x < N; x++) {
        const cu = cos(u, x);
        for (let y = 0; y < N; y++) acc += px[y * N + x] * cu * cos(v, y);
      }
      dct[u * M + v] = c(u) * c(v) * acc;
    }
  }
  const sorted = Array.from(dct).sort((a, b) => a - b);
  const med = sorted[32];
  let bits = '';
  for (let i = 0; i < 64; i++) bits += dct[i] > med ? '1' : '0';
  return bitsToHex(bits);
}

export function hammingDistance(h1: string, h2: string): number {
  if (!h1 || !h2 || h1.length !== h2.length) return Number.MAX_SAFE_INTEGER;
  let d = 0;
  for (let i = 0; i < h1.length; i++) {
    let x = parseInt(h1[i], 16) ^ parseInt(h2[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

// ---------------------------------------------------------------------------
// سایه‌نما (Silhouette) — پایه‌ی امضای ساختاری
// ---------------------------------------------------------------------------

interface SilhouetteMask {
  mask: Uint8Array; // 1 = جسم
  size: number;
  fill: number;
  componentCount: number;
  holeCount: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

function boxMean(values: Float32Array, size: number, box: NormBox): number {
  const x0 = Math.max(0, Math.floor(box.x * size));
  const y0 = Math.max(0, Math.floor(box.y * size));
  const x1 = Math.min(size, Math.ceil((box.x + box.w) * size));
  const y1 = Math.min(size, Math.ceil((box.y + box.h) * size));
  let s = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      s += values[y * size + x];
      n++;
    }
  }
  return n ? s / n : 0.5;
}

/**
 * استخراج سایه‌نمای جسم اصلی + شمارش اجزا و حفره‌ها (سوراخ‌ها).
 * شمارش سوراخ و تعداد اجزا، همان «تعداد دندانه/پره/سوراخ» را تقریب می‌زند
 * که برای راستی‌آزمایی EXACT حیاتی است.
 */
function buildSilhouette(gray: Float32Array, box: NormBox, grid = 128): SilhouetteMask {
  const size = grid;
  const patch = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(ANALYSIS - 1, Math.floor((box.x + (x / size) * box.w) * ANALYSIS));
      const sy = Math.min(ANALYSIS - 1, Math.floor((box.y + (y / size) * box.h) * ANALYSIS));
      patch[y * size + x] = gray[sy * ANALYSIS + sx];
    }
  }

  // آستانه‌گذاری Otsu
  const hist = new Array(64).fill(0);
  for (let i = 0; i < patch.length; i++) hist[Math.min(63, Math.floor(patch[i] * 63))]++;
  let bestT = 0.45;
  let bestVar = -1;
  const total = patch.length;
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
    if (!w0 || !w1) continue;
    const between = (w0 / total) * (w1 / total) * (s0 / w0 - s1 / w1) ** 2;
    if (between > bestVar) {
      bestVar = between;
      bestT = t / 63;
    }
  }

  // جسم = ناحیه‌ی تیره‌تر (قطعات صنعتی معمولاً روی پس‌زمینه‌ی روشن عکاسی می‌شوند).
  // اگر بیش از ۷۰٪ تصویر «تیره» باشد، منطق معکوس می‌شود.
  const darkMask = new Uint8Array(size * size);
  for (let i = 0; i < patch.length; i++) darkMask[i] = patch[i] <= bestT ? 1 : 0;
  let darkCount = 0;
  for (let i = 0; i < darkMask.length; i++) darkCount += darkMask[i];
  const objectIsDark = darkCount / darkMask.length <= 0.86;
  const mask = new Uint8Array(size * size);
  for (let i = 0; i < mask.length; i++) mask[i] = objectIsDark ? darkMask[i] : 1 - darkMask[i];

  // حذف نویز speckle: فیلتر سبک ۳×۳
  const cleaned = new Uint8Array(size * size);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) s += mask[(y + dy) * size + x + dx];
      }
      cleaned[y * size + x] = s >= 5 ? 1 : 0;
    }
  }

  // مؤلفه‌های متصل جسم
  const label = new Int32Array(size * size).fill(-1);
  const minArea = Math.max(4, Math.floor(size * size * 0.0004));
  let componentCount = 0;
  let x0 = size;
  let y0 = size;
  let x1 = 0;
  let y1 = 0;
  let objArea = 0;
  const stack: number[] = [];

  for (let start = 0; start < cleaned.length; start++) {
    if (cleaned[start] !== 1 || label[start] !== -1) continue;
    const id = componentCount;
    let area = 0;
    let lx0 = size;
    let ly0 = size;
    let lx1 = 0;
    let ly1 = 0;
    stack.length = 0;
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % size;
      const py = (p - px) / size;
      area++;
      if (px < lx0) lx0 = px;
      if (px > lx1) lx1 = px;
      if (py < ly0) ly0 = py;
      if (py > ly1) ly1 = py;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const np = ny * size + nx;
          if (cleaned[np] === 1 && label[np] === -1) {
            label[np] = id;
            stack.push(np);
          }
        }
      }
    }
    if (area < minArea) {
      // نویز — از mask پاک شود
      for (let p = 0; p < cleaned.length; p++) if (label[p] === id) cleaned[p] = 0;
      continue;
    }
    componentCount++;
    objArea += area;
    if (lx0 < x0) x0 = lx0;
    if (ly0 < y0) y0 = ly0;
    if (lx1 > x1) x1 = lx1;
    if (ly1 > y1) y1 = ly1;
  }

  if (componentCount === 0) {
    return {
      mask: cleaned,
      size,
      fill: 0,
      componentCount: 0,
      holeCount: 0,
      bbox: { x0: 0, y0: 0, x1: size - 1, y1: size - 1 },
    };
  }

  // حفره‌ها: نواحی پس‌زمینه‌ای که به مرز تصویر متصل نیستند (سوراخ‌ها)
  const bgLabel = new Int32Array(size * size).fill(-1);
  let holeCount = 0;
  const holeMinArea = Math.max(6, Math.floor(size * size * 0.0008));
  const bgStack: number[] = [];
  const push = (p: number) => {
    const px = p % size;
    const py = (p - px) / size;
    if (px === 0 || py === 0 || px === size - 1 || py === size - 1) {
      if (cleaned[p] === 0 && bgLabel[p] === -1) {
        bgLabel[p] = -2; // پس‌زمینه‌ی بیرونی
        bgStack.push(p);
      }
    }
  };
  for (let i = 0; i < size; i++) {
    push(i);
    push(size * (size - 1) + i);
    push(i * size);
    push(i * size + size - 1);
  }
  while (bgStack.length) {
    const p = bgStack.pop()!;
    const px = p % size;
    const py = (p - px) / size;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const np = ny * size + nx;
        if (cleaned[np] === 0 && bgLabel[np] === -1) {
          bgLabel[np] = -2;
          bgStack.push(np);
        }
      }
    }
  }
  const visited = new Uint8Array(size * size);
  for (let start = 0; start < cleaned.length; start++) {
    if (cleaned[start] !== 0 || bgLabel[start] !== -1 || visited[start]) continue;
    let area = 0;
    const inner: number[] = [];
    const s2: number[] = [start];
    visited[start] = 1;
    while (s2.length) {
      const p = s2.pop()!;
      inner.push(p);
      area++;
      const px = p % size;
      const py = (p - px) / size;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const np = ny * size + nx;
          if (cleaned[np] === 0 && bgLabel[np] === -1 && !visited[np]) {
            visited[np] = 1;
            s2.push(np);
          }
        }
      }
    }
    if (area >= holeMinArea) holeCount++;
  }

  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  return {
    mask: cleaned,
    size,
    fill: objArea / Math.max(1, bw * bh),
    componentCount: Math.min(componentCount, 64),
    holeCount: Math.min(holeCount, 64),
    bbox: { x0, y0, x1, y1 },
  };
}

/** امضای ساختاری شکل/هندسه — مستقل از رنگ و روشنایی */
function buildStructure(
  gray: Float32Array,
  rgb: Uint8Array,
  box: NormBox,
  silhouette: SilhouetteMask
): StructureSignature {
  const { mask, size } = silhouette;
  const bw = silhouette.bbox.x1 - silhouette.bbox.x0 + 1;
  const bh = silhouette.bbox.y1 - silhouette.bbox.y0 + 1;
  const aspectRatio = bw / Math.max(1, bh);

  // هیستوگرام جهت لبه (۱۲ سطل) روی کل کادر جسم
  const orientation = new Array(12).fill(0);
  let edgeTotal = 0;
  const x0 = Math.max(1, silhouette.bbox.x0);
  const x1 = Math.min(size - 2, silhouette.bbox.x1);
  const y0 = Math.max(1, silhouette.bbox.y0);
  const y1 = Math.min(size - 2, silhouette.bbox.y1);
  // گرادیان روی ماسک/تصویر ۱۲۸×۱۲۸ (سریع و پایدار)
  const grad = new Float32Array(size * size);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const sx1 = Math.min(ANALYSIS - 1, Math.floor((box.x + ((x + 1) / size) * box.w) * ANALYSIS));
      const sx0 = Math.min(ANALYSIS - 1, Math.floor((box.x + ((x - 1) / size) * box.w) * ANALYSIS));
      const sy1 = Math.min(ANALYSIS - 1, Math.floor((box.y + ((y + 1) / size) * box.h) * ANALYSIS));
      const sy0 = Math.min(ANALYSIS - 1, Math.floor((box.y + ((y - 1) / size) * box.h) * ANALYSIS));
      const gx2 = gray[sy1 * ANALYSIS + sx1] - gray[sy0 * ANALYSIS + sx0];
      const gy2 = gray[sy1 * ANALYSIS + sx0] - gray[sy0 * ANALYSIS + sx1];
      const mag = Math.sqrt(gx2 * gx2 + gy2 * gy2);
      grad[y * size + x] = mag;
      if (mask[y * size + x] === 1) {
        let ang = Math.atan2(gy2, gx2);
        if (ang < 0) ang += Math.PI;
        const bin = Math.min(11, Math.floor((ang / Math.PI) * 12));
        orientation[bin] += mag;
        edgeTotal += mag;
      }
    }
  }
  if (edgeTotal > 0) for (let i = 0; i < 12; i++) orientation[i] /= edgeTotal;

  // امضای شعاعی (۱۶ بخش): میانگین فاصله‌ی لبه‌ی جسم از مرکز در هر بخش
  const radial = new Array(16).fill(0);
  const radialCount = new Array(16).fill(0);
  const cxp = silhouette.bbox.x0 + bw / 2;
  const cyp = silhouette.bbox.y0 + bh / 2;
  for (let y = silhouette.bbox.y0; y <= silhouette.bbox.y1; y++) {
    for (let x = silhouette.bbox.x0; x <= silhouette.bbox.x1; x++) {
      if (mask[y * size + x] !== 1) continue;
      if (
        mask[y * size + x + 1] === 1 &&
        mask[y * size + x - 1] === 1 &&
        mask[(y + 1) * size + x] === 1 &&
        mask[(y - 1) * size + x] === 1
      ) {
        continue; // پیکسل داخلی، نه لبه
      }
      const dx = (x - cxp) / Math.max(1, bw / 2);
      const dy = (y - cyp) / Math.max(1, bh / 2);
      let ang = Math.atan2(dy, dx);
      if (ang < 0) ang += Math.PI * 2;
      const b = Math.min(15, Math.floor((ang / (Math.PI * 2)) * 16));
      radial[b] += Math.sqrt(dx * dx + dy * dy);
      radialCount[b]++;
    }
  }
  for (let i = 0; i < 16; i++) radial[i] = radialCount[i] ? radial[i] / radialCount[i] : 0;

  let edgeDensity = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      edgeDensity += grad[y * size + x];
      n++;
    }
  }
  edgeDensity = n ? edgeDensity / n : 0;

  void rgb;
  return {
    aspectRatio,
    fillRatio: silhouette.fill,
    holeCount: silhouette.holeCount,
    componentCount: silhouette.componentCount,
    edgeDensity,
    radial,
    orientation,
  };
}

// ---------------------------------------------------------------------------
// ساخت بردار ۵۱۲ بُعدی
// ---------------------------------------------------------------------------

function hogCellHistogram(
  gray: Float32Array,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bins: number
): number[] {
  const hist = new Array(bins).fill(0);
  for (let y = Math.max(1, y0); y < Math.min(size - 1, y1); y++) {
    for (let x = Math.max(1, x0); x < Math.min(size - 1, x1); x++) {
      const i = y * size + x;
      const gx = gray[i + 1] - gray[i - 1];
      const gy = gray[i + size] - gray[i - size];
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag < 0.02) continue;
      let ang = Math.atan2(gy, gx);
      if (ang < 0) ang += Math.PI;
      const pos = (ang / Math.PI) * bins;
      const b0 = Math.floor(pos) % bins;
      const b1 = (b0 + 1) % bins;
      const frac = pos - Math.floor(pos);
      hist[b0] += mag * (1 - frac);
      hist[b1] += mag * frac;
    }
  }
  // نرمال‌سازی L2 با سقف‌گذاری (استاندارد HOG)
  let norm = 0;
  for (const v of hist) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return hist.map(v => Math.min(v / norm, 0.2));
}

/**
 * ساخت بردار ۵۱۲ بُعدی از بافرهای نرمال‌شده.
 * `region` ناحیه‌ی جسم است (نسبت ۰..۱) — برای نمای full کل کادر و برای نمای
 * object ناحیه‌ی ایزوله‌شده استفاده می‌شود.
 */
export function buildEmbedding(
  gray: Float32Array,
  rgb: Uint8Array,
  region: NormBox,
  silhouette: SilhouetteMask
): Float32Array {
  const size = ANALYSIS;
  const vec: number[] = [];
  const gx0 = Math.floor(region.x * size);
  const gy0 = Math.floor(region.y * size);
  const gx1 = Math.min(size, Math.ceil((region.x + region.w) * size));
  const gy1 = Math.min(size, Math.ceil((region.y + region.h) * size));
  const rw = Math.max(8, gx1 - gx0);
  const rh = Math.max(8, gy1 - gy0);

  // ---- HOG چندسطحی ----
  const levels: { g: number; bins: number }[] = [
    { g: 1, bins: 8 },
    { g: 2, bins: 8 },
    { g: 4, bins: 8 },
    { g: 6, bins: 6 },
  ];
  for (const { g, bins } of levels) {
    for (let cy = 0; cy < g; cy++) {
      for (let cx = 0; cx < g; cx++) {
        const cx0 = gx0 + Math.floor((cx / g) * rw);
        const cx1 = gx0 + Math.floor(((cx + 1) / g) * rw);
        const cy0 = gy0 + Math.floor((cy / g) * rh);
        const cy1 = gy0 + Math.floor(((cy + 1) / g) * rh);
        vec.push(...hogCellHistogram(gray, size, cx0, cy0, cx1, cy1, bins));
      }
    }
  }

  // ---- شبکه رنگ ۳×۳ (میانگین + انحراف معیار RGB) ----
  for (let cy = 0; cy < 3; cy++) {
    for (let cx = 0; cx < 3; cx++) {
      const cx0 = gx0 + Math.floor((cx / 3) * rw);
      const cx1 = gx0 + Math.floor(((cx + 1) / 3) * rw);
      const cy0 = gy0 + Math.floor((cy / 3) * rh);
      const cy1 = gy0 + Math.floor(((cy + 1) / 3) * rh);
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sqr = 0;
      let sqg = 0;
      let sqb = 0;
      let n = 0;
      for (let y = cy0; y < cy1; y++) {
        for (let x = cx0; x < cx1; x++) {
          const i = (y * size + x) * 3;
          const r = rgb[i] / 255;
          const g2 = rgb[i + 1] / 255;
          const b = rgb[i + 2] / 255;
          sr += r;
          sg += g2;
          sb += b;
          sqr += r * r;
          sqg += g2 * g2;
          sqb += b * b;
          n++;
        }
      }
      if (!n) {
        vec.push(0, 0, 0, 0, 0, 0);
        continue;
      }
      const mr = sr / n;
      const mg = sg / n;
      const mb = sb / n;
      vec.push(
        mr,
        mg,
        mb,
        Math.sqrt(Math.max(0, sqr / n - mr * mr)),
        Math.sqrt(Math.max(0, sqg / n - mg * mg)),
        Math.sqrt(Math.max(0, sqb / n - mb * mb))
      );
    }
  }

  // ---- هیستوگرام شدت (۱۶ سطل) ----
  const intHist = new Array(16).fill(0);
  let count = 0;
  for (let y = gy0; y < gy1; y++) {
    for (let x = gx0; x < gx1; x++) {
      intHist[Math.min(15, Math.floor(gray[y * size + x] * 15))]++;
      count++;
    }
  }
  for (let i = 0; i < 16; i++) vec.push(count ? intHist[i] / count : 0);

  // ---- پروفایل‌های تصویر سایه‌نما (۱۲ + ۱۲) ----
  const sSize = silhouette.size;
  const sx0 = Math.max(0, Math.floor((gx0 / size) * sSize));
  const sx1 = Math.min(sSize, Math.ceil((gx1 / size) * sSize));
  const sy0 = Math.max(0, Math.floor((gy0 / size) * sSize));
  const sy1 = Math.min(sSize, Math.ceil((gy1 / size) * sSize));
  const vProfile = new Array(12).fill(0);
  const hProfile = new Array(12).fill(0);
  for (let y = sy0; y < sy1; y++) {
    for (let x = sx0; x < sx1; x++) {
      if (silhouette.mask[y * sSize + x] !== 1) continue;
      const bx = Math.min(11, Math.floor(((x - sx0) / Math.max(1, sx1 - sx0)) * 12));
      const by = Math.min(11, Math.floor(((y - sy0) / Math.max(1, sy1 - sy0)) * 12));
      vProfile[bx]++;
      hProfile[by]++;
    }
  }
  const vMax = Math.max(1, ...vProfile);
  const hMax = Math.max(1, ...hProfile);
  vec.push(...vProfile.map(v => v / vMax));
  vec.push(...hProfile.map(v => v / hMax));

  // ---- امضای شعاعی ----
  vec.push(...silhouetteRadial(silhouette, region));

  // ---- ممان‌های شکل نرمال (۶) ----
  const st = silhouetteStats(silhouette, region);
  vec.push(st.aspect, st.fill, st.holeRatio, st.componentRatio, st.edgeDensityNorm, st.elongation);

  // ---- تراکم لبه چندمقیاسه (۳ مقیاس × ۴ ناحیه) ----
  for (const scale of [8, 16, 32]) {
    const cell = Math.max(1, Math.floor(rw / scale));
    for (let q = 0; q < 4; q++) {
      const qx = q % 2;
      const qy = Math.floor(q / 2);
      const qx0 = gx0 + qx * Math.floor(rw / 2);
      const qx1 = qx0 + Math.floor(rw / 2);
      const qy0 = gy0 + qy * Math.floor(rh / 2);
      const qy1 = qy0 + Math.floor(rh / 2);
      let sum = 0;
      let n = 0;
      for (let y = qy0; y < qy1; y += Math.max(1, cell)) {
        for (let x = qx0; x < qx1; x += Math.max(1, cell)) {
          const i = y * size + x;
          if (i - 1 < 0 || i + 1 >= size * size) continue;
          sum += Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + size] - gray[i - size]);
          n++;
        }
      }
      vec.push(n ? Math.min(1, sum / n) : 0);
    }
  }

  // ---- تثبیت ابعاد + نرمال‌سازی L2 ----
  const out = new Float32Array(EMBEDDING_DIM);
  const limit = Math.min(vec.length, EMBEDDING_DIM);
  for (let i = 0; i < limit; i++) out[i] = Number.isFinite(vec[i]) ? vec[i] : 0;
  let norm = 0;
  for (let i = 0; i < out.length; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm);
  if (norm > 1e-6) for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

function silhouetteRadial(silhouette: SilhouetteMask, region: NormBox): number[] {
  const { mask, size } = silhouette;
  const out = new Array(16).fill(0);
  const counts = new Array(16).fill(0);
  const bx0 = Math.max(0, Math.floor(region.x * size));
  const bx1 = Math.min(size, Math.ceil((region.x + region.w) * size));
  const by0 = Math.max(0, Math.floor(region.y * size));
  const by1 = Math.min(size, Math.ceil((region.y + region.h) * size));
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;
  const rx = Math.max(1, (bx1 - bx0) / 2);
  const ry = Math.max(1, (by1 - by0) / 2);
  for (let y = by0; y < by1; y++) {
    for (let x = bx0; x < bx1; x++) {
      if (mask[y * size + x] !== 1) continue;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      let ang = Math.atan2(dy, dx);
      if (ang < 0) ang += Math.PI * 2;
      const b = Math.min(15, Math.floor((ang / (Math.PI * 2)) * 16));
      out[b] += Math.sqrt(dx * dx + dy * dy);
      counts[b]++;
    }
  }
  for (let i = 0; i < 16; i++) out[i] = counts[i] ? out[i] / counts[i] : 0;
  return out;
}

function silhouetteStats(silhouette: SilhouetteMask, region: NormBox) {
  const bw = silhouette.bbox.x1 - silhouette.bbox.x0 + 1;
  const bh = silhouette.bbox.y1 - silhouette.bbox.y0 + 1;
  const aspect = bw / Math.max(1, bh);
  const area = Math.max(1, bw * bh);
  return {
    aspect: Math.min(1, aspect / 4),
    fill: silhouette.fill,
    holeRatio: Math.min(1, silhouette.holeCount / 12),
    componentRatio: Math.min(1, silhouette.componentCount / 8),
    edgeDensityNorm: Math.min(1, silhouette.fill > 0 ? 1 - Math.abs(silhouette.fill - 0.72) : 0),
    elongation: Math.min(1, Math.max(bw, bh) / Math.max(1, region.w * silhouette.size)),
  };
}

// ---------------------------------------------------------------------------
// نماها (Views) — مقاوم‌سازی نسبت به چرخش، آینه و پس‌زمینه
// ---------------------------------------------------------------------------

function cropGrayRegion(src: Float32Array, box: NormBox): Float32Array {
  const size = ANALYSIS;
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(size - 1, Math.floor((box.x + (x / size) * box.w) * size));
      const sy = Math.min(size - 1, Math.floor((box.y + (y / size) * box.h) * size));
      out[y * size + x] = src[sy * size + sx];
    }
  }
  return out;
}

function cropRgbRegion(src: Uint8Array, box: NormBox): Uint8Array {
  const size = ANALYSIS;
  const out = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(size - 1, Math.floor((box.x + (x / size) * box.w) * size));
      const sy = Math.min(size - 1, Math.floor((box.y + (y / size) * box.h) * size));
      const si = (sy * size + sx) * 3;
      const di = (y * size + x) * 3;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
    }
  }
  return out;
}

function rotateGray90CW(src: Float32Array): Float32Array {
  const size = ANALYSIS;
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) out[y * size + x] = src[x * size + (size - 1 - y)];
  }
  return out;
}

function rotateRgb90CW(src: Uint8Array): Uint8Array {
  const size = ANALYSIS;
  const out = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const si = (x * size + (size - 1 - y)) * 3;
      const di = (y * size + x) * 3;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
    }
  }
  return out;
}

function flipGray(src: Float32Array): Float32Array {
  const size = ANALYSIS;
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) out[y * size + x] = src[y * size + (size - 1 - x)];
  }
  return out;
}

function flipRgb(src: Uint8Array): Uint8Array {
  const size = ANALYSIS;
  const out = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const si = (y * size + (size - 1 - x)) * 3;
      const di = (y * size + x) * 3;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// تولید امضا برای همه‌ی نماها
// ---------------------------------------------------------------------------

export interface VariantSignature {
  view: EmbeddingView;
  signature: ImageSignature;
}

/**
 * تحلیل کامل یک تصویر و تولید امضای بصری برای همه‌ی نماها.
 * تمام کار سنگین (sharp) فقط یک‌بار انجام می‌شود.
 */
export async function analyzeImageVariants(
  buffer: Buffer,
  opts: { views?: EmbeddingView[]; computeHashes?: boolean } = {}
): Promise<VariantSignature[]> {
  const needHashes = opts.computeHashes !== false;

  const norm = await normalizeForAnalysis(buffer);
  const fullBox: NormBox = { x: 0, y: 0, w: 1, h: 1 };
  const objectBox: NormBox = norm.objectIsolated ? norm.objectBox : { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };

  // «وضعیت کانونی» جسم: چرخش محور اصلی + قاب‌بندی متقارن ⇒
  // ویژگی‌ها نسبت به زاویه‌ی عکاسی، کادر و پس‌زمینه مقاوم می‌شوند.
  const canonical = await buildCanonicalObject(norm.buffer, objectBox);
  const rot180 = rotateArrays180(canonical.gray, canonical.rgb);
  const flipped = flipArrays(canonical.gray, canonical.rgb);

  const views = opts.views ?? (['full', 'object', 'object-rot180', 'object-flip'] as EmbeddingView[]);
  const out: VariantSignature[] = [];

  for (const view of views) {
    let gray = norm.gray;
    let rgb = norm.rgb;
    const region = fullBox;
    let silhouette: SilhouetteMask;

    if (view === 'full') {
      silhouette = buildSilhouette(norm.gray, fullBox);
    } else if (view === 'object') {
      gray = canonical.gray;
      rgb = canonical.rgb;
      silhouette = buildSilhouette(canonical.gray, fullBox);
    } else if (view === 'object-rot180') {
      gray = rot180.gray;
      rgb = rot180.rgb;
      silhouette = buildSilhouette(rot180.gray, fullBox);
    } else {
      gray = flipped.gray;
      rgb = flipped.rgb;
      silhouette = buildSilhouette(flipped.gray, fullBox);
    }

    const embedding = buildEmbedding(gray, rgb, region, silhouette);
    const structure = buildStructure(gray, rgb, region, silhouette);

    // هش ادراکی هر نما از آرایه‌ی «جسمِ کانونی» همان نما محاسبه می‌شود؛
    // نه پس‌زمینه، نه کادر عکس و نه نور روی آن اثر می‌گذارد.
    const hashes = needHashes
      ? {
          dHash: dHashFromGray(gray, ANALYSIS),
          pHash: pHashFromGray(gray, ANALYSIS),
          aHash: aHashFromGray(gray, ANALYSIS),
        }
      : { dHash: '', pHash: '', aHash: '' };

    out.push({
      view,
      signature: {
        embedding,
        dHash: hashes.dHash,
        pHash: hashes.pHash,
        aHash: hashes.aHash,
        structure,
        colorHistogram: buildColorHistogram(rgb, region),
      },
    });
  }

  return out;
}




/** تبدیل کادر ۰..۱ نرمال‌شده به کادر در فضای ۲۵۶×۲۵۶ (برای سازگاری توابع) */
function objToArrayBox(box: NormBox): NormBox {
  return { x: box.x, y: box.y, w: box.w, h: box.h };
}

function buildColorHistogram(rgb: Uint8Array, region: NormBox): number[] {
  const size = ANALYSIS;
  const hist = new Array(64).fill(0);
  const x0 = Math.floor(region.x * size);
  const y0 = Math.floor(region.y * size);
  const x1 = Math.min(size, Math.ceil((region.x + region.w) * size));
  const y1 = Math.min(size, Math.ceil((region.y + region.h) * size));
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * size + x) * 3;
      const r = Math.min(3, rgb[i] >> 6);
      const g = Math.min(3, rgb[i + 1] >> 6);
      const b = Math.min(3, rgb[i + 2] >> 6);
      hist[r * 16 + g * 4 + b]++;
      n++;
    }
  }
  return n ? hist.map(v => v / n) : hist;
}

// ---------------------------------------------------------------------------
// معیارهای فاصله و شباهت
// ---------------------------------------------------------------------------

/** شباهت کسینوسی دو بردار L2-نرمال‌شده (۰..۱) */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

/**
 * شباهت ساختاری/هندسی — سخت‌گیرانه و مستقل از رنگ.
 * برای تأیید EXACT استفاده می‌شود: نسبت ابعاد، پرشدگی، تعداد سوراخ،
 * تعداد اجزا، هیستوگرام جهت لبه و امضای شعاعی.
 */
export function structuralSimilarity(a: StructureSignature, b: StructureSignature): number {
  const ratioSim = (x: number, y: number) => Math.min(x, y) / Math.max(1e-6, Math.max(x, y));

  const aspect = ratioSim(a.aspectRatio, b.aspectRatio);
  const fill = 1 - Math.abs(a.fillRatio - b.fillRatio);

  const holeDiff = Math.abs(a.holeCount - b.holeCount);
  const holes = holeDiff === 0 ? 1 : Math.max(0, 1 - holeDiff / 4);

  const compDiff = Math.abs(a.componentCount - b.componentCount);
  const comps = compDiff === 0 ? 1 : Math.max(0, 1 - compDiff / 6);

  const cos = (x: number[], y: number[]) => {
    let dot = 0;
    let nx = 0;
    let ny = 0;
    for (let i = 0; i < x.length; i++) {
      dot += x[i] * y[i];
      nx += x[i] * x[i];
      ny += y[i] * y[i];
    }
    const d = Math.sqrt(nx) * Math.sqrt(ny);
    return d > 1e-9 ? dot / d : 0;
  };
  const orientation = cos(a.orientation, b.orientation);
  const radial = cos(a.radial, b.radial);
  const density = ratioSim(a.edgeDensity + 1e-6, b.edgeDensity + 1e-6);

  return Math.max(
    0,
    Math.min(
      1,
      0.2 * aspect + 0.14 * fill + 0.18 * holes + 0.12 * comps + 0.16 * orientation + 0.14 * radial + 0.06 * density
    )
  );
}

/** فاصله‌ی ترکیبی هش‌ها (برای تشخیص near-duplicate، مستقل از شبکه‌ی برداری) */
export function hashDistances(a: ImageSignature, b: ImageSignature) {
  return {
    dHash: hammingDistance(a.dHash, b.dHash),
    pHash: hammingDistance(a.pHash, b.pHash),
    aHash: hammingDistance(a.aHash, b.aHash),
  };
}

export { cropToBox, rotate90, flipHorizontal, buildNormalizedGray, buildNormalizedRgb, detectMainObject };
