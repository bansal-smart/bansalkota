import { describe, it, expect } from "vitest";
import { buildCombinedRankMap, rankText } from "./combinedRanks";

describe("combinedRanks", () => {
  it("indexes rows by merge key", () => {
    const map = buildCombinedRankMap([
      { merge_key: "R:101", rank_p1: 1, rank_p2: 2, rank_combined: 1 },
      { merge_key: "U:abc", rank_p1: null, rank_p2: 3, rank_combined: 2 },
    ]);
    expect(map.get("R:101")).toEqual({ p1: 1, p2: 2, combined: 1 });
    expect(map.get("U:abc")).toEqual({ p1: null, p2: 3, combined: 2 });
    expect(map.get("R:999")).toBeUndefined();
  });

  it("handles missing data", () => {
    expect(buildCombinedRankMap(null).size).toBe(0);
    expect(buildCombinedRankMap(undefined).size).toBe(0);
  });

  it("renders a rank or the fallback", () => {
    expect(rankText(4, "ABS")).toBe("4");
    expect(rankText(null, "ABS")).toBe("ABS");
    expect(rankText(undefined, "—")).toBe("—");
  });
});
