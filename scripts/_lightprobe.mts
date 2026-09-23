import 'dotenv/config';
import fs from 'fs'; import sharp from 'sharp';
import { normalizeForAnalysis } from '../server/visualSearch/imagePreprocess';
const idx=JSON.parse(fs.readFileSync('data/visual-search/vector-index.json','utf8'));
const KEY=(process.env.JINA_API_KEY||'').trim(); const MODEL=process.env.JINA_MODEL||'jina-clip-v1';
async function embed(imgs:Buffer[]):Promise<Float32Array[]>{
  const r=await fetch('https://api.jina.ai/v1/embeddings',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},body:JSON.stringify({model:MODEL,input:imgs.map(b=>({image:`data:image/jpeg;base64,${b.toString('base64')}`})),dimensions:768})});
  const j:any=await r.json(); if(!j.data){throw new Error(JSON.stringify(j).slice(0,200));}
  return j.data.map((d:any)=>Float32Array.from(d.embedding as number[]));
}
const cos=(a:Float32Array,b:Float32Array)=>{if(!a||!b||a.length!==b.length)return NaN;let s=0,na=0,nb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return s/Math.sqrt(na*nb);};
const light=(b:Buffer)=>sharp(b).rotate().flatten({background:'#ffffff'}).resize(224,224,{fit:'inside',withoutEnlargement:true}).jpeg({quality:88}).toBuffer();
async function desk(w=640,h=640){const svg=`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${Array.from({length:26},(_,i)=>`<rect x="0" y="${i*25}" width="${w}" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}</svg>`;return sharp(Buffer.from(svg)).blur(0.6).jpeg({quality:82}).toBuffer();}
async function scene(file:string){const size=430;const part=await sharp(file).flatten({background:'#ffffff'}).resize(size,size,{fit:'inside'}).rotate(-8,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();const meta=await sharp(part).metadata();const pw=meta.width||size,ph=meta.height||size;const d=await desk();const left=Math.round((640-pw)/2),top=Math.round((640-ph)/2);const sh=await sharp(part).blur(5).modulate({brightness:0.55}).png().toBuffer();return sharp(d).composite([{input:sh,left:left+8,top:top+10,blend:'multiply'},{input:part,left,top}]).modulate({brightness:1.0,saturation:1.05}).jpeg({quality:78}).toBuffer();}
const pathOf=(sku:string)=>((idx.records as any[]).find(r=>r.sku===sku)||{}).imagePath as string;
const targets=process.argv.slice(2);
for(const sku of targets){
  const scn=await scene(pathOf(sku));
  const qLight=(await embed([await light(scn)]))[0];
  const qNorm=(await embed([await light((await normalizeForAnalysis(scn)).buffer)]))[0];
  const qNormBig=(await embed([await light((await normalizeForAnalysis(scn)).buffer)]))[0];
  const others=targets.filter(s=>s!==sku).concat(['AT-E133','AT-E028','AT-E132','AT-E205','AT-E655','AT-E557']);
  const files=[sku,...new Set(others)];
  console.log(`\n=== ${sku} ===`);
  const catRaw:Float32Array[]=[]; const catNorm:Float32Array[]=[];
  for(const s of files){
    const raw=fs.readFileSync(pathOf(s));
    catRaw.push((await embed([await light(raw)]))[0]);
    catNorm.push((await embed([await light((await normalizeForAnalysis(raw)).buffer)]))[0]);
  }
  const report=(label:string,q:Float32Array,list:Float32Array[])=>{
    const sims=files.map((s,i)=>({s,sim:cos(q,list[i])})).sort((a,b)=>b.sim-a.sim);
    const rank=sims.findIndex(x=>x.s===sku)+1;
    console.log(`  ${label}: rank=${rank}/${sims.length} ${sims.slice(0,4).map(x=>x.s+'='+x.sim.toFixed(3)).join('  ')}`);
  };
  report('A) q=denoised  cat=raw      ',qNorm,catRaw);
  report('B) q=denoised  cat=normalized',qNorm,catNorm);
  report('C) q=raw       cat=raw      ',qLight,catRaw);
  report('D) q=raw       cat=normalized',qLight,catNorm);
}
