import { deleteJson, getJson, postJson, type ApiResult } from "@/app/lib/api";
import { buildServiceAuthHeaders } from "@/app/lib/auth";
import type { SpaceItem, SpaceSnapshot } from "@/app/types/space";
import type { FavoriteItem, PageData, ReviewItem } from "@/app/types/userContent";

/** 인증 사용자의 저장 공간 목록을 순서대로 조회한다. */
export function getFavorites(
  accessToken: string,
  page = 0,
  size = 100,
): Promise<ApiResult<PageData<FavoriteItem>>> {
  return getJson(
    `/api/zeroq/v1/favorites?page=${page}&size=${size}`,
    buildServiceAuthHeaders(accessToken),
  );
}

/** 공간을 저장 목록에 추가한다. */
export function addFavorite(
  accessToken: string,
  spaceId: number,
): Promise<ApiResult<FavoriteItem>> {
  return postJson(
    `/api/zeroq/v1/favorites/${spaceId}`,
    {},
    buildServiceAuthHeaders(accessToken),
  );
}

/** 공간을 저장 목록에서 제거한다. */
export function removeFavorite(
  accessToken: string,
  spaceId: number,
): Promise<ApiResult<void>> {
  return deleteJson(
    `/api/zeroq/v1/favorites/${spaceId}`,
    buildServiceAuthHeaders(accessToken),
  );
}

/** 검증 여부와 무관한 서버 검색 대신, ID로 단일 공간 상세를 조회한다. */
export function getSpace(
  accessToken: string,
  spaceId: number,
): Promise<ApiResult<SpaceItem>> {
  return getJson(
    `/api/zeroq/v1/spaces/${spaceId}`,
    buildServiceAuthHeaders(accessToken),
  );
}

/** 일반 사용자에게 공개된 계산 스냅샷을 조회한다. */
export function getSpaceSnapshot(
  accessToken: string,
  spaceId: number,
): Promise<ApiResult<SpaceSnapshot>> {
  return getJson(
    `/api/zeroq/v1/space-sensors/spaces/${spaceId}/snapshot?recalculate=false`,
    buildServiceAuthHeaders(accessToken),
  );
}

/** 공간의 최신 리뷰 페이지를 조회한다. */
export function getSpaceReviews(
  spaceId: number,
  page = 0,
  size = 20,
): Promise<ApiResult<PageData<ReviewItem>>> {
  return getJson(`/api/zeroq/v1/reviews/spaces/${spaceId}?page=${page}&size=${size}`);
}

/** 현재 프로필이 작성한 최신 리뷰 페이지를 조회한다. */
export function getProfileReviews(
  profileId: number,
  page = 0,
  size = 20,
): Promise<ApiResult<PageData<ReviewItem>>> {
  return getJson(`/api/zeroq/v1/reviews/profiles/${profileId}?page=${page}&size=${size}`);
}

export type CreateReviewInput = {
  title: string;
  content: string;
  rating: number;
};

/** 백엔드의 query-parameter 리뷰 생성 계약에 맞춰 새 리뷰를 등록한다. */
export function createReview(
  accessToken: string,
  spaceId: number,
  input: CreateReviewInput,
): Promise<ApiResult<ReviewItem>> {
  const query = new URLSearchParams({
    title: input.title,
    content: input.content,
    rating: String(input.rating),
  });
  return postJson(
    `/api/zeroq/v1/reviews/spaces/${spaceId}?${query.toString()}`,
    {},
    buildServiceAuthHeaders(accessToken),
  );
}
