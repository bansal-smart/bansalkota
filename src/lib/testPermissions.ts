export type TestOwnership = { centre_id?: string | null; is_global?: boolean | null };

export type EditContext = {
  isCenterAdmin: boolean;
  primaryCenterId: string | null;
  isHq: boolean;
};

// Super admin / admin edit everything. A centre admin edits only tests their own
// centre owns, and never a global test unless their centre is the HQ.
export function canEditTest(test: TestOwnership | null | undefined, ctx: EditContext): boolean {
  if (!test) return false;
  if (!ctx.isCenterAdmin) return true;
  if (!ctx.primaryCenterId || test.centre_id !== ctx.primaryCenterId) return false;
  return !test.is_global || ctx.isHq;
}
