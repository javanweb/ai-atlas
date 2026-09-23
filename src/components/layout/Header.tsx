import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User,
  Camera,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  Phone,
  Layers,
  ShieldCheck,
  Building,
  Award,
  Heart,
  FileText,
  Headphones,
  ClipboardList,
  Truck,
  LayoutGrid,
  Factory,
  Tag,
  Wrench,
  Users,
  BookOpen,
  Sparkles,
  ExternalLink,
  Instagram,
  Send,
  MessageCircle,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { CATEGORIES } from '../../data/categories';
import { BRANDS } from '../../data/brands';
import { getInstantSearchResults } from '../../data/mockGenerator';
import { toPersianDigits, formatPrice } from '../../utils/formatters';
import { Product } from '../../types';
import { AiVisualPartSearchModal } from '../search/AiVisualPartSearchModal';
import { AiConsultModal } from '../search/AiConsultModal';

type NavMenuType = 'products' | 'industries' | 'brands' | 'services' | 'about' | 'clients' | null;

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout, openAuthModal } = useAuth();
  const { itemCount } = useCart();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [liveResults, setLiveResults] = useState<{
    products: Product[];
    categories: typeof CATEGORIES;
    brands: typeof BRANDS;
  }>({ products: [], categories: [], brands: [] });

  // Navigation states
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<NavMenuType>(null);
  const [activeMegaCategory, setActiveMegaCategory] = useState(CATEGORIES[0].slug);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState<string | null>('categories');
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);

  // Modals
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const navBarRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Live search debouncing / update
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const res = getInstantSearchResults(searchQuery);
      setLiveResults(res as any);
      setIsSearchDropdownOpen(true);
    } else {
      setIsSearchDropdownOpen(false);
    }
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target as Node)) {
        setIsMegaMenuOpen(false);
      }
      if (navBarRef.current && !navBarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleOpenMenu = () => setIsMobileMenuOpen(true);
    const handleOpenSearch = () => {
      setIsMobileSearchOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('open-mobile-menu', handleOpenMenu);
    window.addEventListener('open-mobile-search', handleOpenSearch);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('open-mobile-menu', handleOpenMenu);
      window.removeEventListener('open-mobile-search', handleOpenSearch);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchDropdownOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const selectedCategoryObj = CATEGORIES.find(c => c.slug === activeMegaCategory) || CATEGORIES[0];

  return (
    <header className="sticky top-0 z-40 w-full shadow-sm">
      {/* 1. TOP NARROW BAR: Matching image.png exactly */}
      <div className="bg-[#050811] text-white text-[11px] py-1.5 px-4 border-b border-slate-800/80 select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4" dir="ltr">
          {/* Left Group (Trust & Capabilities) - placed on the left */}
          <div className="hidden lg:flex items-center gap-2.5 text-slate-300 font-medium" dir="rtl">
            <div className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Award className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
              <span>از سال ۱۳۹۶ همراه صنعت</span>
            </div>

            <span className="text-slate-700">|</span>

            <div className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Layers className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
              <span>هایپر صنعت؛ تأمین قطعات خطوط تولید | کارخانجات اطلس</span>
            </div>

            <span className="text-slate-700">|</span>

            <Link
              to="/category/swr-forza-exclusive"
              className="flex items-center gap-1.5 hover:text-[#F97316] transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
              <span>
                نمایندگی انحصاری <span className="font-sans font-bold text-orange-400">SWR</span> و{' '}
                <span className="font-sans font-bold text-blue-400">FORZA</span>
              </span>
            </Link>

            <span className="text-slate-700">|</span>

            <div className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Truck className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
              <span>ارسال به سراسر کشور</span>
            </div>
          </div>

          {/* Right Group (Phone Hotline, Contact Us, Social Channels) - placed on the right */}
          <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-3 text-slate-300" dir="ltr">
            {/* Phone Hotline with orange phone icon */}
            <a
              href="tel:03538739900"
              className="flex items-center gap-1.5 text-slate-200 hover:text-[#F97316] transition-colors font-mono text-xs"
              title="تلفن تماس مستقیم اطلس تریدینگ"
            >
              <Phone className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
              <span className="tracking-wide">۰۳۵-۳۸۷۳۹۹۰۰</span>
            </a>

            <span className="text-slate-700">|</span>

            {/* Contact Link */}
            <Link
              to="/contact"
              className="hover:text-[#F97316] text-slate-300 font-medium transition-colors text-[11px]"
            >
              تماس با ما
            </Link>

            <span className="text-slate-700">|</span>

            {/* Social Media Channels (Instagram, Telegram, WhatsApp, Eitaa) */}
            <div className="flex items-center gap-1.5">
              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-5 h-5 rounded-full bg-[#0D1524] border border-slate-700 hover:border-[#F97316] hover:text-[#F97316] flex items-center justify-center text-slate-300 transition-colors"
                title="اینستاگرام اطلس تریدینگ"
                aria-label="Instagram"
              >
                <Instagram className="w-2.5 h-2.5" />
              </a>

              {/* Telegram */}
              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                className="w-5 h-5 rounded-full bg-[#0D1524] border border-slate-700 hover:border-sky-400 hover:text-sky-400 flex items-center justify-center text-slate-300 transition-colors"
                title="کانال تلگرام اطلس"
                aria-label="Telegram"
              >
                <Send className="w-2.5 h-2.5" />
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/989903427027"
                target="_blank"
                rel="noreferrer"
                className="w-5 h-5 rounded-full bg-[#0D1524] border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 flex items-center justify-center text-slate-300 transition-colors"
                title="واتس‌اپ پشتیبانی فنی"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-2.5 h-2.5" />
              </a>

              {/* Eitaa / Aparat */}
              <a
                href="https://eitaa.com"
                target="_blank"
                rel="noreferrer"
                className="w-5 h-5 rounded-full bg-[#0D1524] border border-[#F97316]/60 hover:border-[#F97316] hover:bg-[#F97316]/20 flex items-center justify-center text-[#F97316] transition-colors font-bold text-[10px] leading-none"
                title="پیام‌رسان ایتا"
                aria-label="Eitaa"
              >
                <span>e</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN WHITE HEADER */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-3 sm:px-4 py-2.5 sm:py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Right: ATLAS TRADING Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0F172A] flex items-center justify-center text-white shadow-xs group-hover:bg-[#1E293B] transition-colors relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent pointer-events-none" />
                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-[#F97316]" />
              </div>
              <div className="flex flex-col text-right">
                <div className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-[#0F172A] leading-none">
                  هایپر صنعت
                </div>
                <div className="text-[9px] sm:text-[10px] text-[#F97316] font-bold tracking-tight mt-0.5 sm:mt-1 leading-none">
                  کارخانجات اطلس
                </div>
              </div>
            </Link>
          </div>

          {/* Center: Search Bar with Orange Button (Desktop) */}
          <div className="hidden lg:block flex-1 max-w-2xl relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setIsSearchDropdownOpen(true);
                }}
                placeholder="جستجوی قطعات خط تولید، تسمه، پولی، بلبرینگ، زنجیر..."
                className="w-full h-11 pr-4 pl-24 bg-slate-50 hover:bg-white text-[#0A172F] text-xs sm:text-sm rounded-xl border border-[#E2E8F0] focus:border-[#F97316] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 shadow-inner"
              />

              {/* Camera Icon for Visual Search → صفحه‌ی اطلس ویژوال سرچ */}
              <button
                type="button"
                onClick={() => navigate('/visual-search')}
                title="جستجوی تصویری قطعه (تشخیص قطعه با عکس)"
                className="absolute left-14 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-[#F97316] hover:bg-orange-50 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Orange Search Action Button */}
              <button
                type="submit"
                className="absolute left-1 top-1 bottom-1 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                aria-label="جستجو"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Live Instant Search Dropdown with 3 Sections */}
            {isSearchDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-full bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-50 text-right text-xs">
                {/* 1. Products Section */}
                {liveResults.products.length > 0 && (
                  <div className="p-3 border-b border-[#E2E8F0]">
                    <div className="text-[11px] font-bold text-[#64748B] mb-2 flex items-center justify-between">
                      <span>کالاهای یافت‌شده ({toPersianDigits(liveResults.products.length)})</span>
                      <span className="text-[10px] text-orange-600">Enter برای نمایش همه</span>
                    </div>
                    <div className="space-y-1.5">
                      {liveResults.products.map(p => (
                        <Link
                          key={p.code}
                          to={`/product/${p.code}`}
                          onClick={() => setIsSearchDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="w-8 h-8 rounded border border-slate-200 object-contain p-0.5 bg-white"
                            />
                            <div>
                              <div className="font-bold text-[#0A172F] group-hover:text-[#F97316] transition-colors line-clamp-1">
                                {p.name}
                              </div>
                              <div className="font-mono text-[10px] text-[#64748B]">
                                {p.code} | {p.brand}
                              </div>
                            </div>
                          </div>
                          <div className="font-bold text-[#0A172F] shrink-0 text-left">
                            {p.inquiryOnly ? (
                              <span className="text-amber-600 text-[11px]">استعلام قیمت</span>
                            ) : (
                              formatPrice(p.prices.retail)
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Categories Section */}
                {liveResults.categories.length > 0 && (
                  <div className="p-3 bg-slate-50/70 border-b border-[#E2E8F0]">
                    <div className="text-[11px] font-bold text-[#64748B] mb-2">دسته‌بندی‌های مرتبط</div>
                    <div className="flex flex-wrap gap-1.5">
                      {liveResults.categories.map(c => (
                        <Link
                          key={c.id}
                          to={`/category/${c.slug}`}
                          onClick={() => setIsSearchDropdownOpen(false)}
                          className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs hover:border-[#F97316] hover:text-[#F97316] transition-colors"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Brands Section */}
                {liveResults.brands.length > 0 && (
                  <div className="p-3 bg-slate-50/40">
                    <div className="text-[11px] font-bold text-[#64748B] mb-1.5">برندهای صنعتی</div>
                    <div className="flex flex-wrap gap-2">
                      {liveResults.brands.map(b => (
                        <Link
                          key={b.id}
                          to={`/category/swr-forza-exclusive`}
                          onClick={() => setIsSearchDropdownOpen(false)}
                          className="text-xs font-bold text-[#0A172F] hover:text-[#F97316] flex items-center gap-1"
                        >
                          <Award className="w-3 h-3 text-[#F97316]" />
                          <span>{b.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {liveResults.products.length === 0 &&
                  liveResults.categories.length === 0 &&
                  liveResults.brands.length === 0 && (
                    <div className="p-6 text-center text-[#64748B]">
                      موردی برای عبارت واردشده یافت نشد. دکمه Enter را برای جستجوی جامع فشار دهید.
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Left/End: Actions (RFQ Button, Cart, Favorites, User) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Mobile Search Toggle Button (Toggles Mobile Search Bar) */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(prev => !prev)}
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-slate-200 hover:border-[#F97316] hover:bg-orange-50/40 text-slate-700 hover:text-[#F97316] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-2xs"
              aria-label="جستجوی سریع قطعات"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* User Account / Login Button */}
            <div className="relative" ref={userMenuRef}>
              {currentUser ? (
                <button
                  onClick={() => setIsUserMenuOpen(prev => !prev)}
                  className="flex items-center gap-1 sm:gap-2 h-9 sm:h-10 px-2 sm:px-3 rounded-xl border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-50 transition-colors text-xs font-medium text-[#0A172F] cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#F97316]" />
                  <span className="hidden sm:inline font-bold truncate max-w-[110px]">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                </button>
              ) : (
                <button
                  onClick={() => openAuthModal()}
                  className="flex items-center gap-1 sm:gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-slate-200 hover:border-[#F97316] hover:bg-orange-50/40 transition-colors text-xs font-bold text-[#0A172F] cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="hidden md:inline">ورود / ثبت‌نام</span>
                </button>
              )}

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white text-[#0A172F] rounded-2xl shadow-xl border border-[#E2E8F0] py-2 z-50 animate-in fade-in text-right">
                  <div className="px-4 py-3 border-b border-[#E2E8F0] bg-slate-50/70">
                    <p className="text-xs font-bold text-[#0A172F]">مشتری گرامی: {currentUser?.fullName}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser?.phone}</p>
                  </div>
                  <div className="py-1 text-xs">
                    {currentUser?.role === 'dealer' ? (
                      <Link
                        to="/dealer"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-orange-50 text-[#F97316] font-bold border-b border-slate-100"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>ورود به پنل اختصاصی نمایندگی</span>
                      </Link>
                    ) : currentUser?.role === 'admin' ? (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-orange-50 text-[#F97316] font-bold border-b border-slate-100"
                      >
                        <Building className="w-4 h-4" />
                        <span>ورود به پنل اختصاصی مدیریت</span>
                      </Link>
                    ) : (
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 text-[#0A172F] font-bold border-b border-slate-100"
                      >
                        <User className="w-4 h-4 text-slate-500" />
                        <span>داشبورد مشتری (سفارشات و استعلام‌ها)</span>
                      </Link>
                    )}

                    <Link
                      to="/agency"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      درخواست اخذ نمایندگی و عاملیت
                    </Link>

                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-red-50 text-red-600 font-bold mt-1 border-t border-slate-100 cursor-pointer"
                    >
                      خروج از حساب
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Favorites Icon (Hidden on mobile) */}
            <Link
              to="/account"
              className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 hover:border-[#F97316] hover:bg-orange-50/40 text-[#0A172F] transition-colors text-xs font-medium"
              title="علاقه‌مندی‌ها"
            >
              <Heart className="w-4 h-4 text-slate-600" />
              <span className="hidden xl:inline">علاقه‌مندی‌ها</span>
            </Link>

            {/* Shopping Cart Icon with Badge */}
            <Link
              to="/cart"
              className="relative flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl border border-slate-200 hover:border-[#F97316] hover:bg-orange-50/40 text-[#0A172F] transition-colors text-xs font-medium"
              aria-label="سبد خرید"
            >
              <ShoppingCart className="w-4 h-4 text-slate-600" />
              <span className="hidden md:inline">سبد خرید</span>
              {itemCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-[#F97316] text-white text-[10px] font-mono font-bold">
                  {toPersianDigits(itemCount)}
                </span>
              )}
            </Link>

            {/* Inquiries / RFQ Button (Orange Accent Button) */}
            <Link
              to="/inquiry"
              className="hidden sm:flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">درخواست پیش‌فاکتور</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search Expandable Box */}
        {isMobileSearchOpen && (
          <div className="mt-2.5 lg:hidden pt-1 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجو در قطعات خطوط، تسمه، پولی، بلبرینگ..."
                className="w-full h-10 pr-10 pl-24 bg-slate-50 text-xs rounded-xl border border-[#E2E8F0] focus:border-[#F97316] focus:bg-white focus:outline-none transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              {/* Camera AI Visual Part Search Trigger → صفحه‌ی اطلس ویژوال سرچ */}
              <button
                type="button"
                onClick={() => navigate('/visual-search')}
                title="شناسایی تصویری قطعه با عکس"
                className="absolute left-11 top-1/2 -translate-y-1/2 p-1 text-orange-500 hover:text-orange-600"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Quick Submit */}
              <button
                type="submit"
                className="absolute left-1 top-1 bottom-1 px-3 bg-[#F97316] hover:bg-[#EA580C] text-white text-[11px] font-bold rounded-lg flex items-center justify-center transition-colors"
              >
                برو
              </button>
            </form>

            {/* Popular Quick Search Chips on Mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none text-[10px]" style={{ scrollbarWidth: 'none' }}>
              <span className="text-slate-400 shrink-0 font-medium">پیشنهادی:</span>
              {['تسمه تایم', 'پولی FORZA', 'بلبرینگ NSK', 'تسمه کانوایر', 'یاتاقان'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setSearchQuery(term);
                    navigate(`/search?q=${encodeURIComponent(term)}`);
                    setIsMobileSearchOpen(false);
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 rounded-md shrink-0 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. SUBHEADER NAVIGATION ROW: Dark Industrial Nav Bar matching image.png exactly */}
      <div className="bg-[#08101E] border-b border-slate-800 hidden lg:block text-xs text-white" ref={navBarRef}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          
          {/* Main Menus from Right to Left (matching image.png) */}
          <nav className="flex items-center gap-0.5 xl:gap-1 font-medium text-white" dir="rtl">
            
            {/* 1. همه محصولات (Orange LayoutGrid icon + Down Chevron) */}
            <div className="relative" ref={megaMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsMegaMenuOpen(prev => !prev);
                  setActiveDropdown(null);
                }}
                onMouseEnter={() => {
                  setActiveDropdown(null);
                }}
                className={`flex items-center gap-1.5 py-3 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${
                  isMegaMenuOpen ? 'text-[#F97316] bg-white/5' : 'text-white hover:text-[#F97316]'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-[#F97316] shrink-0" />
                <span className="font-bold">همه محصولات</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-[#F97316] transition-transform duration-200 ${
                    isMegaMenuOpen ? 'rotate-180 text-[#F97316]' : ''
                  }`}
                />
              </button>

              {/* Digikala-Style MegaMenu Dropdown */}
              {isMegaMenuOpen && (
                <div className="absolute right-0 top-full w-[780px] bg-white text-[#0A172F] rounded-b-2xl shadow-2xl border border-[#E2E8F0] flex overflow-hidden z-50 animate-in fade-in duration-150">
                  {/* Right Column: Categories List */}
                  <div className="w-64 bg-slate-50/80 border-l border-[#E2E8F0] p-2 space-y-1">
                    <Link
                      to="/products"
                      onClick={() => setIsMegaMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 mb-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        <span>مشاهده کل کاتالوگ (۸۶۴ قلم)</span>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Link>
                    <div className="text-[11px] font-bold text-[#64748B] px-3 py-1.5">
                      گروه‌های اصلی کاتالوگ
                    </div>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.slug}
                        onMouseEnter={() => setActiveMegaCategory(cat.slug)}
                        onClick={() => {
                          setIsMegaMenuOpen(false);
                          navigate(`/category/${cat.slug}`);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                          activeMegaCategory === cat.slug
                            ? 'bg-white text-[#F97316] shadow-sm border border-slate-200/80'
                            : 'text-[#0A172F] hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              activeMegaCategory === cat.slug ? 'bg-[#F97316]' : 'bg-transparent'
                            }`}
                          />
                          <span>{cat.name}</span>
                        </div>
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ))}
                  </div>

                  {/* Left Area: Active Category Subcategories and Brands */}
                  <div className="flex-1 p-6 space-y-5 bg-white text-right">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-black text-sm text-[#0A172F]">
                          {selectedCategoryObj.name}
                        </h4>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          {selectedCategoryObj.description}
                        </p>
                      </div>
                      <Link
                        to={`/category/${selectedCategoryObj.slug}`}
                        onClick={() => setIsMegaMenuOpen(false)}
                        className="text-xs font-bold text-[#F97316] hover:text-[#EA580C] flex items-center gap-1"
                      >
                        <span>مشاهده همه محصولات</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Subcategories Grid */}
                    <div>
                      <div className="text-[11px] font-bold text-[#64748B] mb-2.5">
                        زیرگروه‌های فنی و قطعات:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedCategoryObj.subcategories.map(sub => (
                          <Link
                            key={sub}
                            to={`/category/${selectedCategoryObj.slug}`}
                            onClick={() => setIsMegaMenuOpen(false)}
                            className="p-2 rounded-lg hover:bg-orange-50/60 hover:text-[#F97316] text-xs font-medium text-[#0A172F] transition-colors block border border-transparent hover:border-orange-200"
                          >
                            • {sub}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Authorized Brands for this group */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-[#64748B] mb-2">
                        برندهای تأییدشده بازرگانی اطلس در این رسته:
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded bg-orange-50 text-[#EA580C] font-bold border border-orange-200">
                          SWR آلمان (نماینده انحصاری)
                        </span>
                        <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                          FORZA ایتالیا (نماینده انحصاری)
                        </span>
                        <span className="px-2.5 py-1 rounded bg-slate-100 text-[#0A172F] font-medium">
                          خط انحصاری اطلس پاور یزد
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>



            {/* 2. صنایع و کاربردها (White Factory icon + Down Chevron) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'industries' ? null : 'industries');
                  setIsMegaMenuOpen(false);
                }}
                onMouseEnter={() => {
                  if (activeDropdown && activeDropdown !== 'industries') {
                    setActiveDropdown('industries');
                  }
                }}
                className={`flex items-center gap-1.5 py-3 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${
                  activeDropdown === 'industries' ? 'text-[#F97316] bg-white/5' : 'text-white hover:text-[#F97316]'
                }`}
              >
                <Factory className="w-4 h-4 text-white group-hover:text-[#F97316] shrink-0 transition-colors" />
                <span>صنایع و کاربردها</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-[#F97316] transition-transform duration-200 ${
                    activeDropdown === 'industries' ? 'rotate-180 text-[#F97316]' : ''
                  }`}
                />
              </button>

              {/* Industries Dropdown */}
              {activeDropdown === 'industries' && (
                <div className="absolute right-0 top-full w-72 bg-white text-[#0A172F] rounded-b-2xl shadow-2xl border border-[#E2E8F0] p-3 z-50 animate-in fade-in duration-150 text-right">
                  <div className="text-[11px] font-bold text-[#64748B] px-2 py-1 mb-1 border-b border-slate-100">
                    صنایع تخصصی تحت پوشش
                  </div>
                  <div className="space-y-1">
                    <Link
                      to="/category/ceramic-tiles"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors"
                    >
                      <span className="font-bold">صنعت کاشی و سرامیک</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    <Link
                      to="/category/textile-machinery"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors"
                    >
                      <span className="font-bold">صنعت نساجی و ریسندگی</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    <Link
                      to="/category/power-transmission"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors"
                    >
                      <span className="font-bold">صنایع سیمان، فولاد و معادن</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    <Link
                      to="/category/conveyor-belts"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors"
                    >
                      <span className="font-bold">صنایع غذایی و بسته‌بندی</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                    <Link
                      to="/category/industrial-belts"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors"
                    >
                      <span className="font-bold">خطوط تولید و مونتاژ صنعتی</span>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <Link
                      to="/#industries"
                      onClick={() => setActiveDropdown(null)}
                      className="block text-center py-1.5 px-3 bg-slate-50 hover:bg-orange-50 text-[11px] font-bold text-[#F97316] rounded-lg transition-colors"
                    >
                      مشاهده راهنمای کامل صنایع
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 3. برندها (Orange Tag icon + Down Chevron) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'brands' ? null : 'brands');
                  setIsMegaMenuOpen(false);
                }}
                onMouseEnter={() => {
                  if (activeDropdown && activeDropdown !== 'brands') {
                    setActiveDropdown('brands');
                  }
                }}
                className={`flex items-center gap-1.5 py-3 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${
                  activeDropdown === 'brands' ? 'text-[#F97316] bg-white/5' : 'text-white hover:text-[#F97316]'
                }`}
              >
                <Tag className="w-4 h-4 text-[#F97316] shrink-0" />
                <span>برندها</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-[#F97316] transition-transform duration-200 ${
                    activeDropdown === 'brands' ? 'rotate-180 text-[#F97316]' : ''
                  }`}
                />
              </button>

              {/* Brands Dropdown */}
              {activeDropdown === 'brands' && (
                <div className="absolute right-0 top-full w-80 bg-white text-[#0A172F] rounded-b-2xl shadow-2xl border border-[#E2E8F0] p-3.5 z-50 animate-in fade-in duration-150 text-right">
                  <div className="text-[11px] font-bold text-[#64748B] px-2 py-1 mb-1.5 border-b border-slate-100">
                    برندهای اختصاصی و انحصاری اطلس
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/category/swr-forza-exclusive"
                      onClick={() => setActiveDropdown(null)}
                      className="p-2 rounded-lg bg-orange-50/60 hover:bg-orange-100/80 border border-orange-200 transition-colors"
                    >
                      <div className="font-black text-xs text-[#EA580C]">SWR آلمان</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">نماینده انحصاری تسمه</div>
                    </Link>
                    <Link
                      to="/category/swr-forza-exclusive"
                      onClick={() => setActiveDropdown(null)}
                      className="p-2 rounded-lg bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200 transition-colors"
                    >
                      <div className="font-black text-xs text-blue-700">FORZA ایتالیا</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">نماینده انحصاری پولی</div>
                    </Link>
                    <Link
                      to="/category/industrial-belts"
                      onClick={() => setActiveDropdown(null)}
                      className="p-2 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
                    >
                      <div className="font-bold text-xs text-[#0A172F]">MEGADYNE</div>
                      <div className="text-[10px] text-slate-500">ایتالیا</div>
                    </Link>
                    <Link
                      to="/category/industrial-belts"
                      onClick={() => setActiveDropdown(null)}
                      className="p-2 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
                    >
                      <div className="font-bold text-xs text-[#0A172F]">OPTIBELT</div>
                      <div className="text-[10px] text-slate-500">آلمان</div>
                    </Link>
                    <Link
                      to="/category/bearings"
                      onClick={() => setActiveDropdown(null)}
                      className="p-2 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
                    >
                      <div className="font-bold text-xs text-[#0A172F]">SKF سوئد</div>
                      <div className="text-[10px] text-slate-500">بلبرینگ صنعتی</div>
                    </Link>
                    <Link
                      to="/category/bearings"
                      onClick={() => setActiveDropdown(null)}
                      className="p-2 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
                    >
                      <div className="font-bold text-xs text-[#0A172F]">TIMKEN آمریکا</div>
                      <div className="text-[10px] text-slate-500">رولبرینگ سنگین</div>
                    </Link>
                  </div>
                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      to="/#brands"
                      onClick={() => setActiveDropdown(null)}
                      className="text-[11px] font-bold text-[#F97316] hover:text-[#EA580C] transition-colors"
                    >
                      مشاهده تمام برندهای صنعتی ←
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 4. خدمات صنعتی (White Wrench icon + Down Chevron) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'services' ? null : 'services');
                  setIsMegaMenuOpen(false);
                }}
                onMouseEnter={() => {
                  if (activeDropdown && activeDropdown !== 'services') {
                    setActiveDropdown('services');
                  }
                }}
                className={`flex items-center gap-1.5 py-3 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${
                  activeDropdown === 'services' ? 'text-[#F97316] bg-white/5' : 'text-white hover:text-[#F97316]'
                }`}
              >
                <Wrench className="w-4 h-4 text-white group-hover:text-[#F97316] shrink-0 transition-colors" />
                <span>خدمات صنعتی</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-[#F97316] transition-transform duration-200 ${
                    activeDropdown === 'services' ? 'rotate-180 text-[#F97316]' : ''
                  }`}
                />
              </button>

              {/* Services Dropdown */}
              {activeDropdown === 'services' && (
                <div className="absolute right-0 top-full w-76 bg-white text-[#0A172F] rounded-b-2xl shadow-2xl border border-[#E2E8F0] p-3 z-50 animate-in fade-in duration-150 text-right">
                  <div className="text-[11px] font-bold text-[#64748B] px-2 py-1 mb-1 border-b border-slate-100">
                    خدمات مهندسی و پشتیبانی اطلس
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null);
                        setIsConsultModalOpen(true);
                      }}
                      className="w-full text-right p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-[#0A172F] group-hover:text-[#F97316]">مشاوره فنی مهندسی آنلاین</div>
                        <div className="text-[10px] text-slate-500">انتخاب و محاسبه سایز تسمه و پولی</div>
                      </div>
                      <Sparkles className="w-4 h-4 text-[#F97316]" />
                    </button>

                    <Link
                      to="/inquiry"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors group"
                    >
                      <div className="font-bold text-[#0A172F] group-hover:text-[#F97316]">استعلام قیمت و پیش‌فاکتور رسمی</div>
                      <div className="text-[10px] text-slate-500">صدور فاکتور با سامانه مودیان و ارزش افزوده</div>
                    </Link>

                    <Link
                      to="/dealer"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors group"
                    >
                      <div className="font-bold text-[#0A172F] group-hover:text-[#F97316]">تأمین قطعات کارخانجات و صنایع</div>
                      <div className="text-[10px] text-slate-500">تأمین مستمر با قرارداد سازمانی سالیانه</div>
                    </Link>

                    <Link
                      to="/about"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors group"
                    >
                      <div className="font-bold text-[#0A172F] group-hover:text-[#F97316]">تضمین اصالت و خدمات پس از فروش</div>
                      <div className="text-[10px] text-slate-500">گارانتی تعویض و تأییدیه فنی قطعات</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 5. درباره اطلس (White User icon + Down Chevron) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'about' ? null : 'about');
                  setIsMegaMenuOpen(false);
                }}
                onMouseEnter={() => {
                  if (activeDropdown && activeDropdown !== 'about') {
                    setActiveDropdown('about');
                  }
                }}
                className={`flex items-center gap-1.5 py-3 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${
                  activeDropdown === 'about' ? 'text-[#F97316] bg-white/5' : 'text-white hover:text-[#F97316]'
                }`}
              >
                <User className="w-4 h-4 text-white group-hover:text-[#F97316] shrink-0 transition-colors" />
                <span>درباره هایپر صنعت</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-[#F97316] transition-transform duration-200 ${
                    activeDropdown === 'about' ? 'rotate-180 text-[#F97316]' : ''
                  }`}
                />
              </button>

              {/* About Dropdown */}
              {activeDropdown === 'about' && (
                <div className="absolute right-0 top-full w-64 bg-white text-[#0A172F] rounded-b-2xl shadow-2xl border border-[#E2E8F0] p-3 z-50 animate-in fade-in duration-150 text-right">
                  <div className="text-[11px] font-bold text-[#64748B] px-2 py-1 mb-1 border-b border-slate-100">
                    شناخت هایپر صنعت و کارخانجات اطلس
                  </div>
                  <div className="space-y-1">
                    <Link
                      to="/about"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs font-bold transition-colors"
                    >
                      معرفی و تاریخچه شرکت
                    </Link>
                    <Link
                      to="/about"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs font-bold transition-colors"
                    >
                      مجوزها، گواهینامه‌ها و افتخارات
                    </Link>
                    <Link
                      to="/agency"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs font-bold transition-colors"
                    >
                      اخذ نمایندگی و عاملیت فروش
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs font-bold transition-colors"
                    >
                      تماس با ما و آدرس کارخانه
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 6. مشتریان (White Users icon + Down Chevron) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'clients' ? null : 'clients');
                  setIsMegaMenuOpen(false);
                }}
                onMouseEnter={() => {
                  if (activeDropdown && activeDropdown !== 'clients') {
                    setActiveDropdown('clients');
                  }
                }}
                className={`flex items-center gap-1.5 py-3 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group ${
                  activeDropdown === 'clients' ? 'text-[#F97316] bg-white/5' : 'text-white hover:text-[#F97316]'
                }`}
              >
                <Users className="w-4 h-4 text-white group-hover:text-[#F97316] shrink-0 transition-colors" />
                <span>مشتریان</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-[#F97316] transition-transform duration-200 ${
                    activeDropdown === 'clients' ? 'rotate-180 text-[#F97316]' : ''
                  }`}
                />
              </button>

              {/* Clients Dropdown */}
              {activeDropdown === 'clients' && (
                <div className="absolute right-0 top-full w-72 bg-white text-[#0A172F] rounded-b-2xl shadow-2xl border border-[#E2E8F0] p-3 z-50 animate-in fade-in duration-150 text-right">
                  <div className="text-[11px] font-bold text-[#64748B] px-2 py-1 mb-1 border-b border-slate-100">
                    مشتریان و صنایع طرف قرارداد
                  </div>
                  <div className="space-y-1">
                    <Link
                      to="/#our-clients-section"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors"
                    >
                      <div className="font-bold text-[#0A172F]">کارخانجات و برندهای همکار</div>
                      <div className="text-[10px] text-slate-500">بیش از ۱۲۰ کارخانه بزرگ در سراسر کشور</div>
                    </Link>
                    <Link
                      to="/dealer"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors"
                    >
                      <div className="font-bold text-[#0A172F]">شبکه نمایندگان استانی</div>
                      <div className="text-[10px] text-slate-500">عاملیت‌های فروش فعال در یزد، تهران و اصفهان</div>
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setActiveDropdown(null)}
                      className="block p-2 rounded-lg hover:bg-orange-50 hover:text-[#F97316] text-xs transition-colors"
                    >
                      <div className="font-bold text-[#0A172F]">باشگاه مشتریان صنعتی اطلس</div>
                      <div className="text-[10px] text-slate-500">تخفیف‌های پلکانی و خریدهای اعتباری</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 7. دانشنامه (White BookOpen icon - NO Chevron, direct link) */}
            <Link
              to="/catalog"
              onMouseEnter={() => setActiveDropdown(null)}
              className="flex items-center gap-1.5 py-3 px-3 rounded-lg hover:bg-white/5 hover:text-[#F97316] transition-colors cursor-pointer text-white"
            >
              <BookOpen className="w-4 h-4 text-white group-hover:text-[#F97316] shrink-0 transition-colors" />
              <span>دانشنامه</span>
            </Link>

          </nav>

          {/* Left: Hotline Support Badge with Pulse */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono" dir="ltr">
            <span>۰۳۵-۳۸۷۳۹۹۰۰</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-300 font-sans">پشتیبانی صنعتی:</span>
          </div>
        </div>
      </div>

      {/* 4. HIGH-END INDUSTRIAL MOBILE DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" dir="rtl">
          {/* Smooth Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-[#070D18]/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Sheet */}
          <div className="relative w-[85vw] max-w-sm bg-[#0C1527] text-white h-full shadow-2xl flex flex-col z-10 text-right animate-in slide-in-from-right duration-250 border-l border-slate-800">
            {/* Drawer Brand Header */}
            <div className="p-4 bg-[#080E1A] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#EA580C] to-[#F97316] flex items-center justify-center text-white shadow-md shadow-orange-950/40">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-black text-sm tracking-tight text-white">هایپر صنعت</div>
                  <div className="text-[10px] text-orange-400 font-bold tracking-tight">کارخانجات اطلس</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                aria-label="بستن منو"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Profile / Login Banner */}
            <div className="p-3.5 bg-slate-900/90 border-b border-slate-800/80">
              {currentUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-sm">
                      {currentUser.fullName.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white line-clamp-1">{currentUser.fullName}</div>
                      <div className="text-[10px] font-mono text-slate-400" dir="ltr">{currentUser.phone}</div>
                    </div>
                  </div>
                  <Link
                    to={currentUser.role === 'dealer' ? '/dealer' : currentUser.role === 'admin' ? '/admin' : '/account'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-orange-600 text-orange-300 hover:text-white rounded-lg text-[11px] font-bold transition-colors border border-slate-700"
                  >
                    داشبورد
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal();
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>ورود یا ثبت‌نام در هایپر صنعت</span>
                </button>
              )}
            </div>

            {/* Quick 4-Action Grid */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-[#09101E] border-b border-slate-800 text-[11px]">
              <a
                href="tel:03538739900"
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 hover:text-white hover:border-orange-500/50 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-orange-400" />
                <span className="font-bold">تماس فروش</span>
              </a>
              <a
                href="https://wa.me/989903427027"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 hover:text-white hover:border-emerald-500/50 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">واتس‌اپ صنعتی</span>
              </a>
              <Link
                to="/inquiry"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 hover:text-white hover:border-orange-500/50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                <span className="font-bold">پیش‌فاکتور آنلاین</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsConsultModalOpen(true);
                }}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200 hover:text-white hover:border-blue-500/50 transition-colors text-right cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold">مشاوره هوشمند</span>
              </button>
            </div>

            {/* Scrollable Navigation Accordions */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs divide-y divide-slate-800/60">
              {/* Direct Products Catalog Banner */}
              <div className="pb-2">
                <Link
                  to="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black shadow-md shadow-orange-950/40"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    <span>کاتالوگ کل قطعات (۸۶۴ قلم)</span>
                  </div>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>

              {/* Accordion 1: Product Categories */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setMobileAccordionOpen(prev => prev === 'categories' ? null : 'categories')}
                  className="w-full flex items-center justify-between py-2 text-slate-200 hover:text-orange-400 font-black text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-orange-400" />
                    <span>دسته‌بندی قطعات خطوط تولید</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      mobileAccordionOpen === 'categories' ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>

                {mobileAccordionOpen === 'categories' && (
                  <div className="mt-1 mr-2 pl-1 space-y-1 border-r-2 border-orange-500/30 pr-2.5 animate-in fade-in duration-150">
                    <Link
                      to="/catalog"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-1.5 px-2 rounded-lg text-orange-400 font-bold hover:bg-white/5"
                    >
                      مشاهده تمام ۵٬۰۰۰ قلم کالا ←
                    </Link>
                    {CATEGORIES.map(cat => (
                      <Link
                        key={cat.slug}
                        to={`/category/${cat.slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{toPersianDigits(cat.subcategories.length)} گروه</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion 2: Covered Industries */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setMobileAccordionOpen(prev => prev === 'industries' ? null : 'industries')}
                  className="w-full flex items-center justify-between py-2 text-slate-200 hover:text-orange-400 font-black text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-blue-400" />
                    <span>صنایع و کاربری‌های خطوط تولید</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      mobileAccordionOpen === 'industries' ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>

                {mobileAccordionOpen === 'industries' && (
                  <div className="mt-1 mr-2 pl-1 space-y-1 border-r-2 border-blue-500/30 pr-2.5 animate-in fade-in duration-150">
                    {[
                      { name: 'صنایع کاشی، سرامیک و لعاب', slug: 'ceramic-tiles' },
                      { name: 'صنایع نساجی، بافندگی و ریسندگی', slug: 'textile-machinery' },
                      { name: 'صنایع فولاد، ریخته‌گری و متالورژی', slug: 'steel-metals' },
                      { name: 'صنایع بسته‌بندی، دارویی و غذایی', slug: 'food-pharma' },
                      { name: 'سنگ‌بری و مصالح ساختمانی', slug: 'mining-stone' },
                    ].map(ind => (
                      <Link
                        key={ind.slug}
                        to={`/category/${ind.slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-1.5 px-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {ind.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion 3: Exclusive Brands */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setMobileAccordionOpen(prev => prev === 'brands' ? null : 'brands')}
                  className="w-full flex items-center justify-between py-2 text-slate-200 hover:text-orange-400 font-black text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>برندهای انحصاری بازرگانی اطلس</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      mobileAccordionOpen === 'brands' ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>

                {mobileAccordionOpen === 'brands' && (
                  <div className="mt-1 mr-2 pl-1 space-y-1.5 border-r-2 border-amber-500/30 pr-2.5 animate-in fade-in duration-150">
                    <Link
                      to="/category/swr-forza-exclusive"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-xl bg-slate-800/60 block hover:bg-slate-800 transition-colors"
                    >
                      <div className="font-bold text-orange-400 text-xs">FORZA - ایتالیا</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">تسمه‌های صنعتی پیشرفته خطوط کاشی و سرامیک</div>
                    </Link>
                    <Link
                      to="/category/swr-forza-exclusive"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-xl bg-slate-800/60 block hover:bg-slate-800 transition-colors"
                    >
                      <div className="font-bold text-blue-400 text-xs">SWR - آلمان</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">سیستم‌های محرک صنعتی و تسمه‌های ضدحرارت و روغن</div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Direct Links */}
              <div className="pt-3 space-y-1">
                <Link
                  to="/agency"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">درخواست اخذ نمایندگی استانی</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                </Link>

                <Link
                  to="/club"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold">باشگاه مشتریان و امتیازات فنی</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                </Link>

                <Link
                  to="/catalog"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span className="font-bold">دانشنامه فنی و کاتالوگ‌ها</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                </Link>

                <Link
                  to="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-400" />
                    <span className="font-bold">درباره کارخانجات و بازرگانی اطلس</span>
                  </div>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
                </Link>
              </div>
            </div>

            {/* Drawer Footer Hotline & Social Links */}
            <div className="p-3.5 bg-[#080E1A] border-t border-slate-800 space-y-3">
              <a
                href="tel:03538739900"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white rounded-xl font-black text-xs shadow-md shadow-orange-950/50"
              >
                <Phone className="w-4 h-4" />
                <span>تماس فوری: ۰۳۵-۳۸۷۳۹۹۰۰</span>
              </a>

              <div className="flex items-center justify-center gap-3 text-slate-400 pt-1">
                <span className="text-[10px] text-slate-500">شبکه‌های رسمی:</span>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-orange-400 transition-colors" aria-label="اینستاگرام">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://t.me" target="_blank" rel="noreferrer" className="hover:text-sky-400 transition-colors" aria-label="تلگرام">
                  <Send className="w-4 h-4" />
                </a>
                <a href="https://wa.me/989903427027" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors" aria-label="واتس‌اپ">
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. AI DYNAMIC VISUAL PART SEARCH MODAL */}
      <AiVisualPartSearchModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
      />

      {/* 6. AI CONSULT MODAL */}
      <AiConsultModal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
      />
    </header>
  );
};
