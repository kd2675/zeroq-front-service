"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";

import { readAppPreferences, writeAppPreferences } from "@/app/lib/preferences";
import { hydratePreferences } from "@/lib/features/preferences/preferencesSlice";
import { makeStore, type AppStore } from "@/lib/store";

/** 요청별 Redux store를 만들고 브라우저 환경설정만 localStorage와 동기화한다. */
export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState<AppStore>(makeStore);

  useEffect(() => {
    store.dispatch(hydratePreferences(readAppPreferences()));
    let previousValue = "";
    return store.subscribe(() => {
      const state = store.getState().preferences;
      if (state.hydrated) {
        const nextPreferences = {
          autoRefresh: state.autoRefresh,
          defaultExploreView: state.defaultExploreView,
        };
        const nextValue = JSON.stringify(nextPreferences);
        if (nextValue !== previousValue) {
          previousValue = nextValue;
          writeAppPreferences(nextPreferences);
        }
      }
    });
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
