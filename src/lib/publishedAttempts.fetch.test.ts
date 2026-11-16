import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { fetchPublishedTestIds, onlyPublishedAttempts } from "./publishedAttempts";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `id-${i}`);

describe("fetchPublishedTestIds", () => {
  beforeEach(() => {
    rpc.mockReset(); // braces: a returned function would be run by vitest as a teardown hook
  });

  it("makes no request for empty / null-only input", async () => {
    expect((await fetchPublishedTestIds([])).size).toBe(0);
    expect((await fetchPublishedTestIds([null, undefined])).size).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("de-duplicates ids and returns the published subset", async () => {
    rpc.mockResolvedValue({ data: [{ id: "a" }], error: null });
    const out = await fetchPublishedTestIds(["a", "a", "b", null]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("published_test_ids", { _test_ids: ["a", "b"] });
    expect([...out]).toEqual(["a"]);
  });

  it("splits large inputs into chunks of 500 and merges the results", async () => {
    rpc.mockImplementation(async (...args: unknown[]) => {
      const { _test_ids } = args[1] as { _test_ids: string[] };
      return { data: [{ id: _test_ids[0] }], error: null };
    });
    const out = await fetchPublishedTestIds(ids(1001));
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc.mock.calls.map((c) => (c[1] as { _test_ids: string[] })._test_ids.length)).toEqual([500, 500, 1]);
    expect([...out].sort()).toEqual(["id-0", "id-1000", "id-500"]);
  });

  it("throws on a query error instead of silently returning an empty set", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom", code: "XX000" } });
    await expect(fetchPublishedTestIds(["a"])).rejects.toMatchObject({ message: "boom" });
  });
});

describe("onlyPublishedAttempts", () => {
  beforeEach(() => {
    rpc.mockReset(); // braces: a returned function would be run by vitest as a teardown hook
  });

  it("keeps only attempts of published tests (drops unpublished, deleted, null)", async () => {
    rpc.mockResolvedValue({ data: [{ id: "pub" }], error: null });
    const attempts = [{ id: 1, test_id: "pub" }, { id: 2, test_id: "draft" }, { id: 3, test_id: "gone" }, { id: 4, test_id: null }];
    expect((await onlyPublishedAttempts(attempts)).map((a) => a.id)).toEqual([1]);
  });

  it("does not call the server when there are no attempts", async () => {
    expect(await onlyPublishedAttempts([])).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});
