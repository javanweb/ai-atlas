import React, { useEffect, useState } from 'react';
import { Loader2, ScanSearch, Cpu, Layers, Sparkles } from 'lucide-react';

const STEPS = [
  { icon: ScanSearch, label: 'بررسی تصویر ارسالی', hint: 'تشخیص قطعه از پس‌زمینه و نرمال‌سازی نور' },
  { icon: Cpu, label: 'استخراج ویژگی‌های بصری', hint: 'شکل، هندسه و ساختار قطعه' },
  { icon: Layers, label: 'جستجو در کاتالوگ محصولات', hint: 'مقایسه با تصاویر کالاهای اطلس' },
  { icon: Sparkles, label: 'راستی‌آزمایی تطابق', hint: 'تأیید نهایی انطباق قطعه' },
];

/**
 * تجربه‌ی کاربر هنگام پردازش (طبق §۱۶):
 * فقط پیام ساده و انسانی — هیچ اصطلاح فنی مثل Embedding / Vector / Score نمایش داده نمی‌شود.
 */
export const VisualSearchProcessing: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-10 space-y-8">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Loader2 className="w-9 h-9 text-[#F97316] animate-spin" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0A172F] border-2 border-white flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-[#F97316]" />
          </span>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-black text-[#0A172F]">در حال بررسی تصویر و جستجو در محصولات...</h3>
          <p className="text-xs text-[#64748B]">لطفاً چند لحظه صبر کنید؛ نتیجه به‌صورت خودکار نمایش داده می‌شود.</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-2.5">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isDone = i < step;
          const isActive = i === step;
          return (
            <div
              key={s.label}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-300 ${
                isActive
                  ? 'border-[#F97316] bg-orange-50/70'
                  : isDone
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-[#F97316] text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold ${isActive ? 'text-[#0A172F]' : 'text-[#475569]'}`}>{s.label}</div>
                <div className="text-[10px] text-[#94A3B8] truncate">{s.hint}</div>
              </div>
              {isActive && <Loader2 className="w-3.5 h-3.5 text-[#F97316] animate-spin mr-auto shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
