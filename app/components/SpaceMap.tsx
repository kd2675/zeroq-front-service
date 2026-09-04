"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  getCrowdPresentation,
  hasUsableOccupancy,
  isUsableCoordinate,
} from "@/app/lib/spacePresentation";
import type { SpaceItem, SpaceSnapshot, UserCoordinates } from "@/app/types/space";

const DEFAULT_CENTER = { latitude: 37.5665, longitude: 126.978 };
const NAVER_MAP_SCRIPT_ID = "zeroq-naver-map-sdk";

type SpaceMapProps = {
  spaces: SpaceItem[];
  snapshots: Record<number, SpaceSnapshot>;
  snapshotFailures: Set<number>;
  selectedSpaceId: number | null;
  userCoordinates: UserCoordinates | null;
  onSelectSpace: (spaceId: number) => void;
};

type NaverLatLng = object;
type NaverEventListener = object;

type NaverMap = {
  fitBounds(bounds: object): void;
  getZoom(): number;
  setCenter(center: NaverLatLng): void;
  setSize(size: object): void;
  setZoom(zoom: number): void;
};

type NaverOverlay = {
  setMap(map: NaverMap | null): void;
};

type NaverMarker = NaverOverlay;

type NaverInfoWindow = {
  close(): void;
  open(map: NaverMap, marker: NaverMarker): void;
};

type NaverMapsApi = {
  Circle: new (options: Record<string, unknown>) => NaverOverlay;
  Event: {
    addListener(target: object, eventName: string, handler: () => void): NaverEventListener;
    clearInstanceListeners(target: object): void;
    removeListener(listener: NaverEventListener): void;
  };
  InfoWindow: new (options: Record<string, unknown>) => NaverInfoWindow;
  LatLng: new (latitude: number, longitude: number) => NaverLatLng;
  LatLngBounds: new (southWest: NaverLatLng, northEast: NaverLatLng) => object;
  Map: new (container: HTMLElement, options: Record<string, unknown>) => NaverMap;
  Marker: new (options: Record<string, unknown>) => NaverMarker;
  Point: new (x: number, y: number) => object;
  Size: new (width: number, height: number) => object;
};

declare global {
  interface Window {
    naver?: { maps: NaverMapsApi };
  }
}

let naverMapLoader: Promise<NaverMapsApi> | null = null;

/** 네이버 지도 SDK를 npm 의존성 없이 로드하고, 센서 혼잡도와 사용자 위치를 지도 오버레이로 표시한다. */
export default function SpaceMap({
  spaces,
  snapshots,
  snapshotFailures,
  selectedSpaceId,
  userCoordinates,
  onSelectSpace,
}: SpaceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const overlayCleanupRef = useRef<(() => void) | null>(null);
  const previousViewportKey = useRef<string | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ?? "";
  const mapSpaces = useMemo(
    () => spaces.filter((space) => isUsableCoordinate(space.latitude, space.longitude)),
    [spaces],
  );
  const initialLatitude = userCoordinates?.latitude ?? mapSpaces[0]?.latitude ?? DEFAULT_CENTER.latitude;
  const initialLongitude = userCoordinates?.longitude ?? mapSpaces[0]?.longitude ?? DEFAULT_CENTER.longitude;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const container = containerRef.current;
    setLoadState("loading");

    loadNaverMapSdk(clientId)
      .then((maps) => {
        if (cancelled) return;

        const map = new maps.Map(container, {
          center: new maps.LatLng(initialLatitude, initialLongitude),
          zoom: 15,
          zoomControl: true,
        });
        resizeObserver = new ResizeObserver(([entry]) => {
          if (!entry) return;
          map.setSize(new maps.Size(entry.contentRect.width, entry.contentRect.height));
        });
        resizeObserver.observe(container);
        mapRef.current = map;
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      overlayCleanupRef.current?.();
      overlayCleanupRef.current = null;
      if (mapRef.current && window.naver?.maps) {
        window.naver.maps.Event.clearInstanceListeners(mapRef.current);
      }
      mapRef.current = null;
      container.replaceChildren();
    };
  }, [clientId, initialLatitude, initialLongitude]);

  useEffect(() => {
    const maps = window.naver?.maps;
    const map = mapRef.current;
    if (!maps || !map || loadState !== "ready") return;

    overlayCleanupRef.current?.();
    const overlays: NaverOverlay[] = [];
    const infoWindows: NaverInfoWindow[] = [];
    const listeners: NaverEventListener[] = [];

    if (userCoordinates) {
      overlays.push(new maps.Circle({
        center: new maps.LatLng(userCoordinates.latitude, userCoordinates.longitude),
        map,
        radius: 14,
        fillColor: "#2563eb",
        fillOpacity: 0.92,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      }));
    }

    for (const space of mapSpaces) {
      const snapshot = snapshots[space.id]?.snapshot;
      const hasOccupancy = !snapshotFailures.has(space.id) && hasUsableOccupancy(snapshot);
      const crowd = getCrowdPresentation(hasOccupancy ? snapshot.crowdLevel : "UNKNOWN");
      const occupancyLabel = hasOccupancy && snapshot.occupancyRate !== null
        ? `${Math.round(snapshot.occupancyRate)}%`
        : "?";
      const marker = new maps.Marker({
        position: new maps.LatLng(space.latitude, space.longitude),
        map,
        title: `${space.name}, ${crowd.label}`,
        icon: {
          content: createMarkerHtml(occupancyLabel, crowd.tone, selectedSpaceId === space.id),
          anchor: new maps.Point(24, 30),
        },
      });
      const infoWindow = new maps.InfoWindow({
        content: createSpacePopup(
          space,
          hasOccupancy ? `감지 점유율 ${occupancyLabel}` : "최근 측정 확인 불가",
        ),
      });
      const listener = maps.Event.addListener(marker, "click", () => {
        for (const currentInfoWindow of infoWindows) currentInfoWindow.close();
        infoWindow.open(map, marker);
        onSelectSpace(space.id);
      });

      overlays.push(marker);
      infoWindows.push(infoWindow);
      listeners.push(listener);
    }

    overlayCleanupRef.current = () => {
      for (const listener of listeners) maps.Event.removeListener(listener);
      for (const infoWindow of infoWindows) infoWindow.close();
      for (const overlay of overlays) overlay.setMap(null);
    };

    return () => {
      overlayCleanupRef.current?.();
      overlayCleanupRef.current = null;
    };
  }, [loadState, mapSpaces, onSelectSpace, selectedSpaceId, snapshotFailures, snapshots, userCoordinates]);

  useEffect(() => {
    const maps = window.naver?.maps;
    const map = mapRef.current;
    if (!maps || !map || loadState !== "ready") return;

    const viewportKey = selectedSpaceId !== null
      ? `selected:${selectedSpaceId}`
      : userCoordinates
        ? `user:${userCoordinates.latitude}:${userCoordinates.longitude}`
        : `spaces:${mapSpaces.map((space) => `${space.id}:${space.latitude}:${space.longitude}`).join("|")}`;
    if (previousViewportKey.current === viewportKey) return;
    previousViewportKey.current = viewportKey;

    const selected = mapSpaces.find((space) => space.id === selectedSpaceId);
    if (selected) {
      map.setCenter(new maps.LatLng(selected.latitude, selected.longitude));
      map.setZoom(Math.max(map.getZoom(), 17));
      return;
    }
    if (userCoordinates) {
      map.setCenter(new maps.LatLng(userCoordinates.latitude, userCoordinates.longitude));
      map.setZoom(16);
      return;
    }
    if (mapSpaces.length === 1) {
      map.setCenter(new maps.LatLng(mapSpaces[0].latitude, mapSpaces[0].longitude));
      map.setZoom(17);
      return;
    }
    if (mapSpaces.length > 1) {
      const latitudes = mapSpaces.map((space) => space.latitude);
      const longitudes = mapSpaces.map((space) => space.longitude);
      map.fitBounds(new maps.LatLngBounds(
        new maps.LatLng(Math.min(...latitudes), Math.min(...longitudes)),
        new maps.LatLng(Math.max(...latitudes), Math.max(...longitudes)),
      ));
    }
  }, [loadState, mapSpaces, selectedSpaceId, userCoordinates]);

  if (!clientId || loadState === "error") {
    return (
      <MapProviderFallback
        spaces={mapSpaces}
        selectedSpaceId={selectedSpaceId}
        providerError={loadState === "error"}
        onSelectSpace={onSelectSpace}
      />
    );
  }

  return (
    <div className="relative h-full w-full bg-[#e8ece8]">
      <div ref={containerRef} className="h-full w-full" role="region" aria-label="공간 혼잡도 지도" />
      {loadState !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center bg-[#eef1ed]" aria-live="polite">
          <p className="text-xs font-bold text-slate-500">네이버 지도를 불러오는 중</p>
        </div>
      ) : null}
    </div>
  );
}

function MapProviderFallback({
  spaces,
  selectedSpaceId,
  providerError,
  onSelectSpace,
}: {
  spaces: SpaceItem[];
  selectedSpaceId: number | null;
  providerError: boolean;
  onSelectSpace: (spaceId: number) => void;
}) {
  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(145deg,#e7ece8,#f8f9f7)] p-5">
      <p className="text-xs font-black text-slate-800">
        {providerError ? "지도 연결을 확인해 주세요." : "지도 API 설정 전에는 좌표 목록으로 표시합니다."}
      </p>
      <p className="mt-1 break-keep text-[11px] leading-5 text-slate-500">
        공간 선택과 상세 확인은 그대로 사용할 수 있으며, 운영 환경에서는 네이버 지도 Client ID가 필요합니다.
      </p>
      <div className="mt-4 grid gap-2">
        {spaces.slice(0, 6).map((space) => (
          <div
            key={space.id}
            className={`flex items-center justify-between gap-3 rounded-xl border bg-white/90 p-3 ${
              selectedSpaceId === space.id ? "border-blue-500 shadow-sm" : "border-slate-200"
            }`}
          >
            <button type="button" onClick={() => onSelectSpace(space.id)} className="focus-ring min-w-0 text-left">
              <strong className="block truncate text-xs text-slate-900">{space.name}</strong>
              <span className="mt-0.5 block text-[10px] text-slate-500">
                {space.latitude.toFixed(5)}, {space.longitude.toFixed(5)}
              </span>
            </button>
            <a
              href={`https://map.naver.com/p/search/${encodeURIComponent(space.name)}`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring shrink-0 rounded-lg bg-slate-900 px-2.5 py-2 text-[10px] font-black text-white"
            >
              지도 열기
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function createSpacePopup(space: SpaceItem, statusLabel: string) {
  const container = document.createElement("div");
  container.className = "zeroq-map-popup";

  const title = document.createElement("strong");
  title.textContent = space.name;

  const status = document.createElement("span");
  status.textContent = statusLabel;

  const detailLink = document.createElement("a");
  detailLink.href = `/spaces/${space.id}`;
  detailLink.textContent = "상세 보기";

  container.append(title, status, detailLink);
  return container;
}

function createMarkerHtml(
  label: string,
  tone: "quiet" | "medium" | "busy" | "unknown",
  selected: boolean,
) {
  return `<button type="button" class="zeroq-map-marker zeroq-map-marker--${tone}${
    selected ? " is-selected" : ""
  }">${label}</button>`;
}

function loadNaverMapSdk(clientId: string) {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  if (naverMapLoader) return naverMapLoader;

  naverMapLoader = new Promise<NaverMapsApi>((resolve, reject) => {
    const existingScript = document.getElementById(NAVER_MAP_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");
    const handleLoad = () => {
      if (window.naver?.maps) {
        resolve(window.naver.maps);
        return;
      }
      script.remove();
      naverMapLoader = null;
      reject(new Error("네이버 지도 SDK 전역 객체를 찾지 못했습니다."));
    };
    const handleError = () => {
      script.remove();
      naverMapLoader = null;
      reject(new Error("네이버 지도 SDK를 불러오지 못했습니다."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!existingScript) {
      script.id = NAVER_MAP_SCRIPT_ID;
      script.async = true;
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
      document.head.append(script);
    }
  });

  return naverMapLoader;
}
