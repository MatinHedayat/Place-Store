import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { PlaceItem } from '../types';
import { formatPersianNumber, getNavigationLinks } from '../utils/imageCompressor';
import { CheckCircle2, Star, Navigation, ExternalLink } from 'lucide-react';

function createCustomIcon(category: 'food' | 'place', isVisited: boolean, isSelected: boolean) {
  const bgColor = isVisited
    ? '#16a34a'
    : category === 'food'
    ? '#ea580c'
    : '#0284c7';

  const scale = isSelected ? 'scale(1.18)' : 'scale(1)';
  const ring = isSelected ? '0 0 0 5px rgba(234, 88, 12, 0.35)' : '0 4px 12px rgba(0,0,0,0.22)';
  const symbol = isVisited ? '✓' : category === 'food' ? '🍕' : '🌲';

  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div style="
        width: 38px;
        height: 38px;
        background: ${bgColor};
        border: 2.5px solid #ffffff;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 16px;
        font-weight: 700;
        box-shadow: ${ring};
        transform: ${scale};
        transition: transform 0.15s ease;
      ">
        <span>${symbol}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });
}

function MapUpdater({
  selectedPlace,
}: {
  selectedPlace: PlaceItem | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPlace) {
      map.flyTo([selectedPlace.lat, selectedPlace.lng], 14, {
        duration: 0.9,
      });
    }
  }, [selectedPlace, map]);

  return null;
}

interface InteractiveMapProps {
  places: PlaceItem[];
  selectedPlace: PlaceItem | null;
  onSelectPlace: (place: PlaceItem) => void;
  onOpenDetail: (place: PlaceItem) => void;
  darkMode: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  onOpenDetail,
  darkMode,
}) => {
  const defaultCenter: [number, number] = [35.7219, 51.389]; // Tehran center

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-xs">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={
            darkMode
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        <MapUpdater selectedPlace={selectedPlace} />

        {places.map((place) => {
          const isSelected = selectedPlace?.id === place.id;
          const navLinks = getNavigationLinks(
            place.lat,
            place.lng,
            place.title,
            place.locationName
          );

          return (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createCustomIcon(place.category, place.isVisited, isSelected)}
              eventHandlers={{
                click: () => onSelectPlace(place),
              }}
            >
              <Popup>
                <div className="min-w-[210px] text-right font-sans p-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-stone-500">
                      {place.category === 'food' ? 'غذا و خوراکی' : 'مکان دیدنی'} · پیشنهاد {place.suggestedBy}
                    </span>
                    {place.isVisited && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        امتحان شده
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-stone-900 mb-0.5">
                    {place.title}
                  </h4>
                  <p className="text-xs text-stone-600 mb-2">
                    📍 {place.locationName}
                  </p>

                  {place.ratingsCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold mb-2 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{formatPersianNumber(place.averageRating.toFixed(1))}</span>
                      <span className="text-stone-400 font-normal">
                        ({formatPersianNumber(place.ratingsCount)} رای)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(place)}
                      className="flex-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      جزئیات و امتیازدهی
                    </button>
                    <a
                      href={navLinks.neshan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
                      title="مسیریابی با نشان"
                    >
                      <Navigation className="w-3 h-3" />
                      نشان
                    </a>
                    <a
                      href={navLinks.googleMaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
                      title="گوگل مپ"
                    >
                      <ExternalLink className="w-3 h-3" />
                      مپ
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-3 right-3 z-20 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-stone-200/80 dark:border-stone-800 shadow-xs flex items-center gap-3 text-xs text-stone-700 dark:text-stone-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-600 inline-block"></span>
          <span>غذا و کافه</span>
        </div>
        <span className="text-stone-300 dark:text-stone-700">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-sky-600 inline-block"></span>
          <span>مکان دیدنی</span>
        </div>
        <span className="text-stone-300 dark:text-stone-700">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
          <span>امتحان شده</span>
        </div>
      </div>
    </div>
  );
};

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
    },
  });
  return null;
}

function CenterUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  lat,
  lng,
  onChange,
}) => {
  const pinIcon = L.divIcon({
    className: 'picker-pin',
    html: `
      <div style="
        width: 34px;
        height: 34px;
        background: #ea580c;
        border: 3px solid #ffffff;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.28);
      ">📍</div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 relative">
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <CenterUpdater lat={lat} lng={lng} />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
      <div className="absolute bottom-2 right-2 z-20 bg-white/90 dark:bg-stone-900/90 px-2.5 py-1 rounded-lg text-[11px] text-stone-600 dark:text-stone-300 pointer-events-none">
        برای تغییر پین، روی نقشه کلیک کنید
      </div>
    </div>
  );
};
