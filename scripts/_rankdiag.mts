/**
 * تحلیل رتبه‌ی واقعی: بردارهای کاتالوگ (Jina) را از دیسک می‌خوانیم و
 * رتبه‌ی محصول درست را برای «نمای جسم» و «نمای تصویر کامل» می‌سنجیم.
 */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
import { normalizeForAnalysis, cropToBox } from '../server/visualSearch/imagePreprocess';

const KEY = fs.readFileSync('/tmp/.jkey','utf8').trim();
const DIR='src/assets/imagesproducts';
const CAT=JSON.parse(fs.readFileSync('src/data/catalogSummary.json','utf8'));
const IDX=JSON.parse(fs.readFileSync('data/visual-search/vector-index.json','utf8'));
const resolve=(n:string)=>{const c=n.toLowerCase();let p=path.join(DIR,c); if(fs.existsSync(p))return p;
  const m=c.match(/^e\(?(\d+)\)?\./); if(m){p=path.join(DIR,`e(${String(+m[1]).padStart(3,'0')}).png`); if(fs.existsSync(p))return p;} return null;};

function decode(b64:string, dim:number){
  const buf=Buffer.from(b64,'base64');
  const src=new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength/4));
  return Float32Array.from(src.slice(0, dim));
}
const catalog: {sku:string; vec:Float32Array}[] = IDX.records.map((r:any)=>({sku:r.sku, vec:decode(r.vector, r.dim)}));
const norm=(v:Float32Array)=>{let n=0;for(const x of v)n+=x*x;n=Math.sqrt(n)||1;const o=new Float32Array(v.length);for(let i=0;i<v.length;i++)o[i]=v[i]/n;return o;};
const dot=(a:Float32Array,b:Float32Array)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;};
const catN = catalog.map(c=>({sku:c.sku, vec:norm(c.vec)}));

async function jina(buffers:Buffer[]){
  const body={model:'jina-clip-v1', input: buffers.map(b=>({image:`data:image/jpeg;base64,${b.toString('base64')}`}))};
  const r=await fetch('https://api.jina.ai/v1/embeddings',{method:'POST',headers:{Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0,150)}`);
  const j=await r.json();
  return j.data.sort((a:any,b:any)=>a.index-b.index).map((d:any)=>norm(new Float32Array(d.embedding)));
}
const small=(b:Buffer)=>sharp(b).flatten({background:'#ffffff'}).resize(224,224,{fit:'inside'}).jpeg({quality:88}).toBuffer();

async function deskBg(w=640,h=640){
  const svg=`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${Array.from({length:26},(_,i)=>`<rect x="0" y="${i*25}" width="${w}" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}</svg>`;
  return sharp(Buffer.from(svg)).blur(0.6).jpeg({quality:82}).toBuffer();
}
async function realPhoto(file:string){
  const part=await sharp(file).flatten({background:'#ffffff'}).resize(300,300,{fit:'inside'}).rotate(-18,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const desk=await deskBg();
  const sh=await sharp(part).blur(6).modulate({brightness:0.35}).png().toBuffer();
  const junk=Buffer.from('<svg width="90" height="90" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="90" rx="12" fill="#3d4b5c"/><circle cx="45" cy="45" r="22" fill="#9aa7b5"/></svg>');
  return sharp(desk).composite([
    {input:sh,left:235,top:250,blend:'multiply'},{input:part,left:220,top:235},
    {input:junk,left:30,top:40},{input:junk,left:520,top:540},
  ]).modulate({brightness:0.94,saturation:1.05}).jpeg({quality:66}).toBuffer();
}

async function main(){
  const N=8, step=Math.floor(CAT.length/N);
  const picks:{sku:string;file:string}[]=[];
  for(let i=0;i<CAT.length && picks.length<N;i+=step){const f=resolve(CAT[i].image); if(f)picks.push({sku:CAT[i].code,file:f});}

  const rows:{label:string;sku:string;rankObj:number;rankFull:number;rankBest:number;simObj:number;simFull:number;top:string}[]=[];
  for(const p of picks){
    const photo=await realPhoto(p.file);
    const normImg=await normalizeForAnalysis(photo);
    const box=normImg.objectIsolated?normImg.objectBox:{x:0.08,y:0.08,w:0.84,h:0.84};
    const objJpeg=await small(await cropToBox(normImg.buffer, box, 0.14));
    const fullJpeg=await small(photo);
    const [vo,vf]=await jina([objJpeg, fullJpeg]);
    const rankOf=(v:Float32Array)=>{const scored=catN.map(c=>({sku:c.sku,sim:dot(v,c.vec)})).sort((a,b)=>b.sim-a.sim);
      const r=scored.findIndex(s=>s.sku===p.sku); return {rank:(r<0?999:r+1), sim:scored.find(s=>s.sku===p.sku)?.sim||0, top:scored[0]};};
    const ro=rankOf(vo), rf=rankOf(vf);
    // بهترینِ دو نما: رتبه‌ای که با «بیشترین شباهت» حاصل می‌شود
    const merged=catN.map(c=>({sku:c.sku,sim:Math.max(dot(vo,c.vec),dot(vf,c.vec))})).sort((a,b)=>b.sim-a.sim);
    const mr=merged.findIndex(s=>s.sku===p.sku);
    rows.push({label:'عکس واقعی',sku:p.sku,rankObj:ro.rank,rankFull:rf.rank,rankBest:(mr<0?999:mr+1),simObj:ro.sim,simFull:rf.sim,top:`${merged[0].sku}`});
    console.log(`${p.sku}: نمای‌جسم=${ro.rank} (sim ${ro.sim.toFixed(3)}) | تصویرکامل=${rf.rank} (sim ${rf.sim.toFixed(3)}) | بهترین‌دو= ${(mr<0?999:mr+1)} | بالاترین=${merged[0].sku} (${merged[0].sim.toFixed(3)})`);
  }
  const avg=(f:(r:any)=>number)=> (rows.reduce((s,r)=>s+f(r),0)/rows.length).toFixed(1);
  console.log(`\nمیانگین رتبه → نمای‌جسم: ${avg(r=>r.rankObj)} | تصویرکامل: ${avg(r=>r.rankFull)} | بهترین دو: ${avg(r=>r.rankBest)}`);
}
main().catch(e=>{console.error('ERR', e.message); process.exit(1);});
