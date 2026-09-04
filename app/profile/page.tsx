"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";

import AppLoading from "@/app/components/AppLoading";
import AppShell from "@/app/components/AppShell";
import UiIcon from "@/app/components/UiIcon";
import useAppPreferences from "@/app/hooks/useAppPreferences";
import useProtectedPage from "@/app/hooks/useProtectedPage";
import { ensureAccessToken } from "@/app/lib/auth";
import { getProfileSummary, type ProfileSummary } from "@/app/lib/profile";
import { formatExactTimestamp } from "@/app/lib/spacePresentation";
import { getFavorites, getProfileReviews } from "@/app/lib/userContent";
import type { ExploreView } from "@/app/lib/preferences";
import type { ReviewItem } from "@/app/types/userContent";

type ProfilePageData = {
  profile: ProfileSummary;
  favoriteCount: number;
  reviews: ReviewItem[];
  reviewCount: number;
  partialUnavailable: boolean;
};

/** `/profile` route. 서버 프로필·활동과 이 기기에만 적용되는 표시 설정을 구분해 제공한다. */
export default function ProfilePage() {
  const session = useProtectedPage();
  const { preferences, setPreferences } = useAppPreferences();
  const identity = session.user?.userKey ?? session.user?.username ?? "anonymous";
  const profileQuery = useQuery({
    queryKey: ["profile-overview", identity],
    enabled: session.isReady,
    staleTime: 60_000,
    queryFn: fetchProfileOverview,
  });
  const data = profileQuery.data ?? null;
  const error = profileQuery.error instanceof Error ? profileQuery.error.message : null;

  if (!session.isReady) {
    return <AppLoading message="내 정보를 준비하고 있습니다." />;
  }

  const userName = data?.profile.displayName || session.user?.username || "사용자";
  const profileColor = normalizeProfileColor(data?.profile.profileColor);

  return (
    <AppShell activeTab="PROFILE" userName={userName} onSignOut={() => void session.signOut()}>
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-7 sm:px-6 sm:pt-10 md:pb-14">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="eyebrow">계정과 환경설정</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950">내 정보</h1>
        </motion.header>

        {error ? (
          <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="status">
            <p className="text-sm font-semibold text-amber-900">{error}</p>
            <button type="button" onClick={() => void profileQuery.refetch()} className="focus-ring shrink-0 rounded-lg px-2 py-1 text-xs font-black text-amber-900 hover:bg-amber-100">재시도</button>
          </div>
        ) : null}
        {!error && data?.partialUnavailable ? (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" role="status">
            일부 활동 정보를 불러오지 못했습니다. 프로필 정보는 그대로 표시합니다.
          </p>
        ) : null}

        {profileQuery.isPending ? (
          <ProfileSkeleton />
        ) : data ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(360px,0.52fr)] lg:items-start">
            <div className="space-y-5">
              <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)] sm:p-6">
                <div className="flex items-center gap-4">
                  <span className="grid size-16 shrink-0 place-items-center rounded-full text-xl font-black text-white" style={{ backgroundColor: profileColor }} aria-hidden="true">
                    {userName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-black tracking-[-0.04em] text-slate-950">{userName}</h2>
                    <p className="mt-1 break-keep text-sm text-slate-500">{resolveUserTagline(data.profile.tagline)}</p>
                  </div>
                </div>
                <dl className="mt-6 grid grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-4">
                  <ActivityMetric label="저장한 공간" value={data.favoriteCount} />
                  <ActivityMetric label="작성한 리뷰" value={data.reviewCount} />
                </dl>
                <p className="mt-4 text-xs leading-5 text-slate-500">프로필 이름과 소개 수정 기능은 현재 서버에서 제공하지 않습니다.</p>
              </motion.section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.04)] sm:p-6" aria-labelledby="activity-title">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="activity-title" className="text-lg font-black tracking-[-0.03em] text-slate-950">최근 리뷰</h2>
                  <span className="text-xs font-bold text-slate-400">최대 5개</span>
                </div>
                {data.reviews.length === 0 ? (
                  <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">아직 작성한 리뷰가 없습니다.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {data.reviews.map((review) => (
                      <li key={review.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-black text-slate-900">{review.spaceName}</p>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-slate-600"><UiIcon name="star" className="size-3.5 fill-amber-400 text-amber-400" />{review.rating}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-700">{review.title}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{formatExactTimestamp(review.createdAt) ?? "작성 시각 확인 불가"}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.04)] sm:p-6" aria-labelledby="settings-title">
              <div className="flex items-center gap-2">
                <UiIcon name="settings" className="size-5 text-slate-500" />
                <h2 id="settings-title" className="text-lg font-black tracking-[-0.03em] text-slate-950">이 기기 설정</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">아래 설정은 계정 서버가 아닌 현재 브라우저에만 저장됩니다.</p>

              <div className="mt-6 space-y-6">
                <SettingRow title="센서 현황 자동 갱신" description="탐색 중 60초마다 불러온 공간의 현황을 갱신합니다.">
                  <Switch checked={preferences.autoRefresh} label="센서 현황 자동 갱신" onChange={(checked) => setPreferences({ ...preferences, autoRefresh: checked })} />
                </SettingRow>
                <fieldset>
                  <legend className="text-sm font-black text-slate-900">모바일 첫 화면</legend>
                  <p className="mt-1 text-xs leading-5 text-slate-500">탐색 탭을 열 때 먼저 볼 방식을 선택합니다.</p>
                  <div className="mt-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                    {(["MAP", "LIST"] as ExploreView[]).map((view) => (
                      <button
                        key={view}
                        type="button"
                        aria-pressed={preferences.defaultExploreView === view}
                        onClick={() => setPreferences({ ...preferences, defaultExploreView: view })}
                        className={`focus-ring min-h-11 rounded-[10px] text-xs font-black ${preferences.defaultExploreView === view ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                      >
                        {view === "MAP" ? "지도 먼저" : "목록 먼저"}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <SettingRow title="위치 정보" description="탐색 화면에서 버튼을 누를 때만 브라우저에 요청하며 서버에는 보내지 않습니다." />
              </div>

              <button type="button" onClick={() => void session.signOut()} className="focus-ring mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-black text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700">
                <UiIcon name="logout" className="size-4.5" />
                로그아웃
              </button>
            </motion.aside>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}

async function fetchProfileOverview(): Promise<ProfilePageData> {
  const token = await ensureAccessToken();
  if (!token) throw new Error("로그인 세션을 확인할 수 없습니다.");
  const profileResult = await getProfileSummary(token);
  if (!profileResult.data) {
    throw new Error(profileResult.error ?? "프로필을 불러오지 못했습니다.");
  }
  const [favoritesResult, reviewsResult] = await Promise.all([
    getFavorites(token, 0, 1),
    getProfileReviews(profileResult.data.profileId, 0, 5),
  ]);
  return {
    profile: profileResult.data,
    favoriteCount: favoritesResult.data?.totalElements ?? favoritesResult.data?.content.length ?? 0,
    reviews: reviewsResult.data?.content ?? [],
    reviewCount: reviewsResult.data?.totalElements ?? reviewsResult.data?.content.length ?? 0,
    partialUnavailable: !favoritesResult.ok || !reviewsResult.ok,
  };
}

function ActivityMetric({ label, value }: { label: string; value: number }) {
  return <div className="text-center"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-xl font-black tabular-nums text-slate-950">{value.toLocaleString("ko-KR")}</dd></div>;
}

function SettingRow({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-slate-900">{title}</p><p className="mt-1 break-keep text-xs leading-5 text-slate-500">{description}</p></div>{children}</div>;
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`focus-ring relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}>
      <span className={`absolute left-0 top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function normalizeProfileColor(value?: string): string {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#2563eb";
}

function resolveUserTagline(value?: string): string {
  const normalized = value?.trim();
  if (!normalized || normalized === "실시간 공간 점유율을 관리하는 운영자") {
    return "ZeroQ 공간 이용자";
  }
  return normalized;
}

function ProfileSkeleton() {
  return <div className="mt-7 grid gap-5 lg:grid-cols-2" aria-label="프로필 불러오는 중" aria-busy="true"><div className="h-72 animate-pulse rounded-[24px] border border-slate-200 bg-white" /><div className="h-72 animate-pulse rounded-[24px] border border-slate-200 bg-white" /></div>;
}
