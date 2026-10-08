import React, { useState, useRef } from 'react';
import { PlaceCategory, PlaceItem } from '../types';
import { DEFAULT_FRIENDS, NEIGHBORHOOD_PRESETS } from '../data/seedPlaces';
import { compressImageFile, formatPersianNumber } from '../utils/imageCompressor';
import { LocationPickerMap } from './InteractiveMap';
import {
  X,
  Utensils,
  Compass,
  MapPin,
  ImagePlus,
  Trash2,
  Pin,
  Check,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';

interface AddPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (placeData: {
    title: string;
    category: PlaceCategory;
    locationName: string;
    lat: number;
    lng: number;
    suggestedBy: string;
    isPinned: boolean;
    notes: string;
    images: string[];
  }) => Promise<void>;
  existingFriends: string[];
  initialData?: PlaceItem | null;
}

export const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingFriends,
  initialData,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [category, setCategory] = useState<PlaceCategory>(
    initialData?.category || 'food'
  );
  const [locationName, setLocationName] = useState(
    initialData?.locationName || ''
  );
  const [lat, setLat] = useState<number>(initialData?.lat || 35.7219);
  const [lng, setLng] = useState<number>(initialData?.lng || 51.389);
  const [suggestedBy, setSuggestedBy] = useState(
    initialData?.suggestedBy || 'علی'
  );
  const [customFriend, setCustomFriend] = useState('');
  const [isCustomFriend, setIsCustomFriend] = useState(false);
  const [isPinned, setIsPinned] = useState(initialData?.isPinned || false);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const allFriends = Array.from(
    new Set([...DEFAULT_FRIENDS, ...existingFriends].filter((f) => f && f !== 'گروه دوستان'))
  );

  const handlePresetSelect = (presetName: string) => {
    const found = NEIGHBORHOOD_PRESETS.find((p) => p.name === presetName);
    if (found) {
      setLocationName(found.name);
      setLat(found.lat);
      setLng(found.lng);
    }
  };

  const handleLocationTextChange = (val: string) => {
    setLocationName(val);
    const matched = NEIGHBORHOOD_PRESETS.find(
      (p) => val.includes(p.name) || p.name.includes(val.trim())
    );
    if (matched && val.trim().length >= 3) {
      setLat(matched.lat);
      setLng(matched.lng);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length >= 4) {
      setErrorMsg('حداکثر ۴ تصویر برای هر آیتم قابل ثبت است.');
      return;
    }

    setUploadingImage(true);
    setErrorMsg('');
    try {
      const remainingSlots = 4 - images.length;
      const selectedFiles = Array.from(files).slice(0, remainingSlots);
      const compressedList: string[] = [];

      for (const file of selectedFiles) {
        const compressed = await compressImageFile(file);
        compressedList.push(compressed);
      }

      setImages((prev) => [...prev, ...compressedList]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'خطا در فشرده‌سازی تصویر'
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    if (images.length >= 4) {
      setErrorMsg('حداکثر ۴ تصویر قابل افزودن است.');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('لینک تصویر باید با http یا https شروع شود.');
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setImageUrlInput('');
    setErrorMsg('');
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const finalFriend = isCustomFriend ? customFriend.trim() : suggestedBy.trim();

    if (!title.trim()) {
      setErrorMsg('لطفاً نام غذا، رستوران یا مکان را وارد کنید.');
      return;
    }
    if (!locationName.trim()) {
      setErrorMsg('لطفاً نام محله یا محدوده را وارد کنید.');
      return;
    }
    if (!finalFriend) {
      setErrorMsg('لطفاً نام پیشنهاددهنده را مشخص کنید.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim().slice(0, 120),
        category,
        locationName: locationName.trim().slice(0, 160),
        lat,
        lng,
        suggestedBy: finalFriend.slice(0, 60),
        isPinned,
        notes: notes.trim().slice(0, 500),
        images: images.slice(0, 4),
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'خطا در ذخیره اطلاعات در دیتابیس'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {initialData ? 'ویرایش پاتوق' : 'افزودن پیشنهاد جدید به لیست گروه'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Category Switch */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
              دسته‌بندی پیشنهاد
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
              <button
                type="button"
                onClick={() => setCategory('food')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  category === 'food'
                    ? 'bg-white dark:bg-stone-900 text-orange-600 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>غذا، کافه و خوراکی</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('place')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  category === 'place'
                    ? 'bg-white dark:bg-stone-900 text-sky-600 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>مکان دیدنی و گردش</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
              نام غذا، رستوران یا مکان *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: پیتزا رمون، کباب رضا لقمه، آشکده آقاخان..."
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>

          {/* Suggested By */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
              پیشنهاد از طرف کیه؟ *
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {allFriends.map((friend) => (
                <button
                  key={friend}
                  type="button"
                  onClick={() => {
                    setIsCustomFriend(false);
                    setSuggestedBy(friend);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    !isCustomFriend && suggestedBy === friend
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  {friend}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomFriend(true)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isCustomFriend
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                + نام جدید
              </button>
            </div>
            {isCustomFriend && (
              <input
                type="text"
                value={customFriend}
                onChange={(e) => setCustomFriend(e.target.value)}
                placeholder="نام دوست خود را بنویسید..."
                maxLength={60}
                className="mt-2.5 w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            )}
          </div>

          {/* Location Name & Map Pin */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400">
              محله / آدرس و موقعیت روی نقشه *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={locationName}
                onChange={(e) => handleLocationTextChange(e.target.value)}
                placeholder="مثلاً: جنت آباد، میدان حر، ستارخان، جاده چالوس..."
                maxLength={160}
                className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            {/* Quick Neighborhood Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] text-stone-400 shrink-0 ml-1">
                محله‌های سریع:
              </span>
              {NEIGHBORHOOD_PRESETS.slice(0, 10).map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetSelect(preset.name)}
                  className="px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-stone-700 text-[11px] text-stone-600 dark:text-stone-300 shrink-0 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Interactive Map Picker */}
            <LocationPickerMap
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
              توضیحات یا آیتم پیشنهادی منو (اختیاری)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً: حتماً با سس سیر امتحان کنیم یا آخر هفته بریم..."
              maxLength={500}
              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>

          {/* Optional Image Gallery (Up to 4) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                گالری عکس (کاملاً اختیاری — تا {formatPersianNumber(4)} عکس)
              </label>
              <span className="text-[11px] text-stone-400 tabular-nums">
                {formatPersianNumber(images.length)} / {formatPersianNumber(4)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingImage || images.length >= 4}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-orange-500 text-xs font-medium text-stone-700 dark:text-stone-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                ) : (
                  <ImagePlus className="w-4 h-4 text-orange-600" />
                )}
                <span>انتخاب عکس از گوشی یا سیستم</span>
              </button>

              <div className="flex-1 flex items-center gap-1.5 min-w-[200px]">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="یا لینک مستقیم عکس (https://...)"
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer shrink-0"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {images.map((imgSrc, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 group bg-stone-100"
                  >
                    <img
                      src={imgSrc}
                      alt={`تصویر ${index + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 left-1 w-6 h-6 rounded-lg bg-black/70 text-white flex items-center justify-center opacity-90 hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pin Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`inline-flex items-center gap-2 text-xs font-medium cursor-pointer ${
                isPinned
                  ? 'text-orange-600 font-semibold'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                  isPinned
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'border-stone-300 dark:border-stone-700'
                }`}
              >
                {isPinned && <Check className="w-3.5 h-3.5" />}
              </div>
              <Pin className="w-3.5 h-3.5" />
              <span>پین کردن در بالای لیست گروه</span>
            </button>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{initialData ? 'ذخیره تغییرات' : 'ثبت در لیست گروه'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
