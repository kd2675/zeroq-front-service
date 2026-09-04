"use client";

import Link from "next/link";
import { motion } from "motion/react";

import UiIcon from "@/app/components/UiIcon";
import {
  formatDistance,
  formatExactTimestamp,
  formatRelativeTimestamp,
  getCrowdPresentation,
  hasUsableOccupancy,
} from "@/app/lib/spacePresentation";
import type { SpaceItem, SpaceSnapshot } from "@/app/types/space";

type SpaceCardProps = {
  space: SpaceItem;
  snapshot?: SpaceSnapshot | null;
  snapshotFailed: boolean;
  distanceKilometers: number | null;
  retrying: boolean;
  selected?: boolean;
  animationIndex?: number;
  onPreview?: (spaceId: number) => void;
  onRetry: (spaceId: number) => void;
};

const toneClasses = {
  quiet: { badge: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600", bar: "bg-emerald-600" },
  medium: { badge: "bg-amber-50 text-amber-900", dot: "bg-amber-500", bar: "bg-amber-500" },
  busy: { badge: "bg-rose-50 text-rose-800", dot: "bg-rose-600", bar: "bg-rose-600" },
  unknown: { badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400", bar: "bg-slate-300" },
} as const;

/** 공간의 현재 측정·거리·신뢰 상태를 지도 결과 목록용 카드로 표현한다. */
export default function SpaceCard({
  space,
  snapshot,
  snapshotFailed,
  distanceKilometers,
  retrying,
  selected = false,
  animationIndex = 0,
  onPreview,
  onRetry,
}: SpaceCardProps) {
  const sensorSnapshot = snapshot?.snapshot;
  const hasOccupancy = hasUsableOccupancy(sensorSnapshot) && !snapshotFailed;
  const crowd = getCrowdPresentation(hasOccupancy ? sensorSnapshot.crowdLevel : "UNKNOWN");
  const tone = toneClasses[crowd.tone];
  const occupancyRate = hasOccupancy ? sensorSnapshot.occupancyRate : null;
  const distanceLabel = formatDistance(distanceKilometers);
  const exactMeasuredAt = formatExactTimestamp(sensorSnapshot?.lastMeasuredAt);
  const partial = hasOccupancy && sensorSnapshot.dataStatus === "PARTIAL";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.34, delay: Math.min(animationIndex * 0.045, 0.27) }}
      className={`relative overflow-hidden rounded-[20px] border bg-white transition duration-200 ${
        selected
          ? "border-blue-500 shadow-[0_10px_28px_rgba(37,99,235,0.14)]"
          : "border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.045)] hover:border-slate-300"
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} aria-hidden="true" />
      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tone.badge}`}>
                <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                {snapshotFailed ? "갱신 지연" : crowd.label}
              </span>
              {distanceLabel ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" title="현재 위치에서 계산한 직선거리">
                  <UiIcon name="location" className="size-3.5" />
                  {distanceLabel}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-1.5">
              <h2 className="truncate text-lg font-black tracking-[-0.035em] text-slate-950">{space.name}</h2>
              {space.verified ? (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700" title="운영 확인 공간">
                  <UiIcon name="check" className="size-3.5" />
                  <span className="sr-only">운영 확인 공간</span>
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">{space.address?.trim() || "주소 정보 없음"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-bold text-slate-400">감지 점유율</p>
            <p className="mt-1 tabular-nums text-2xl font-black tracking-[-0.05em] text-slate-950">
              {occupancyRate === null ? "-" : Math.round(occupancyRate)}
              {occupancyRate === null ? null : <span className="ml-0.5 text-sm text-slate-500">%</span>}
            </p>
          </div>
        </div>

        {hasOccupancy && occupancyRate !== null ? (
          <>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${space.name} 감지 점유율`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(occupancyRate)}>
              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${occupancyRate}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
              <span>센서 {sensorSnapshot.reportingSensorCount}/{sensorSnapshot.configuredSensorCount}대 보고</span>
              <span title={exactMeasuredAt}>측정 {formatRelativeTimestamp(sensorSnapshot.lastMeasuredAt)}</span>
              {partial ? <span className="text-amber-700">일부 보고 {sensorSnapshot.reportingCoveragePercent.toFixed(0)}%</span> : null}
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold leading-5 text-slate-600">
            {snapshotFailed
              ? "센서 현황을 갱신하지 못했습니다."
              : sensorSnapshot?.configuredSensorCount === 0
                ? "연결된 활성 센서가 없습니다."
                : "최근 신뢰 가능한 측정이 없습니다."}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          {onPreview ? (
            <button
              type="button"
              onClick={() => onPreview(space.id)}
              className="focus-ring hidden min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 lg:inline-flex"
            >
              <UiIcon name="map" className="size-4" />
              지도에서 보기
            </button>
          ) : null}
          {snapshotFailed ? (
            <button
              type="button"
              onClick={() => onRetry(space.id)}
              disabled={retrying}
              className="focus-ring min-h-10 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
            >
              {retrying ? "확인 중" : "현황 재시도"}
            </button>
          ) : null}
          <Link
            href={`/spaces/${space.id}`}
            className="focus-ring ml-auto inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-black text-blue-700 transition hover:bg-blue-50"
          >
            상세 보기
            <UiIcon name="chevron-right" className="size-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
