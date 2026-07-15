'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  isUserRole,
  logout,
} from '@/app/lib/auth';
import useAuthSession from '@/app/hooks/useAuthSession';
import { consumeOAuthNextPath, rememberOAuthNextPath } from '@/app/lib/authRouting';

const GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const expired = searchParams.get("expired") === "1";
  const oauthError = searchParams.get("error");
  const loginError = searchParams.get("loginError");
  const [error, setError] = useState<string | null>(null);
  const { authStatus, isHydrated, user } = useAuthSession();
  const queryError = oauthError || loginError ? resolveLoginError(loginError) : null;
  const isProcessing = !queryError && (!isHydrated || authStatus === "unknown" || authStatus === "in");

  useEffect(() => {
    if (queryError) {
      return;
    }
    if (!isHydrated || authStatus === "unknown" || authStatus === "out") {
      return;
    }
    if (!isUserRole(user?.role)) {
      void logout().finally(() => {
        setError("ZeroQ 서비스는 USER 계정만 로그인할 수 있습니다.");
      });
      return;
    }
    router.replace(consumeOAuthNextPath());
  }, [authStatus, isHydrated, queryError, router, user?.role]);

  const handleNaverLogin = () => {
    rememberOAuthNextPath("/");
    window.location.replace(`${GATEWAY_BASE_URL}/oauth2/authorize/naver-zeroq-service`);
  };

  const handleKakaoLogin = () => {
    rememberOAuthNextPath("/");
    window.location.replace(`${GATEWAY_BASE_URL}/oauth2/authorize/kakao-zeroq-service`);
  };

  if (isProcessing) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-50 px-4 dark:bg-gray-900" aria-live="polite">
        <section className="text-center">
          <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" aria-hidden="true" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">로그인 상태를 확인하고 있습니다.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800 md:p-10">
        
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome to ZeroQ
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to continue to your dashboard
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Continue with
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleNaverLogin}
            className="group relative flex w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-[#03C75A] py-3 px-4 text-lg font-semibold text-white transition-all duration-300 ease-in-out hover:bg-[#03C75A]/90 focus:outline-none focus:ring-2 focus:ring-[#03C75A] focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <Image
              src="/naver_logo.svg"
              alt="Naver Logo"
              width={24}
              height={24}
              className="transition-transform duration-300 group-hover:scale-110"
            />
            <span>Login with Naver</span>
          </button>
          <button
            onClick={handleKakaoLogin}
            className="group relative flex w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-[#FEE500] py-3 px-4 text-lg font-semibold text-[#191919] transition-all duration-300 ease-in-out hover:bg-[#FEE500]/90 focus:outline-none focus:ring-2 focus:ring-[#FEE500] focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <span>Login with Kakao</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>

        {expired ? (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm text-blue-700">
            세션이 만료되었습니다. 다시 로그인해 주세요.
          </p>
        ) : null}
        {error ?? queryError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error ?? queryError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function resolveLoginError(loginError: string | null): string {
  switch (loginError) {
    case "unsupported_role":
      return "ZeroQ 서비스는 USER 계정만 로그인할 수 있습니다.";
    case "profile_initialize_failed":
      return "프로필을 준비하지 못했습니다. 다시 로그인해 주세요.";
    case "session_restore_failed":
      return "소셜 로그인 세션을 확인할 수 없습니다. 다시 시도해 주세요.";
    case "processing_failed":
      return "로그인 정보를 처리하는 중 문제가 발생했습니다. 다시 시도해 주세요.";
    default:
      return "소셜 로그인에 실패했습니다. 다시 시도해 주세요.";
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <LoginPageContent />
    </Suspense>
  );
}
