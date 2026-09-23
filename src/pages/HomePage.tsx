import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Camera,
  Sparkles,
  Headphones,
  Shield,
  ShieldCheck,
  Building,
  Truck,
  Award,
  Share2,
  FileText,
  Calculator,
  Flame,
  Phone,
  CheckCircle2,
  Factory,
  Zap,
  Cpu,
  Gem,
  Wheat,
  Play,
  Mouse,
  Settings,
  Clock,
  ScanSearch,
} from 'lucide-react';
import { STORE_ASSETS } from '../assets/images';
import { AiVisualPartSearchModal } from '../components/search/AiVisualPartSearchModal';
import { AiConsultModal } from '../components/search/AiConsultModal';
import { OurClientsSection } from '../components/home/OurClientsSection';
import { PopularProductsSection } from '../components/home/PopularProductsSection';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Modals state
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isConsultOpen, setIsConsultOpen] = useState(false);

  // Hero Slider
  const [activeSlide, setActiveSlide] = useState(1);
  const totalSlides = 3;

  // Window scroll tracking for Parallax, Headline fade/shift, Sticky Advantages bar, and Scroll Indicator line
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleWindowScroll = () => {
      const currentScroll = window.scrollY;
      setScrollY(currentScroll);

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(Math.min(1, Math.max(0, currentScroll / totalHeight)));
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    handleWindowScroll();

    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  // ---------------------------------------------------------------------------
  // Hero Carousel Data & Automatic 5s Slide Switching
  // ---------------------------------------------------------------------------
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  interface HeroSlideItem {
    id: number;
    image: string;
    eyebrow: string;
    titlePart1: string;
    titlePart2: string;
    description: string;
    primaryBtn: {
      text: string;
      link?: string;
      action?: 'visualSearch' | 'consult';
    };
    secondaryBtn: {
      text: string;
      link?: string;
      action?: 'visualSearch' | 'consult';
    };
    badge: {
      title: string;
      subtitle: string;
    };
  }

  const heroSlides: HeroSlideItem[] = [
    {
      id: 1,
      image: STORE_ASSETS.heroSteelCoils || STORE_ASSETS.heroPulley,
      eyebrow: 'تأمین قطعات صنعتی با کیفیت، قیمت رقابتی، برای آینده‌ای مطمئن',
      titlePart1: 'همراه صنعتگران',
      titlePart2: 'در مسیر رشد و پیشرفت',
      description:
        'ارائه‌دهنده قطعات و تجهیزات صنعتی با کیفیت، از معتبرترین برندهای جهانی با تأمین مطمئن، قیمت رقابتی و پشتیبانی تخصصی خطوط تولید کارخانجات.',
      primaryBtn: {
        text: 'مشاهده محصولات',
        link: '/products',
      },
      secondaryBtn: {
        text: 'معرفی شرکت',
        action: 'consult',
      },
      badge: {
        title: 'تجربه‌ی موفق همکاری با صنایع پیشرو',
        subtitle: 'کیفیت، سرعت، اعتماد',
      },
    },
    {
      id: 2,
      image: STORE_ASSETS.heroPulley,
      eyebrow: 'نمایندگی رسمی و انحصاری برترین برندهای اروپایی',
      titlePart1: 'سیستم‌های انتقال قدرت',
      titlePart2: 'با استاندارد FORZA و SWR',
      description:
        'تأمین مستقیم انواع پولی‌های صنعتی، فلکه چدنی، تسمه‌های دنده‌ای و شیاردار با بالاترین بازدهی گشتاور و طول عمر مکانیکی تضمین‌شده.',
      primaryBtn: {
        text: 'مشاهده قطعات FORZA و SWR',
        link: '/category/swr-forza-exclusive',
      },
      secondaryBtn: {
        text: 'استعلام فوری قیمت و موجودی',
        action: 'consult',
      },
      badge: {
        title: 'تضمین اصالت قطعات و گارانتی تعویض',
        subtitle: 'استاندارد DIN آلمان و اروپا',
      },
    },
    {
      id: 3,
      image: STORE_ASSETS.heroBanner,
      eyebrow: 'سامانه مکانیزه هوشمند شناسایی و تأمین قطعات فوری',
      titlePart1: 'توقف خط تولید، هرگز!',
      titlePart2: 'تأمین فوری قطعات کارخانجات',
      description:
        'تنها با ارسال تصویر یا پلاک قطعه مستهلک، قطعه فابریک استاندارد را از انبار مرکزی هایپر صنعت اطلس یزد با ارسال اکسپرس دریافت کنید.',
      primaryBtn: {
        text: 'ارسال تصویر قطعه با هوش مصنوعی',
        action: 'visualSearch',
      },
      secondaryBtn: {
        text: 'شروع مشاوره فنی آنلاین',
        action: 'consult',
      },
      badge: {
        title: 'ارسال فوری و اکسپرس به سراسر کشور',
        subtitle: 'پشتیبانی ۲۴ ساعته خطوط تولید',
      },
    },
  ];

  // 5-second automatic slide interval
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handleNextSlide = () => {
    setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const handlePrevSlide = () => {
    setHeroSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  // Mobile Touch Gestures for Hero Carousel
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    // In RTL, swipe left (diff > 40) moves forward to next slide
    if (diff > 40) {
      handleNextSlide();
    } else if (diff < -40) {
      handlePrevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Industries carousel scroll tracking
  const industriesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkIndustriesScroll = () => {
    const el = industriesScrollRef.current;
    if (!el) return;
    // In RTL, scrollLeft can be 0 at initial state or negative/positive depending on browser implementation
    // When user scrolls to left (forward in carousel), scroll offset changes from initial 0
    const scrolled = Math.abs(el.scrollLeft) > 10;
    setCanScrollRight(scrolled);
  };

  const handleScrollLeft = () => {
    const el = industriesScrollRef.current;
    if (el) {
      // In RTL, scrolling "left" (forward) is done with negative or positive depending on layout
      el.scrollBy({ left: -320, behavior: 'smooth' });
      // Immediately reveal right button
      setCanScrollRight(true);
    }
  };

  const handleScrollRight = () => {
    const el = industriesScrollRef.current;
    if (el) {
      el.scrollBy({ left: 320, behavior: 'smooth' });
      setTimeout(checkIndustriesScroll, 350);
    }
  };

  // 8 Categories matching production line catalog
  const categories = [
    {
      id: 1,
      title: 'قطعات و سیستم‌های انتقال قدرت',
      image: STORE_ASSETS.categories.transmission,
      link: '/category/power-transmission',
    },
    {
      id: 2,
      title: 'تسمه‌های خط تولید و کانوایر',
      image: STORE_ASSETS.categories.belts,
      link: '/category/industrial-belts',
    },
    {
      id: 3,
      title: 'کاشی، سرامیک و رولرهای کوره',
      image: STORE_ASSETS.products.ceramicParts,
      link: '/category/ceramic-tiles',
    },
    {
      id: 4,
      title: 'پولی، فلکه و بوش قفل‌کننده',
      image: STORE_ASSETS.categories.pulleys,
      link: '/category/pulleys-idlers',
    },
    {
      id: 5,
      title: 'بلبرینگ، رولبرینگ و یاتاقان',
      image: STORE_ASSETS.categories.bearings,
      link: '/category/bearings-bushings',
    },
    {
      id: 6,
      title: 'زنجیر و چرخ زنجیر خطوط انتقال',
      image: STORE_ASSETS.categories.chains,
      link: '/category/chains-sprockets',
    },
    {
      id: 7,
      title: 'تجهیزات و تسمه‌های نساجی',
      image: STORE_ASSETS.categories.conveyor,
      link: '/category/textile-machinery',
    },
    {
      id: 8,
      title: 'محصولات انحصاری SWR و FORZA',
      image: STORE_ASSETS.heroPulley,
      link: '/category/swr-forza-exclusive',
    },
  ];

  // 7 Covered Industries matching reference screenshot exactly
  const coveredIndustries = [
    {
      id: 1,
      title: 'سیمان و فولاد',
      image: STORE_ASSETS.industries.cement,
      icon: Factory,
      link: '/category/cement-industry',
    },
    {
      id: 2,
      title: 'صنایع غذایی',
      image: STORE_ASSETS.industries.foodBottles,
      icon: Wheat,
      link: '/category/food-industry',
    },
    {
      id: 3,
      title: 'معادن',
      image: STORE_ASSETS.industries.miningTruck,
      icon: Gem,
      link: '/category/mining-steel',
    },
    {
      id: 4,
      title: 'نساجی',
      image: STORE_ASSETS.industries.textile,
      icon: Cpu,
      link: '/category/textile-machinery',
    },
    {
      id: 5,
      title: 'کاشی و سرامیک',
      image: STORE_ASSETS.industries.ceramic,
      icon: Flame,
      link: '/category/ceramic-tiles',
    },
    {
      id: 6,
      title: 'نیرو و انرژی',
      image: STORE_ASSETS.industries.powerCooling,
      icon: Zap,
      link: '/category/power-energy',
    },
    {
      id: 7,
      title: 'تولیدی و ساخت',
      image: STORE_ASSETS.industries.robotArm,
      icon: Factory,
      link: '/category/manufacturing',
    },
  ];

  // 6 Reasons Why Atlas (منطبق با تصویر ارسالی کاربر و راست‌چین)
  const whyAtlasItems = [
    {
      id: 1,
      title: 'قیمت رقابتی',
      subtitle: 'بهترین قیمت بازار',
      icon: Shield,
    },
    {
      id: 2,
      title: 'ضمانت اصالت کالا',
      subtitle: 'همراه با گارانتی معتبر',
      icon: ShieldCheck,
    },
    {
      id: 3,
      title: 'مشاوره تخصصی',
      subtitle: 'پشتیبانی فنی و مهندسی',
      icon: Headphones,
    },
    {
      id: 4,
      title: 'تأمین سریع',
      subtitle: 'ارسال در کوتاه‌ترین زمان',
      icon: Truck,
    },
    {
      id: 5,
      title: 'تجربه و اعتبار',
      subtitle: 'همکاری با صنایع بزرگ',
      icon: Building,
    },
    {
      id: 6,
      title: 'خدمات پس از فروش',
      subtitle: 'تأییدیه فنی و تضمین تعویض',
      icon: Award,
    },
  ];

  return (
    <div className="w-full text-right font-sans pb-12 overflow-x-hidden relative">
      {/* ========================================================================= */}
      {/* 0. VERTICAL ORANGE SCROLL INDICATOR LINE (میزان اسکرول صفحه)              */}
      {/* ========================================================================= */}
      <div 
        className="fixed top-0 right-0 z-50 w-1 h-full pointer-events-none bg-black/15"
        title="شاخص پیمایش صفحه"
      >
        {/* Glowing Orange Fill Line */}
        <div
          className="w-full bg-gradient-to-b from-[#EA580C] via-[#F97316] to-[#FF8C00] shadow-[0_0_8px_#F97316] transition-all duration-75"
          style={{ height: `${Math.round(scrollProgress * 100)}%` }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION - 5-SECOND DYNAMIC CAROUSEL WITH PARALLAX & ANIMATIONS    */}
      {/* ========================================================================= */}
      <section
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full overflow-hidden bg-[#060A14] text-white border-b border-slate-800/80 min-h-[500px] sm:min-h-[580px] lg:min-h-[calc(100vh-155px)] flex flex-col justify-between select-none"
      >
        {/* Background Factory Images with Smooth Cross-Fade & Parallax */}
        {heroSlides.map((slide, idx) => {
          const isActive = idx === heroSlideIndex;
          return (
            <div
              key={slide.id}
              className={`absolute -top-10 -bottom-10 inset-x-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out will-change-transform ${
                isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10'
              }`}
              style={{
                backgroundImage: `url(${slide.image})`,
                transform: `translateY(${Math.min(120, scrollY * 0.26)}px) scale(1.04)`,
              }}
            />
          );
        })}

        {/* Cinematic Factory Vignette Overlay: Deep contrast on right for headline, warm orange reflections on floor */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#060A14]/95 via-[#060A14]/75 to-[#060A14]/35 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060A14] via-transparent to-black/40 pointer-events-none" />
        {/* Warm Golden Flare on Factory floor */}
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[180px] bg-gradient-to-t from-orange-600/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Top & Middle Content Container - Standard max-w-7xl matching the header perfectly */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-6 sm:pb-8 flex-1 flex flex-col justify-center">
          <div
            key={heroSlideIndex}
            className="max-w-xl lg:max-w-2xl space-y-3.5 sm:space-y-5 transition-all duration-500 ease-out animate-in fade-in slide-in-from-right-3"
          >
            {/* Top Eyebrow Tag */}
            <div className="flex items-center gap-2 justify-start">
              <span className="w-6 sm:w-8 h-[2px] bg-[#F97316]" />
              <span className="text-[11px] sm:text-[13px] font-bold text-orange-400/90 tracking-wide line-clamp-1">
                {heroSlides[heroSlideIndex].eyebrow}
              </span>
            </div>

            {/* Main Headline (With Fade & Shift to Right on Scroll) */}
            <div
              className="transition-all duration-100 ease-out will-change-transform"
              style={{
                opacity: Math.max(0, 1 - scrollY / 320),
                transform: `translateX(${Math.min(70, scrollY * 0.2)}px)`,
              }}
            >
              <h1 className="text-2xl sm:text-5xl lg:text-[54px] font-black leading-[1.25] sm:leading-[1.2] tracking-tight text-white drop-shadow-md">
                <span>{heroSlides[heroSlideIndex].titlePart1}</span>
                <span className="block text-[#F97316] pt-1">{heroSlides[heroSlideIndex].titlePart2}</span>
              </h1>
            </div>

            {/* Action Buttons & Subtitle */}
            <div className="pt-1.5 sm:pt-3 space-y-3 sm:space-y-4">
              {/* Subtitle Description */}
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl font-normal min-h-[38px] sm:min-h-[44px]">
                {heroSlides[heroSlideIndex].description}
              </p>

              {/* Action Buttons Row - Full width touch targets on mobile */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5">
                {/* Primary Button */}
                {heroSlides[heroSlideIndex].primaryBtn.link ? (
                  <Link
                    to={heroSlides[heroSlideIndex].primaryBtn.link!}
                    className="h-11 sm:h-12 px-6 sm:px-7 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-black text-xs sm:text-sm rounded-xl shadow-[0_6px_18px_rgba(249,115,22,0.35)] hover:shadow-[0_8px_22px_rgba(249,115,22,0.5)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-95"
                  >
                    <span>{heroSlides[heroSlideIndex].primaryBtn.text}</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-white" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (heroSlides[heroSlideIndex].primaryBtn.action === 'visualSearch') {
                        setIsVisualSearchOpen(true);
                      } else if (heroSlides[heroSlideIndex].primaryBtn.action === 'consult') {
                        setIsConsultOpen(true);
                      }
                    }}
                    className="h-11 sm:h-12 px-6 sm:px-7 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-black text-xs sm:text-sm rounded-xl shadow-[0_6px_18px_rgba(249,115,22,0.35)] hover:shadow-[0_8px_22px_rgba(249,115,22,0.5)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-95"
                  >
                    <Camera className="w-4 h-4 text-white" />
                    <span>{heroSlides[heroSlideIndex].primaryBtn.text}</span>
                  </button>
                )}

                {/* Secondary Button */}
                {heroSlides[heroSlideIndex].secondaryBtn.action === 'consult' ? (
                  <button
                    type="button"
                    onClick={() => setIsConsultOpen(true)}
                    className="h-11 sm:h-12 px-5 sm:px-6 bg-black/40 hover:bg-black/70 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 hover:border-orange-500/70 backdrop-blur-md transition-all flex items-center justify-center gap-2.5 cursor-pointer group shadow-md active:scale-95"
                  >
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[#F97316] group-hover:scale-110 transition-transform">
                      <Play className="w-3 h-3 fill-[#F97316] text-[#F97316] ml-0.5" />
                    </span>
                    <span>{heroSlides[heroSlideIndex].secondaryBtn.text}</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsVisualSearchOpen(true)}
                    className="h-11 sm:h-12 px-5 sm:px-6 bg-black/40 hover:bg-black/70 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 hover:border-orange-500/70 backdrop-blur-md transition-all flex items-center justify-center gap-2.5 cursor-pointer group shadow-md active:scale-95"
                  >
                    <span>{heroSlides[heroSlideIndex].secondaryBtn.text}</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                  </button>
                )}
              </div>
            </div>

            {/* Slide Navigation Dots with 5-Second Timer Progress Bar & Controls */}
            <div className="pt-2 sm:pt-3 flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {heroSlides.map((slide, idx) => {
                  const isActive = idx === heroSlideIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setHeroSlideIndex(idx)}
                      className={`relative h-2 rounded-full transition-all duration-300 overflow-hidden cursor-pointer ${
                        isActive ? 'w-8 bg-orange-500/30' : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`اسلاید ${idx + 1}`}
                    >
                      {isActive && (
                        <div
                          key={`progress-${idx}-${heroSlideIndex}`}
                          className="absolute inset-0 bg-[#F97316] rounded-full"
                          style={{
                            animation: 'heroProgress 5s linear forwards',
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Slide Counter (01 / 03) */}
              <span className="text-[11px] font-mono font-bold text-slate-300">
                0{heroSlideIndex + 1} / 0{heroSlides.length}
              </span>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-[#F97316] border border-white/15 hover:border-[#F97316] text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  aria-label="اسلاید قبلی"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-[#F97316] border border-white/15 hover:border-[#F97316] text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  aria-label="اسلاید بعدی"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Far Left Vertical Scroll Visual Indicator (آیکون ماوس اسکرول + نشانگر) */}
        <div className="absolute left-6 lg:left-8 bottom-24 z-20 hidden md:flex flex-col items-center gap-2.5 text-slate-400">
          <div className="flex flex-col items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <span className="w-1.5 h-4 rounded-full bg-[#F97316] shadow-[0_0_6px_#F97316]" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
          </div>

          <div className="w-5 h-8 rounded-full border-2 border-white/35 flex items-start justify-center pt-1">
            <span className="w-1 h-1.5 rounded-full bg-white/80 animate-bounce" />
          </div>
          <span className="text-[8px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase rotate-180 [writing-mode:vertical-lr]">
            SCROLL
          </span>
        </div>

        {/* Bottom Left Badge: بر اساس اسلاید جاری */}
        <div
          key={`badge-${heroSlideIndex}`}
          className="absolute left-4 sm:left-8 bottom-4 z-20 hidden lg:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 shadow-md transition-all duration-500 animate-in fade-in"
        >
          <div className="w-1.5 h-5 bg-[#F97316] rounded-full" />
          <div className="text-right">
            <div className="text-[11px] font-bold text-white">{heroSlides[heroSlideIndex].badge.title}</div>
            <div className="text-[9px] text-slate-400 font-medium">{heroSlides[heroSlideIndex].badge.subtitle}</div>
          </div>
          <ArrowLeft className="w-3 h-3 text-orange-400 mr-1" />
        </div>

        {/* ========================================================================= */}
        {/* STICKY-THEN-FADE ADVANTAGES BAR (نوار مزیت‌ها پایین هرو - فقط در دسکتاپ/تبلت) */}
        {/* ========================================================================= */}
        <div
          className="hidden md:block relative z-20 w-full border-t border-white/10 bg-[#060A14]/90 backdrop-blur-md py-3 sm:py-3.5 transition-all duration-150 ease-out"
          style={{
            opacity: Math.max(0, 1 - scrollY / 350),
            transform: `translateY(${Math.min(25, scrollY * 0.08)}px)`,
            pointerEvents: scrollY > 330 ? 'none' : 'auto',
          }}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            
            {/* 4 Advantages Items: 2x2 Grid on Mobile, Flex row on Tablet/Desktop */}
            <div className="w-full md:w-auto grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-8 lg:gap-10">
              {/* Item 1: کیفیت تضمینی */}
              <div className="flex items-center gap-2 p-2 sm:p-0 rounded-xl bg-white/[0.04] sm:bg-transparent border border-white/[0.08] sm:border-0">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#F97316] shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-right min-w-0">
                  <div className="text-xs font-bold text-white truncate">کیفیت تضمینی</div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">گارانتی و اصالت کالا</div>
                </div>
              </div>

              {/* Item 2: تحویل سریع */}
              <div className="flex items-center gap-2 p-2 sm:p-0 rounded-xl bg-white/[0.04] sm:bg-transparent border border-white/[0.08] sm:border-0">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#F97316] shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="text-right min-w-0">
                  <div className="text-xs font-bold text-white truncate">تحویل سریع</div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">به سراسر کشور</div>
                </div>
              </div>

              {/* Item 3: مشاوره تخصصی */}
              <div className="flex items-center gap-2 p-2 sm:p-0 rounded-xl bg-white/[0.04] sm:bg-transparent border border-white/[0.08] sm:border-0">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#F97316] shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="text-right min-w-0">
                  <div className="text-xs font-bold text-white truncate">مشاوره تخصصی</div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">تیم فنی و مهندسی</div>
                </div>
              </div>

              {/* Item 4: پشتیبانی واقعی */}
              <div className="flex items-center gap-2 p-2 sm:p-0 rounded-xl bg-white/[0.04] sm:bg-transparent border border-white/[0.08] sm:border-0">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#F97316] shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="text-right min-w-0">
                  <div className="text-xs font-bold text-white truncate">پشتیبانی صنعتی</div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">قبل و بعد از خرید</div>
                </div>
              </div>
            </div>

            {/* Brand Partners (FORZA & SWR) */}
            <div className="flex items-center gap-5 border-r border-white/15 pr-5 hidden md:flex">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">همکاری با برندهای معتبر جهانی</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#F97316] rotate-45 inline-block" />
                    <span>FORZA</span>
                  </div>
                  <div className="text-[8px] text-slate-400 font-mono">Power Transmission</div>
                </div>
                <div className="text-right border-r border-white/15 pr-3">
                  <div className="text-xs font-bold text-white">SWR</div>
                  <div className="text-[8px] text-slate-400 font-mono">Belts & Components</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2 & 3 CONTAINER - INSIDE MAX-W-7XL                                */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 my-8 sm:my-10">
        {/* ========================================================================= */}
        {/* 2. DUAL AI FEATURE BANNER (مشاوره هوشمند قطعات & پیدا کردن قطعه با AI)       */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-[#090F1D] text-white border border-slate-800 shadow-xl p-6 sm:p-8">
          {/* Ambient Subtle Gradients */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#F97316]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-800">
            {/* Card A (Right in RTL): مشاوره با هوش مصنوعی */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 lg:pb-0 lg:pl-6">
              {/* Visual: Glowing AI Cybernetic Face */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 border border-orange-500/30 shadow-lg bg-black group">
                <img
                  src={STORE_ASSETS.aiConsultRobot}
                  alt="مشاوره هوشمند قطعات خط تولید"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-1.5 inset-x-1.5 bg-black/80 backdrop-blur-xs text-[10px] text-center font-bold text-orange-400 py-0.5 rounded border border-orange-500/20">
                  هوشمند خط تولید
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 space-y-2.5 text-right">
                <h3 className="text-lg sm:text-xl font-black text-white">مشاوره هوشمند قطعات خط تولید</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  مشخصات یا ایراد خط تولید کارخانه خود را اعلام کنید تا سامانه هوشمند هایپر صنعت بهترین قطعات جایگزین را به شما پیشنهاد دهد.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsConsultOpen(true)}
                    className="h-10 px-5 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 hover:border-[#F97316] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm group"
                  >
                    <span>شروع مشاوره آنلاین قطعه</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform text-[#F97316]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card B (Left in RTL): پیدا کردن محصول با AI */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-6 lg:pt-0 lg:pr-6">
              {/* Details */}
              <div className="flex-1 space-y-2.5 text-right order-2 sm:order-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white">شناسایی تصویری قطعه با هوش مصنوعی</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  از قطعه مستهلک، پولی، تسمه یا پلاک ماشین‌آلات خط تولید عکس بگیرید تا قطعه فابریک استاندارد در انبار هایپر صنعت فوراً شناسایی شود.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsVisualSearchOpen(true)}
                    className="h-10 px-5 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 hover:border-[#F97316] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm group"
                  >
                    <Camera className="w-4 h-4 text-[#F97316]" />
                    <span>ارسال تصویر قطعه خط تولید</span>
                  </button>
                </div>
              </div>

              {/* Visual: Smartphone HUD Part Scanner */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 border border-blue-500/30 shadow-lg bg-black order-1 sm:order-2 group">
                <img
                  src={STORE_ASSETS.aiSearchMobile}
                  alt="شناسایی هوشمند قطعه"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/70 backdrop-blur-xs flex items-center justify-center border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. PRODUCT CATEGORIES (7 items matching screenshot)                       */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          {/* Section Header */}
          <div className="flex items-end justify-between border-b border-slate-200/80 pb-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#0A172F]">دسته‌بندی قطعات خطوط تولید</h2>
              <p className="text-xs sm:text-sm text-slate-500">تأمین کلیه قطعات مصرفی و یدکی انواع خطوط تولید و کارخانجات</p>
            </div>

            <Link
              to="/products"
              className="text-xs sm:text-sm font-bold text-[#F97316] hover:text-[#EA580C] flex items-center gap-1.5 transition-colors"
            >
              <span>مشاهده همه ۸۶۴ قطعه</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          {/* 8 Clean Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={cat.link}
                className="group bg-white rounded-2xl border border-slate-200/80 p-3 flex flex-col justify-between hover:border-[#F97316] hover:shadow-[0_8px_25px_rgba(249,115,22,0.2)] hover:ring-2 hover:ring-orange-500/20 hover:-translate-y-1 transition-all duration-300 text-right"
              >
                {/* Product Image Box */}
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 group-hover:bg-orange-50/40 group-hover:border-orange-200/60 transition-colors">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Title & Orange Arrow Circle Button */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <div className="w-7 h-7 rounded-full bg-[#F97316] group-hover:bg-[#EA580C] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:shadow-[0_0_8px_#F97316] transition-all">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <h3 className="font-bold text-xs text-[#0A172F] group-hover:text-[#F97316] transition-colors line-clamp-1">
                    {cat.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 4. COVERED INDUSTRIES - 100% FULL WIDTH MATCHING REFERENCE UI/UX           */}
      {/* ========================================================================= */}
      <section
        className="relative w-full overflow-hidden bg-[#0A0D14] text-white py-14 sm:py-20 my-8 sm:my-12 shadow-2xl border-y border-orange-950/40"
        dir="rtl"
      >
        {/* Background Plant Backdrop with dramatic dusk gradient overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={STORE_ASSETS.industries.bgPlant}
            alt="Industrial Plant Refinery"
            className="w-full h-full object-cover object-center opacity-35"
          />
          {/* Radial & directional gradient lighting (orange flame on top-right, dark moody base on left) */}
          <div className="absolute inset-0 bg-gradient-to-l from-[#EA580C]/85 via-[#9A3412]/75 to-[#06080E]/95 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06080E] via-transparent to-transparent" />
        </div>

        {/* Diagonal Glowing Laser Light Rays at bottom right (just like in screenshot) */}
        <div className="absolute bottom-0 right-0 w-[55%] h-32 pointer-events-none z-1 overflow-hidden opacity-80">
          <div className="absolute -bottom-10 right-10 w-[650px] h-[3px] bg-gradient-to-r from-transparent via-[#F97316] to-transparent rotate-[-18deg] shadow-[0_0_15px_#F97316]" />
          <div className="absolute -bottom-16 right-32 w-[550px] h-[2px] bg-gradient-to-r from-transparent via-[#EA580C] to-transparent rotate-[-18deg] shadow-[0_0_10px_#EA580C]" />
          <div className="absolute -bottom-24 right-56 w-[450px] h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent rotate-[-18deg]" />
        </div>

        {/* Subtle Industrial Background Dot Pattern */}
        <div className="absolute inset-0 z-1 bg-[radial-gradient(#ffffff0f_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Carousel Navigation Chevron Arrows (Left & Right) */}
        {/* Right Arrow: only shown when user has scrolled towards the left / can scroll back right */}
        <button
          type="button"
          onClick={handleScrollRight}
          className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-[#F97316] border border-white/20 hover:border-[#F97316] text-white flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 cursor-pointer group ${
            canScrollRight ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-75 pointer-events-none'
          }`}
          aria-label="صنایع قبلی"
        >
          <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Left Arrow: always visible to scroll left (forward in RTL) */}
        <button
          type="button"
          onClick={handleScrollLeft}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-[#F97316] border border-white/20 hover:border-[#F97316] text-white flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 cursor-pointer group"
          aria-label="صنایع بعدی"
        >
          <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Main Content Layout: In RTL, flex-col lg:flex-row puts first child (Text Header) on the RIGHT, and second child (Cards) on the LEFT */}
        <div className="relative z-10 max-w-[1520px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          {/* Right Header Text Column (در دسکتاپ دقیقاً در سمت راست قرار می‌گیرد) */}
          <div className="w-full lg:w-[420px] xl:w-[460px] space-y-4 text-right shrink-0">
            {/* Top English Brand Label: ATLAS TRADING ——— */}
            <div className="flex items-center gap-2 justify-start">
              <span className="text-xs sm:text-sm font-black tracking-[0.25em] text-[#F97316] uppercase font-mono">
                ATLAS TRADING
              </span>
              <span className="w-12 h-[2px] bg-[#F97316]" />
            </div>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide">
              تأمین‌کننده قطعات و تجهیزات صنعتی
            </p>

            {/* Main Headline (تأمین قطعات خطوط صنایع مختلف) */}
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[46px] font-black text-white leading-[1.2] tracking-tight">
              تأمین قطعات خطوط
              <span className="block text-[#F97316] pt-1">صنایع مختلف</span>
            </h2>

            {/* Description Paragraph */}
            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-light">
              از خطوط کاشی و سرامیک، نساجی و فولاد تا صنایع غذایی، فولاد، پتروشیمی و نیروگاهی؛ با بهترین برندها و کیفیت تضمین‌شده، همراه شما در تأمین قطعات صنعتی هستیم.
            </p>

            {/* CTA Button: مشاهده قطعات خطوط (Large Orange Glowing Button) */}
            <div className="pt-3">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2.5 h-12 sm:h-13 px-8 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white text-sm sm:text-base font-black rounded-2xl shadow-[0_10px_25px_rgba(249,115,22,0.4)] hover:shadow-[0_12px_30px_rgba(249,115,22,0.6)] hover:scale-[1.02] transition-all cursor-pointer group"
              >
                <span>مشاهده قطعات خطوط</span>
                <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-1.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Scrollable Cards Row (در دسکتاپ در سمت چپ قرار می‌گیرد) */}
          <div
            id="industries-scroll-container"
            ref={industriesScrollRef}
            onScroll={checkIndustriesScroll}
            className="flex-1 w-full min-w-0 flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-2 px-1 scrollbar-none snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {coveredIndustries.map((ind) => {
              const IconComp = ind.icon;

              return (
                <Link
                  key={ind.id}
                  to={ind.link}
                  className="group relative w-[170px] sm:w-[195px] shrink-0 aspect-[1/1.7] rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-end p-2.5 sm:p-3 transition-all duration-300 snap-start cursor-pointer border-2 border-white/15 hover:border-[#F97316] hover:shadow-[0_0_25px_rgba(249,115,22,0.45)] hover:ring-2 hover:ring-orange-500/30 hover:scale-[1.03] hover:z-10"
                >
                  {/* Card Industrial Machinery Photo */}
                  <img
                    src={ind.image}
                    alt={ind.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />

                  {/* Dark Vignette and bottom contrast gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/15" />

                  {/* Top Subtle Amber Highlight glow on hover */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#F97316] to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100" />

                  {/* Bottom Glass Card Pill with Icon + Title + Orange Arrow */}
                  <div className="relative z-10 flex items-center justify-between gap-1.5 bg-[#0A0E18]/85 backdrop-blur-md px-2.5 py-2 rounded-xl border border-white/15 shadow-lg group-hover:border-orange-500/60 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.25)] transition-all duration-300">
                    {/* Left Icon (Orange Arrow Circle Button) */}
                    <div className="w-6 h-6 rounded-full bg-[#F97316] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#EA580C] group-hover:shadow-[0_0_8px_#F97316] transition-all">
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    </div>

                    {/* Middle Title */}
                    <span className="text-xs sm:text-[13px] font-bold text-white group-hover:text-orange-200 transition-colors line-clamp-1">
                      {ind.title}
                    </span>

                    {/* Right Mini Industry Category Icon */}
                    {IconComp && (
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-orange-400/80 group-hover:text-[#F97316] transition-colors">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Carousel / Slider Indicator Dots */}
        <div className="flex items-center justify-center gap-2 pt-8 sm:pt-12 relative z-10">
          <span className="w-9 h-2.5 rounded-full bg-[#F97316] shadow-[0_0_10px_#F97316]" />
          <span className="w-7 h-2 rounded-full bg-white/25" />
          <span className="w-7 h-2 rounded-full bg-white/25" />
          <span className="w-7 h-2 rounded-full bg-white/25" />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5, 6, 7 CONTAINER - INSIDE MAX-W-7XL                              */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 my-8 sm:my-10">

        {/* ========================================================================= */}
        {/* ATLAS VISUAL SEARCH - پیدا کردن قطعه با عکس (جستجوی بصری محصول)            */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-[#0A172F] via-[#152544] to-[#1E293B] text-white p-6 sm:p-7 border border-slate-700 shadow-md">
          <div className="absolute -left-12 -bottom-14 w-56 h-56 bg-[#F97316]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-right max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-[11px] font-bold">
                <ScanSearch className="w-3.5 h-3.5 text-[#F97316]" />
                <span>جستجوی محصول با تصویر — Atlas Visual Product Search</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black leading-tight">
                کد قطعه را نمی‌دانید؟ فقط عکس آن را بفرستید
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                سیستم فقط بر اساس <strong className="text-orange-400">شکل، هندسه و ظاهر واقعی قطعه</strong> آن را با
                تصاویر کالاهای اطلس مقایسه می‌کند: اگر همان کالا موجود باشد فقط همان را نشان می‌دهد، در غیر این صورت
                نزدیک‌ترین کالاها را معرفی می‌کند و اگر کالای مناسبی نباشد، امکان ثبت درخواست ساخت/تأمین سفارشی فراهم است.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <Camera className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>آپلود یا عکس با دوربین</span>
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <ScanSearch className="w-3.5 h-3.5 text-emerald-400" />
                  <span>مقایسه‌ی شکلی و ساختاری</span>
                </span>
              </div>
            </div>

            <div className="shrink-0 w-full lg:w-auto">
              <Link
                to="/visual-search"
                className="w-full lg:w-auto h-12 px-7 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                <span>جستجوی قطعه با عکس</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* POPULAR PRODUCTS - استعلام قیمت آنلاین قطعات پربازدید                       */}
        {/* ========================================================================= */}
        <PopularProductsSection />

        {/* ========================================================================= */}
        {/* 5. TRUSTED BRANDS (FORZA & SWR LUXURY CARDS)                              */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          {/* Section Header */}
          <div className="flex items-end justify-between border-b border-slate-200/80 pb-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#0A172F]">برندهای اصلی قطعات خطوط تولید</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                عرضه مستقیم در هایپر صنعت با ضمانت اصالت و پشتیبانی کارخانجات و بازرگانی اطلس
              </p>
            </div>

            <Link
              to="/category/swr-forza-exclusive"
              className="text-xs sm:text-sm font-bold text-[#F97316] hover:text-[#EA580C] flex items-center gap-1.5 transition-colors"
            >
              <span>مشاهده همه برندها</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          {/* Twin Brand Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Brand 1: FORZA */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070D18] to-[#131F33] text-white border border-slate-800 shadow-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 group">
              {/* Ambient Red/Orange glow */}
              <div className="absolute right-0 top-0 w-48 h-48 bg-[#F97316]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Left Info */}
              <div className="relative z-10 space-y-3 text-right max-w-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-[#F97316] rotate-45 inline-block" />
                  <h3 className="text-2xl sm:text-3xl font-black tracking-wider text-white">FORZA</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  پولی، فلکه و سیستم‌های مهار و انتقال قدرت خطوط صنعتی
                </p>
                <div className="pt-2">
                  <Link
                    to="/category/swr-forza-exclusive"
                    className="h-10 px-5 bg-black/60 hover:bg-black/90 text-white border border-orange-500/50 hover:border-orange-500 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm group-hover:border-[#F97316]"
                  >
                    <span>مشاهده قطعات FORZA</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-[#F97316]" />
                  </Link>
                </div>
              </div>

              {/* Right Visual: 3D FORZA Belt */}
              <div className="relative z-10 w-48 h-32 sm:w-56 sm:h-36 rounded-2xl overflow-hidden border border-slate-700/60 bg-black shadow-inner shrink-0">
                <img
                  src={STORE_ASSETS.banners.forza}
                  alt="قطعات خط تولید FORZA"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <span className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-300 bg-black/70 px-2 py-0.5 rounded border border-white/10">
                  FORZA ITALY
                </span>
              </div>
            </div>

            {/* Brand 2: SWR */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070D18] to-[#131F33] text-white border border-slate-800 shadow-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 group">
              {/* Ambient Blue/Cyan glow */}
              <div className="absolute right-0 top-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Left Info */}
              <div className="relative z-10 space-y-3 text-right max-w-xs">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-wider text-white">SWR</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium">تسمه‌های انتقال قدرت و کانوایر صنعتی با استاندارد DIN آلمان</p>
                <div className="pt-2">
                  <Link
                    to="/category/swr-forza-exclusive"
                    className="h-10 px-5 bg-black/60 hover:bg-black/90 text-white border border-orange-500/50 hover:border-orange-500 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm group-hover:border-[#F97316]"
                  >
                    <span>مشاهده محصولات SWR</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-[#F97316]" />
                  </Link>
                </div>
              </div>

              {/* Right Visual: 3D SWR Belt */}
              <div className="relative z-10 w-48 h-32 sm:w-56 sm:h-36 rounded-2xl overflow-hidden border border-slate-700/60 bg-black shadow-inner shrink-0">
                <img
                  src={STORE_ASSETS.banners.swr}
                  alt="تسمه صنعتی SWR"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <span className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-300 bg-black/70 px-2 py-0.5 rounded border border-white/10">
                  SWR GERMANY
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5.5 OUR CLIENTS (مشتریان ما - اسلایدر لوگو متحرک به چپ هر ۳ ثانیه)        */}
        {/* ========================================================================= */}
        <OurClientsSection />
      </div>

      {/* ========================================================================= */}
      {/* 6. WHY ATLAS SECTION (چرا اطلس؟ - راست‌چین و تمام‌صفحه)                     */}
      {/* ========================================================================= */}
      <section className="relative w-full bg-white border-y border-slate-200/90 shadow-sm overflow-hidden" dir="rtl">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 items-stretch">
          
          {/* 1. RIGHT SIDE: Dark "چرا اطلس؟" Card (سمت راست - کاملاً راست‌چین با زاویه اسلنت و دکمه نارنجی) */}
          <div className="lg:col-span-4 xl:col-span-4 relative bg-[#091222] text-white p-6 sm:p-10 lg:pl-16 xl:pl-20 flex flex-col justify-between overflow-hidden lg:[clip-path:polygon(40px_0,100%_0,100%_100%,0_100%)] z-10">
              {/* Industrial background image texture & ambient glow */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity pointer-events-none"
                style={{ backgroundImage: `url(${STORE_ASSETS.heroPulley})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-bl from-[#091222]/85 via-[#091222]/95 to-[#050A14] pointer-events-none" />

              {/* Diagonal Orange Accent Stripe at bottom-right corner (عین خط مورب نارنجی تصویر) */}
              <div className="absolute -bottom-8 -right-8 w-28 h-7 bg-[#F97316] -rotate-45 shadow-lg pointer-events-none z-20" />

              {/* Text Content */}
              <div className="relative z-10 space-y-2.5 text-right">
                <span className="inline-block text-[#F97316] font-bold text-sm sm:text-base tracking-wide">
                  چرا اطلس؟
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  تجربه، کیفیت، تعهد
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed pt-1 max-w-sm">
                  ما با بیش از یک دهه تجربه در تأمین تجهیزات صنعتی و قطعات خطوط تولید، همواره در کنار شما هستیم تا بهترین محصولات، مشاوره تخصصی و پشتیبانی کامل را ارائه دهیم.
                </p>
              </div>

              {/* Orange Action Button */}
              <div className="relative z-10 pt-6 mt-auto">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-orange-500/25 transition-all cursor-pointer group"
                >
                  <span>بیشتر بدانید</span>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* 2. CENTER: The 6 Feature Cards (وسط - ۶ ویژگی در ۲ ستون ۳ ردیفه) */}
            <div className="lg:col-span-5 xl:col-span-5 p-4 sm:p-6 lg:p-7 flex items-center">
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                {whyAtlasItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-100/90 shadow-2xs hover:border-orange-200 hover:shadow-xs transition-all group"
                    >
                      <div className="text-right">
                        <h4 className="font-bold text-xs sm:text-[13px] text-[#0A172F] group-hover:text-[#F97316] transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium">
                          {item.subtitle}
                        </p>
                      </div>
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-[#F97316] shrink-0 group-hover:bg-[#F97316] group-hover:text-white group-hover:scale-105 transition-all shadow-2xs">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. LEFT: Industrial Plant Photo with Engineer (سمت چپ - عکس مهندس با زاویه اسلنت موازی) */}
            <div className="lg:col-span-3 xl:col-span-3 relative min-h-[260px] lg:min-h-[320px] overflow-hidden lg:[clip-path:polygon(0_0,100%_0,calc(100%-32px)_100%,0_100%)]">
              <img
                src={STORE_ASSETS.engineerWhyAtlas}
                alt="مهندس ناظر خطوط تولید کارخانجات اطلس"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 right-4 left-4 text-white text-right">
                <div className="text-xs font-bold text-orange-400">کارخانجات و بازرگانی اطلس</div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  پشتیبانی فنی و مهندسی خطوط تولید
                </div>
              </div>
            </div>

          </div>
        </section>

      {/* ========================================================================= */}
      {/* 7. CTA CONSULTATION & INQUIRY BANNER (مشاوره تخصصی و استعلام قیمت)        */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 my-8 sm:my-10">
        <section
          className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#C2410C] via-[#7C2D12] to-[#0A101D] text-white shadow-xl border border-orange-900/30"
          dir="rtl"
        >
          {/* Subtle Ambient Industrial Waves / Geometric Glow */}
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
            <svg className="w-full h-full" viewBox="0 0 1200 240" preserveAspectRatio="none" fill="none">
              <path d="M0,80 C300,10 600,160 900,70 C1050,30 1150,110 1200,80 L1200,240 L0,240 Z" fill="white" opacity="0.2" />
              <path d="M0,120 C250,50 500,190 800,110 C1000,60 1100,170 1200,130 L1200,240 L0,240 Z" fill="white" opacity="0.1" />
            </svg>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center">
            
            {/* RIGHT in desktop, BOTTOM in mobile: Text and Action Buttons */}
            <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-7 p-6 sm:p-8 lg:p-10 space-y-4 text-right">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  مشاوره تخصصی و استعلام قیمت
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed max-w-xl">
                  تیم کارشناسان ما، آماده پاسخگویی به سوالات شما و ارائه بهترین راهکارهاست
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Dark Navy Button: درخواست مشاوره */}
                <button
                  type="button"
                  onClick={() => setIsConsultOpen(true)}
                  className="h-11 px-6 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-orange-500/30 transition-all flex items-center gap-2 cursor-pointer group shrink-0"
                >
                  <ChevronLeft className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
                  <span>درخواست مشاوره</span>
                </button>

                {/* Orange Phone Call Button */}
                <a
                  href="tel:02142772340"
                  className="h-11 px-5 bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2.5 backdrop-blur-xs cursor-pointer shrink-0"
                  dir="ltr"
                >
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono tracking-wider font-extrabold text-white text-sm sm:text-base">
                    ۰۲۱-۴۲۷۷۲۳۴۰
                  </span>
                </a>
              </div>
            </div>

            {/* LEFT in desktop, TOP in mobile: Industrial Photo */}
            <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-5 relative h-52 sm:h-60 lg:h-64 overflow-hidden">
              <img
                src={STORE_ASSETS.ctaConsultBanner}
                alt="مشاوره تخصصی و استعلام قیمت قطعات خط تولید"
                className="w-full h-full object-cover object-center"
              />
              {/* Gradient masks blending smoothly from image to banner bg */}
              <div className="absolute inset-0 bg-gradient-to-l from-[#0A101D] via-[#0A101D]/60 to-transparent hidden lg:block pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7C2D12] via-transparent to-transparent lg:hidden pointer-events-none" />
            </div>

          </div>
        </section>
      </div>

      {/* Global Modals for interactive AI features */}
      <AiVisualPartSearchModal
        isOpen={isVisualSearchOpen}
        onClose={() => setIsVisualSearchOpen(false)}
      />

      <AiConsultModal isOpen={isConsultOpen} onClose={() => setIsConsultOpen(false)} />
    </div>
  );
};
