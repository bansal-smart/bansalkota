import { describe, it, expect } from "vitest";
import {
  DEFAULTS,
  applyPriceToken,
  splitScholarship,
  resolveIcon,
  isSpanRow,
} from "./useBoostContent";
import { Trophy } from "lucide-react";

describe("applyPriceToken", () => {
  it("replaces {price} with the numeric price", () => {
    expect(applyPriceToken("Pay ₹{price} now", 149)).toBe("Pay ₹149 now");
  });
  it("replaces every occurrence", () => {
    expect(applyPriceToken("{price} and {price}", 99)).toBe("99 and 99");
  });
  it("leaves text without the token unchanged", () => {
    expect(applyPriceToken("no token here", 99)).toBe("no token here");
  });
});

describe("splitScholarship", () => {
  it("splits 10 rows into 5 + 5", () => {
    const [l, r] = splitScholarship(Array.from({ length: 10 }, (_, i) => i));
    expect(l).toEqual([0, 1, 2, 3, 4]);
    expect(r).toEqual([5, 6, 7, 8, 9]);
  });
  it("puts the extra row on the left for odd counts", () => {
    const [l, r] = splitScholarship([1, 2, 3]);
    expect(l).toEqual([1, 2]);
    expect(r).toEqual([3]);
  });
  it("handles empty", () => {
    expect(splitScholarship([])).toEqual([[], []]);
  });
});

describe("resolveIcon", () => {
  it("returns the mapped icon for a known name", () => {
    expect(resolveIcon("Trophy")).toBe(Trophy);
  });
  it("falls back to Trophy for an unknown name", () => {
    expect(resolveIcon("NotARealIcon")).toBe(Trophy);
  });
});

describe("isSpanRow", () => {
  it("is true for a span row", () => {
    expect(isSpanRow({ label: "x", span: "y" })).toBe(true);
  });
  it("is false for a cells row", () => {
    expect(isSpanRow({ label: "x", cells: ["a"] })).toBe(false);
  });
});

describe("DEFAULTS", () => {
  it("has the full seeded shape", () => {
    expect(DEFAULTS.scholarshipGrid).toHaveLength(10);
    expect(DEFAULTS.examStructure.rows).toHaveLength(7);
    expect(DEFAULTS.examStructure.columns).toHaveLength(3);
    expect(DEFAULTS.faqs).toHaveLength(9);
    expect(DEFAULTS.benefits).toHaveLength(2);
    expect(DEFAULTS.timeline).toHaveLength(4);
    expect(DEFAULTS.notes).toHaveLength(5);
  });
  it("keeps the {price} token in the first timeline item", () => {
    expect(DEFAULTS.timeline[0].desc).toContain("{price}");
  });
});
