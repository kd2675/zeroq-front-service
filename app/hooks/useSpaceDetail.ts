"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ensureAccessToken, getUserFromToken } from "@/app/lib/auth";
import {
  addFavorite,
  createReview,
  getFavorites,
  getSpace,
  getSpaceReviews,
  getSpaceSnapshot,
  removeFavorite,
  type CreateReviewInput,
} from "@/app/lib/userContent";

async function requireToken(): Promise<string> {
  const token = await ensureAccessToken();
  if (!token) throw new Error("로그인 세션을 확인할 수 없습니다.");
  return token;
}

/** 공간 상세·스냅샷·리뷰·저장 여부를 개별 React Query 캐시와 mutation으로 관리한다. */
export default function useSpaceDetail(spaceId: number | null, enabled: boolean) {
  const queryClient = useQueryClient();
  const tokenIdentity = getUserFromToken()?.userKey ?? getUserFromToken()?.username ?? "anonymous";
  const valid = enabled && spaceId !== null;

  const spaceQuery = useQuery({
    queryKey: ["space", spaceId],
    enabled: valid,
    queryFn: async () => {
      const result = await getSpace(await requireToken(), spaceId as number);
      if (!result.ok || !result.data) {
        throw new Error(
          result.status === 404
            ? "공간을 찾을 수 없거나 현재 공개되지 않았습니다."
            : "공간 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
      if (!result.data.verified) throw new Error("운영 확인이 끝난 공간만 볼 수 있습니다.");
      return result.data;
    },
    staleTime: 60_000,
    retry: false,
  });
  const snapshotQuery = useQuery({
    queryKey: ["space-snapshot", spaceId],
    enabled: valid && spaceQuery.isSuccess,
    queryFn: async () => {
      const result = await getSpaceSnapshot(await requireToken(), spaceId as number);
      if (!result.ok || !result.data) throw new Error(result.message ?? "센서 현황을 불러오지 못했습니다.");
      return result.data;
    },
    staleTime: 30_000,
  });
  const reviewsQuery = useQuery({
    queryKey: ["space-reviews", spaceId],
    enabled: valid && spaceQuery.isSuccess,
    queryFn: async () => {
      const result = await getSpaceReviews(spaceId as number, 0, 20);
      if (!result.ok || !result.data) throw new Error(result.message ?? "리뷰를 불러오지 못했습니다.");
      return result.data;
    },
    staleTime: 30_000,
  });
  const membershipQuery = useQuery({
    queryKey: ["favorite-membership", tokenIdentity],
    enabled: valid && spaceQuery.isSuccess,
    queryFn: async () => {
      const result = await getFavorites(await requireToken(), 0, 100);
      if (!result.ok || !result.data) throw new Error(result.message ?? "저장 여부를 불러오지 못했습니다.");
      return result.data.content.map((item) => item.spaceId);
    },
    staleTime: 30_000,
  });
  const favorite = Boolean(spaceId && membershipQuery.data?.includes(spaceId));

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!spaceId) throw new Error("공간을 확인할 수 없습니다.");
      const token = await requireToken();
      const result = favorite
        ? await removeFavorite(token, spaceId)
        : await addFavorite(token, spaceId);
      if (!result.ok) throw new Error(result.message ?? "저장 상태를 변경하지 못했습니다.");
      return favorite ? "removed" : "added";
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["favorite-membership", tokenIdentity] }),
        queryClient.invalidateQueries({ queryKey: ["favorites", tokenIdentity] }),
        queryClient.invalidateQueries({ queryKey: ["profile-overview", tokenIdentity] }),
      ]);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      if (!spaceId) throw new Error("공간을 확인할 수 없습니다.");
      const result = await createReview(await requireToken(), spaceId, input);
      if (!result.ok || !result.data) throw new Error(result.message ?? "리뷰를 등록하지 못했습니다.");
      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["space-reviews", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["space", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["profile-overview", tokenIdentity] }),
      ]);
    },
  });

  const coreError = spaceQuery.error instanceof Error ? spaceQuery.error.message : null;
  const mutationError = favoriteMutation.error instanceof Error
    ? favoriteMutation.error.message
    : reviewMutation.error instanceof Error
      ? reviewMutation.error.message
      : null;
  const partialError = snapshotQuery.error || reviewsQuery.error || membershipQuery.error;
  const notice = favoriteMutation.isSuccess
    ? favoriteMutation.data === "added" ? "저장 목록에 추가했습니다." : "저장 목록에서 제거했습니다."
    : reviewMutation.isSuccess
      ? "리뷰를 등록했습니다."
      : partialError
        ? "일부 정보를 불러오지 못했습니다. 공간 정보는 계속 볼 수 있습니다."
        : null;

  return {
    space: spaceQuery.data ?? null,
    snapshot: snapshotQuery.data ?? null,
    reviews: reviewsQuery.data?.content ?? [],
    reviewCount: reviewsQuery.data?.totalElements ?? reviewsQuery.data?.content.length ?? 0,
    favorite,
    favoriteLoading: membershipQuery.isPending,
    loading: spaceQuery.isPending,
    savingFavorite: favoriteMutation.isPending,
    submittingReview: reviewMutation.isPending,
    refreshingSnapshot: snapshotQuery.isFetching && !snapshotQuery.isPending,
    error: mutationError ?? coreError,
    notice,
    load: spaceQuery.refetch,
    toggleFavorite: favoriteMutation.mutateAsync,
    submitReview: async (input: CreateReviewInput) => {
      try {
        await reviewMutation.mutateAsync(input);
        return true;
      } catch {
        return false;
      }
    },
    refreshSnapshot: snapshotQuery.refetch,
  };
}
