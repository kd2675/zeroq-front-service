import { getJson, postJson } from "@/app/lib/api";
import { buildServiceAuthHeaders } from "@/app/lib/auth";

export type ProfileSummary = {
  profileId: number;
  userKey: string;
  displayName: string;
  tagline?: string;
  profileColor?: string;
};

export type ProfileInitializeResult = {
  data: ProfileSummary | null;
  error?: string;
};

/** 현재 로그인 사용자의 ZeroQ 프로필 표시 정보를 조회한다. */
export async function getProfileSummary(
  accessToken: string,
): Promise<ProfileInitializeResult> {
  const result = await getJson<ProfileSummary>(
    "/api/zeroq/v1/profile/summary",
    buildServiceAuthHeaders(accessToken),
  );

  if (!result.ok || !result.data) {
    return {
      data: null,
      error: result.message ?? "프로필을 불러오지 못했습니다.",
    };
  }

  return { data: result.data };
}

/** 로그인 계정을 ZeroQ 서비스 프로필에 멱등 연결하고 실패를 명시적 결과로 반환한다. */
export async function initializeProfile(
  accessToken: string,
): Promise<ProfileInitializeResult> {
  const result = await postJson<ProfileSummary>(
    "/api/zeroq/v1/profile/initialize",
    {},
    buildServiceAuthHeaders(accessToken),
  );

  if (!result.ok || !result.data) {
    return {
      data: null,
      error: result.message ?? "프로필 초기화에 실패했습니다.",
    };
  }

  return { data: result.data };
}
