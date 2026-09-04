"use client";

import dynamic from "next/dynamic";

import UiIcon from "@/app/components/UiIcon";
import { isUsableCoordinate } from "@/app/lib/spacePresentation";
import type { SpaceItem, SpaceSnapshot, UserCoordinates } from "@/app/types/space";

const SpaceMap = dynamic(() => import("@/app/components/SpaceMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

type SpaceMapPanelProps = {
  spaces: SpaceItem[];
  snapshots: Record<number, SpaceSnapshot>;
  snapshotFailures: Set<number>;
  selectedSpaceId: number | null;
  userCoordinates: UserCoordinates | null;
  onSelectSpace: (spaceId: number) => void;
  onRequestLocation?: () => void;
  locationLoading?: boolean;
};

/** 좌표가 없을 때 빈 지도를 꾸미지 않고 데이터 한계를 설명하는 지도 경계를 렌더링한다. */
export default function SpaceMapPanel(props: SpaceMapPanelProps) {
  const mappableSpaces = props.spaces.filter((space) => isUsableCoordinate(space.latitude, space.longitude));

  if (mappableSpaces.length === 0 && !props.userCoordinates) {
    return (
      <div className="grid h-full min-h-80 place-items-center bg-[linear-gradient(135deg,#edf1ed,#f7f8f5)] px-6 text-center">
        <div className="max-w-xs">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-slate-500 shadow-sm">
            <UiIcon name="map" className="size-5" />
          </span>
          <p className="mt-4 text-sm font-black text-slate-800">지도에 표시할 좌표가 없습니다.</p>
          <p className="mt-1 break-keep text-xs leading-5 text-slate-500">공간 주소와 좌표가 등록되면 혼잡도 마커가 표시됩니다.</p>
          {props.onRequestLocation ? (
            <button
              type="button"
              onClick={props.onRequestLocation}
              disabled={props.locationLoading}
              className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              <UiIcon name="location" className="size-4" />
              {props.locationLoading ? "위치 확인 중" : "내 위치에서 지도 시작"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-80 overflow-hidden bg-slate-100">
      <SpaceMap {...props} spaces={mappableSpaces} />
      {props.onRequestLocation ? (
        <button
          type="button"
          onClick={props.onRequestLocation}
          disabled={props.locationLoading}
          className="focus-ring absolute bottom-5 right-3 z-[800] grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-[0_6px_18px_rgba(15,23,42,0.18)] transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          aria-label={props.userCoordinates ? "내 위치로 지도 이동" : "내 위치 확인"}
          title={props.userCoordinates ? "내 위치로 이동" : "내 위치 확인"}
        >
          <UiIcon name="location" className={`size-5 ${props.locationLoading ? "animate-pulse" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}

function MapLoading() {
  return (
    <div className="grid h-full min-h-80 place-items-center bg-slate-100" aria-live="polite">
      <p className="text-xs font-bold text-slate-500">지도를 불러오는 중</p>
    </div>
  );
}
