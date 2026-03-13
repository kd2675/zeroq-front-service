'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  bootstrapAccessToken,
  clearAccessToken,
  getUserFromToken,
  isUserRole,
  setAccessToken,
} from '@/app/lib/auth';
import { initializeProfile } from '@/app/lib/profile';

const GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const expired = searchParams.get("expired") === "1";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = searchParams.get('token');
      if (token) {
        setAccessToken(token);
        const user = getUserFromToken(token);
        if (!isUserRole(user?.role)) {
          clearAccessToken();
          setError('zeroq-front-service는 USER 계정만 로그인할 수 있습니다.');
          return;
        }
        const initializeResult = await initializeProfile(token);
        if (cancelled) {
          return;
        }
        if (initializeResult.error) {
          clearAccessToken();
          setError(`프로필 생성에 실패했습니다. (${initializeResult.error})`);
          return;
        }
        router.replace('/');
        return;
      }

      const restoredToken = await bootstrapAccessToken();
      if (cancelled || !restoredToken) {
        return;
      }

      const restoredUser = getUserFromToken(restoredToken);
      if (!isUserRole(restoredUser?.role)) {
        clearAccessToken();
        setError('zeroq-front-service는 USER 계정만 로그인할 수 있습니다.');
        return;
      }

      router.replace('/');
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  const handleNaverLogin = () => {
    window.location.href = `${GATEWAY_BASE_URL}/oauth2/authorize/naver-zeroq-service`;
  };

  const handleKakaoLogin = () => {
    window.location.href = `${GATEWAY_BASE_URL}/oauth2/authorize/kakao-zeroq-service`;
  };

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
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <LoginPageContent />
    </Suspense>
  );
}
