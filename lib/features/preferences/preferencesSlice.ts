import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
  type ExploreView,
} from "@/app/lib/preferences";

export type PreferencesState = AppPreferences & {
  hydrated: boolean;
  exploreView: ExploreView;
};

const initialState: PreferencesState = {
  ...DEFAULT_APP_PREFERENCES,
  hydrated: false,
  exploreView: DEFAULT_APP_PREFERENCES.defaultExploreView,
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    hydratePreferences(state, action: PayloadAction<AppPreferences>) {
      state.autoRefresh = action.payload.autoRefresh;
      state.defaultExploreView = action.payload.defaultExploreView;
      state.exploreView = action.payload.defaultExploreView;
      state.hydrated = true;
    },
    replacePreferences(state, action: PayloadAction<AppPreferences>) {
      state.autoRefresh = action.payload.autoRefresh;
      state.defaultExploreView = action.payload.defaultExploreView;
      state.exploreView = action.payload.defaultExploreView;
    },
    setExploreView(state, action: PayloadAction<ExploreView>) {
      state.exploreView = action.payload;
    },
  },
});

export const { hydratePreferences, replacePreferences, setExploreView } = preferencesSlice.actions;
export default preferencesSlice.reducer;
