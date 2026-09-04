const INTERNAL_ORIGIN = "https://zeroq-service.internal";

export const OAUTH_NEXT_SESSION_KEY = "zeroq.service.oauth.next";

/** 외부 origin, callback 재진입, 제어문자를 거부해 로그인 후 이동을 내부 안전 경로로 제한한다. */
export function sanitizeAuthNextPath(value: string | null): string {
  if (!value) {
    return "/";
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) {
      return "/";
    }
    const resolved = new URL(decoded, INTERNAL_ORIGIN);
    if (resolved.origin !== INTERNAL_ORIGIN) {
      return "/";
    }
    if (resolved.pathname === "/login" || resolved.pathname.startsWith("/auth/callback")) {
      return "/";
    }
    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return "/";
  }
}

export function currentBrowserPath(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return sanitizeAuthNextPath(`${window.location.pathname}${window.location.search}`);
}

export function buildLoginPath(nextPath: string, expired = false): string {
  const query = new URLSearchParams();
  const safeNextPath = sanitizeAuthNextPath(nextPath);
  if (safeNextPath !== "/") {
    query.set("next", safeNextPath);
  }
  if (expired) {
    query.set("expired", "1");
  }
  const queryString = query.toString();
  return queryString ? `/login?${queryString}` : "/login";
}

/** OAuth provider 왕복 동안 현재 탭에서만 안전한 복귀 경로를 보존한다. */
export function rememberOAuthNextPath(nextPath: string): void {
  window.sessionStorage.setItem(OAUTH_NEXT_SESSION_KEY, sanitizeAuthNextPath(nextPath));
}

/** 저장한 OAuth 복귀 경로를 한 번 읽고 즉시 제거한다. */
export function consumeOAuthNextPath(): string {
  const nextPath = sanitizeAuthNextPath(window.sessionStorage.getItem(OAUTH_NEXT_SESSION_KEY));
  window.sessionStorage.removeItem(OAUTH_NEXT_SESSION_KEY);
  return nextPath;
}
