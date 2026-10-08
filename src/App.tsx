import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { PlaceItem, PlaceCategory, FriendRating } from './types';
import { INITIAL_SEED_PLACES, DEFAULT_FRIENDS } from './data/seedPlaces';
import { formatPersianNumber } from './utils/imageCompressor';
import { InteractiveMap } from './components/InteractiveMap';
import { PlaceCard } from './components/PlaceCard';
import { AddPlaceModal } from './components/AddPlaceModal';
import { PlaceDetailModal } from './components/PlaceDetailModal';
import { SetupGuideModal } from './components/SetupGuideModal';
import {
  Plus,
  Search,
  Map as MapIcon,
  LayoutGrid,
  Moon,
  Sun,
  Shuffle,
  CheckCircle2,
  Star,
  Pin,
  Filter,
} from 'lucide-react';

export function App() {
  const [places, setPlaces] = useState<PlaceItem[]>(INITIAL_SEED_PLACES);
  const [loading, setLoading] = useState<boolean>(true);
  const [seededChecked, setSeededChecked] = useState<boolean>(false);

  // Filters & Navigation
  const [categoryFilter, setCategoryFilter] = useState<'all' | PlaceCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'visited'>('all');
  const [friendFilter, setFriendFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'pinned' | 'rating' | 'newest'>('pinned');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile View Mode ('split' on desktop, 'list' or 'map' on mobile)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // Dark Mode
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Modals & Selected States
  const [selectedMapPlace, setSelectedMapPlace] = useState<PlaceItem | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Firestore Real-Time Listener + Automatic Seeding of the 21 Initial Telegram Items
  useEffect(() => {
    const q = query(
      collection(db, 'places'),
      where('groupKey', '==', 'friends-default')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty && !seededChecked) {
          setSeededChecked(true);
          try {
            const batch = writeBatch(db);
            for (const item of INITIAL_SEED_PLACES) {
              const ref = doc(db, 'places', item.id);
              const payload: Record<string, unknown> = {
                title: item.title,
                category: item.category,
                locationName: item.locationName,
                lat: item.lat,
                lng: item.lng,
                suggestedBy: item.suggestedBy,
                isVisited: item.isVisited,
                isPinned: item.isPinned,
                images: item.images,
                ratings: item.ratings,
                averageRating: item.averageRating,
                ratingsCount: item.ratingsCount,
                groupKey: 'friends-default',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              };
              if (item.notes) payload.notes = item.notes;
              if (item.visitedDate) payload.visitedDate = item.visitedDate;
              batch.set(ref, payload);
            }
            await batch.commit();
          } catch (err) {
            console.warn('Initial seed fallback active:', err);
          }
          setLoading(false);
          return;
        }

        setSeededChecked(true);
        const fetched: PlaceItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || '',
            category: data.category === 'place' ? 'place' : 'food',
            locationName: data.locationName || '',
            lat: typeof data.lat === 'number' ? data.lat : 35.7219,
            lng: typeof data.lng === 'number' ? data.lng : 51.389,
            suggestedBy: data.suggestedBy || 'گروه دوستان',
            isVisited: Boolean(data.isVisited),
            visitedDate: data.visitedDate || undefined,
            isPinned: Boolean(data.isPinned),
            notes: data.notes || undefined,
            images: Array.isArray(data.images) ? data.images : [],
            ratings: Array.isArray(data.ratings) ? data.ratings : [],
            averageRating:
              typeof data.averageRating === 'number' ? data.averageRating : 0,
            ratingsCount:
              typeof data.ratingsCount === 'number' ? data.ratingsCount : 0,
            groupKey: data.groupKey || 'friends-default',
            createdAt:
              typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
            updatedAt:
              typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
          };
        });

        if (fetched.length > 0) {
          setPlaces(fetched);
        }
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'places');
      }
    );

    return () => unsubscribe();
  }, [seededChecked]);

  const activeDetailPlace = useMemo(
    () => places.find((p) => p.id === detailPlaceId) || null,
    [places, detailPlaceId]
  );

  const existingFriends = useMemo(() => {
    const names = new Set<string>(DEFAULT_FRIENDS);
    places.forEach((p) => {
      if (p.suggestedBy && p.suggestedBy !== 'گروه دوستان') {
        names.add(p.suggestedBy);
      }
      p.ratings.forEach((r) => {
        if (r.userName) names.add(r.userName);
      });
    });
    return Array.from(names);
  }, [places]);

  // Filtered and Sorted Places
  const filteredPlaces = useMemo(() => {
    return places
      .filter((item) => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
          return false;
        }
        if (statusFilter === 'visited' && !item.isVisited) {
          return false;
        }
        if (statusFilter === 'pending' && item.isVisited) {
          return false;
        }
        if (friendFilter !== 'all' && item.suggestedBy !== friendFilter) {
          return false;
        }
        if (searchQuery.trim() !== '') {
          const q = searchQuery.trim().toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchLoc = item.locationName.toLowerCase().includes(q);
          const matchFriend = item.suggestedBy.toLowerCase().includes(q);
          const matchNotes = (item.notes || '').toLowerCase().includes(q);
          if (!matchTitle && !matchLoc && !matchFriend && !matchNotes) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'pinned') {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return b.createdAt - a.createdAt;
        }
        if (sortBy === 'rating') {
          if (b.averageRating !== a.averageRating) {
            return b.averageRating - a.averageRating;
          }
          return b.ratingsCount - a.ratingsCount;
        }
        return b.createdAt - a.createdAt;
      });
  }, [places, categoryFilter, statusFilter, friendFilter, sortBy, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = places.length;
    const visited = places.filter((p) => p.isVisited).length;
    const foodCount = places.filter((p) => p.category === 'food').length;
    const placeCount = places.filter((p) => p.category === 'place').length;
    return { total, visited, pending: total - visited, foodCount, placeCount };
  }, [places]);

  // CRUD Handlers
  const handleAddPlace = async (newPlaceData: {
    title: string;
    category: PlaceCategory;
    locationName: string;
    lat: number;
    lng: number;
    suggestedBy: string;
    isPinned: boolean;
    notes: string;
    images: string[];
  }) => {
    const id = `place-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const docRef = doc(db, 'places', id);

    const payload: Record<string, unknown> = {
      title: newPlaceData.title,
      category: newPlaceData.category,
      locationName: newPlaceData.locationName,
      lat: newPlaceData.lat,
      lng: newPlaceData.lng,
      suggestedBy: newPlaceData.suggestedBy,
      isVisited: false,
      isPinned: newPlaceData.isPinned,
      images: newPlaceData.images,
      ratings: [],
      averageRating: 0,
      ratingsCount: 0,
      groupKey: 'friends-default',
      createdAt: now,
      updatedAt: now,
    };

    if (newPlaceData.notes) {
      payload.notes = newPlaceData.notes;
    }

    try {
      await setDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `places/${id}`);
    }
  };

  const handleToggleVisited = async (place: PlaceItem) => {
    const docRef = doc(db, 'places', place.id);
    const nextVisited = !place.isVisited;
    const now = Date.now();

    try {
      await updateDoc(docRef, {
        isVisited: nextVisited,
        visitedDate: nextVisited
          ? new Date().toLocaleDateString('fa-IR')
          : '',
        updatedAt: now,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `places/${place.id}`);
    }
  };

  const handleTogglePin = async (place: PlaceItem) => {
    const docRef = doc(db, 'places', place.id);
    try {
      await updateDoc(docRef, {
        isPinned: !place.isPinned,
        updatedAt: Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `places/${place.id}`);
    }
  };

  const handleSubmitRating = async (
    place: PlaceItem,
    userName: string,
    score: number,
    comment: string
  ) => {
    const docRef = doc(db, 'places', place.id);
    const now = Date.now();
    const existingList = [...place.ratings];
    const existingIdx = existingList.findIndex(
      (r) => r.userName.trim() === userName.trim()
    );

    const newRatingObj: FriendRating = {
      userName: userName.trim(),
      score,
      ...(comment ? { comment } : {}),
      createdAt: now,
    };

    if (existingIdx >= 0) {
      existingList[existingIdx] = newRatingObj;
    } else {
      existingList.push(newRatingObj);
    }

    const boundedRatings = existingList.slice(0, 30);
    const sum = boundedRatings.reduce((acc, r) => acc + r.score, 0);
    const avg =
      boundedRatings.length > 0
        ? Number((sum / boundedRatings.length).toFixed(2))
        : 0;

    try {
      await updateDoc(docRef, {
        ratings: boundedRatings,
        averageRating: avg,
        ratingsCount: boundedRatings.length,
        updatedAt: now,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `places/${place.id}`);
    }
  };

  const handleAddImage = async (place: PlaceItem, imageDataUrl: string) => {
    if (place.images.length >= 4) return;
    const docRef = doc(db, 'places', place.id);
    const nextImages = [...place.images, imageDataUrl].slice(0, 4);
    try {
      await updateDoc(docRef, {
        images: nextImages,
        updatedAt: Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `places/${place.id}`);
    }
  };

  const handleRemoveImage = async (place: PlaceItem, index: number) => {
    const docRef = doc(db, 'places', place.id);
    const nextImages = place.images.filter((_, idx) => idx !== index);
    try {
      await updateDoc(docRef, {
        images: nextImages,
        updatedAt: Date.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `places/${place.id}`);
    }
  };

  const handleDeletePlace = async (place: PlaceItem) => {
    const docRef = doc(db, 'places', place.id);
    try {
      await deleteDoc(docRef);
      setDetailPlaceId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `places/${place.id}`);
    }
  };

  const handleRestoreSeed = async () => {
    const batch = writeBatch(db);
    for (const item of INITIAL_SEED_PLACES) {
      const exists = places.some((p) => p.id === item.id);
      if (!exists) {
        const ref = doc(db, 'places', item.id);
        const payload: Record<string, unknown> = {
          title: item.title,
          category: item.category,
          locationName: item.locationName,
          lat: item.lat,
          lng: item.lng,
          suggestedBy: item.suggestedBy,
          isVisited: item.isVisited,
          isPinned: item.isPinned,
          images: item.images,
          ratings: item.ratings,
          averageRating: item.averageRating,
          ratingsCount: item.ratingsCount,
          groupKey: 'friends-default',
          createdAt: item.createdAt,
          updatedAt: Date.now(),
        };
        if (item.notes) payload.notes = item.notes;
        batch.set(ref, payload);
      }
    }
    await batch.commit();
  };

  const handleImportJson = async (importedItems: PlaceItem[]) => {
    const batch = writeBatch(db);
    for (const item of importedItems.slice(0, 60)) {
      const safeId =
        item.id && /^[a-zA-Z0-9_-]+$/.test(item.id)
          ? item.id
          : `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const ref = doc(db, 'places', safeId);
      const payload: Record<string, unknown> = {
        title: String(item.title || 'بدون نام').slice(0, 120),
        category: item.category === 'place' ? 'place' : 'food',
        locationName: String(item.locationName || 'تهران').slice(0, 160),
        lat: typeof item.lat === 'number' ? item.lat : 35.7219,
        lng: typeof item.lng === 'number' ? item.lng : 51.389,
        suggestedBy: String(item.suggestedBy || 'گروه دوستان').slice(0, 60),
        isVisited: Boolean(item.isVisited),
        isPinned: Boolean(item.isPinned),
        images: Array.isArray(item.images) ? item.images.slice(0, 4) : [],
        ratings: Array.isArray(item.ratings) ? item.ratings.slice(0, 30) : [],
        averageRating:
          typeof item.averageRating === 'number' ? item.averageRating : 0,
        ratingsCount:
          typeof item.ratingsCount === 'number' ? item.ratingsCount : 0,
        groupKey: 'friends-default',
        createdAt:
          typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: Date.now(),
      };
      if (item.notes) payload.notes = String(item.notes).slice(0, 500);
      batch.set(ref, payload);
    }
    await batch.commit();
  };

  const handleRandomPick = () => {
    const unvisited = filteredPlaces.filter((p) => !p.isVisited);
    const pool = unvisited.length > 0 ? unvisited : filteredPlaces;
    if (pool.length === 0) return;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];
    setSelectedMapPlace(randomItem);
    setDetailPlaceId(randomItem.id);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#121316] text-stone-900 dark:text-stone-100 transition-colors">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/90 dark:bg-[#121316]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Single text element Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setCategoryFilter('all');
              setStatusFilter('all');
              setFriendFilter('all');
            }}
            className="text-lg sm:text-xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap"
          >
            پاتوق‌یاب گروه
          </a>

          {/* Zone 2: 4-5 Clean Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-400">
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className={`hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'all' && statusFilter === 'all'
                  ? 'text-orange-600 dark:text-orange-400 font-bold underline underline-offset-8'
                  : ''
              }`}
            >
              همه پیشنهادها
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('food')}
              className={`hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'food'
                  ? 'text-orange-600 dark:text-orange-400 font-bold underline underline-offset-8'
                  : ''
              }`}
            >
              غذا و کافه
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('place')}
              className={`hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === 'place'
                  ? 'text-orange-600 dark:text-orange-400 font-bold underline underline-offset-8'
                  : ''
              }`}
            >
              جاهای دیدنی
            </button>
            <button
              type="button"
              onClick={() =>
                setStatusFilter(statusFilter === 'visited' ? 'all' : 'visited')
              }
              className={`hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'visited'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold underline underline-offset-8'
                  : ''
              }`}
            >
              امتحان شده‌ها
            </button>
            <button
              type="button"
              onClick={() => setIsSetupModalOpen(true)}
              className="hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              راهنمای Vercel و دیتابیس
            </button>
          </nav>

          {/* Zone 3: 1-2 Primary Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              title="تغییر حالت روشن/تیره"
              className="w-10 h-10 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن پاتوق</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
        {/* Intro Summary & Quick Stats Strip */}
        <section className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-200/70 dark:border-stone-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 mb-1">
              لیست شکم‌گردی و جاهای دیدنی بچه‌های گروه
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              پیشنهادهای پین‌شده تلگرام روی نقشه · هر جا رفتیم تیک بزنید و از ۱ تا ۵ ستاره امتیاز بدید
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-stone-700 dark:text-stone-300 tabular-nums">
            <div>
              <span className="text-stone-400 ml-1">کل لیست:</span>
              <strong className="font-extrabold">
                {formatPersianNumber(stats.total)}
              </strong>
            </div>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">
              ·
            </span>
            <div>
              <span className="text-stone-400 ml-1">غذا و کافه:</span>
              <strong className="font-extrabold text-orange-600">
                {formatPersianNumber(stats.foodCount)}
              </strong>
            </div>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">
              ·
            </span>
            <div>
              <span className="text-stone-400 ml-1">جاهای دیدنی:</span>
              <strong className="font-extrabold text-sky-600">
                {formatPersianNumber(stats.placeCount)}
              </strong>
            </div>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">
              ·
            </span>
            <div>
              <span className="text-stone-400 ml-1">امتحان شده:</span>
              <strong className="font-extrabold text-emerald-600">
                {formatPersianNumber(stats.visited)}
              </strong>
            </div>

            <button
              type="button"
              onClick={handleRandomPick}
              className="mr-auto lg:mr-2 px-3 py-1.5 rounded-xl bg-stone-200/70 dark:bg-stone-800 hover:bg-orange-100 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5 text-orange-600" />
              <span>کجا بریم؟ (انتخاب شانسی)</span>
            </button>
          </div>
        </section>

        {/* Interactive Filter & Search Controls */}
        <section className="mb-6 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام غذا، رستوران، محله (مثلاً جنت آباد، پیتزا، سبلان)..."
                className="w-full pr-10 pl-4 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            {/* Status & Sort Segmented Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Segmented Control (Mobile visible too) */}
              <div className="flex items-center gap-1 p-1 bg-stone-200/60 dark:bg-stone-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'all'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  همه
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('food')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'food'
                      ? 'bg-white dark:bg-stone-900 text-orange-600 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  🍕 غذاها
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('place')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === 'place'
                      ? 'bg-white dark:bg-stone-900 text-sky-600 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  🌲 مکان‌ها
                </button>
              </div>

              {/* Visited Filter */}
              <div className="flex items-center gap-1 p-1 bg-stone-200/60 dark:bg-stone-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  همه وضعیت‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'pending'
                      ? 'bg-white dark:bg-stone-900 text-orange-600 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  نرفتیم ({formatPersianNumber(stats.pending)})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('visited')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'visited'
                      ? 'bg-white dark:bg-stone-900 text-emerald-600 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  رفتیم ✓ ({formatPersianNumber(stats.visited)})
                </button>
              </div>

              {/* Sort Control */}
              <div className="flex items-center gap-1 p-1 bg-stone-200/60 dark:bg-stone-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSortBy('pinned')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    sortBy === 'pinned'
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Pin className="w-3 h-3" />
                  <span>پین‌شده‌ها</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('rating')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    sortBy === 'rating'
                      ? 'bg-white dark:bg-stone-900 text-amber-600 shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Star className="w-3 h-3" />
                  <span>محبوب‌ترین</span>
                </button>
              </div>
            </div>
          </div>

          {/* Friends Filter Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs text-stone-400 inline-flex items-center gap-1 shrink-0 ml-1">
                <Filter className="w-3.5 h-3.5" />
                پیشنهاددهنده:
              </span>
              <button
                type="button"
                onClick={() => setFriendFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  friendFilter === 'all'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800 hover:border-stone-300'
                }`}
              >
                همه بچه‌ها
              </button>
              {existingFriends.map((friend) => (
                <button
                  key={friend}
                  type="button"
                  onClick={() =>
                    setFriendFilter(friendFilter === friend ? 'all' : friend)
                  }
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    friendFilter === friend
                      ? 'bg-orange-600 text-white'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800 hover:border-orange-300'
                  }`}
                >
                  {friend}
                </button>
              ))}
            </div>

            {/* Mobile View Switcher (List vs Map) */}
            <div className="flex lg:hidden items-center gap-1 p-1 bg-stone-200/70 dark:bg-stone-800 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  mobileView === 'list'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>لیست</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileView('map')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  mobileView === 'map'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>نقشه</span>
              </button>
            </div>
          </div>
        </section>

        {/* Main Workspace Split Grid: Cards on Right + Sticky Map on Left */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Right Column: Cards Grid (7 cols on desktop) */}
          <div
            className={`lg:col-span-7 ${
              mobileView === 'map' ? 'hidden lg:block' : 'block'
            }`}
          >
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-44 rounded-2xl bg-stone-200/60 dark:bg-stone-800/40 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredPlaces.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPlaces.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    isSelected={selectedMapPlace?.id === place.id}
                    onSelectOnMap={(p) => setSelectedMapPlace(p)}
                    onOpenDetail={(p) => setDetailPlaceId(p.id)}
                    onToggleVisited={handleToggleVisited}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-10 text-center space-y-3">
                <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
                  هیچ پاتوقی با این فیلتر پیدا نشد!
                </p>
                <p className="text-xs text-stone-500">
                  می‌توانید فیلترها را پاک کنید یا یک پیشنهاد جدید به لیست اضافه کنید.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('all');
                      setStatusFilter('all');
                      setFriendFilter('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
                  >
                    نمایش همه آیتم‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    + افزودن پیشنهاد جدید
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Left Column: Interactive Map (5 cols on desktop) */}
          <div
            className={`lg:col-span-5 lg:sticky lg:top-20 h-[460px] lg:h-[calc(100vh-120px)] ${
              mobileView === 'list' ? 'hidden lg:block' : 'block'
            }`}
          >
            <InteractiveMap
              places={filteredPlaces}
              selectedPlace={selectedMapPlace}
              onSelectPlace={(p) => setSelectedMapPlace(p)}
              onOpenDetail={(p) => setDetailPlaceId(p.id)}
              darkMode={darkMode}
            />
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 mt-12 border-t border-stone-200/70 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
        <div>
          پاتوق‌یاب گروه دوستان — ساخته شده برای جمع‌آوری پیشنهادهای شکم‌گردی و تفریح
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsSetupModalOpen(true)}
            className="hover:text-orange-600 transition-colors cursor-pointer"
          >
            راهنمای اتصال به Vercel و پشتیبان‌گیری
          </button>
        </div>
      </footer>

      {/* Modals */}
      <AddPlaceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddPlace}
        existingFriends={existingFriends}
      />

      <PlaceDetailModal
        place={activeDetailPlace}
        onClose={() => setDetailPlaceId(null)}
        onToggleVisited={handleToggleVisited}
        onTogglePin={handleTogglePin}
        onSubmitRating={handleSubmitRating}
        onAddImage={handleAddImage}
        onRemoveImage={handleRemoveImage}
        onDeletePlace={handleDeletePlace}
        existingFriends={existingFriends}
      />

      <SetupGuideModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        places={places}
        onRestoreSeed={handleRestoreSeed}
        onImportJson={handleImportJson}
      />
    </div>
  );
}

export default App;
