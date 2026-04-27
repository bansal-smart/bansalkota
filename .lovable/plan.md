
# Phase 3 Implementation Plan — Tests, Live Classes, Doubts

Web scope only. Skipping Razorpay/Stripe (replaced by friendly fallback), Agora SDK live video (replaced by an embeddable meeting URL + realtime chat/attendance — full SDK out of web MVP scope), FCM/APNs push (already shipping in-app realtime notifications), and Flutter mobile.

---

## Step 0 — Payment fallback (quick win)

Update `EnrollmentModal.tsx`:
- Replace the demo "instantly enrolls" flow with a clear toast/banner: **"Payment integration is not yet implemented. Razorpay (India) and Stripe (Dubai) will be wired in next."**
- Keep a hidden dev-only "Demo enroll" button (visible only to staff/admin via `has_role`) so staff/admins can still test enrollment paths during development.
- Update `CourseDetailPage.tsx` enroll button copy to "Enroll (coming soon)" for non-staff.

Same fallback added to any other "Pay" CTAs in `StorePage.tsx` and Profile upgrade buttons.

---

## Step 1 — Tests engine (the largest piece of Phase 3)

### Database schema (new migrations)

```sql
-- Test definitions
CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  test_type text NOT NULL DEFAULT 'mock',          -- mock | chapter | pyq | practice
  exam_pattern text NOT NULL DEFAULT 'jee-main',   -- jee-main | jee-advanced | neet | custom
  subjects text[] DEFAULT '{}',
  duration_minutes int NOT NULL DEFAULT 180,
  correct_marks numeric NOT NULL DEFAULT 4,
  wrong_marks numeric NOT NULL DEFAULT -1,
  total_questions int NOT NULL DEFAULT 0,
  total_marks numeric NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'public',       -- public | course-only | private
  course_id uuid,                                  -- nullable, links to courses
  is_published boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  subject text,
  topic text,
  question_text text NOT NULL,
  question_image_url text,
  question_type text NOT NULL DEFAULT 'mcq-single', -- mcq-single | mcq-multi | numerical
  options jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{id, text, image_url}]
  correct_answer jsonb NOT NULL,                    -- index | indices | numeric
  explanation text,
  difficulty text DEFAULT 'medium',
  marks_correct numeric DEFAULT 4,
  marks_wrong numeric DEFAULT -1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend test_attempts (already exists) for live test sessions
ALTER TABLE public.test_attempts
  ADD COLUMN test_id uuid,
  ADD COLUMN status text NOT NULL DEFAULT 'in_progress', -- in_progress | submitted | auto_submitted
  ADD COLUMN started_at timestamptz DEFAULT now(),
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN time_spent_seconds int DEFAULT 0,
  ADD COLUMN answers jsonb DEFAULT '{}'::jsonb,          -- { question_id: { selected, status } }
  ADD COLUMN question_statuses jsonb DEFAULT '{}'::jsonb;-- { question_id: 'answered'|'marked'|... }

-- RLS: tests/test_questions readable by anon for public+published, manageable by creator/staff
-- Existing test_attempts policies (user owns) remain
```

### RPC for percentile + auto-evaluation

```sql
CREATE OR REPLACE FUNCTION public.submit_test_attempt(_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER ...
-- Server-side scoring: walks answers vs test_questions.correct_answer
-- Computes score, accuracy, subject-wise breakdown
-- Computes percentile = % of attempts with lower score on the same test
-- Updates test_attempts row, returns full result payload
```

### Pages to wire to real data

- **`TestListPage.tsx`** → query `tests` with filters (type, subject, status), show user's attempt status from `test_attempts`.
- **`TestTakingPage.tsx`** → load `tests` + `test_questions`. Server-anchored timer (compute remaining from `started_at + duration`). Auto-save `answers` + `question_statuses` to `test_attempts` every 15s and on each navigation. Auto-submit at timeout.
- **`TestResultPage.tsx`** → call `submit_test_attempt` RPC, render real subject breakdown, accuracy, percentile, comparison with avg/topper from aggregated queries.
- **`CreateTestPage.tsx`** (teacher) → persist `tests` + `test_questions` rows; support image uploads via `educator-uploads` bucket.
- **`AdminTestsPage.tsx`** → list real tests with publish/unpublish toggle and approve workflow.

### Anti-cheat (lightweight, web-only)
- Detect `visibilitychange` + tab blur, log warnings to `test_attempts.metadata.flags`.
- Disable copy/paste and right-click during attempt.
- Full-screen prompt on start; warning toast on exit.

### Seed data
- Seed 3 sample tests (1 JEE Main mock, 1 NEET chapter, 1 Class 11 practice) with ~10 questions each so the catalog isn't empty.

---

## Step 2 — Live classes (web scope, no Agora SDK)

### Database tweaks

```sql
ALTER TABLE public.live_classes
  ADD COLUMN description text,
  ADD COLUMN course_id uuid,
  ADD COLUMN recording_url text,
  ADD COLUMN max_participants int,
  ADD COLUMN created_by uuid;

CREATE TABLE public.live_class_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  is_teacher boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
```

### Pages to wire

- **`LiveClassesListPage.tsx`** → query `live_classes` split into Live / Upcoming / Past (recordings). Show registration status from `live_class_attendance`.
- **`LiveClassRoomPage.tsx`** →
  - Embed `meeting_url` (Google Meet / Jitsi / external link) in an iframe with a fallback "Join meeting" button if iframe disallowed.
  - Replace static chat with realtime `live_class_messages` (postgres_changes subscription).
  - On mount: upsert `live_class_attendance` row with `joined_at = now()`, status = `joined` → **auto-attendance**.
  - Show real participant count from attendance.
- **`TeacherLiveClassesPage.tsx`** → CRUD for own `live_classes` (schedule, edit, mark complete, attach recording URL).
- **`AdminLiveClassesPage.tsx`** → wire to real data, replace static counts with live aggregates.

### Notes
- Real Agora video SDK + cloud recording is **deferred** (out of web MVP scope, large infrastructure cost). Documented as the next backend milestone.

---

## Step 3 — Doubts module

### Database

```sql
CREATE TABLE public.doubts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                    -- student who asked
  subject text NOT NULL,
  topic text,
  question_text text NOT NULL,
  image_url text,
  status text NOT NULL DEFAULT 'pending',   -- pending | ai_solved | answered | closed
  ai_answer text,
  assigned_teacher_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.doubt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id uuid NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL,
  responder_role text NOT NULL,             -- teacher | ai | student
  answer_text text NOT NULL,
  image_url text,
  helpful_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.doubts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubt_answers;
```

RLS: students manage own doubts, teachers/staff can read+answer all doubts, answers visible to doubt owner + staff.

### Pages to wire

- **`DoubtPage.tsx`** (student) →
  - Real "Ask New Doubt" dialog: text + optional image upload (to `educator-uploads/doubts/`).
  - On submit, call new edge function `ai-doubt-solver` (Lovable AI Gateway, `google/gemini-2.5-flash`) to generate `ai_answer` immediately.
  - Render real list filtered by status, with realtime subscription for teacher answers.
- **`TeacherDoubtQueuePage.tsx`** → real queue from `doubts` where `assigned_teacher_id IS NULL OR = me`. Reply form writes `doubt_answers` and updates `doubts.status = 'answered'`. Triggers a `notifications` insert for the student.

### New edge function: `ai-doubt-solver`
- Validates input (Zod), calls Lovable AI gateway, returns answer, updates `doubts.ai_answer` + status.

---

## Step 4 — Notifications wiring

Add notification triggers on key events:
- New `doubt_answers` insert → notify doubt owner.
- Live class starting in 15 min (cron-style, deferred — for now, on `LiveClassRoomPage` join, send "X joined your class" only to teacher).
- Test result available → already covered by submit RPC.

(Push notifications via FCM/APNs explicitly skipped — in-app realtime already works.)

---

## Files touched

**Migrations (new):**
- `tests`, `test_questions` schema + RLS + `submit_test_attempt` RPC
- `live_classes` columns + `live_class_messages` + realtime
- `doubts` + `doubt_answers` + realtime + RLS
- `test_attempts` extension columns

**Edge function (new):**
- `supabase/functions/ai-doubt-solver/index.ts`

**Hooks (new):**
- `useTests.ts`, `useTestAttempt.ts`
- `useLiveClasses.ts`, `useLiveClassRoom.ts` (realtime chat + attendance)
- `useDoubts.ts`

**Pages (rewritten to dynamic):**
- `TestListPage.tsx`, `TestTakingPage.tsx`, `TestResultPage.tsx`, `CreateTestPage.tsx`, `AdminTestsPage.tsx`
- `LiveClassesListPage.tsx`, `LiveClassRoomPage.tsx`, `TeacherLiveClassesPage.tsx`, `AdminLiveClassesPage.tsx`
- `DoubtPage.tsx`, `TeacherDoubtQueuePage.tsx`
- `EnrollmentModal.tsx`, `CourseDetailPage.tsx`, `StorePage.tsx` (payment fallback)

**Seed data:**
- 3 sample tests with questions
- 4 sample upcoming/live `live_classes`

---

## Out of scope (explicitly skipped)

- Razorpay / Stripe / webhook subscription sync → friendly fallback message
- Agora real-time video SDK + cloud recording → embed meeting URL only
- FCM / APNs push notifications → in-app realtime already works
- Flutter mobile skeleton → web-only

After this lands, **Phase 3 web-scope is ~85% complete** — only payment gateway and live video SDK remain as separate large infrastructure tasks.
