import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAllProducts } from '../data/mockGenerator';
import { CATEGORIES } from '../data/categories';
import { Product } from '../types';
import { toPersianDigits } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import {
  Search,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Eye,
  Check,
  Package,
  Layers,
  Sparkles,
  Grid3X3,
  List,
  RotateCcw,
  Tag,
  Cpu,
  Grid,
  CircleDot,
  Shield,
  Link as LinkIcon,
  Scissors,
  ShieldCheck,
  ArrowUpDown,
  Image as ImageIcon
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'power-transmission': <Cpu className="w-4 h-4" />,
  'industrial-belts': <Layers className="w-4 h-4" />,
  'ceramic-tiles': <Grid className="w-4 h-4" />,
  'pulleys-idlers': <CircleDot className="w-4 h-4" />,
  'bearings-bushings': <Shield className="w-4 h-4" />,
  'chains-sprockets': <LinkIcon className="w-4 h-4" />,
  'textile-machinery': <Scissors className="w-4 h-4" />,
  'swr-forza-exclusive': <ShieldCheck className="w-4 h-4" />,
};

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, openAuthModal } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  // URL-driven or local state
  const categoryParam = searchParams.get('category') || 'all';
  const queryParam = searchParams.get('q') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>(queryParam);
  const [sortBy, setSortBy] = useState<'code_asc' | 'name_asc' | 'rating_desc' | 'stock_desc'>('code_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [hasCatalogueImageFilter, setHasCatalogueImageFilter] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [addedItemCode, setAddedItemCode] = useState<string | null>(null);

  const PAGE_SIZE = 24;
  const allProducts = useMemo(() => getAllProducts(), []);

  // Total products with official uploaded catalogue images
  const countWithImages = useMemo(() => {
    return allProducts.filter(p => p.hasCatalogueImage).length;
  }, [allProducts]);

  // Synchronize category state if URL changes
  useEffect(() => {
    if (categoryParam !== selectedCategory) {
      setSelectedCategory(categoryParam);
      setSelectedSubcategory('all');
      setCurrentPage(1);
    }
  }, [categoryParam]);

  // Available brands in the entire catalog
  const allBrands = useMemo(() => {
    const bSet = new Set<string>();
    allProducts.forEach(p => bSet.add(p.brand));
    return Array.from(bSet).sort();
  }, [allProducts]);

  // Active category object
  const activeCategoryObj = useMemo(() => {
    return CATEGORIES.find(c => c.slug === selectedCategory);
  }, [selectedCategory]);

  // Subcategories for current category
  const availableSubcategories = useMemo(() => {
    if (!activeCategoryObj) {
      const subSet = new Set<string>();
      allProducts.forEach(p => subSet.add(p.subcategory));
      return Array.from(subSet).slice(0, 10);
    }
    return activeCategoryObj.subcategories;
  }, [activeCategoryObj, allProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // 1. Category Filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'swr-forza-exclusive') {
        result = result.filter(
          p =>
            p.categorySlug === 'swr-forza-exclusive' ||
            p.brand.includes('SWR') ||
            p.brand.includes('FORZA')
        );
      } else {
        result = result.filter(p => p.categorySlug === selectedCategory);
      }
    }

    // 2. Subcategory Filter
    if (selectedSubcategory !== 'all') {
      result = result.filter(p => p.subcategory === selectedSubcategory);
    }

    // 3. Brand Filter
    if (selectedBrand !== 'all') {
      result = result.filter(p => p.brand === selectedBrand);
    }

    // 4. In-Stock Filter
    if (inStockOnly) {
      result = result.filter(p => p.stock > 0 && !p.inquiryOnly);
    }

    // 5. Official Catalogue Image Filter
    if (hasCatalogueImageFilter) {
      result = result.filter(p => p.hasCatalogueImage);
    }

    // 6. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        p =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
          p.brand.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
          (p.technicalSpecs &&
            p.technicalSpecs.some(
              s => s.key.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
            ))
      );
    }

    // 7. Sorting
    result.sort((a, b) => {
      if (sortBy === 'code_asc') {
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'fa');
      }
      if (sortBy === 'rating_desc') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'stock_desc') {
        return b.stock - a.stock;
      }
      return 0;
    });

    return result;
  }, [allProducts, selectedCategory, selectedSubcategory, selectedBrand, inStockOnly, hasCatalogueImageFilter, searchQuery, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setSelectedSubcategory('all');
    setCurrentPage(1);
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal();
      return;
    }
    addToCart(product, 1);
    setAddedItemCode(product.code);
    setTimeout(() => setAddedItemCode(null), 1500);
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedBrand('all');
    setSearchQuery('');
    setInStockOnly(false);
    setHasCatalogueImageFilter(false);
    setSortBy('code_asc');
    setCurrentPage(1);
    setSearchParams({});
  };

  const activeFiltersCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedSubcategory !== 'all' ? 1 : 0) +
    (selectedBrand !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (hasCatalogueImageFilter ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link to="/" className="hover:text-orange-600 transition-colors">
            صفحه اصلی
          </Link>
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-800 font-bold">محصولات و کاتالوگ صنعتی</span>
          {activeCategoryObj && (
            <>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-orange-600 font-bold">{activeCategoryObj.name}</span>
            </>
          )}
        </nav>

        {/* Minimal Hero Header Banner */}
        <div className="bg-gradient-to-l from-[#0A172F] via-[#111F38] to-[#1E293B] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>کاتالوگ کامل قطعات صنعتی و خطوط تولید بازرگانی اطلس</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                محصولات و قطعات صنعتی
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                مشاهده و استعلام تمامی {toPersianDigits(allProducts.length)} قطعه ثبت‌شده کاتالوگ شامل انواع تسمه‌های انتقال قدرت، غلتک‌های سرامیکی، پولی‌های بالانس‌شده، بلبرینگ و زنجیرهای صنعتی با تصاویر و مشخصات فنی دقیق.
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[100px]">
                <span className="block text-2xl font-black text-orange-400 font-mono">
                  {toPersianDigits(allProducts.length)}
                </span>
                <span className="text-[11px] text-slate-300">کل محصولات</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 text-center min-w-[100px]">
                <span className="block text-2xl font-black text-white font-mono">
                  {toPersianDigits(CATEGORIES.length)}
                </span>
                <span className="text-[11px] text-slate-300">دسته‌بندی اصلی</span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Category Selector Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => handleCategorySelect('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0A172F] text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>همه محصولات</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {toPersianDigits(allProducts.length)}
              </span>
            </button>

            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.slug;
              const icon = CATEGORY_ICONS[cat.slug] || <Layers className="w-4 h-4" />;
              return (
                <button
                  key={cat.slug}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className={isSelected ? 'text-white' : 'text-slate-500'}>
                    {icon}
                  </span>
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {toPersianDigits(cat.count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Secondary Filters & View Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="جستجو در کد فنی قطعه (مثلاً AT-E045)، نام قطعه، برند یا مشخصات..."
                className="w-full pr-10 pl-24 h-10 bg-slate-50 text-xs text-slate-800 rounded-xl border border-slate-200 focus:border-orange-500 focus:bg-white focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded cursor-pointer"
                >
                  پاک کردن
                </button>
              )}
            </div>

            {/* Filter Dropdowns & Sorting */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Brand Filter */}
              <div className="relative">
                <select
                  value={selectedBrand}
                  onChange={e => {
                    setSelectedBrand(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 px-3 bg-slate-50 text-xs font-bold text-slate-700 rounded-xl border border-slate-200 focus:border-orange-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                >
                  <option value="all">همه برندها ({toPersianDigits(allBrands.length)})</option>
                  {allBrands.map(b => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="h-10 px-3 bg-slate-50 text-xs font-bold text-slate-700 rounded-xl border border-slate-200 focus:border-orange-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                >
                  <option value="code_asc">مرتب‌سازی: کد فنی (صعودی)</option>
                  <option value="name_asc">مرتب‌سازی: نام قطعه (الفبا)</option>
                  <option value="rating_desc">مرتب‌سازی: بیشترین امتیاز</option>
                  <option value="stock_desc">مرتب‌سازی: موجودی انبار</option>
                </select>
              </div>

              {/* In Stock Toggle */}
              <label className="flex items-center gap-2 h-10 px-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs font-bold text-slate-700 select-none hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={e => {
                    setInStockOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>فقط کالاهای موجود</span>
              </label>

              {/* Official Catalogue Image Toggle */}
              <label className={`flex items-center gap-2 h-10 px-3 rounded-xl border cursor-pointer text-xs font-bold select-none transition-all ${
                hasCatalogueImageFilter
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}>
                <input
                  type="checkbox"
                  checked={hasCatalogueImageFilter}
                  onChange={e => {
                    setHasCatalogueImageFilter(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>دارای تصویر کاتالوگ ({toPersianDigits(countWithImages)})</span>
              </label>

              {/* View Mode Toggle (Grid vs List) */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  title="نمایش شبکه‌ای"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="نمایش لیستی"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Reset Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  title="بازنشانی فیلترها"
                  className="flex items-center gap-1 h-10 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>پاکسازی فیلترها</span>
                </button>
              )}
            </div>
          </div>

          {/* Subcategory Chips if available */}
          {availableSubcategories.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              <span className="text-[11px] font-bold text-slate-400 shrink-0">زیرگروه‌ها:</span>
              <button
                onClick={() => {
                  setSelectedSubcategory('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  selectedSubcategory === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه زیرگروه‌ها
              </button>
              {availableSubcategories.map(sub => (
                <button
                  key={sub}
                  onClick={() => {
                    setSelectedSubcategory(sub);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    selectedSubcategory === sub
                      ? 'bg-orange-500 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Count & Active Status */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <div>
            نمایش <span className="font-bold text-slate-800 font-mono">{toPersianDigits(paginatedProducts.length)}</span> از{' '}
            <span className="font-bold text-orange-600 font-mono">{toPersianDigits(filteredProducts.length)}</span> کالا
            {selectedCategory !== 'all' && (
              <span> در دسته <span className="font-bold text-slate-800">{activeCategoryObj?.name || selectedCategory}</span></span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            صفحه <span className="font-bold font-mono">{toPersianDigits(currentPage)}</span> از{' '}
            <span className="font-bold font-mono">{toPersianDigits(totalPages)}</span>
          </div>
        </div>

        {/* Products Display (Grid or List) */}
        {paginatedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 mx-auto flex items-center justify-center">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">
              هیچ محصولی با معیارهای انتخابی شما یافت نشد
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              لطفاً فیلترها را تغییر داده یا واژه جستجوی دیگری را وارد کنید. برای مشاهده همه محصولات دکمه زیر را لمس نمایید.
            </p>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>مشاهده تمام ۸۶۴ قطعه</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {paginatedProducts.map(product => {
              const isFav = isInWishlist(product.code);
              const isAdded = addedItemCode === product.code;

              return (
                <div
                  key={product.code}
                  className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(10,23,47,0.03)] hover:shadow-[0_12px_30px_rgba(10,23,47,0.08)] hover:border-orange-300 transition-all duration-300 overflow-hidden text-right h-full"
                >
                  {/* Top Bar: Code, Subcategory Badge, Wishlist */}
                  <div className="p-3 pb-1 flex items-center justify-between gap-1 z-10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-[#0A172F] tracking-wide border border-slate-200">
                        {product.code}
                      </span>
                      {product.cataloguePage && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          ص {toPersianDigits(product.cataloguePage)}
                        </span>
                      )}
                      {product.hasCatalogueImage && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                          <span>تصویر کاتالوگ</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWishlist(product.code);
                      }}
                      title="افزودن به علاقه‌مندی‌ها"
                      className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-red-500 text-red-500' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Clean White Product Image Frame */}
                  <Link
                    to={`/product/${encodeURIComponent(product.code)}`}
                    className="relative block w-full pt-[68%] bg-slate-50/50 overflow-hidden"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Card Body */}
                  <div className="flex flex-col flex-1 p-3.5 pt-2">
                    {/* Brand & Category Links */}
                    <div className="flex items-center justify-between text-[11px] mb-1.5 gap-1">
                      <Link
                        to={`/category/${product.categorySlug}`}
                        className="font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200/70 truncate max-w-[55%] transition-colors"
                        title={product.categoryName}
                      >
                        {product.categoryName}
                      </Link>
                      <span className="text-slate-500 text-[10px] truncate max-w-[42%] text-left" title={product.subcategory}>
                        {product.subcategory}
                      </span>
                    </div>

                    {/* Product Name */}
                    <Link
                      to={`/product/${encodeURIComponent(product.code)}`}
                      className="font-bold text-xs sm:text-sm text-[#0A172F] hover:text-orange-600 line-clamp-2 min-h-[38px] leading-relaxed transition-colors mb-2"
                      title={product.name}
                    >
                      {product.name}
                    </Link>

                    {/* Brand line */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                      <span className="text-slate-400">سازنده:</span>
                      <span className="font-bold text-slate-700 truncate">{product.brand}</span>
                    </div>

                    {/* Technical Specs Mini Preview */}
                    {product.technicalSpecs && product.technicalSpecs.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-2 text-[10px] text-slate-600 space-y-1 mb-3 border border-slate-100">
                        {product.technicalSpecs.slice(0, 2).map((spec, i) => (
                          <div key={i} className="flex items-center justify-between truncate">
                            <span className="text-slate-400">{spec.key}:</span>
                            <span className="font-medium text-slate-700">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Bar / Inquire Button */}
                    <div className="mt-auto pt-2 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        to={`/product/${encodeURIComponent(product.code)}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#0A172F] hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>مشاهده مشخصات</span>
                      </Link>

                      <button
                        onClick={e => handleAddToCart(product, e)}
                        title="ثبت در سبد استعلام"
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-400'
                        }`}
                      >
                        {isAdded ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <ShoppingCart className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {paginatedProducts.map(product => {
              const isFav = isInWishlist(product.code);
              const isAdded = addedItemCode === product.code;

              return (
                <div
                  key={product.code}
                  className="group bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-orange-300 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-4 text-right"
                >
                  {/* Thumbnail Image */}
                  <Link
                    to={`/product/${encodeURIComponent(product.code)}`}
                    className="w-full sm:w-28 h-28 bg-slate-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-2 border border-slate-100 group-hover:border-orange-200"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-[#0A172F] border border-slate-200">
                        {product.code}
                      </span>
                      {product.hasCatalogueImage && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                          <span>تصویر کاتالوگ</span>
                        </span>
                      )}
                      <Link
                        to={`/category/${product.categorySlug}`}
                        className="text-[11px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                      >
                        {product.categoryName}
                      </Link>
                      <span className="text-[11px] text-slate-500">{product.subcategory}</span>
                    </div>

                    <Link
                      to={`/product/${encodeURIComponent(product.code)}`}
                      className="block font-bold text-sm sm:text-base text-slate-900 hover:text-orange-600 transition-colors truncate"
                    >
                      {product.name}
                    </Link>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      {product.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>سازنده: <strong className="text-slate-700">{product.brand}</strong></span>
                      <span>موجودی: <strong className="text-emerald-600">{toPersianDigits(product.stock)} عدد</strong></span>
                      {product.cataloguePage && (
                        <span>صفحه کاتالوگ: <strong className="text-slate-700">{toPersianDigits(product.cataloguePage)}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-r border-slate-100 pt-3 sm:pt-0 sm:pr-4">
                    <Link
                      to={`/product/${encodeURIComponent(product.code)}`}
                      className="flex-1 sm:w-36 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#0A172F] hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>مشاهده جزئیات</span>
                    </Link>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => handleAddToCart(product, e)}
                        className={`flex-1 sm:w-28 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isAdded
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-orange-300 text-orange-600 hover:bg-orange-50'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>ثبت شد</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>استعلام</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => toggleWishlist(product.code)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="نشان کردن"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              نمایش ردیف <span className="font-mono font-bold">{toPersianDigits((currentPage - 1) * PAGE_SIZE + 1)}</span> تا{' '}
              <span className="font-mono font-bold">{toPersianDigits(Math.min(currentPage * PAGE_SIZE, filteredProducts.length))}</span> از{' '}
              <span className="font-mono font-bold text-orange-600">{toPersianDigits(filteredProducts.length)}</span> قطعه
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="صفحه قبلی"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, idx, arr) => {
                  const prevVal = arr[idx - 1];
                  const showEllipsis = prevVal && p - prevVal > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-2 text-slate-400 text-xs">...</span>}
                      <button
                        onClick={() => {
                          setCurrentPage(p);
                          window.scrollTo({ top: 400, behavior: 'smooth' });
                        }}
                        className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                          currentPage === p
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {toPersianDigits(p)}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="صفحه بعدی"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
