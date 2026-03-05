import { postJson } from "@/app/lib/api";
import { emitAuthChanged, emitAuthExpired } from "@/app/lib/authEvents";
import type { LoginResponse, AuthUser } from "@/app/types/auth";

const ACCESS_TOKEN_KEY = "accessToken";
const TOKEN_EXPIRY_LEEWAY_SECONDS = 300;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  emitAuthChanged();
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  emitAuthChanged();
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

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
    const rawUserId = parsed.userId;
    const userId =
      typeof rawUserId === "number"
        ? rawUserId
        : typeof rawUserId === "string"
          ? Number(rawUserId)
          : undefined;

    return {
      username: typeof parsed.sub === "string" ? parsed.sub : undefined,
      userId: Number.isFinite(userId) ? userId : undefined,
      role: typeof parsed.role === "string" ? parsed.role : undefined,
      exp: typeof parsed.exp === "number" ? parsed.exp : undefined,
    };
  } catch {
    return null;
  }
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

export async function logout(): Promise<void> {
  const token = getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  await postJson<void>("/auth/logout", {}, headers);
}

export async function refreshAccessToken(): Promise<string | null> {
  const result = await postJson<LoginResponse>("/auth/refresh", {});
  if (!result.ok || !result.data?.accessToken) {
    return null;
  }

  setAccessToken(result.data.accessToken);
  return result.data.accessToken;
}
