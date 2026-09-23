import 'dotenv/config';
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
import { normalizeForAnalysis, cropToBox } from '../server/visualSearch/imagePreprocess';
const idx=JSON.parse(fs.readFileSync('data/visual-search/vector-index.json','utf8'));
const KEY=(process.env.JINA_API_KEY||'').trim(); const MODEL=process.env.JINA_MODEL||'jina-clip-v1';
async function embed(imgs:Buffer[]):Promise<Float32Array[]>{const r=await fetch('https://api.jina.ai/v1/embeddings',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},body:JSON.stringify({model:MODEL,input:imgs.map(b=>({image:`data:image/jpeg;base64,${b.toString('base64')}`})),dimensions:768})});const j:any=await r.json();if(!j.data)throw new Error(JSON.stringify(j).slice(0,200));return j.data.map((d:any)=>Float32Array.from(d.embedding));}
const cos=(a:Float32Array,b:Float32Array)=>{let s=0,na=0,nb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return s/Math.sqrt(na*nb);};
async function desk(w=640,h=640){const svg=`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${Array.from({length:26},(_,i)=>`<rect x="0" y="${i*25}" width="${w}" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}</svg>`;return sharp(Buffer.from(svg)).blur(0.6).jpeg({quality:82}).toBuffer();}
async function scene(file:string){const size=430;const part=await sharp(file).flatten({background:'#ffffff'}).resize(size,size,{fit:'inside'}).rotate(-8,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();const meta=await sharp(part).metadata();const pw=meta.width||size,ph=meta.height||size;const d=await desk();const left=Math.round((640-pw)/2),top=Math.round((640-ph)/2);const sh=await sharp(part).blur(5).modulate({brightness:0.55}).png().toBuffer();return sharp(d).composite([{input:sh,left:left+8,top:top+10,blend:'multiply'},{input:part,left,top}]).modulate({brightness:1.0,saturation:1.05}).jpeg({quality:78}).toBuffer();}
async function to224(b:Buffer){const m=await sharp(b).metadata();const mx=Math.max(m.width||0,m.height||0);if(mx&&mx<=224)return b;return sharp(b).flatten({background:'#ffffff'}).resize(224,224,{fit:'inside',withoutEnlargement:true}).jpeg({quality:88}).toBuffer();}
const sku=process.argv[2]||'AT-E217';
const rec=(idx.records as any[]).find(r=>r.sku===sku);
// decode f32 base64 properly
const raw=Buffer.from(rec.vector,'base64'); const stored=new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength/4);
const catBuf=fs.readFileSync(rec.imagePath);
const catNorm=await normalizeForAnalysis(catBuf);
const [catFullNow]=await embed([await to224(catNorm.buffer)]);
const scn=await scene(rec.imagePath);
const scnNorm=await normalizeForAnalysis(scn);
const [scnFullNow]=await embed([await to224(scnNorm.buffer)]);
console.log(`${sku}  stored-vs-freshCat  = ${cos(stored,catFullNow).toFixed(4)}`);
console.log(`${sku}  scene-vs-stored     = ${cos(scnFullNow,stored).toFixed(4)}`);
console.log(`${sku}  scene-vs-freshCat   = ${cos(scnFullNow,catFullNow).toFixed(4)}`);
console.log(`imagePath=${rec.imagePath}`);
