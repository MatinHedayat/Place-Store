export type PlaceCategory = 'food' | 'place';

export interface FriendRating {
  userName: string;
  score: number;
  comment?: string;
  createdAt: number;
}

export interface PlaceItem {
  id: string;
  title: string;
  category: PlaceCategory;
  locationName: string;
  lat: number;
  lng: number;
  suggestedBy: string;
  isVisited: boolean;
  visitedDate?: string;
  isPinned: boolean;
  notes?: string;
  images: string[];
  ratings: FriendRating[];
  averageRating: number;
  ratingsCount: number;
  groupKey: string;
  createdAt: number;
  updatedAt: number;
}

export interface NeighborhoodPreset {
  name: string;
  lat: number;
  lng: number;
  city: string;
}
