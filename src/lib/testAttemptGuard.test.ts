import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { getStudentAttemptGate, isAlreadyAttemptedError } from "./testAttemptGuard";

const chain = (result: { data: unknown; error?: unknown }) => {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = self;
  builder.eq = self;
  builder.in = self;
  builder.order = self;
  builder.limit = () => Promise.resolve(result);
  return builder;
};

describe("getStudentAttemptGate", () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  it("allows a first attempt when nothing is submitted", async () => {
    fromMock.mockReturnValue(chain({ data: [] }));
    const gate = await getStudentAttemptGate("user-1", "test-1");
    expect(gate).toEqual({ canStartNew: true, completedAttemptId: null });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("blocks a second attempt without an approved re-attempt", async () => {
    fromMock.mockReturnValue(chain({ data: [{ id: "att-9" }] }));
    rpcMock.mockResolvedValue({ data: false, error: null });
    const gate = await getStudentAttemptGate("user-1", "test-1");
    expect(gate).toEqual({ canStartNew: false, completedAttemptId: "att-9" });
  });

  it("allows a new attempt when re-attempt is approved", async () => {
    fromMock.mockReturnValue(chain({ data: [{ id: "att-9" }] }));
    rpcMock.mockResolvedValue({ data: true, error: null });
    const gate = await getStudentAttemptGate("user-1", "test-1");
    expect(gate).toEqual({ canStartNew: true, completedAttemptId: "att-9" });
  });
});

describe("isAlreadyAttemptedError", () => {
  it("detects the database exception", () => {
    expect(
      isAlreadyAttemptedError({
        message: "ALREADY_ATTEMPTED: This test can only be taken once per account",
        code: "P0001",
      }),
    ).toBe(true);
    expect(isAlreadyAttemptedError({ message: "Could not start test" })).toBe(false);
  });
});
