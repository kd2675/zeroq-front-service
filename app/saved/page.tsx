"use client";

import Link from "next/link";
import { motion } from "motion/react";

import AppLoading from "@/app/components/AppLoading";
import AppShell from "@/app/components/AppShell";
import UiIcon from "@/app/components/UiIcon";
import useProtectedPage from "@/app/hooks/useProtectedPage";
import useSavedSpaces from "@/app/hooks/useSavedSpaces";
import { getCrowdPresentation, hasUsableOccupancy } from "@/app/lib/spacePresentation";

/** `/saved` route. 서버에 저장된 사용자 즐겨찾기와 최신 센서 현황을 함께 보여준다. */
export default function SavedPage() {
  const session = useProtectedPage();
  const saved = useSavedSpaces(
    session.isReady,
    session.user?.userKey ?? session.user?.username ?? "anonymous",
  );

  if (!session.isReady) {
    return <AppLoading message="저장한 공간을 준비하고 있습니다." />;
  }

  return (
    <AppShell activeTab="SAVED" userName={session.user?.username ?? "사용자"} onSignOut={() => void session.signOut()}>
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-7 sm:px-6 sm:pt-10 md:pb-14">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="eyebrow">나의 공간</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.045em] text-slate-950">저장한 공간</h1>
              <p className="mt-2 break-keep text-sm leading-6 text-slate-600">다시 확인할 장소와 현재 센서 현황을 한곳에 모았습니다.</p>
            </div>
            {!saved.loading && saved.items.length > 0 ? (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                {saved.items.length.toLocaleString("ko-KR")}곳
              </span>
            ) : null}
          </div>
        </motion.header>

        {saved.notice ? (
          <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800" role="status">{saved.notice}</p>
        ) : null}
        {saved.error ? (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3" role="alert">
            <p className="text-sm font-semibold text-rose-800">{saved.error}</p>
            <button type="button" onClick={() => void saved.load()} className="focus-ring shrink-0 rounded-lg px-2 py-1 text-xs font-black text-rose-800 hover:bg-rose-100">재시도</button>
          </div>
        ) : null}

        {saved.loading ? (
          <SavedSkeleton />
        ) : saved.items.length === 0 ? (
          <EmptySaved />
        ) : (
          <section className="mt-7 grid gap-4 sm:grid-cols-2" aria-label="저장한 공간 목록">
            {saved.items.map((item, index) => {
              const snapshot = item.snapshot?.snapshot;
              const usable = hasUsableOccupancy(snapshot);
              const crowd = getCrowdPresentation(usable ? snapshot.crowdLevel : "UNKNOWN");
              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ delay: Math.min(index * 0.05, 0.25) }}
                  className="group flex min-h-52 flex-col rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.045)] transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className={`text-xs font-black ${crowd.tone === "quiet" ? "text-emerald-700" : crowd.tone === "medium" ? "text-amber-700" : crowd.tone === "busy" ? "text-rose-700" : "text-slate-500"}`}>
                        {crowd.label}
                      </span>
                      <h2 className="mt-2 truncate text-xl font-black tracking-[-0.035em] text-slate-950">{item.space?.name ?? item.spaceName}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                        {item.space?.address?.trim() || (item.detailUnavailable ? "공간 상세를 불러오지 못했습니다." : "주소 정보 없음")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-bold text-slate-400">감지 점유율</p>
                      <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">
                        {usable && snapshot.occupancyRate !== null ? `${Math.round(snapshot.occupancyRate)}%` : "-"}
                      </p>
                    </div>
                  </div>
                  {item.note?.trim() ? <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{item.note}</p> : null}
                  <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => void saved.remove(item.spaceId)}
                      disabled={saved.removingIds.has(item.spaceId)}
                      className="focus-ring min-h-10 rounded-xl px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-rose-700 disabled:cursor-wait disabled:opacity-50"
                    >
                      {saved.removingIds.has(item.spaceId) ? "제거 중" : "저장 해제"}
                    </button>
                    <Link href={`/spaces/${item.spaceId}`} className="focus-ring ml-auto inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-black text-blue-700 transition hover:bg-blue-50">
                      상세 보기
                      <UiIcon name="chevron-right" className="size-4" />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </section>
        )}
      </main>
    </AppShell>
  );
}

function EmptySaved() {
  return (
    <section className="mt-7 rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"><UiIcon name="bookmark" className="size-5" /></span>
      <h2 className="mt-4 text-lg font-black text-slate-900">아직 저장한 공간이 없습니다.</h2>
      <p className="mx-auto mt-2 max-w-sm break-keep text-sm leading-6 text-slate-500">공간 상세에서 저장하면 혼잡도를 다시 빠르게 확인할 수 있습니다.</p>
      <Link href="/" className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-blue-700">
        공간 탐색하기
        <UiIcon name="arrow-right" className="size-4" />
      </Link>
    </section>
  );
}

function SavedSkeleton() {
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2" aria-label="저장한 공간 불러오는 중" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-52 animate-pulse rounded-[20px] border border-slate-200 bg-white" />)}
    </div>
  );
}
