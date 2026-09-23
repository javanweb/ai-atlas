import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  ScanSearch,
  Eye,
  ImageOff,
  Wrench,
  Search,
  PlayCircle,
  Loader2,
} from 'lucide-react';
import { VisualSearchExperience } from '../components/visual-search/VisualSearchExperience';
import { visualProductSearchService, type VisualSearchResponse } from '../services/visualProductSearchService';
import { VisualResultCard } from '../components/visual-search/VisualResultCard';
import { VisualSearchProcessing } from '../components/visual-search/VisualSearchProcessing';
import { getProductImageUrl } from '../assets/imagesproducts';

/** نمونه‌های آزمایشی — تصاویر واقعی کاتالوگ اطلس برای امتحان سریع موتور */
const SAMPLE_IMAGES: { title: string; subtitle: string; image: string }[] = [
  { title: 'تسمه تایمینگ صنعتی', subtitle: 'نمونه از کاتالوگ رسمی ۱۴۰۴', image: getProductImageUrl('e(552).png') },
  { title: 'تسمه V-Belt فورزا', subtitle: 'نمونه از کاتالوگ رسمی ۱۴۰۴', image: getProductImageUrl('e(541).png') },
  { title: 'چرخ روکش پلی‌یورتان', subtitle: 'نمونه از کاتالوگ رسمی ۱۴۰۴', image: getProductImageUrl('e(319).png') },
  { title: 'بوش کوپلینگ لاستیکی', subtitle: 'نمونه از کاتالوگ رسمی ۱۴۰۴', image: getProductImageUrl('e(001).png') },
];

export const VisualSearchPage: React.FC = () => {
  const [sampleStage, setSampleStage] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [sampleResult, setSampleResult] = useState<VisualSearchResponse | null>(null);

  const runSample = async (url: string) => {
    setSampleStage('processing');
    setSampleResult(null);
    try {
      const res = await visualProductSearchService.search(url);
      setSampleResult(res);
      setSampleStage('done');
    } catch {
      setSampleStage('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* مسیر صفحه */}
      <nav className="flex items-center gap-2 text-xs text-[#64748B]">
        <Link to="/" className="hover:text-[#F97316]">
          صفحه اصلی
        </Link>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-[#0A172F] font-bold">جستجوی محصول با تصویر</span>
      </nav>

      {/* سربرگ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A172F] via-[#152544] to-[#1E293B] text-white p-6 sm:p-8 border border-slate-700 shadow-md">
        <div className="absolute -left-12 -bottom-14 w-56 h-56 bg-[#F97316]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-8 top-0 w-64 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4 text-right max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            <span>تشخیص قطعه با تصویر — Atlas Visual Product Search</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black leading-tight">
            فقط عکس قطعه را بفرستید؛ ما همان کالا را در کاتالوگ پیدا می‌کنیم
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            نیازی به دانستن کد فنی، نام دقیق یا برند قطعه نیست. سیستم فقط بر اساس <strong className="text-orange-400">شکل،
            هندسه و ظاهر واقعی قطعه</strong> آن را با تصاویر محصولات اطلس مقایسه می‌کند و نتیجه را در سه حالت روشن اعلام
            می‌کند: کالای دقیق، کالاهای مشابه، یا ثبت درخواست ساخت/تأمین سفارشی.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
            <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
              <ScanSearch className="w-3.5 h-3.5 text-[#F97316]" />
              <span>مقایسه‌ی شکلی و ساختاری</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>بدون معرفی محصول اشتباه</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span>عکس موبایل هم قابل قبول است</span>
            </span>
          </div>
        </div>
      </div>

      {/* بخش اصلی جستجو */}
      <VisualSearchExperience />

      {/* نمونه‌های آزمایشی */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-[#0A172F] flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-[#F97316]" />
              امتحان سریع با نمونه‌های کاتالوگ
            </h3>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              اگر الان عکس قطعه را همراه ندارید، یکی از نمونه‌های زیر را انتخاب کنید تا عملکرد موتور را ببینید.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SAMPLE_IMAGES.map(sample => (
            <button
              key={sample.image}
              onClick={() => runSample(sample.image)}
              disabled={sampleStage === 'processing'}
              className="text-right border border-[#E2E8F0] hover:border-[#F97316] rounded-xl p-3 bg-slate-50 hover:bg-orange-50/40 transition-all cursor-pointer disabled:opacity-60 group"
            >
              <div className="h-24 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden mb-2">
                <img src={sample.image} alt={sample.title} className="w-full h-full object-contain p-1" />
              </div>
              <div className="text-[11px] font-bold text-[#0A172F] leading-tight group-hover:text-[#EA580C]">{sample.title}</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">{sample.subtitle}</div>
            </button>
          ))}
        </div>

        {sampleStage === 'processing' && <VisualSearchProcessing />}

        {sampleStage === 'error' && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            بررسی نمونه با خطا مواجه شد؛ لطفاً چند لحظه بعد دوباره تلاش کنید.
          </div>
        )}

        {sampleStage === 'done' && sampleResult && (
          <div className="space-y-3 pt-1">
            <div className="text-[11px] font-bold text-[#0A172F] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              {sampleResult.message}
            </div>
            {sampleResult.exactMatch && <VisualResultCard item={sampleResult.exactMatch} variant="exact" />}
            {sampleResult.similarMatches.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sampleResult.similarMatches.map(item => (
                  <VisualResultCard key={item.sku} item={item} variant="similar" />
                ))}
              </div>
            )}
            {sampleResult.resultType === 'NO_MATCH' && (
              <div className="text-[11px] text-[#64748B] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 leading-relaxed">
                در این نمونه کالای مناسبی پیدا نشد؛ می‌توانید همین تصویر را از بخش بالای صفحه ارسال کنید تا امکان ساخت
                یا تأمین سفارشی آن بررسی شود.
              </div>
            )}
            <button
              onClick={() => {
                setSampleStage('idle');
                setSampleResult(null);
              }}
              className="text-[11px] font-bold text-[#F97316] hover:text-[#EA580C] cursor-pointer"
            >
              بستن نتیجه‌ی نمونه
            </button>
          </div>
        )}
      </div>

      {/* منطق سه‌حالته */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Eye className="w-5 h-5 text-emerald-600" />
          </div>
          <h4 className="text-xs font-black text-[#0A172F]">۱. کالای دقیق پیدا شد</h4>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            اگر همان قطعه در کاتالوگ باشد، فقط همان کالا نمایش داده می‌شود؛ بدون فهرست مشابه‌ها و بدون درصد شباهت.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <ImageOff className="w-5 h-5 text-amber-600" />
          </div>
          <h4 className="text-xs font-black text-[#0A172F]">۲. کالای مشابه پیدا شد</h4>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            اگر عین قطعه موجود نباشد ولی کالاهای بسیار نزدیک از نظر شکل و ظاهر باشند، ۳ تا ۶ گزینه معرفی می‌شود.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-slate-600" />
          </div>
          <h4 className="text-xs font-black text-[#0A172F]">۳. کالایی پیدا نشد</h4>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            اگر هیچ گزینه‌ی مناسبی وجود نداشته باشد، فرم درخواست ساخت یا تأمین سفارشی برای بررسی کارشناسان نمایش داده
            می‌شود.
          </p>
        </div>
      </div>

      {/* توضیح شفافیت و لینک جستجوی متنی */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-black text-[#0A172F]">چرا نتیجه همیشه «همان محصول» نیست؟</h4>
          <p className="text-[11px] text-[#64748B] leading-relaxed max-w-2xl">
            سیاست ما این است که اگر سیستم از انطباق یک کالا مطمئن نباشد، آن را به‌عنوان «همان محصول» معرفی نکند. پیدا
            نکردن قطعه، بهتر از معرفی محصول اشتباه است. در همه‌ی حالت‌ها می‌توانید با کد کالا یا نام قطعه هم جستجو کنید.
          </p>
        </div>
        <Link
          to="/search"
          className="shrink-0 inline-flex items-center gap-2 h-10 px-5 bg-white hover:bg-slate-100 text-[#0A172F] font-bold text-[11px] rounded-xl border border-slate-300 transition-all"
        >
          <Search className="w-3.5 h-3.5 text-[#F97316]" />
          <span>جستجوی متنی کاتالوگ</span>
        </Link>
      </div>
    </div>
  );
};
