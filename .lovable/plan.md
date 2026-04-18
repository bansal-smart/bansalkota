
The user wants a **Product Requirements Document (PRD)** as a downloadable file for building an Android app version of the Arambh web application. This is an artifact-generation task, not a code change to the web app.

Key understanding from the request:
- Android-only native app (mirror of web app)
- Login screen with Signup button
- After login: Home screen with Top bar + Bottom bar
- Bottom bar has a "Profile" button → opens entire dashboard (mirroring web)
- Theme must match the web app (orange #F97316, navy, Mulish/Plus Jakarta Sans)
- Reference all features from the existing web app (Student/Teacher/Admin portals, Live Classes, Tests, QBank, Doubts, Educators, Compete, Leaderboard, Store, Settings, AI Doubt Solver, Career with Arambh, India/Dubai region, Razorpay/Stripe payments)

Format clarification: User explicitly said "give me the PRD file" — so a downloadable document is wanted (no ambiguity, no need to ask).

## Plan: Generate Android App PRD Document

### Deliverable
A professionally formatted **PDF** PRD file (`Arambh_Android_App_PRD.pdf`) saved to `/mnt/documents/` — ready for handoff to Android developers.

### PRD Structure (15+ sections)

1. **Document Info** — version, date, owner, status
2. **Executive Summary** — what we're building & why
3. **Product Vision & Goals** — mirror Arambh web on Android, India + Dubai
4. **Target Audience & Personas** — Students (JEE/NEET/CBSE/Dubai curriculum), Teachers, Admins
5. **Scope** — In-scope (MVP) vs Out-of-scope (v2+)
6. **Tech Stack Recommendation**
   - Native: Kotlin + Jetpack Compose, MVVM, Hilt, Retrofit, Room, ExoPlayer, Razorpay/Stripe SDKs, Firebase (FCM, Crashlytics)
   - Backend: same Lovable Cloud / Supabase backend as web (REST + Realtime)
6b. **Alternative Hybrid path** — Capacitor wrap of existing React app (faster route)
7. **App Architecture** — module structure, navigation graph
8. **Screen-by-Screen Specs** with user flow:
   - Splash → Onboarding (Region: India/Dubai, Goal selector)
   - **Login Screen** (with Signup CTA, OTP, Google Sign-In, Forgot Password)
   - **Signup Screen** (email/phone/Google → OTP verify)
   - **Home Screen** (Top Bar: logo + region + notifications + search; Content: hero, continue learning, upcoming live classes, recommended courses; Bottom Bar tabs)
   - **Bottom Navigation tabs**: Home | Courses | Live | Tests | **Profile (Dashboard)**
   - **Profile/Dashboard tab** — full mirror of web Student Dashboard (stats, streak, recent activity, settings entry)
   - Course Detail, Lecture Player (ExoPlayer fullscreen)
   - Live Class Room (WebRTC/HLS)
   - Test Engine (immersive, palette, timer, auto-save)
   - QBank, Doubts (AI Solver), Educators, 1-on-1 booking
   - Leaderboard, Compete
   - Store + Payments (Razorpay India / Stripe Dubai)
   - Settings, Profile Edit, Notifications
   - Career with Arambh (Educator application form)
   - Teacher portal screens (if user role = teacher)
9. **Design System** — exact colors (#F97316, #1E293B, #FFFBF5), fonts (Mulish display, Plus Jakarta Sans body), spacing, components, dark/light, Lucide-equivalent icons (Material Symbols), motion guidelines
10. **Functional Requirements** matrix (FR-001 … FR-0XX) with priority
11. **Non-Functional Requirements** — performance, offline, accessibility (TalkBack, ≥AA contrast), security (no roles in profile table, RLS), localization (English + Hindi + Arabic for Dubai)
12. **Backend & API Integration** — reuse Supabase, list endpoints/tables, auth flow, realtime channels
13. **Permissions** — Camera, Mic, Storage, Notifications, Network
14. **Analytics & Tracking** — events to track (signup, course view, test attempt, payment)
15. **Push Notifications** — FCM topics (live class start, test reminder, doubt reply)
16. **Payments** — Razorpay (IN INR), Stripe (AE AED), 3-step checkout flow
17. **Offline Support** — downloaded lectures, cached tests
18. **Security & Compliance** — DPDP (India), GDPR (Dubai), age gate
19. **Testing Strategy** — unit, instrumentation, Espresso, beta via Play Console
20. **Release Plan & Milestones** — 6 sprints (~12 weeks) to MVP
21. **Success Metrics / KPIs** — DAU, retention D7/D30, course completion, payment conversion
22. **Risks & Mitigations**
23. **Appendix** — sitemap diagram (ASCII), wireframe references, glossary

### Generation Approach
- Python script using `reportlab` to build a styled PDF:
  - Cover page with Arambh orange gradient banner
  - Section headings in navy, body text dark
  - Tables for FR matrix, screen list, milestones
  - Mini ASCII navigation diagram
- After generation, convert each PDF page to PNG and visually QA every page (check overflow, headings, tables) before delivering
- Final output: `<lov-artifact path="Arambh_Android_App_PRD.pdf" mime_type="application/pdf">`

### What I will NOT do
- No changes to the web app codebase
- Not start building the Android app (PRD only, as requested)
- Not ask further questions — request is clear and explicit
