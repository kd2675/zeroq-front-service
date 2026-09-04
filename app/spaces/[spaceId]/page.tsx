"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

import AppLoading from "@/app/components/AppLoading";
import AppShell from "@/app/components/AppShell";
import SpaceMapPanel from "@/app/components/SpaceMapPanel";
import UiIcon from "@/app/components/UiIcon";
import useProtectedPage from "@/app/hooks/useProtectedPage";
import useSpaceDetail from "@/app/hooks/useSpaceDetail";
import {
  formatExactTimestamp,
  formatRelativeTimestamp,
  getCrowdPresentation,
  hasUsableOccupancy,
} from "@/app/lib/spacePresentation";
import type { CreateReviewInput } from "@/app/lib/userContent";
import type { ReviewItem } from "@/app/types/userContent";

/** `/spaces/{spaceId}` route. 공간 정보와 현재 센서 상태, 저장, 리뷰를 실제 API로 연결한다. */
export default function SpaceDetailPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const resolvedParams = use(params);
  const parsedSpaceId = Number(resolvedParams.spaceId);
  const spaceId = Number.isSafeInteger(parsedSpaceId) && parsedSpaceId > 0 ? parsedSpaceId : null;
  const session = useProtectedPage();
  const detail = useSpaceDetail(spaceId, session.isReady);

  if (!session.isReady) {
    return <AppLoading message="공간 정보를 준비하고 있습니다." />;
  }

  return (
    <AppShell activeTab="EXPLORE" userName={session.user?.username ?? "사용자"} onSignOut={() => void session.signOut()}>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-7 md:pb-14">
        <Link href="/" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl pr-3 text-sm font-bold text-slate-600 transition hover:text-slate-950">
          <UiIcon name="arrow-left" className="size-4.5" />
          탐색으로 돌아가기
        </Link>

        {!spaceId ? (
          <StatePanel title="잘못된 공간 주소입니다." description="탐색 화면에서 공간을 다시 선택해 주세요." />
        ) : detail.loading ? (
          <DetailSkeleton />
        ) : detail.error && !detail.space ? (
          <StatePanel title="공간을 불러오지 못했습니다." description={detail.error} actionLabel="다시 불러오기" onAction={() => void detail.load()} />
        ) : detail.space ? (
          <>
            {detail.error ? <Feedback tone="error">{detail.error}</Feedback> : null}
            {detail.notice ? <Feedback tone="notice">{detail.notice}</Feedback> : null}
            <SpaceOverview detail={detail} />
            <ReviewSection
              spaceName={detail.space.name}
              reviews={detail.reviews}
              reviewCount={detail.reviewCount}
              submitting={detail.submittingReview}
              onSubmit={detail.submitReview}
            />
          </>
        ) : null}
      </main>
    </AppShell>
  );
}

function SpaceOverview({ detail }: { detail: ReturnType<typeof useSpaceDetail> }) {
  const space = detail.space;
  if (!space) return null;
  const sensor = detail.snapshot?.snapshot;
  const usable = hasUsableOccupancy(sensor);
  const crowd = getCrowdPresentation(usable ? sensor.crowdLevel : "UNKNOWN");
  const occupancy = usable ? sensor.occupancyRate : null;
  const toneClass = crowd.tone === "quiet" ? "text-emerald-700" : crowd.tone === "medium" ? "text-amber-700" : crowd.tone === "busy" ? "text-rose-700" : "text-slate-500";

  return (
    <motion.div className="mt-3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-black ${toneClass}`}>{crowd.label}</span>
            {space.verified ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700"><UiIcon name="check" className="size-3.5" />운영 확인</span> : null}
          </div>
          <h1 className="mt-2 break-keep text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">{space.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{space.address?.trim() || "주소 정보 없음"}</p>
        </div>
        <button
          type="button"
          onClick={() => void detail.toggleFavorite()}
          disabled={detail.savingFavorite || detail.favoriteLoading}
          aria-pressed={detail.favorite}
          className={`focus-ring inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition disabled:cursor-wait disabled:opacity-60 ${detail.favorite ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"}`}
        >
          <UiIcon name="bookmark" className={`size-4.5 ${detail.favorite ? "fill-current" : ""}`} />
          {detail.favoriteLoading ? "확인 중" : detail.savingFavorite ? "처리 중" : detail.favorite ? "저장됨" : "저장"}
        </button>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.64fr)]">
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.05)]" aria-label={`${space.name} 위치`}>
          <div className="h-[390px] sm:h-[480px]">
            <SpaceMapPanel spaces={[space]} snapshots={detail.snapshot ? { [space.id]: detail.snapshot } : {}} snapshotFailures={new Set()} selectedSpaceId={space.id} userCoordinates={null} onSelectSpace={() => undefined} />
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_14px_36px_rgba(15,23,42,0.16)] sm:p-6" aria-labelledby="occupancy-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p id="occupancy-title" className="text-xs font-bold text-slate-400">현재 감지 점유율</p>
                <p className="mt-2 tabular-nums text-5xl font-black tracking-[-0.06em]">
                  {occupancy === null ? "—" : Math.round(occupancy)}{occupancy === null ? null : <span className="ml-1 text-2xl text-slate-400">%</span>}
                </p>
              </div>
              <span className={`rounded-full bg-white/10 px-3 py-1.5 text-xs font-black ${crowd.tone === "quiet" ? "text-emerald-300" : crowd.tone === "medium" ? "text-amber-300" : crowd.tone === "busy" ? "text-rose-300" : "text-slate-300"}`}>{crowd.label}</span>
            </div>
            {usable && occupancy !== null ? (
              <>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${space.name} 감지 점유율`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(occupancy)}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${occupancy}%` }} transition={{ duration: 0.6, delay: 0.15 }} className={`h-full rounded-full ${crowd.tone === "quiet" ? "bg-emerald-400" : crowd.tone === "medium" ? "bg-amber-400" : "bg-rose-400"}`} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
                  <div><dt className="text-[11px] font-semibold text-slate-400">점유 감지</dt><dd className="mt-1 text-sm font-black tabular-nums">{sensor.occupiedCount ?? "-"}곳</dd></div>
                  <div><dt className="text-[11px] font-semibold text-slate-400">센서 보고</dt><dd className="mt-1 text-sm font-black tabular-nums">{sensor.reportingSensorCount}/{sensor.configuredSensorCount}대</dd></div>
                </dl>
                {sensor.dataStatus === "PARTIAL" ? <p className="mt-4 rounded-xl bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-200">일부 센서만 보고 중입니다. 보고율 {sensor.reportingCoveragePercent.toFixed(1)}%</p> : null}
              </>
            ) : (
              <p className="mt-5 break-keep rounded-xl bg-white/8 px-4 py-3 text-sm leading-6 text-slate-300">최근 신뢰 가능한 측정이 없습니다. 이는 점유율 0%를 뜻하지 않습니다.</p>
            )}
            <div className="mt-5 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-400">
              <span title={formatExactTimestamp(sensor?.lastMeasuredAt)}>측정 {formatRelativeTimestamp(sensor?.lastMeasuredAt)}</span>
              <button type="button" onClick={() => void detail.refreshSnapshot()} disabled={detail.refreshingSnapshot} className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"><UiIcon name="refresh" className={`size-3.5 ${detail.refreshingSnapshot ? "animate-spin" : ""}`} />새로고침</button>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.04)] sm:p-6">
            <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">공간 정보</h2>
            <p className="mt-3 break-keep text-sm leading-6 text-slate-600">{space.description?.trim() || "등록된 공간 설명이 없습니다."}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs font-bold text-slate-600">
              <span className="inline-flex items-center gap-1"><UiIcon name="star" className="size-4 fill-amber-400 text-amber-400" />{space.reviewCount > 0 ? `${space.averageRating.toFixed(1)} · 리뷰 ${space.reviewCount.toLocaleString("ko-KR")}개` : "아직 평점 없음"}</span>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function ReviewSection({ spaceName, reviews, reviewCount, submitting, onSubmit }: { spaceName: string; reviews: ReviewItem[]; reviewCount: number; submitting: boolean; onSubmit: (input: CreateReviewInput) => Promise<boolean> }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [validation, setValidation] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    const normalizedContent = content.trim();
    if (normalizedTitle.length < 2) {
      setValidation("제목을 2자 이상 입력해 주세요.");
      return;
    }
    if (normalizedContent.length < 5) {
      setValidation("내용을 5자 이상 입력해 주세요.");
      return;
    }
    setValidation(null);
    if (await onSubmit({ title: normalizedTitle, content: normalizedContent, rating })) {
      setTitle("");
      setContent("");
      setRating(5);
    }
  };

  return (
    <section className="mt-8 border-t border-slate-200 pt-8" aria-labelledby="reviews-title">
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">이용자 경험</p><h2 id="reviews-title" className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">리뷰 {reviewCount.toLocaleString("ko-KR")}</h2></div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(340px,0.6fr)_minmax(0,1fr)] lg:items-start">
        <form onSubmit={(event) => void handleSubmit(event)} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.04)] sm:p-6" noValidate>
          <h3 className="text-base font-black text-slate-950">{spaceName} 경험 남기기</h3>
          <fieldset className="mt-5"><legend className="text-xs font-bold text-slate-600">평점</legend><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`평점 ${value}점`} aria-pressed={rating === value} className="focus-ring grid size-10 place-items-center rounded-lg transition hover:bg-amber-50"><UiIcon name="star" className={`size-5 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></button>)}</div></fieldset>
          <label className="mt-4 block"><span className="text-xs font-bold text-slate-600">제목</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} className="focus-ring mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-blue-500" placeholder="경험을 한 문장으로 적어 주세요" /></label>
          <label className="mt-4 block"><span className="text-xs font-bold text-slate-600">내용</span><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} rows={5} className="focus-ring mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-3 py-3 text-sm leading-6 outline-none focus:border-blue-500" placeholder="혼잡도와 실제 이용 경험을 알려 주세요" /></label>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>{validation ?? "개인정보는 입력하지 마세요."}</span><span>{content.length}/500</span></div>
          <button type="submit" disabled={submitting} className="focus-ring mt-4 min-h-12 w-full rounded-xl bg-slate-950 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{submitting ? "등록 중" : "리뷰 등록"}</button>
        </form>

        <div className="space-y-3">
          {reviews.length === 0 ? <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">첫 번째 리뷰를 남겨 보세요.</div> : reviews.map((review, index) => <ReviewCard key={review.id} review={review} index={index} />)}
          {reviewCount > reviews.length ? <p className="text-center text-xs font-semibold text-slate-400">최신 리뷰 {reviews.length}개를 표시합니다.</p> : null}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review, index }: { review: ReviewItem; index: number }) {
  return (
    <motion.article initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ delay: Math.min(index * 0.04, 0.2) }} className="rounded-[20px] border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-900">{review.userName?.trim() || "ZeroQ 이용자"}</p><p className="mt-1 text-[11px] text-slate-400">{formatExactTimestamp(review.createdAt) ?? "작성 시각 확인 불가"}</p></div><span className="inline-flex items-center gap-1 text-xs font-black text-slate-700"><UiIcon name="star" className="size-4 fill-amber-400 text-amber-400" />{review.rating}</span></div>
      <h3 className="mt-4 text-sm font-black text-slate-900">{review.title}</h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{review.content}</p>
    </motion.article>
  );
}

function Feedback({ tone, children }: { tone: "error" | "notice"; children: React.ReactNode }) {
  return <p className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${tone === "error" ? "border border-rose-200 bg-rose-50 text-rose-800" : "bg-blue-50 text-blue-800"}`} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}

function StatePanel({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <section className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><h1 className="text-lg font-black text-slate-900">{title}</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{actionLabel && onAction ? <button type="button" onClick={onAction} className="focus-ring mt-5 min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">{actionLabel}</button> : null}</section>;
}

function DetailSkeleton() {
  return <div className="mt-5 animate-pulse" aria-label="공간 상세 불러오는 중" aria-busy="true"><div className="h-24 rounded-[20px] bg-white" /><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="h-[480px] rounded-[24px] bg-white" /><div className="h-[480px] rounded-[24px] bg-white" /></div></div>;
}
