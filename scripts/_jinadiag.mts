/** مقایسه‌ی «تصویر کامل» و «جسم کانونی» به‌عنوان ورودی Jina برای عکس واقعی */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
import { normalizeForAnalysis, cropToBox } from '../server/visualSearch/imagePreprocess';

const KEY = fs.readFileSync('/tmp/.jkey','utf8').trim();
const DIR='src/assets/imagesproducts';
const CAT=JSON.parse(fs.readFileSync('src/data/catalogSummary.json','utf8'));
const resolve=(n:string)=>{const c=n.toLowerCase();let p=path.join(DIR,c); if(fs.existsSync(p))return p;
  const m=c.match(/^e\(?(\d+)\)?\./); if(m){p=path.join(DIR,`e(${String(+m[1]).padStart(3,'0')}).png`); if(fs.existsSync(p))return p;} return null;};

async function jina(bufs: Buffer[]): Promise<number[][]>{
  const body={model:'jina-clip-v1', input: bufs.map(b=>({image:`data:image/jpeg;base64,${b.toString('base64')}`}))};
  const r=await fetch('https://api.jina.ai/v1/embeddings',{method:'POST',headers:{Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0,150)}`);
  const j=await r.json();
  return j.data.sort((a:any,b:any)=>a.index-b.index).map((d:any)=>d.embedding);
}
const cos=(a:number[],b:number[])=>{let s=0,na=0,nb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return s/Math.sqrt(na*nb);};
const small=(b:Buffer)=>sharp(b).flatten({background:'#ffffff'}).resize(224,224,{fit:'inside'}).jpeg({quality:88}).toBuffer();

/** عکس واقعی: میز کار + سایه + چرخش + اجسام مزاحم */
async function realPhoto(file:string){
  const part = await sharp(file).flatten({background:'#ffffff'}).resize(300,300,{fit:'inside'})
    .rotate(-18,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const svg=`<svg width="640" height="640" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/></linearGradient></defs><rect width="640" height="640" fill="url(#g)"/>${Array.from({length:26},(_,i)=>`<rect x="0" y="${i*25}" width="640" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}</svg>`;
  const desk = await sharp(Buffer.from(svg)).blur(0.6).jpeg({quality:82}).toBuffer();
  const sh = await sharp(part).blur(6).modulate({brightness:0.35}).png().toBuffer();
  const junk = Buffer.from(`<svg width="90" height="90" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="90" rx="12" fill="#3d4b5c"/><circle cx="45" cy="45" r="22" fill="#9aa7b5"/></svg>`);
  return sharp(desk).composite([
    {input: sh, left:235, top:250, blend:'multiply'},
    {input: part, left:220, top:235},
    {input: junk, left:30, top:40},
    {input: junk, left:520, top:540},
  ]).modulate({brightness:0.94, saturation:1.05}).jpeg({quality:66}).toBuffer();
}

async function main(){
  const N=8, step=Math.floor(CAT.length/N);
  const picks: {sku:string; file:string}[]=[];
  for(let i=0;i<CAT.length && picks.length<N;i+=step){const f=resolve(CAT[i].image); if(f)picks.push({sku:CAT[i].code,file:f});}

  // بردار کاتالوگ از «جسم کانونی»
  const catBufs: Buffer[]=[]; 
  for(const p of picks){
    const norm=await normalizeForAnalysis(await sharp(p.file).flatten({background:'#ffffff'}).toBuffer());
    const box = norm.objectIsolated ? norm.objectBox : {x:0.08,y:0.08,w:0.84,h:0.84};
    const obj = await cropToBox(norm.buffer, box, 0.14);
    catBufs.push(await small(obj));
  }
  const catVecs = await jina(catBufs);

  for (const mode of ['raw','object'] as const) {
    let top1=0;
    const details:string[]=[];
    for (let i=0;i<picks.length;i++){
      const photo = await realPhoto(picks[i].file);
      let q: Buffer;
      if (mode==='raw') q = await small(photo);
      else {
        const norm=await normalizeForAnalysis(photo);
        const box = norm.objectIsolated ? norm.objectBox : {x:0.08,y:0.08,w:0.84,h:0.84};
        q = await small(await cropToBox(norm.buffer, box, 0.14));
      }
      const [qv] = await jina([q]);
      const scored = catVecs.map((cv,j)=>({sku:picks[j].sku, sim:cos(qv,cv)})).sort((a,b)=>b.sim-a.sim);
      const rank = scored.findIndex(s=>s.sku===picks[i].sku)+1;
      if(rank===1) top1++;
      details.push(`${picks[i].sku}:${rank===1?'✓':'→'+scored[0].sku}(${scored[0].sim.toFixed(3)})`);
    }
    console.log(`${mode.padEnd(8)} top1=${top1}/${picks.length}  ${details.join('  ')}`);
  }
}
main().catch(e=>{console.error('ERR', e.message); process.exit(1);});
