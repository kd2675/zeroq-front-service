import assert from "node:assert/strict";

import {
  distanceInKilometers,
  formatDistance,
  getCrowdPresentation,
  hasUsableOccupancy,
  matchesAvailabilityFilter,
  normalizedSearchText,
  parseServerUtcTimestamp,
} from "../app/lib/spacePresentation.ts";

const availableSnapshot = {
  occupancyRate: 25,
  crowdLevel: "LOW",
  activeSensorCount: 3,
  configuredSensorCount: 4,
  reportingSensorCount: 3,
  occupiedCount: 1,
  dataStatus: "PARTIAL",
  reportingCoveragePercent: 75,
};

assert.deepEqual(getCrowdPresentation("LOW"), { label: "여유", tone: "quiet" });
assert.deepEqual(getCrowdPresentation("unexpected"), { label: "확인 불가", tone: "unknown" });
assert.equal(hasUsableOccupancy(availableSnapshot), true);
assert.equal(hasUsableOccupancy({ ...availableSnapshot, dataStatus: "UNAVAILABLE" }), false);
assert.equal(hasUsableOccupancy({ ...availableSnapshot, occupancyRate: 101 }), false);
assert.equal(matchesAvailabilityFilter(availableSnapshot, false, "QUIET"), true);
assert.equal(matchesAvailabilityFilter(availableSnapshot, true, "UNKNOWN"), true);
assert.equal(matchesAvailabilityFilter({ ...availableSnapshot, crowdLevel: "NEW_LEVEL" }, false, "UNKNOWN"), true);

assert.equal(parseServerUtcTimestamp("2026-09-04T00:00:00")?.toISOString(), "2026-09-04T00:00:00.000Z");
assert.equal(parseServerUtcTimestamp("not-a-date"), null);
assert.equal(formatDistance(0.45), "450m");
assert.equal(formatDistance(1.24), "1.2km");
assert.equal(formatDistance(null), null);
assert.equal(
  distanceInKilometers(
    { latitude: 37.4981, longitude: 127.0275 },
    { latitude: 37.4981, longitude: 127.0275 },
  ),
  0,
);
assert.equal(
  distanceInKilometers(
    { latitude: 0, longitude: 0 },
    { latitude: 37.4981, longitude: 127.0275 },
  ),
  null,
);
assert.equal(normalizedSearchText("  ＺｅｒｏＱ 강남  "), "zeroq 강남");

console.log("ZeroQ space presentation checks passed.");
