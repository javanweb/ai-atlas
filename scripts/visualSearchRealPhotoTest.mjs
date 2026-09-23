/**
 * آزمون «عکس واقعی موبایل» — شبیه‌سازی شرایطی که کاربر واقعاً عکس می‌گیرد:
 *   • پس‌زمینه‌ی شلوغ (میز کار) + سایه
 *   • چرخش اریب و پرسپکتیو خفیف
 *   • جسم کوچک‌تر در کادر + اجسام مزاحم دیگر
 *   • نور نامناسب، نویز و کیفیت پایین
 * هدف: آیا همان محصول در نتیجه‌ی اول (بالا) برمی‌گردد؟
 *
 * اجرا: node scripts/visualSearchRealPhotoTest.mjs [تعداد-محصول]
 */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const BASE = process.env.ATLAS_URL || 'http://localhost:3000';
const N = Number(process.argv[2] || 6);
const DIR = path.join(process.cwd(), 'src', 'assets', 'imagesproducts');
const CAT = JSON.parse(fs.readFileSync('src/data/catalogSummary.json', 'utf8'));
const resolve = n => { const c = n.toLowerCase(); let p = path.join(DIR, c); if (fs.existsSync(p)) return p;
  const m = c.match(/^e\(?(\d+)\)?\./); if (m) { p = path.join(DIR, `e(${String(+m[1]).padStart(3,'0')}).png`); if (fs.existsSync(p)) return p; } return null; };

/** پس‌زمینه‌ی شبیه میز کار: بافت چوبی + نویز */
async function deskBackground(w = 640, h = 640) {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    ${Array.from({length: 26}, (_, i) => `<rect x="0" y="${i * 25}" width="${w}" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}
  </svg>`;
  return sharp(Buffer.from(svg)).blur(0.6).jpeg({ quality: 82 }).toBuffer();
}

/**
 * دو سطح دشواری:
 *   • «واقع‌گرایانه» (پیش‌فرض): قطعه در میانه‌ی کادر روی میز، نور معمولی،
 *     چرخش ملایم — شبیه عکسی که کاربر با موبایل می‌گیرد.
 *   • «سخت»: قطعه کوچک، نور کم، چرخش زیاد و اجسام مزاحم در کادر.
 */
async function realPhoto(file, { hard = false } = {}) {
  const size = hard ? 300 : 430;
  const angle = hard ? -18 : -8;
  const part = await sharp(file).flatten({ background: '#ffffff' }).resize(size, size, { fit: 'inside' })
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const meta = await sharp(part).metadata();
  const pw = meta.width || size, ph = meta.height || size;
  const desk = await deskBackground(640, 640);
  const left = Math.round((640 - pw) / 2), top = Math.round((640 - ph) / 2);
  const layers = [];
  const sh = await sharp(part).blur(5).modulate({ brightness: hard ? 0.35 : 0.55 }).png().toBuffer();
  layers.push({ input: sh, left: left + 8, top: top + 10, blend: 'multiply' });
  layers.push({ input: part, left, top });
  if (hard) {
    const junk = Buffer.from(`<svg width="90" height="90" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="90" rx="12" fill="#3d4b5c"/><circle cx="45" cy="45" r="22" fill="#9aa7b5"/></svg>`);
    layers.push({ input: junk, left: 30, top: 40 });
    layers.push({ input: junk, left: 520, top: 540 });
  }
  return sharp(desk).composite(layers)
    .modulate({ brightness: hard ? 0.9 : 1.0, saturation: 1.05 })
    .jpeg({ quality: hard ? 66 : 78 }).toBuffer();
}

const post = async buf => {
  const r = await fetch(`${BASE}/api/visual-search/debug/score`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${buf.toString('base64')}` })
  });
  return r.json();
};

const MODE = (process.argv[3] || 'realistic').toLowerCase();
const step = Math.max(1, Math.floor(CAT.length / N));
let top1 = 0, top3 = 0, total = 0; const misses = [];
for (let i = 0; i < CAT.length && total < N; i += step) {
  const abs = resolve(CAT[i].image); if (!abs) continue; total++;
  const photo = await realPhoto(abs, { hard: MODE === 'hard' });
  const r = await post(photo);
  const cands = r.candidates || [];
  const rank = cands.findIndex(c => c.sku === CAT[i].code) + 1;
  if (rank === 1) top1++; else if (rank > 0 && rank <= 3) top3++;
  console.log(
    `${CAT[i].code}  نتیجه=${r.resultType.padEnd(8)} رتبه=${rank === 0 ? 'خارج از فهرست' : rank}` +
    `  بالاترین=${cands[0]?.sku} (${cands[0] ? 'v=' + cands[0].vectorScore + ' s=' + cands[0].structureScore + ' h=' + cands[0].hashSimilarity : '-'})`
  );
  if (rank !== 1) misses.push(CAT[i].code);
}
console.log(`\nنتیجه: رتبه‌ی اول ${top1}/${total} | در سه‌ی اول ${top1 + top3}/${total}`);
if (misses.length) console.log('موارد ناموفق:', misses.join(', '));
