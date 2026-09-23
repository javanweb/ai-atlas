/** بررسی «آزمون منفی»: تصاویر بی‌ربط باید NO_MATCH یا حداکثر SIMILAR شوند (هرگز EXACT) */
import sharp from 'sharp';
const POST=async(b)=>{const r=await fetch('http://localhost:3000/api/visual-search/debug/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:`data:image/jpeg;base64,${b.toString('base64')}`})});return r.json();};
async function main(){
  const svg=(inner:string)=>Buffer.from(`<svg width="420" height="420" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`);
  const cases:[string,Buffer][]=[
    ['پس‌زمینه‌ی یکدست', await sharp({create:{width:420,height:420,channels:3,background:{r:30,g:60,b:90}}}).jpeg().toBuffer()],
    ['دایره‌ی ساده', await sharp(svg('<circle cx="210" cy="210" r="150" fill="white"/>')).jpeg().toBuffer()],
    ['مستطیل ساده', await sharp(svg('<rect x="60" y="140" width="300" height="140" fill="#dddddd"/>')).jpeg().toBuffer()],
    ['متن/برچسب', await sharp(svg('<rect width="420" height="420" fill="white"/><text x="40" y="220" font-size="60" fill="black">FORZA 2025</text>')).jpeg().toBuffer()],
    ['نویز تصادفی', await sharp({create:{width:420,height:420,channels:3,background:{r:120,g:120,b:120},noise:{type:"gaussian",mean:120,sigma:60}}}).jpeg().toBuffer()],
  ];
  for(const [label,buf] of cases){
    const j=await POST(buf);
    const top=(j.candidates||[]).slice(0,3).map(c=>`${c.sku} c=${c.combined.toFixed(3)}`);
    console.log(`${label.padEnd(18)} → ${j.resultType}  ${top.join(' | ')}`);
  }
}
main();
