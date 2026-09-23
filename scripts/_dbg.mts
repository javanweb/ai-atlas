import sharp from 'sharp';
import fs from 'fs';
const sku = process.argv[2] || 'AT-E001';
const idx = JSON.parse(fs.readFileSync('data/visual-search/vector-index.json','utf8'));
const rec = (idx.records||[]).find((r:any)=>r.sku===sku);
if (!rec) { console.log('sku not in index'); process.exit(1); }
console.log('indexed image', rec.imagePath, fs.existsSync(rec.imagePath));
const buf = await sharp(fs.readFileSync(rec.imagePath)).resize(224,224,{fit:'inside'}).jpeg({quality:82}).toBuffer();
const r = await fetch('http://localhost:3000/api/visual-search/debug/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:`data:image/jpeg;base64,${buf.toString('base64')}`, sort:'vector', limit:20})});
const j:any = await r.json();
console.log('resultType', j.resultType, '|', (j.message||'').slice(0,80));
console.log('trace', JSON.stringify(j.trace).slice(0,1000));
const c0 = (j.candidates||[])[0]||{};
console.log('candidate keys:', Object.keys(c0).join(','));
for (const c of (j.candidates||[]).slice(0,8)) {
  const parts = Object.entries(c).filter(([k,v])=>typeof v==='number').map(([k,v])=>k+'='+(v as number).toFixed(4));
  console.log(' ', c.sku, parts.join(' '));
}
