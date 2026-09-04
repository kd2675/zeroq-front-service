import type { SpaceItem, SpaceSnapshot } from "@/app/types/space";

export type PageData<T> = {
  content: T[];
  number?: number;
  totalPages?: number;
  totalElements?: number;
  last?: boolean;
};

export type FavoriteItem = {
  id: number;
  spaceId: number;
  spaceName: string;
  order: number;
  note?: string | null;
};

export type FavoriteSpaceItem = FavoriteItem & {
  space?: SpaceItem;
  snapshot?: SpaceSnapshot;
  detailUnavailable?: boolean;
};

export type ReviewItem = {
  id: number;
  spaceId: number;
  spaceName: string;
  profileId: number;
  userName?: string | null;
  rating: number;
  title: string;
  content: string;
  likeCount: number;
  verified: boolean;
  createdAt: string;
};
