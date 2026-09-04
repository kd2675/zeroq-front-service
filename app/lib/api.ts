import type { ResponseEnvelope } from "@/app/types/response";

const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? "direct";
const DEFAULT_GATEWAY_API_BASE = "http://localhost:8080";
const DEFAULT_DIRECT_ZEROQ_API_BASE = "http://localhost:20180";
const DEFAULT_DIRECT_AUTH_API_BASE = "http://localhost:9000";

export const IS_GATEWAY_MODE = API_MODE === "gateway";

export const API_BASE =
  process.env.NEXT_PUBLIC_ZEROQ_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (IS_GATEWAY_MODE ? DEFAULT_GATEWAY_API_BASE : DEFAULT_DIRECT_ZEROQ_API_BASE);
export const AUTH_API_BASE =
  process.env.NEXT_PUBLIC_AUTH_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (IS_GATEWAY_MODE ? DEFAULT_GATEWAY_API_BASE : DEFAULT_DIRECT_AUTH_API_BASE);
export const ZEROQ_CLIENT_ID =
  process.env.NEXT_PUBLIC_CLIENT_ID ?? "zeroq-front-service";
const REQUEST_TIMEOUT_MS = 15_000;

export type ApiResult<T> = {
  ok: boolean;
  status?: number;
  data: T | null;
  message?: string;
  code?: string | number;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  baseUrl?: string;
};

function isEnvelope<T>(value: unknown): value is ResponseEnvelope<T> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.success === "boolean" &&
    (typeof record.code === "number" || typeof record.code === "string") &&
    typeof record.message === "string"
  );
}

function parseResponseBody(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * ZeroQ 또는 Auth API의 공통 응답 envelope와 일반 JSON을 모두 해석하고
 * 15초 timeout·network 오류를 사용자가 이해할 수 있는 결과로 변환한다.
 */
async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const method = options.method ?? "GET";
  const hasBody = options.body !== undefined;
  const baseUrl = options.baseUrl ?? API_BASE;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
      credentials: options.credentials ?? "include",
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: abortController.signal,
    });

    const text = await response.text();
    const parsed = parseResponseBody(text);

    if (isEnvelope<T>(parsed)) {
      if (response.ok && parsed.success) {
        return {
          ok: true,
          status: response.status,
          data: parsed.data ?? null,
          message: parsed.message,
          code: parsed.code,
        };
      }
      return {
        ok: false,
        status: response.status,
        data: null,
        message: parsed.message,
        code: parsed.code,
      };
    }

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        data: (parsed as T) ?? null,
      };
    }

    return {
      ok: false,
      status: response.status,
      data: null,
      message:
        (typeof parsed === "string" && parsed.trim()) ||
        response.statusText ||
        "요청 처리에 실패했습니다.",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        data: null,
        message: "요청 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
      };
    }
    if (error instanceof Error) {
      return {
        ok: false,
        data: null,
        message: error instanceof TypeError
          ? "서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요."
          : error.message,
      };
    }

    return {
      ok: false,
      data: null,
      message: "알 수 없는 네트워크 오류가 발생했습니다.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** ZeroQ API에 JSON POST 요청을 보낸다. */
export function postJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, { method: "POST", body, headers });
}

/** 로그인·회원가입·refresh·logout 요청을 분리된 인증 서버로 보낸다. */
export function postAuthJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, {
    method: "POST",
    body,
    headers,
    baseUrl: AUTH_API_BASE,
  });
}

/** body와 불필요한 Content-Type 없이 ZeroQ GET 요청을 보낸다. */
export function getJson<T>(
  path: string,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, { method: "GET", headers });
}

/** ZeroQ API에 전체 갱신 성격의 JSON PUT 요청을 보낸다. */
export function putJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, { method: "PUT", body, headers });
}

/** ZeroQ API에 부분 갱신 성격의 JSON PATCH 요청을 보낸다. */
export function patchJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, { method: "PATCH", body, headers });
}
