import { describe, expect, it } from "vitest";
import { keepPublishedAttempts } from "./publishedAttempts";

describe("keepPublishedAttempts", () => {
  const published = new Set(["t-pub-1", "t-pub-2"]);

  it("keeps attempts whose test is published", () => {
    const a = [{ id: 1, test_id: "t-pub-1" }, { id: 2, test_id: "t-pub-2" }];
    expect(keepPublishedAttempts(a, published)).toEqual(a);
  });

  it("drops attempts of unpublished tests", () => {
    const a = [{ id: 1, test_id: "t-pub-1" }, { id: 2, test_id: "t-draft" }];
    expect(keepPublishedAttempts(a, published).map((x) => x.id)).toEqual([1]);
  });

  it("drops attempts of deleted tests (test id not in the published set)", () => {
    expect(keepPublishedAttempts([{ test_id: "t-deleted" }], published)).toEqual([]);
  });

  it("drops legacy attempts with no test id", () => {
    expect(keepPublishedAttempts([{ test_id: null }, { test_id: undefined }, {}], published)).toEqual([]);
  });

  it("returns nothing when no test is published, and handles empty input", () => {
    expect(keepPublishedAttempts([{ test_id: "t-pub-1" }], new Set())).toEqual([]);
    expect(keepPublishedAttempts([], published)).toEqual([]);
  });

  it("does not mutate its input and preserves order", () => {
    const a = [{ id: 1, test_id: "t-pub-2" }, { id: 2, test_id: "x" }, { id: 3, test_id: "t-pub-1" }];
    const copy = [...a];
    expect(keepPublishedAttempts(a, published).map((x) => x.id)).toEqual([1, 3]);
    expect(a).toEqual(copy);
  });
});
