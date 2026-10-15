import { describe, it, expect } from "vitest";
import { canEditTest } from "./testPermissions";

const centre = { isCenterAdmin: true, primaryCenterId: "c1", isHq: false };
const hq = { isCenterAdmin: true, primaryCenterId: "kota", isHq: true };
const superAdmin = { isCenterAdmin: false, primaryCenterId: null, isHq: false };

describe("canEditTest", () => {
  it("lets super admin edit anything", () => {
    expect(canEditTest({ centre_id: "kota", is_global: true }, superAdmin)).toBe(true);
  });
  it("lets a centre edit its own non-global test", () => {
    expect(canEditTest({ centre_id: "c1", is_global: false }, centre)).toBe(true);
  });
  it("blocks a centre editing another centre's test", () => {
    expect(canEditTest({ centre_id: "kota", is_global: false }, centre)).toBe(false);
  });
  it("blocks a centre editing a global test, even one it owns", () => {
    expect(canEditTest({ centre_id: "c1", is_global: true }, centre)).toBe(false);
  });
  it("lets HQ edit a global test it owns", () => {
    expect(canEditTest({ centre_id: "kota", is_global: true }, hq)).toBe(true);
  });
  it("blocks while the centre is still unknown", () => {
    expect(canEditTest({ centre_id: "c1" }, { ...centre, primaryCenterId: null })).toBe(false);
  });
  it("blocks when there is no test", () => {
    expect(canEditTest(null, superAdmin)).toBe(false);
  });
});
