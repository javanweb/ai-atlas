import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Headphones,
  ChevronLeft,
  ChevronDown,
  Send,
  Instagram,
  MessageCircle,
  ArrowUp,
  Check,
} from 'lucide-react';
import { STORE_ASSETS } from '../../assets/images';
import { AiConsultModal } from '../search/AiConsultModal';

// Geometric Orange 'A' Logo matching Atlas Trading brand identity in screenshot
const AtlasLogoMark: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 100 86" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Left slant leg with darker orange */}
    <path d="M42 4 L10 82 L26 82 L48 28 Z" fill="#EA580C" />
    {/* Right slant leg with vibrant bright orange */}
    <path d="M48 4 L88 82 L72 82 L56 46 Z" fill="#F97316" />
    {/* Forward ribbon fold facet */}
    <path d="M26 60 L74 60 L65 46 L17 46 Z" fill="#FB923C" />
  </svg>
);

// Iran Ministry of Industry, Mine and Trade Official Emblem SVG (Coat of Arms Style)
const MimtEmblemSvg: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C11.3 4.2 9.8 7.3 9.8 10C9.8 12.2 10.9 13.8 12 14.3C13.1 13.8 14.2 12.2 14.2 10C14.2 7.3 12.7 4.2 12 2Z" />
    <path d="M8.2 7.5C6.7 10 5.8 13.2 5.8 15.8C5.8 19.4 8.5 22 12 22C8.8 21.6 7.6 18.5 7.6 15.8C7.6 13.2 8.5 10.5 9 9L8.2 7.5Z" />
    <path d="M15.8 7.5C17.3 10 18.2 13.2 18.2 15.8C18.2 19.4 15.5 22 12 22C15.2 21.6 16.4 18.5 16.4 15.8C16.4 13.2 15.5 10.5 15 9L15.8 7.5Z" />
    <line x1="12" y1="4.5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10.8" y1="2.5" x2="13.2" y2="2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// Company Registration Hexagonal Emblem SVG
const SherkatEmblemSvg: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
    <path d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z" strokeLinejoin="round" />
    <path d="M12 7V17" strokeLinecap="round" />
    <path d="M8 10L12 7L16 10" strokeLinejoin="round" />
    <path d="M8 14H16" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

// E-Namad Calligraphic 'e' Emblem SVG
const EnamadEmblemSvg: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className}>
    <path
      d="M30 68 C 24 50, 42 22, 68 28 C 88 32, 82 65, 60 70 C 44 74, 34 60, 48 48 C 60 38, 72 45, 70 55"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="72" cy="30" r="4.5" fill="#F97316" />
  </svg>
);

export const Footer: React.FC = () => {
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const toggleAccordion = (key: string) => {
    setOpenAccordion((prev) => (prev === key ? null : key));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setIsSubscribed(true);
      setTimeout(() => {
        setIsSubscribed(false);
        setNewsletterEmail('');
      }, 3500);
    }
  };

  return (
    <footer className="relative w-full bg-[#050811] text-white overflow-hidden border-t border-slate-800/80">
      {/* Industrial Conveyor Belt Graphic on the Far Left behind trust badges */}
      <div className="absolute left-0 top-0 bottom-0 w-[24%] lg:w-[20%] xl:w-[18%] pointer-events-none overflow-hidden z-0 hidden md:block">
        <img
          src={STORE_ASSETS.footerConveyor}
          alt="خط تولید و نوار نقاله اطلس"
          className="w-full h-full object-cover object-right"
        />
        {/* Soft fading gradients to blend seamlessly with dark canvas */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#050811] via-[#050811]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050811] via-transparent to-[#050811]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050811] via-transparent to-[#050811]" />
      </div>

      {/* Main Footer Content Container (RTL layout: Logo on Right, Badges on Left) */}
      <div className="relative z-10 max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-7">
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.55fr_0.9fr_0.95fr_0.95fr_1.1fr_1.35fr] gap-6 lg:gap-4 xl:gap-6 items-start"
          dir="rtl"
        >
          {/* ========================================================================= */}
          {/* 1. BRAND & NEWSLETTER COLUMN (Rightmost column: Logo & Brand Info)        */}
          {/* ========================================================================= */}
          <div className="space-y-3.5 text-right lg:pl-3" dir="rtl">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <AtlasLogoMark className="w-8 h-8 group-hover:scale-105 transition-transform shrink-0" />
              <div className="flex flex-col text-right">
                <span className="text-lg font-black tracking-tight text-white leading-tight">
                  هایپر صنعت
                </span>
                <span className="text-[10px] font-bold text-orange-400 mt-0.5 leading-none">
                  پشتوانه کارخانجات اطلس
                </span>
              </div>
            </Link>

            {/* Headline */}
            <h3 className="text-xs sm:text-[13px] font-bold text-white pt-0.5">
              تأمین‌کننده تخصصی قطعات خطوط تولید کشور
            </h3>

            {/* Description */}
            <p className="text-[11px] text-slate-300 leading-relaxed text-justify max-w-sm">
              هایپر صنعت، مرجع آنلاین تأمین قطعات و تجهیزات مصرفی خطوط تولید صنعتی است که با سرمایه‌گذاری، تولیدات و شبکه بازرگانی کارخانجات اطلس پشتیبانی می‌شود. هدف ما تحویل فوری قطعات استاندارد به کارخانجات سراسر کشور و جلوگیری از توقف خطوط تولید است.
            </p>

            {/* Social Icons Row */}
            <div className="flex items-center gap-2 pt-0.5">
              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-full bg-[#0A111E] border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-[#F97316] transition-colors shadow-2xs"
                title="اینستاگرام اطلس"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>

              {/* Aparat / Eitaa */}
              <a
                href="https://eitaa.com"
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-full bg-[#0A111E] border border-slate-700/80 flex items-center justify-center text-[#F97316] hover:border-[#F97316] transition-colors shadow-2xs font-bold text-xs"
                title="ایتا / آپارات اطلس"
              >
                <span>e</span>
              </a>

              {/* Telegram */}
              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-full bg-[#0A111E] border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-[#F97316] transition-colors shadow-2xs"
                title="کانال تلگرام"
              >
                <Send className="w-3.5 h-3.5" />
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/989903427027"
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-full bg-[#0A111E] border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-emerald-400 hover:border-emerald-500/60 transition-colors shadow-2xs"
                title="ارتباط در واتس‌اپ"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Subtle Divider */}
            <div className="border-t border-slate-800/90 pt-3 max-w-sm" />

            {/* Newsletter Section matching screenshot */}
            <div className="space-y-1.5 max-w-sm">
              <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                <Mail className="w-3.5 h-3.5 text-[#F97316]" />
                <span>عضویت در خبرنامه</span>
              </div>
              <p className="text-[10px] text-slate-400">
                برای دریافت جدیدترین محصولات و مقالات، ایمیل خود را وارد کنید.
              </p>

              {/* Email Input Field & Orange Submit Button */}
              <form onSubmit={handleNewsletterSubmit} className="pt-1">
                <div className="flex items-center bg-[#070D18] border border-slate-700/80 rounded-lg p-1 focus-within:border-[#F97316] transition-colors">
                  {/* Orange Submit Button on Left side of input */}
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-xs"
                    title="ارسال ایمیل"
                  >
                    {isSubscribed ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Send className="w-3.5 h-3.5 rotate-180" />
                    )}
                  </button>

                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="... ایمیل خود را وارد کنید"
                    required
                    className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 px-3 outline-none text-right font-sans"
                    dir="rtl"
                  />
                </div>
                {isSubscribed && (
                  <p className="text-[10px] text-emerald-400 mt-1 font-medium text-right">
                    ایمیل شما با موفقیت در خبرنامه اطلس ثبت شد.
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. QUICK ACCESS COLUMN (دسترسی سریع - دومین ستون از راست)                 */}
          {/* ========================================================================= */}
          <div className="space-y-2 text-right lg:border-r lg:border-slate-800/80 lg:pr-4 xl:pr-5 border-b border-slate-800/60 pb-3 md:border-b-0 md:pb-0" dir="rtl">
            {/* Accordion trigger on mobile, static header on desktop */}
            <button
              type="button"
              onClick={() => toggleAccordion('quickAccess')}
              className="w-full flex items-center justify-between py-1.5 md:py-0 md:cursor-default cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 sm:w-5 h-0.5 bg-[#F97316] rounded-full" />
                <h4 className="text-xs sm:text-[13px] font-bold text-white group-hover:text-orange-400 md:group-hover:text-white transition-colors">
                  دسترسی سریع
                </h4>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 md:hidden ${
                  openAccordion === 'quickAccess' ? 'rotate-180 text-[#F97316]' : ''
                }`}
              />
            </button>

            <ul className={`space-y-1.5 text-[11px] text-slate-300 pt-1.5 md:pt-0 ${openAccordion === 'quickAccess' ? 'block' : 'hidden'} md:block animate-in fade-in`}>
              <li>
                <Link to="/" className="hover:text-[#F97316] transition-colors block">
                  خانه
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>کاتالوگ کل محصولات (۸۶۴ قطعه)</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>همه دسته‌بندی‌ها</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/#industries" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>صنایع و کاربردها</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/#brands" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>برندها</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsConsultOpen(true)}
                  className="w-full hover:text-[#F97316] transition-colors flex items-center justify-between group cursor-pointer text-right"
                >
                  <span>خدمات صنعتی</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </button>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>درباره اطلس</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/#our-clients-section" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>مشتریان ما</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/catalog" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>دانشنامه</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>تماس با ما</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
            </ul>
          </div>

          {/* ========================================================================= */}
          {/* 3. PRODUCTS COLUMN (محصولات - سومین ستون از راست)                          */}
          {/* ========================================================================= */}
          <div className="space-y-2 text-right lg:border-r lg:border-slate-800/80 lg:pr-4 xl:pr-5 border-b border-slate-800/60 pb-3 md:border-b-0 md:pb-0" dir="rtl">
            {/* Accordion trigger on mobile, static header on desktop */}
            <button
              type="button"
              onClick={() => toggleAccordion('products')}
              className="w-full flex items-center justify-between py-1.5 md:py-0 md:cursor-default cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 sm:w-5 h-0.5 bg-[#F97316] rounded-full" />
                <h4 className="text-xs sm:text-[13px] font-bold text-white group-hover:text-orange-400 md:group-hover:text-white transition-colors">
                  محصولات
                </h4>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 md:hidden ${
                  openAccordion === 'products' ? 'rotate-180 text-[#F97316]' : ''
                }`}
              />
            </button>

            <ul className={`space-y-1.5 text-[11px] text-slate-300 pt-1.5 md:pt-0 ${openAccordion === 'products' ? 'block' : 'hidden'} md:block animate-in fade-in`}>
              <li>
                <Link to="/category/industrial-belts" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>تسمه‌های خط تولید و کانوایر</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/category/pulleys-idlers" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>پولی، فلکه و بوش تیپرباک</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/category/bearings-bushings" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>بلبرینگ، رولبرینگ و یاتاقان</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/category/chains-sprockets" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>زنجیر و چرخ زنجیر صنعتی</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/category/power-transmission" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>سیستم‌های انتقال قدرت</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/category/ceramic-tiles" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>کاشی، سرامیک و رولرهای کوره</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/category/textile-machinery" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>تجهیزات خطوط نساجی</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/category/swr-forza-exclusive" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>محصولات انحصاری SWR و FORZA</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
            </ul>
          </div>

          {/* ========================================================================= */}
          {/* 4. CUSTOMER SERVICES (خدمات مشتریان - چهارمین ستون از راست)                */}
          {/* ========================================================================= */}
          <div className="space-y-2 text-right lg:border-r lg:border-slate-800/80 lg:pr-4 xl:pr-5 border-b border-slate-800/60 pb-3 md:border-b-0 md:pb-0" dir="rtl">
            {/* Accordion trigger on mobile, static header on desktop */}
            <button
              type="button"
              onClick={() => toggleAccordion('services')}
              className="w-full flex items-center justify-between py-1.5 md:py-0 md:cursor-default cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 sm:w-5 h-0.5 bg-[#F97316] rounded-full" />
                <h4 className="text-xs sm:text-[13px] font-bold text-white group-hover:text-orange-400 md:group-hover:text-white transition-colors">
                  خدمات مشتریان
                </h4>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 md:hidden ${
                  openAccordion === 'services' ? 'rotate-180 text-[#F97316]' : ''
                }`}
              />
            </button>

            <ul className={`space-y-1.5 text-[11px] text-slate-300 pt-1.5 md:pt-0 ${openAccordion === 'services' ? 'block' : 'hidden'} md:block animate-in fade-in`}>
              <li>
                <button
                  type="button"
                  onClick={() => setIsConsultOpen(true)}
                  className="w-full hover:text-[#F97316] transition-colors flex items-center justify-between group cursor-pointer text-right"
                >
                  <span>مشاوره فنی</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </button>
              </li>
              <li>
                <Link to="/category/industrial-belts" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>انتخاب محصول</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/dealer" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>تأمین قطعات کارخانه</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/dealer" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>تأمین عمده</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/agency" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>تأمین سفارشی</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>خدمات پس از فروش</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#F97316] transition-colors flex items-center justify-between group">
                  <span>پشتیبانی فنی</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsConsultOpen(true)}
                  className="w-full hover:text-[#F97316] transition-colors flex items-center justify-between group cursor-pointer text-right"
                >
                  <span>استعلام قیمت</span>
                  <ChevronLeft className="w-3 h-3 text-slate-500 group-hover:text-[#F97316] transition-colors" />
                </button>
              </li>
            </ul>
          </div>

          {/* ========================================================================= */}
          {/* 5. CONTACT INFO COLUMN (اطلاعات تماس - پنجمین ستون از راست)                */}
          {/* ========================================================================= */}
          <div className="space-y-2.5 text-right lg:border-r lg:border-slate-800/80 lg:pr-4 xl:pr-5 border-b border-slate-800/60 pb-3 md:border-b-0 md:pb-0" dir="rtl">
            {/* Accordion trigger on mobile, static header on desktop */}
            <button
              type="button"
              onClick={() => toggleAccordion('contact')}
              className="w-full flex items-center justify-between py-1.5 md:py-0 md:cursor-default cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 sm:w-5 h-0.5 bg-[#F97316] rounded-full" />
                <h4 className="text-xs sm:text-[13px] font-bold text-white group-hover:text-orange-400 md:group-hover:text-white transition-colors">
                  اطلاعات تماس
                </h4>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 md:hidden ${
                  openAccordion === 'contact' ? 'rotate-180 text-[#F97316]' : ''
                }`}
              />
            </button>

            <div className={`space-y-2.5 pt-1.5 md:pt-0 ${openAccordion === 'contact' ? 'block' : 'hidden'} md:block animate-in fade-in`}>
              {/* Phone */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full border border-[#F97316] text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-3 h-3" />
                </div>
                <div className="space-y-0.5 text-[11px] text-slate-300 font-mono text-right" dir="ltr">
                  <div>
                    <a href="tel:03538739900" className="hover:text-[#F97316] transition-colors">
                      ۰۳۵-۳۸۷۳۹۹۰۰-۰
                    </a>
                  </div>
                  <div>
                    <a href="tel:03538739988" className="hover:text-[#F97316] transition-colors">
                      ۰۳۵-۳۸۷۳۹۹۸۸
                    </a>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-[#F97316] text-[#F97316] flex items-center justify-center shrink-0">
                  <Mail className="w-3 h-3" />
                </div>
                <a
                  href="mailto:info@atlastrading.com"
                  className="text-[11px] text-slate-300 font-mono hover:text-[#F97316] transition-colors"
                  dir="ltr"
                >
                  info@atlastrading.com
                </a>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full border border-[#F97316] text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3 h-3" />
                </div>
                <div className="space-y-0.5 text-[11px] text-slate-300">
                  <p>یزد، شهرک صنعتی، خیابان صنعت ۱</p>
                  <a
                    href="https://maps.google.com/?q=Yazd+Industrial+Town"
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-[#F97316] transition-colors text-[10px] inline-block underline decoration-slate-600 underline-offset-2"
                  >
                    مشاهده روی نقشه
                  </a>
                </div>
              </div>

              {/* Working Hours */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full border border-[#F97316] text-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="space-y-0.5 text-[11px] text-slate-300">
                  <span className="font-bold text-white block">ساعات کاری</span>
                  <span className="text-[10.5px] text-slate-400 block">شنبه تا پنجشنبه</span>
                  <span className="text-[10px] text-slate-400 block">۸:۰۰ الی ۲۰:۰۰</span>
                </div>
              </div>

              {/* Consultation CTA Button matching screenshot */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsConsultOpen(true)}
                  className="w-full h-8 rounded-full border border-[#F97316] text-[#F97316] hover:bg-[#F97316]/10 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer text-xs font-bold shadow-xs group"
                >
                  <Headphones className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>درخواست مشاوره</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. TRUST BADGES & LICENSES (نماد اعتماد و مجوزها - ششمین ستون / چپ)        */}
          {/* ========================================================================= */}
          <div className="space-y-3 text-right lg:border-r lg:border-slate-800/80 lg:pr-4 xl:pr-5" dir="rtl">
            {/* Orange dash header accent */}
            <div className="w-5 h-0.5 bg-[#F97316] rounded-full mb-1" />
            <h4 className="text-xs sm:text-[13px] font-bold text-white mb-2">نماد اعتماد و مجوزها</h4>

            {/* 3 Badges Row matching screenshot */}
            <div className="grid grid-cols-3 gap-2">
              {/* Badge 1: eNAMAD */}
              <div className="bg-[#090E1A] border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col items-center justify-between text-center min-h-[96px] transition-all hover:bg-[#0D1524]">
                <EnamadEmblemSvg className="w-6 h-6 text-white mt-0.5" />
                <div className="w-full space-y-0.5">
                  <span className="text-[8px] text-slate-300 block font-bold leading-tight">
                    نماد اعتماد الکترونیکی
                  </span>
                  <div className="flex justify-center text-amber-400 text-[7px] tracking-widest">
                    ★★★★★
                  </div>
                  <span className="text-[7.5px] text-slate-400 font-mono block" dir="ltr">
                    eNAMAD.ir
                  </span>
                </div>
              </div>

              {/* Badge 2: Samaneh Sabt Sherkat-ha */}
              <div className="bg-[#090E1A] border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col items-center justify-between text-center min-h-[96px] transition-all hover:bg-[#0D1524]">
                <SherkatEmblemSvg className="w-5.5 h-5.5 text-white mt-0.5" />
                <div className="w-full space-y-0.5">
                  <span className="text-[8px] text-slate-300 block font-bold leading-tight">
                    سامانه ثبت
                  </span>
                  <span className="text-[8px] text-slate-300 block font-bold leading-tight">
                    شرکت ها
                  </span>
                  <span className="text-[7.5px] text-slate-400 font-mono block mt-0.5" dir="ltr">
                    sherkat.sanat.ir
                  </span>
                </div>
              </div>

              {/* Badge 3: Ministry of Industry, Mine and Trade (صمت) */}
              <div className="bg-[#090E1A] border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col items-center justify-between text-center min-h-[96px] transition-all hover:bg-[#0D1524]">
                <MimtEmblemSvg className="w-5.5 h-5.5 text-white mt-0.5" />
                <div className="w-full space-y-0.5">
                  <span className="text-[8px] text-slate-300 block font-bold leading-tight">
                    وزارت صنعت،
                  </span>
                  <span className="text-[8px] text-slate-300 block font-bold leading-tight">
                    معدن و تجارت
                  </span>
                  <span className="text-[7.5px] text-slate-400 font-mono block mt-0.5" dir="ltr">
                    mimt.gov.ir
                  </span>
                </div>
              </div>
            </div>

            {/* Slogan Callout Box below Badges with orange vertical bar on right */}
            <div className="flex items-center justify-start gap-2.5 pt-2">
              <div className="w-1 h-8 bg-[#F97316] rounded-full shrink-0 shadow-sm" />
              <div className="text-right">
                <h5 className="text-xs font-bold text-white leading-snug">
                  اطلس؛ همراه مطمئن صنعت
                </h5>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  کیفیت، تخصص، اعتماد
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM LEGAL & COPYRIGHT BAR (RTL alignment)                                */}
      {/* ========================================================================= */}
      <div className="relative z-10 border-t border-slate-800/80 bg-[#04070E] py-3 px-4 sm:px-6 lg:px-8" dir="rtl">
        <div className="max-w-[1520px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Right Side: ATLAS TRADING logo + Copyright */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <AtlasLogoMark className="w-4 h-4 shrink-0" />
              <div className="flex flex-col text-right">
                <span className="font-black text-white text-xs tracking-tight leading-none">
                  هایپر صنعت
                </span>
                <span className="text-[8px] font-bold text-orange-400 leading-none mt-0.5">
                  کارخانجات اطلس
                </span>
              </div>
            </div>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span>
              © ۱۴۰۴ هایپر صنعت (با پشتوانه کارخانجات و بازرگانی اطلس) | تمامی حقوق محفوظ است.
            </span>
          </div>

          {/* Left Side: Legal links + Scroll to Top Button */}
          <div className="flex items-center gap-3">
            {/* Horizontal Legal Links separated by pipe */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400">
              <Link to="/about" className="hover:text-slate-200 transition-colors">
                شرایط استفاده
              </Link>
              <span className="text-slate-700">|</span>
              <Link to="/catalog" className="hover:text-slate-200 transition-colors">
                سوالات متداول
              </Link>
              <span className="text-slate-700">|</span>
              <Link to="/about" className="hover:text-slate-200 transition-colors">
                حریم خصوصی
              </Link>
              <span className="text-slate-700">|</span>
              <Link to="/about" className="hover:text-slate-200 transition-colors">
                قوانین و مقررات
              </Link>
            </div>

            {/* Scroll to Top Orange Bordered Button on Far Left */}
            <button
              type="button"
              onClick={scrollToTop}
              className="w-7 h-7 rounded-md border border-[#F97316] bg-[#0A101C] text-[#F97316] hover:bg-[#F97316] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              title="بازگشت به بالا"
              aria-label="بازگشت به بالا"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Embedded Consultation Modal for Instant Access */}
      <AiConsultModal isOpen={isConsultOpen} onClose={() => setIsConsultOpen(false)} />
    </footer>
  );
};

export default Footer;
