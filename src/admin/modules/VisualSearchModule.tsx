import React, { useCallback, useEffect, useState } from 'react';
import {
  Database,
  RefreshCw,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Wrench,
  ScrollText,
  Settings2,
  PlayCircle,
  Search,
  X,
  Plus,
  Loader2,
  Activity,
  Cpu,
} from 'lucide-react';
import {
  visualProductSearchService,
  CUSTOM_REQUEST_STATUS_LABELS,
  type CustomRequestRecord,
  type CustomRequestStatus,
  type IndexStatusPayload,
  type VisualSearchLog,
  type VisualSearchSettings,
} from '../../services/visualProductSearchService';
import { toPersianDigits } from '../../utils/formatters';

type Tab = 'status' | 'requests' | 'logs' | 'settings';

const RESULT_LABELS: Record<string, { label: string; className: string }> = {
  EXACT: { label: 'کالای دقیق', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SIMILAR: { label: 'کالاهای مشابه', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  NO_MATCH: { label: 'پیدا نشد', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/**
 * ماژول مدیریت «جستجوی بصری محصول» (طبق §۱۷ و §۲۴)
 *   • مدیریت ایندکس (وضعیت embedding ها، تصاویر بدون embedding، خطاها، Re-index)
 *   • صندوق درخواست‌های ساخت/تأمین سفارشی
 *   • لاگ جستجوها
 *   • تنظیمات سیاست تصمیم‌گیری
 */
export const VisualSearchModule: React.FC = () => {
  const [tab, setTab] = useState<Tab>('status');
  const [status, setStatus] = useState<IndexStatusPayload | null>(null);
  const [logs, setLogs] = useState<VisualSearchLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<CustomRequestRecord[]>([]);
  const [settings, setSettings] = useState<VisualSearchSettings | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<CustomRequestRecord | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await visualProductSearchService.getIndexStatus();
      setStatus(res.status);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await refreshStatus();
    const [logsRes, reqRes, settingsRes] = await Promise.all([
      visualProductSearchService.getLogs(80).catch(() => ({ logs: [], stats: null }) as any),
      visualProductSearchService.getRequests().catch(() => ({ requests: [], stats: null }) as any),
      visualProductSearchService.getSettings().catch(() => ({ settings: null, meta: null }) as any),
    ]);
    setLogs(logsRes.logs || []);
    setStats(logsRes.stats);
    setRequests(reqRes.requests || []);
    setSettings(settingsRes.settings);
    setMeta(settingsRes.meta);
  }, [refreshStatus]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // پایش پیشرفت ایندکس‌سازی
  useEffect(() => {
    if (!status?.building) return;
    const timer = setInterval(() => void refreshStatus(), 4000);
    return () => clearInterval(timer);
  }, [status?.building, refreshStatus]);

  const runReindex = async (reset: boolean) => {
    setBusy('reindex');
    try {
      const res = await visualProductSearchService.reindex(reset);
      setNotice(res.message || 'ایندکس‌سازی آغاز شد.');
      setTimeout(() => void refreshStatus(), 1200);
    } catch (e: any) {
      const msg = String(e?.message || '');
      setNotice(msg || 'اجرای بازسازی ایندکس ناموفق بود.');
    } finally {
      setBusy(null);
    }
  };

  const runSelfTest = async () => {
    setBusy('selftest');
    setTestResult(null);
    try {
      const res = await visualProductSearchService.selfTest(5);
      setTestResult(res);
    } catch (e: any) {
      setNotice(e?.message || 'تست خودکار ناموفق بود.');
    } finally {
      setBusy(null);
    }
  };

  const changeRequestStatus = async (id: string, next: CustomRequestStatus) => {
    setBusy(`req-${id}`);
    try {
      await visualProductSearchService.updateRequestStatus(id, next);
      await refreshAll();
    } finally {
      setBusy(null);
    }
  };

  const saveSettingsPatch = async (patch: Partial<VisualSearchSettings>) => {
    setBusy('settings');
    try {
      const res = await visualProductSearchService.saveSettings(patch);
      setSettings(res.settings);
      setNotice('تنظیمات ذخیره شد.');
    } finally {
      setBusy(null);
    }
  };

  const pct = status ? Math.round((status.indexedProducts / Math.max(1, status.totalProducts)) * 100) : 0;

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'status', label: 'وضعیت ایندکس و موتور', icon: Database },
    { id: 'requests', label: 'درخواست‌های ساخت/تأمین سفارشی', icon: Wrench, badge: stats?.newCustomRequests },
    { id: 'logs', label: 'لاگ جستجوها', icon: ScrollText },
    { id: 'settings', label: 'تنظیمات موتور', icon: Settings2 },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* سربرگ */}
      <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F97316] to-amber-600 flex items-center justify-center shadow-md">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#0A172F]">جستجوی بصری محصول (Visual Product Search)</h2>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                موتور تشخیص قطعه از روی تصویر — مقایسه‌ی ظاهر، شکل و ساختار با کاتالوگ اطلس
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runSelfTest}
              disabled={busy === 'selftest'}
              className="inline-flex items-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-[#0A172F] font-bold text-[11px] rounded-xl transition-all cursor-pointer disabled:opacity-60"
            >
              {busy === 'selftest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 text-[#F97316]" />}
              <span>تست خودکار موتور</span>
            </button>
            <button
              onClick={() => runReindex(false)}
              disabled={busy === 'reindex' || status?.building}
              className="inline-flex items-center gap-2 h-10 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-[11px] rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {busy === 'reindex' || status?.building ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{status?.building ? 'در حال ایندکس‌سازی...' : 'Re-index Products'}</span>
            </button>
            <button
              onClick={() => runReindex(true)}
              disabled={busy === 'reindex' || status?.building}
              className="inline-flex items-center gap-2 h-10 px-4 bg-white hover:bg-red-50 border border-red-200 text-red-600 font-bold text-[11px] rounded-xl transition-all cursor-pointer disabled:opacity-60"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>بازسازی کامل (پاک‌سازی + ایندکس)</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-4 text-[11px] font-bold text-[#0A172F] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-[#94A3B8] hover:text-[#64748B] cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* تب‌ها */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                tab === t.id
                  ? 'bg-[#0A172F] text-white border-[#0A172F] shadow-sm'
                  : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.badge ? (
                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full bg-[#F97316] text-white">
                  {toPersianDigits(t.badge)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ------------------------------ تب وضعیت ------------------------------ */}
      {tab === 'status' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Layers}
              label="محصولات دارای بردار"
              value={`${toPersianDigits(status?.indexedProducts ?? 0)} / ${toPersianDigits(status?.totalProducts ?? 0)}`}
              hint={`${toPersianDigits(pct)}٪ از کاتالوگ`}
              tone={pct === 100 ? 'success' : 'brand'}
            />
            <StatCard
              icon={Activity}
              label="تعداد بردارها"
              value={toPersianDigits(status?.vectors ?? 0)}
              hint={`${toPersianDigits(status?.indexedImages ?? 0)} تصویر پردازش‌شده`}
              tone="neutral"
            />
            <StatCard
              icon={Cpu}
              label="موتور Embedding"
              value={status?.provider === 'local-visual-v1' ? 'محلی (آفلاین)' : 'Gemini'}
              hint={`انبار برداری: ${status?.vectorStore || '—'}`}
              tone="brand"
            />
            <StatCard
              icon={Database}
              label="وضعیت Vector DB"
              value={status?.vectorDatabase?.ok ? 'سالم' : 'بررسی شود'}
              hint={status?.vectorDatabase?.detail || ''}
              tone={status?.vectorDatabase?.ok ? 'success' : 'danger'}
            />
          </div>

          {status?.building && (
            <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#0A172F]">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F97316]" />
                  در حال ایندکس‌سازی تصاویر کاتالوگ...
                </span>
                <span className="font-mono">
                  {toPersianDigits(status.progress.processed)} / {toPersianDigits(status.progress.total)}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-[#F97316] to-amber-500 transition-all duration-500"
                  style={{ width: `${Math.round((status.progress.processed / Math.max(1, status.progress.total)) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-[#94A3B8] font-mono truncate">
                {status.progress.current ? `در حال پردازش: ${status.progress.current}` : ''}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-[#0A172F] flex items-center gap-2">
                <ImageOff className="w-4 h-4 text-amber-500" />
                تصاویر بدون Embedding
              </h3>
              {status?.imagesWithoutEmbedding?.length ? (
                <ul className="space-y-1.5 max-h-64 overflow-y-auto pl-1">
                  {status.imagesWithoutEmbedding.map(row => (
                    <li
                      key={row.sku}
                      className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <span className="font-mono font-bold text-[#0A172F]">{row.sku}</span>
                      <span className="text-[#64748B] text-[10px] truncate">{row.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  همه‌ی محصولات دارای بردار بصری هستند.
                </div>
              )}
            </div>

            <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-[#0A172F] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                خطاهای پردازش
              </h3>
              {status?.errors?.length ? (
                <ul className="space-y-1.5 max-h-64 overflow-y-auto pl-1">
                  {status.errors.map((row, i) => (
                    <li key={`${row.sku}-${i}`} className="text-[11px] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <span className="font-mono font-bold text-red-700">{row.sku}</span>
                      <span className="text-red-600 block text-[10px] mt-0.5">{row.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  خطایی در پردازش تصاویر ثبت نشده است.
                </div>
              )}
              <div className="text-[10px] text-[#94A3B8] pt-1 space-y-0.5">
                <div>
                  آخرین ایندکس‌سازی:{' '}
                  {status?.lastIndexedAt
                    ? toPersianDigits(new Date(status.lastIndexedAt).toLocaleString('fa-IR'))
                    : '—'}
                </div>
                <div>مدت آخرین ایندکس: {status?.lastDurationMs ? `${toPersianDigits(Math.round(status.lastDurationMs / 1000))} ثانیه` : '—'}</div>
              </div>
            </div>
          </div>

          {testResult && (
            <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-[#0A172F] flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-[#F97316]" />
                نتیجه تست خودکار (تصویر کاتالوگ → انتظار تطابق دقیق همان کالا)
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                  موفق: <strong className="font-mono">{toPersianDigits(testResult.passed)}</strong> از{' '}
                  <strong className="font-mono">{toPersianDigits(testResult.total)}</strong>
                </span>
                <span
                  className={`rounded-lg px-3 py-1.5 border font-bold ${
                    testResult.passed === testResult.total
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  دقت: {toPersianDigits(Math.round((testResult.accuracy || 0) * 100))}٪
                </span>
              </div>
              <div className="space-y-1.5">
                {(testResult.results || []).map((r: any) => (
                  <div
                    key={r.sku}
                    className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <span className="font-mono font-bold text-[#0A172F]">{r.sku}</span>
                    <span className="text-[#64748B]">
                      نتیجه: {RESULT_LABELS[r.resultType]?.label || r.resultType}
                      {r.matchedSku ? ` (${r.matchedSku})` : ''}
                    </span>
                    <span className={r.passed ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                      {r.passed ? '✓ قبول' : '✗ رد'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------- تب درخواست‌ها ---------------------------- */}
      {tab === 'requests' && (
        <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-sm overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-10 text-center text-[11px] text-[#64748B]">
              هنوز درخواست ساخت/تأمین سفارشی ثبت نشده است.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map(req => (
                <div key={req.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                  {req.imageDataUrl ? (
                    <button
                      onClick={() => setZoomImage(req.imageDataUrl || null)}
                      className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 cursor-pointer"
                    >
                      <img src={req.imageDataUrl} alt="تصویر درخواست" className="w-full h-full object-contain" />
                    </button>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                      <ImageOff className="w-5 h-5 text-slate-300" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#0A172F] bg-slate-100 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          req.status === 'new'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : req.status === 'closed'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {CUSTOM_REQUEST_STATUS_LABELS[req.status]}
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">
                        {toPersianDigits(new Date(req.createdAt).toLocaleString('fa-IR'))}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#475569] leading-relaxed line-clamp-2">{req.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#64748B]">
                      <span>تماس: {req.contactName} — {req.contactPhone}</span>
                      {req.company && <span>شرکت: {req.company}</span>}
                      {req.quantity && <span>تعداد: {req.quantity}</span>}
                      {req.queryId && <span className="font-mono">جستجو: {req.queryId}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={req.status}
                      onChange={e => changeRequestStatus(req.id, e.target.value as CustomRequestStatus)}
                      disabled={busy === `req-${req.id}`}
                      className="h-9 px-2 bg-white border border-[#E2E8F0] rounded-lg text-[11px] font-bold text-[#0A172F] cursor-pointer"
                    >
                      {Object.entries(CUSTOM_REQUEST_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setDetailRequest(req)}
                      className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-[#0A172F] hover:bg-slate-50 cursor-pointer"
                    >
                      جزئیات
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------ تب لاگ‌ها ------------------------------ */}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Search} label="کل جستجوها" value={toPersianDigits(stats?.total ?? 0)} hint={`۲۴ ساعت اخیر: ${toPersianDigits(stats?.last24h ?? 0)}`} tone="neutral" />
            <StatCard icon={CheckCircle2} label="نتیجه‌ی کالای دقیق" value={toPersianDigits(stats?.exact ?? 0)} tone="success" />
            <StatCard icon={Layers} label="نتیجه‌ی مشابه‌ها" value={toPersianDigits(stats?.similar ?? 0)} tone="brand" />
            <StatCard icon={ImageOff} label="بدون نتیجه" value={toPersianDigits(stats?.noMatch ?? 0)} tone="neutral" />
          </div>

          <div className="bg-white rounded-[12px] border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-[#0A172F]">آخرین جستجوها</h3>
              <button
                onClick={async () => {
                  await visualProductSearchService.clearLogs();
                  await refreshAll();
                }}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
              >
                پاک‌سازی لاگ‌ها
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center text-[11px] text-[#64748B]">لاگی ثبت نشده است.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map(log => (
                  <div key={log.id} className="p-3 flex items-center gap-3">
                    {log.thumbnailDataUrl ? (
                      <img
                        src={log.thumbnailDataUrl}
                        alt="بندانگشتی جستجو"
                        className="w-12 h-12 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer"
                        onClick={() => setZoomImage(log.thumbnailDataUrl || null)}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                    )}

                    <div className="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] text-[#64748B]">
                      <span className="font-mono font-bold text-[#0A172F]">{log.id}</span>
                      <span
                        className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full border font-bold ${
                          RESULT_LABELS[log.resultType]?.className || ''
                        }`}
                      >
                        {RESULT_LABELS[log.resultType]?.label || log.resultType}
                      </span>
                      <span>
                        {log.exactSku ? `کالا: ${log.exactSku}` : log.similarSkus?.length ? `${toPersianDigits(log.similarSkus.length)} کالای مشابه` : '—'}
                      </span>
                      <span className="font-mono">{toPersianDigits(log.totalTimeMs)}ms</span>
                    </div>

                    <span className="text-[10px] text-[#94A3B8] shrink-0 hidden lg:block">
                      {toPersianDigits(new Date(log.createdAt).toLocaleTimeString('fa-IR'))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------- تب تنظیمات ---------------------------- */}
      {tab === 'settings' && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#0A172F]">سیاست تصمیم‌گیری</h3>

            <RangeRow
              label="حداقل نتایج مشابه برای نمایش (۳ تا ۶)"
              value={settings.minSimilarResults}
              min={3}
              max={6}
              onChange={v => saveSettingsPatch({ minSimilarResults: v })}
            />
            <RangeRow
              label="حداکثر نتایج مشابه"
              value={settings.maxSimilarResults}
              min={3}
              max={8}
              onChange={v => saveSettingsPatch({ maxSimilarResults: v })}
            />
            <RangeRow
              label="آستانه‌ی شباهت برای نمایش مشابه‌ها"
              value={Math.round(settings.similarScoreFloor * 100)}
              min={40}
              max={95}
              suffix="٪"
              onChange={v => saveSettingsPatch({ similarScoreFloor: v / 100 })}
            />
            <RangeRow
              label="آستانه‌ی شباهت برداری برای تأیید محصول دقیق"
              value={Math.round(settings.exactVectorFloor * 100)}
              min={50}
              max={98}
              suffix="٪"
              onChange={v => saveSettingsPatch({ exactVectorFloor: v / 100 })}
            />
            <RangeRow
              label="حداکثر کاندیدا برای راستی‌آزمایی هوش مصنوعی"
              value={settings.maxAiCandidates}
              min={1}
              max={12}
              onChange={v => saveSettingsPatch({ maxAiCandidates: v })}
            />

            <label className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 cursor-pointer">
              <div>
                <div className="text-[11px] font-bold text-[#0A172F]">راستی‌آزمایی چهره‌به‌چهره با هوش مصنوعی</div>
                <div className="text-[10px] text-[#64748B] mt-0.5">
                  هر ادعای تطابق با یک نظر دوم مستقل بازبینی می‌شود (سیاست: بهتر است پیدا نشود تا اینکه اشتباه معرفی شود)
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.useAiVerification}
                onChange={e => saveSettingsPatch({ useAiVerification: e.target.checked })}
                className="w-4 h-4 accent-[#F97316] cursor-pointer"
              />
            </label>

            {busy === 'settings' && (
              <div className="text-[10px] text-[#94A3B8] flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                ذخیره‌سازی...
              </div>
            )}
          </div>

          <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-[#0A172F]">معماری فعال موتور</h3>
            <InfoRow label="ارائه‌دهنده‌ی Embedding" value={meta?.embeddingProvider || status?.provider || '—'} />
            <InfoRow label="انبار برداری (Vector Store)" value={status?.vectorStore || '—'} />
            <InfoRow label="راستی‌آزمایی هوش مصنوعی" value={meta?.aiAvailable ? 'فعال (کلید موجود)' : 'غیرفعال (کلید تنظیم نشده)'} />
            <InfoRow label="ارائه‌دهنده‌های پشتیبانی‌شده" value={(meta?.supportedEmbeddingProviders || []).join(' , ') || '—'} />
            <InfoRow label="انبارهای برداری پشتیبانی‌شده" value={(meta?.supportedVectorStores || []).join(' , ') || '—'} />

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] text-[#64748B] leading-relaxed space-y-1">
              <div className="font-bold text-[#0A172F] text-[11px]">تعویض موتور بدون تغییر کد</div>
              <div>• انتخاب انبار برداری: متغیر محیطی <span className="font-mono">VISUAL_SEARCH_VECTOR_STORE</span> = json | qdrant | memory</div>
              <div>• انتخاب موتور Embedding: متغیر محیطی <span className="font-mono">VISUAL_SEARCH_EMBEDDING_PROVIDER</span> = local | gemini | auto</div>
              <div>• برای Qdrant: <span className="font-mono">QDRANT_URL</span> و در صورت نیاز <span className="font-mono">QDRANT_API_KEY</span></div>
            </div>
          </div>
        </div>
      )}

      {/* نمایش تصویر بزرگ */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} alt="نمایش تصویر" className="max-h-[85vh] max-w-full rounded-xl bg-white p-2" />
        </div>
      )}

      {/* جزئیات درخواست */}
      {detailRequest && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#0A172F]">
                جزئیات درخواست <span className="font-mono text-xs">{detailRequest.id}</span>
              </h3>
              <button onClick={() => setDetailRequest(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {detailRequest.imageDataUrl && (
                <img src={detailRequest.imageDataUrl} alt="تصویر درخواست" className="w-full max-h-72 object-contain bg-slate-50 rounded-xl border border-slate-200" />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <InfoRow label="نام مشتری" value={detailRequest.contactName} />
                <InfoRow label="شماره تماس" value={detailRequest.contactPhone} />
                <InfoRow label="شرکت" value={detailRequest.company || '—'} />
                <InfoRow label="تعداد موردنیاز" value={detailRequest.quantity || '—'} />
                <InfoRow label="وضعیت" value={CUSTOM_REQUEST_STATUS_LABELS[detailRequest.status]} />
                <InfoRow label="تاریخ ثبت" value={toPersianDigits(new Date(detailRequest.createdAt).toLocaleString('fa-IR'))} />
              </div>
              <div className="text-[11px] space-y-1">
                <div className="font-bold text-[#0A172F]">توضیحات قطعه</div>
                <p className="text-[#475569] leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                  {detailRequest.description}
                </p>
              </div>
              {detailRequest.extraNotes && (
                <div className="text-[11px] space-y-1">
                  <div className="font-bold text-[#0A172F]">توضیحات تکمیلی</div>
                  <p className="text-[#475569] leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                    {detailRequest.extraNotes}
                  </p>
                </div>
              )}
              <div className="text-[11px] space-y-2">
                <div className="font-bold text-[#0A172F]">تاریخچه وضعیت</div>
                <ul className="space-y-1.5">
                  {detailRequest.statusHistory.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-[10px] text-[#64748B] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <Plus className="w-3 h-3 text-[#F97316]" />
                      <span className="font-bold">{CUSTOM_REQUEST_STATUS_LABELS[h.status]}</span>
                      <span>{toPersianDigits(new Date(h.at).toLocaleString('fa-IR'))}</span>
                      {h.note && <span className="truncate">— {h.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// اجزای کوچک داخلی
// ---------------------------------------------------------------------------

const StatCard: React.FC<{ icon: any; label: string; value: string; hint?: string; tone?: 'brand' | 'success' | 'danger' | 'neutral' }> = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}) => {
  const tones = {
    brand: 'bg-orange-50 text-[#EA580C] border-orange-200',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    danger: 'bg-red-50 text-red-600 border-red-200',
    neutral: 'bg-slate-100 text-[#475569] border-slate-200',
  };
  return (
    <div className="bg-white rounded-[12px] border border-[#E2E8F0] p-4 shadow-sm space-y-2">
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${tones[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] text-[#64748B] font-bold">{label}</div>
        <div className="text-sm font-black text-[#0A172F] mt-0.5">{value}</div>
        {hint && <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate">{hint}</div>}
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
    <span className="text-[#64748B]">{label}</span>
    <span className="font-bold text-[#0A172F] font-mono text-[10px] truncate">{value}</span>
  </div>
);

const RangeRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, suffix, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-[11px]">
      <span className="font-bold text-[#0A172F]">{label}</span>
      <span className="font-mono font-black text-[#F97316]">
        {toPersianDigits(value)}
        {suffix || ''}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full accent-[#F97316] cursor-pointer"
    />
  </div>
);
