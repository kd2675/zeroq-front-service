'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  clearAccessToken,
  getAccessToken,
  getUserFromToken,
  isTokenExpired,
  refreshAccessToken,
  setAccessToken,
} from '@/app/lib/auth';

const GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const expired = searchParams.get("expired") === "1";

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = searchParams.get('token');
      if (token) {
        setAccessToken(token);
        router.replace('/');
        return;
      }

      const existingToken = getAccessToken();
      if (!existingToken) {
        return;
      }

      const existingUser = getUserFromToken(existingToken);
      if (existingUser?.exp && isTokenExpired(existingUser.exp)) {
        const refreshedToken = await refreshAccessToken();
        if (cancelled) {
          return;
        }
        if (refreshedToken) {
          router.replace('/');
          return;
        }
        clearAccessToken();
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
    window.location.href = `${GATEWAY_BASE_URL}/oauth2/authorize/naver`;
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
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>

        {expired ? (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm text-blue-700">
            세션이 만료되었습니다. 다시 로그인해 주세요.
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
