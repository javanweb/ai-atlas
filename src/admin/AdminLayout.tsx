import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileSpreadsheet,
  FileText,
  ShoppingBag,
  Users,
  ShieldCheck,
  Award,
  Settings,
  Search,
  Bell,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ChevronDown,
  AlertCircle,
  Clock,
  CheckCircle,
  Sparkles,
  Building2,
  ScanSearch,
} from 'lucide-react';
import { adminService, AdminUser } from '../services/adminService';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { ProductsModule } from './modules/ProductsModule';
import { BulkImportModule } from './modules/BulkImportModule';
import { PricingInquiriesModule } from './modules/PricingInquiriesModule';
import { OrdersModule } from './modules/OrdersModule';
import { CustomersCrmModule } from './modules/CustomersCrmModule';
import { AgenciesAdminModule } from './modules/AgenciesAdminModule';
import { CustomerGradingModule } from './modules/CustomerGradingModule';
import { SettingsSystemModule } from './modules/SettingsSystemModule';
import { ClientsAdminModule } from './modules/ClientsAdminModule';
import { VisualSearchModule } from './modules/VisualSearchModule';
import { pricingCreditService } from '../services/pricingCreditService';
import { toPersianDigits } from '../utils/formatters';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Current admin session
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() =>
    adminService.getCurrentUser()
  );

  // Active module tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Sync tab with URL if needed
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/admin/products')) setActiveTab('products');
    else if (path.includes('/admin/bulk-import')) setActiveTab('bulk_import');
    else if (path.includes('/admin/inquiries')) setActiveTab('inquiries');
    else if (path.includes('/admin/orders')) setActiveTab('orders');
    else if (path.includes('/admin/crm') || path.includes('/admin/customers')) setActiveTab('crm');
    else if (path.includes('/admin/clients')) setActiveTab('clients');
    else if (path.includes('/admin/agencies')) setActiveTab('agencies');
    else if (path.includes('/admin/grading') || path.includes('/admin/credit')) setActiveTab('customer_grading');
    else if (path.includes('/admin/visual-search')) setActiveTab('visual_search');
    else if (path.includes('/admin/settings')) setActiveTab('settings');
    else if (path === '/admin' || path === '/admin/') setActiveTab('dashboard');
  }, [location.pathname]);

  // Scroll to top when active tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  if (!currentUser) {
    return <AdminLogin onLoginSuccess={user => setCurrentUser(user)} />;
  }

  // Real-time notification counters
  const pendingInquiries = adminService.getInquiries().filter(i => i.status === 'pending');
  const pendingOrders = adminService.getOrders().filter(o => o.status === 'pending');
  const pendingAgencies = adminService.getAgencyApplications().filter(a => a.status === 'pending');
  const pendingGrading = pricingCreditService.getCustomerApprovals().filter(c => c.status === 'pending');
  const openTickets = adminService.getTickets().filter(t => t.status === 'open');
  const totalAlerts =
    pendingInquiries.length + pendingOrders.length + pendingAgencies.length + pendingGrading.length + openTickets.length;

  const handleLogout = () => {
    adminService.logout();
    setCurrentUser(null);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'داشبورد و گزارش‌ها',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'customer_grading',
      label: 'کریدبندی و لیست‌های قیمت',
      icon: Award,
      badge: pendingGrading.length > 0 ? toPersianDigits(pendingGrading.length) : null,
      badgeColor: 'bg-[#F97316] text-white',
    },
    {
      id: 'agencies',
      label: 'درخواست‌های نمایندگی و عاملیت',
      icon: ShieldCheck,
      badge: pendingAgencies.length > 0 ? toPersianDigits(pendingAgencies.length) : null,
      badgeColor: 'bg-emerald-500 text-white',
    },
    {
      id: 'products',
      label: 'کاتالوگ و کالاها',
      icon: Package,
      badge: null,
    },
    {
      id: 'bulk_import',
      label: 'ورود گروهی اکسل',
      icon: FileSpreadsheet,
      badge: null,
    },
    {
      id: 'inquiries',
      label: 'استعلام‌ها و پیش‌فاکتور',
      icon: FileText,
      badge: pendingInquiries.length > 0 ? toPersianDigits(pendingInquiries.length) : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'orders',
      label: 'سفارش‌ها و لجستیک',
      icon: ShoppingBag,
      badge: pendingOrders.length > 0 ? toPersianDigits(pendingOrders.length) : null,
      badgeColor: 'bg-blue-500 text-white',
    },
    {
      id: 'crm',
      label: 'مشتریان و CRM',
      icon: Users,
      badge: openTickets.length > 0 ? toPersianDigits(openTickets.length) : null,
      badgeColor: 'bg-purple-500 text-white',
    },
    {
      id: 'clients',
      label: 'لوگوی مشتریان ما',
      icon: Building2,
      badge: null,
    },
    {
      id: 'visual_search',
      label: 'جستجوی بصری محصول',
      icon: ScanSearch,
      badge: null,
    },
    {
      id: 'settings',
      label: 'تنظیمات و سیستم',
      icon: Settings,
      badge: null,
    },
  ];

  const renderModuleContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <AdminDashboard
            onNavigateTab={tab => {
              if (tab === 'pricing_inquiries') setActiveTab('inquiries');
              else if (tab === 'orders') setActiveTab('orders');
              else if (tab === 'agencies') setActiveTab('agencies');
              else if (tab === 'products') setActiveTab('products');
              else if (tab === 'customer_grading') setActiveTab('customer_grading');
              else if (tab === 'clients') setActiveTab('clients');
              else setActiveTab(tab);
            }}
          />
        );
      case 'customer_grading':
        return <CustomerGradingModule />;
      case 'products':
        return <ProductsModule />;
      case 'bulk_import':
        return <BulkImportModule />;
      case 'inquiries':
        return <PricingInquiriesModule />;
      case 'orders':
        return <OrdersModule />;
      case 'crm':
        return <CustomersCrmModule />;
      case 'clients':
        return <ClientsAdminModule />;
      case 'visual_search':
        return <VisualSearchModule />;
      case 'agencies':
        return <AgenciesAdminModule />;
      case 'settings':
        return <SettingsSystemModule />;
      default:
        return <AdminDashboard onNavigateTab={t => setActiveTab(t)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* --- SIDEBAR (سایدبار راست سرمه‌ای تیره با آیکون) --- */}
      <aside
        className={`fixed md:sticky top-0 right-0 z-50 h-screen w-72 bg-[#0A172F] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-l border-slate-800 shrink-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Branding */}
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F97316] to-amber-600 flex items-center justify-center font-black text-white shadow-md">
                AT
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight text-white">
                  هایپر صنعت اطلس
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-medium">
                    سامانه مدیریت متمرکز B2B
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-190px)]">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-md shadow-orange-950/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-slate-700 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & External Store Link */}
        <div className="p-4 border-t border-slate-800 bg-[#071124]/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 text-[#F97316] border border-orange-500/30 flex items-center justify-center font-bold text-xs">
                {currentUser.name.slice(0, 1)}
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white line-clamp-1">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400">{currentUser.role}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="خروج از حساب مدیریت"
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#F97316]" />
            <span>مشاهده فروشگاه عمومی</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN BODY & HEADER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-64 sm:w-80 md:w-96">
              <input
                type="text"
                value={globalSearchQuery}
                onChange={e => setGlobalSearchQuery(e.target.value)}
                placeholder="جستجوی سراسری کالا، سفارش، مشتری..."
                className="w-full h-10 pr-10 pl-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#F97316] focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>پایگاه داده: آنلاین و سینک</span>
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 relative transition-colors cursor-pointer border border-slate-200"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EA580C] text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-xs animate-pulse">
                    {toPersianDigits(totalAlerts)}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-black text-xs text-[#0A172F]">اعلان‌های نیازمند اقدام فوری</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {toPersianDigits(totalAlerts)} مورد
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {pendingInquiries.length > 0 && (
                      <div
                        onClick={() => {
                          setActiveTab('inquiries');
                          setIsNotificationsOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-amber-900 font-medium">
                          {toPersianDigits(pendingInquiries.length)} استعلام قیمت در انتظار پاسخ
                        </span>
                      </div>
                    )}

                    {pendingOrders.length > 0 && (
                      <div
                        onClick={() => {
                          setActiveTab('orders');
                          setIsNotificationsOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-blue-900 font-medium">
                          {toPersianDigits(pendingOrders.length)} سفارش در انتظار تأیید یا فیش
                        </span>
                      </div>
                    )}

                    {pendingAgencies.length > 0 && (
                      <div
                        onClick={() => {
                          setActiveTab('agencies');
                          setIsNotificationsOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-900 font-medium">
                          {toPersianDigits(pendingAgencies.length)} تقاضای جدید نمایندگی
                        </span>
                      </div>
                    )}

                    {openTickets.length > 0 && (
                      <div
                        onClick={() => {
                          setActiveTab('crm');
                          setIsNotificationsOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-purple-900 font-medium">
                          {toPersianDigits(openTickets.length)} تیکت پشتیبانی فنی بی‌پاسخ
                        </span>
                      </div>
                    )}

                    {totalAlerts === 0 && (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        تمام هشدارها و موارد بررسی شده‌اند!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Profile Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-xl bg-[#0A172F] text-white flex items-center justify-center text-xs font-black">
                A
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-[11px] font-bold text-[#0A172F]">{currentUser.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">{currentUser.username}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area (محتوای روی زمینه روشن) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
};
