"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import BrandMark from "@/app/components/BrandMark";
import SpaceDashboard from "@/app/components/SpaceDashboard";
import UiIcon from "@/app/components/UiIcon";
import useAuthSession from "@/app/hooks/useAuthSession";
import useSpaceDiscovery from "@/app/hooks/useSpaceDiscovery";
import { logout } from "@/app/lib/auth";

/**
 * `/` route. 세션 복구 전에는 로딩, 비로그인 상태에는 서비스 설명,
 * USER 세션에는 센서 기반 공간 탐색 화면을 렌더링한다.
 */
export default function Home() {
  const router = useRouter();
  const { isHydrated, authStatus, user } = useAuthSession();
  const isLoggedIn = authStatus === "in";
  const discovery = useSpaceDiscovery(isHydrated && isLoggedIn);

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  };

  if (!isHydrated || authStatus === "unknown") {
    return <AppLoading message="로그인 상태를 확인하고 있습니다." />;
  }

  if (!isLoggedIn) {
    return <SignedOutHome />;
  }

  return (
    <SpaceDashboard
      userName={user?.username ?? "사용자"}
      discovery={discovery}
      onSignOut={() => void handleSignOut()}
    />
  );
}

function AppLoading({ message }: { message: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--canvas)] px-5" aria-live="polite">
      <section className="text-center">
        <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-slate-600">{message}</p>
      </section>
    </main>
  );
}

function SignedOutHome() {
  return (
    <main className="min-h-dvh overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-7xl flex-col">
        <BrandMark href="/" inverse />
        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.7fr)]">
          <div className="max-w-3xl">
            <p className="eyebrow text-blue-300">Sensor-based occupancy</p>
            <h1 className="mt-4 break-keep text-4xl font-black leading-[1.06] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              기다리지 말고,<br />먼저 확인하세요
            </h1>
            <p className="mt-6 max-w-xl break-keep text-base leading-7 text-slate-300 sm:text-lg">
              ZeroQ는 공간에 설치된 센서의 최근 측정을 바탕으로 현재 혼잡도를 보여줍니다. 확인할 수 없는 상태도 숨기지 않습니다.
            </p>
            <Link
              href="/login"
              className="focus-ring mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500"
            >
              로그인하고 공간 보기
              <UiIcon name="arrow-right" className="size-4.5" />
            </Link>
          </div>
          <div className="border-l border-slate-700 pl-6 sm:pl-8">
            <p className="text-sm font-black text-white">보이는 숫자의 기준</p>
            <ul className="mt-5 space-y-5">
              <TrustPoint title="신뢰 가능한 최근 측정" description="오래되거나 품질이 낮은 측정은 현재 점유율에서 제외합니다." />
              <TrustPoint title="일부 보고는 별도 표시" description="센서 일부만 응답하면 보고율과 함께 안내합니다." />
              <TrustPoint title="측정 없음은 0%가 아님" description="데이터 공백을 한산한 공간으로 오해하지 않도록 구분합니다." />
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

function TrustPoint({ title, description }: { title: string; description: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-blue-500/15 text-blue-300">
        <UiIcon name="check" className="size-4" />
      </span>
      <div>
        <p className="text-sm font-bold text-slate-100">{title}</p>
        <p className="mt-1 break-keep text-sm leading-6 text-slate-400">{description}</p>
      </div>
    </li>
  );
}
