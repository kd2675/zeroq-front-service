"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAccessToken, logout } from "@/app/lib/auth";
import { getJson } from "@/app/lib/api";
import useAuthSession from "@/app/hooks/useAuthSession";

type SpaceItem = {
  id: number;
  name: string;
  address?: string;
};

type PageResponse<T> = {
  content: T[];
};

type Snapshot = {
  occupancyRate: number | null;
  crowdLevel: string;
  activeSensorCount: number;
  configuredSensorCount: number;
  reportingSensorCount: number;
  occupiedCount: number | null;
  dataStatus: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
  reportingCoveragePercent: number;
  lastMeasuredAt?: string;
};

type SpaceSnapshot = {
  spaceId: number;
  spaceName: string;
  snapshot: Snapshot;
};

export default function Home() {
  const router = useRouter();
  const { isHydrated, authStatus, user } = useAuthSession();

  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [snapshots, setSnapshots] = useState<Record<number, SpaceSnapshot | null>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoggedIn = authStatus === "in";

  useEffect(() => {
    if (!isHydrated || authStatus !== "in") {
      return;
    }

    void loadSpaceSnapshots();
  }, [authStatus, isHydrated]);

  const loadSpaceSnapshots = async () => {
    setLoading(true);
    setErrorMessage(null);

    const token = await ensureAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const spacesResult = await getJson<PageResponse<SpaceItem>>(
      "/api/zeroq/v1/spaces?page=0&size=12",
      headers,
    );

    if (!spacesResult.ok || !spacesResult.data?.content) {
      setSpaces([]);
      setSnapshots({});
      setLoading(false);
      setErrorMessage(spacesResult.message ?? "공간 목록을 불러오지 못했습니다.");
      return;
    }

    const loadedSpaces = spacesResult.data.content;
    setSpaces(loadedSpaces);

    const snapshotEntries = await Promise.all(
      loadedSpaces.map(async (space) => {
        const snapshotResult = await getJson<SpaceSnapshot>(
          `/api/zeroq/v1/space-sensors/spaces/${space.id}/snapshot?recalculate=false`,
          headers,
        );

        if (!snapshotResult.ok || !snapshotResult.data) {
          return [space.id, null] as const;
        }

        return [space.id, snapshotResult.data] as const;
      }),
    );

    const snapshotMap: Record<number, SpaceSnapshot | null> = {};
    snapshotEntries.forEach(([spaceId, snapshot]) => {
      snapshotMap[spaceId] = snapshot;
    });

    setSnapshots(snapshotMap);
    setLoading(false);
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // The auth helper clears the local session even if the server request fails.
    } finally {
      router.replace("/login");
    }
  };

  if (!isHydrated || authStatus === "unknown") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">세션 확인 중...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <main className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">ZeroQ Service</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">실시간 공간 혼잡도</h1>
          <p className="mt-2 text-sm text-slate-600">로그인 후 공간별 센서 기반 혼잡도를 확인할 수 있습니다.</p>
          <a
            href="/login"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            로그인
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <main className="mx-auto w-full max-w-6xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">ZeroQ Service</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">센서 기반 실시간 공간 현황</h1>
              <p className="mt-2 text-sm text-slate-600">안녕하세요, {user?.username ?? "사용자"}님</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadSpaceSnapshots()}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                새로고침
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                로그아웃
              </button>
            </div>
          </div>

          {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
        </section>

        <section>
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              데이터를 불러오는 중입니다...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {spaces.map((space) => {
                const snapshot = snapshots[space.id]?.snapshot;
                return (
                  <article
                    key={space.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <h2 className="text-lg font-semibold text-slate-900">{space.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{space.address ?? "주소 정보 없음"}</p>

                    {snapshot && snapshot.dataStatus !== "UNAVAILABLE" && snapshot.occupancyRate !== null ? (
                      <div className="mt-4 space-y-1 text-sm">
                        <p className="font-semibold text-slate-900">
                          혼잡도 {snapshot.occupancyRate.toFixed(1)}% ({snapshot.crowdLevel})
                        </p>
                        <p className="text-slate-700">
                          점유 {snapshot.occupiedCount} / 보고 센서 {snapshot.reportingSensorCount}
                          {" "}/ 설치 센서 {snapshot.configuredSensorCount}
                        </p>
                        {snapshot.dataStatus === "PARTIAL" ? (
                          <p className="text-xs font-medium text-amber-700">
                            일부 센서만 보고 중입니다. 보고율 {snapshot.reportingCoveragePercent.toFixed(1)}%
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          마지막 측정: {snapshot.lastMeasuredAt ?? "-"}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-1 text-sm">
                        <p className="font-semibold text-amber-700">현재 혼잡도를 확인할 수 없습니다.</p>
                        <p className="text-slate-600">
                          센서 보고 0 / 설치 센서 {snapshot?.configuredSensorCount ?? 0}
                        </p>
                        <p className="text-xs text-slate-500">
                          마지막 수신: {snapshot?.lastMeasuredAt ?? "없음"}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
