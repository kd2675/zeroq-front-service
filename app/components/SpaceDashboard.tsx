"use client";

import BrandMark from "@/app/components/BrandMark";
import SpaceCard from "@/app/components/SpaceCard";
import UiIcon from "@/app/components/UiIcon";
import type { SpaceDiscoveryState } from "@/app/hooks/useSpaceDiscovery";
import { getSpaceDistance } from "@/app/lib/spacePresentation";
import type { AvailabilityFilter, SpaceSort } from "@/app/types/space";

const filterOptions: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "QUIET", label: "여유" },
  { value: "MEDIUM", label: "보통" },
  { value: "BUSY", label: "혼잡" },
  { value: "UNKNOWN", label: "확인 불가" },
];

type SpaceDashboardProps = {
  userName: string;
  discovery: SpaceDiscoveryState;
  onSignOut: () => void;
};

export default function SpaceDashboard({ userName, discovery, onSignOut }: SpaceDashboardProps) {
  const {
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
  } = discovery;

  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[color:var(--canvas-translucent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <BrandMark href="/" />
          <div className="flex items-center gap-2">
            <span className="hidden max-w-48 truncate text-sm font-semibold text-slate-600 sm:block">
              {userName}님
            </span>
            <button
              type="button"
              onClick={onSignOut}
              title="로그아웃"
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-slate-950"
            >
              <UiIcon name="logout" className="size-4.5" />
              <span className="hidden sm:inline">로그아웃</span>
              <span className="sr-only sm:hidden">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-11">
        <section aria-labelledby="space-discovery-title">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">현재 공간 현황</p>
              <h1 id="space-discovery-title" className="mt-3 break-keep text-3xl font-black leading-[1.12] tracking-[-0.055em] text-slate-950 sm:text-5xl">
                덜 붐비는 곳을<br className="hidden sm:block" /> 먼저 찾으세요
              </h1>
              <p className="mt-4 max-w-xl break-keep text-sm leading-6 text-slate-600 sm:text-base">
                최근 신뢰 가능한 센서 측정만 모아 보여줍니다. 측정 공백과 일부 센서 보고는 0%로 바꾸지 않고 그대로 표시합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationState === "loading"}
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              >
                <UiIcon name="location" className="size-4.5" />
                {locationState === "loading" ? "위치 확인 중" : locationState === "ready" ? "내 위치 적용됨" : "내 위치 기준"}
              </button>
              <button
                type="button"
                onClick={() => void refreshSnapshots(true)}
                disabled={refreshing || initialLoading || spaces.length === 0}
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50"
              >
                <UiIcon name="refresh" className={`size-4.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "갱신 중" : "현황 새로고침"}
              </button>
            </div>
          </div>

          {locationMessage ? (
            <p className={`mt-3 flex items-start gap-2 text-xs font-semibold ${locationState === "error" ? "text-rose-700" : "text-slate-500"}`} role={locationState === "error" ? "alert" : "status"}>
              <UiIcon name="info" className="mt-px size-4 shrink-0" />
              {locationMessage}
            </p>
          ) : null}

          <div className="mt-8 border-y border-slate-200 py-4">
            <dl className="grid grid-cols-3 divide-x divide-slate-200">
              <SummaryMetric label="현황 확인" value={initialLoading ? null : availabilitySummary.available} suffix="곳" />
              <SummaryMetric label="여유" value={initialLoading ? null : availabilitySummary.quiet} suffix="곳" tone="quiet" />
              <SummaryMetric label="확인 필요" value={initialLoading ? null : availabilitySummary.unavailable} suffix="곳" tone="muted" />
            </dl>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="space-list-title">
          <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.045)] sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">표시된 공간 검색</span>
                <UiIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="공간 이름이나 주소 검색"
                  className="focus-ring min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                />
              </label>
              <div className="flex min-w-0 flex-wrap gap-2" aria-label="혼잡도 필터">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={availabilityFilter === option.value}
                    onClick={() => setAvailabilityFilter(option.value)}
                    className={`focus-ring min-h-11 shrink-0 rounded-xl px-3.5 text-sm font-bold transition ${
                      availabilityFilter === option.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-500">
                <span>정렬</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SpaceSort)}
                  className="focus-ring min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
                >
                  <option value="QUIETEST">혼잡도 낮은 순</option>
                  {userCoordinates ? <option value="NEAREST">가까운 순</option> : null}
                  <option value="NAME">이름순</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="space-list-title" className="text-lg font-black tracking-[-0.025em] text-slate-950">공간 목록</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {totalElements !== null ? `총 ${totalElements.toLocaleString("ko-KR")}곳 중 ` : ""}
                {spaces.length.toLocaleString("ko-KR")}곳을 불러왔습니다.
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              {lastUpdatedAt
                ? `최근 갱신 ${lastUpdatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
                : "센서 현황 확인 전"}
            </p>
          </div>

          {syncNotice ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" role="status">
              <UiIcon name="info" className="mt-0.5 size-4.5 shrink-0" />
              {syncNotice}
            </div>
          ) : null}

          {initialLoading ? (
            <SpaceGridSkeleton />
          ) : listError && spaces.length === 0 ? (
            <StatePanel
              title="공간 목록을 불러오지 못했습니다."
              description={listError}
              actionLabel="다시 불러오기"
              onAction={() => void loadSpacePage(0, false)}
            />
          ) : visibleSpaces.length === 0 ? (
            <StatePanel
              title={spaces.length === 0 ? "표시할 공간이 없습니다." : "조건에 맞는 공간이 없습니다."}
              description={spaces.length === 0 ? "운영 확인이 완료된 공간이 등록되면 여기에 표시됩니다." : "검색어나 혼잡도 필터를 바꿔 보세요."}
              actionLabel={spaces.length === 0 ? undefined : "필터 초기화"}
              onAction={spaces.length === 0 ? undefined : () => {
                setQuery("");
                setAvailabilityFilter("ALL");
              }}
            />
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleSpaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  snapshot={snapshots[space.id]}
                  snapshotFailed={snapshotFailures.has(space.id)}
                  distanceKilometers={getSpaceDistance(space, userCoordinates)}
                  retrying={retryingSpaceIds.has(space.id)}
                  onRetry={(spaceId) => void retrySpace(spaceId)}
                />
              ))}
            </div>
          )}

          {hasMore && !initialLoading ? (
            <div className="mt-7 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => void loadSpacePage(pageNumber + 1, true)}
                disabled={loadingMore}
                className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? "공간 불러오는 중" : "공간 더 보기"}
              </button>
              <p className="text-[11px] font-medium text-slate-400">검색은 현재 불러온 공간에 적용됩니다.</p>
            </div>
          ) : null}
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
          <p>점유율은 사람 수가 아니라 활성 센서 중 점유 상태를 보고한 비율입니다. 직선거리는 참고용이며 이동 시간·예상 대기 시간은 제공하지 않습니다.</p>
          <p className="mt-1">현황은 60초마다 자동 갱신되며, 센서 통신 상태에 따라 실제 공간 상황과 차이가 날 수 있습니다.</p>
        </footer>
      </main>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  suffix,
  tone = "default",
}: {
  label: string;
  value: number | null;
  suffix: string;
  tone?: "default" | "quiet" | "muted";
}) {
  const valueClass = tone === "quiet" ? "text-emerald-700" : tone === "muted" ? "text-slate-500" : "text-slate-950";
  return (
    <div className="px-3 text-center first:pl-0 last:pr-0 sm:px-6 sm:text-left">
      <dt className="text-[11px] font-bold text-slate-500 sm:text-xs">{label}</dt>
      <dd className={`mt-1 tabular-nums text-xl font-black tracking-[-0.035em] sm:text-2xl ${valueClass}`}>
        {value ?? "—"}{value === null ? null : <span className="ml-0.5 text-xs font-bold tracking-normal">{suffix}</span>}
      </dd>
    </div>
  );
}

function StatePanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-5 border-y border-slate-200 py-14 text-center">
      <p className="text-base font-black text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md break-keep text-sm leading-6 text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="focus-ring mt-5 min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function SpaceGridSkeleton() {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-busy="true">
      <p className="sr-only">공간 현황을 불러오는 중입니다.</p>
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} aria-hidden="true" className="min-h-[330px] animate-pulse overflow-hidden rounded-[22px] border border-slate-200 bg-white p-6">
          <div className="h-7 w-20 rounded-full bg-slate-100" />
          <div className="mt-5 h-6 w-2/3 rounded-md bg-slate-100" />
          <div className="mt-3 h-4 w-full rounded-md bg-slate-100" />
          <div className="mt-2 h-4 w-4/5 rounded-md bg-slate-100" />
          <div className="mt-8 h-10 w-24 rounded-md bg-slate-100" />
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
