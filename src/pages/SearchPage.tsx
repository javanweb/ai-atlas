import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchProducts } from '../data/mockGenerator';
import { ProductCard } from '../components/product/ProductCard';
import { Search, ChevronLeft } from 'lucide-react';
import { toPersianDigits } from '../utils/formatters';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(queryParam);

  const results = useMemo(() => {
    return searchProducts(queryParam, 48);
  }, [queryParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      setSearchParams({ q: localQuery.trim() });
    }
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-[#64748B]">
        <Link to="/" className="hover:text-[#F97316]">
          صفحه اصلی
        </Link>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-[#0A172F] font-bold">نتایج جستجوی قطعات</span>
      </nav>

      {/* Search Header */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-6 shadow-sm">
        <form onSubmit={handleSearch} className="max-w-2xl flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={localQuery}
              onChange={e => setLocalQuery(e.target.value)}
              placeholder="جستجو در کاتالوگ ۸۶۴ قطعه با کد فنی (مانند AT-E045)، نام یا برند..."
              className="w-full h-11 pr-10 pl-4 bg-slate-50 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#F97316] text-[#0A172F]"
            />
            <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            className="px-6 h-11 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            جستجو
          </button>
        </form>

        <div className="mt-4 text-xs text-[#64748B] flex items-center justify-between">
          <div>
            نتیجه جستجو برای: <strong className="text-[#0A172F]">«{queryParam || 'همه محصولات'}»</strong>
          </div>
          <div className="font-mono">
            {toPersianDigits(results.length)} کالا پیدا شد
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {results.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-12 text-center text-slate-500 space-y-3">
          <p className="text-base font-bold text-[#0A172F]">کالایی مطابق با عبارت جستجو یافت نشد.</p>
          <p className="text-xs">
            پیشنهاد: کد کالا را با پیشوند <span className="font-mono font-bold">AT-E</span> (مانند <span className="font-mono font-bold">AT-E001</span> یا <span className="font-mono font-bold">AT-E045</span>) یا نام قطعه را جستجو فرمایید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map(product => (
            <ProductCard key={product.code} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
