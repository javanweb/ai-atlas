import React, { useCallback, useState } from 'react';
import { AlertTriangle, RotateCcw, SearchX, Sparkles, ShieldCheck, Layers, Wrench } from 'lucide-react';
import { VisualUploader } from './VisualUploader';
import { VisualSearchProcessing } from './VisualSearchProcessing';
import { VisualResultCard } from './VisualResultCard';
import { CustomRequestForm } from './CustomRequestForm';
import {
  visualProductSearchService,
  type VisualSearchResponse,
} from '../../services/visualProductSearchService';

type Stage = 'idle' | 'processing' | 'done' | 'error';

interface VisualSearchExperienceProps {
  /** فشرده‌سازی نمایش (برای استفاده داخل مودال) */
  compact?: boolean;
}

/**
 * تجربه‌ی کامل «جستجوی محصول با تصویر» — Atlas Visual Product Search
 * ---------------------------------------------------------------------------
 * سه حالت خروجی طبق نقشه راه:
 *   ۱. EXACT    → فقط همان محصول، بدون فهرست مشابه‌ها، بدون درصد شباهت
 *   ۲. SIMILAR  → ۳ تا ۶ محصول نزدیک از نظر شکل و ظاهر
 *   ۳. NO_MATCH → پیام پیدا نشدن + فرم درخواست ساخت/تأمین سفارشی
 */
export const VisualSearchExperience: React.FC<VisualSearchExperienceProps> = ({ compact = false }) => {
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<VisualSearchResponse | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const reset = useCallback(() => {
    setStage('idle');
    setResult(null);
    setPreviewDataUrl('');
    setErrorMessage('');
    setShowCustomForm(false);
  }, []);

  const handleImageSelected = useCallback(async (file: File) => {
    setStage('processing');
    setResult(null);
    setErrorMessage('');
    setShowCustomForm(false);

    try {
      const dataUrl = await visualProductSearchService.fileToDataUrl(file);
      setPreviewDataUrl(dataUrl);
      // فقط پیکسل‌ها ارسال می‌شوند — نام فایل هیچ‌گاه به سرور نمی‌رود
      const response = await visualProductSearchService.search(dataUrl);
      setResult(response);
      setStage('done');
    } catch (err: any) {
      setErrorMessage(err?.message || 'بررسی تصویر با خطا مواجه شد.');
      setStage('error');
    }
  }, []);

  // ---------------------------------------------------------------- پردازش
  if (stage === 'processing') {
    return (
      <div className="space-y-4">
        {previewDataUrl && (
          <div className="flex items-center gap-3 bg-white border border-[#E2E8F0] rounded-2xl p-3 shadow-sm">
            <img
              src={previewDataUrl}
              alt="تصویر ارسالی شما"
              className="w-14 h-14 object-contain bg-slate-50 rounded-lg border border-slate-200"
            />
            <div className="text-[11px] text-[#64748B] leading-relaxed">
              تصویر شما دریافت شد و در حال جستجو در کاتالوگ اطلس است.
            </div>
          </div>
        )}
        <VisualSearchProcessing />
      </div>
    );
  }

  // -------------------------------------------------------------- خطا
  if (stage === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-black text-[#0A172F]">بررسی تصویر انجام نشد</h3>
          <p className="text-xs text-[#64748B]">{errorMessage}</p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 h-11 px-6 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>تلاش دوباره با تصویر دیگر</span>
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------- نتیجه
  if (stage === 'done' && result) {
    return (
      <div className="space-y-5">
        {/* خلاصه تصویر ارسالی + امکان جستجوی مجدد */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-2xl p-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {previewDataUrl && (
              <img
                src={previewDataUrl}
                alt="تصویر ارسالی شما"
                className="w-14 h-14 object-contain bg-slate-50 rounded-lg border border-slate-200 shrink-0"
              />
            )}
            <div className="text-[11px] text-[#64748B] leading-relaxed">
              نتیجه‌ی جستجو برای تصویر ارسالی شما
              {result.queryId ? (
                <span className="block font-mono text-[10px] text-[#94A3B8] mt-0.5">شناسه پیگیری: {result.queryId}</span>
              ) : null}
            </div>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 text-[#0A172F] font-bold text-[11px] rounded-xl border border-slate-300 transition-all cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#F97316]" />
            <span>جستجوی تصویر دیگر</span>
          </button>
        </div>

        {/* ---------------- حالت اول: محصول دقیق پیدا شد ---------------- */}
        {result.resultType === 'EXACT' && result.exactMatch && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-emerald-800">{result.message || 'محصول موردنظر شما پیدا شد'}</h3>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  این کالا با اطمینان به‌عنوان همان قطعه‌ی موجود در کاتالوگ اطلس تأیید شد.
                </p>
              </div>
            </div>
            <VisualResultCard item={result.exactMatch} variant="exact" />
          </div>
        )}

        {/* ------------- حالت دوم: محصول دقیق نبود، مشابه‌ها موجودند ------------- */}
        {result.resultType === 'SIMILAR' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
              <Layers className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-amber-800">{result.message}</h3>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  این کالاها از نظر شکل، ساختار و ظاهر نزدیک‌ترین گزینه‌ها به قطعه‌ی شما هستند؛ برای انتخاب دقیق‌تر
                  می‌توانید با کارشناسان فنی ما تماس بگیرید.
                </p>
              </div>
            </div>

            <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              {result.similarMatches.map(item => (
                <VisualResultCard key={item.productId + item.sku} item={item} variant="similar" />
              ))}
            </div>

            {/* گزینه‌ی درخواست بررسی کارشناسی در حالت مشابه */}
            {!showCustomForm ? (
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full h-11 bg-white hover:bg-slate-50 text-[#0A172F] font-bold text-[11px] rounded-xl border border-dashed border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-[#F97316]" />
                <span>هیچ‌کدام دقیقاً قطعه‌ی من نبود؛ درخواست بررسی ساخت / تأمین سفارشی</span>
              </button>
            ) : (
              <CustomRequestForm queryId={result.queryId} imageDataUrl={previewDataUrl} />
            )}
          </div>
        )}

        {/* ------------------ حالت سوم: محصولی پیدا نشد ------------------ */}
        {result.resultType === 'NO_MATCH' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-300 rounded-2xl px-4 py-5 flex items-start gap-3">
              <SearchX className="w-6 h-6 text-slate-500 mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-[#0A172F]">
                  {result.message || 'محصول موردنظر شما در کاتالوگ ما پیدا نشد.'}
                </h3>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  {result.subMessage ||
                    'در صورت نیاز، امکان بررسی ساخت یا تأمین محصول موردنظر شما به‌صورت سفارشی وجود دارد.'}
                </p>
              </div>
            </div>

            {!showCustomForm ? (
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full h-12 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>{result.customRequest?.ctaLabel || 'درخواست ساخت / تأمین سفارشی'}</span>
              </button>
            ) : (
              <CustomRequestForm queryId={result.queryId} imageDataUrl={previewDataUrl} />
            )}
          </div>
        )}

        {result.aiAssisted === false && result.resultType !== 'NO_MATCH' && (
          <p className="text-[10px] text-[#94A3B8] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>این نتیجه بر اساس تطابق مستقیم تصویری به‌دست آمده است.</span>
          </p>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------- شروع
  return <VisualUploader onImageSelected={handleImageSelected} />;
};
