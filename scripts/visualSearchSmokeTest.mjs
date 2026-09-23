/** آزمون سرتاسری مسیر کاربر: جستجو → نتیجه → درخواست سفارشی → پنل مدیریت */
import fs from 'fs'; import sharp from 'sharp';
const B='http://localhost:3000/api/visual-search';
const post=async(u,b)=>{const r=await fetch(B+u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); return {code:r.status, json:r.json?await r.json().catch(()=>null):null};};
const get=async(u)=>{const r=await fetch(B+u); return {code:r.status, json:await r.json().catch(()=>null)};};

// ۱) عکس کاتالوگ → باید EXACT باشد
const img = await sharp('src/assets/imagesproducts/e(552).png').flatten({background:'#ffffff'}).resize(420,420,{fit:'inside'}).jpeg({quality:90}).toBuffer();
const r1 = await post('/search',{imageBase64:`data:image/jpeg;base64,${img.toString('base64')}`});
console.log('۱) جستجوی کاتالوگ:', r1.json.resultType, '| محصول:', r1.json.exactMatch?.sku, '|', r1.json.message);
console.log('   فیلدهای کارت:', Object.keys(r1.json.exactMatch||{}).join(','));

// ۲) تصویر بی‌ربط → نباید EXACT باشد
const noise = await sharp({create:{width:400,height:400,channels:3,background:{r:20,g:20,b:20}}}).composite([
  {input: Buffer.from('<svg width="400" height="400"><circle cx="200" cy="200" r="140" fill="white"/><rect x="40" y="180" width="320" height="40" fill="black"/></svg>'), gravity:'center'}
]).jpeg().toBuffer();
const r2 = await post('/search',{imageBase64:`data:image/jpeg;base64,${noise.toString('base64')}`});
console.log('۲) تصویر بی‌ربط:', r2.json.resultType, '|', r2.json.message);

// ۳) ثبت درخواست ساخت سفارشی (مسیر NO_MATCH)
const c = await post('/requests',{description:'کوپلینگ سه‌شاخه لاستیکی',quantity:'۲ عدد',contactName:'آزمون سیستم',contactPhone:'09120000000',company:'شرکت نمونه',extraNotes:'تست خودکار'});
console.log('۳) ثبت درخواست سفارشی:', c.code, c.json?.requestId || c.json);

// ۴) پنل مدیریت: فهرست و تغییر وضعیت
const list = await get('/requests');
const req = (list.json.requests||[]).find(x=>x.id===c.json?.requestId);
console.log('۴) پنل مدیریت → تعداد:', list.json.requests.length, '| آخرین وضعیت:', req?.status);
const patch = await fetch(`${B}/requests/${req.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'can_manufacture',adminNote:'بررسی شد'})});
const pj = await patch.json();
console.log('   تغییر وضعیت →', pj.request?.status || pj.status);

// ۵) پاک‌سازی درخواست آزمون
await fetch(`${B}/requests/${req.id}`,{method:'DELETE'});
const after = await get('/requests');
console.log('۵) حذف درخواست آزمون → تعداد:', after.json.requests.length);

// ۶) وضعیت ایندکس و اطلاعات ماژول
const idx = await get('/index/status');
console.log('۶) ایندکس: products=%d/%d vectors=%d ready=%s building=%s errors=%d',
  idx.json.status.indexedProducts, idx.json.status.totalProducts, idx.json.status.vectors,
  idx.json.status.ready, idx.json.status.building, (idx.json.status.errors||[]).length);
const info = await get('/info');
console.log('   ماژول:', JSON.stringify({provider:info.json.provider, aiVerification:info.json.aiVerification, vectorStore:info.json.vectorStore, version:info.json.indexVersion}));
