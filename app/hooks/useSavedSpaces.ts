"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ensureAccessToken } from "@/app/lib/auth";
import {
  getFavorites,
  getSpace,
  getSpaceSnapshot,
  removeFavorite,
} from "@/app/lib/userContent";
import type { FavoriteSpaceItem } from "@/app/types/userContent";

const FAVORITE_PAGE_SIZE = 50;
const DETAIL_REQUEST_CONCURRENCY = 4;

async function fetchSavedSpaces(): Promise<{ items: FavoriteSpaceItem[]; truncated: boolean }> {
  const token = await ensureAccessToken();
  if (!token) throw new Error("로그인 세션을 확인할 수 없습니다.");
  const favoriteResult = await getFavorites(token, 0, FAVORITE_PAGE_SIZE);
  if (!favoriteResult.ok || !favoriteResult.data?.content) {
    throw new Error(favoriteResult.message ?? "저장한 공간을 불러오지 못했습니다.");
  }

  const favorites = favoriteResult.data.content;
  const enriched: FavoriteSpaceItem[] = new Array(favorites.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(DETAIL_REQUEST_CONCURRENCY, favorites.length) },
    async () => {
      while (nextIndex < favorites.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const favorite = favorites[currentIndex];
      const [spaceResult, snapshotResult] = await Promise.all([
        getSpace(token, favorite.spaceId),
        getSpaceSnapshot(token, favorite.spaceId),
      ]);
        const verifiedSpace = spaceResult.data?.verified ? spaceResult.data : undefined;
        enriched[currentIndex] = {
        ...favorite,
        space: verifiedSpace,
        snapshot: verifiedSpace ? snapshotResult.data ?? undefined : undefined,
        detailUnavailable: !verifiedSpace,
      };
      }
    },
  );
  await Promise.all(workers);
  return {
    items: enriched.sort((left, right) => left.order - right.order),
    truncated: favoriteResult.data.last === false,
  };
}

/** 저장 목록과 공간 상세·스냅샷을 React Query로 캐시하고 제거 뒤 관련 쿼리를 무효화한다. */
export default function useSavedSpaces(enabled: boolean, identity: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["favorites", identity] as const, [identity]);
  const favoritesQuery = useQuery({
    queryKey,
    queryFn: fetchSavedSpaces,
    enabled,
    staleTime: 30_000,
  });
  const removeMutation = useMutation({
    mutationFn: async (spaceId: number) => {
      const token = await ensureAccessToken();
      if (!token) throw new Error("로그인 세션을 확인할 수 없습니다.");
      const result = await removeFavorite(token, spaceId);
      if (!result.ok) throw new Error(result.message ?? "저장 공간을 제거하지 못했습니다.");
      return spaceId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", identity] }),
  });

  const queryError = favoritesQuery.error instanceof Error ? favoritesQuery.error.message : null;
  const mutationError = removeMutation.error instanceof Error ? removeMutation.error.message : null;
  const removingIds = removeMutation.isPending && typeof removeMutation.variables === "number"
    ? new Set([removeMutation.variables])
    : new Set<number>();

  return {
    items: favoritesQuery.data?.items ?? [],
    loading: favoritesQuery.isPending,
    error: mutationError ?? queryError,
    notice: favoritesQuery.data?.truncated
      ? `최근 ${FAVORITE_PAGE_SIZE}개 저장 공간만 표시합니다.`
      : removeMutation.isSuccess
        ? "저장 목록에서 제거했습니다."
        : null,
    removingIds,
    load: favoritesQuery.refetch,
    remove: removeMutation.mutateAsync,
  };
}
