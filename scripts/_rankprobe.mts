/** جایگاه دقیق یک SKU در نتایج عکس واقعی + امتیازهای خودش */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const BASE='http://localhost:3000';
const DIR=path.join(process.cwd(),'src','assets','imagesproducts');
const idx=JSON.parse(fs.readFileSync('data/visual-search/vector-index.json','utf8'));
const resolve=(sku:string)=>{const r=(idx.records as any[]).find(x=>x.sku===sku);return r?r.imagePath:null;};
async function desk(w=640,h=640){const svg=`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${Array.from({length:26},(_,i)=>`<rect x="0" y="${i*25}" width="${w}" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}</svg>`;return sharp(Buffer.from(svg)).blur(0.6).jpeg({quality:82}).toBuffer();}
async function realPhoto(file:string,hard=false){const size=hard?300:430;const angle=hard?-18:-8;const part=await sharp(file).flatten({background:'#ffffff'}).resize(size,size,{fit:'inside'}).rotate(angle,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();const meta=await sharp(part).metadata();const pw=meta.width||size,ph=meta.height||size;const d=await desk();const left=Math.round((640-pw)/2),top=Math.round((640-ph)/2);const sh=await sharp(part).blur(5).modulate({brightness:hard?0.35:0.55}).png().toBuffer();const layers:any[]=[{input:sh,left:left+8,top:top+10,blend:'multiply'},{input:part,left,top}];return sharp(d).composite(layers).modulate({brightness:1.0,saturation:1.05}).jpeg({quality:78}).toBuffer();}
for(const sku of process.argv.slice(2)){
  const p=resolve(sku); if(!p){console.log('no image for',sku);continue;}
  const buf=await realPhoto(p);
  const r=await fetch(`${BASE}/api/visual-search/debug/score`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:`data:image/jpeg;base64,${buf.toString('base64')}`,sort:'combined',limit:200})});
  const j:any=await r.json();
  const cands=j.candidates||[];
  const rank=cands.findIndex((c:any)=>c.sku===sku);
  const me=cands[rank];
  console.log(`\n${sku}: رتبه=${rank+1} از ${cands.length}  |  ${me?`خودش: v=${(me.vectorSimilarity??me.vector)?.toFixed(4)} s=${(me.structureScore??me.structure)?.toFixed(3)} h=${(me.hashScore??me.hash)?.toFixed(3)} c=${(me.combinedScore??me.combined)?.toFixed(4)}`:'یافت نشد در ۲۰۰ کاندیدا'}`);
  cands.slice(0,5).forEach((c:any,i:number)=>console.log(`   ${i+1}) ${c.sku} v=${c.vectorScore.toFixed(4)} s=${c.structureScore.toFixed(3)} h=${c.hashSimilarity.toFixed(3)} c=${c.combined.toFixed(4)}`));
}
