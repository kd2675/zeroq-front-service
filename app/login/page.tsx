"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";

import BrandMark from "@/app/components/BrandMark";
import UiIcon from "@/app/components/UiIcon";
import useAuthSession from "@/app/hooks/useAuthSession";
import { isUserRole, login, logout, signup } from "@/app/lib/auth";
import { AUTH_API_BASE } from "@/app/lib/api";
import { rememberOAuthNextPath, sanitizeAuthNextPath } from "@/app/lib/authRouting";
import { initializeProfile } from "@/app/lib/profile";

type LoginMode = "login" | "signup";

/** 아이디 로그인·회원가입과 Naver/Kakao OAuth 진입을 한 화면에서 처리한다. */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authStatus, isHydrated, user } = useAuthSession();
  const [mode, setMode] = useState<LoginMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = useMemo(
    () => sanitizeAuthNextPath(searchParams.get("next")),
    [searchParams],
  );
  const queryMessage = resolveQueryMessage(searchParams);
  const hasAuthMessage = Boolean(queryMessage || message);

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

  /** OAuth 왕복 뒤 복귀할 내부 경로를 보존하고 설정된 Auth authorize 경로로 이동한다. */
  const startOAuthLogin = (provider: "naver-zeroq-service" | "kakao-zeroq-service") => {
    setIsSubmitting(true);
    setMessage(null);
    rememberOAuthNextPath(nextPath);
    window.location.replace(`${AUTH_API_BASE}/oauth2/authorize/${provider}`);
  };

  if (!isHydrated || authStatus === "unknown" || (authStatus === "in" && !isSubmitting)) {
    return <LoginProgress />;
  }

  return (
    <main className="min-h-dvh bg-[var(--canvas)] px-5 py-6 text-slate-950 sm:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <BrandMark href="/" />
      </div>
      <section className="mx-auto grid min-h-[calc(100dvh-5.25rem)] w-full max-w-7xl items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20">
        <motion.div className="order-2 max-w-2xl lg:order-1" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}>
          <p className="eyebrow">Space, before you go</p>
          <h1 className="mt-4 break-keep text-4xl font-black leading-[1.07] tracking-[-0.055em] sm:text-6xl">
            혼잡도를 확인하고<br />움직이세요
          </h1>
          <p className="mt-6 max-w-xl break-keep text-base leading-7 text-slate-600">
            로그인하면 운영 확인이 끝난 공간의 최근 센서 현황을 볼 수 있습니다. 데이터가 부족한 공간은 한산하다고 표시하지 않습니다.
          </p>
          <ul className="mt-8 grid max-w-xl gap-4 border-y border-slate-200 py-5 sm:grid-cols-3">
            <LoginBenefit title="빠른 비교" description="혼잡도 낮은 순으로 확인" />
            <LoginBenefit title="투명한 상태" description="일부 보고와 측정 공백 구분" />
            <LoginBenefit title="선택적 위치" description="기기 안에서만 거리 계산" />
          </ul>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
          noValidate
          className="order-1 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.09)] sm:p-6 lg:order-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="인증 방식">
            {(["login", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={item === mode}
                onClick={() => {
                  setMode(item);
                  setMessage(null);
                }}
                className={item === mode
                  ? "focus-ring min-h-11 rounded-[10px] bg-white px-3 text-sm font-black text-slate-950 shadow-sm"
                  : "focus-ring min-h-11 rounded-[10px] px-3 text-sm font-bold text-slate-500 transition hover:text-slate-800"}
              >
                {item === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-black tracking-[-0.035em] text-slate-950">
              {mode === "login" ? "다시 오셨군요" : "ZeroQ 시작하기"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login" ? "계정 정보를 입력해 주세요." : "가입 후 바로 공간 현황으로 이동합니다."}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <LoginField label="아이디" name="username" value={username} onChange={setUsername} autoComplete="username" describedBy={hasAuthMessage ? "auth-message" : undefined} />
            {mode === "signup" ? (
              <LoginField label="이메일" name="email" value={email} onChange={setEmail} type="email" autoComplete="email" describedBy={hasAuthMessage ? "auth-message" : undefined} />
            ) : null}
            <LoginField
              label="비밀번호"
              name="password"
              value={password}
              onChange={setPassword}
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              describedBy={hasAuthMessage ? "auth-message" : undefined}
              passwordVisible={showPassword}
              onTogglePassword={() => setShowPassword((current) => !current)}
            />
          </div>

          {queryMessage || message ? (
            <p id="auth-message" role="alert" aria-live="polite" className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold leading-5 text-rose-700">
              {message ?? queryMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="focus-ring mt-5 min-h-12 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "처리 중" : mode === "login" ? "ZeroQ 로그인" : "가입 후 시작"}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            소셜 계정으로 계속
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-2">
            <SocialButton label="네이버로 계속" tone="naver" disabled={isSubmitting} onClick={() => startOAuthLogin("naver-zeroq-service")} />
            <SocialButton label="카카오로 계속" tone="kakao" disabled={isSubmitting} onClick={() => startOAuthLogin("kakao-zeroq-service")} />
          </div>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">소셜 로그인은 각 제공자의 인증 화면으로 이동합니다.</p>
        </motion.form>
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
  describedBy,
  passwordVisible,
  onTogglePassword,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  describedBy?: string;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <span className="relative mt-1.5 block">
        <input
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          maxLength={255}
          required
          aria-describedby={describedBy}
          className={`focus-ring min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-blue-600 ${onTogglePassword ? "pr-12" : ""}`}
        />
        {onTogglePassword ? (
          <button
            type="button"
            onClick={onTogglePassword}
            className="focus-ring absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={passwordVisible ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            <UiIcon name={passwordVisible ? "eye-off" : "eye"} className="size-5" />
          </button>
        ) : null}
      </span>
    </label>
  );
}

function SocialButton({ label, tone, disabled, onClick }: { label: string; tone: "naver" | "kakao"; disabled: boolean; onClick: () => void }) {
  const className = tone === "naver"
    ? "bg-[#03c75a] text-white hover:brightness-95"
    : "bg-[#fee500] text-[#191919] hover:brightness-95";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`focus-ring min-h-12 rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-wait disabled:opacity-60 ${className}`}>
      {label}
    </button>
  );
}

function LoginBenefit({ title, description }: { title: string; description: string }) {
  return (
    <li>
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 break-keep text-xs leading-5 text-slate-500">{description}</p>
    </li>
  );
}

function LoginProgress() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--canvas)] px-5" aria-live="polite">
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

/** `/login` route. query 기반 만료·OAuth 오류 메시지를 Suspense 경계 안에서 해석한다. */
export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[var(--canvas)]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
