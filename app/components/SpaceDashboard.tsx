"use client";

import { useEffect } from "react";
import { motion } from "motion/react";

import SpaceCard from "@/app/components/SpaceCard";
import SpaceMapPanel from "@/app/components/SpaceMapPanel";
import UiIcon from "@/app/components/UiIcon";
import type { SpaceDiscoveryState } from "@/app/hooks/useSpaceDiscovery";
import { getSpaceDistance } from "@/app/lib/spacePresentation";
import type { AvailabilityFilter, SpaceSort } from "@/app/types/space";
import { setSelectedSpaceId } from "@/lib/features/explore/exploreSlice";
import { setExploreView } from "@/lib/features/preferences/preferencesSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

const filterOptions: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "QUIET", label: "여유" },
  { value: "MEDIUM", label: "보통" },
  { value: "BUSY", label: "혼잡" },
  { value: "UNKNOWN", label: "확인 불가" },
];

type SpaceDashboardProps = {
  discovery: SpaceDiscoveryState;
};

/** 지도와 결과 목록을 한 탐색 흐름으로 묶어 현재 혼잡도 비교를 제공한다. */
export default function SpaceDashboard({ discovery }: SpaceDashboardProps) {
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
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((state) => state.preferences.exploreView);
  const selectedSpaceId = useAppSelector((state) => state.explore.selectedSpaceId);

  useEffect(() => {
    if (selectedSpaceId !== null && visibleSpaces.some((space) => space.id === selectedSpaceId)) {
      return;
    }
    dispatch(setSelectedSpaceId(visibleSpaces[0]?.id ?? null));
  }, [dispatch, selectedSpaceId, visibleSpaces]);

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 md:pb-12">
      <motion.section
        aria-labelledby="explore-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">현재 공간 탐색</p>
            <h1 id="explore-title" className="mt-2 break-keep text-2xl font-black tracking-[-0.045em] text-slate-950 sm:text-3xl">
              지금 덜 붐비는 공간을 찾아보세요
            </h1>
            <p className="mt-2 break-keep text-sm leading-6 text-slate-600">
              최근 신뢰 가능한 센서 측정만 표시하며, 측정 공백은 여유로 해석하지 않습니다.
            </p>
          </div>
          <dl className="grid min-w-full grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-[0_5px_18px_rgba(15,23,42,0.035)] sm:min-w-[390px]">
            <SummaryMetric label="현황 확인" value={initialLoading ? null : availabilitySummary.available} />
            <SummaryMetric label="여유" value={initialLoading ? null : availabilitySummary.quiet} tone="quiet" />
            <SummaryMetric label="확인 필요" value={initialLoading ? null : availabilitySummary.unavailable} tone="muted" />
          </dl>
        </div>

        <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.045)] sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">불러온 공간 검색</span>
              <UiIcon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="공간 이름, 주소 검색"
                className="focus-ring min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
              />
            </label>
            <div className="no-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 lg:pb-0" aria-label="혼잡도 필터">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={availabilityFilter === option.value}
                  onClick={() => setAvailabilityFilter(option.value)}
                  className={`focus-ring min-h-11 shrink-0 rounded-xl px-3.5 text-sm font-bold transition ${
                    availabilityFilter === option.value
                      ? "bg-slate-950 text-white"
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
                className="focus-ring min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none lg:flex-none"
              >
                <option value="QUIETEST">혼잡도 낮은 순</option>
                {userCoordinates ? <option value="NEAREST">가까운 순</option> : null}
                <option value="NAME">이름순</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 md:hidden">
          <div className="grid grid-cols-2 rounded-xl bg-slate-200/70 p-1" role="group" aria-label="탐색 보기 방식">
            <ViewButton active={viewMode === "MAP"} label="지도" icon="map" onClick={() => dispatch(setExploreView("MAP"))} />
            <ViewButton active={viewMode === "LIST"} label="목록" icon="menu" onClick={() => dispatch(setExploreView("LIST"))} />
          </div>
          <button
            type="button"
            onClick={() => void refreshSnapshots(true)}
            disabled={refreshing || initialLoading || spaces.length === 0}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-600 transition hover:bg-white disabled:cursor-wait disabled:opacity-50"
          >
            <UiIcon name="refresh" className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "갱신 중" : "새로고침"}
          </button>
        </div>

        {locationMessage ? (
          <p className={`mt-3 flex items-start gap-2 text-xs font-semibold ${locationState === "error" ? "text-rose-700" : "text-slate-500"}`} role={locationState === "error" ? "alert" : "status"}>
            <UiIcon name="info" className="mt-px size-4 shrink-0" />
            {locationMessage}
          </p>
        ) : null}
        {syncNotice ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" role="status">
            <UiIcon name="info" className="mt-0.5 size-4.5 shrink-0" />
            {syncNotice}
          </div>
        ) : null}
      </motion.section>

      <motion.section
        className="mt-5 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.72fr)] lg:items-start lg:gap-5"
        aria-label="지도와 공간 검색 결과"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <motion.div
          className={`${viewMode === "MAP" ? "block" : "hidden"} overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_38px_rgba(15,23,42,0.07)] lg:sticky lg:top-21 lg:block`}
          whileHover={{ boxShadow: "0 18px 46px rgba(15,23,42,0.11)" }}
        >
          <div className="h-[calc(100dvh-16.5rem)] min-h-[420px] max-h-[760px]">
            <SpaceMapPanel
              spaces={visibleSpaces}
              snapshots={snapshots}
              snapshotFailures={snapshotFailures}
              selectedSpaceId={selectedSpaceId}
              userCoordinates={userCoordinates}
              onSelectSpace={(spaceId) => dispatch(setSelectedSpaceId(spaceId))}
              onRequestLocation={requestLocation}
              locationLoading={locationState === "loading"}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-[11px] font-semibold text-slate-500">
            <span>{visibleSpaces.length.toLocaleString("ko-KR")}개 공간 표시</span>
            <span>거리·이동시간 예측이 아닌 위치 참고 지도입니다.</span>
          </div>
        </motion.div>

        <div className={viewMode === "LIST" ? "block" : "hidden lg:block"}>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-[-0.025em] text-slate-950">공간 목록</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {totalElements !== null ? `운영 확인 ${totalElements.toLocaleString("ko-KR")}곳 중 ` : ""}
                {spaces.length.toLocaleString("ko-KR")}곳 불러옴
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-[11px] font-semibold text-slate-400">
                {lastUpdatedAt
                  ? `${lastUpdatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 갱신`
                  : "현황 확인 전"}
              </span>
              <button
                type="button"
                onClick={() => void refreshSnapshots(true)}
                disabled={refreshing || initialLoading || spaces.length === 0}
                className="focus-ring grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-white disabled:cursor-wait disabled:opacity-50"
                aria-label="센서 현황 새로고침"
                title="센서 현황 새로고침"
              >
                <UiIcon name="refresh" className={`size-4.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {initialLoading ? (
            <SpaceListSkeleton />
          ) : listError && spaces.length === 0 ? (
            <StatePanel title="공간 목록을 불러오지 못했습니다." description={listError} actionLabel="다시 불러오기" onAction={() => void loadSpacePage(0, false)} />
          ) : visibleSpaces.length === 0 ? (
            <StatePanel
              title={spaces.length === 0 ? "표시할 공간이 없습니다." : "조건에 맞는 공간이 없습니다."}
              description={spaces.length === 0 ? "운영 확인이 완료된 공간이 등록되면 표시됩니다." : "검색어나 혼잡도 필터를 바꿔 보세요."}
              actionLabel={spaces.length === 0 ? undefined : "필터 초기화"}
              onAction={spaces.length === 0 ? undefined : () => {
                setQuery("");
                setAvailabilityFilter("ALL");
              }}
            />
          ) : (
            <div className="space-y-3">
              {visibleSpaces.map((space, index) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  snapshot={snapshots[space.id]}
                  snapshotFailed={snapshotFailures.has(space.id)}
                  distanceKilometers={getSpaceDistance(space, userCoordinates)}
                  retrying={retryingSpaceIds.has(space.id)}
                  selected={selectedSpaceId === space.id}
                  animationIndex={index}
                  onPreview={(spaceId) => dispatch(setSelectedSpaceId(spaceId))}
                  onRetry={(spaceId) => void retrySpace(spaceId)}
                />
              ))}
            </div>
          )}

          {hasMore && !initialLoading ? (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => void loadSpacePage(pageNumber + 1, true)}
                disabled={loadingMore}
                className="focus-ring min-h-12 w-full rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? "공간 불러오는 중" : "공간 더 보기"}
              </button>
              <p className="mt-2 text-[11px] font-medium text-slate-400">검색과 필터는 지금 불러온 공간에 적용됩니다.</p>
            </div>
          ) : null}
        </div>
      </motion.section>

      <footer className="mt-8 border-t border-slate-200 pt-5 text-[11px] leading-5 text-slate-500">
        <p>점유율은 사람 수가 아니라 활성 센서 중 점유 상태를 보고한 비율입니다. 현황은 센서 통신 상태에 따라 실제 상황과 차이가 날 수 있습니다.</p>
        <p className="mt-1">현재 위치는 사용자가 요청할 때만 기기에서 확인하며 서버로 전송하거나 저장하지 않습니다.</p>
      </footer>
    </main>
  );
}

function SummaryMetric({ label, value, tone = "default" }: { label: string; value: number | null; tone?: "default" | "quiet" | "muted" }) {
  const valueClass = tone === "quiet" ? "text-emerald-700" : tone === "muted" ? "text-slate-500" : "text-slate-950";
  return (
    <div className="px-3 text-center">
      <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
      <dd className={`mt-1 tabular-nums text-lg font-black ${valueClass}`}>{value === null ? "—" : `${value}곳`}</dd>
    </div>
  );
}

function ViewButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: "map" | "menu"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-xs font-bold ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
      }`}
    >
      <UiIcon name={icon} className="size-4" />
      {label}
    </button>
  );
}

function StatePanel({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-sm break-keep text-xs leading-5 text-slate-500">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="focus-ring mt-4 min-h-11 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-blue-700">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function SpaceListSkeleton() {
  return (
    <div className="space-y-3" aria-label="공간 현황 불러오는 중" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-48 animate-pulse rounded-[20px] border border-slate-200 bg-white p-5">
          <div className="h-6 w-20 rounded-full bg-slate-100" />
          <div className="mt-4 h-5 w-2/5 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
          <div className="mt-6 h-1.5 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
