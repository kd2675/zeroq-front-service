import type { ResponseEnvelope } from "@/app/types/response";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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

async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const method = options.method ?? "GET";

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      credentials: options.credentials ?? "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
    if (error instanceof Error) {
      return {
        ok: false,
        data: null,
        message: error.message,
      };
    }

    return {
      ok: false,
      data: null,
      message: "알 수 없는 네트워크 오류가 발생했습니다.",
    };
  }
}

export function postJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, { method: "POST", body, headers });
}

export function getJson<T>(
  path: string,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, { method: "GET", headers });
}

export function putJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, { method: "PUT", body, headers });
}

export function patchJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  return requestJson(path, { method: "PATCH", body, headers });
}
