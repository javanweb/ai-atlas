/** آزمون تفکیک‌پذیری بردار Jina CLIP v2 روی تصاویر کاتالوگ + تبدیل‌های شبیه عکس واقعی */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const KEY = fs.readFileSync('/tmp/.jkey','utf8').trim();
const DIR='src/assets/imagesproducts';
const CAT=JSON.parse(fs.readFileSync('src/data/catalogSummary.json','utf8'));
const N=Number(process.argv[2]||12);
const resolve=n=>{const c=n.toLowerCase();let p=path.join(DIR,c); if(fs.existsSync(p))return p;
  const m=c.match(/^e\(?(\d+)\)?\./); if(m){p=path.join(DIR,`e(${String(+m[1]).padStart(3,'0')}).png`); if(fs.existsSync(p))return p;} return null;};

async function embedImages(bufs){
  const body={model:process.env.JINA_MODEL||'jina-clip-v2', input: bufs.map(b=>({image:`data:image/jpeg;base64,${b.toString('base64')}`})), dimensions:Number(process.env.JINA_DIM||1024)};
  const r=await fetch('https://api.jina.ai/v1/embeddings',{method:'POST',headers:{Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0,200)}`);
  const j=await r.json();
  const out=j.data.sort((a,b)=>a.index-b.index).map(d=>d.embedding);
  return out;
}
const cos=(a,b)=>{let s=0,na=0,nb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return s/Math.sqrt(na*nb);};
const bg=async(b,w,h,c)=>sharp({create:{width:w,height:h,channels:3,background:c}})
  .composite([{input:b,gravity:'center'}]).jpeg({quality:80}).toBuffer();

async function main(){
  const step=Math.floor(CAT.length/N);
  const picks=[];
  for(let i=0;i<CAT.length && picks.length<N;i+=step){const f=resolve(CAT[i].image); if(f) picks.push({sku:CAT[i].code, file:f});}

  const bases=[], names=[];
  for(const p of picks){
    const flat=await sharp(p.file).flatten({background:'#ffffff'}).resize(420,420,{fit:'inside'}).jpeg({quality:90}).toBuffer();
    bases.push(flat); names.push(p.sku);
  }
  const baseVecs=await embedImages(bases);
  console.log(`بردارهای پایه گرفته شد: ${baseVecs.length} (${names.join(', ')})`);

  const variants={
    'bg-pad': async b=>bg(await sharp(b).flatten({background:'#ffffff'}).resize(190,190,{fit:'inside'}).toBuffer(),480,480,{r:62,g:78,b:96}),
    'rot25-bg': async b=>bg(await sharp(b).flatten({background:'#ffffff'}).rotate(-25,{background:{r:0,g:0,b:0,alpha:0}}).resize(200,200,{fit:'inside'}).toBuffer(),520,520,{r:210,g:205,b:190}),
    'bright': async b=>sharp(b).flatten({background:'#ffffff'}).modulate({brightness:1.3}).jpeg({quality:80}).toBuffer(),
    'lowq': async b=>sharp(b).flatten({background:'#ffffff'}).resize(240,240,{fit:'inside'}).jpeg({quality:45}).toBuffer(),
  };
  for(const [label,fn] of Object.entries(variants)){
    const vbufs=[]; for(const b of bases) vbufs.push(await fn(b));
    const vvecs=await embedImages(vbufs);
    let top1=0, top3=0, top6=0; const rows=[];
    vvecs.forEach((v,i)=>{
      const scored=baseVecs.map((bv,j)=>({sku:names[j], sim:cos(v,bv)})).sort((a,b)=>b.sim-a.sim);
      const rank=scored.findIndex(x=>x.sku===names[i])+1;
      if(rank===1)top1++; if(rank<=3)top3++; if(rank<=6)top6++;
      if(rank!==1) rows.push(`${names[i]}→${scored[0].sku}(${scored[0].sim.toFixed(3)} vs ${scored[rank-1].sim.toFixed(3)})`);
    });
    console.log(`${label.padEnd(10)} top1=${top1}/${N} top3=${top3}/${N} top6=${top6}/${N} ${rows.length? ' | misses: '+rows.slice(0,4).join(' , '):''}`);
  }
}
main().catch(e=>{console.error('ERR', e.message); process.exit(1);});
