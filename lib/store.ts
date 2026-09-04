import { configureStore } from "@reduxjs/toolkit";

import preferencesReducer from "@/lib/features/preferences/preferencesSlice";
import exploreReducer from "@/lib/features/explore/exploreSlice";

/** App Router 요청 간 상태 공유를 피하도록 호출마다 새 Redux store를 만든다. */
export const makeStore = () => configureStore({
  reducer: {
    explore: exploreReducer,
    preferences: preferencesReducer,
  },
});

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
