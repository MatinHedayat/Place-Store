import React, { useRef, useState } from 'react';
import { PlaceItem } from '../types';
import { formatPersianNumber } from '../utils/imageCompressor';
import {
  X,
  Cloud,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Globe,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  places: PlaceItem[];
  onRestoreSeed: () => Promise<void>;
  onImportJson: (items: PlaceItem[]) => Promise<void>;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  places,
  onRestoreSeed,
  onImportJson,
}) => {
  const [copied, setCopied] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = JSON.stringify(places, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patoghyab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('فایل پشتیبان لیست با موفقیت دانلود شد.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setStatusMessage('فرمت فایل JSON معتبر نیست.');
        return;
      }
      setRestoring(true);
      await onImportJson(parsed);
      setStatusMessage('لیست با موفقیت از فایل پشتیبان بازیابی شد.');
    } catch {
      setStatusMessage('خطا در خواندن فایل JSON.');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(firebaseConfig, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetToInitial = async () => {
    setRestoring(true);
    setStatusMessage('');
    try {
      await onRestoreSeed();
      setStatusMessage('۲۱ آیتم اولیه گروه تلگرام بررسی و همگام‌سازی شدند.');
    } catch {
      setStatusMessage('خطا در بازگردانی آیتم‌های اولیه.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              راهنمای استقرار روی Vercel و مدیریت دیتابیس رایگان
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto text-right">
          {statusMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Section 1: Database Status */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>وضعیت فعلی دیتابیس: متصل به Firebase Firestore (رایگان)</span>
              </div>
              <span className="text-xs text-stone-500 tabular-nums">
                {formatPersianNumber(places.length)} آیتم فعال
              </span>
            </div>
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              این برنامه از دیتابیس ابری رایگان <strong>Firebase Firestore</strong> استفاده می‌کند.
              برخلاف فایل‌های لوکال که روی هاستینگ Vercel بعد از چند دقیقه پاک می‌شوند، تمام آیتم‌ها،
              تیک‌های «امتحان شده» و امتیازهای بچه‌های گروه در فضای ابری ذخیره می‌شوند و به‌صورت زنده
              (Real-time) برای همه اعضای گروه قابل مشاهده هستند.
            </p>
          </div>

          {/* Section 2: Step-by-Step Vercel Deployment Guide */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-600" />
              <span>مراحل دیپلوی (انتشار) رایگان روی Vercel</span>
            </h3>

            <ol className="space-y-2.5 text-xs leading-relaxed text-stone-700 dark:text-stone-300 list-decimal list-inside bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
              <li>
                پروژه را دانلود کرده یا مستقیم در یک مخزن (Repository) در{' '}
                <strong>GitHub</strong> خود قرار دهید.
              </li>
              <li>
                وارد سایت{' '}
                <span className="font-mono text-orange-600">vercel.com</span>{' '}
                شوید و روی دکمه <strong>Add New &rarr; Project</strong> کلیک کنید و مخزن گیت‌هاب را انتخاب نمایید.
              </li>
              <li>
                فریم‌ورک را روی <strong>Vite</strong> بگذارید (خود ورسل به‌صورت خودکار تشخیص می‌دهد: دستور بیلد{' '}
                <code className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono">
                  npm run build
                </code>{' '}
                و پوشه خروجی{' '}
                <code className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono">
                  dist
                </code>
                ).
              </li>
              <li>
                فایل تنظیمات دیتابیس (<code className="font-mono">firebase-applet-config.json</code>) از قبل داخل پروژه قرار دارد؛ بنابراین نیازی به تنظیم پیچیده نیست و بلافاصله بعد از زدن دکمه{' '}
                <strong>Deploy</strong> لینک اختصاصی گروه شما آماده می‌شود.
              </li>
              <li>
                لینک ساخته‌شده (مثلاً{' '}
                <span className="font-mono text-stone-500">
                  patogh-friends.vercel.app
                </span>
                ) را در بیو یا پیام پین‌شده گروه تلگرام قرار دهید!
              </li>
            </ol>
          </div>

          {/* Section 3: Using Your Own Personal Firebase (Optional) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-600" />
                <span>تنظیمات اتصال دیتابیس (firebase-applet-config.json)</span>
              </h3>
              <button
                type="button"
                onClick={handleCopyConfig}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی تنظیمات</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              در حال حاضر دیتابیس ابری شما آماده و متصل است. اگر در آینده خواستید از اکانت شخصی Firebase خودتان استفاده کنید، کافی است مقادیر فایل زیر را جایگزین کنید:
            </p>
            <pre
              dir="ltr"
              className="p-3.5 rounded-xl bg-stone-900 text-stone-200 text-[11px] font-mono overflow-x-auto leading-relaxed"
            >
              {JSON.stringify(
                {
                  projectId: firebaseConfig.projectId,
                  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
                  authDomain: firebaseConfig.authDomain,
                },
                null,
                2
              )}
            </pre>
          </div>

          {/* Section 4: Backup & Seed Restoration */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              پشتیبان‌گیری و مدیریت لیست اولیه تلگرام
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-700 dark:text-stone-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-orange-600" />
                <span>دانلود فایل پشتیبان (JSON)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                type="button"
                disabled={restoring}
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-700 dark:text-stone-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                <span>بارگذاری از فایل پشتیبان</span>
              </button>

              <button
                type="button"
                disabled={restoring}
                onClick={handleResetToInitial}
                className="px-3.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 text-xs font-semibold text-orange-700 dark:text-orange-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>همگام‌سازی مجدد ۲۱ آیتم اولیه تلگرام</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
