/**
 * کالیبراسیون وزن‌های ترکیب سیگنال‌ها (بردار / ساختار / هش) با داده‌ی واقعی.
 * برای هر ترکیب وزن، «رتبه‌ی محصول درست» در سناریوهای مختلف سنجیده می‌شود.
 *
 * اجرا: node scripts/visualSearchWeightSweep.mjs [تعداد-محصول]
 */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const BASE = process.env.ATLAS_URL || 'http://localhost:3000';
const N = Number(process.argv[2] || 6);
const DIR = path.join(process.cwd(), 'src', 'assets', 'imagesproducts');
const CAT = JSON.parse(fs.readFileSync('src/data/catalogSummary.json', 'utf8'));
const resolve = n => { const c = n.toLowerCase(); let p = path.join(DIR, c); if (fs.existsSync(p)) return p;
  const m = c.match(/^e\(?(\d+)\)?\./); if (m) { p = path.join(DIR, `e(${String(+m[1]).padStart(3,'0')}).png`); if (fs.existsSync(p)) return p; } return null; };

/** کاندیداهای عمیق با «همه‌ی سیگنال‌ها» — مرتب‌شده بر اساس شباهت برداری */
const probe = async buf => {
  const r = await fetch(`${BASE}/api/visual-search/debug/score`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${buf.toString('base64')}`, sort: 'vector', limit: 150 })
  });
  return r.json();
};

async function deskBackground(w = 640, h = 640) {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>${Array.from({length: 26}, (_, i) => `<rect x="0" y="${i*25}" width="${w}" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}</svg>`;
  return sharp(Buffer.from(svg)).blur(0.6).jpeg({ quality: 82 }).toBuffer();
}
async function realPhoto(file) {
  const part = await sharp(file).flatten({ background: '#ffffff' }).resize(300, 300, { fit: 'inside' })
    .rotate(-18, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const desk = await deskBackground();
  const sh = await sharp(part).blur(6).modulate({ brightness: 0.35 }).png().toBuffer();
  const junk = Buffer.from('<svg width="90" height="90" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="90" rx="12" fill="#3d4b5c"/><circle cx="45" cy="45" r="22" fill="#9aa7b5"/></svg>');
  return sharp(desk).composite([
    { input: sh, left: 235, top: 250, blend: 'multiply' },
    { input: part, left: 220, top: 235 },
    { input: junk, left: 30, top: 40 }, { input: junk, left: 520, top: 540 },
  ]).modulate({ brightness: 0.94, saturation: 1.05 }).jpeg({ quality: 66 }).toBuffer();
}
const base = async file => sharp(file).flatten({ background: '#ffffff' }).resize(420, 420, { fit: 'inside' }).toBuffer();

const step = Math.max(1, Math.floor(CAT.length / N));
const samples = [];
for (let i = 0; i < CAT.length && samples.length < N; i += step) { const f = resolve(CAT[i].image); if (f) samples.push({ sku: CAT[i].code, file: f }); }

const cases = [];   // { label, sku, candidates }
for (const s of samples) {
  const scenarios = {
    'کاتالوگ':      await sharp(await base(s.file)).jpeg({ quality: 90 }).toBuffer(),
    'پس‌زمینه':     await sharp({ create: { width: 480, height: 480, channels: 3, background: { r: 62, g: 78, b: 96 } } }).composite([{ input: await sharp(await base(s.file)).resize(190, 190, { fit: 'inside' }).toBuffer(), gravity: 'center' }]).jpeg({ quality: 80 }).toBuffer(),
    'چرخش+پس‌زمینه': await sharp({ create: { width: 520, height: 520, channels: 3, background: { r: 210, g: 205, b: 190 } } }).composite([{ input: await sharp(await base(s.file)).rotate(-25, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(200, 200, { fit: 'inside' }).toBuffer(), gravity: 'center' }]).jpeg({ quality: 62 }).toBuffer(),
    'عکس واقعی':    await realPhoto(s.file),
  };
  for (const [label, buf] of Object.entries(scenarios)) {
    const r = await probe(buf);
    cases.push({ label, sku: s.sku, candidates: r.candidates || [], resultType: r.resultType });
  }
}

const COMBOS = [
  [0.32, 0.34, 0.34], [0.5, 0.25, 0.25], [0.6, 0.2, 0.2], [0.7, 0.15, 0.15],
  [0.8, 0.1, 0.1], [0.9, 0.05, 0.05], [1, 0, 0], [0.75, 0.1, 0.15], [0.65, 0.15, 0.2],
];
console.log('وزن (بردار/ساختار/هش)   ' + [...new Set(cases.map(c => c.label))].map(l => l.padEnd(12)).join('') + '  میانگین رتبه');
for (const [v, s, h] of COMBOS) {
  const perLabel = {};
  let rankSum = 0, n = 0;
  for (const c of cases) {
    const scored = [...c.candidates].map(x => ({ sku: x.sku, score: v * x.vectorScore + s * x.structureScore + h * x.hashSimilarity }))
      .sort((a, b) => b.score - a.score);
    const rank = scored.findIndex(x => x.sku === c.sku) + 1;
    const r = rank === 0 ? 150 : rank;
    perLabel[c.label] = (perLabel[c.label] || { sum: 0, cnt: 0 });
    perLabel[c.label].sum += r; perLabel[c.label].cnt++;
    rankSum += r; n++;
  }
  const cells = [...new Set(cases.map(c => c.label))].map(l => (perLabel[l].sum / perLabel[l].cnt).toFixed(1).padEnd(12)).join('');
  console.log(`${[v, s, h].join('/').padEnd(22)} ${cells}  ${(rankSum / n).toFixed(1)}`);
}
console.log('\n(عدد کمتر = بهتر؛ ۱۵۰ یعنی محصول درست در ۱۵۰ کاندیدای اول هم نبود)');
