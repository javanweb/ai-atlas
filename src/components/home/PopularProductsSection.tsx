import React, { useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  ArrowLeft,
  Check,
  Phone,
  Calculator,
  Flame,
  Send,
  X,
  Eye,
} from 'lucide-react';
import { USER_PRODUCTS } from '../../data/userProducts';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { Modal } from '../ui/Modal';
import { Product } from '../../types';

export const PopularProductsSection: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  // Curate popular spotlight items across categories from real products
  const popularProducts = useMemo(() => {
    // Pick 12 representative products from the catalog
    const featuredCodes = [
      'AT-E001', // کوپلینگ لاستیکی خاری HRC
      'AT-E045', // تسمه V-Belt دنده‌ای SWR
      'AT-E095', // غلتک سرامیکی نسوز کوره اطلس
      'AT-E155', // فولی چدنی شیاردار FORZA
      'AT-E205', // بلبرینگ شیار عمیق دور بالا
      'AT-E255', // زنجیر غلتکی صنعتی
      'AT-E290', // تسمه اسپیندل ریسندگی
      'AT-E055', // تسمه تایمینگ HTD
      'AT-E012', // چرخ‌دنده محرک صنعتی
      'AT-E110', // گلوله سرامیکی ضدسایش آلومینایی
      'AT-E180', // بوش مخروطی تیپر لاک Taper Lock
      'AT-E230', // یاتاقان هوزینگ‌دار UCP
    ];

    const matched = USER_PRODUCTS.filter(p => featuredCodes.includes(p.code));
    if (matched.length >= 8) {
      return matched;
    }
    // Fallback: take first 12 items
    return USER_PRODUCTS.slice(0, 12);
  }, []);

  // Quick Inquiry Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerPhone, setCustomerPhone] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [quickAddedCode, setQuickAddedCode] = useState<string | null>(null);

  // Carousel scroll tracking
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrolled = Math.abs(el.scrollLeft) > 10;
    setCanScrollRight(scrolled);
  };

  const handleScrollLeft = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollBy({ left: -320, behavior: 'smooth' });
      setCanScrollRight(true);
    }
  };

  const handleScrollRight = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollBy({ left: 320, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim() || !selectedProduct) return;

    // Simulate inquiry submission
    setInquirySubmitted(true);
    setTimeout(() => {
      setInquirySubmitted(false);
      setSelectedProduct(null);
      setCustomerPhone('');
      setQuantity(1);
    }, 2000);
  };

  const handleQuickInquiry = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addToCart(product, 1);
    setQuickAddedCode(product.code);
    setTimeout(() => setQuickAddedCode(null), 1800);
  };

  return (
    <section className="space-y-5" dir="rtl">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5">
        {/* Right Title: محصولات پربازدید */}
        <div className="flex items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black text-[#0A172F] tracking-tight">
            محصولات پربازدید
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200/60">
            <Flame className="w-3 h-3 fill-orange-500 text-orange-500" />
            <span>منتخب قطعات پرکاربرد صنایع</span>
          </span>
        </div>

        {/* Left Link: مشاهده همه محصولات */}
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#F97316] hover:text-[#EA580C] transition-colors group"
        >
          <span>مشاهده همه ۸۶۴ محصول</span>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Carousel Container with Left/Right Navigation Arrows */}
      <div className="relative group/carousel">
        {/* Navigation Arrow: Right */}
        <button
          type="button"
          onClick={handleScrollRight}
          className={`absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-lg text-[#0A172F] hover:text-white hover:bg-[#F97316] hover:border-[#F97316] flex items-center justify-center transition-all duration-300 cursor-pointer group active:scale-95 ${
            canScrollRight ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-75 pointer-events-none'
          }`}
          aria-label="محصولات قبلی"
        >
          <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Navigation Arrow: Left */}
        <button
          type="button"
          onClick={handleScrollLeft}
          className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white border border-slate-200/90 shadow-lg text-[#0A172F] hover:text-white hover:bg-[#F97316] hover:border-[#F97316] flex items-center justify-center transition-all duration-300 cursor-pointer group active:scale-95"
          aria-label="محصولات بعدی"
        >
          <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Scrollable Products Row */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {popularProducts.map(product => {
            const isFav = isInWishlist(product.code);
            const isJustAdded = quickAddedCode === product.code;

            return (
              <div
                key={product.code}
                className="w-48 sm:w-60 shrink-0 bg-white rounded-2xl border border-slate-200/85 p-3 sm:p-4 shadow-2xs hover:shadow-lg hover:border-orange-300 transition-all duration-300 relative flex flex-col justify-between group snap-start text-right"
              >
                {/* Top Badge: Code & Brand */}
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="px-2 py-0.5 bg-[#F97316] text-white text-[10px] font-bold rounded-md shadow-2xs">
                    {product.brand}
                  </span>

                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {product.code}
                  </span>
                </div>

                {/* Product Image on Clean Canvas */}
                <Link
                  to={`/product/${encodeURIComponent(product.code)}`}
                  className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50/60 flex items-center justify-center p-2 mb-2 cursor-pointer group-hover:scale-105 transition-transform duration-300"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-contain"
                  />
                </Link>

                {/* Product Title */}
                <div className="space-y-1 my-1">
                  <Link
                    to={`/product/${encodeURIComponent(product.code)}`}
                    className="block font-bold text-xs sm:text-sm text-[#0A172F] hover:text-[#F97316] transition-colors line-clamp-1"
                    title={product.name}
                  >
                    {product.name}
                  </Link>
                  <Link
                    to={`/category/${product.categorySlug}`}
                    className="block text-[10px] text-orange-600 hover:underline line-clamp-1 font-medium"
                  >
                    {product.categoryName}
                  </Link>
                </div>

                {/* Inquiry Price Button */}
                <div className="pt-2 pb-2 text-center border-t border-slate-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-orange-50 hover:bg-orange-100/90 text-[#F97316] hover:text-[#EA580C] text-xs font-black rounded-lg border border-orange-200/80 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>استعلام قیمت رسمی</span>
                    <Calculator className="w-3.5 h-3.5 text-[#F97316]" />
                  </button>
                </div>

                {/* Bottom Action Icons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-400">
                  {/* Heart / Wishlist Icon */}
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(product.code);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="افزودن به علاقه‌مندی‌ها"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFav ? 'fill-red-500 text-red-500' : 'hover:scale-110 transition-transform'
                      }`}
                    />
                  </button>

                  <div className="flex items-center gap-1">
                    <Link
                      to={`/product/${encodeURIComponent(product.code)}`}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                      title="مشاهده جزئیات قطعه"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    {/* Cart / Inquiry Quick Button */}
                    <button
                      type="button"
                      onClick={e => handleQuickInquiry(product, e)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        isJustAdded
                          ? 'bg-emerald-500 text-white'
                          : 'hover:bg-orange-50 hover:text-[#F97316] text-slate-500'
                      }`}
                      title="افزودن به لیست استعلام"
                    >
                      {isJustAdded ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 hover:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Inquiry Modal */}
      {selectedProduct && (
        <Modal
          isOpen={Boolean(selectedProduct)}
          onClose={() => {
            setSelectedProduct(null);
            setInquirySubmitted(false);
          }}
          title={`استعلام سریع: ${selectedProduct.name}`}
        >
          {inquirySubmitted ? (
            <div className="text-center py-8 space-y-3" dir="rtl">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-800">درخواست استعلام ثبت شد</h4>
              <p className="text-xs text-slate-500">
                کارشناسان واحد فروش هایپر صنعت اطلس در کوتاه‌ترین زمان با شما تماس خواهند گرفت.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} className="space-y-4" dir="rtl">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={selectedProduct.images[0]}
                  alt={selectedProduct.name}
                  className="w-14 h-14 object-contain bg-white rounded-lg p-1 border border-slate-200"
                />
                <div>
                  <div className="font-bold text-xs text-[#0A172F]">{selectedProduct.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">کد: {selectedProduct.code}</div>
                  <div className="text-[11px] text-orange-600 font-semibold">{selectedProduct.categoryName}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تعداد مورد نیاز:
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شماره موبایل جهت دریافت پیش‌فاکتور:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full h-10 pr-9 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال فوری استعلام</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="h-10 px-4 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </section>
  );
};
