import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  AvailabilityFilter,
  SpaceSort,
  UserCoordinates,
} from "@/app/types/space";

type LocationState = "idle" | "loading" | "ready" | "error";

type ExploreState = {
  query: string;
  availabilityFilter: AvailabilityFilter;
  sort: SpaceSort;
  selectedSpaceId: number | null;
  userCoordinates: UserCoordinates | null;
  locationState: LocationState;
  locationMessage: string | null;
};

const initialState: ExploreState = {
  query: "",
  availabilityFilter: "ALL",
  sort: "QUIETEST",
  selectedSpaceId: null,
  userCoordinates: null,
  locationState: "idle",
  locationMessage: null,
};

const exploreSlice = createSlice({
  name: "explore",
  initialState,
  reducers: {
    setExploreQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setAvailabilityFilter(state, action: PayloadAction<AvailabilityFilter>) {
      state.availabilityFilter = action.payload;
    },
    setSpaceSort(state, action: PayloadAction<SpaceSort>) {
      state.sort = action.payload;
    },
    setSelectedSpaceId(state, action: PayloadAction<number | null>) {
      state.selectedSpaceId = action.payload;
    },
    locationRequested(state) {
      state.locationState = "loading";
      state.locationMessage = "현재 위치를 확인하고 있습니다.";
    },
    locationResolved(state, action: PayloadAction<UserCoordinates>) {
      state.userCoordinates = action.payload;
      state.locationState = "ready";
      state.locationMessage = "현재 위치 기준 직선거리로 정렬했습니다. 위치는 서버로 전송하지 않습니다.";
      state.sort = "NEAREST";
    },
    locationRejected(state, action: PayloadAction<string>) {
      state.locationState = "error";
      state.locationMessage = action.payload;
    },
    resetExploreSession() {
      return initialState;
    },
  },
});

export const {
  setExploreQuery,
  setAvailabilityFilter,
  setSpaceSort,
  setSelectedSpaceId,
  locationRequested,
  locationResolved,
  locationRejected,
  resetExploreSession,
} = exploreSlice.actions;
export default exploreSlice.reducer;
