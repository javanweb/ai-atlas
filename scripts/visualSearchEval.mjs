/**
 * ارزیابی موتور جستجوی بصری: کیفیت «بازیابی» (Retrieval) و تصمیم نهایی.
 * KPI اصلی: آیا محصول درست در فهرست کاندیداها قرار می‌گیرد؟ (recall@K)
 * چون تصمیم نهایی EXACT/SIMILAR/NO_MATCH توسط مرحله‌ی Re-ranking گرفته می‌شود.
 *
 * اجرا:  node scripts/visualSearchEval.mjs [تعداد-محصول] [نقش-نما]
 */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const BASE = process.env.ATLAS_BASE || 'http://localhost:3000';
const IMAGES_DIR = path.join(process.cwd(), 'src', 'assets', 'imagesproducts');
const CATALOG = JSON.parse(fs.readFileSync('src/data/catalogSummary.json', 'utf8'));
const N = Number(process.argv[2] || 10);

function resolve(name) {
  const c = name.toLowerCase(); const d = path.join(IMAGES_DIR, c);
  if (fs.existsSync(d)) return d;
  const m = c.match(/^e\(?(\d+)\)?\./);
  if (m) { const p = path.join(IMAGES_DIR, `e(${String(+m[1]).padStart(3, '0')}).png`); if (fs.existsSync(p)) return p; }
  return null;
}
const durl = b => `data:image/jpeg;base64,${b.toString('base64')}`;
async function score(buf) {
  const r = await fetch(`${BASE}/api/visual-search/debug/score`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: durl(buf) })
  });
  return r.json();
}
const base = p => sharp(p).resize(420, 420, { fit: 'inside' }).toBuffer();
const variants = async b => ({
  'exact':     await sharp(b).flatten({background:'#ffffff'}).jpeg({ quality: 92 }).toBuffer(),
  'rot90':     await sharp(b).flatten({background:'#ffffff'}).rotate(90).jpeg({ quality: 80 }).toBuffer(),
  'flip':      await sharp(b).flatten({background:'#ffffff'}).flop().jpeg({ quality: 80 }).toBuffer(),
  'bg-pad':    await sharp({ create: { width: 480, height: 480, channels: 3, background: { r: 62, g: 78, b: 96 } } })
                 .composite([{ input: await sharp(b).flatten({background:'#ffffff'}).resize(190, 190, { fit: 'inside' }).toBuffer(), gravity: 'center' }]).jpeg({ quality: 80 }).toBuffer(),
  'lowq':      await sharp(b).flatten({background:'#ffffff'}).resize(240, 240, { fit: 'inside' }).jpeg({ quality: 45 }).toBuffer(),
  'bright':    await sharp(b).flatten({background:'#ffffff'}).modulate({ brightness: 1.3 }).jpeg({ quality: 80 }).toBuffer(),
  'rot25-bg':  await sharp({ create: { width: 520, height: 520, channels: 3, background: { r: 210, g: 205, b: 190 } } })
                 .composite([{ input: await sharp(b).flatten({background:'#ffffff'}).rotate(-25, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(200, 200, { fit: 'inside' }).toBuffer(), gravity: 'center' }]).jpeg({ quality: 62 }).toBuffer(),
  'dark':      await sharp(b).flatten({background:'#ffffff'}).modulate({ brightness: 0.72 }).jpeg({ quality: 80 }).toBuffer(),
  'tiny':      await sharp(b).flatten({background:'#ffffff'}).resize(120, 120, { fit: 'inside' }).jpeg({ quality: 60 }).toBuffer(),
});

const rows = [];
const step = Math.max(1, Math.floor(CATALOG.length / N));
for (let i = 0; i < CATALOG.length && rows.length < N * 9; i += step) {
  const item = CATALOG[i]; const abs = resolve(item.image); if (!abs) continue;
  const b = await base(abs);
  for (const [label, v] of Object.entries(await variants(b))) {
    const r = await score(v);
    const cands = r.candidates || [];
    const rank = cands.findIndex(c => c.sku === item.code) + 1;
    rows.push({ sku: item.code, label, type: r.resultType, top1: rank === 1, rank: rank || 999, exactCorrect: r.resultType === 'EXACT' && rank === 1, exactWrong: r.resultType === 'EXACT' && rank !== 1 });
  }
}
const agg = {};
for (const r of rows) {
  const a = agg[r.label] || (agg[r.label] = { n: 0, top1: 0, r3: 0, r6: 0, ex: 0, exWrong: 0, ranks: [] });
  a.n++; if (r.top1) a.top1++; if (r.rank <= 3) a.r3++; if (r.rank <= 6) a.r6++;
  if (r.exactCorrect) a.ex++; if (r.exactWrong) a.exWrong++; a.ranks.push(r.rank);
}
console.log('variant        n   top1   rank<=3  rank<=6   EXACT(correct)  EXACT(wrong)');
for (const [l, a] of Object.entries(agg))
  console.log(`${l.padEnd(12)} ${String(a.n).padStart(3)}   ${String(a.top1).padStart(2)}/${a.n}   ${String(a.r3).padStart(2)}/${a.n}     ${String(a.r6).padStart(2)}/${a.n}      ${String(a.ex).padStart(2)}/${a.n}          ${a.exWrong}`);
const misses = rows.filter(r => r.rank > 6);
if (misses.length) console.log('\nrecall misses:', misses.map(m => `${m.label} ${m.sku} rank=${m.rank} type=${m.type}`).slice(0, 12));
