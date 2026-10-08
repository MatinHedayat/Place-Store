import React, { useState, useRef } from 'react';
import { PlaceItem, FriendRating } from '../types';
import { DEFAULT_FRIENDS } from '../data/seedPlaces';
import {
  compressImageFile,
  formatPersianNumber,
  getNavigationLinks,
} from '../utils/imageCompressor';
import {
  X,
  Star,
  CheckCircle2,
  MapPin,
  Navigation,
  ExternalLink,
  Pin,
  ImagePlus,
  Trash2,
  MessageSquarePlus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PlaceDetailModalProps {
  place: PlaceItem | null;
  onClose: () => void;
  onToggleVisited: (place: PlaceItem) => Promise<void>;
  onTogglePin: (place: PlaceItem) => Promise<void>;
  onSubmitRating: (
    place: PlaceItem,
    userName: string,
    score: number,
    comment: string
  ) => Promise<void>;
  onAddImage: (place: PlaceItem, imageDataUrl: string) => Promise<void>;
  onRemoveImage: (place: PlaceItem, index: number) => Promise<void>;
  onDeletePlace: (place: PlaceItem) => Promise<void>;
  existingFriends: string[];
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  onClose,
  onToggleVisited,
  onTogglePin,
  onSubmitRating,
  onAddImage,
  onRemoveImage,
  onDeletePlace,
  existingFriends,
}) => {
  const [selectedUser, setSelectedUser] = useState('علی');
  const [isCustomUser, setIsCustomUser] = useState(false);
  const [customUser, setCustomUser] = useState('');
  const [score, setScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!place) return null;

  const allFriends = Array.from(
    new Set(
      [...DEFAULT_FRIENDS, ...existingFriends].filter(
        (f) => f && f !== 'گروه دوستان'
      )
    )
  );

  const navLinks = getNavigationLinks(
    place.lat,
    place.lng,
    place.title,
    place.locationName
  );

  const handleVisitedClick = async () => {
    if (!place.isVisited) {
      try {
        confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore confetti error
      }
    }
    await onToggleVisited(place);
  };

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const voterName = isCustomUser ? customUser.trim() : selectedUser.trim();
    if (!voterName) {
      setErrorMsg('لطفاً نام خود را انتخاب یا وارد کنید.');
      return;
    }

    setSubmittingVote(true);
    try {
      await onSubmitRating(
        place,
        voterName.slice(0, 50),
        score,
        comment.trim().slice(0, 300)
      );
      setComment('');
      if (isCustomUser) {
        setSelectedUser(voterName.slice(0, 50));
        setIsCustomUser(false);
        setCustomUser('');
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'خطا در ثبت امتیاز'
      );
    } finally {
      setSubmittingVote(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (place.images.length >= 4) {
      setErrorMsg('حداکثر ۴ تصویر برای هر آیتم قابل ثبت است.');
      return;
    }
    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      const compressed = await compressImageFile(file);
      await onAddImage(place, compressed);
      setActiveImageIdx(place.images.length);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'خطا در آپلود عکس'
      );
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectVoterChip = (friend: string) => {
    setIsCustomUser(false);
    setSelectedUser(friend);
    const existingVote = place.ratings.find((r) => r.userName === friend);
    if (existingVote) {
      setScore(existingVote.score);
      setComment(existingVote.comment || '');
    } else {
      setScore(5);
      setComment('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span>
              {place.category === 'food' ? '🍕 غذا و خوراکی' : '🌲 مکان دیدنی'}
            </span>
            <span aria-hidden="true">·</span>
            <span>پیشنهاد {place.suggestedBy}</span>
            {place.isPinned && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-orange-600 font-semibold">پین‌شده</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTogglePin(place)}
              title={place.isPinned ? 'برداشتن پین' : 'پین کردن در بالای لیست'}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                place.isPinned
                  ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-600'
                  : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              <Pin className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Main Header & Visited Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-1">
                {place.title}
              </h2>
              <div className="flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
                <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{place.locationName}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleVisitedClick}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                place.isVisited
                  ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-emerald-50 hover:text-emerald-700 border border-stone-200 dark:border-stone-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {place.isVisited
                  ? 'رفتیم و امتحان شد ✓'
                  : 'تیک «رفتیم و امتحان کردیم»'}
              </span>
            </button>
          </div>

          {place.notes && (
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-xl border border-stone-200/60 dark:border-stone-800">
              {place.notes}
            </p>
          )}

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={navLinks.neshan}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-600" />
              <span>مسیریابی در نشان</span>
            </a>
            <a
              href={navLinks.balad}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>مسیریابی در بلد</span>
            </a>
            <a
              href={navLinks.googleSearch}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
              <span>جستجو در گوگل‌مپ</span>
            </a>
          </div>

          {/* Photo Gallery Section */}
          <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                گالری تصاویر ({formatPersianNumber(place.images.length)} از{' '}
                {formatPersianNumber(4)})
              </h3>
              {place.images.length < 4 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3.5 h-3.5" />
                    )}
                    <span>+ افزودن عکس به گالری</span>
                  </button>
                </>
              )}
            </div>

            {place.images.length > 0 ? (
              <div className="space-y-2.5">
                <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <img
                    src={place.images[activeImageIdx] || place.images[0]}
                    alt={place.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(place, activeImageIdx)}
                    className="absolute top-3 left-3 px-2.5 py-1.5 rounded-lg bg-black/65 hover:bg-red-600 text-white text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف عکس</span>
                  </button>
                </div>

                {place.images.length > 1 && (
                  <div className="flex items-center gap-2">
                    {place.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          activeImageIdx === idx
                            ? 'border-orange-600 scale-105'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
                <span>هنوز عکسی برای این پاتوق ثبت نشده است (اختیاری).</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-orange-600 font-semibold hover:underline cursor-pointer"
                >
                  اولین عکس را اضافه کن
                </button>
              </div>
            )}
          </div>

          {/* Group Rating & Poll Section */}
          <div className="space-y-4 pt-3 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>نظرسنجی و امتیاز بچه‌های گروه</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  اسمت رو انتخاب کن و از ۱ تا ۵ ستاره امتیاز بده تا میانگین حساب بشه
                </p>
              </div>

              {place.ratingsCount > 0 && (
                <div className="text-left">
                  <div className="flex items-center gap-1 text-lg font-extrabold text-amber-600 tabular-nums">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span>
                      {formatPersianNumber(place.averageRating.toFixed(1))}
                    </span>
                    <span className="text-xs text-stone-400 font-normal">
                      / ۵
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 tabular-nums">
                    از مجموع {formatPersianNumber(place.ratingsCount)} رای
                  </div>
                </div>
              )}
            </div>

            {/* Submit Rating Form */}
            <form
              onSubmit={handleVoteSubmit}
              className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
                  امتیاز از طرف کیه؟
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {allFriends.map((friend) => (
                    <button
                      key={friend}
                      type="button"
                      onClick={() => handleSelectVoterChip(friend)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        !isCustomUser && selectedUser === friend
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-orange-400'
                      }`}
                    >
                      {friend}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomUser(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isCustomUser
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    + اسم جدید
                  </button>
                </div>
                {isCustomUser && (
                  <input
                    type="text"
                    value={customUser}
                    onChange={(e) => setCustomUser(e.target.value)}
                    placeholder="نام خود را بنویسید..."
                    maxLength={50}
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100"
                  />
                )}
              </div>

              {/* Star Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const active = (hoverScore ?? score) >= starVal;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onMouseEnter={() => setHoverScore(starVal)}
                        onMouseLeave={() => setHoverScore(null)}
                        onClick={() => setScore(starVal)}
                        className="p-1 transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            active
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-300 dark:text-stone-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="mr-2 text-xs font-bold text-amber-600 tabular-nums">
                    {formatPersianNumber(hoverScore ?? score)} از ۵ ستاره
                  </span>
                </div>
              </div>

              {/* Optional Comment */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="نظرت درباره کیفیت، قیمت یا فضا (اختیاری)..."
                  maxLength={300}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                />
                <button
                  type="submit"
                  disabled={submittingVote}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {submittingVote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  )}
                  <span>ثبت امتیاز من</span>
                </button>
              </div>
            </form>

            {/* Individual Ratings List */}
            {place.ratings.length > 0 ? (
              <div className="space-y-2">
                {place.ratings.map((r: FriendRating, idx: number) => (
                  <div
                    key={`${r.userName}-${idx}`}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {r.userName}
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, sIdx) => (
                            <Star
                              key={sIdx}
                              className={`w-3 h-3 ${
                                sIdx < r.score
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-stone-200 dark:text-stone-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                          {r.comment}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-amber-600 tabular-nums shrink-0">
                      {formatPersianNumber(r.score)} ★
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 text-center py-2">
                هنوز کسی به این پاتوق امتیاز نداده است. اولین نفر باش!
              </p>
            )}
          </div>

          {/* Delete Item Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-stone-400 hover:text-red-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف این آیتم از لیست</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">
                  مطمئنی حذف بشه؟
                </span>
                <button
                  type="button"
                  onClick={() => onDeletePlace(place)}
                  className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                >
                  بله، حذف کن
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 text-xs cursor-pointer"
                >
                  لغو
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
