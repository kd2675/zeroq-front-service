"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  UserCoordinates,
} from "@/app/types/space";

const PAGE_SIZE = 12;
const SNAPSHOT_REFRESH_INTERVAL_MS = 60_000;
const SNAPSHOT_REQUEST_CONCURRENCY = 6;

type SnapshotBatch = {
  snapshots: Record<number, SpaceSnapshot>;
  failures: Set<number>;
  successCount: number;
};

/** 공간별 endpoint의 N+1 부하를 제한하기 위해 최대 6개 worker로 스냅샷을 조회한다. */
async function fetchSnapshots(spaces: SpaceItem[], accessToken: string): Promise<SnapshotBatch> {
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
  return {
    snapshots,
    failures,
    successCount: entries.length - failures.size,
  };
}

function mergeSpaces(current: SpaceItem[], incoming: SpaceItem[]): SpaceItem[] {
  const merged = new Map(current.map((space) => [space.id, space]));
  incoming.forEach((space) => merged.set(space.id, space));
  return Array.from(merged.values());
}

/**
 * 공간 페이지, 센서 스냅샷, 검색·필터·정렬, 위치 권한, 자동 갱신을 관리한다.
 * 부분 실패 시 성공한 공간과 이전 스냅샷을 유지하며 실패한 공간만 재시도할 수 있게 한다.
 */
export default function useSpaceDiscovery(enabled: boolean) {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [snapshots, setSnapshots] = useState<Record<number, SpaceSnapshot>>({});
  const [snapshotFailures, setSnapshotFailures] = useState<Set<number>>(new Set());
  const [retryingSpaceIds, setRetryingSpaceIds] = useState<Set<number>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [pageNumber, setPageNumber] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("ALL");
  const [sort, setSort] = useState<SpaceSort>("QUIETEST");
  const [userCoordinates, setUserCoordinates] = useState<UserCoordinates | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const spacesRef = useRef<SpaceItem[]>([]);
  const snapshotFailuresRef = useRef<Set<number>>(new Set());
  const listRequestId = useRef(0);
  const snapshotRequestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    spacesRef.current = spaces;
  }, [spaces]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      listRequestId.current += 1;
      snapshotRequestId.current += 1;
    };
  }, []);

  const loadSpacePage = useCallback(async (requestedPage: number, append: boolean) => {
    const requestId = ++listRequestId.current;
    if (append) {
      setLoadingMore(true);
    } else {
      setInitialLoading(true);
    }
    setListError(null);

    const token = await ensureAccessToken();
    if (!mounted.current || requestId !== listRequestId.current) {
      return;
    }
    if (!token) {
      setInitialLoading(false);
      setLoadingMore(false);
      const message = "로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.";
      if (append || spacesRef.current.length > 0) {
        setSyncNotice(message);
      } else {
        setListError(message);
      }
      return;
    }

    const result = await getJson<SpacePage>(
      `/api/zeroq/v1/spaces?page=${requestedPage}&size=${PAGE_SIZE}`,
      buildServiceAuthHeaders(token),
    );
    if (!mounted.current || requestId !== listRequestId.current) {
      return;
    }
    if (!result.ok || !result.data?.content) {
      const message = result.message ?? "공간 목록을 불러오지 못했습니다.";
      setInitialLoading(false);
      setLoadingMore(false);
      if (append || spacesRef.current.length > 0) {
        setSyncNotice(message);
      } else {
        setListError(message);
      }
      return;
    }

    const loadedSpaces = result.data.content;
    const batch = await fetchSnapshots(loadedSpaces, token);
    if (!mounted.current || requestId !== listRequestId.current) {
      return;
    }

    setSpaces((current) => append ? mergeSpaces(current, loadedSpaces) : loadedSpaces);
    setSnapshots((current) => append ? { ...current, ...batch.snapshots } : batch.snapshots);
    const nextFailures = append
      ? new Set(snapshotFailuresRef.current)
      : new Set<number>();
    if (append) {
      loadedSpaces.forEach((space) => nextFailures.delete(space.id));
    }
    batch.failures.forEach((spaceId) => nextFailures.add(spaceId));
    snapshotFailuresRef.current = nextFailures;
    setSnapshotFailures(nextFailures);
    setPageNumber(requestedPage);
    setTotalElements(result.data.totalElements ?? null);
    setHasMore(
      typeof result.data.last === "boolean"
        ? !result.data.last
        : typeof result.data.totalPages === "number"
          ? requestedPage + 1 < result.data.totalPages
          : loadedSpaces.length === PAGE_SIZE,
    );
    if (batch.successCount > 0) {
      setLastUpdatedAt(new Date());
    }
    setSyncNotice(
      batch.failures.size > 0
        ? `${batch.failures.size}개 공간의 센서 현황을 갱신하지 못했습니다.`
        : null,
    );
    setInitialLoading(false);
    setLoadingMore(false);
  }, []);

  const refreshSnapshots = useCallback(async (showFeedback = true) => {
    const currentSpaces = spacesRef.current;
    if (currentSpaces.length === 0) {
      return;
    }
    const requestId = ++snapshotRequestId.current;
    if (showFeedback) {
      setRefreshing(true);
    }

    const token = await ensureAccessToken();
    if (!mounted.current || requestId !== snapshotRequestId.current) {
      return;
    }
    if (!token) {
      setRefreshing(false);
      setSyncNotice("로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
      return;
    }

    const batch = await fetchSnapshots(currentSpaces, token);
    if (!mounted.current || requestId !== snapshotRequestId.current) {
      return;
    }
    setSnapshots((current) => ({ ...current, ...batch.snapshots }));
    const nextFailures = new Set(snapshotFailuresRef.current);
    currentSpaces.forEach((space) => nextFailures.delete(space.id));
    batch.failures.forEach((spaceId) => nextFailures.add(spaceId));
    snapshotFailuresRef.current = nextFailures;
    setSnapshotFailures(nextFailures);
    if (batch.successCount > 0) {
      setLastUpdatedAt(new Date());
    }
    setSyncNotice(
      batch.failures.size > 0
        ? `${batch.failures.size}개 공간의 센서 현황을 갱신하지 못했습니다.`
        : null,
    );
    setRefreshing(false);
  }, []);

  const retrySpace = useCallback(async (spaceId: number) => {
    setRetryingSpaceIds((current) => new Set(current).add(spaceId));
    const token = await ensureAccessToken();
    if (!token) {
      setSyncNotice("로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
      setRetryingSpaceIds((current) => {
        const next = new Set(current);
        next.delete(spaceId);
        return next;
      });
      return;
    }

    const result = await getJson<SpaceSnapshot>(
      `/api/zeroq/v1/space-sensors/spaces/${spaceId}/snapshot?recalculate=false`,
      buildServiceAuthHeaders(token),
    );
    if (!mounted.current) {
      return;
    }
    if (result.ok && result.data) {
      const snapshot = result.data;
      setSnapshots((current) => ({ ...current, [spaceId]: snapshot }));
      const nextFailures = new Set(snapshotFailuresRef.current);
      nextFailures.delete(spaceId);
      snapshotFailuresRef.current = nextFailures;
      setSnapshotFailures(nextFailures);
      setLastUpdatedAt(new Date());
      setSyncNotice(
        nextFailures.size > 0
          ? `${nextFailures.size}개 공간의 센서 현황을 갱신하지 못했습니다.`
          : null,
      );
    } else {
      setSyncNotice(result.message ?? "해당 공간의 센서 현황을 다시 확인하지 못했습니다.");
    }
    setRetryingSpaceIds((current) => {
      const next = new Set(current);
      next.delete(spaceId);
      return next;
    });
  }, []);

  /** 명시적 사용자 동작 뒤에만 위치를 요청하고 좌표는 거리 계산에만 사용한다. */
  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationState("error");
      setLocationMessage("이 브라우저에서는 위치 확인을 지원하지 않습니다.");
      return;
    }

    setLocationState("loading");
    setLocationMessage("현재 위치를 확인하고 있습니다.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        setUserCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationState("ready");
        setLocationMessage("현재 위치 기준 직선거리로 정렬했습니다. 위치는 서버로 전송하지 않습니다.");
        setSort("NEAREST");
      },
      (error) => {
        if (!mounted.current) return;
        setLocationState("error");
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "위치 권한이 꺼져 있습니다. 브라우저 설정에서 허용한 뒤 다시 시도해 주세요."
            : "현재 위치를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      },
      { enableHighAccuracy: false, timeout: 7_000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const initialLoadId = window.setTimeout(() => {
      void loadSpacePage(0, false);
    }, 0);
    return () => {
      window.clearTimeout(initialLoadId);
      listRequestId.current += 1;
      snapshotRequestId.current += 1;
    };
  }, [enabled, loadSpacePage]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void refreshSnapshots(false);
      }
    }, SNAPSHOT_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled, refreshSnapshots]);

  const visibleSpaces = useMemo(() => {
    const normalizedQuery = normalizedSearchText(query);
    const filtered = spaces.filter((space) => {
      const searchableText = normalizedSearchText(
        [space.name, space.address, space.description].filter(Boolean).join(" "),
      );
      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        matchesAvailabilityFilter(
          snapshots[space.id]?.snapshot,
          snapshotFailures.has(space.id),
          availabilityFilter,
        )
      );
    });

    return [...filtered].sort((left, right) => {
      if (sort === "NAME") {
        return left.name.localeCompare(right.name, "ko-KR");
      }
      if (sort === "NEAREST") {
        const leftDistance = getSpaceDistance(left, userCoordinates);
        const rightDistance = getSpaceDistance(right, userCoordinates);
        if (leftDistance === null) return 1;
        if (rightDistance === null) return -1;
        return leftDistance - rightDistance;
      }

      const leftSnapshot = snapshots[left.id]?.snapshot;
      const rightSnapshot = snapshots[right.id]?.snapshot;
      const leftAvailable = !snapshotFailures.has(left.id) && hasUsableOccupancy(leftSnapshot);
      const rightAvailable = !snapshotFailures.has(right.id) && hasUsableOccupancy(rightSnapshot);
      if (leftAvailable !== rightAvailable) {
        return leftAvailable ? -1 : 1;
      }
      if (leftAvailable && rightAvailable) {
        return (leftSnapshot.occupancyRate ?? 101) - (rightSnapshot.occupancyRate ?? 101);
      }
      return left.name.localeCompare(right.name, "ko-KR");
    });
  }, [availabilityFilter, query, snapshotFailures, snapshots, sort, spaces, userCoordinates]);

  const availabilitySummary = useMemo(() => {
    let available = 0;
    let quiet = 0;
    spaces.forEach((space) => {
      const snapshot = snapshots[space.id]?.snapshot;
      if (!snapshotFailures.has(space.id) && hasUsableOccupancy(snapshot)) {
        available += 1;
        if (snapshot.crowdLevel === "EMPTY" || snapshot.crowdLevel === "LOW") {
          quiet += 1;
        }
      }
    });
    return { available, quiet, unavailable: spaces.length - available };
  }, [snapshotFailures, snapshots, spaces]);

  return {
    availabilityFilter,
    availabilitySummary,
    hasMore,
    initialLoading,
    lastUpdatedAt,
    listError,
    loadingMore,
    locationMessage,
    locationState,
    pageNumber,
    query,
    refreshing,
    retryingSpaceIds,
    setAvailabilityFilter,
    setQuery,
    setSort,
    snapshotFailures,
    snapshots,
    sort,
    spaces,
    syncNotice,
    totalElements,
    userCoordinates,
    visibleSpaces,
    loadSpacePage,
    refreshSnapshots,
    requestLocation,
    retrySpace,
  };
}

export type SpaceDiscoveryState = ReturnType<typeof useSpaceDiscovery>;
