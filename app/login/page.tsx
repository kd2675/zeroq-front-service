"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import useAuthSession from "@/app/hooks/useAuthSession";
import { isUserRole, login, logout, signup } from "@/app/lib/auth";
import { API_BASE } from "@/app/lib/api";
import { rememberOAuthNextPath, sanitizeAuthNextPath } from "@/app/lib/authRouting";
import { initializeProfile } from "@/app/lib/profile";

type LoginMode = "login" | "signup";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authStatus, isHydrated, user } = useAuthSession();
  const [mode, setMode] = useState<LoginMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = useMemo(
    () => sanitizeAuthNextPath(searchParams.get("next")),
    [searchParams],
  );
  const queryMessage = resolveQueryMessage(searchParams);

  useEffect(() => {
    if (isSubmitting || !isHydrated || authStatus === "unknown" || authStatus === "out") {
      return;
    }
    if (!isUserRole(user?.role)) {
      void logout().finally(() => setMessage("ZeroQ 서비스는 USER 계정만 로그인할 수 있습니다."));
      return;
    }
    router.replace(nextPath);
  }, [authStatus, isHydrated, isSubmitting, nextPath, router, user?.role]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim();
    const validationMessage = validateForm(mode, normalizedUsername, password, normalizedEmail);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const signupResult = await signup(normalizedUsername, password, normalizedEmail);
        if (!signupResult.ok) {
          setMessage(signupResult.message ?? "회원가입에 실패했습니다. 입력값 또는 중복 계정을 확인해 주세요.");
          return;
        }
      }

      const loginResult = await login(normalizedUsername, password);
      if (!loginResult.ok || !loginResult.token) {
        setMessage(loginResult.message ?? "로그인에 실패했습니다.");
        return;
      }
      if (!isUserRole(loginResult.user?.role)) {
        await logout();
        setMessage("ZeroQ 서비스는 USER 계정만 로그인할 수 있습니다.");
        return;
      }

      const profileResult = await initializeProfile(loginResult.token);
      if (profileResult.error) {
        await logout();
        setMessage("프로필을 준비하지 못했습니다. 다시 로그인해 주세요.");
        return;
      }
      router.replace(nextPath);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOAuthLogin = (provider: "naver-zeroq-service" | "kakao-zeroq-service") => {
    rememberOAuthNextPath(nextPath);
    window.location.replace(`${API_BASE}/oauth2/authorize/${provider}`);
  };

  if (!isHydrated || authStatus === "unknown" || (authStatus === "in" && !isSubmitting)) {
    return <LoginProgress />;
  }

  return (
    <main className="min-h-screen bg-[#f3f7fb] px-5 py-8 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="text-xs font-black tracking-[0.22em] text-blue-700">ZEROQ LIVE SPACE</p>
          <h1 className="mt-4 break-keep text-4xl font-black leading-[1.08] tracking-[-0.04em] md:text-6xl">
            기다림보다 먼저 보는
            <br />실시간 공간 흐름
          </h1>
          <p className="mt-6 max-w-xl break-keep text-base leading-7 text-slate-600">
            로그인하면 공간별 센서가 집계한 점유율과 혼잡도를 한 화면에서 확인할 수 있습니다.
            새 계정은 가입 직후 ZeroQ 프로필까지 자동으로 준비됩니다.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              ["LIVE", "센서 스냅샷"],
              ["SAFE", "보호된 세션"],
              ["RETURN", "이전 화면 복귀"],
            ].map(([label, description]) => (
              <div key={label} className="border-l-2 border-blue-600 pl-3">
                <p className="text-xs font-black text-blue-700">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(28,57,90,0.10)]"
        >
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            {(["login", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setMessage(null);
                }}
                className={item === mode
                  ? "rounded-md bg-white px-3 py-2.5 text-sm font-black text-slate-950 shadow-sm"
                  : "rounded-md px-3 py-2.5 text-sm font-bold text-slate-500"}
              >
                {item === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <LoginField label="아이디" name="username" value={username} onChange={setUsername} autoComplete="username" />
            {mode === "signup" ? (
              <LoginField label="이메일" name="email" value={email} onChange={setEmail} type="email" autoComplete="email" />
            ) : null}
            <LoginField
              label="비밀번호"
              name="password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {queryMessage || message ? (
            <p role="alert" aria-live="polite" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
              {message ?? queryMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 min-h-12 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "처리 중" : mode === "login" ? "ZeroQ 로그인" : "가입 후 시작"}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            소셜 계정으로 계속
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-2">
            <SocialButton label="네이버로 계속" tone="naver" onClick={() => startOAuthLogin("naver-zeroq-service")} />
            <SocialButton label="카카오로 계속" tone="kakao" onClick={() => startOAuthLogin("kakao-zeroq-service")} />
          </div>
        </form>
      </section>
    </main>
  );
}

function LoginField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        maxLength={255}
        className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
      />
    </label>
  );
}

function SocialButton({ label, tone, onClick }: { label: string; tone: "naver" | "kakao"; onClick: () => void }) {
  const className = tone === "naver"
    ? "bg-[#03c75a] text-white hover:brightness-95"
    : "bg-[#fee500] text-[#191919] hover:brightness-95";
  return (
    <button type="button" onClick={onClick} className={`min-h-12 rounded-lg px-4 py-3 text-sm font-black ${className}`}>
      {label}
    </button>
  );
}

function LoginProgress() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f7fb] px-5" aria-live="polite">
      <section className="text-center">
        <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-slate-600">로그인 상태를 확인하고 있습니다.</p>
      </section>
    </main>
  );
}

function validateForm(mode: LoginMode, username: string, password: string, email: string): string | null {
  if (!username) {
    return "아이디를 입력해 주세요.";
  }
  if (!password) {
    return "비밀번호를 입력해 주세요.";
  }
  if (mode === "signup" && !/^\S+@\S+\.\S+$/.test(email)) {
    return "올바른 이메일을 입력해 주세요.";
  }
  return null;
}

function resolveQueryMessage(searchParams: URLSearchParams): string | null {
  if (searchParams.get("expired") === "1") {
    return "세션이 만료되었습니다. 다시 로그인해 주세요.";
  }
  const errorCode = searchParams.get("errorCode");
  const provider = searchParams.get("provider")?.trim().toUpperCase();
  if (errorCode === "oauth_provider_mismatch") {
    const providerLabel = provider === "NAVER" ? "네이버" : provider === "KAKAO" ? "카카오" : "기존 소셜 계정";
    return `${providerLabel} 로그인으로 다시 시도해 주세요.`;
  }
  if (errorCode === "oauth_email_missing") {
    return "소셜 계정의 이메일 제공 동의가 필요합니다.";
  }
  if (errorCode === "oauth_provider_unsupported") {
    return "지원하지 않는 소셜 로그인 방식입니다.";
  }
  switch (searchParams.get("loginError")) {
    case "unsupported_role":
      return "ZeroQ 서비스는 USER 계정만 로그인할 수 있습니다.";
    case "profile_initialize_failed":
      return "프로필을 준비하지 못했습니다. 다시 로그인해 주세요.";
    case "session_restore_failed":
      return "소셜 로그인 세션을 확인할 수 없습니다. 다시 시도해 주세요.";
    case "processing_failed":
      return "로그인 정보를 처리하는 중 문제가 발생했습니다. 다시 시도해 주세요.";
    default:
      return searchParams.get("error") ? "소셜 로그인에 실패했습니다. 다시 시도해 주세요." : null;
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f3f7fb]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
