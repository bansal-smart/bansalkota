#!/usr/bin/env node
// Guards against a specific, previously-observed failure mode in this repo:
// a commit with an unrelated stated purpose silently overwrites a shared file
// (AdminLayout.tsx, AdminBoostPage.tsx, ...) with stale content that predates
// a previously-shipped, previously-verified feature — dropping it without
// anyone noticing until a client re-reports it as "broken again".
//
// Each entry pins one required feature to a literal string (or all-of a list
// of strings) that must still be present in a given file. This is deliberately
// dumb (no AST, no semantics) so it stays cheap to maintain and cheap to trust:
// if a required string ever legitimately needs to change (e.g. a filter is
// intentionally renamed), update the entry in the SAME commit that renames it.
//
// Run: `npm run guard:regressions` (also wired into CI before the build step).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const CHECKS = [
  {
    ticket: "Test Series Registrations sidebar tab",
    file: "src/components/AdminLayout.tsx",
    mustContain: ["Test Series Registrations", "/admin/test-series-registrations"],
  },
  {
    ticket: "BOOST Registrations: delete option",
    file: "src/pages/AdminBoostPage.tsx",
    mustContain: ["deleteRegistration", "Delete registration"],
  },
  {
    ticket: "BOOST Registrations: Exam Mode / Exam Slot filters",
    file: "src/pages/AdminBoostPage.tsx",
    mustContain: ["examModeFilter", "examSlotFilter", "Exam Mode:", "Exam Slot:"],
  },
];

let failed = false;

for (const check of CHECKS) {
  const filePath = path.join(rootDir, check.file);
  let contents;
  try {
    contents = readFileSync(filePath, "utf8");
  } catch {
    console.error(`[regression-guard] FAIL: ${check.ticket}\n  file not found: ${check.file}`);
    failed = true;
    continue;
  }
  const missing = check.mustContain.filter((needle) => !contents.includes(needle));
  if (missing.length > 0) {
    console.error(
      `[regression-guard] FAIL: ${check.ticket}\n  ${check.file} is missing: ${missing.join(", ")}\n` +
        `  This exact feature has previously shipped, then silently disappeared in a later\n` +
        `  unrelated commit. See REGRESSION_CHECKLIST.md before removing it intentionally.`,
    );
    failed = true;
  }
}

if (failed) {
  console.error("\n[regression-guard] One or more previously-fixed features are missing. See messages above.");
  process.exit(1);
}

console.log(`[regression-guard] OK — ${CHECKS.length} previously-fixed feature(s) still present.`);
