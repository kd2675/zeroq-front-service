"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import BrandMark from "@/app/components/BrandMark";
import { ensureAccessToken, getUserFromToken, isUserRole, logout } from "@/app/lib/auth";
import { consumeOAuthNextPath } from "@/app/lib/authRouting";
import { initializeProfile } from "@/app/lib/profile";

/**
 * `/auth/callback` route. URL token을 읽지 않고 HttpOnly refresh cookie로 access token을 복구한 뒤
 * USER 역할과 서비스 프로필을 확인하고 OAuth 시작 전 내부 경로로 돌아간다.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const failureQuery = buildOAuthFailureQuery(window.location.search);
    if (failureQuery) {
      const nextPath = consumeOAuthNextPath();
      if (nextPath !== "/") {
        failureQuery.set("next", nextPath);
      }
      router.replace(`/login?${failureQuery}`);
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = await ensureAccessToken();
      if (cancelled) {
        return;
      }
      if (!token) {
        consumeOAuthNextPath();
        router.replace("/login?loginError=session_restore_failed");
        return;
      }

      const user = getUserFromToken(token);
      if (!isUserRole(user?.role)) {
        await logout();
        consumeOAuthNextPath();
        router.replace("/login?loginError=unsupported_role");
        return;
      }

      const profileResult = await initializeProfile(token);
      if (cancelled) {
        return;
      }
      if (profileResult.error) {
        await logout();
        consumeOAuthNextPath();
        router.replace("/login?loginError=profile_initialize_failed");
        return;
      }

      router.replace(consumeOAuthNextPath());
    })().catch(async () => {
      await logout().catch(() => undefined);
      consumeOAuthNextPath();
      if (!cancelled) {
        router.replace("/login?loginError=processing_failed");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--canvas)] px-5 py-6" aria-live="polite">
      <div className="mx-auto w-full max-w-7xl">
        <BrandMark href="/" />
      </div>
      <section className="mx-auto grid w-full max-w-md flex-1 place-items-center py-10 text-center">
        <div>
          <span className="mx-auto block size-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" aria-hidden="true" />
          <h1 className="mt-6 break-keep text-2xl font-black tracking-[-0.035em] text-slate-950">로그인을 마무리하고 있습니다</h1>
          <p className="mt-2 break-keep text-sm leading-6 text-slate-600">인증 정보와 사용자 프로필을 확인한 뒤 공간 현황으로 이동합니다.</p>
        </div>
      </section>
    </main>
  );
}

function buildOAuthFailureQuery(search: string): URLSearchParams | null {
  const callbackQuery = new URLSearchParams(search);
  if (!callbackQuery.has("error") && !callbackQuery.has("errorCode")) {
    return null;
  }
  const loginQuery = new URLSearchParams();
  ["error", "errorCode", "provider"].forEach((key) => {
    const value = callbackQuery.get(key);
    if (value) {
      loginQuery.set(key, value);
    }
  });
  return loginQuery;
}
