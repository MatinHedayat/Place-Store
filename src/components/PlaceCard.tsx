import React from 'react';
import { PlaceItem } from '../types';
import { formatPersianNumber, getNavigationLinks } from '../utils/imageCompressor';
import {
  MapPin,
  Star,
  CheckCircle2,
  Pin,
  Navigation,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';

interface PlaceCardProps {
  place: PlaceItem;
  isSelected: boolean;
  onSelectOnMap: (place: PlaceItem) => void;
  onOpenDetail: (place: PlaceItem) => void;
  onToggleVisited: (place: PlaceItem) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  isSelected,
  onSelectOnMap,
  onOpenDetail,
  onToggleVisited,
}) => {
  const navLinks = getNavigationLinks(
    place.lat,
    place.lng,
    place.title,
    place.locationName
  );

  const hasCover = place.images && place.images.length > 0;

  return (
    <article
      onClick={() => onSelectOnMap(place)}
      className={`group rounded-2xl bg-white dark:bg-stone-900 border transition-all duration-150 cursor-pointer flex flex-col justify-between p-4 ${
        isSelected
          ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-md'
          : 'border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
      }`}
    >
      <div>
        {/* Optional Thumbnail Image if present */}
        {hasCover && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(place);
            }}
            className="relative w-full h-36 mb-3 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800"
          >
            <img
              src={place.images[0]}
              alt={place.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {place.images.length > 1 && (
              <span className="absolute bottom-2 left-2 bg-black/65 text-white text-[11px] px-2 py-0.5 rounded-md inline-flex items-center gap-1 tabular-nums">
                <ImageIcon className="w-3 h-3" />
                {formatPersianNumber(place.images.length)}
              </span>
            )}
          </div>
        )}

        {/* Quiet Unboxed Metadata Kicker (Zero-Pill Discipline) */}
        <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400 mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span>
              {place.category === 'food' ? 'غذا و خوراکی' : 'مکان دیدنی'}
            </span>
            <span aria-hidden="true">·</span>
            <span>پیشنهاد {place.suggestedBy}</span>
            {place.isPinned && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-0.5 text-orange-600 dark:text-orange-400 font-medium">
                  <Pin className="w-3 h-3" />
                  پین‌شده
                </span>
              </>
            )}
          </div>

          {place.ratingsCount > 0 ? (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold tabular-nums shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{formatPersianNumber(place.averageRating.toFixed(1))}</span>
              <span className="text-stone-400 font-normal text-[11px]">
                ({formatPersianNumber(place.ratingsCount)})
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-stone-400 shrink-0">بدون رای</span>
          )}
        </div>

        {/* Primary Title */}
        <h3
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(place);
          }}
          className={`text-base font-bold leading-snug mb-1 transition-colors hover:text-orange-600 ${
            place.isVisited
              ? 'text-stone-700 dark:text-stone-300'
              : 'text-stone-900 dark:text-stone-100'
          }`}
        >
          {place.title}
        </h3>

        {/* Neighborhood / Location Line */}
        <div className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400 mb-3">
          <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          <span className="truncate">{place.locationName}</span>
        </div>

        {/* Recent Voter Preview (if any) */}
        {place.ratings.length > 0 && (
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mb-3 truncate">
            آخرین امتیازها:{' '}
            {place.ratings
              .slice(-3)
              .map((r) => `${r.userName} (${formatPersianNumber(r.score)}★)`)
              .join(' · ')}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2">
        {/* Toggle Visited Checkbox Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisited(place);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            place.isVisited
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
          }`}
        >
          <CheckCircle2
            className={`w-3.5 h-3.5 ${
              place.isVisited ? 'text-emerald-600' : 'text-stone-400'
            }`}
          />
          <span>{place.isVisited ? 'امتحان شد ✓' : 'امتحان کردیم؟'}</span>
        </button>

        {/* Quick Actions: Rate/Gallery & Map Links */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(place);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>امتیاز و نظر</span>
          </button>

          <a
            href={navLinks.neshan}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="مسیریابی در نشان"
            className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
          </a>

          <a
            href={navLinks.googleMaps}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="نمایش در گوگل مپ"
            className="p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
