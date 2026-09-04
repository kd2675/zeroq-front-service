export type CrowdLevel = "EMPTY" | "LOW" | "MEDIUM" | "HIGH" | "FULL" | "UNKNOWN";

export type SnapshotDataStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";

export type SpaceItem = {
  id: number;
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  averageRating: number;
  reviewCount: number;
  imageUrl?: string | null;
  amenities?: string[] | null;
  verified: boolean;
};

export type SpacePage = {
  content: SpaceItem[];
  number?: number;
  totalPages?: number;
  totalElements?: number;
  last?: boolean;
};

export type SensorSnapshot = {
  occupancyRate: number | null;
  crowdLevel: CrowdLevel | string;
  activeSensorCount: number;
  configuredSensorCount: number;
  reportingSensorCount: number;
  occupiedCount: number | null;
  dataStatus: SnapshotDataStatus;
  reportingCoveragePercent: number;
  lastMeasuredAt?: string | null;
  lastCalculatedAt?: string | null;
  sourceWindowSeconds?: number | null;
};

export type SpaceSnapshot = {
  spaceId: number;
  spaceName: string;
  snapshot: SensorSnapshot;
};

export type AvailabilityFilter = "ALL" | "QUIET" | "MEDIUM" | "BUSY" | "UNKNOWN";

export type SpaceSort = "QUIETEST" | "NEAREST" | "NAME";

export type UserCoordinates = {
  latitude: number;
  longitude: number;
};
