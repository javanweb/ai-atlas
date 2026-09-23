import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const BASE='http://localhost:3000';
const IMAGES_DIR=path.join(process.cwd(),'src','assets','imagesproducts');
const CATALOG=JSON.parse(fs.readFileSync('src/data/catalogSummary.json','utf8'));
function resolve(name){const c=name.toLowerCase();const d=path.join(IMAGES_DIR,c);if(fs.existsSync(d))return d;const m=c.match(/^e\(?(\d+)\)?\./);if(m){const p=path.join(IMAGES_DIR,`e(${String(+m[1]).padStart(3,'0')}).png`);if(fs.existsSync(p))return p;}return null;}
const durl=b=>`data:image/jpeg;base64,${b.toString('base64')}`;
async function score(buf){const r=await fetch(`${BASE}/api/visual-search/debug/score`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:durl(buf)})});return r.json();}
const base = p => sharp(p).resize(420,420,{fit:'inside'}).toBuffer();
const variants = async (b) => ({
  'rot90': await sharp(b).flatten({background:'#ffffff'}).rotate(90).jpeg({quality:80}).toBuffer(),
  'flip': await sharp(b).flatten({background:'#ffffff'}).flop().jpeg({quality:80}).toBuffer(),
  'bg-pad': await sharp({create:{width:480,height:480,channels:3,background:{r:62,g:78,b:96}}}).composite([{input: await sharp(b).flatten({background:'#ffffff'}).resize(190,190,{fit:'inside'}).toBuffer(),gravity:'center'}]).jpeg({quality:80}).toBuffer(),
  'lowq': await sharp(b).flatten({background:'#ffffff'}).resize(240,240,{fit:'inside'}).jpeg({quality:45}).toBuffer(),
  'bright': await sharp(b).flatten({background:'#ffffff'}).modulate({brightness:1.3}).jpeg({quality:80}).toBuffer(),
  'rot25-bg': await sharp({create:{width:520,height:520,channels:3,background:{r:210,g:205,b:190}}}).composite([{input: await sharp(b).flatten({background:'#ffffff'}).rotate(-25,{background:{r:0,g:0,b:0,alpha:0}}).resize(200,200,{fit:'inside'}).toBuffer(),gravity:'center'}]).jpeg({quality:62}).toBuffer(),
});
const rows=[];
const step=Math.floor(CATALOG.length/8);
for(let i=0;i<CATALOG.length && rows.length<8*6;i+=step){
  const item=CATALOG[i]; const abs=resolve(item.image); if(!abs) continue;
  const b=await base(abs);
  for(const [label,v] of Object.entries(await variants(b))){
    const r=await score(v);
    const top=r.candidates?.[0]; const second=r.candidates?.find((c,idx)=>idx>0 && c.sku!==top?.sku);
    rows.push({sku:item.code,label,type:r.resultType,top:top?.sku,topV:top?.vectorScore,topS:top?.structureScore,topH:top?.hashSimilarity,topC:top?.combined,second:second?.sku,secondC:second?.combined,correct:top?.sku===item.code});
  }
}
console.log('label          correct  topV    topS    topH    topC    margin(2nd)');
const agg={};
for(const r of rows){ const m=(r.topC-r.secondC); agg[r.label]=agg[r.label]||{n:0,ok:0,vs:[],ss:[],cs:[],ms:[],sim:0,nm:0};
  const a=agg[r.label]; a.n++; if(r.correct)a.ok++; if(r.topV!=null){a.vs.push(r.topV);a.ss.push(r.topS);a.cs.push(r.topC);a.ms.push(m);} if(r.type==='SIMILAR')a.sim++; if(r.type==='NO_MATCH')a.nm++; }
const avg=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
for(const [l,a] of Object.entries(agg)) console.log(`${l.padEnd(14)} ${String(a.ok).padStart(2)}/${a.n}   v=${avg(a.vs).toFixed(3)} s=${avg(a.ss).toFixed(3)} c=${avg(a.cs).toFixed(3)} m=${avg(a.ms).toFixed(3)}  SIM=${a.sim}  NM=${a.nm}`);
const wrong = rows.filter(r=>r.type==='EXACT' && !r.correct);
console.log('false-EXACT cases:', wrong.length, JSON.stringify(wrong.slice(0,5)));
const correctTop = rows.filter(r=>r.correct);
const incorrectTop = rows.filter(r=>!r.correct);
console.log('\ncorrectTop worst:', correctTop.sort((a,b)=>a.topC-b.topC).slice(0,6).map(r=>`${r.label} ${r.sku} top=${r.top} v=${r.topV} s=${r.topS} h=${r.topH} c=${r.topC}`));
console.log('\nincorrectTop best:', incorrectTop.sort((a,b)=>b.topC-a.topC).slice(0,6).map(r=>`${r.label} ${r.sku} → ${r.top} v=${r.topV} s=${r.topS} h=${r.topH} c=${r.topC} m=${(r.topC-r.secondC).toFixed(3)}`));
