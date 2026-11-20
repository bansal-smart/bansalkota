import { describe, it, expect } from "vitest";
import { CENTER_MODULES } from "@/lib/centerModules";
import { ADMIN_MODULES } from "@/lib/adminModules";

// Centre roles reuse the admin pages, so nav/route gating (PATH_TO_MODULE in
// AdminLayout) and RLS only recognise admin-portal keys. A centre key that is not an
// admin key saves fine but never grants anything.
describe("CENTER_MODULES", () => {
  const adminByKey = new Map(ADMIN_MODULES.map((m) => [m.key, m]));

  it("only uses module keys the admin portal gates on", () => {
    const unknown = CENTER_MODULES.filter((m) => !adminByKey.has(m.key)).map((m) => m.key);
    expect(unknown).toEqual([]);
  });

  it("only offers actions the admin module supports", () => {
    CENTER_MODULES.forEach((m) => {
      const allowed = adminByKey.get(m.key)?.actions ?? [];
      expect(m.actions.filter((a) => !allowed.includes(a))).toEqual([]);
    });
  });

  it("has no duplicate keys", () => {
    const keys = CENTER_MODULES.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
