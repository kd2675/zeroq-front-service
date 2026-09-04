"use client";

import { useCallback, useMemo } from "react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getJson } from "@/app/lib/api";
import { buildServiceAuthHeaders, ensureAccessToken } from "@/app/lib/auth";
import {
  getSpaceDistance,
  hasUsableOccupancy,
  matchesAvailabilityFilter,
  normalizedSearchText,
} from "@/app/lib/spacePresentation";
import type {
  AvailabilityFilter,
  SpaceItem,
  SpacePage,
  SpaceSnapshot,
  SpaceSort,
} from "@/app/types/space";
import {
  locationRejected,
  locationRequested,
  locationResolved,
  setAvailabilityFilter as setAvailabilityFilterAction,
  setExploreQuery,
  setSpaceSort,
} from "@/lib/features/explore/exploreSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

const PAGE_SIZE = 12;
const SNAPSHOT_REFRESH_INTERVAL_MS = 60_000;
const SNAPSHOT_REQUEST_CONCURRENCY = 6;

type SnapshotBatch = {
  snapshots: Record<number, SpaceSnapshot>;
  failures: Set<number>;
};

/** 공간별 endpoint의 N+1 부하를 제한하기 위해 최대 6개 worker로 스냅샷을 조회한다. */
async function fetchSnapshots(spaces: SpaceItem[]): Promise<SnapshotBatch> {
  const accessToken = await ensureAccessToken();
  if (!accessToken) {
    throw new Error("로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
  }
  const headers = buildServiceAuthHeaders(accessToken);
  const entries: Array<{
    spaceId: number;
    result: Awaited<ReturnType<typeof getJson<SpaceSnapshot>>>;
  }> = new Array(spaces.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(SNAPSHOT_REQUEST_CONCURRENCY, spaces.length) },
    async () => {
      while (nextIndex < spaces.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const space = spaces[currentIndex];
        const result = await getJson<SpaceSnapshot>(
          `/api/zeroq/v1/space-sensors/spaces/${space.id}/snapshot?recalculate=false`,
          headers,
        );
        entries[currentIndex] = { spaceId: space.id, result };
      }
    },
  );
  await Promise.all(workers);

  const snapshots: Record<number, SpaceSnapshot> = {};
  const failures = new Set<number>();
  entries.forEach(({ spaceId, result }) => {
    if (result.ok && result.data) {
      snapshots[spaceId] = result.data;
    } else {
      failures.add(spaceId);
    }
  });
  return { snapshots, failures };
}

async function fetchSpacePage(page: number): Promise<SpacePage> {
  const token = await ensureAccessToken();
  if (!token) {
    throw new Error("로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
  }
  const result = await getJson<SpacePage>(
    `/api/zeroq/v1/spaces?page=${page}&size=${PAGE_SIZE}`,
    buildServiceAuthHeaders(token),
  );
  if (!result.ok || !result.data?.content) {
    throw new Error(result.message ?? "공간 목록을 불러오지 못했습니다.");
  }
  return result.data;
}

/**
 * 서버 공간·스냅샷은 React Query 캐시로, 탐색 필터·위치는 Redux Toolkit으로 관리한다.
 * 스냅샷 부분 실패는 성공 데이터와 분리해 사용자가 0%로 오해하지 않게 한다.
 */
export default function useSpaceDiscovery(enabled: boolean, autoRefresh = true) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const explore = useAppSelector((state) => state.explore);

  const spacesQuery = useInfiniteQuery({
    queryKey: ["spaces", "verified-active"],
    queryFn: ({ pageParam }) => fetchSpacePage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.last === true) return undefined;
      if (typeof lastPage.totalPages === "number" && pages.length >= lastPage.totalPages) return undefined;
      return lastPage.content.length === PAGE_SIZE ? pages.length : undefined;
    },
    enabled,
    staleTime: 60_000,
  });

  const spaces = useMemo(
    () => spacesQuery.data?.pages.flatMap((page) => page.content) ?? [],
    [spacesQuery.data?.pages],
  );
  const spaceIds = useMemo(() => spaces.map((space) => space.id), [spaces]);
  const snapshotQueryKey = useMemo(
    () => ["space-snapshots", spaceIds] as const,
    [spaceIds],
  );
  const snapshotsQuery = useQuery({
    queryKey: snapshotQueryKey,
    queryFn: () => fetchSnapshots(spaces),
    enabled: enabled && spaces.length > 0,
    staleTime: 30_000,
    refetchInterval: autoRefresh ? SNAPSHOT_REFRESH_INTERVAL_MS : false,
    placeholderData: keepPreviousData,
  });

  const retryMutation = useMutation({
    mutationFn: async (spaceId: number) => {
      const token = await ensureAccessToken();
      if (!token) throw new Error("로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
      const result = await getJson<SpaceSnapshot>(
        `/api/zeroq/v1/space-sensors/spaces/${spaceId}/snapshot?recalculate=false`,
        buildServiceAuthHeaders(token),
      );
      if (!result.ok || !result.data) {
        throw new Error(result.message ?? "해당 공간의 센서 현황을 다시 확인하지 못했습니다.");
      }
      return { spaceId, snapshot: result.data };
    },
    onSuccess: ({ spaceId, snapshot }) => {
      queryClient.setQueryData<SnapshotBatch>(snapshotQueryKey, (current) => {
        const failures = new Set(current?.failures ?? []);
        failures.delete(spaceId);
        return {
          snapshots: { ...(current?.snapshots ?? {}), [spaceId]: snapshot },
          failures,
        };
      });
    },
  });

  const snapshots = useMemo(
    () => snapshotsQuery.data?.snapshots ?? {},
    [snapshotsQuery.data?.snapshots],
  );
  const snapshotFailures = useMemo(
    () => snapshotsQuery.data?.failures ?? new Set<number>(),
    [snapshotsQuery.data?.failures],
  );
  const visibleSpaces = useMemo(() => {
    const normalizedQuery = normalizedSearchText(explore.query);
    const filtered = spaces.filter((space) => {
      const searchableText = normalizedSearchText(
        [space.name, space.address, space.description].filter(Boolean).join(" "),
      );
      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        matchesAvailabilityFilter(
          snapshots[space.id]?.snapshot,
          snapshotFailures.has(space.id),
          explore.availabilityFilter,
        )
      );
    });

    return [...filtered].sort((left, right) => {
      if (explore.sort === "NAME") return left.name.localeCompare(right.name, "ko-KR");
      if (explore.sort === "NEAREST") {
        const leftDistance = getSpaceDistance(left, explore.userCoordinates);
        const rightDistance = getSpaceDistance(right, explore.userCoordinates);
        if (leftDistance === null) return 1;
        if (rightDistance === null) return -1;
        return leftDistance - rightDistance;
      }

      const leftSnapshot = snapshots[left.id]?.snapshot;
      const rightSnapshot = snapshots[right.id]?.snapshot;
      const leftAvailable = !snapshotFailures.has(left.id) && hasUsableOccupancy(leftSnapshot);
      const rightAvailable = !snapshotFailures.has(right.id) && hasUsableOccupancy(rightSnapshot);
      if (leftAvailable !== rightAvailable) return leftAvailable ? -1 : 1;
      if (leftAvailable && rightAvailable) {
        return (leftSnapshot.occupancyRate ?? 101) - (rightSnapshot.occupancyRate ?? 101);
      }
      return left.name.localeCompare(right.name, "ko-KR");
    });
  }, [
    explore.availabilityFilter,
    explore.query,
    explore.sort,
    explore.userCoordinates,
    snapshotFailures,
    snapshots,
    spaces,
  ]);

  const availabilitySummary = useMemo(() => {
    let available = 0;
    let quiet = 0;
    spaces.forEach((space) => {
      const snapshot = snapshots[space.id]?.snapshot;
      if (!snapshotFailures.has(space.id) && hasUsableOccupancy(snapshot)) {
        available += 1;
        if (snapshot.crowdLevel === "EMPTY" || snapshot.crowdLevel === "LOW") quiet += 1;
      }
    });
    return { available, quiet, unavailable: spaces.length - available };
  }, [snapshotFailures, snapshots, spaces]);

  /** 브라우저 좌표는 사용자 동작 뒤 Redux 메모리에만 두며 API에는 전달하지 않는다. */
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      dispatch(locationRejected("이 브라우저에서는 위치 확인을 지원하지 않습니다."));
      return;
    }
    if (explore.userCoordinates) {
      dispatch(locationResolved(explore.userCoordinates));
      return;
    }
    dispatch(locationRequested());
    navigator.geolocation.getCurrentPosition(
      (position) => dispatch(locationResolved({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })),
      (error) => dispatch(locationRejected(
        error.code === error.PERMISSION_DENIED
          ? "위치 권한이 꺼져 있습니다. 브라우저 설정에서 허용한 뒤 다시 시도해 주세요."
          : "현재 위치를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      )),
      { enableHighAccuracy: false, timeout: 7_000, maximumAge: 300_000 },
    );
  }, [dispatch, explore.userCoordinates]);

  const loadSpacePage = useCallback(async (_requestedPage: number, append: boolean) => {
    if (append) {
      await spacesQuery.fetchNextPage();
    } else {
      await spacesQuery.refetch();
    }
  }, [spacesQuery]);

  const refreshSnapshots = useCallback(async (_showFeedback = true) => {
    void _showFeedback;
    await snapshotsQuery.refetch();
  }, [snapshotsQuery]);

  const retryingSpaceIds = useMemo(
    () => retryMutation.isPending && typeof retryMutation.variables === "number"
      ? new Set([retryMutation.variables])
      : new Set<number>(),
    [retryMutation.isPending, retryMutation.variables],
  );

  const listError = spacesQuery.error instanceof Error ? spacesQuery.error.message : null;
  const retryError = retryMutation.error instanceof Error ? retryMutation.error.message : null;
  const snapshotError = snapshotsQuery.error instanceof Error ? snapshotsQuery.error.message : null;
  const failureCount = snapshotFailures.size;
  const syncNotice = retryError ?? snapshotError ?? (spaces.length > 0 ? listError : null) ?? (
    failureCount > 0 ? `${failureCount}개 공간의 센서 현황을 갱신하지 못했습니다.` : null
  );
  const firstPage = spacesQuery.data?.pages[0];

  return {
    availabilityFilter: explore.availabilityFilter,
    availabilitySummary,
    hasMore: Boolean(spacesQuery.hasNextPage),
    initialLoading: spacesQuery.isPending,
    lastUpdatedAt: snapshotsQuery.dataUpdatedAt ? new Date(snapshotsQuery.dataUpdatedAt) : null,
    listError,
    loadingMore: spacesQuery.isFetchingNextPage,
    locationMessage: explore.locationMessage,
    locationState: explore.locationState,
    pageNumber: Math.max((spacesQuery.data?.pages.length ?? 1) - 1, 0),
    query: explore.query,
    refreshing: snapshotsQuery.isFetching && !snapshotsQuery.isPending,
    retryingSpaceIds,
    setAvailabilityFilter: (filter: AvailabilityFilter) => dispatch(setAvailabilityFilterAction(filter)),
    setQuery: (query: string) => dispatch(setExploreQuery(query)),
    setSort: (sort: SpaceSort) => dispatch(setSpaceSort(sort)),
    snapshotFailures,
    snapshots,
    sort: explore.sort,
    spaces,
    syncNotice,
    totalElements: firstPage?.totalElements ?? null,
    userCoordinates: explore.userCoordinates,
    visibleSpaces,
    loadSpacePage,
    refreshSnapshots,
    requestLocation,
    retrySpace: (spaceId: number) => retryMutation.mutate(spaceId),
  };
}

export type SpaceDiscoveryState = ReturnType<typeof useSpaceDiscovery>;
