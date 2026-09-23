/**
 * تست مقاومت موتور جستجوی بصری اطلس
 * ---------------------------------------------------------------------------
 * تصاویر کاتالوگ را به‌صورت مصنوعی «مثل عکس واقعی کاربر» تغییر می‌دهد و
 * بررسی می‌کند که سیستم همان محصول را با اطمینان پیدا کند:
 *   • کاهش کیفیت و تغییر سایز (عکس موبایل)
 *   • چرخش ۹۰ درجه
 *   • آینه‌ی افقی
 *   • تغییر نور (روشن‌تر/تیره‌تر)
 *   • قرار گرفتن روی پس‌زمینه‌ی متفاوت + تغییر مقیاس در کادر
 *   • ترکیب همه‌ی موارد
 * و در پایان، تست منفی: تصاویر بی‌ربط نباید به‌عنوان «همان محصول» معرفی شوند.
 *
 * اجرا:  node scripts/visualSearchRobustnessTest.mjs [تعداد محصول]
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const BASE = process.env.ATLAS_URL || 'http://localhost:3000';
const SAMPLE = Number(process.argv[2] || 6);
const IMAGES_DIR = path.join(process.cwd(), 'src', 'assets', 'imagesproducts');
const CATALOG = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'catalogSummary.json'), 'utf8'));

function resolveImage(name) {
  const clean = name.toLowerCase();
  const direct = path.join(IMAGES_DIR, clean);
  if (fs.existsSync(direct)) return direct;
  const m = clean.match(/^e\(?(\d+)\)?\.(png|jpe?g|webp)$/i);
  if (m) {
    const padded = `e(${String(parseInt(m[1], 10)).padStart(3, '0')}).${m[2]}`;
    const p = path.join(IMAGES_DIR, padded);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function search(dataUrl) {
  const res = await fetch(`${BASE}/api/visual-search/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: dataUrl }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const toDataUrl = buf => `data:image/jpeg;base64,${buf.toString('base64')}`;

/** ساخت گونه‌های تصویری مشابه عکس واقعی کاربر */
async function buildVariants(srcPath) {
  const base = await sharp(srcPath).flatten({ background: '#ffffff' }).resize(420, 420, { fit: 'inside' }).png().toBuffer();

  const variants = {};

  variants['موبایل: کیفیت پایین + سایز کوچک'] = await sharp(base)
    .resize(240, 240, { fit: 'inside' })
    .jpeg({ quality: 45 })
    .toBuffer();

  variants['چرخش ۹۰ درجه'] = await sharp(base).rotate(90).jpeg({ quality: 80 }).toBuffer();

  variants['آینه افقی'] = await sharp(base).flop().jpeg({ quality: 80 }).toBuffer();

  variants['نور روشن‌تر'] = await sharp(base)
    .modulate({ brightness: 1.3 })
    .jpeg({ quality: 80 })
    .toBuffer();

  variants['نور تیره‌تر + کنتراست کم'] = await sharp(base)
    .modulate({ brightness: 0.75, saturation: 0.85 })
    .jpeg({ quality: 78 })
    .toBuffer();

  // پس‌زمینه‌ی متفاوت + تغییر مقیاس در کادر (شبیه عکس گرفته‌شده روی میز کار)
  const inner = await sharp(base).resize(190, 190, { fit: 'inside' }).toBuffer();
  variants['پس‌زمینه متفاوت + مقیاس کوچک'] = await sharp({
    create: { width: 480, height: 480, channels: 3, background: { r: 62, g: 78, b: 96 } },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .jpeg({ quality: 80 })
    .toBuffer();

  // حالت سخت: ترکیب پس‌زمینه + چرخش + کیفیت پایین + نور
  const inner2 = await sharp(base).rotate(-25, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(200, 200, { fit: 'inside' }).toBuffer();
  variants['ترکیبی: چرخش + پس‌زمینه + نور'] = await sharp({
    create: { width: 520, height: 520, channels: 3, background: { r: 210, g: 205, b: 190 } },
  })
    .composite([{ input: inner2, gravity: 'center' }])
    .modulate({ brightness: 1.08 })
    .jpeg({ quality: 62 })
    .toBuffer();

  return variants;
}

async function main() {
  console.log(`\n=== تست مقاومت موتور جستجوی بصری اطلس (${BASE}) ===\n`);

  const step = Math.max(1, Math.floor(CATALOG.length / SAMPLE));
  const products = [];
  for (let i = 0; i < CATALOG.length && products.length < SAMPLE; i += step) {
    const item = CATALOG[i];
    const abs = resolveImage(item.image);
    if (abs) products.push({ ...item, abs });
  }

  const stats = {};
  let checked = 0;
  const failures = [];

  for (const product of products) {
    const variants = await buildVariants(product.abs);
    for (const [label, buffer] of Object.entries(variants)) {
      stats[label] = stats[label] || { total: 0, exact: 0, similar: 0, nomatch: 0 };
      try {
        const res = await search(toDataUrl(buffer));
        stats[label].total++;
        checked++;
        if (res.resultType === 'EXACT') {
          stats[label].exact++;
          if (res.exactMatch?.sku !== product.code) {
            failures.push(`${product.code} → ${label}: تطابق دقیق اشتباه با ${res.exactMatch?.sku}`);
          }
        } else if (res.resultType === 'SIMILAR') {
          stats[label].similar++;
          failures.push(`${product.code} → ${label}: به‌جای کالای دقیق، ${res.similarMatches.length} کالای مشابه برگشت`);
        } else {
          stats[label].nomatch++;
          failures.push(`${product.code} → ${label}: نتیجه‌ای پیدا نشد`);
        }
      } catch (e) {
        console.log(`  ⚠️ خطا در ${product.code} / ${label}: ${e.message}`);
      }
    }
  }

  console.log(`\n--- نتیجه بر اساس نوع تغییر تصویر (${checked} آزمون) ---`);
  for (const [label, s] of Object.entries(stats)) {
    const pct = Math.round((s.exact / Math.max(1, s.total)) * 100);
    console.log(
      `  ${label.padEnd(34, ' ')} → تطابق دقیق: ${String(s.exact).padStart(2)}/${s.total} (${pct}%)` +
        (s.similar ? `  مشابه:${s.similar}` : '') +
        (s.nomatch ? `  بی‌نتیجه:${s.nomatch}` : '')
    );
  }

  // ------------------------------ تست منفی ------------------------------
  console.log('\n--- تست منفی: تصاویر بی‌ربط نباید «همان محصول» معرفی شوند ---');
  const negativeVariants = {
    'پس‌زمینه تک‌رنگ': await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 30, g: 30, b: 34 } },
    })
      .jpeg()
      .toBuffer(),
    'شکل هندسی ساده (دایره)': await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 240, g: 240, b: 235 } },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="240" height="240"><circle cx="120" cy="120" r="110" fill="#3b82f6"/></svg>`
          ),
          gravity: 'center',
        },
      ])
      .jpeg()
      .toBuffer(),
    'متن/برچسب': await sharp({
      create: { width: 460, height: 300, channels: 3, background: { r: 250, g: 250, b: 250 } },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="440" height="280"><rect x="10" y="10" width="420" height="260" fill="none" stroke="#111" stroke-width="6"/><text x="40" y="150" font-size="64" fill="#111">ATLAS</text></svg>`
          ),
          gravity: 'center',
        },
      ])
      .jpeg()
      .toBuffer(),
  };

  let falseExact = 0;
  for (const [label, buffer] of Object.entries(negativeVariants)) {
    const res = await search(toDataUrl(buffer));
    const flagged = res.resultType === 'EXACT';
    if (flagged) falseExact++;
    console.log(
      `  ${label.padEnd(26, ' ')} → ${res.resultType}${flagged ? ` ❌ (اشتباه: ${res.exactMatch?.sku})` : ' ✅'}`
    );
  }

  console.log('\n=== خلاصه ===');
  const totalExact = Object.values(stats).reduce((a, s) => a + s.exact, 0);
  console.log(`  نرخ تطابق دقیق در تصاویر تغییریافته: ${totalExact}/${checked}`);
  console.log(`  خطای «معرفی محصول اشتباه به‌عنوان همان قطعه»: ${failures.filter(f => f.includes('تطابق دقیق اشتباه')).length + falseExact}`);
  if (failures.length) {
    console.log('\n  جزئیات آزمون‌های ناموفق:');
    failures.forEach(f => console.log(`   • ${f}`));
  }
  console.log('');
}

main().catch(e => {
  console.error('تست با خطا متوقف شد:', e);
  process.exit(1);
});
