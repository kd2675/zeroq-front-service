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
  onRetry: (spaceId: number) => void;
};

const toneClasses = {
  quiet: {
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
    dot: "bg-emerald-600",
    bar: "bg-emerald-600",
  },
  medium: {
    badge: "bg-amber-50 text-amber-900 ring-amber-700/15",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  busy: {
    badge: "bg-rose-50 text-rose-800 ring-rose-700/15",
    dot: "bg-rose-600",
    bar: "bg-rose-600",
  },
  unknown: {
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
    bar: "bg-slate-300",
  },
} as const;

export default function SpaceCard({
  space,
  snapshot,
  snapshotFailed,
  distanceKilometers,
  retrying,
  onRetry,
}: SpaceCardProps) {
  const sensorSnapshot = snapshot?.snapshot;
  const hasOccupancy = hasUsableOccupancy(sensorSnapshot) && !snapshotFailed;
  const crowd = hasOccupancy
    ? getCrowdPresentation(sensorSnapshot.crowdLevel)
    : getCrowdPresentation("UNKNOWN");
  const tone = toneClasses[crowd.tone];
  const distanceLabel = formatDistance(distanceKilometers);
  const measuredAt = sensorSnapshot?.lastMeasuredAt;
  const exactMeasuredAt = formatExactTimestamp(measuredAt);
  const occupancyRate = hasOccupancy ? sensorSnapshot.occupancyRate : null;
  const isPartial = hasOccupancy && sensorSnapshot.dataStatus === "PARTIAL";
  const noConfiguredSensors = !snapshotFailed && sensorSnapshot?.configuredSensorCount === 0;

  return (
    <article className="group relative flex min-h-[330px] flex-col overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.09)]">
      <div className={`h-1.5 w-full ${tone.bar}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex min-h-7 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone.badge}`}>
            <span className={`size-2 rounded-full ${tone.dot}`} aria-hidden="true" />
            {snapshotFailed ? "갱신 지연" : crowd.label}
          </span>
          {distanceLabel ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500" title="현재 위치에서 계산한 직선거리">
              <UiIcon name="location" className="size-3.5" />
              {distanceLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="flex items-start gap-2">
            <h2 className="break-keep text-xl font-black tracking-[-0.035em] text-slate-950">{space.name}</h2>
            {space.verified ? (
              <span className="mt-0.5 inline-grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700" title="운영 확인 공간">
                <UiIcon name="check" className="size-3.5" />
                <span className="sr-only">운영 확인 공간</span>
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 line-clamp-1 text-sm text-slate-500">{space.address?.trim() || "주소 정보 없음"}</p>
          {space.description?.trim() ? (
            <p className="mt-3 line-clamp-2 min-h-10 break-keep text-sm leading-5 text-slate-600">{space.description}</p>
          ) : (
            <div className="min-h-10" aria-hidden="true" />
          )}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          {hasOccupancy && occupancyRate !== null ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">현재 감지 점유율</p>
                  <p className="mt-1 tabular-nums text-[2rem] font-black leading-none tracking-[-0.06em] text-slate-950">
                    {Math.round(occupancyRate)}<span className="ml-0.5 text-lg tracking-normal text-slate-500">%</span>
                  </p>
                </div>
                {space.reviewCount > 0 ? (
                  <span className="mb-0.5 inline-flex items-center gap-1 text-xs font-bold text-slate-600" title={`리뷰 ${space.reviewCount.toLocaleString("ko-KR")}개`}>
                    <UiIcon name="star" className="size-3.5 fill-amber-400 text-amber-400" />
                    {space.averageRating.toFixed(1)}
                  </span>
                ) : null}
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label={`${space.name} 감지 점유율`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(occupancyRate)}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${tone.bar}`}
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">점유 감지</dt>
                  <dd className="mt-1 font-bold tabular-nums text-slate-800">
                    {sensorSnapshot.occupiedCount ?? "-"}곳
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">센서 보고</dt>
                  <dd className="mt-1 font-bold tabular-nums text-slate-800">
                    {sensorSnapshot.reportingSensorCount} / {sensorSnapshot.configuredSensorCount}대
                  </dd>
                </div>
              </dl>
              {isPartial ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-900">
                  <UiIcon name="info" className="mt-0.5 size-4 shrink-0" />
                  일부 센서만 보고 중입니다. 보고율 {sensorSnapshot.reportingCoveragePercent.toFixed(1)}%
                </p>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-4">
              <p className="text-sm font-bold text-slate-800">
                {snapshotFailed
                  ? "현재 센서 현황을 갱신하지 못했습니다."
                  : noConfiguredSensors
                    ? "아직 연결된 활성 센서가 없습니다."
                    : "최근 신뢰 가능한 측정이 없습니다."}
              </p>
              <p className="mt-1 break-keep text-xs leading-5 text-slate-500">
                {snapshotFailed
                  ? "다른 공간 결과는 그대로 유지됩니다. 이 공간만 다시 시도할 수 있습니다."
                  : "측정이 없다는 뜻이며, 0% 또는 빈 공간을 의미하지 않습니다."}
              </p>
              {snapshotFailed ? (
                <button
                  type="button"
                  onClick={() => onRetry(space.id)}
                  disabled={retrying}
                  className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <UiIcon name="retry" className={`size-4 ${retrying ? "animate-spin" : ""}`} />
                  {retrying ? "다시 확인 중" : "이 공간 다시 확인"}
                </button>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-[11px] font-semibold text-slate-400">
          <span title={exactMeasuredAt}>마지막 측정 {formatRelativeTimestamp(measuredAt)}</span>
          {hasOccupancy && !isPartial ? <span>센서 정상 보고</span> : null}
        </div>
      </div>
    </article>
  );
}
