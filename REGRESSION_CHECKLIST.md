# Regression checklist

## Why this file exists

Three times now, a feature the client confirmed as fixed has silently come back
broken with nobody intentionally reverting it:

1. **Test Series Registrations** sidebar tab — disappeared and reappeared four
   times: added `c995695a` (2026-09-10) → removed `23e7b7b5` (2026-09-14,
   commit titled "Meta pixel ID") → re-added `2b941a41` (2026-09-15) → removed
   again `bd5287af` (2026-09-22, commit titled "Class filter and batches
   export") → re-added `c2355489` (2026-09-23).
2. **BOOST Registrations delete option** — added `9c0ea909` (2026-09-17) →
   removed in the *same* `bd5287af` commit above → re-added `69ba915a`
   (2026-09-24).
3. **BOOST Registrations Exam Mode / Exam Slot filters** — added `9c0ea909`
   (2026-09-17) → removed in the *same* `bd5287af` commit → re-fixed here.

**Root cause (confirmed by diff, not guesswork):** `AdminLayout.tsx` at commit
`23e7b7b5` and again at `bd5287af` — eight days apart, under two completely
unrelated commit messages — produced the **byte-identical file content**
(git blob `4992b726...` both times). That's not two people independently
deleting the same line; it's the same stale copy of the file being written
back wholesale each time, without ever being re-read against the latest
`HEAD` first. The same pattern shows up in `AdminBoostPage.tsx`: `bd5287af`'s
version of that file is built on top of the pre-`9c0ea909` code (missing the
exam filters and delete button), with the new "class filter / batches export"
work layered on. Both files were edited from a stale snapshot and then
committed as a full replacement, clobbering real work nobody had a chance to
see. It is **not** a merge conflict (no merge commit involved), **not** a
rebase/force-push (linear history, stable hashes), and **not** a wrong deploy
branch (`.github/workflows/deploy.yml` only ever builds/deploys `local-work`,
confirmed).

**The fix going forward is procedural, not just "be more careful":** before
editing a shared file (`AdminLayout.tsx`, `AdminBoostPage.tsx`, or any file
several sessions touch), re-read it fresh off disk/`HEAD` in that same
session — don't reuse a copy loaded earlier in a long session or from an old
checkout — and commit the result immediately rather than letting it sit as an
uncommitted or stale local change that a later session can overwrite.

## Automated guard

`npm run guard:regressions` (also runs automatically as the first step of
`npm run build`, so it blocks CI deploys too — see
`scripts/regression-guard.mjs`) checks that the three features above are
still present, by grepping for specific strings in specific files. If it
fails, **do not just delete the check** — find out why the feature is gone.

When you deliberately rename or remove one of these, update
`scripts/regression-guard.mjs` in the *same commit*.

## Manual checks (not yet automated — verify before calling a deploy "done")

These are past client-reported requirements that are easy to lose track of
across sessions. Skim this list before merging/deploying a change that
touches admin pages, filters, or navigation:

- [ ] Test Series Registrations sidebar tab is visible (`/admin/test-series-registrations`) — automated ✅
- [ ] BOOST Registrations: delete option visible to staff — automated ✅
- [ ] BOOST Registrations: Exam Mode + Exam Slot filters present — automated ✅
- [ ] Question Bank: visibility rules match the last-agreed scope (class/stream/batch)
- [ ] Batch visibility: franchise centre queries include PAN-India (`centre_id IS NULL`) batches alongside their own (see `CONTEXT.md` → "Batch (centralized, 2026-08-13)")
- [ ] Centre pin/PIN fields are 4 digits where required (recent fix, `69ba915a`)
- [ ] Any admin filter bar you touch still has *all* its previous filters, not just the ones relevant to your current task — diff the filter `<select>` block against `git show HEAD~1:<file>` if unsure

Add a line here whenever a client-reported bug is fixed, so the next session
doesn't have to rediscover it from chat history.

## Process rule going forward

**"Verified working in dev" and "committed" are the same step, not two.** Do
not leave a confirmed fix sitting uncommitted — the next session (or a stale
checkout) has no way to know it exists and can silently overwrite it.
