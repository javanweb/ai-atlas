import React, { useState } from 'react';
import { Send, CheckCircle2, Loader2, AlertCircle, Wrench } from 'lucide-react';
import { visualProductSearchService } from '../../services/visualProductSearchService';

interface CustomRequestFormProps {
  queryId?: string;
  /** تصویر همان جستجویی که نتیجه نداشت (dataURL) */
  imageDataUrl?: string;
  onSubmitted?: (requestId: string) => void;
}

/**
 * فرم «درخواست ساخت / تأمین سفارشی» (طبق §۱۹).
 * این درخواست در پنل مدیریت ثبت می‌شود و وضعیت آن پیگیری می‌شود.
 */
export const CustomRequestForm: React.FC<CustomRequestFormProps> = ({ queryId, imageDataUrl, onSubmitted }) => {
  const [form, setForm] = useState({
    description: '',
    quantity: '',
    contactName: '',
    contactPhone: '',
    company: '',
    extraNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.contactName.trim() || !form.contactPhone.trim()) {
      setError('نام و شماره تماس الزامی است.');
      return;
    }
    if (form.description.trim().length < 5) {
      setError('لطفاً توضیح کوتاهی درباره قطعه موردنیاز بنویسید.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await visualProductSearchService.submitCustomRequest({
        ...form,
        queryId,
        imageBase64: imageDataUrl,
      });
      if (res.success) {
        setSubmitted(res.requestId);
        onSubmitted?.(res.requestId);
      } else {
        setError('ثبت درخواست ناموفق بود. لطفاً دوباره تلاش کنید.');
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در ارتباط با سرور.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-white" />
        </div>
        <h4 className="text-base font-black text-emerald-800">درخواست شما با موفقیت ثبت شد</h4>
        <p className="text-xs text-emerald-700 leading-relaxed max-w-md mx-auto">
          کارشناسان فنی اطلس تصویر و مشخصات قطعه شما را بررسی می‌کنند و نتیجه را با شما تماس خواهند گرفت.
        </p>
        <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-800 bg-white border border-emerald-200 rounded-lg px-3 py-1.5">
          شماره پیگیری: {submitted}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0A172F] flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5 text-[#F97316]" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-black text-[#0A172F]">درخواست ساخت / تأمین سفارشی</h4>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            اگر قطعه‌ی شما در کاتالوگ موجود نیست، اطلاعات زیر را تکمیل کنید تا امکان ساخت یا تأمین آن بررسی شود.
          </p>
        </div>
      </div>

      {imageDataUrl && (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <img src={imageDataUrl} alt="تصویر قطعه ارسالی" className="w-16 h-16 object-contain bg-white rounded-lg border border-slate-200" />
          <div className="text-[11px] text-[#475569] leading-relaxed">
            تصویر ارسالی شما به‌صورت خودکار به این درخواست پیوست می‌شود.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[11px] font-bold text-[#0A172F]">توضیحات قطعه <span className="text-red-500">*</span></label>
          <textarea
            value={form.description}
            onChange={update('description')}
            rows={3}
            placeholder="مثال: تسمه تایمینگ پهن، تعداد دندانه حدود ۶۰، کاربرد روی خط انتقال کاشی..."
            className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#F97316] text-[#0A172F] resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#0A172F]">تعداد موردنیاز</label>
          <input
            value={form.quantity}
            onChange={update('quantity')}
            placeholder="مثال: ۲ عدد"
            className="w-full h-10 bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-xs focus:outline-none focus:border-[#F97316] text-[#0A172F]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#0A172F]">نام و نام خانوادگی <span className="text-red-500">*</span></label>
          <input
            value={form.contactName}
            onChange={update('contactName')}
            placeholder="نام شما"
            className="w-full h-10 bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-xs focus:outline-none focus:border-[#F97316] text-[#0A172F]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#0A172F]">شماره تماس <span className="text-red-500">*</span></label>
          <input
            value={form.contactPhone}
            onChange={update('contactPhone')}
            dir="ltr"
            placeholder="09xxxxxxxxx"
            className="w-full h-10 bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-xs focus:outline-none focus:border-[#F97316] text-[#0A172F] text-left"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#0A172F]">نام شرکت / کارخانه</label>
          <input
            value={form.company}
            onChange={update('company')}
            placeholder="اختیاری"
            className="w-full h-10 bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 text-xs focus:outline-none focus:border-[#F97316] text-[#0A172F]"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[11px] font-bold text-[#0A172F]">توضیحات تکمیلی</label>
          <textarea
            value={form.extraNotes}
            onChange={update('extraNotes')}
            rows={2}
            placeholder="ابعاد، جنس، برند، شرایط کارکرد یا هر نکته‌ی دیگر..."
            className="w-full bg-slate-50 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#F97316] text-[#0A172F] resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        <span>{submitting ? 'در حال ارسال...' : 'ارسال درخواست ساخت / تأمین سفارشی'}</span>
      </button>
    </form>
  );
};
