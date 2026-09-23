import React, { useCallback, useRef, useState } from 'react';
import { Camera, Upload, ImagePlus, X, Sparkles } from 'lucide-react';

interface VisualUploaderProps {
  onImageSelected: (file: File) => void;
  disabled?: boolean;
}

/**
 * بخش ورودی تصویر: آپلود + Drag & Drop + گرفتن عکس با دوربین موبایل.
 * (طبق نقشه راه §۱۵)
 */
export const VisualUploader: React.FC<VisualUploaderProps> = ({ onImageSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file?: File | null) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setLocalError('لطفاً فقط فایل تصویری (عکس) انتخاب کنید.');
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        setLocalError('حجم تصویر باید کمتر از ۱۲ مگابایت باشد.');
        return;
      }
      setLocalError(null);
      setPreview(URL.createObjectURL(file));
      onImageSelected(file);
    },
    [onImageSelected]
  );

  const reset = () => {
    setPreview(null);
    setLocalError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${
          isDragging ? 'border-[#F97316] bg-orange-50/60' : 'border-slate-300 bg-slate-50/60 hover:border-[#F97316]/60'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className="px-5 py-8 sm:px-8 sm:py-10 flex flex-col items-center text-center gap-4">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="پیش‌نمایش تصویر انتخابی"
                className="max-h-56 rounded-xl border border-slate-200 bg-white object-contain shadow-sm"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={reset}
                  className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-red-500 cursor-pointer"
                  title="حذف تصویر"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F97316] to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <ImagePlus className="w-8 h-8 text-white" />
            </div>
          )}

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-black text-[#0A172F]">
              محصول موردنظر خود را با تصویر پیدا کنید
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-md">
              عکس قطعه یا محصول را آپلود کنید تا در کاتالوگ اطلس جستجو کنیم. تصویر را می‌توانید بکشید و اینجا رها کنید،
              یا از دوربین گوشی عکس بگیرید.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto h-12 px-6 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>آپلود تصویر</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto h-12 px-6 bg-white hover:bg-slate-50 text-[#0A172F] font-bold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#F97316]" />
              <span>گرفتن عکس با دوربین</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            <span>تشخیص فقط بر اساس شکل و ظاهر خود قطعه انجام می‌شود — نیازی به دانستن کد یا نام قطعه نیست.</span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        {/* capture=environment → دوربین پشت گوشی */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>

      {localError && (
        <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {localError}
        </div>
      )}
    </div>
  );
};
