export type ExploreView = "MAP" | "LIST";

export type AppPreferences = {
  autoRefresh: boolean;
  defaultExploreView: ExploreView;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  autoRefresh: true,
  defaultExploreView: "MAP",
};

const PREFERENCE_STORAGE_KEY = "zeroq:user-preferences:v1";
export const PREFERENCES_CHANGED_EVENT = "zeroq:preferences-changed";

function isExploreView(value: unknown): value is ExploreView {
  return value === "MAP" || value === "LIST";
}

/** 브라우저에만 저장된 표시 환경설정을 손상된 값에 안전하게 복구해 읽는다. */
export function readAppPreferences(): AppPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_APP_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_APP_PREFERENCES;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      autoRefresh:
        typeof parsed.autoRefresh === "boolean"
          ? parsed.autoRefresh
          : DEFAULT_APP_PREFERENCES.autoRefresh,
      defaultExploreView: isExploreView(parsed.defaultExploreView)
        ? parsed.defaultExploreView
        : DEFAULT_APP_PREFERENCES.defaultExploreView,
    };
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

/** 표시 환경설정을 이 기기에 저장하고 같은 탭의 구독 화면에 변경을 알린다. */
export function writeAppPreferences(preferences: AppPreferences): void {
  window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGED_EVENT));
}
