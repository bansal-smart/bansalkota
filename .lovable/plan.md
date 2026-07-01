## Goal
Eliminate duplicate student phone numbers by treating same-phone students as siblings: swap so each sibling's `parent_phone` becomes the other sibling's `phone`, and clear the old parent numbers. Result: every student has a unique login phone. Remove the "Choose your account" picker since it's no longer needed.

## Steps

### 1. Data fix (SQL, one-time via `supabase--read_query` first to audit, then migration/insert to update)

- **Audit**: find all `profiles.phone` values shared by 2+ students. Confirm they're sibling pairs (2 students). Flag any group of 3+ for manual review before running.
- **Rule for each sibling pair (A, B) sharing the same phone P**:
  - Keep A's `phone = P_A` (existing), set A's `parent_phone = P_B` (B's current phone — but B's is also P, so we need a different source).
  
Since both siblings currently share the **same** `phone` value, we cannot derive a second unique number from existing data. We need a second real phone number to make them unique.

**This is the blocker — please clarify one of the following before I finalize the plan:**

### Question for you
For sibling pairs where both students currently have the **same** `phone` (e.g., Aditya & Adarsh both `8528829703`), where should the second unique phone come from?

- **Option A** — Use each student's existing `parent_phone` (if present and different) as one sibling's new login `phone`, and set the other sibling's `parent_phone` to that number. Clear the shared number from wherever it conflicts.
- **Option B** — I provide a CSV/list mapping `roll_number → new unique phone` for the affected siblings, and you apply it.
- **Option C** — Something else (please describe).

Once you confirm, I'll:
1. Run the SQL update on `profiles` (values only, no schema change).
2. Revert `prpsms-verify-otp` to a single-match lookup (remove `needs_selection` / `preferred_user_id` branch).
3. Remove the `"pick"` step, `Candidate` type, and picker UI from `LoginPage.tsx`.
4. Verify by re-querying `profiles` to confirm no duplicate `phone` values remain.
