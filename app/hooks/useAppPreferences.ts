"use client";

import type { AppPreferences } from "@/app/lib/preferences";
import { replacePreferences } from "@/lib/features/preferences/preferencesSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

/** 이 기기의 탐색 표시 환경설정을 읽고 저장소·동일 탭 변경을 동기화한다. */
export default function useAppPreferences() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((rootState) => rootState.preferences);
  const preferences: AppPreferences = {
    autoRefresh: state.autoRefresh,
    defaultExploreView: state.defaultExploreView,
  };

  const setPreferences = (next: AppPreferences) => {
    dispatch(replacePreferences(next));
  };

  return { preferences, setPreferences, isHydrated: state.hydrated };
}
