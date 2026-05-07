# Compete Feature — 1v1 Quiz Battles

Replace the static `CompetePage.tsx` mock with a real, end-to-end multiplayer quiz battle for students.

## Match concept
- **1v1**, 10 questions, 30 seconds per question
- Score = correct answers + speed bonus (faster correct = more points)
- Winner gets +ELO, loser loses ELO; both see a result screen with rank delta

## Matching criteria (all four combined)
1. **Same target exam** — JEE / NEET / etc. (from `profiles.target_exam`)
2. **Same class level** — 11 / 12 / Dropper (from `profiles.class_level`)
3. **Subject + topic** — player picks before queueing (e.g., Physics → Kinematics)
4. **Similar ELO rating** — start at 1000, expand search window every 5s (±50 → ±100 → ±200 → bot fallback at 25s)

## Two entry modes
- **Quick Match** — auto-pair via queue
- **Private Room** — host creates, gets a 6-char code, friend joins by code (skips ELO/exam checks)

---

## Database (new tables)

**`compete_questions`** — separate curated pool
- subject, topic, difficulty, question_text, options (jsonb), correct_index, explanation
- Admin-managed; readable by all authenticated students

**`compete_ratings`** — per student per exam
- user_id, target_exam, rating (default 1000), wins, losses, draws, current_streak, best_streak

**`compete_queue`** — active matchmaking entries
- user_id, target_exam, class_level, subject, topic, rating, room_code (nullable), status (`waiting` / `matched`), created_at
- Cleaned up on match or timeout

**`compete_matches`** — match lifecycle
- id, player1_id, player2_id, subject, topic, status (`pending` / `active` / `finished`), question_ids (uuid[]), current_question_index, started_at, finished_at, winner_id, room_code

**`compete_match_answers`** — per-question answers
- match_id, user_id, question_index, selected_index, is_correct, time_taken_ms, points

RLS: players can only read/write their own match rows; questions readable to authenticated; ratings readable to all (for leaderboards), writable only via edge function.

## Edge functions
- **`compete-matchmake`** — called on "Find Opponent". Inserts into queue, looks for compatible waiting opponent, atomically pairs them, creates a `compete_matches` row, picks 10 questions filtered by subject/topic/difficulty, returns `match_id`. Bot fallback after 25s.
- **`compete-create-room`** — generates 6-char code, inserts a `pending` match, waits for join.
- **`compete-join-room`** — validates code, attaches player2, picks questions, sets `active`.
- **`compete-submit-answer`** — validates timing, scores answer, writes to `compete_match_answers`, advances question if both players answered, finalizes match + updates ELO when complete.

ELO: standard formula, K=32. Expected = 1/(1+10^((opp-me)/400)). New = old + K*(actual-expected).

## Frontend (`src/pages/CompetePage.tsx` rewrite + new components)

States/screens:
1. **Lobby** — shows current rating, W/L, streak, "Quick Match" + "Create Room" + "Join Room" buttons, subject/topic picker
2. **Searching** — animated, shows expanding rating window, cancel button, "vs Bot in 25s" countdown
3. **Match Found** — both avatars, names, ratings, 3-2-1 countdown
4. **Playing** — question + 4 options, 30s timer ring, live opponent score, your score, question N/10
5. **Result** — winner crown, final scores, ELO delta, question-by-question recap, "Play Again" / "Back to Lobby"

Realtime via Supabase Realtime subscription on `compete_matches` (current_question_index, status) and `compete_match_answers` (opponent's progress).

New components:
- `src/components/compete/CompeteLobby.tsx`
- `src/components/compete/CompeteSearching.tsx`
- `src/components/compete/CompeteMatch.tsx` (the playing screen)
- `src/components/compete/CompeteResult.tsx`
- `src/hooks/useCompeteMatch.ts` — subscribes, submits answers
- `src/hooks/useCompeteRating.ts` — fetches/cache user rating

## Admin
Add `AdminCompeteQuestionsPage.tsx` (reusing the existing `QuestionEditorDialog` pattern from question_bank) so admins can seed `compete_questions`. Linked from admin sidebar.

## Seeding
Migration includes ~40 sample compete_questions across Physics/Chem/Math/Biology to make the feature usable immediately.

---

## Files to create
- `supabase/functions/compete-matchmake/index.ts`
- `supabase/functions/compete-create-room/index.ts`
- `supabase/functions/compete-join-room/index.ts`
- `supabase/functions/compete-submit-answer/index.ts`
- `src/components/compete/{CompeteLobby,CompeteSearching,CompeteMatch,CompeteResult}.tsx`
- `src/hooks/{useCompeteMatch,useCompeteRating}.ts`
- `src/pages/AdminCompeteQuestionsPage.tsx`

## Files to edit
- `src/pages/CompetePage.tsx` — full rewrite to wire up the four states
- `src/App.tsx` — add admin compete questions route
- `src/components/AdminLayout.tsx` — add nav link

## Out of scope (can add later)
- Tournaments / brackets
- Multiplayer >2 players
- Spectator mode
- Voice/text chat during match
