/** آیا افزودن «نمای کامل» به ایندکس، محصولات جاافتاده در عکس واقعی را نجات می‌دهد؟ */
import 'dotenv/config';
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
import { normalizeForAnalysis, cropToBox } from '../server/visualSearch/imagePreprocess';
const BASE='http://localhost:3000';
const DIR=path.join(process.cwd(),'src','assets','imagesproducts');
const KEY=(process.env.JINA_API_KEY||'').trim();
const MODEL=process.env.JINA_MODEL||'jina-clip-v1';
const resolve=(name:string)=>{const c=name.toLowerCase();const m=c.match(/^e\(?(\d+)\)?\./);if(m){const p=path.join(DIR,`e(${String(+m[1]).padStart(3,'0')}).png`);if(fs.existsSync(p))return p;}return null;};
async function desk(w=640,h=640){const svg=`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${Array.from({length:26},(_,i)=>`<rect x="0" y="${i*25}" width="${w}" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}</svg>`;return sharp(Buffer.from(svg)).blur(0.6).jpeg({quality:82}).toBuffer();}
async function scene(file:string){const size=430;const part=await sharp(file).flatten({background:'#ffffff'}).resize(size,size,{fit:'inside'}).rotate(-8,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();const meta=await sharp(part).metadata();const pw=meta.width||size,ph=meta.height||size;const d=await desk();const left=Math.round((640-pw)/2),top=Math.round((640-ph)/2);const sh=await sharp(part).blur(5).modulate({brightness:0.55}).png().toBuffer();return sharp(d).composite([{input:sh,left:left+8,top:top+10,blend:'multiply'},{input:part,left,top}]).modulate({brightness:1.0,saturation:1.05}).jpeg({quality:78}).toBuffer();}
async function to224(buf:Buffer){return sharp(buf).flatten({background:'#ffffff'}).resize(224,224,{fit:'inside'}).jpeg({quality:82}).toBuffer();}
async function embed(imgs:Buffer[]):Promise<Float32Array[]>{
  const r=await fetch('https://api.jina.ai/v1/embeddings',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},body:JSON.stringify({model:MODEL,input:imgs.map(b=>({image:`data:image/jpeg;base64,${b.toString('base64')}`})),dimensions:768})});
  const j:any=await r.json(); if(!j.data) throw new Error(JSON.stringify(j).slice(0,200));
  return j.data.map((d:any)=>Float32Array.from(d.embedding));
}
const cos=(a:Float32Array,b:Float32Array)=>{let s=0,na=0,nb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return s/Math.sqrt(na*nb);};
const targets=process.argv.slice(2).length?process.argv.slice(2):['AT-E217','AT-E757','AT-E649'];
for(const sku of targets){
  const idx=JSON.parse(fs.readFileSync('data/visual-search/vector-index.json','utf8'));
  const rec=(idx.records as any[]).find(r=>r.sku===sku); if(!rec){console.log('no rec',sku);continue;}
  const catBuf=fs.readFileSync(rec.imagePath);
  const scn=await scene(rec.imagePath);
  const r=await fetch(`${BASE}/api/visual-search/debug/score`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:`data:image/jpeg;base64,${scn.toString('base64')}`,sort:'vector',limit:8})});
  const j:any=await r.json(); const conf=(j.candidates||[]).map((c:any)=>c.sku).filter((s:string)=>s!==sku);
  const skus=[sku,...conf.slice(0,6)];
  // query vectors
  const qNorm=await normalizeForAnalysis(scn); const qObj=qNorm.objectIsolated?await cropToBox(qNorm.buffer,qNorm.objectBox):qNorm.buffer;
  const [qFullVec,qObjVec]=await embed([await to224(qNorm.buffer),await to224(qObj)]);
  // catalog vectors (object crop, same as provider)
  const catNorm=await normalizeForAnalysis(catBuf); const cObj=catNorm.objectIsolated?await cropToBox(catNorm.buffer,catNorm.objectBox):catNorm.buffer;
  const catFullVecs=await embed(skus.map(s=>{const rr=(idx.records as any[]).find(x=>x.sku===s);return null as any;}).map(()=>Buffer.alloc(0)).length?await Promise.all(skus.map(async s=>to224(fs.readFileSync((idx.records as any[]).find(x=>x.sku===s).imagePath)))):[]);
  const catObjVecs=await embed(await Promise.all(skus.map(async s=>{const rr=(idx.records as any[]).find(x=>x.sku===s);const n=await normalizeForAnalysis(fs.readFileSync(rr.imagePath));const o=n.objectIsolated?await cropToBox(n.buffer,n.objectBox):n.buffer;return to224(o);})));
  const tFull=await to224(catNorm.buffer); // target full (recompute inside list)
  console.log(`\n=== ${sku} ===`);
  const show=(label:string,q:Float32Array,list:Float32Array[])=>{const sims=list.map((v,i)=>({s:skus[i],sim:cos(q,v)}));sims.sort((a,b)=>b.sim-a.sim);const t=sims.findIndex(x=>x.s===sku);console.log(`  ${label}: هدف=${sims[t].sim.toFixed(4)} رتبه=${t+1} | بهترین مزاحم=${sims.filter(x=>x.s!==sku)[0].s}@${sims.filter(x=>x.s!==sku)[0].sim.toFixed(4)}`);};
  show('scene-full → cat-object ',qFullVec,catObjVecs);
  show('scene-object→ cat-object ',qObjVec,catObjVecs);
  show('scene-full → cat-full   ',qFullVec,catFullVecs);
  show('scene-object→ cat-full  ',qObjVec,catFullVecs);
  show('best-of-4 (max per sku)',qFullVec,catObjVecs.map((v,i)=>cos(qObjVec,catObjVecs[i])>cos(qFullVec,v)?Float32Array.from({length:768},(_,k)=>qObjVec[k]):v));
}
