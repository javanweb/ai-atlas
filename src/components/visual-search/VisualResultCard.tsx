import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileSearch, Package, ShieldCheck, Tag, CheckCircle2 } from 'lucide-react';
import type { VisualSearchItem } from '../../services/visualProductSearchService';
import { formatPrice, toPersianDigits } from '../../utils/formatters';

interface VisualResultCardProps {
  item: VisualSearchItem;
  /** حالت EXACT: کارت بزرگ‌تر و تأکیدی */
  variant?: 'exact' | 'similar';
}

/**
 * کارت نتیجه — برای هر دو حالت «محصول دقیق» و «محصولات مشابه».
 * طبق سیاست پروژه، هیچ درصد شباهتی روی کارت نمایش داده نمی‌شود.
 */
export const VisualResultCard: React.FC<VisualResultCardProps> = ({ item, variant = 'similar' }) => {
  const isExact = variant === 'exact';

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${
        isExact ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-[#E2E8F0]'
      }`}
    >
      {isExact && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-black text-emerald-700">محصول موردنظر شما پیدا شد</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 p-4">
        <div
          className={`shrink-0 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden ${
            isExact ? 'w-full sm:w-52 h-52' : 'w-full sm:w-36 h-36'
          }`}
        >
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-contain p-1"
            onError={e => {
              (e.target as HTMLImageElement).style.opacity = '0.25';
            }}
          />
        </div>

        <div className="flex-1 space-y-2.5 min-w-0">
          <div className="space-y-1">
            <h4 className={`font-black text-[#0A172F] leading-snug ${isExact ? 'text-base sm:text-lg' : 'text-sm'}`}>
              {item.name}
            </h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1 font-mono font-bold text-[#0A172F] bg-slate-100 px-2 py-0.5 rounded">
                <Tag className="w-3 h-3 text-[#F97316]" />
                {item.sku}
              </span>
              {item.forzaCode && (
                <span className="font-mono">{item.forzaCode.replace(/FORZACODE\s*:\s*/i, 'کد فورزا: ')}</span>
              )}
              <span>{item.brand}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="bg-slate-50 border border-slate-200 text-[#475569] px-2 py-0.5 rounded-lg">
              {item.categoryName}
            </span>
            {item.subcategory && (
              <span className="bg-slate-50 border border-slate-200 text-[#475569] px-2 py-0.5 rounded-lg">
                {item.subcategory}
              </span>
            )}
            {item.cataloguePage ? (
              <span className="bg-slate-50 border border-slate-200 text-[#475569] px-2 py-0.5 rounded-lg">
                صفحه {toPersianDigits(item.cataloguePage)} کاتالوگ
              </span>
            ) : null}
          </div>

          {item.reason && (
            <p className="text-[11px] leading-relaxed text-[#475569] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <FileSearch className="w-3.5 h-3.5 text-[#F97316] mt-0.5 shrink-0" />
              <span>{item.reason}</span>
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs">
              {item.price > 0 ? (
                <span className="font-black text-[#0A172F]">{formatPrice(item.price)}</span>
              ) : (
                <span className="font-bold text-amber-600">قیمت: استعلامی</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
              <Package className="w-3.5 h-3.5" />
              <span>{item.stock > 0 ? `موجود (${toPersianDigits(item.stock)})` : 'ناموجود در انبار مرکزی'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Link
              to={item.productUrl}
              className="flex-1 h-10 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>مشاهده محصول</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              to={item.productUrl}
              className="flex-1 h-10 px-4 bg-white hover:bg-slate-50 text-[#0A172F] font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F97316]" />
              <span>استعلام / درخواست قیمت</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
