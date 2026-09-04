import type {
  AvailabilityFilter,
  CrowdLevel,
  SensorSnapshot,
  SpaceItem,
  UserCoordinates,
} from "@/app/types/space";

export type CrowdTone = "quiet" | "medium" | "busy" | "unknown";

export type CrowdPresentation = {
  label: string;
  tone: CrowdTone;
};

const CROWD_PRESENTATIONS: Record<CrowdLevel, CrowdPresentation> = {
  EMPTY: { label: "매우 여유", tone: "quiet" },
  LOW: { label: "여유", tone: "quiet" },
  MEDIUM: { label: "보통", tone: "medium" },
  HIGH: { label: "혼잡", tone: "busy" },
  FULL: { label: "매우 혼잡", tone: "busy" },
  UNKNOWN: { label: "확인 불가", tone: "unknown" },
};

export function getCrowdPresentation(level?: string | null): CrowdPresentation {
  const normalized = level?.trim().toUpperCase() as CrowdLevel | undefined;
  return normalized && CROWD_PRESENTATIONS[normalized]
    ? CROWD_PRESENTATIONS[normalized]
    : CROWD_PRESENTATIONS.UNKNOWN;
}

/** UNAVAILABLE, 비숫자, 0~100 밖의 점유율을 표시 가능한 현재 상태에서 제외한다. */
export function hasUsableOccupancy(snapshot?: SensorSnapshot | null): snapshot is SensorSnapshot {
  return Boolean(
    snapshot &&
      snapshot.dataStatus !== "UNAVAILABLE" &&
      typeof snapshot.occupancyRate === "number" &&
      Number.isFinite(snapshot.occupancyRate) &&
      snapshot.occupancyRate >= 0 &&
      snapshot.occupancyRate <= 100,
  );
}

export function matchesAvailabilityFilter(
  snapshot: SensorSnapshot | null | undefined,
  failed: boolean,
  filter: AvailabilityFilter,
): boolean {
  if (filter === "ALL") {
    return true;
  }
  if (failed || !hasUsableOccupancy(snapshot)) {
    return filter === "UNKNOWN";
  }

  const crowdLevel = snapshot.crowdLevel.toUpperCase();
  if (getCrowdPresentation(crowdLevel).tone === "unknown") {
    return filter === "UNKNOWN";
  }
  if (filter === "QUIET") {
    return crowdLevel === "EMPTY" || crowdLevel === "LOW";
  }
  if (filter === "MEDIUM") {
    return crowdLevel === "MEDIUM";
  }
  return crowdLevel === "HIGH" || crowdLevel === "FULL";
}

export function isUsableCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

/** 두 위·경도의 Haversine 직선거리를 계산하며 경로 거리나 이동 시간을 추정하지 않는다. */
export function distanceInKilometers(
  from: UserCoordinates,
  to: UserCoordinates,
): number | null {
  if (
    !isUsableCoordinate(from.latitude, from.longitude) ||
    !isUsableCoordinate(to.latitude, to.longitude)
  ) {
    return null;
  }

  const earthRadiusKilometers = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKilometers * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(distance: number | null): string | null {
  if (distance === null || !Number.isFinite(distance) || distance < 0) {
    return null;
  }
  if (distance < 1) {
    return `${Math.max(1, Math.round(distance * 1000))}m`;
  }
  return `${distance.toFixed(distance < 10 ? 1 : 0)}km`;
}

export function getSpaceDistance(
  space: SpaceItem,
  userCoordinates: UserCoordinates | null,
): number | null {
  if (!userCoordinates) {
    return null;
  }
  return distanceInKilometers(userCoordinates, {
    latitude: space.latitude,
    longitude: space.longitude,
  });
}

/** backend LocalDateTime을 UTC 계약으로 해석하고 이미 zone이 있으면 그대로 보존한다. */
export function parseServerUtcTimestamp(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTimestamp(
  value?: string | null,
  nowMilliseconds = Date.now(),
): string {
  const date = parseServerUtcTimestamp(value);
  if (!date) {
    return "측정 기록 없음";
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMilliseconds - date.getTime()) / 1000));
  if (elapsedSeconds < 60) {
    return "방금 전";
  }
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}분 전`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}시간 전`;
  }
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}일 전`;
}

export function formatExactTimestamp(value?: string | null): string | undefined {
  const date = parseServerUtcTimestamp(value);
  if (!date) {
    return undefined;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function normalizedSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");
}
