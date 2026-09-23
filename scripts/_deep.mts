import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const DIR='src/assets/imagesproducts';
const CAT=JSON.parse(fs.readFileSync('src/data/catalogSummary.json','utf8'));
const resolve=(n:string)=>{const c=n.toLowerCase();let p=path.join(DIR,c); if(fs.existsSync(p))return p;
  const m=c.match(/^e\(?(\d+)\)?\./); if(m){p=path.join(DIR,`e(${String(+m[1]).padStart(3,'0')}).png`); if(fs.existsSync(p))return p;} return null;};
async function deskBg(w=640,h=640){const svg=`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b6b4a"/><stop offset="50%" stop-color="#a5825c"/><stop offset="100%" stop-color="#6f5436"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${Array.from({length:26},(_,i)=>`<rect x="0" y="${i*25}" width="${w}" height="3" fill="#5c4526" opacity="0.18"/>`).join('')}</svg>`; return sharp(Buffer.from(svg)).blur(0.6).jpeg({quality:82}).toBuffer();}
async function realistic(file:string){
  const part=await sharp(file).flatten({background:'#ffffff'}).resize(430,430,{fit:'inside'}).rotate(-8,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const m=await sharp(part).metadata(); const pw=m.width||430, ph=m.height||430;
  const desk=await deskBg(); const left=Math.round((640-pw)/2), top=Math.round((640-ph)/2);
  const sh=await sharp(part).blur(5).modulate({brightness:0.55}).png().toBuffer();
  return sharp(desk).composite([{input:sh,left:left+8,top:top+10,blend:'multiply'},{input:part,left,top}]).modulate({saturation:1.05}).jpeg({quality:78}).toBuffer();
}
async function main(){
  const targets=process.argv.slice(2);
  for(const sku of targets){
    const item=CAT.find((c:any)=>c.code===sku); if(!item) continue;
    const f=resolve(item.image); if(!f) continue;
    const photo=await realistic(f);
    const r=await fetch('http://localhost:3000/api/visual-search/debug/score',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({imageBase64:`data:image/jpeg;base64,${photo.toString('base64')}`, sort:'vector', limit:150})});
    const j=await r.json();
    const cands=j.candidates||[];
    const rank=cands.findIndex((c:any)=>c.sku===sku)+1;
    const me=cands.find((c:any)=>c.sku===sku);
    console.log(`${sku}: رتبه‌ی برداری=${rank===0?'>150':rank} | سیگنال‌های خودش:`, me?`v=${me.vectorScore} s=${me.structureScore} h=${me.hashSimilarity} c=${me.combined}`:'—');
    console.log('   ۱۰ کاندیدای اول (بردی):', cands.slice(0,10).map((c:any)=>`${c.sku}(v${c.vectorScore} c${c.combined})`).join(' '));
  }
}
main();
