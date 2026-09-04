import {
  IS_GATEWAY_MODE,
  postAuthJson,
  ZEROQ_CLIENT_ID,
} from "@/app/lib/api";
import { emitAuthChanged, emitAuthExpired } from "@/app/lib/authEvents";
import type { LoginResponse, AuthUser } from "@/app/types/auth";

const TOKEN_EXPIRY_LEEWAY_SECONDS = 300;
let accessTokenMemory: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let bootstrapRefreshDone = false;
let bootstrapRefreshInFlight: Promise<string | null> | null = null;
let authGeneration = 0;
let explicitlySignedOut = false;

export type AuthActionResult = {
  ok: boolean;
  message?: string;
  token?: string;
  user?: AuthUser | null;
};

function withClientId(
  headers: Record<string, string> = {},
): Record<string, string> {
  return {
    "X-Client-Id": ZEROQ_CLIENT_ID,
    ...headers,
  };
}

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

/** access token을 브라우저 저장소가 아닌 현재 탭 메모리에만 보관하고 구독자에게 알린다. */
export function setAccessToken(token: string): void {
  accessTokenMemory = token;
  explicitlySignedOut = false;
  bootstrapRefreshDone = false;
  authGeneration += 1;
  emitAuthChanged();
}

/** 메모리 토큰과 bootstrap 상태를 초기화해 다음 세션 복구를 허용한다. */
export function clearAccessToken(): void {
  accessTokenMemory = null;
  bootstrapRefreshDone = false;
  bootstrapRefreshInFlight = null;
  authGeneration += 1;
  emitAuthChanged();
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** 검증 용도가 아니라 UI 역할·표시용으로 JWT payload의 사용자 claim만 안전하게 해석한다. */
export function getUserFromToken(token?: string | null): AuthUser | null {
  const rawToken = token ?? getAccessToken();
  if (!rawToken) {
    return null;
  }

  const parts = rawToken.split(".");
  if (parts.length < 2) {
    return null;
  }

  const payload = decodeBase64Url(parts[1]);
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const rawUserKey = parsed.userKey;
    const userKey = typeof rawUserKey === "string" ? rawUserKey : undefined;

    return {
      username: typeof parsed.sub === "string" ? parsed.sub : undefined,
      userKey,
      role: typeof parsed.role === "string" ? parsed.role : undefined,
      exp: typeof parsed.exp === "number" ? parsed.exp : undefined,
    };
  } catch {
    return null;
  }
}

export function normalizeRole(role?: string | null): string | null {
  if (!role) {
    return null;
  }
  const normalized = role.trim().toUpperCase();
  return normalized.startsWith("ROLE_") ? normalized.slice(5) : normalized;
}

export function isUserRole(role?: string | null): boolean {
  return normalizeRole(role) === "USER";
}

/**
 * Gateway 모드에는 Bearer token만 보내고, 로컬 직결 모드에는 gateway가 주입하던
 * 사용자 식별 헤더를 token claim에서 함께 구성한다.
 */
export function buildServiceAuthHeaders(token: string): Record<string, string> {
  const user = IS_GATEWAY_MODE ? null : getUserFromToken(token);

  return {
    Authorization: `Bearer ${token}`,
    ...(user?.username
      ? { "X-User-Name": encodeURIComponent(user.username) }
      : {}),
    ...(user?.userKey ? { "X-User-Key": user.userKey } : {}),
    ...(user?.role ? { "X-User-Role": user.role } : {}),
  };
}

export function isTokenExpired(
  exp?: number,
  leewaySeconds = TOKEN_EXPIRY_LEEWAY_SECONDS,
): boolean {
  if (!exp) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return exp <= now + leewaySeconds;
}

export function scheduleTokenExpiry(
  onExpire: () => void,
  exp?: number,
  leewaySeconds = TOKEN_EXPIRY_LEEWAY_SECONDS,
): () => void {
  if (!exp) {
    return () => undefined;
  }
  const now = Math.floor(Date.now() / 1000);
  const delayMs = Math.max((exp - now - leewaySeconds) * 1000, 0);
  const timeoutId = window.setTimeout(onExpire, delayMs);
  return () => window.clearTimeout(timeoutId);
}

export type AuthExpireReason = "expired" | "refresh_failed";

export function notifyAuthExpired(reason: AuthExpireReason = "expired"): void {
  emitAuthExpired(reason);
}

/** 로컬 로그인 후 access token은 메모리에 두고 refresh token은 서버의 HttpOnly cookie에 맡긴다. */
export async function login(username: string, password: string): Promise<AuthActionResult> {
  const result = await postAuthJson<LoginResponse>(
    "/auth/login",
    { username, password },
    withClientId(),
  );
  if (!result.ok || !result.data?.accessToken) {
    return { ok: false, message: result.message ?? "로그인에 실패했습니다." };
  }
  setAccessToken(result.data.accessToken);
  return {
    ok: true,
    message: result.message,
    token: result.data.accessToken,
    user: getUserFromToken(result.data.accessToken),
  };
}

/** 일반 사용자 가입만 허용하도록 USER 역할을 명시해 auth 사용자 생성 API를 호출한다. */
export async function signup(username: string, password: string, email: string): Promise<AuthActionResult> {
  const result = await postAuthJson<unknown>(
    "/api/users",
    { username, password, email, role: "USER" },
    withClientId(),
  );
  return { ok: result.ok, message: result.message };
}

/** 진행 중 refresh가 로그아웃 뒤 토큰을 되살리지 못하도록 generation을 올린 후 서버 세션을 폐기한다. */
export async function logout(): Promise<void> {
  explicitlySignedOut = true;
  authGeneration += 1;
  try {
    await postAuthJson<void>("/auth/logout", {}, withClientId());
  } finally {
    accessTokenMemory = null;
    bootstrapRefreshDone = true;
    bootstrapRefreshInFlight = null;
    emitAuthChanged();
  }
}

/** HttpOnly cookie로 새 access token을 요청하고 요청 중 인증 세대가 바뀌지 않았을 때만 적용한다. */
async function requestRefreshAccessToken(): Promise<string | null> {
  const requestGeneration = authGeneration;
  const result = await postAuthJson<LoginResponse>(
    "/auth/refresh",
    {},
    withClientId(),
  );
  if (!result.ok || !result.data?.accessToken) {
    return null;
  }
  if (requestGeneration !== authGeneration || explicitlySignedOut) {
    return null;
  }

  setAccessToken(result.data.accessToken);
  return result.data.accessToken;
}

/** 동시에 발생한 refresh 요청을 하나의 Promise로 합친다. */
export async function refreshAccessToken(): Promise<string | null> {
  if (explicitlySignedOut) {
    return null;
  }
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = requestRefreshAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** 페이지 진입 시 refresh cookie 기반 복구를 한 번만 수행한다. */
export async function bootstrapAccessToken(): Promise<string | null> {
  if (accessTokenMemory) {
    return accessTokenMemory;
  }
  if (explicitlySignedOut) {
    return null;
  }
  if (bootstrapRefreshDone) {
    return null;
  }
  if (bootstrapRefreshInFlight) {
    return bootstrapRefreshInFlight;
  }

  bootstrapRefreshInFlight = refreshAccessToken().finally(() => {
    bootstrapRefreshDone = true;
    bootstrapRefreshInFlight = null;
  });
  return bootstrapRefreshInFlight;
}

/** 메모리 토큰을 우선 반환하고 없을 때만 bootstrap 복구를 시도한다. */
export async function ensureAccessToken(): Promise<string | null> {
  if (accessTokenMemory) {
    return accessTokenMemory;
  }
  return bootstrapAccessToken();
}
