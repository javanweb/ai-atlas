/**
 * Atlas Visual Product Search — Runtime Persistence
 * ---------------------------------------------------------------------------
 * نگهداری وضعیت اجرایی ماژول روی دیسک:
 *   • settings.json          تنظیمات تصمیم‌گیری (آستانه‌ها و سیاست‌ها)
 *   • custom-requests.json   درخواست‌های ساخت/تأمین سفارشی
 *   • search-logs.json       لاگ جستجوها (برای پنل مدیریت)
 *   • index-meta.json        فراداده‌ی ایندکس
 *
 * هیچ‌کدام از این فایل‌ها در مخزن گیت ثبت نمی‌شوند (پوشه‌ی data/ ایگنور است).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RUNTIME_DIR, ensureRuntimePaths } from './catalog';
import type {
  CustomRequest,
  CustomRequestStatus,
  VisualSearchLog,
  VisualSearchResultType,
  VisualSearchSettings,
} from './types';

export const DEFAULT_SETTINGS: VisualSearchSettings = {
  // سیاست پیش‌فرض محافظه‌کارانه: «پیدا نکردن بهتر از معرفی اشتباه است»
  minSimilarResults: 3,
  maxSimilarResults: 6,
  preferredSimilarResults: 4,
  similarScoreFloor: 0.86,
  candidateScoreFloor: 0.55,
  exactVectorFloor: 0.78,
  useAiVerification: true,
  maxAiCandidates: 6,
};

function readJson<T>(file: string, fallback: T): T {
  try {
    const p = path.join(RUNTIME_DIR, file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  ensureRuntimePaths();
  const p = path.join(RUNTIME_DIR, file);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

// ------------------------------- Settings ---------------------------------

export function getSettings(): VisualSearchSettings {
  const stored = readJson<Partial<VisualSearchSettings>>('settings.json', {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(patch: Partial<VisualSearchSettings>): VisualSearchSettings {
  const next: VisualSearchSettings = { ...getSettings(), ...patch };
  // اعتبارسنجی محدوده‌ها (نقشه راه: ۳ تا ۶ نتیجه مشابه)
  next.minSimilarResults = Math.min(6, Math.max(3, Math.round(next.minSimilarResults)));
  next.maxSimilarResults = Math.min(8, Math.max(next.minSimilarResults, Math.round(next.maxSimilarResults)));
  next.preferredSimilarResults = Math.min(
    next.maxSimilarResults,
    Math.max(next.minSimilarResults, Math.round(next.preferredSimilarResults))
  );
  next.similarScoreFloor = Math.min(0.95, Math.max(0.4, next.similarScoreFloor));
  next.candidateScoreFloor = Math.min(0.9, Math.max(0.2, next.candidateScoreFloor));
  next.exactVectorFloor = Math.min(0.98, Math.max(0.5, next.exactVectorFloor));
  next.maxAiCandidates = Math.min(12, Math.max(1, Math.round(next.maxAiCandidates)));
  writeJson('settings.json', next);
  return next;
}

// --------------------------- Custom Requests ------------------------------

export function getCustomRequests(): CustomRequest[] {
  return readJson<CustomRequest[]>('custom-requests.json', []);
}

export function createCustomRequest(input: {
  imageDataUrl?: string;
  description: string;
  quantity: string;
  contactName: string;
  contactPhone: string;
  company?: string;
  extraNotes?: string;
  queryId?: string;
}): CustomRequest {
  const now = new Date().toISOString();
  const req: CustomRequest = {
    id: `VR-${Date.now().toString(36).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    status: 'new',
    imageDataUrl: input.imageDataUrl,
    description: input.description || '',
    quantity: input.quantity || '',
    contactName: input.contactName || '',
    contactPhone: input.contactPhone || '',
    company: input.company,
    extraNotes: input.extraNotes,
    queryId: input.queryId,
    statusHistory: [{ status: 'new', at: now, note: 'ثبت درخواست از سوی کاربر' }],
  };
  const all = getCustomRequests();
  all.unshift(req);
  writeJson('custom-requests.json', all.slice(0, 2000));
  return req;
}

export function updateCustomRequestStatus(
  id: string,
  status: CustomRequestStatus,
  adminNote?: string
): CustomRequest | null {
  const all = getCustomRequests();
  const idx = all.findIndex(r => r.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  all[idx] = {
    ...all[idx],
    status,
    adminNote: adminNote ?? all[idx].adminNote,
    updatedAt: now,
    statusHistory: [...all[idx].statusHistory, { status, at: now, note: adminNote }],
  };
  writeJson('custom-requests.json', all);
  return all[idx];
}

export function deleteCustomRequest(id: string): boolean {
  const all = getCustomRequests();
  const next = all.filter(r => r.id !== id);
  if (next.length === all.length) return false;
  writeJson('custom-requests.json', next);
  return true;
}

// ------------------------------ Search Logs --------------------------------

const MAX_LOGS = 500;

export function getSearchLogs(limit = 100): VisualSearchLog[] {
  return readJson<VisualSearchLog[]>('search-logs.json', []).slice(0, limit);
}

export function appendSearchLog(log: Omit<VisualSearchLog, 'id' | 'createdAt'>): VisualSearchLog {
  const entry: VisualSearchLog = {
    ...log,
    id: `QS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex')}`,
    createdAt: new Date().toISOString(),
  };
  const all = readJson<VisualSearchLog[]>('search-logs.json', []);
  all.unshift(entry);
  writeJson('search-logs.json', all.slice(0, MAX_LOGS));
  return entry;
}

export function clearSearchLogs(): void {
  writeJson('search-logs.json', []);
}

export interface SearchLogStats {
  total: number;
  exact: number;
  similar: number;
  noMatch: number;
  customRequests: number;
  newCustomRequests: number;
  last24h: number;
}

export function getLogStats(): SearchLogStats {
  const logs = readJson<VisualSearchLog[]>('search-logs.json', []);
  const requests = getCustomRequests();
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const count = (t: VisualSearchResultType) => logs.filter(l => l.resultType === t).length;
  return {
    total: logs.length,
    exact: count('EXACT'),
    similar: count('SIMILAR'),
    noMatch: count('NO_MATCH'),
    customRequests: requests.length,
    newCustomRequests: requests.filter(r => r.status === 'new').length,
    last24h: logs.filter(l => new Date(l.createdAt).getTime() >= dayAgo).length,
  };
}

// ------------------------------- Index Meta --------------------------------

export interface IndexMeta {
  version: number;
  provider: string;
  builtAt: string;
  durationMs: number;
  productCount: number;
  imageCount: number;
  vectorCount: number;
  /** هش محتوای تصاویر در زمان آخرین ایندکس → ایندکس افزایشی پس از ری‌استارت */
  imageHashes?: Record<string, string>;
  errors: { sku: string; image: string; message: string }[];
}

export function readIndexMeta(): IndexMeta | null {
  return readJson<IndexMeta | null>('index-meta.json', null);
}

export function writeIndexMeta(meta: IndexMeta): void {
  writeJson('index-meta.json', meta);
}
