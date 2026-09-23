/**
 * Atlas Visual Product Search — Catalog Layer
 * ---------------------------------------------------------------------------
 * ساخت «دفتر محصولات» و «دفتر تصاویر محصول» از داده‌های سایت.
 *
 * نکته‌ی کلیدی طبق نقشه راه (§۵): هر محصول می‌تواند چندین تصویر داشته باشد
 * (اصلی، زاویه دوم، نمای نزدیک، کاتالوگ) و برای «همه‌ی» آن‌ها بردار بصری
 * ساخته می‌شود؛ همه‌ی بردارها به همان Product ID متصل می‌شوند.
 *
 * منابع تصویر هر محصول:
 *   ۱. تصویر کاتالوگ موجود در catalogSummary.json  (image_type = catalog)
 *   ۲. تصاویر اضافی ثبت‌شده در مانیفست ادمین         (gallery / closeup / main)
 * مانیفست در data/visual-search/image-manifest.json نگهداری می‌شود.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ImageType, ProductImageRecord, ProductRecord } from './types';

export const CATALOG_SUMMARY_PATH = path.join(process.cwd(), 'src', 'data', 'catalogSummary.json');
export const CATALOG_IMAGES_DIR = path.join(process.cwd(), 'src', 'assets', 'imagesproducts');
export const RUNTIME_DIR = path.join(process.cwd(), 'data', 'visual-search');
export const IMAGE_MANIFEST_PATH = path.join(RUNTIME_DIR, 'image-manifest.json');

/** ساختار آیتم خام کاتالوگ (همان ساختار catalogSummary.json) */
interface RawCatalogItem {
  code: string;
  forzaCode?: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  subcategory: string;
  page?: number;
  image: string;
  specs?: { key: string; value: string }[];
  price?: number;
  stock?: number;
}

/** مانیفست تصاویر اضافی: sku → آرایه‌ی مسیرهای تصویر */
type ImageManifest = Record<string, { path: string; imageType: ImageType }[]>;

function ensureRuntimeDir(): void {
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

export function hashFileContent(absPath: string): string {
  try {
    const buf = fs.readFileSync(absPath);
    return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  } catch {
    return '';
  }
}

/** نگاشت نام فایل تصویر → نام واقعی روی دیسک (تفاوت صفرپیشوندی e(1).png / e(001).png) */
function buildAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    for (const f of fs.readdirSync(CATALOG_IMAGES_DIR)) {
      const lower = f.toLowerCase();
      map.set(lower, f);
      const m = lower.match(/^e\(?(\d+)\)?\.(png|jpe?g|webp)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        for (const pad of [2, 3]) {
          const variant = `e(${String(num).padStart(pad, '0')}).${m[2]}`;
          if (!map.has(variant)) map.set(variant, f);
        }
        const bare = `e${num}.${m[2]}`;
        if (!map.has(bare)) map.set(bare, f);
      }
    }
  } catch {
    /* best effort */
  }
  return map;
}

let aliasMap: Map<string, string> | null = null;

/** تبدیل نام تصویر کاتالوگ به مسیر مطلق روی دیسک (فقط برای خواندن فایل، نه برای تطبیق) */
export function resolveImagePath(imageName: string): string | null {
  const clean = (imageName || '').trim().replace(/^\.?\//, '').toLowerCase();
  if (!clean) return null;
  if (!aliasMap) aliasMap = buildAliasMap();
  const direct = path.join(CATALOG_IMAGES_DIR, clean);
  if (fs.existsSync(direct)) return direct;
  const aliased = aliasMap.get(clean);
  if (aliased) {
    const p = path.join(CATALOG_IMAGES_DIR, aliased);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function toPublicImageUrl(imageName: string): string {
  const clean = (imageName || '').trim().replace(/^\.?\//, '');
  return `/src/assets/imagesproducts/${encodeURIComponent(clean)}`;
}

function loadManifest(): ImageManifest {
  try {
    if (fs.existsSync(IMAGE_MANIFEST_PATH)) {
      const data = JSON.parse(fs.readFileSync(IMAGE_MANIFEST_PATH, 'utf8'));
      if (data && typeof data === 'object') return data as ImageManifest;
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function saveManifest(manifest: ImageManifest): void {
  ensureRuntimeDir();
  fs.writeFileSync(IMAGE_MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/** ثبت یک تصویر اضافی (زاویه دوم/نمای نزدیک) برای یک محصول */
export function addImageToManifest(sku: string, absPath: string, imageType: ImageType = 'gallery'): void {
  const manifest = loadManifest();
  const list = manifest[sku] || [];
  if (!list.some(x => x.path === absPath)) {
    list.push({ path: absPath, imageType });
    manifest[sku] = list;
    saveManifest(manifest);
  }
}

function brandFor(item: RawCatalogItem): string {
  const n = item.name.toLowerCase();
  if (n.includes('swr') || n.includes('اس دبلیو آر')) return 'اس دبلیو آر (SWR آلمان)';
  if (n.includes('forza') || n.includes('فورزا')) return 'فورزا (FORZA اسپانیا)';
  return 'بازرگانی اطلس (ATLAS)';
}

function skuFromCode(code: string): string {
  return code.startsWith('AT-') ? code : `AT-${code}`;
}

let cachedProducts: ProductRecord[] | null = null;
let cachedAt = 0;

/**
 * بارگذاری کامل «دفتر محصولات» سایت.
 * این تابع هر ۳۰ ثانیه بازخوانی می‌شود تا تغییرات کاتالوگ (محصول جدید/حذف)
 * به‌صورت خودکار در ایندکس دیده شود.
 */
export function loadProductRecords(force = false): ProductRecord[] {
  const now = Date.now();
  if (!force && cachedProducts && now - cachedAt < 30_000) return cachedProducts;

  let raw: RawCatalogItem[] = [];
  try {
    raw = JSON.parse(fs.readFileSync(CATALOG_SUMMARY_PATH, 'utf8'));
  } catch (e: any) {
    console.error('[VisualSearch] catalogSummary.json read failed:', e?.message);
  }

  const manifest = loadManifest();
  const products: ProductRecord[] = raw.map(item => {
    const sku = skuFromCode(item.code);
    const images: ProductImageRecord[] = [];

    const abs = resolveImagePath(item.image);
    if (abs) {
      images.push({
        id: `${sku}::catalog`,
        productId: sku,
        imagePath: abs,
        imageUrl: toPublicImageUrl(item.image),
        imageType: 'catalog',
        contentHash: hashFileContent(abs),
        createdAt: new Date(0).toISOString(),
      });
    }

    for (const [i, extra] of (manifest[sku] || []).entries()) {
      if (!fs.existsSync(extra.path)) continue;
      images.push({
        id: `${sku}::extra${i}`,
        productId: sku,
        imagePath: extra.path,
        imageUrl: `/api/visual-search/image?sku=${encodeURIComponent(sku)}&i=${i}`,
        imageType: extra.imageType,
        contentHash: hashFileContent(extra.path),
        createdAt: new Date().toISOString(),
      });
    }

    const mainName = item.image;
    return {
      id: sku,
      sku,
      name: item.name,
      brand: brandFor(item),
      categorySlug: item.categorySlug,
      categoryName: item.categoryName,
      subcategory: item.subcategory,
      description: (item.specs || []).map(s => `${s.key}: ${s.value}`).join(' | '),
      productUrl: `/product/${encodeURIComponent(sku)}`,
      mainImage: mainName,
      mainImageUrl: toPublicImageUrl(mainName),
      images,
      stock: item.stock ?? 0,
      price: item.price ?? 0,
      customOrderAvailable: true,
      inquiryOnly: (item.price ?? 0) <= 0,
      cataloguePage: item.page,
      forzaCode: item.forzaCode,
      specs: item.specs,
    };
  });

  cachedProducts = products;
  cachedAt = now;
  return products;
}

export function getProductById(id: string): ProductRecord | undefined {
  const target = id.trim().toLowerCase();
  return loadProductRecords().find(
    p => p.id.toLowerCase() === target || p.sku.toLowerCase() === target
  );
}

export function productCount(): number {
  return loadProductRecords().length;
}

export function totalImageCount(): number {
  return loadProductRecords().reduce((sum, p) => sum + p.images.length, 0);
}

export function ensureRuntimePaths(): void {
  ensureRuntimeDir();
}
