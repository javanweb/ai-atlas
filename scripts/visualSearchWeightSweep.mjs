/** کالیبراسیون وزن‌های ترکیب سیگنال‌ها (بردار/ساختار/هش) با KPI بازیابی */
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const BASE='http://localhost:3000';
const DIR=path.join(process.cwd(),'src','assets','imagesproducts');
const CAT=JSON.parse(fs.readFileSync('src/data/catalogSummary.json','utf8'));
const N=Number(process.argv[2]||6);
const COMBOS=JSON.parse(process.argv[3]||'[[0.42,0.24,0.34],[0.32,0.34,0.34],[0.2,0.4,0.4],[0.1,0.45,0.45],[0.25,0.25,0.5],[0.5,0.25,0.25]]');
const resolve=(n)=>{const c=n.toLowerCase();let p=path.join(DIR,c); if(fs.existsSync(p))return p;
  const m=c.match(/^e\(?(\d+)\)?\./); if(m){p=path.join(DIR,`e(${String(+m[1]).padStart(3,'0')}).png`); if(fs.existsSync(p))return p;} return null;};
const score=async(buf,w)=>{const r=await fetch(`${BASE}/api/visual-search/debug/score`,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({imageBase64:`data:image/jpeg;base64,${buf.toString('base64')}`,weights:{vector:w[0],structure:w[1],hash:w[2]}})}); return r.json();};
const mk=async(b)=>({
  'exact': await sharp(b).flatten({background:'#ffffff'}).jpeg({quality:92}).toBuffer(),
  'rot90': await sharp(b).flatten({background:'#ffffff'}).rotate(90).jpeg({quality:80}).toBuffer(),
  'bg-pad': await sharp({create:{width:480,height:480,channels:3,background:{r:62,g:78,b:96}}}).composite([{input:await sharp(b).flatten({background:'#ffffff'}).resize(190,190,{fit:'inside'}).toBuffer(),gravity:'center'}]).jpeg({quality:80}).toBuffer(),
  'lowq': await sharp(b).flatten({background:'#ffffff'}).resize(240,240,{fit:'inside'}).jpeg({quality:45}).toBuffer(),
  'rot25-bg': await sharp({create:{width:520,height:520,channels:3,background:{r:210,g:205,b:190}}}).composite([{input:await sharp(b).flatten({background:'#ffffff'}).rotate(-25,{background:{r:0,g:0,b:0,alpha:0}}).resize(200,200,{fit:'inside'}).toBuffer(),gravity:'center'}]).jpeg({quality:62}).toBuffer(),
});
const step=Math.max(1,Math.floor(CAT.length/N));
const samples=[];
for(let i=0;i<CAT.length && samples.length<N;i+=step){const it=CAT[i];const a=resolve(it.image);if(!a)continue;samples.push({sku:it.code,file:a});}
const variants=Object.keys(await mk(await sharp(samples[0].file).resize(420,420,{fit:'inside'}).toBuffer()));
const pre=[];
for(const s of samples){const b=await sharp(s.file).resize(420,420,{fit:'inside'}).toBuffer();pre.push({sku:s.sku,v:await mk(b)});}
for(const w of COMBOS){
  const agg={};
  for(const s of pre) for(const label of variants){
    const r=await score(s.v[label],w);
    const rank=(r.candidates||[]).findIndex(c=>c.sku===s.sku)+1;
    const a=agg[label]||(agg[label]={n:0,t1:0,r3:0,r6:0});
    a.n++; if(rank===1)a.t1++; if(rank<=3)a.r3++; if(rank>0&&rank<=6)a.r6++;
  }
  const tot=Object.values(agg).reduce((x,a)=>x+a.r6,0);
  const totN=Object.values(agg).reduce((x,a)=>x+a.n,0);
  console.log(`w=${w.join('/')}  recall@6=${tot}/${totN}  ` + variants.map(l=>`${l}:${agg[l].t1}/${agg[l].r6}`).join('  '));
}
