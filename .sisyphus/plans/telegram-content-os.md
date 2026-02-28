# Telegram Content OS — Full Work Plan

## TL;DR

> **Quick Summary**: Build a full-stack Next.js web dashboard that enables Russian Telegram channel creators to repurpose their content to LinkedIn and Twitter/X in English, with AI-powered cultural adaptation, scheduling, analytics, and content management.
> 
> **Deliverables**:
> - Full-stack Next.js 15 app with Supabase backend
> - Telegram Bot integration (channel connection, post ingestion via webhooks)
> - AI-powered cross-posting engine (RU→EN adaptation for LinkedIn + Twitter)
> - Visual scheduling calendar with timezone support and recurring posts
> - Analytics dashboard (engagement, growth, best posting times)
> - Content & media library with categorization
> - Freemium billing with Stripe (Free/Plus $19/Pro $49)
> - Welcome message templates for Telegram channels
> 
> **Estimated Effort**: XL (8-12 weeks for solo developer)
> **Parallel Execution**: YES — 6 waves
> **Critical Path**: Scaffolding → DB Schema → Telegram Bot → AI Engine → Cross-posting → Analytics

---

## Context

### Original Request
Build a Telegram Content OS — a comprehensive web dashboard for Russian Telegram channel creators to manage their channels, create AI-powered content, and grow their personal brand on English-speaking platforms (LinkedIn, Twitter/X). Freemium pricing model with AI content adaptation as the key differentiator.

### Interview Summary
**Key Discussions**:
- **Target user**: Solo creator running 1-3 Telegram channels, wants English-audience brand growth
- **Builder**: Solo backend/Python developer choosing full-stack Next.js (TypeScript)
- **Feature cuts agreed**: V1 focuses on cross-posting + scheduling + analytics. Deferred: moderation, community gamification, competitor spy, viral predictor, multi-payment
- **Build order**: Dashboard/scheduling foundation first → Telegram integration → Cross-posting engine → Analytics
- **Test strategy**: Full TDD with vitest (unit/integration) + Playwright (E2E)
- **AI strategy**: Multi-provider via OpenRouter (GPT-4.1 mini, Claude Haiku, DeepL)

**Research Findings**:
- **Telegram Bot API**: Can read own channel posts + reactions (counts), post as admin. CANNOT read comments, competitor channels, detailed analytics. Rate: ~30 msg/sec global, ~1/sec per chat.
- **LinkedIn API**: OAuth 2.0 PKCE, Community Management API. Supports text/images/video/articles/polls. No organic carousels. Requires API access approval.
- **Twitter/X Free tier**: $0, 1,500 posts/mo write-only. Enough for MVP. OAuth 2.0 PKCE.
- **Competitive gap confirmed**: NO existing tool does Telegram→LinkedIn/Twitter with AI cultural adaptation.
- **AI cost**: ~$0.01-0.03 per post adaptation. 2-step process optimal (literal translate → platform adapt).
- **Infrastructure cost**: $20-40/mo MVP on Vercel + Supabase + Inngest.

### Gap Analysis (Self-Performed)
**Identified Gaps** (addressed in plan):
- **OAuth token refresh**: LinkedIn/Twitter tokens expire. Must implement refresh flow + encrypted storage → Added to OAuth tasks
- **Webhook reliability**: Telegram webhooks can fail silently. Need retry + dead letter queue → Added to Telegram integration
- **Rate limiting per user**: Free tier users need enforcement (5 cross-posts/mo). Must track usage → Added to billing tasks
- **Content format mapping**: Telegram posts have unique formatting (bold, italic, links, media groups). Need parser → Added as dedicated task
- **i18n from day 1**: Russian + English UI needed since target users are Russian speakers → Added to scaffolding
- **Error UX**: AI failures, API rate limits, OAuth expiry — user must see clear error states → Added as guardrail to all tasks

---

## Work Objectives

### Core Objective
Deliver a production-ready web dashboard where a Russian Telegram channel creator can connect their channel, have their posts automatically adapted by AI from Russian to English for LinkedIn/Twitter audiences, schedule cross-platform publication, and track engagement analytics — all within a freemium subscription model.

### Concrete Deliverables
- Next.js 15 app deployed to Vercel at a custom domain
- Supabase Postgres database with full schema (users, channels, posts, schedules, analytics)
- Telegram Bot that receives channel posts via webhook and stores them
- AI adaptation engine that converts RU Telegram posts → EN LinkedIn posts + EN tweets
- LinkedIn OAuth integration with automated posting via Community Management API
- Twitter/X OAuth integration with automated posting via v2 API
- Visual scheduling calendar (drag-drop, timezone selector, recurring)
- Analytics dashboard with charts (post performance, growth, best times)
- Content library with search, categories, and reuse
- Media library with Supabase Storage (upload, organize, attach to posts)
- Stripe billing with 3 tiers (Free: 5 cross-posts/mo, Plus $19: 50, Pro $49: unlimited)
- Welcome message template editor for Telegram channels

### Definition of Done
- [ ] User can sign up, connect Telegram channel via bot, see posts appear in dashboard
- [ ] User can select a post, click "Adapt for LinkedIn", get AI-generated English version, review, edit, and schedule/post
- [ ] Same flow works for Twitter/X
- [ ] Scheduling calendar shows all upcoming posts across platforms
- [ ] Analytics page shows post performance metrics
- [ ] Free tier enforces 5 cross-posts/month limit
- [ ] All critical paths covered by vitest unit tests + Playwright E2E tests
- [ ] App deploys to Vercel with zero manual steps (CI/CD via GitHub)

### Must Have
- Supabase Auth with email + OAuth (Google, GitHub) sign-in
- Telegram Bot API integration via webhooks (not polling)
- AI content adaptation with user-editable results before posting
- Platform-specific formatting (LinkedIn professional tone, Twitter concise + threads)
- Timezone-aware scheduling with recurring post support
- Usage tracking + tier enforcement (free/plus/pro limits)
- Russian + English UI (i18n)
- Responsive design (works on mobile browsers, not native app)
- Proper error handling with user-facing error states for every API failure

### Must NOT Have (Guardrails)
- NO MTProto/User API (ToS risk, only Bot API)
- NO AI image generation (deferred to V2)
- NO competitor channel tracking (deferred to V2)
- NO comment analysis or viral prediction (deferred to V2)
- NO mobile native app (web responsive only)
- NO team/collaboration features (solo creator only)
- NO multi-payment (Stripe only, no YooMoney/QIWI in V1)
- NO over-abstraction — no unnecessary design patterns, no premature service layers
- NO "clever" code — readable > clever. Comments only where WHY is non-obvious
- NO empty catch blocks — all errors must be logged and surfaced to user
- NO `as any` or `@ts-ignore` — fix the types properly
- NO placeholder/mock data in production — every screen must work with real data or show proper empty states

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO (greenfield — must set up)
- **Automated tests**: YES — Full TDD
- **Framework**: vitest (unit/integration) + Playwright (E2E)
- **TDD Flow**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR
- **Test setup**: Included as Task 2 (Wave 1)

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Database**: Use Bash (psql/supabase CLI) — Query tables, verify schema
- **AI Pipeline**: Use Bash (node/bun REPL) — Call adaptation function, verify output format

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — all independent, MAX PARALLEL):
├── Task 1: Project scaffolding + Next.js 15 + Tailwind + shadcn/ui [quick]
├── Task 2: Test infrastructure (vitest + Playwright + test utilities) [quick]
├── Task 3: Supabase project + DB schema + Drizzle ORM setup [quick]
├── Task 4: Supabase Auth + protected routes + middleware [quick]
├── Task 5: i18n setup (next-intl, RU + EN) [quick]
├── Task 6: UI shell (layout, sidebar, navigation, theme) [visual-engineering]
└── Task 7: Inngest setup + dev server + first test function [quick]

Wave 2 (Core Data + Telegram — after Wave 1):
├── Task 8: Telegram Bot setup + webhook pipeline + post ingestion (depends: 3, 7) [deep]
├── Task 9: Content library CRUD + search + categories (depends: 3, 6) [unspecified-high]
├── Task 10: Media library + Supabase Storage integration (depends: 3, 6) [unspecified-high]
├── Task 11: Scheduling engine + calendar UI (depends: 3, 6, 7) [deep]
├── Task 12: Telegram message parser (formatting → structured data) (depends: 3) [unspecified-high]
└── Task 13: Channel management UI (connect/disconnect, status, settings) (depends: 3, 6, 8) [visual-engineering]

Wave 3 (Cross-Posting Engine — after Wave 2):
├── Task 14: OpenRouter AI provider abstraction layer (depends: 7) [deep]
├── Task 15: AI content adaptation engine (RU→EN, platform-specific) (depends: 12, 14) [deep]
├── Task 16: Channel profiling — AI analyzes past posts for tone/niche (depends: 8, 14) [deep]
├── Task 17: LinkedIn OAuth + posting integration (depends: 3, 7) [unspecified-high]
├── Task 18: Twitter/X OAuth + posting integration (depends: 3, 7) [unspecified-high]
└── Task 19: Cross-post workflow UI (select post → adapt → preview → schedule/post) (depends: 6, 15, 17, 18) [visual-engineering]

Wave 4 (Analytics + Billing — after Wave 3):
├── Task 20: Analytics data collection (track posts, engagements, growth) (depends: 3, 17, 18) [unspecified-high]
├── Task 21: Analytics dashboard UI (charts, metrics, best times) (depends: 6, 20) [visual-engineering]
├── Task 22: Stripe billing integration + subscription tiers (depends: 3, 4) [deep]
├── Task 23: Usage tracking + tier enforcement (free/plus/pro limits) (depends: 3, 22) [unspecified-high]
└── Task 24: Welcome message template editor (depends: 3, 6, 8) [unspecified-high]

Wave 5 (Integration + Polish — after Wave 4):
├── Task 25: Multi-platform broadcasting (schedule to TG + LinkedIn + Twitter at once) (depends: 11, 17, 18, 19) [deep]
├── Task 26: Recurring post schedules (depends: 11, 25) [unspecified-high]
├── Task 27: Dashboard home page (overview, recent activity, quick actions) (depends: 6, 20, 21) [visual-engineering]
├── Task 28: Settings page (profile, connected accounts, billing, preferences) (depends: 4, 6, 17, 18, 22) [visual-engineering]
├── Task 29: Error handling + empty states + loading states (full audit) (depends: all UI tasks) [unspecified-high]
└── Task 30: CI/CD pipeline (GitHub Actions → Vercel deploy + test + lint) (depends: 1, 2) [quick]

Wave FINAL (Verification — after ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Full E2E QA — Playwright (unspecified-high + playwright skill)
└── Task F4: Scope fidelity check (deep)

Critical Path: T1 → T3 → T8 → T12 → T15 → T19 → T25 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2-7, all | 1 |
| 2 | 1 | all tests, 30 | 1 |
| 3 | 1 | 8-13, 17-18, 20, 22-24 | 1 |
| 4 | 1 | 22, 28 | 1 |
| 5 | 1 | all UI tasks | 1 |
| 6 | 1 | 9-11, 13, 19, 21, 24, 27-28 | 1 |
| 7 | 1 | 8, 11, 14, 17, 18 | 1 |
| 8 | 3, 7 | 12, 13, 16, 24 | 2 |
| 9 | 3, 6 | — | 2 |
| 10 | 3, 6 | — | 2 |
| 11 | 3, 6, 7 | 25, 26 | 2 |
| 12 | 3 | 15 | 2 |
| 13 | 3, 6, 8 | — | 2 |
| 14 | 7 | 15, 16 | 3 |
| 15 | 12, 14 | 19 | 3 |
| 16 | 8, 14 | — | 3 |
| 17 | 3, 7 | 19, 20, 25, 28 | 3 |
| 18 | 3, 7 | 19, 20, 25, 28 | 3 |
| 19 | 6, 15, 17, 18 | 25 | 3 |
| 20 | 3, 17, 18 | 21, 27 | 4 |
| 21 | 6, 20 | 27 | 4 |
| 22 | 3, 4 | 23, 28 | 4 |
| 23 | 3, 22 | — | 4 |
| 24 | 3, 6, 8 | — | 4 |
| 25 | 11, 17, 18, 19 | 26 | 5 |
| 26 | 11, 25 | — | 5 |
| 27 | 6, 20, 21 | — | 5 |
| 28 | 4, 6, 17, 18, 22 | — | 5 |
| 29 | all UI tasks | — | 5 |
| 30 | 1, 2 | — | 5 |
| F1-F4 | ALL | — | FINAL |

### Agent Dispatch Summary

- **Wave 1** (7 tasks): T1→`quick`, T2→`quick`, T3→`quick`, T4→`quick`, T5→`quick`, T6→`visual-engineering`, T7→`quick`
- **Wave 2** (6 tasks): T8→`deep`, T9→`unspecified-high`, T10→`unspecified-high`, T11→`deep`, T12→`unspecified-high`, T13→`visual-engineering`
- **Wave 3** (6 tasks): T14→`deep`, T15→`deep`, T16→`deep`, T17→`unspecified-high`, T18→`unspecified-high`, T19→`visual-engineering`
- **Wave 4** (5 tasks): T20→`unspecified-high`, T21→`visual-engineering`, T22→`deep`, T23→`unspecified-high`, T24→`unspecified-high`
- **Wave 5** (6 tasks): T25→`deep`, T26→`unspecified-high`, T27→`visual-engineering`, T28→`visual-engineering`, T29→`unspecified-high`, T30→`quick`
- **FINAL** (4 tasks): F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`+`playwright`, F4→`deep`

---

## TODOs

### Wave 1 — Foundation (all independent, MAX PARALLEL)

- [x] 1. Project Scaffolding — Next.js 15 + Tailwind + shadcn/ui

  **What to do**:
  - Initialize Next.js 15 project with App Router, TypeScript strict mode
  - Install and configure Tailwind CSS 4 + shadcn/ui
  - Set up project structure: `src/app/`, `src/components/`, `src/lib/`, `src/server/`, `src/types/`
  - Configure path aliases (`@/` for src)
  - Set up ESLint (strict TypeScript rules) + Prettier
  - Add `.env.local.example` with all required env vars (documented)
  - Create `bun` workspace with scripts: `dev`, `build`, `lint`, `test`, `test:e2e`
  - Add `.gitignore`, initial `README.md` with setup instructions

  **Must NOT do**:
  - No placeholder pages beyond a health check route
  - No component library customization yet (just install defaults)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard scaffolding, well-documented setup steps

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7 (everything)
  - **Blocked By**: None (can start immediately)

  **References**:
  - **External**: Next.js 15 App Router docs: https://nextjs.org/docs/app
  - **External**: shadcn/ui installation for Next.js: https://ui.shadcn.com/docs/installation/next
  - **External**: Tailwind CSS 4 + Next.js: https://tailwindcss.com/docs/installation/framework-guides/nextjs

  **Acceptance Criteria**:
  - [ ] `bun dev` starts dev server on localhost:3000 without errors
  - [ ] `bun build` completes with 0 TypeScript errors
  - [ ] `bun lint` passes with 0 errors
  - [ ] `/api/health` returns `{"status":"ok"}` (200)
  - [ ] shadcn/ui Button component renders correctly

  **QA Scenarios:**
  ```
  Scenario: Dev server starts successfully
    Tool: Bash
    Preconditions: Fresh clone, `bun install` completed
    Steps:
      1. Run `bun dev &` and wait 10s for server start
      2. `curl -s http://localhost:3000/api/health`
      3. Assert response body is `{"status":"ok"}`
      4. Assert HTTP status is 200
    Expected Result: Health endpoint returns valid JSON with status ok
    Failure Indicators: Connection refused, non-200 status, missing route
    Evidence: .sisyphus/evidence/task-1-dev-server.txt

  Scenario: Build succeeds with zero errors
    Tool: Bash
    Preconditions: Dev dependencies installed
    Steps:
      1. Run `bun run build 2>&1`
      2. Assert exit code is 0
      3. Assert output does NOT contain "error" or "Error"
    Expected Result: Build completes cleanly, `.next/` directory created
    Failure Indicators: Non-zero exit code, TypeScript errors, missing modules
    Evidence: .sisyphus/evidence/task-1-build.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `chore: initialize Next.js 15 project with Tailwind, shadcn/ui, ESLint`
  - Files: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `src/app/**`
  - Pre-commit: `bun lint`

- [x] 2. Test Infrastructure — vitest + Playwright + Test Utilities

  **What to do**:
  - Install vitest, @testing-library/react, @testing-library/jest-dom, happy-dom
  - Configure vitest with `vitest.config.ts` (happy-dom environment, path aliases, coverage)
  - Install Playwright and configure `playwright.config.ts` (chromium only for speed, base URL localhost:3000)
  - Create test utilities: `src/test/setup.ts` (global test setup), `src/test/utils.tsx` (render with providers), `src/test/factories.ts` (test data factories)
  - Create `src/test/mocks/` directory for mock providers (Supabase, Inngest, etc.)
  - Write ONE example unit test (`src/lib/utils.test.ts`) and ONE example E2E test (`e2e/health.spec.ts`) to verify setup
  - Add test scripts to package.json: `test`, `test:watch`, `test:coverage`, `test:e2e`

  **Must NOT do**:
  - No test files for features not yet built
  - No complex mock infrastructure beyond basic provider wrappers

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Standard test infrastructure setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-7)
  - **Blocks**: All tasks (every task writes tests), Task 30
  - **Blocked By**: Task 1 (needs project to exist)

  **References**:
  - **External**: vitest with Next.js: https://nextjs.org/docs/app/building-your-application/testing/vitest
  - **External**: Playwright installation: https://playwright.dev/docs/intro
  - **External**: Testing Library React: https://testing-library.com/docs/react-testing-library/intro/

  **Acceptance Criteria**:
  - [ ] `bun test` runs and the example unit test passes
  - [ ] `bunx playwright test` runs and the example E2E test passes
  - [ ] `bun test:coverage` generates coverage report
  - [ ] Test utilities export `render`, `screen`, `userEvent` wrappers

  **QA Scenarios:**
  ```
  Scenario: Unit test suite runs successfully
    Tool: Bash
    Preconditions: Task 1 complete, test dependencies installed
    Steps:
      1. Run `bun test --run 2>&1`
      2. Assert exit code is 0
      3. Assert output contains "1 passed" or "Tests  1 passed"
    Expected Result: Example unit test passes
    Failure Indicators: Test failure, import errors, configuration issues
    Evidence: .sisyphus/evidence/task-2-unit-tests.txt

  Scenario: E2E test runs against dev server
    Tool: Bash
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Run `bunx playwright test e2e/health.spec.ts 2>&1`
      2. Assert exit code is 0
      3. Assert output contains "passed"
    Expected Result: Health check E2E test passes in chromium
    Failure Indicators: Browser launch failure, timeout, connection refused
    Evidence: .sisyphus/evidence/task-2-e2e-tests.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `chore: add vitest + Playwright test infrastructure with examples`
  - Files: `vitest.config.ts`, `playwright.config.ts`, `src/test/**`, `e2e/**`
  - Pre-commit: `bun test --run`

- [x] 3. Supabase Project + DB Schema + Drizzle ORM

  **What to do**:
  - Install Drizzle ORM + drizzle-kit + @supabase/supabase-js + @supabase/ssr
  - Configure Drizzle with `drizzle.config.ts` pointing to Supabase Postgres (via `DATABASE_URL`)
  - Create full database schema in `src/server/db/schema/`:
    - `users.ts`: id, email, name, avatar_url, locale (ru/en), created_at, updated_at
    - `subscriptions.ts`: id, user_id, stripe_customer_id, stripe_subscription_id, plan (free/plus/pro), status, current_period_start, current_period_end
    - `telegram_channels.ts`: id, user_id, telegram_chat_id, title, username, description, member_count, bot_token_encrypted, webhook_secret, connected_at
    - `telegram_posts.ts`: id, channel_id, telegram_message_id, content_raw, content_parsed (JSON), media_urls (JSON array), views, forwards, reactions (JSON), posted_at
    - `platform_connections.ts`: id, user_id, platform (linkedin/twitter), access_token_encrypted, refresh_token_encrypted, token_expires_at, platform_user_id, platform_username, connected_at
    - `cross_posts.ts`: id, user_id, source_post_id (FK telegram_posts), platform, adapted_content, original_language, target_language, ai_model_used, platform_post_id (after posting), status (draft/scheduled/posted/failed), scheduled_for, posted_at, engagement_data (JSON)
    - `schedules.ts`: id, user_id, cross_post_id, scheduled_at, timezone, is_recurring, recurrence_rule (cron), status (pending/processing/completed/failed/cancelled), processed_at
    - `content_library.ts`: id, user_id, title, content, category, tags (JSON array), is_template, created_at
    - `media_files.ts`: id, user_id, storage_path, filename, mime_type, size_bytes, thumbnail_url, created_at
    - `channel_profiles.ts`: id, channel_id, niche, tone, top_topics (JSON), language, generated_at
    - `usage_tracking.ts`: id, user_id, month (YYYY-MM), cross_posts_count, ai_calls_count
    - `welcome_messages.ts`: id, channel_id, content, language, is_active, created_at
  - Create Drizzle migration: `bunx drizzle-kit generate` + `bunx drizzle-kit migrate`
  - Create DB client singleton in `src/server/db/index.ts`
  - Create seed script `src/server/db/seed.ts` with test data
  - Write unit tests for schema relations

  **Must NOT do**:
  - No Row-Level Security policies yet (add when auth integration works)
  - No stored procedures or triggers

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Schema definition is well-structured, Drizzle has excellent docs

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4-7)
  - **Blocks**: Tasks 8-13, 17, 18, 20, 22-24
  - **Blocked By**: Task 1

  **References**:
  - **External**: Drizzle ORM with Supabase: https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
  - **External**: Drizzle schema declaration: https://orm.drizzle.team/docs/sql-schema-declaration
  - **External**: Supabase connection string: https://supabase.com/docs/guides/database/connecting-to-postgres

  **Acceptance Criteria**:
  - [ ] All 12 tables defined in `src/server/db/schema/`
  - [ ] `bunx drizzle-kit generate` creates migration SQL files
  - [ ] `bunx drizzle-kit migrate` applies to Supabase Postgres without errors
  - [ ] DB client can query users table: `await db.select().from(users).limit(1)`
  - [ ] Seed script populates test data successfully
  - [ ] Unit tests verify foreign key relations

  **QA Scenarios:**
  ```
  Scenario: Schema migration applies cleanly
    Tool: Bash
    Preconditions: Supabase project created, DATABASE_URL in .env.local
    Steps:
      1. Run `bunx drizzle-kit generate 2>&1`
      2. Assert exit code 0 and migration files created in `drizzle/`
      3. Run `bunx drizzle-kit migrate 2>&1`
      4. Assert exit code 0
      5. Run `bun run src/server/db/seed.ts 2>&1`
      6. Assert exit code 0 and output shows inserted rows
    Expected Result: All 12 tables created in Supabase Postgres with seed data
    Failure Indicators: SQL syntax error, missing columns, FK constraint violations
    Evidence: .sisyphus/evidence/task-3-migration.txt

  Scenario: DB client queries work from Next.js
    Tool: Bash
    Preconditions: Migration applied, seed data present
    Steps:
      1. Create temporary test script that imports db client and runs select
      2. Run `bun run /tmp/db-test.ts 2>&1`
      3. Assert returns array of user objects with expected fields
    Expected Result: Query returns seeded user data with correct types
    Failure Indicators: Connection error, empty result, type mismatch
    Evidence: .sisyphus/evidence/task-3-db-query.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(db): Supabase + Drizzle ORM schema with 12 tables, migrations, seed`
  - Files: `drizzle.config.ts`, `src/server/db/**`, `drizzle/**`
  - Pre-commit: `bun test --run`

---

- [x] 4. Supabase Auth + Protected Routes + Middleware

  **What to do**:
  - Configure Supabase Auth with email/password + Google OAuth + GitHub OAuth providers
  - Create auth helper utilities in `src/lib/supabase/`: `client.ts` (browser client), `server.ts` (server client), `middleware.ts`
  - Implement Next.js middleware (`src/middleware.ts`) that:
    - Refreshes Supabase auth session on every request
    - Redirects unauthenticated users from `/dashboard/*` to `/login`
    - Redirects authenticated users from `/login`, `/signup` to `/dashboard`
  - Create auth pages: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`
  - Create auth forms with shadcn/ui: email/password login, signup, OAuth buttons (Google, GitHub)
  - Implement sign-out functionality
  - Create `src/app/(dashboard)/layout.tsx` — protected layout that fetches user session
  - Create server action `src/server/actions/auth.ts` for signup/login/logout
  - Write TDD tests: login flow, signup flow, middleware redirect, session refresh

  **Must NOT do**:
  - No custom JWT handling — use Supabase session management
  - No role-based access control (RBAC) yet — all authenticated users equal for now

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Supabase Auth has excellent Next.js guides, well-documented pattern

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-7)
  - **Blocks**: Tasks 22, 28
  - **Blocked By**: Task 1

  **References**:
  - **External**: Supabase Auth with Next.js SSR: https://supabase.com/docs/guides/auth/server-side/nextjs
  - **External**: Supabase OAuth providers: https://supabase.com/docs/guides/auth/social-login
  - **External**: Next.js middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware

  **Acceptance Criteria**:
  - [ ] Email/password signup creates user in Supabase
  - [ ] Email/password login returns valid session
  - [ ] Google OAuth login works end-to-end
  - [ ] Unauthenticated `/dashboard` redirects to `/login`
  - [ ] Authenticated `/login` redirects to `/dashboard`
  - [ ] Sign-out clears session and redirects to `/login`
  - [ ] TDD tests pass for all auth flows

  **QA Scenarios:**
  ```
  Scenario: Full signup → login → dashboard → logout flow
    Tool: Playwright (playwright skill)
    Preconditions: Supabase project configured with auth enabled, app running
    Steps:
      1. Navigate to http://localhost:3000/login
      2. Click "Sign up" link, navigate to /signup
      3. Fill email input (`[name="email"]`) with "test-e2e@example.com"
      4. Fill password input (`[name="password"]`) with "TestPassword123!"
      5. Click submit button (`button[type="submit"]`)
      6. Assert URL changes to /dashboard (or /login for email confirmation flow)
      7. If email confirmation required: manually confirm via Supabase dashboard or API
      8. Navigate to /login, enter credentials, submit
      9. Assert URL is /dashboard and page contains user email text
      10. Click logout button, assert redirect to /login
    Expected Result: Full auth cycle completes, session is created and destroyed
    Failure Indicators: Redirect loops, session not persisted, OAuth popup blocked
    Evidence: .sisyphus/evidence/task-4-auth-flow.png

  Scenario: Unauthenticated user is redirected from dashboard
    Tool: Playwright (playwright skill)
    Preconditions: No active session (fresh browser context)
    Steps:
      1. Navigate directly to http://localhost:3000/dashboard
      2. Assert URL redirects to /login
      3. Assert /login page renders with login form visible
    Expected Result: Middleware redirects unauthenticated users to login
    Failure Indicators: Dashboard loads without auth, no redirect, 500 error
    Evidence: .sisyphus/evidence/task-4-auth-redirect.png
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(auth): Supabase Auth with email/password + OAuth, protected routes, middleware`
  - Files: `src/middleware.ts`, `src/lib/supabase/**`, `src/app/(auth)/**`, `src/server/actions/auth.ts`
  - Pre-commit: `bun test --run`

- [x] 5. i18n Setup — next-intl with Russian + English

  **What to do**:
  - Install `next-intl` and configure for Next.js App Router
  - Set up locale detection: browser language → user preference → default (ru)
  - Create message files: `src/messages/en.json`, `src/messages/ru.json`
  - Structure messages by feature: `auth.*`, `dashboard.*`, `nav.*`, `common.*`, `scheduling.*`, `crosspost.*`, `analytics.*`, `billing.*`
  - Create `src/i18n/request.ts` for server-side locale resolution
  - Create `src/i18n/routing.ts` for locale-prefixed routes (`/en/dashboard`, `/ru/dashboard`)
  - Add language switcher component (dropdown in header/sidebar)
  - Write initial translations for auth pages and navigation
  - Write TDD test: locale switching, correct message rendering

  **Must NOT do**:
  - No machine translation — write actual Russian and English strings
  - No more than auth + nav + common translations (other features add their own later)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: next-intl has clear Next.js App Router guide, straightforward setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6-7)
  - **Blocks**: All UI tasks (they use translated strings)
  - **Blocked By**: Task 1

  **References**:
  - **External**: next-intl App Router setup: https://next-intl.dev/docs/getting-started/app-router
  - **External**: next-intl routing: https://next-intl.dev/docs/routing

  **Acceptance Criteria**:
  - [ ] `/en/login` renders English login page
  - [ ] `/ru/login` renders Russian login page
  - [ ] Language switcher toggles between locales
  - [ ] Browser without preference defaults to Russian
  - [ ] All auth page strings come from message files (no hardcoded text)
  - [ ] TDD test verifies locale switching

  **QA Scenarios:**
  ```
  Scenario: Locale switching works correctly
    Tool: Playwright (playwright skill)
    Preconditions: App running with i18n configured
    Steps:
      1. Navigate to http://localhost:3000/ru/login
      2. Assert page contains Russian text "Войти" or "Вход" (login in Russian)
      3. Click language switcher, select "English"
      4. Assert URL changes to /en/login
      5. Assert page contains English text "Sign in" or "Log in"
    Expected Result: Page content switches language without page reload (or with smooth transition)
    Failure Indicators: Missing translations (shows keys), 404 on locale route, flash of untranslated content
    Evidence: .sisyphus/evidence/task-5-i18n-switch.png
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(i18n): next-intl with Russian + English, locale detection, language switcher`
  - Files: `src/i18n/**`, `src/messages/**`, `src/components/language-switcher.tsx`
  - Pre-commit: `bun test --run`

- [x] 6. UI Shell — Dashboard Layout, Sidebar Navigation, Theme

  **What to do**:
  - Create main dashboard layout with responsive sidebar navigation:
    - Sidebar items: Dashboard (home), Posts (content library), Channels, Schedule (calendar), Analytics, Media, Settings
    - Collapsible sidebar for mobile
    - User avatar + name in sidebar footer with dropdown (settings, logout)
  - Implement dark/light theme toggle using shadcn/ui theme provider
  - Create reusable layout components:
    - `src/components/layout/sidebar.tsx` — main navigation sidebar
    - `src/components/layout/header.tsx` — top bar with breadcrumbs, search, language switcher
    - `src/components/layout/page-header.tsx` — page title + description + actions slot
    - `src/components/layout/shell.tsx` — combines sidebar + header + main content area
  - Create placeholder pages for each nav item (just page-header + "Coming soon")
  - Ensure all text uses i18n translations (from Task 5 message files)
  - Write TDD tests for sidebar rendering, navigation, theme toggle, responsive collapse

  **Must NOT do**:
  - No feature implementation in pages — just layout shell with placeholders
  - No custom icons — use lucide-react (ships with shadcn/ui)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Dashboard layout and navigation design requires UI/UX sensibility

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5, 7)
  - **Blocks**: Tasks 9, 10, 11, 13, 19, 21, 24, 27, 28
  - **Blocked By**: Task 1 (needs project), Task 5 (needs i18n for strings)

  **References**:
  - **External**: shadcn/ui sidebar component: https://ui.shadcn.com/docs/components/sidebar
  - **External**: shadcn/ui dark mode: https://ui.shadcn.com/docs/dark-mode/next
  - **External**: lucide-react icons: https://lucide.dev/icons/

  **Acceptance Criteria**:
  - [ ] Dashboard layout renders with sidebar, header, and main content area
  - [ ] All 7 nav items present and clickable (navigate to placeholder pages)
  - [ ] Sidebar collapses on mobile viewport (<768px)
  - [ ] Dark/light theme toggle works and persists across page loads
  - [ ] User info displays in sidebar footer
  - [ ] All visible text comes from i18n message files
  - [ ] TDD tests pass for layout components

  **QA Scenarios:**
  ```
  Scenario: Dashboard layout renders correctly on desktop
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, app running
    Steps:
      1. Navigate to http://localhost:3000/en/dashboard
      2. Assert sidebar is visible (`.sidebar` or `[data-testid="sidebar"]`)
      3. Assert sidebar contains 7 navigation items
      4. Click "Schedule" nav item
      5. Assert URL changes to /en/dashboard/schedule
      6. Assert page header shows "Schedule" title
      7. Take screenshot at 1920x1080 viewport
    Expected Result: Full dashboard shell with working navigation
    Failure Indicators: Sidebar missing, nav items not clickable, layout broken
    Evidence: .sisyphus/evidence/task-6-dashboard-desktop.png

  Scenario: Sidebar collapses on mobile
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, app running
    Steps:
      1. Set viewport to 375x812 (iPhone dimensions)
      2. Navigate to http://localhost:3000/en/dashboard
      3. Assert sidebar is hidden or collapsed
      4. Click hamburger menu button
      5. Assert sidebar slides in as overlay
      6. Take screenshot
    Expected Result: Mobile-responsive sidebar with hamburger toggle
    Failure Indicators: Sidebar overlaps content, hamburger missing, no animation
    Evidence: .sisyphus/evidence/task-6-dashboard-mobile.png
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(ui): dashboard shell with sidebar, navigation, theme toggle, responsive layout`
  - Files: `src/components/layout/**`, `src/app/(dashboard)/**`
  - Pre-commit: `bun test --run`

- [x] 7. Inngest Setup — Dev Server + First Test Function

  **What to do**:
  - Install `inngest` and `inngest/next` packages
  - Create Inngest client in `src/lib/inngest/client.ts`
  - Create Inngest API route at `src/app/api/inngest/route.ts` (serves Inngest functions)
  - Create first test function: `src/lib/inngest/functions/hello-world.ts` — logs a message and returns success
  - Create scheduled function example: `src/lib/inngest/functions/scheduled-example.ts` — runs every minute, logs timestamp (for verifying cron works)
  - Configure Inngest dev server in `package.json` script: `inngest-dev`
  - Create `src/lib/inngest/functions/index.ts` barrel export for all functions
  - Write TDD test for function invocation (mock Inngest step runner)

  **Must NOT do**:
  - No production functions yet — just hello-world and scheduled example
  - No Inngest Cloud connection yet (dev mode only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Inngest has excellent Next.js quickstart, minimal setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-6)
  - **Blocks**: Tasks 8, 11, 14, 17, 18
  - **Blocked By**: Task 1

  **References**:
  - **External**: Inngest Quick Start with Next.js: https://www.inngest.com/docs/getting-started/nextjs-quick-start
  - **External**: Inngest functions reference: https://www.inngest.com/docs/reference/functions/create
  - **External**: Inngest scheduled functions: https://www.inngest.com/docs/guides/scheduled-functions

  **Acceptance Criteria**:
  - [ ] Inngest dev server starts alongside Next.js dev server
  - [ ] Inngest dev UI accessible at localhost:8288
  - [ ] Hello-world function appears in Inngest dev UI
  - [ ] Triggering hello-world function from dev UI shows successful execution
  - [ ] Scheduled function runs every minute in dev mode
  - [ ] TDD test verifies function step execution

  **QA Scenarios:**
  ```
  Scenario: Inngest dev server and function registration
    Tool: Bash
    Preconditions: App running with Inngest dev server (`bun run inngest-dev`)
    Steps:
      1. Wait 5s for Inngest dev server startup
      2. `curl -s http://localhost:8288/v1/events` — assert 200 response
      3. `curl -s http://localhost:3000/api/inngest` — assert registration endpoint responds
      4. Check Inngest dev UI shows registered functions
    Expected Result: Inngest dev server running, functions registered
    Failure Indicators: Port 8288 not listening, functions not discovered, registration error
    Evidence: .sisyphus/evidence/task-7-inngest-dev.txt

  Scenario: Hello-world function executes successfully
    Tool: Bash
    Preconditions: Inngest dev server running
    Steps:
      1. Send event to trigger function: `curl -X POST http://localhost:8288/v1/e/test/hello -d '{"name":"test/hello","data":{}}'`
      2. Wait 3s for execution
      3. Check Inngest dev UI or logs for successful completion
    Expected Result: Function executes and logs success message
    Failure Indicators: Function not found, execution error, timeout
    Evidence: .sisyphus/evidence/task-7-inngest-hello.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(inngest): background job infrastructure with dev server and test functions`
  - Files: `src/lib/inngest/**`, `src/app/api/inngest/**`
  - Pre-commit: `bun test --run`

---

### Wave 2 — Core Data + Telegram (after Wave 1)

- [x] 8. Telegram Bot Setup + Webhook Pipeline + Post Ingestion

  **What to do**:
  - Create Telegram bot via @BotFather, store bot token in env vars
  - Implement webhook endpoint at `src/app/api/telegram/webhook/route.ts`:
    - Verify webhook secret (X-Telegram-Bot-Api-Secret-Token header)
    - Parse incoming updates: `channel_post`, `edited_channel_post`, `message_reaction_count`
    - Store new channel posts in `telegram_posts` table via Drizzle
    - Trigger Inngest event `telegram/post.received` for async processing
  - Create Telegram API client wrapper in `src/lib/telegram/client.ts`:
    - `setWebhook(url, secret)`, `deleteWebhook()`, `getMe()`, `getChatMemberCount(chatId)`
    - `sendMessage(chatId, text, options)`, `getChat(chatId)`
  - Create channel connection flow:
    - User enters channel username in UI
    - Backend verifies bot is admin of that channel via `getChat`
    - Stores channel in `telegram_channels` table
    - Sets webhook for that bot instance
  - Handle media groups (Telegram sends multiple messages for album posts — need to batch them within 1s window)
  - Implement retry logic with exponential backoff for Telegram API calls
  - Write TDD tests: webhook parsing, post storage, media group batching, auth verification

  **Must NOT do**:
  - No long polling — webhooks only
  - No MTProto / User API — Bot API only
  - No comment reading (Bot API doesn't support it)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Webhook reliability, media group handling, and retry logic require careful implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9-13)
  - **Blocks**: Tasks 12, 13, 16, 24
  - **Blocked By**: Tasks 3 (DB schema), 7 (Inngest)

  **References**:
  - **External**: Telegram Bot API: https://core.telegram.org/bots/api
  - **External**: Telegram Webhooks guide: https://core.telegram.org/bots/webhooks
  - **External**: Telegram Update object: https://core.telegram.org/bots/api#update
  - **External**: Channel post updates: https://core.telegram.org/bots/api#message

  **Acceptance Criteria**:
  - [ ] Webhook endpoint receives and parses Telegram channel_post updates
  - [ ] Posts stored in `telegram_posts` with content_raw, content_parsed, media_urls
  - [ ] Media groups batched into single post record
  - [ ] `telegram/post.received` Inngest event fires on new post
  - [ ] Invalid webhook requests (bad secret) return 403
  - [ ] TDD tests pass for all webhook scenarios

  **QA Scenarios:**
  ```
  Scenario: Webhook receives and stores a channel post
    Tool: Bash (curl)
    Preconditions: App running, DB migrated, webhook secret configured
    Steps:
      1. Send mock Telegram webhook payload:
         curl -X POST http://localhost:3000/api/telegram/webhook \
           -H "Content-Type: application/json" \
           -H "X-Telegram-Bot-Api-Secret-Token: test-secret" \
           -d '{"update_id":123,"channel_post":{"message_id":1,"chat":{"id":-1001234,"title":"Test Channel","type":"channel"},"date":1700000000,"text":"Привет мир!"}}'
      2. Assert HTTP 200 response
      3. Query DB: select from telegram_posts where telegram_message_id = 1
      4. Assert row exists with content_raw = "Привет мир!"
    Expected Result: Post stored in database with correct parsed content
    Failure Indicators: 500 error, missing row, encoding issues with Cyrillic
    Evidence: .sisyphus/evidence/task-8-webhook-post.txt

  Scenario: Invalid webhook secret is rejected
    Tool: Bash (curl)
    Preconditions: App running
    Steps:
      1. Send webhook with wrong secret:
         curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/telegram/webhook \
           -H "X-Telegram-Bot-Api-Secret-Token: wrong-secret" \
           -d '{"update_id":1}'
      2. Assert HTTP status is 403
    Expected Result: Unauthorized webhook request rejected
    Failure Indicators: 200 response (accepting without auth), 500 error
    Evidence: .sisyphus/evidence/task-8-webhook-reject.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(telegram): bot webhook pipeline, post ingestion, media group batching`
  - Files: `src/app/api/telegram/**`, `src/lib/telegram/**`, `src/lib/inngest/functions/telegram/**`
  - Pre-commit: `bun test --run`

- [x] 9. Content Library CRUD + Search + Categories

  **What to do**:
  - Create content library feature at `src/app/(dashboard)/content/`:
    - List view with search bar, category filter, and sort (newest/oldest/most used)
    - Create/edit modal with rich text editor (use shadcn/ui textarea + basic markdown preview)
    - Category management (create, rename, delete categories)
    - Tag support (comma-separated tags, filterable)
    - "Use as template" action — copies content to cross-post editor
  - Create server actions in `src/server/actions/content.ts`:
    - `createContent()`, `updateContent()`, `deleteContent()`, `listContent(filters)`, `searchContent(query)`
  - Implement full-text search using Postgres `tsvector` + Drizzle raw SQL
  - Write TDD tests: CRUD operations, search ranking, category filtering, pagination

  **Must NOT do**:
  - No WYSIWYG editor — plain text + markdown is sufficient
  - No version history

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Standard CRUD with search, moderate complexity

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 10-13)
  - **Blocks**: None directly
  - **Blocked By**: Tasks 3 (DB), 6 (UI shell)

  **References**:
  - **External**: Drizzle CRUD operations: https://orm.drizzle.team/docs/insert
  - **External**: Postgres full-text search: https://www.postgresql.org/docs/current/textsearch.html
  - **External**: shadcn/ui data table: https://ui.shadcn.com/docs/components/data-table

  **Acceptance Criteria**:
  - [ ] Content list page shows all user's content items with pagination
  - [ ] Create new content item with title, body, category, tags
  - [ ] Edit existing content item
  - [ ] Delete content with confirmation dialog
  - [ ] Search finds content by text match
  - [ ] Category filter narrows results
  - [ ] TDD tests pass for all CRUD + search operations

  **QA Scenarios:**
  ```
  Scenario: Create and search content
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, app running
    Steps:
      1. Navigate to /en/dashboard/content
      2. Click "New" button (`[data-testid="new-content-btn"]`)
      3. Fill title: "My crypto analysis template"
      4. Fill body: "Bitcoin is showing strong bullish signals..."
      5. Select category: "Templates"
      6. Add tags: "crypto, analysis"
      7. Click Save
      8. Assert new item appears in list
      9. Type "crypto" in search bar (`[data-testid="content-search"]`)
      10. Assert filtered list shows the created item
    Expected Result: Content created, persisted, and searchable
    Failure Indicators: Form validation errors, item not appearing, search returning empty
    Evidence: .sisyphus/evidence/task-9-content-crud.png
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(content): content library with CRUD, search, categories, tags`
  - Files: `src/app/(dashboard)/content/**`, `src/server/actions/content.ts`
  - Pre-commit: `bun test --run`

- [x] 10. Media Library + Supabase Storage Integration

  **What to do**:
  - Create media library feature at `src/app/(dashboard)/media/`:
    - Grid view with thumbnail previews (images/video posters)
    - Upload area with drag-and-drop (shadcn/ui + react-dropzone)
    - File type filters (images, videos, documents)
    - Delete with confirmation
  - Integrate with Supabase Storage:
    - Create storage bucket `media` with size limit policy (200MB free, 2GB plus, 5GB pro)
    - Upload files via Supabase Storage SDK
    - Generate signed URLs for private access
    - Store metadata in `media_files` table via Drizzle
  - Create reusable media picker component (`src/components/media-picker.tsx`) for use in other features
  - Implement image thumbnail generation (resize to 300x300 on upload)
  - Write TDD tests: upload flow, storage limits, file type validation, delete

  **Must NOT do**:
  - No AI image generation
  - No video transcoding
  - No folder organization (flat list with filters)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Supabase Storage integration is well-documented

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 11-13)
  - **Blocks**: None directly
  - **Blocked By**: Tasks 3 (DB), 6 (UI shell)

  **References**:
  - **External**: Supabase Storage: https://supabase.com/docs/guides/storage
  - **External**: Supabase Storage with Next.js: https://supabase.com/docs/guides/storage/uploads/standard-uploads

  **Acceptance Criteria**:
  - [ ] Upload image via drag-and-drop, appears in grid with thumbnail
  - [ ] Upload video, appears with video poster
  - [ ] Files stored in Supabase Storage `media` bucket
  - [ ] Metadata stored in `media_files` table
  - [ ] Delete removes from both Storage and database
  - [ ] File type validation rejects non-media files
  - [ ] TDD tests pass for upload/delete/list operations

  **QA Scenarios:**
  ```
  Scenario: Upload and display image
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, Supabase Storage configured
    Steps:
      1. Navigate to /en/dashboard/media
      2. Upload a test image via file input or drag-and-drop
      3. Wait for upload progress to complete (timeout: 30s)
      4. Assert uploaded image appears in grid with thumbnail
      5. Click on image, assert preview modal shows full-size
      6. Click delete, confirm dialog
      7. Assert image removed from grid
    Expected Result: Full upload → display → delete lifecycle works
    Failure Indicators: Upload hangs, thumbnail not generated, storage error
    Evidence: .sisyphus/evidence/task-10-media-upload.png
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(media): media library with Supabase Storage, drag-drop upload, thumbnails`
  - Files: `src/app/(dashboard)/media/**`, `src/components/media-picker.tsx`, `src/server/actions/media.ts`
  - Pre-commit: `bun test --run`

- [x] 11. Scheduling Engine + Calendar UI

  **What to do**:
  - Create scheduling feature at `src/app/(dashboard)/schedule/`:
    - Monthly/weekly/daily calendar view (use a React calendar library: `@schedule-x/react` or build with shadcn/ui calendar)
    - Drag-and-drop post scheduling (drag from content list to calendar slot)
    - Timezone selector (store user's timezone preference, display times in their zone)
    - Quick schedule: click time slot → create post dialog
    - Scheduled posts shown as cards on calendar with platform icons (TG/LinkedIn/Twitter)
  - Create scheduling engine in `src/lib/scheduling/`:
    - `createSchedule(postId, scheduledAt, timezone, platforms[])` — creates schedule record + Inngest cron job
    - `cancelSchedule(scheduleId)` — cancels Inngest job + updates status
    - `reschedulePost(scheduleId, newTime)` — cancels old + creates new
  - Create Inngest function `src/lib/inngest/functions/scheduling/execute-scheduled-post.ts`:
    - Triggered by cron at scheduled time
    - Fetches post content + platform connections
    - Dispatches platform-specific posting events
  - Write TDD tests: schedule creation, timezone conversion, cancel/reschedule, Inngest function

  **Must NOT do**:
  - No recurring schedules yet (Task 26)
  - No multi-platform posting yet (just store the intent; actual posting in Wave 3)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Calendar UI with drag-drop requires careful UX design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-10, 12-13)
  - **Blocks**: Tasks 25, 26
  - **Blocked By**: Tasks 3 (DB), 6 (UI shell), 7 (Inngest)

  **References**:
  - **External**: Inngest scheduled functions: https://www.inngest.com/docs/guides/scheduled-functions
  - **External**: date-fns-tz for timezone handling: https://date-fns.org/docs/Time-Zones
  - **External**: shadcn/ui calendar: https://ui.shadcn.com/docs/components/calendar

  **Acceptance Criteria**:
  - [ ] Calendar renders with month/week/day views
  - [ ] User can set timezone preference (persisted to DB)
  - [ ] Creating a schedule stores record + creates Inngest cron job
  - [ ] Scheduled posts appear as cards on calendar at correct times
  - [ ] Cancel removes from calendar + cancels Inngest job
  - [ ] Drag-to-reschedule updates both DB and Inngest job
  - [ ] TDD tests pass for scheduling logic and timezone conversions

  **QA Scenarios:**
  ```
  Scenario: Schedule a post and verify calendar display
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, content exists in library
    Steps:
      1. Navigate to /en/dashboard/schedule
      2. Assert calendar renders in month view
      3. Click tomorrow's date slot
      4. In schedule dialog: select a content item, set time to 14:00, select "LinkedIn"
      5. Click "Schedule"
      6. Assert a card appears on tomorrow's slot showing content title + LinkedIn icon
      7. Click the card, assert details panel shows correct time in user's timezone
    Expected Result: Post scheduled and visible on calendar with correct timezone
    Failure Indicators: Calendar not rendering, schedule not saving, timezone offset wrong
    Evidence: .sisyphus/evidence/task-11-schedule-calendar.png
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(schedule): calendar UI with timezone support, Inngest-backed scheduling engine`
  - Files: `src/app/(dashboard)/schedule/**`, `src/lib/scheduling/**`, `src/lib/inngest/functions/scheduling/**`
  - Pre-commit: `bun test --run`

- [x] 12. Telegram Message Parser (formatting → structured data)

  **What to do**:
  - Create message parser in `src/lib/telegram/parser.ts`:
    - Parse Telegram MessageEntity formatting (bold, italic, code, links, mentions, hashtags)
    - Convert to structured intermediate format: `{ blocks: [{ type, text, url?, ... }] }`
    - Handle media: extract file_ids for photos, videos, documents, audio
    - Handle media groups (albums): merge multiple messages into single content item
    - Handle forwarded messages: preserve original author attribution
    - Preserve Telegram-specific formatting (spoilers, custom emoji IDs)
  - Create format converters:
    - `toMarkdown(parsed)` — for content library storage and editing
    - `toPlainText(parsed)` — for AI adaptation input
    - `toHTML(parsed)` — for web preview rendering
  - Handle edge cases: empty messages, media-only posts, very long posts (4096 char limit in TG), UTF-8 entity offsets (Telegram uses UTF-16 offsets)
  - Write TDD tests: every entity type, media groups, edge cases, format conversions

  **Must NOT do**:
  - No AI processing of content (that's Task 15)
  - No rendering components (just data transformation)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Text parsing with edge cases, well-defined input/output

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-11, 13)
  - **Blocks**: Task 15 (AI adaptation needs parsed content)
  - **Blocked By**: Task 3 (DB schema for storage)

  **References**:
  - **External**: Telegram MessageEntity: https://core.telegram.org/bots/api#messageentity
  - **External**: Telegram message formatting: https://core.telegram.org/bots/api#formatting-options
  - **External**: UTF-16 offset handling: Telegram uses UTF-16 code units for entity offsets

  **Acceptance Criteria**:
  - [ ] Parses all Telegram entity types: bold, italic, underline, strikethrough, code, pre, text_link, mention, hashtag, url, spoiler
  - [ ] Handles UTF-16 offset conversion for Cyrillic/emoji text correctly
  - [ ] Media groups merged into single structured content
  - [ ] `toMarkdown()` produces valid markdown
  - [ ] `toPlainText()` strips all formatting
  - [ ] `toHTML()` produces safe HTML (no XSS)
  - [ ] TDD tests cover every entity type + edge cases (100% branch coverage on parser)

  **QA Scenarios:**
  ```
  Scenario: Parse complex Telegram message with mixed formatting
    Tool: Bash (bun REPL)
    Preconditions: Parser module exists
    Steps:
      1. Create test script that imports parseTelegramMessage
      2. Pass message: {Привет **мир**! 🌍} with entities [{type:"bold",offset:8,length:3}]
      3. Assert parsed.blocks[0].type === "text", blocks[1].type === "bold"
      4. Assert toMarkdown(parsed) === "Привет **мир**! 🌍"
      5. Assert toPlainText(parsed) === "Привет мир! 🌍"
    Expected Result: Correct parsing with UTF-16 offset handling for Cyrillic + emoji
    Failure Indicators: Wrong offset slicing, broken emoji, entity misalignment
    Evidence: .sisyphus/evidence/task-12-parser-complex.txt

  Scenario: Parse media group (album) into single content
    Tool: Bash (bun REPL)
    Preconditions: Parser module exists
    Steps:
      1. Pass array of 3 messages with same media_group_id
      2. Assert output is single content item with 3 media entries
      3. Assert caption from first message preserved
    Expected Result: Album merged correctly
    Failure Indicators: Separate items instead of merged, missing media, lost caption
    Evidence: .sisyphus/evidence/task-12-parser-album.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(telegram): message parser with entity handling, format converters, media groups`
  - Files: `src/lib/telegram/parser.ts`, `src/lib/telegram/parser.test.ts`
  - Pre-commit: `bun test --run`

- [x] 13. Channel Management UI

  **What to do**:
  - Create channel management at `src/app/(dashboard)/channels/`:
    - List connected channels with status (active/disconnected), member count, last post date
    - "Connect Channel" flow:
      1. Display bot username with copy button (@YourBotName)
      2. Instructions: "Add this bot as admin to your Telegram channel"
      3. Input: enter channel @username
      4. Backend verifies bot is admin via Telegram API `getChat`
      5. On success: store channel, set webhook, show confirmation
    - Channel details page: channel info, recent posts list, connection status
    - "Disconnect" action: removes webhook, marks channel as disconnected
    - Channel settings: enable/disable auto-import of new posts
  - Create server actions in `src/server/actions/channels.ts`:
    - `connectChannel(username)`, `disconnectChannel(id)`, `listChannels()`, `getChannelDetails(id)`
  - Write TDD tests: connection flow, disconnect, listing, error states (bot not admin)

  **Must NOT do**:
  - No multi-bot support (one bot per user for V1)
  - No channel analytics here (that's Task 20-21)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Connection wizard flow needs clear UX guidance for non-technical users

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-12)
  - **Blocks**: None directly
  - **Blocked By**: Tasks 3 (DB), 6 (UI shell), 8 (Telegram bot setup)

  **References**:
  - **External**: Telegram getChat: https://core.telegram.org/bots/api#getchat
  - **External**: shadcn/ui stepper pattern: https://ui.shadcn.com/docs/components/stepper

  **Acceptance Criteria**:
  - [ ] Channels page lists all connected channels with status/member count
  - [ ] Connect flow: enter username → verify bot admin → store → confirm
  - [ ] Error shown if bot is not admin of entered channel
  - [ ] Disconnect removes webhook and updates status
  - [ ] Channel details page shows recent imported posts
  - [ ] TDD tests pass for connect/disconnect flows

  **QA Scenarios:**
  ```
  Scenario: Connect a Telegram channel
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, Telegram bot created and running
    Steps:
      1. Navigate to /en/dashboard/channels
      2. Click "Connect Channel" button
      3. Assert wizard/modal appears with bot username and instructions
      4. Enter channel username in input field
      5. Click "Verify & Connect"
      6. If bot is admin: assert success message and channel appears in list
      7. If bot is NOT admin: assert error message "Bot is not an admin of this channel"
    Expected Result: Channel connected or clear error shown
    Failure Indicators: Hanging verification, no error feedback, channel not saved
    Evidence: .sisyphus/evidence/task-13-channel-connect.png
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(channels): channel management UI with connect/disconnect wizard`
  - Files: `src/app/(dashboard)/channels/**`, `src/server/actions/channels.ts`
  - Pre-commit: `bun test --run`

---

### Wave 3 — Cross-Posting Engine (after Wave 2)

- [x] 14. OpenRouter AI Provider Abstraction Layer

  **What to do**:
  - Create AI provider abstraction in `src/lib/ai/`:
    - `src/lib/ai/provider.ts` — interface: `adaptContent(input, options) => Promise<AdaptedContent>`
    - `src/lib/ai/openrouter.ts` — OpenRouter client (API key from env, model selection)
    - `src/lib/ai/types.ts` — types: `AdaptationRequest`, `AdaptedContent`, `AIModel`, `Platform`
  - Support multiple models via OpenRouter:
    - GPT-4.1 mini (default, cost-effective)
    - Claude Haiku (fast, nuanced)
    - GPT-4.1 (high quality, for Pro tier)
    - Allow user to select preferred model in settings
  - Implement prompt templates in `src/lib/ai/prompts/`:
    - `translate.ts` — literal RU→EN translation prompt
    - `adapt-linkedin.ts` — LinkedIn-specific adaptation (professional tone, add insight question, 1-2 hashtags)
    - `adapt-twitter.ts` — Twitter-specific adaptation (concise, conversational, thread splitting for long content, 2-5 hashtags, emoji)
    - `channel-profile.ts` — analyze past posts to determine niche/tone/topics
  - Implement 2-step adaptation pipeline:
    1. Translate: RU → EN (literal, preserve meaning)
    2. Adapt: EN → Platform-specific EN (tone, format, length, hashtags)
  - Handle API errors: rate limits (429 retry with backoff), timeout, model unavailable (fallback to cheaper model)
  - Track token usage per request for billing/analytics
  - Write TDD tests: prompt generation, response parsing, error handling, token counting

  **Must NOT do**:
  - No direct API calls to OpenAI/Anthropic — everything through OpenRouter
  - No image generation
  - No streaming responses (batch only for V1)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: AI prompt engineering + error handling + multi-model abstraction requires careful design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15-19)
  - **Blocks**: Tasks 15, 16
  - **Blocked By**: Task 7 (Inngest for async processing)

  **References**:
  - **External**: OpenRouter API docs: https://openrouter.ai/docs/api-reference
  - **External**: OpenRouter model list: https://openrouter.ai/models
  - **External**: Prompt engineering guide: https://platform.openai.com/docs/guides/prompt-engineering

  **Acceptance Criteria**:
  - [ ] OpenRouter client sends requests and receives valid completions
  - [ ] 2-step pipeline: translate → adapt works end-to-end
  - [ ] LinkedIn prompt produces professional English content from Russian input
  - [ ] Twitter prompt produces concise English content with hashtags
  - [ ] Rate limit (429) triggers retry with exponential backoff
  - [ ] Token usage tracked per request
  - [ ] TDD tests pass for all prompts and error scenarios

  **QA Scenarios:**
  ```
  Scenario: RU→EN adaptation for LinkedIn
    Tool: Bash (bun REPL)
    Preconditions: OPENROUTER_API_KEY set in .env.local
    Steps:
      1. Import adaptContent from provider
      2. Call adaptContent({
           content: "Биткоин достиг нового исторического максимума! Это важный момент для всех инвесторов.",
           platform: "linkedin",
           model: "openai/gpt-4.1-mini"
         })
      3. Assert result.translatedContent is in English
      4. Assert result.adaptedContent contains professional tone
      5. Assert result.adaptedContent.length > 0 and < 3000 (LinkedIn limit)
      6. Assert result.tokensUsed > 0
    Expected Result: Russian crypto post adapted to professional English LinkedIn post
    Failure Indicators: API error, Russian text in output, empty result, exceeds length
    Evidence: .sisyphus/evidence/task-14-ai-linkedin.txt

  Scenario: API rate limit triggers retry
    Tool: Bash (bun REPL)
    Preconditions: Mock OpenRouter to return 429 on first call, 200 on retry
    Steps:
      1. Set up mock that returns 429 with Retry-After: 1
      2. Call adaptContent with mock
      3. Assert first call fails, retries after 1s, second call succeeds
      4. Assert total time >= 1000ms (waited for retry)
    Expected Result: Automatic retry on rate limit
    Failure Indicators: No retry, immediate failure, infinite loop
    Evidence: .sisyphus/evidence/task-14-ai-retry.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(ai): OpenRouter abstraction with multi-model support, 2-step RU→EN adaptation`
  - Files: `src/lib/ai/**`
  - Pre-commit: `bun test --run`

- [x] 15. AI Content Adaptation Engine (RU→EN, platform-specific)

  **What to do**:
  - Create adaptation engine in `src/lib/ai/adaptation-engine.ts` that orchestrates the full pipeline:
    1. Takes parsed Telegram post (from Task 12 parser)
    2. Extracts plain text + media references
    3. Calls AI provider (Task 14) for 2-step adaptation
    4. Returns platform-specific output with metadata
  - Create Inngest function `src/lib/inngest/functions/ai/adapt-content.ts`:
    - Triggered by event `ai/content.adapt`
    - Runs adaptation asynchronously (can take 5-30s)
    - Stores result in `cross_posts` table with status=draft
    - Sends real-time update to user via Supabase Realtime
  - Implement adaptation quality checks:
    - Verify output language is English (simple heuristic: >90% Latin chars)
    - Verify output length fits platform limits (LinkedIn: 3000 chars, Twitter: 280 per tweet)
    - For Twitter: auto-split long content into thread (numbered 1/N, 2/N...)
  - Create channel profile integration:
    - If channel has a profile (Task 16), include niche/tone in adaptation prompt
    - "Adapt this crypto channel post for LinkedIn using professional tech investor tone"
  - Write TDD tests: full pipeline, thread splitting, length validation, quality checks

  **Must NOT do**:
  - No direct posting to platforms (that's Tasks 17, 18)
  - No user-facing UI (that's Task 19)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Core business logic with multiple integration points and quality checks

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14, 16-19)
  - **Blocks**: Task 19 (cross-post workflow UI)
  - **Blocked By**: Tasks 12 (parser), 14 (AI provider)

  **References**:
  - **Pattern Reference**: Task 12 parser output format — input to this engine
  - **Pattern Reference**: Task 14 AI provider interface — called by this engine
  - **External**: LinkedIn post best practices: https://www.linkedin.com/help/linkedin/answer/a521928
  - **External**: Twitter thread best practices: https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets

  **Acceptance Criteria**:
  - [ ] Full pipeline: parsed TG post → AI adaptation → platform-specific output
  - [ ] LinkedIn output: professional tone, <3000 chars, includes hashtags
  - [ ] Twitter output: <280 chars per tweet, auto-threaded if long, includes hashtags + emoji
  - [ ] Thread splitting produces correctly numbered tweets (1/N format)
  - [ ] Language check confirms English output
  - [ ] Inngest function stores result in cross_posts table
  - [ ] Supabase Realtime notifies client when adaptation completes
  - [ ] TDD tests pass for pipeline, splitting, validation

  **QA Scenarios:**
  ```
  Scenario: Full adaptation pipeline for LinkedIn
    Tool: Bash (bun REPL)
    Preconditions: Tasks 12 and 14 complete, OpenRouter API key configured
    Steps:
      1. Create parsed Telegram post with Cyrillic content (500 chars)
      2. Call adaptationEngine.adapt(post, { platform: "linkedin" })
      3. Assert result.platform === "linkedin"
      4. Assert result.adaptedContent is in English
      5. Assert result.adaptedContent.length <= 3000
      6. Assert result.adaptedContent includes at least 1 hashtag
    Expected Result: Russian post adapted to professional English LinkedIn content
    Failure Indicators: Russian in output, no hashtags, exceeds length
    Evidence: .sisyphus/evidence/task-15-adaptation-linkedin.txt

  Scenario: Long content auto-threads for Twitter
    Tool: Bash (bun REPL)
    Preconditions: AI provider configured
    Steps:
      1. Create parsed TG post with 1000+ chars of Cyrillic content
      2. Call adaptationEngine.adapt(post, { platform: "twitter" })
      3. Assert result.tweets is an array with length > 1
      4. Assert each tweet.length <= 280
      5. Assert tweets[0] ends with "1/N" pattern
    Expected Result: Content split into valid tweet thread
    Failure Indicators: Single oversized tweet, numbering wrong, split mid-word
    Evidence: .sisyphus/evidence/task-15-adaptation-twitter-thread.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(ai): content adaptation engine with pipeline, thread splitting, quality checks`
  - Files: `src/lib/ai/adaptation-engine.ts`, `src/lib/inngest/functions/ai/**`
  - Pre-commit: `bun test --run`

- [x] 16. Channel Profiling — AI Analyzes Past Posts for Tone/Niche

  **What to do**:
  - Create channel profiler in `src/lib/ai/channel-profiler.ts`:
    - Takes last 50-100 posts from a channel
    - Sends batch to AI with prompt: "Analyze these posts and determine: niche, tone, top 5 topics, language style, typical post length, emoji usage"
    - Stores result in `channel_profiles` table
  - Create Inngest function `src/lib/inngest/functions/ai/profile-channel.ts`:
    - Triggered when channel first connected or on-demand via "Refresh Profile" button
    - Processes posts in batches (to fit context window)
  - Create profile display component in channel details page
  - Profile feeds into adaptation prompts (Task 15 uses profile to set tone)
  - Write TDD tests: profile generation, batch processing, profile schema validation

  **Must NOT do**:
  - No automatic re-profiling (manual trigger only for V1)
  - No profile editing by user (AI-generated only)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: AI prompt design for analysis + batch processing logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14, 15, 17-19)
  - **Blocks**: None directly (enhances Task 15 quality)
  - **Blocked By**: Tasks 8 (channel posts data), 14 (AI provider)

  **References**:
  - **Pattern Reference**: Task 14 AI provider — used for analysis calls
  - **Pattern Reference**: Task 8 post ingestion — source of posts to analyze

  **Acceptance Criteria**:
  - [ ] Profile generated from 50+ posts with niche, tone, topics
  - [ ] Profile stored in `channel_profiles` table
  - [ ] Profile displays on channel details page
  - [ ] "Refresh Profile" button triggers re-analysis
  - [ ] TDD tests pass for profiler logic

  **QA Scenarios:**
  ```
  Scenario: Generate channel profile from posts
    Tool: Bash (bun REPL)
    Preconditions: Channel with 50+ posts in DB, AI provider configured
    Steps:
      1. Call channelProfiler.generateProfile(channelId)
      2. Assert result has: niche (string), tone (string), top_topics (array of 5)
      3. Assert result stored in channel_profiles table
      4. Assert niche is reasonable (e.g., "cryptocurrency" for a crypto channel)
    Expected Result: AI-generated profile with accurate channel characterization
    Failure Indicators: Empty profile, nonsensical topics, API timeout
    Evidence: .sisyphus/evidence/task-16-channel-profile.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(ai): channel profiling — AI analyzes past posts for tone and niche`
  - Files: `src/lib/ai/channel-profiler.ts`, `src/lib/inngest/functions/ai/profile-channel.ts`
  - Pre-commit: `bun test --run`

- [x] 17. LinkedIn OAuth + Posting Integration

  **What to do**:
  - Implement LinkedIn OAuth 2.0 with PKCE flow:
    - `src/app/api/auth/linkedin/route.ts` — initiate OAuth redirect
    - `src/app/api/auth/linkedin/callback/route.ts` — handle callback, exchange code for tokens
    - Store access_token + refresh_token encrypted in `platform_connections` table
    - Implement token refresh logic (LinkedIn tokens expire — auto-refresh before expiry)
  - Create LinkedIn posting service in `src/lib/platforms/linkedin.ts`:
    - `createPost(accessToken, content, imageUrl?)` — POST to LinkedIn Posts API
    - `uploadImage(accessToken, imageBuffer)` — upload image asset for post attachment
    - Handle versioned API headers: `Linkedin-Version: YYYYMM`, `X-Restli-Protocol-Version: 2.0.0`
  - Create Inngest function `src/lib/inngest/functions/platforms/post-to-linkedin.ts`:
    - Triggered by scheduling engine or manual post action
    - Posts content, stores `platform_post_id` in `cross_posts`, updates status to `posted`
    - Handles errors: expired token (refresh + retry), rate limit, API errors
  - Create "Connect LinkedIn" button in settings page
  - Write TDD tests: OAuth flow, token storage/refresh, posting, image upload, error handling

  **Must NOT do**:
  - No LinkedIn analytics reading (that's Task 20)
  - No LinkedIn company page posting (personal profiles only for V1)
  - No carousel posts (LinkedIn API doesn't support organic carousels)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: OAuth implementation is well-documented but has edge cases around token refresh

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-16, 18-19)
  - **Blocks**: Tasks 19, 20, 25, 28
  - **Blocked By**: Tasks 3 (DB), 7 (Inngest)

  **References**:
  - **External**: LinkedIn OAuth 2.0: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
  - **External**: LinkedIn Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
  - **External**: LinkedIn image upload: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api

  **Acceptance Criteria**:
  - [ ] "Connect LinkedIn" initiates OAuth flow, redirects to LinkedIn
  - [ ] Callback exchanges code for tokens, stores encrypted in DB
  - [ ] Token refresh works before expiry
  - [ ] `createPost` successfully posts text to LinkedIn
  - [ ] `uploadImage` + `createPost` posts with image attachment
  - [ ] Inngest function posts and updates cross_post status
  - [ ] TDD tests pass for OAuth flow + posting

  **QA Scenarios:**
  ```
  Scenario: Post to LinkedIn via API
    Tool: Bash (curl)
    Preconditions: LinkedIn OAuth tokens stored, valid access token
    Steps:
      1. Call posting service with test content: "Testing cross-post from Telegram Content OS"
      2. Assert LinkedIn API returns 201 Created with post ID (urn:li:share:xxx)
      3. Assert cross_posts table updated with platform_post_id and status=posted
    Expected Result: Content posted to LinkedIn, post ID stored
    Failure Indicators: 401 (token expired), 403 (insufficient permissions), 422 (bad payload)
    Evidence: .sisyphus/evidence/task-17-linkedin-post.txt

  Scenario: Token refresh when expired
    Tool: Bash (bun REPL)
    Preconditions: Expired access token stored in DB
    Steps:
      1. Attempt to post with expired token
      2. Assert system detects 401, refreshes token automatically
      3. Assert retried post succeeds with new token
      4. Assert new token stored in DB
    Expected Result: Seamless token refresh and retry
    Failure Indicators: Post fails with 401, no refresh attempt, refresh fails
    Evidence: .sisyphus/evidence/task-17-linkedin-refresh.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(linkedin): OAuth integration + Posts API with image upload, token refresh`
  - Files: `src/app/api/auth/linkedin/**`, `src/lib/platforms/linkedin.ts`, `src/lib/inngest/functions/platforms/post-to-linkedin.ts`
  - Pre-commit: `bun test --run`

- [x] 18. Twitter/X OAuth + Posting Integration

  **What to do**:
  - Implement Twitter OAuth 2.0 with PKCE flow:
    - `src/app/api/auth/twitter/route.ts` — initiate OAuth redirect
    - `src/app/api/auth/twitter/callback/route.ts` — handle callback, exchange code for tokens
    - Store tokens encrypted in `platform_connections` table
    - Implement token refresh (Twitter tokens expire every 2 hours)
  - Create Twitter posting service in `src/lib/platforms/twitter.ts`:
    - `createTweet(accessToken, text, mediaId?)` — POST to v2 tweets endpoint
    - `createThread(accessToken, tweets[])` — posts sequence as reply thread
    - `uploadMedia(accessToken, imageBuffer)` — upload via media/upload endpoint
  - Create Inngest function `src/lib/inngest/functions/platforms/post-to-twitter.ts`:
    - Triggered by scheduling engine or manual post
    - Handles single tweets and threads
    - Stores tweet_id in cross_posts, updates status
    - Handles rate limits (1,500 posts/month on free tier)
  - Create "Connect Twitter" button in settings page
  - Track monthly post count against Twitter free tier limit (1,500/mo)
  - Write TDD tests: OAuth flow, posting, thread creation, media upload, rate limit tracking

  **Must NOT do**:
  - No Twitter analytics reading (write-only on free tier)
  - No retweet/like automation
  - No DM functionality

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Similar OAuth pattern to Task 17, well-documented Twitter v2 API

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-17, 19)
  - **Blocks**: Tasks 19, 20, 25, 28
  - **Blocked By**: Tasks 3 (DB), 7 (Inngest)

  **References**:
  - **External**: Twitter OAuth 2.0 PKCE: https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code
  - **External**: Twitter v2 Create Tweet: https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
  - **External**: Twitter Media Upload: https://developer.x.com/en/docs/twitter-api/media/upload-media/api-reference

  **Acceptance Criteria**:
  - [ ] "Connect Twitter" initiates OAuth flow
  - [ ] Callback stores encrypted tokens
  - [ ] Single tweet posted successfully
  - [ ] Thread (3+ tweets) posted as reply chain
  - [ ] Media upload works with tweet attachment
  - [ ] Monthly post count tracked against 1,500 limit
  - [ ] TDD tests pass for all flows

  **QA Scenarios:**
  ```
  Scenario: Post a tweet and a thread
    Tool: Bash (curl)
    Preconditions: Twitter OAuth tokens stored
    Steps:
      1. Post single tweet: "Testing cross-post from Telegram Content OS"
      2. Assert 201 response with tweet_id
      3. Post thread of 3 tweets: ["Thread 1/3...", "Thread 2/3...", "Thread 3/3..."]
      4. Assert all 3 created with correct reply chain (each replies to previous)
      5. Assert cross_posts table shows all tweet IDs
    Expected Result: Single tweet + threaded tweets posted correctly
    Failure Indicators: 403 (permissions), thread not linked, rate limit hit
    Evidence: .sisyphus/evidence/task-18-twitter-post.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(twitter): OAuth integration + v2 API posting with threads, media upload`
  - Files: `src/app/api/auth/twitter/**`, `src/lib/platforms/twitter.ts`, `src/lib/inngest/functions/platforms/post-to-twitter.ts`
  - Pre-commit: `bun test --run`

- [x] 19. Cross-Post Workflow UI (select → adapt → preview → schedule/post)

  **What to do**:
  - Create the core cross-posting workflow at `src/app/(dashboard)/crosspost/`:
    - **Step 1 — Select Source**: Choose a Telegram post from imported posts list (with search/filter)
    - **Step 2 — Adapt**: Click "Adapt for LinkedIn" or "Adapt for Twitter" → shows loading state → displays AI-generated English content
    - **Step 3 — Edit**: User reviews and edits the adapted content in a rich editor. Side-by-side view: original RU | adapted EN
    - **Step 4 — Preview**: Platform-specific preview (LinkedIn card mockup, Twitter tweet/thread mockup)
    - **Step 5 — Action**: "Post Now" or "Schedule" (opens calendar picker)
  - Integrate with Supabase Realtime for async adaptation updates:
    - User clicks "Adapt" → triggers Inngest function → UI subscribes to cross_posts table changes
    - When adaptation completes, content appears automatically
  - Create platform preview components:
    - `src/components/preview/linkedin-preview.tsx` — mimics LinkedIn post card
    - `src/components/preview/twitter-preview.tsx` — mimics tweet/thread appearance
  - Add "Adapt for both" shortcut — generates LinkedIn + Twitter versions simultaneously
  - Show remaining cross-posts quota ("3 of 5 free cross-posts used this month")
  - Write TDD tests: workflow state transitions, real-time subscription, preview rendering

  **Must NOT do**:
  - No WYSIWYG editor — plain text + markdown sufficient for editing adapted content
  - No auto-posting without user review (always show preview first)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Multi-step workflow with real-time updates requires excellent UX

  **Parallelization**:
  - **Can Run In Parallel**: YES (but needs 15, 17, 18 to be complete)
  - **Parallel Group**: Wave 3 (last to complete in wave)
  - **Blocks**: Task 25 (multi-platform broadcasting)
  - **Blocked By**: Tasks 6 (UI shell), 15 (adaptation engine), 17 (LinkedIn), 18 (Twitter)

  **References**:
  - **Pattern Reference**: Task 15 adaptation engine — called from this UI
  - **Pattern Reference**: Task 17/18 platform posting — triggered by "Post Now"
  - **External**: Supabase Realtime subscriptions: https://supabase.com/docs/guides/realtime/postgres-changes
  - **External**: shadcn/ui stepper: https://ui.shadcn.com/docs/components/stepper

  **Acceptance Criteria**:
  - [ ] Full workflow: select post → adapt → edit → preview → post/schedule
  - [ ] Side-by-side view: original Russian | adapted English
  - [ ] LinkedIn preview looks like an actual LinkedIn post card
  - [ ] Twitter preview shows tweet or thread correctly
  - [ ] Real-time: adaptation result appears without page refresh
  - [ ] Quota display shows remaining cross-posts for current tier
  - [ ] TDD tests pass for workflow + previews

  **QA Scenarios:**
  ```
  Scenario: Full cross-post workflow from Telegram to LinkedIn
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, channel connected with posts imported, LinkedIn connected
    Steps:
      1. Navigate to /en/dashboard/crosspost
      2. Select first Telegram post from list
      3. Click "Adapt for LinkedIn"
      4. Wait for adaptation (max 30s, watch for loading spinner → content)
      5. Assert adapted English content appears in editor
      6. Assert side-by-side shows original Russian on left, English on right
      7. Edit content: append " #testing" to adapted text
      8. Click "Preview"
      9. Assert LinkedIn preview card renders with edited content
      10. Click "Post Now"
      11. Assert success toast/notification appears
      12. Assert cross_posts table shows status=posted
    Expected Result: Complete cross-post flow from TG → LinkedIn with user edit
    Failure Indicators: Adaptation timeout, content not editable, preview broken, post fails
    Evidence: .sisyphus/evidence/task-19-crosspost-workflow.png

  Scenario: Quota enforcement on free tier
    Tool: Playwright (playwright skill)
    Preconditions: Free tier user with 5/5 cross-posts used this month
    Steps:
      1. Navigate to cross-post page
      2. Select a post and click "Adapt"
      3. Assert error message: "Free plan limit reached (5/5). Upgrade to Plus for 50 cross-posts/month."
      4. Assert upgrade CTA button visible
    Expected Result: Free tier limit enforced with clear upgrade path
    Failure Indicators: Adaptation proceeds despite limit, no error, no upgrade CTA
    Evidence: .sisyphus/evidence/task-19-crosspost-quota.png
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(crosspost): multi-step workflow UI with AI adaptation, previews, real-time updates`
  - Files: `src/app/(dashboard)/crosspost/**`, `src/components/preview/**`
  - Pre-commit: `bun test --run`

---

- [x] 20. Analytics Data Collection — Track Cross-Post Performance

  **What to do**:
  - Create analytics data models and collection service at `src/lib/analytics/`:
    - `src/lib/analytics/collector.ts` — service that fetches engagement data from LinkedIn + Twitter APIs
    - `src/lib/analytics/types.ts` — `PostAnalytics`, `ChannelMetrics`, `PlatformEngagement` types
  - Create Inngest cron functions at `src/inngest/functions/analytics/`:
    - `collect-linkedin-analytics.ts` — runs every 6 hours, fetches post impressions, likes, comments, shares via LinkedIn API
    - `collect-twitter-analytics.ts` — Twitter Free tier is write-only, so track only: post created timestamp, character count, media attached (no engagement data without Basic tier)
    - `collect-telegram-analytics.ts` — fetches reaction counts via Bot API `getUpdates` for channel posts
  - Create DB tables via Drizzle migration:
    - `post_analytics` — per-post metrics: platform, impressions, likes, comments, shares, clicks, fetched_at
    - `channel_metrics` — daily rollup: total_posts, total_engagement, follower_count_snapshot, platform
    - `analytics_sync_log` — tracks last sync time per platform per user to avoid duplicate fetches
  - Implement rate-limit-aware fetching (LinkedIn: 100 req/day, Twitter: N/A for free, Telegram: 30 msg/sec)
  - Write TDD tests: collector service, cron scheduling, rate limit handling, data aggregation

  **Must NOT do**:
  - No Twitter engagement metrics (Free tier = write-only, no analytics endpoint)
  - No real-time analytics (batch collection every 6h is sufficient for V1)
  - No vanity metrics or fake data — if data unavailable, show "Data not available on Free API tier"

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed — backend data collection only

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 21, 22, 23, 24)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 21, 27
  - **Blocked By**: Tasks 3 (DB schema), 17 (LinkedIn OAuth), 18 (Twitter OAuth)

  **References**:
  - **Pattern Reference**: Task 7 Inngest setup — cron function pattern for scheduled collection
  - **Pattern Reference**: Task 17 LinkedIn OAuth — reuse token refresh for API calls
  - **Pattern Reference**: Task 18 Twitter OAuth — reuse client for metadata tracking
  - **API Reference**: Task 3 Drizzle schema — extend with analytics tables
  - **External**: LinkedIn Marketing API analytics: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
  - **External**: Telegram Bot API getUpdates: https://core.telegram.org/bots/api#getupdates

  **Acceptance Criteria**:
  - [ ] `post_analytics`, `channel_metrics`, `analytics_sync_log` tables created via migration
  - [ ] LinkedIn analytics cron fetches impressions/likes/comments/shares for user's posts
  - [ ] Telegram analytics cron fetches reaction counts for channel posts
  - [ ] Twitter collector stores post metadata only (no engagement — documented limitation)
  - [ ] Rate limiting: LinkedIn calls respect 100 req/day limit
  - [ ] Duplicate protection: sync_log prevents re-fetching same time window
  - [ ] TDD tests pass for all collector functions

  **QA Scenarios:**
  ```
  Scenario: LinkedIn analytics collection for posted content
    Tool: Bash (curl + bun)
    Preconditions: User has LinkedIn connected, at least 1 cross-posted LinkedIn post in DB
    Steps:
      1. Run: bun run src/inngest/functions/analytics/collect-linkedin-analytics.ts (or trigger via Inngest dev UI)
      2. Query DB: SELECT * FROM post_analytics WHERE platform = 'linkedin' ORDER BY fetched_at DESC LIMIT 1
      3. Assert row exists with: impressions >= 0, likes >= 0, fetched_at within last minute
      4. Run again immediately
      5. Assert analytics_sync_log prevents duplicate fetch (no new rows)
    Expected Result: LinkedIn engagement data stored, dedup works
    Failure Indicators: Empty post_analytics, null values, duplicate rows on re-run
    Evidence: .sisyphus/evidence/task-20-linkedin-analytics.txt

  Scenario: Twitter metadata tracking (Free tier limitation)
    Tool: Bash (bun)
    Preconditions: User has Twitter connected, at least 1 cross-posted tweet
    Steps:
      1. Trigger twitter analytics collection
      2. Query DB: SELECT * FROM post_analytics WHERE platform = 'twitter'
      3. Assert row exists with: impressions = NULL, likes = NULL (Free tier)
      4. Assert created_at, character_count, has_media fields are populated
    Expected Result: Metadata tracked, engagement fields null with documented reason
    Failure Indicators: Fake engagement numbers, errors on missing data
    Evidence: .sisyphus/evidence/task-20-twitter-metadata.txt
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `feat(analytics): data collection service with LinkedIn/Telegram cron jobs, rate limiting`
  - Files: `src/lib/analytics/**`, `src/inngest/functions/analytics/**`, `drizzle/migrations/`
  - Pre-commit: `bun test --run`

- [x] 21. Analytics Dashboard UI — Charts, Metrics Cards, Best Times Heatmap

  **What to do**:
  - Create analytics dashboard at `src/app/(dashboard)/analytics/page.tsx`:
    - **Overview cards row**: Total cross-posts, Total engagement (sum of likes+comments+shares), Avg engagement rate, Active platforms
    - **Engagement chart**: Line chart showing engagement over time (last 7/30/90 days toggle). Use Recharts (`recharts` package)
    - **Platform comparison**: Bar chart comparing LinkedIn vs Telegram engagement side by side
    - **Best posting times heatmap**: 7x24 grid (days × hours) colored by average engagement. Helps users find optimal posting windows
    - **Recent posts table**: Last 20 cross-posts with: source snippet, platform, status, engagement summary
    - **Per-channel breakdown**: Dropdown to filter by Telegram channel
  - Create reusable chart components at `src/components/analytics/`:
    - `metrics-card.tsx` — stat card with icon, value, trend arrow (up/down vs previous period)
    - `engagement-chart.tsx` — Recharts line chart wrapper
    - `platform-comparison.tsx` — Recharts bar chart wrapper
    - `posting-heatmap.tsx` — custom 7x24 grid component
    - `posts-table.tsx` — data table with sorting and platform filter
  - All charts must handle empty state ("No data yet — cross-post your first content to see analytics")
  - All data fetched via server actions from analytics tables (Task 20)
  - Add date range picker (shadcn/ui date picker) for filtering
  - Write TDD tests: chart renders with mock data, empty states, date range filtering

  **Must NOT do**:
  - No real-time updating charts (batch data from Task 20 is sufficient)
  - No export to CSV/PDF (V2 feature)
  - No AI-generated insights ("Your best day is Tuesday" — V2 feature)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Data visualization requires careful layout, responsive design, and polish

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 20 completes)
  - **Parallel Group**: Wave 4 (starts after T20)
  - **Blocks**: Task 27 (dashboard home)
  - **Blocked By**: Tasks 6 (UI shell), 20 (analytics data)

  **References**:
  - **Pattern Reference**: Task 6 UI shell — dashboard layout and sidebar navigation
  - **Pattern Reference**: Task 9 content library — data table pattern for posts table
  - **Data Reference**: Task 20 analytics collector — `post_analytics` and `channel_metrics` table schemas
  - **External**: Recharts docs: https://recharts.org/en-US/api
  - **External**: shadcn/ui date picker: https://ui.shadcn.com/docs/components/date-picker
  - **External**: shadcn/ui table: https://ui.shadcn.com/docs/components/table

  **Acceptance Criteria**:
  - [ ] Analytics page renders at `/en/dashboard/analytics`
  - [ ] Overview cards show: total cross-posts, total engagement, avg rate, active platforms
  - [ ] Line chart shows engagement trend with 7/30/90 day toggle
  - [ ] Bar chart compares LinkedIn vs Telegram engagement
  - [ ] Heatmap shows 7×24 grid with color intensity by engagement
  - [ ] Recent posts table shows last 20 cross-posts with engagement data
  - [ ] Empty state renders when no analytics data exists
  - [ ] Date range picker filters all charts
  - [ ] TDD tests pass

  **QA Scenarios:**
  ```
  Scenario: Analytics dashboard with data
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, analytics data seeded in post_analytics table (at least 10 rows across 7 days)
    Steps:
      1. Navigate to /en/dashboard/analytics
      2. Assert page title: "Analytics"
      3. Assert 4 metrics cards visible (selector: [data-testid="metrics-card"])
      4. Assert first card shows total cross-posts count > 0
      5. Assert line chart rendered (selector: .recharts-line-chart or [data-testid="engagement-chart"])
      6. Click "30 days" toggle button
      7. Assert chart re-renders (loading state briefly, then updated data)
      8. Assert heatmap grid rendered with at least 1 colored cell
      9. Assert recent posts table has rows (selector: [data-testid="posts-table"] tbody tr)
      10. Screenshot full page
    Expected Result: All analytics visualizations render with real data
    Failure Indicators: Blank charts, NaN values, missing cards, table empty despite data
    Evidence: .sisyphus/evidence/task-21-analytics-dashboard.png

  Scenario: Analytics dashboard empty state
    Tool: Playwright (playwright skill)
    Preconditions: New user, no analytics data in DB
    Steps:
      1. Navigate to /en/dashboard/analytics
      2. Assert empty state message visible: "No data yet"
      3. Assert CTA to cross-post first content
      4. Assert no chart errors (no NaN, no broken SVG)
      5. Screenshot
    Expected Result: Clean empty state with guidance
    Failure Indicators: JS errors, broken chart SVGs, NaN displayed
    Evidence: .sisyphus/evidence/task-21-analytics-empty.png
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `feat(analytics): dashboard UI with engagement charts, heatmap, metrics cards, posts table`
  - Files: `src/app/(dashboard)/analytics/**`, `src/components/analytics/**`
  - Pre-commit: `bun test --run`

- [x] 22. Stripe Billing Integration + Subscription Tiers

  **What to do**:
  - Install Stripe SDK: `stripe` + `@stripe/stripe-js`
  - Create Stripe service at `src/lib/billing/`:
    - `stripe.ts` — server-side Stripe client (uses `STRIPE_SECRET_KEY`)
    - `plans.ts` — tier definitions: Free (no Stripe), Plus ($19/mo, price_id from Stripe), Pro ($49/mo, price_id from Stripe)
    - `checkout.ts` — create Stripe Checkout Session, redirect to Stripe-hosted page
    - `portal.ts` — create Stripe Customer Portal session for self-service management
    - `webhook.ts` — handle Stripe webhook events for subscription lifecycle
  - Create DB schema additions:
    - Add to `users` table or create `subscriptions` table: stripe_customer_id, stripe_subscription_id, plan_tier (free/plus/pro), current_period_end, cancel_at_period_end
  - Create API routes:
    - `src/app/api/billing/checkout/route.ts` — POST: create checkout session, return URL
    - `src/app/api/billing/portal/route.ts` — POST: create portal session, return URL
    - `src/app/api/billing/webhook/route.ts` — POST: handle Stripe events (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed)
  - Create billing UI at `src/app/(dashboard)/billing/page.tsx`:
    - Pricing cards: Free / Plus / Pro with feature comparison
    - Current plan indicator + "Upgrade" / "Manage Subscription" buttons
    - Usage meter: "3 of 5 cross-posts used" (Free), "12 of 50 used" (Plus), "Unlimited" (Pro)
  - Webhook signature verification using `stripe.webhooks.constructEvent()`
  - Write TDD tests: checkout session creation, webhook event handling, plan tier resolution, usage display

  **Must NOT do**:
  - No custom payment forms (use Stripe Checkout hosted page)
  - No YooMoney/QIWI/other payment methods (Stripe only in V1)
  - No annual billing toggle (monthly only in V1)
  - No coupon/promo code support (V2)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Stripe Checkout is external hosted page — can't test with Playwright in unit tests. E2E covered in Final Wave.
    - `frontend-ui-ux`: Billing page is functional, not design-heavy

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20, 21, 24)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 23, 28
  - **Blocked By**: Tasks 3 (DB schema), 4 (Auth — need user ID for Stripe customer)

  **References**:
  - **Pattern Reference**: Task 3 Drizzle schema — extend users or create subscriptions table
  - **Pattern Reference**: Task 4 Auth — user session to get user ID for Stripe customer mapping
  - **Pattern Reference**: Task 7 Inngest — could use Inngest for async webhook processing (optional)
  - **External**: Stripe Checkout quickstart: https://docs.stripe.com/checkout/quickstart
  - **External**: Stripe webhooks: https://docs.stripe.com/webhooks
  - **External**: Stripe Customer Portal: https://docs.stripe.com/customer-management/integrate-customer-portal
  - **External**: Stripe Next.js integration: https://github.com/vercel/next.js/tree/canary/examples/with-stripe-typescript

  **Acceptance Criteria**:
  - [ ] Three tiers defined: Free (default), Plus ($19/mo), Pro ($49/mo)
  - [ ] Checkout flow: click Upgrade → redirect to Stripe Checkout → return to app with active subscription
  - [ ] Webhook handles: checkout.session.completed, subscription.updated, subscription.deleted, invoice.payment_failed
  - [ ] Webhook signature verified with `STRIPE_WEBHOOK_SECRET`
  - [ ] Customer Portal: users can manage/cancel subscription via Stripe-hosted portal
  - [ ] Billing page shows current plan, usage meter, upgrade/manage buttons
  - [ ] `subscriptions` table updated on every webhook event
  - [ ] TDD tests pass for checkout, webhook, portal, tier resolution

  **QA Scenarios:**
  ```
  Scenario: Stripe Checkout flow for Plus tier
    Tool: Bash (curl)
    Preconditions: Authenticated user on Free tier, Stripe test mode with test API keys
    Steps:
      1. POST /api/billing/checkout with body: {"tier": "plus"}
      2. Assert response status 200
      3. Assert response body contains: {"url": "https://checkout.stripe.com/..."}
      4. Verify checkout session created in Stripe: stripe checkout sessions list --limit 1 (using Stripe CLI)
      5. Assert session price matches Plus tier ($19)
    Expected Result: Checkout session created with correct price, redirect URL returned
    Failure Indicators: 500 error, missing URL, wrong price, no Stripe session
    Evidence: .sisyphus/evidence/task-22-checkout-session.txt

  Scenario: Webhook processes subscription activation
    Tool: Bash (curl + Stripe CLI)
    Preconditions: Stripe CLI installed, webhook endpoint running
    Steps:
      1. Run: stripe trigger checkout.session.completed (Stripe CLI sends test event)
      2. Assert webhook endpoint returns 200
      3. Query DB: SELECT plan_tier FROM subscriptions WHERE stripe_customer_id = [test_customer_id]
      4. Assert plan_tier = 'plus'
      5. Run: stripe trigger customer.subscription.deleted
      6. Query DB again
      7. Assert plan_tier = 'free' (downgraded)
    Expected Result: Subscription lifecycle handled correctly via webhooks
    Failure Indicators: Webhook returns non-200, DB not updated, tier mismatch
    Evidence: .sisyphus/evidence/task-22-webhook-lifecycle.txt
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `feat(billing): Stripe checkout, webhooks, customer portal, pricing page with 3 tiers`
  - Files: `src/lib/billing/**`, `src/app/api/billing/**`, `src/app/(dashboard)/billing/**`
  - Pre-commit: `bun test --run`

- [x] 23. Usage Tracking + Tier Enforcement (Free/Plus/Pro Limits)

  **What to do**:
  - Create usage tracking service at `src/lib/billing/usage.ts`:
    - `getCurrentUsage(userId)` — counts cross_posts this calendar month for user
    - `canCrossPost(userId)` — checks tier limit: Free=5/mo, Plus=50/mo, Pro=unlimited
    - `getRemainingQuota(userId)` — returns { used, limit, remaining, tier }
    - `incrementUsage(userId)` — called after successful cross-post, increments counter
  - Create DB additions:
    - `usage_tracking` table: user_id, month (YYYY-MM), cross_posts_count, updated_at
    - OR use simple COUNT query on cross_posts table WHERE created_at in current month
  - Integrate enforcement into cross-post workflow:
    - Before AI adaptation (Task 15): check `canCrossPost()` → if false, return error with upgrade CTA
    - After successful post (Tasks 17/18): call `incrementUsage()`
  - Create middleware/hook at `src/lib/billing/enforce.ts`:
    - Server action wrapper that checks quota before executing cross-post actions
    - Returns structured error: `{ allowed: false, reason: 'quota_exceeded', used: 5, limit: 5, upgradeUrl: '/billing' }`
  - Update cross-post UI (Task 19) quota display to use `getRemainingQuota()`
  - Create Inngest function to reset monthly counters (or rely on date-based queries)
  - Write TDD tests: quota checking, limit enforcement, month boundary reset, tier upgrade immediate effect

  **Must NOT do**:
  - No hard rate limiting (only monthly quota per tier)
  - No usage-based pricing (fixed tiers only)
  - No carry-over of unused quota

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 22 for tier data)
  - **Parallel Group**: Wave 4 (after T22)
  - **Blocks**: None directly (but enforcement affects all cross-posting)
  - **Blocked By**: Tasks 3 (DB), 22 (Stripe billing — need tier info)

  **References**:
  - **Pattern Reference**: Task 22 billing — `subscriptions` table provides user's current tier
  - **Pattern Reference**: Task 15 adaptation engine — enforcement point before adaptation starts
  - **Pattern Reference**: Task 19 cross-post UI — quota display component
  - **API Reference**: Task 3 Drizzle schema — extend with usage_tracking table

  **Acceptance Criteria**:
  - [ ] `canCrossPost()` returns false when Free user exceeds 5/mo
  - [ ] `canCrossPost()` returns false when Plus user exceeds 50/mo
  - [ ] `canCrossPost()` always returns true for Pro users
  - [ ] Cross-post workflow blocked with clear error when quota exceeded
  - [ ] Error includes: current usage, limit, and upgrade CTA link
  - [ ] Quota resets at month boundary (new month = fresh count)
  - [ ] Upgrading tier immediately grants new limit (no wait for next month)
  - [ ] TDD tests pass for all quota scenarios

  **QA Scenarios:**
  ```
  Scenario: Free tier quota enforcement
    Tool: Bash (curl + bun)
    Preconditions: Free tier user, seed 5 cross_posts in current month
    Steps:
      1. Call canCrossPost(userId) — assert returns false
      2. Call getRemainingQuota(userId) — assert { used: 5, limit: 5, remaining: 0, tier: 'free' }
      3. POST /api/crosspost/adapt with valid post_id
      4. Assert response: 403 with body containing "quota_exceeded"
      5. Assert response body contains upgradeUrl: "/billing"
    Expected Result: 6th cross-post blocked with upgrade prompt
    Failure Indicators: Cross-post succeeds despite limit, wrong count, missing upgrade link
    Evidence: .sisyphus/evidence/task-23-quota-enforcement.txt

  Scenario: Tier upgrade immediately unlocks quota
    Tool: Bash (curl + bun)
    Preconditions: User was Free (5/5 used), just upgraded to Plus via webhook
    Steps:
      1. Verify subscriptions table shows plan_tier = 'plus'
      2. Call canCrossPost(userId) — assert returns true
      3. Call getRemainingQuota(userId) — assert { used: 5, limit: 50, remaining: 45, tier: 'plus' }
      4. POST /api/crosspost/adapt — assert 200 success
    Expected Result: Upgrade immediately grants higher quota
    Failure Indicators: Still blocked after upgrade, wrong limit, stale tier cache
    Evidence: .sisyphus/evidence/task-23-upgrade-unlock.txt
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `feat(billing): usage tracking with tier enforcement, quota checking, monthly reset`
  - Files: `src/lib/billing/usage.ts`, `src/lib/billing/enforce.ts`
  - Pre-commit: `bun test --run`

- [x] 24. Welcome Message Template Editor

  **What to do**:
  - Create welcome message feature at `src/app/(dashboard)/channels/[channelId]/welcome/`:
    - `page.tsx` — template editor page with live preview
    - Template editor: textarea with variable insertion buttons ({name}, {channel_name}, {member_count})
    - Toggle: enable/disable welcome message per channel
    - Preview panel: shows rendered message with sample data
  - Create DB schema:
    - `welcome_templates` table: id, channel_id, user_id, template_text, is_enabled, created_at, updated_at
  - Create Telegram Bot handler at `src/lib/telegram/welcome.ts`:
    - Listen for `new_chat_members` update type in webhook handler (Task 8)
    - When new member joins and template is enabled: render template with variables, send via Bot API `sendMessage`
    - Rate limit: max 1 welcome message per new member per channel per day (prevent spam on mass joins)
  - Create server actions:
    - `saveWelcomeTemplate(channelId, template, isEnabled)` — upsert template
    - `getWelcomeTemplate(channelId)` — fetch current template
    - `testWelcomeMessage(channelId)` — send test message to channel (for preview)
  - Write TDD tests: template CRUD, variable rendering, bot handler, rate limiting

  **Must NOT do**:
  - No rich text / HTML formatting in templates (plain text + Telegram markdown only)
  - No conditional logic in templates (no if/else — just simple variable substitution)
  - No multi-step welcome sequences (one message only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Template editor is a simple textarea + buttons, not design-heavy

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20, 21, 22, 23)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: Tasks 3 (DB schema), 6 (UI shell), 8 (Telegram bot webhook)

  **References**:
  - **Pattern Reference**: Task 8 Telegram bot webhook — extend handler for new_chat_members event
  - **Pattern Reference**: Task 9 content library CRUD — server action patterns for template CRUD
  - **Pattern Reference**: Task 13 channel management UI — nested route pattern under channels/[channelId]/
  - **External**: Telegram Bot API sendMessage: https://core.telegram.org/bots/api#sendmessage
  - **External**: Telegram Bot API new_chat_members: https://core.telegram.org/bots/api#message
  - **External**: Telegram markdown formatting: https://core.telegram.org/bots/api#markdownv2-style

  **Acceptance Criteria**:
  - [ ] Template editor page renders at `/en/dashboard/channels/[id]/welcome`
  - [ ] User can type template text with {name}, {channel_name}, {member_count} variables
  - [ ] Variable insertion buttons add variables at cursor position
  - [ ] Live preview shows rendered template with sample data
  - [ ] Enable/disable toggle persists to DB
  - [ ] Bot sends welcome message when new member joins (if enabled)
  - [ ] Rate limit: same member doesn't get spammed on rejoin
  - [ ] "Test" button sends sample message to channel
  - [ ] TDD tests pass

  **QA Scenarios:**
  ```
  Scenario: Create and preview welcome template
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, at least 1 channel connected
    Steps:
      1. Navigate to /en/dashboard/channels
      2. Click first channel name
      3. Click "Welcome Message" tab or link
      4. Assert template editor page loads (selector: [data-testid="welcome-editor"])
      5. Type in textarea: "Welcome {name}! 👋 Thanks for joining {channel_name}!"
      6. Assert preview panel shows: "Welcome John! 👋 Thanks for joining My Channel!" (sample data)
      7. Click enable toggle
      8. Click Save
      9. Assert success toast
      10. Refresh page — assert template text persisted
    Expected Result: Template created, previewed, saved, and persisted
    Failure Indicators: Preview not updating, save fails, data lost on refresh
    Evidence: .sisyphus/evidence/task-24-welcome-editor.png

  Scenario: Welcome message not sent when disabled
    Tool: Bash (curl + bun)
    Preconditions: Template exists but is_enabled = false
    Steps:
      1. Simulate new_chat_members webhook update via POST /api/telegram/webhook
      2. Query Telegram Bot API mock/log for sendMessage calls
      3. Assert NO sendMessage was called for welcome
    Expected Result: Disabled templates don't trigger messages
    Failure Indicators: Message sent despite disabled toggle
    Evidence: .sisyphus/evidence/task-24-welcome-disabled.txt
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `feat(telegram): welcome message template editor with live preview, bot handler, rate limiting`
  - Files: `src/app/(dashboard)/channels/[channelId]/welcome/**`, `src/lib/telegram/welcome.ts`
  - Pre-commit: `bun test --run`

---

- [ ] 25. Multi-Platform Broadcasting — Schedule to TG + LinkedIn + Twitter Simultaneously

  **What to do**:
  - Create broadcast service at `src/lib/broadcast/`:
    - `orchestrator.ts` — takes a content piece + selected platforms + schedule time, creates cross_posts for each platform
    - `types.ts` — `BroadcastRequest`, `BroadcastResult`, `PlatformTarget` types
  - Create broadcast Inngest function at `src/inngest/functions/broadcast.ts`:
    - Receives: { content_id, platforms: ['telegram', 'linkedin', 'twitter'], scheduled_at, adaptations: { linkedin: string, twitter: string } }
    - Executes platform posts in parallel using `step.run()` for each platform
    - Each platform post is independent — if Twitter fails, LinkedIn still posts
    - Tracks per-platform status: pending/posting/posted/failed
  - Update cross-post workflow UI (Task 19) with multi-platform option:
    - Add checkboxes: ☐ LinkedIn ☐ Twitter (can select both)
    - "Adapt for both" generates LinkedIn + Twitter versions simultaneously (parallel Inngest steps)
    - Side-by-side-by-side preview when both selected: Original | LinkedIn | Twitter
    - Single "Schedule All" or "Post All" button
  - Create `src/app/(dashboard)/crosspost/broadcast/page.tsx`:
    - Quick broadcast form: paste content → select platforms → adapt all → review → post/schedule
    - Simpler than full workflow — designed for frequent use
  - Track broadcast as a group: all cross_posts from same broadcast share a `broadcast_id`
  - Write TDD tests: orchestrator, parallel execution, partial failure handling, broadcast grouping

  **Must NOT do**:
  - No automatic posting without user review (always preview first)
  - No retry on failure without user action (show failed status, user can retry)
  - No platform-specific scheduling times (same time for all platforms in V1)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: UI changes are extensions of existing Task 19 UI, not new design work

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 26, 27, 28)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 26 (recurring schedules)
  - **Blocked By**: Tasks 11 (scheduling engine), 17 (LinkedIn posting), 18 (Twitter posting), 19 (cross-post workflow UI)

  **References**:
  - **Pattern Reference**: Task 11 scheduling engine — reuse scheduler for broadcast timing
  - **Pattern Reference**: Task 17 LinkedIn posting — `postToLinkedIn()` function
  - **Pattern Reference**: Task 18 Twitter posting — `postToTwitter()` function
  - **Pattern Reference**: Task 19 cross-post workflow UI — extend with multi-platform checkboxes
  - **Pattern Reference**: Task 7 Inngest setup — parallel `step.run()` pattern for multi-platform execution
  - **External**: Inngest step parallelism: https://www.inngest.com/docs/guides/step-parallelism

  **Acceptance Criteria**:
  - [ ] User can select multiple platforms (LinkedIn + Twitter) for a single broadcast
  - [ ] AI adaptation runs for each selected platform in parallel
  - [ ] Side-by-side preview shows adapted content for each platform
  - [ ] "Post All" sends to all selected platforms
  - [ ] Partial failure: if one platform fails, others still succeed
  - [ ] Per-platform status tracked: posted/failed independently
  - [ ] Broadcast grouping: all posts from same broadcast share broadcast_id
  - [ ] TDD tests pass for orchestrator, parallel execution, partial failure

  **QA Scenarios:**
  ```
  Scenario: Broadcast to LinkedIn + Twitter simultaneously
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, LinkedIn + Twitter connected, content available
    Steps:
      1. Navigate to /en/dashboard/crosspost/broadcast
      2. Select a Telegram post as source
      3. Check both LinkedIn and Twitter checkboxes
      4. Click "Adapt for all"
      5. Wait for both adaptations (max 60s)
      6. Assert LinkedIn preview visible (selector: [data-testid="linkedin-preview"])
      7. Assert Twitter preview visible (selector: [data-testid="twitter-preview"])
      8. Click "Post All"
      9. Assert success: both platforms show "Posted" status
      10. Query DB: SELECT COUNT(*) FROM cross_posts WHERE broadcast_id = [latest_broadcast_id]
      11. Assert count = 2
    Expected Result: Both platforms posted in single action
    Failure Indicators: Only one platform posted, adaptation timeout, missing preview
    Evidence: .sisyphus/evidence/task-25-broadcast-both.png

  Scenario: Partial failure — Twitter fails, LinkedIn succeeds
    Tool: Bash (bun)
    Preconditions: LinkedIn connected, Twitter token expired/invalid
    Steps:
      1. Trigger broadcast to both platforms via orchestrator
      2. Assert LinkedIn cross_post status = 'posted'
      3. Assert Twitter cross_post status = 'failed'
      4. Assert error message stored for Twitter post
      5. Assert LinkedIn post was NOT rolled back
    Expected Result: Independent platform handling, no cascading failure
    Failure Indicators: Both fail, LinkedIn rolled back, no error recorded
    Evidence: .sisyphus/evidence/task-25-partial-failure.txt
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `feat(broadcast): multi-platform broadcasting with parallel execution, partial failure handling`
  - Files: `src/lib/broadcast/**`, `src/inngest/functions/broadcast.ts`, `src/app/(dashboard)/crosspost/broadcast/**`
  - Pre-commit: `bun test --run`

- [ ] 26. Recurring Post Schedules — Cron-Based Recurrence

  **What to do**:
  - Create recurring schedule service at `src/lib/scheduling/recurring.ts`:
    - `createRecurringSchedule(params)` — saves recurrence rule: daily/weekly/monthly + time + platforms + content template
    - `getNextOccurrence(schedule)` — calculates next fire time from cron expression
    - `pauseSchedule(id)` / `resumeSchedule(id)` — toggle active state
  - Create DB schema:
    - `recurring_schedules` table: id, user_id, channel_id, frequency (daily/weekly/monthly), day_of_week (for weekly), day_of_month (for monthly), time_utc, timezone, platforms[], content_template_id (optional), is_active, created_at
  - Create Inngest cron function at `src/inngest/functions/scheduling/process-recurring.ts`:
    - Runs every 15 minutes
    - Queries active recurring_schedules where next occurrence is within the window
    - Creates scheduled_posts entries for each upcoming occurrence
    - Marks occurrence as "queued" to prevent duplicates
  - Update scheduling UI (Task 11 calendar) with recurrence option:
    - When scheduling a post: "Repeat" dropdown → None / Daily / Weekly / Monthly
    - For Weekly: select day(s) of week
    - For Monthly: select day of month
    - Show recurring posts on calendar with repeat icon
    - "Edit series" vs "Edit this occurrence" option
  - Write TDD tests: recurrence calculation, cron processing, duplicate prevention, timezone handling

  **Must NOT do**:
  - No custom cron expressions (only predefined: daily/weekly/monthly)
  - No complex recurrence (every 2 weeks, first Monday of month — V2)
  - No automatic content generation for recurring posts (user provides content each time, or links a template)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 25 for broadcast foundation)
  - **Parallel Group**: Wave 5 (after T25)
  - **Blocks**: None
  - **Blocked By**: Tasks 11 (scheduling engine), 25 (broadcasting)

  **References**:
  - **Pattern Reference**: Task 11 scheduling engine — calendar UI to extend with recurrence
  - **Pattern Reference**: Task 25 broadcast — recurring posts use broadcast for multi-platform delivery
  - **Pattern Reference**: Task 7 Inngest cron — cron function pattern for periodic processing
  - **External**: Inngest scheduled functions: https://www.inngest.com/docs/guides/scheduled-functions

  **Acceptance Criteria**:
  - [ ] User can set recurrence: Daily, Weekly (with day picker), Monthly (with date picker)
  - [ ] Recurring posts appear on calendar with repeat icon
  - [ ] Inngest cron creates scheduled_posts for upcoming occurrences
  - [ ] No duplicate posts created for same occurrence
  - [ ] Pause/resume toggle works
  - [ ] "Edit series" updates all future occurrences
  - [ ] Timezone-aware: user sees times in their timezone
  - [ ] TDD tests pass

  **QA Scenarios:**
  ```
  Scenario: Create weekly recurring schedule
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user, channel connected, scheduling calendar visible
    Steps:
      1. Navigate to /en/dashboard/schedule
      2. Click a future date on the calendar to create new scheduled post
      3. Fill content
      4. Select "Repeat: Weekly"
      5. Check "Monday" and "Thursday"
      6. Select time: 10:00
      7. Click Save
      8. Assert recurring icon appears on selected days in calendar
      9. Navigate to next week — assert same days have posts
      10. Assert recurring_schedules table has entry with frequency='weekly', day_of_week='[1,4]'
    Expected Result: Weekly recurrence set, visible on calendar for future weeks
    Failure Indicators: No repeat icon, posts not on next week, wrong days
    Evidence: .sisyphus/evidence/task-26-recurring-weekly.png

  Scenario: Pause recurring schedule
    Tool: Playwright (playwright skill)
    Preconditions: Active recurring schedule exists
    Steps:
      1. Navigate to schedule page
      2. Click on a recurring post
      3. Click "Edit Series"
      4. Toggle "Active" to off / click "Pause"
      5. Assert schedule shows "Paused" badge
      6. Navigate to future weeks — assert no new posts generated
    Expected Result: Paused schedules stop generating new posts
    Failure Indicators: Posts still appearing, toggle doesn't persist
    Evidence: .sisyphus/evidence/task-26-recurring-pause.png
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `feat(scheduling): recurring post schedules with daily/weekly/monthly frequency, calendar integration`
  - Files: `src/lib/scheduling/recurring.ts`, `src/inngest/functions/scheduling/process-recurring.ts`, `drizzle/migrations/`
  - Pre-commit: `bun test --run`

- [ ] 27. Dashboard Home Page — Overview, Activity Feed, Quick Actions

  **What to do**:
  - Create dashboard home page at `src/app/(dashboard)/page.tsx` (root dashboard route):
    - **Welcome section**: "Welcome back, {name}" with current date and timezone
    - **Quick stats row** (4 cards):
      - Cross-posts this month: {used}/{limit}
      - Scheduled posts: count upcoming
      - Total engagement this week: sum from analytics
      - Connected platforms: icons for active platforms
    - **Quick actions row**:
      - "New Cross-Post" button → /crosspost
      - "Quick Broadcast" button → /crosspost/broadcast
      - "View Schedule" button → /schedule
    - **Recent activity feed** (last 10 items):
      - Posts adapted, scheduled, published, failed — with timestamps
      - Each item: icon (platform) + action + content snippet + time ago
    - **Upcoming scheduled posts** (next 5):
      - Mini list with: content preview, platform icon, scheduled time
      - "View all" link to calendar
    - **Performance summary** (mini chart):
      - Small sparkline showing engagement trend last 7 days
      - Link to full analytics page
  - Fetch data via server actions that aggregate from: cross_posts, scheduled_posts, post_analytics, subscriptions tables
  - All sections handle empty state individually
  - Write TDD tests: data aggregation, component rendering, empty states

  **Must NOT do**:
  - No onboarding wizard (simple empty states with CTAs are sufficient)
  - No drag-and-drop widgets/layout customization
  - No AI-generated summaries ("Your best post this week was..." — V2)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Dashboard home is the first thing users see — must be polished and well-organized

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 25, 28)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Tasks 6 (UI shell), 20 (analytics data), 21 (analytics UI components for sparkline)

  **References**:
  - **Pattern Reference**: Task 6 UI shell — dashboard layout wrapper
  - **Pattern Reference**: Task 21 analytics — reuse `metrics-card.tsx` component
  - **Pattern Reference**: Task 9 content library — server action pattern for data aggregation
  - **Data Reference**: Task 20 analytics tables — query post_analytics for engagement summary
  - **Data Reference**: Task 22 billing — query subscriptions for current tier/quota display
  - **External**: shadcn/ui card: https://ui.shadcn.com/docs/components/card

  **Acceptance Criteria**:
  - [ ] Dashboard home renders at `/en/dashboard` (root)
  - [ ] Welcome section shows user name and date
  - [ ] 4 quick stats cards display correct live data
  - [ ] Quick action buttons navigate to correct pages
  - [ ] Recent activity feed shows last 10 events
  - [ ] Upcoming scheduled posts list shows next 5
  - [ ] Mini sparkline chart shows 7-day engagement trend
  - [ ] All sections handle empty state (no data yet)
  - [ ] TDD tests pass

  **QA Scenarios:**
  ```
  Scenario: Dashboard home with active data
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user with: 3 cross-posts, 2 scheduled posts, analytics data, Plus tier
    Steps:
      1. Navigate to /en/dashboard
      2. Assert welcome: text contains user's name
      3. Assert stats cards (selector: [data-testid="quick-stats"] > div) count = 4
      4. Assert cross-posts card shows "3/50" (Plus tier)
      5. Assert scheduled card shows "2"
      6. Click "New Cross-Post" button
      7. Assert navigated to /en/dashboard/crosspost
      8. Go back to dashboard
      9. Assert activity feed has items (selector: [data-testid="activity-feed"] > li)
      10. Assert upcoming posts list shows entries with time
      11. Screenshot
    Expected Result: Complete dashboard with all sections populated
    Failure Indicators: Missing sections, wrong counts, broken navigation, NaN values
    Evidence: .sisyphus/evidence/task-27-dashboard-home.png

  Scenario: Dashboard home empty state (new user)
    Tool: Playwright (playwright skill)
    Preconditions: New user, no channels, no posts, Free tier
    Steps:
      1. Navigate to /en/dashboard
      2. Assert welcome section visible
      3. Assert stats cards show zeros or empty states
      4. Assert activity feed shows "No activity yet" message
      5. Assert CTA: "Connect your first Telegram channel" visible
      6. Screenshot
    Expected Result: Clean empty state with onboarding CTAs
    Failure Indicators: Errors, NaN, broken layout, no guidance
    Evidence: .sisyphus/evidence/task-27-dashboard-empty.png
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `feat(dashboard): home page with stats, activity feed, upcoming posts, quick actions`
  - Files: `src/app/(dashboard)/page.tsx`, `src/components/dashboard/**`
  - Pre-commit: `bun test --run`

- [ ] 28. Settings Page — Profile, Connected Accounts, Billing, Preferences

  **What to do**:
  - Create settings page at `src/app/(dashboard)/settings/page.tsx` with tabs:
    - **Profile tab** (`src/app/(dashboard)/settings/profile/`):
      - Display name, email (read-only from Supabase Auth), avatar
      - Timezone selector (dropdown with common timezones)
      - Preferred language (ru/en toggle)
    - **Connected Accounts tab** (`src/app/(dashboard)/settings/connections/`):
      - Telegram: show connected bot name, channels list, "Disconnect" button
      - LinkedIn: show connected profile name, "Connect" / "Disconnect" button, token expiry warning
      - Twitter: show connected handle, "Connect" / "Disconnect" button, token expiry warning
      - Each connection shows status: ✅ Connected / ⚠️ Token expiring / ❌ Disconnected
    - **Billing tab** (`src/app/(dashboard)/settings/billing/`):
      - Redirect to or embed billing page (Task 22)
      - Current plan display, "Manage Subscription" button to Stripe portal
    - **AI Preferences tab** (`src/app/(dashboard)/settings/ai/`):
      - Preferred AI model selector: GPT-4.1 mini / Claude Haiku / Auto (cheapest)
      - Adaptation tone: Professional / Casual / Match original
      - Default target language (English, can't change in V1 — but show it)
  - Create server actions for each settings section:
    - `updateProfile()`, `updatePreferences()`, `disconnectPlatform()`, `getSettings()`
  - Store user preferences in `user_preferences` table: user_id, timezone, language, ai_model, adaptation_tone
  - Write TDD tests: settings CRUD, platform disconnect flow, preference persistence

  **Must NOT do**:
  - No account deletion (V2 — requires GDPR flow)
  - No password change (handled by Supabase Auth UI)
  - No API key management (users don't need their own API keys)
  - No notification preferences (no notification system in V1)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Settings pages need clear organization and intuitive layout across multiple tabs

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 25, 27)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Tasks 4 (Auth), 6 (UI shell), 17 (LinkedIn OAuth), 18 (Twitter OAuth), 22 (billing)

  **References**:
  - **Pattern Reference**: Task 4 Auth — user session for profile data
  - **Pattern Reference**: Task 17 LinkedIn OAuth — connection status and disconnect
  - **Pattern Reference**: Task 18 Twitter OAuth — connection status and disconnect
  - **Pattern Reference**: Task 22 billing — Stripe portal link for billing tab
  - **Pattern Reference**: Task 6 UI shell — layout and navigation patterns
  - **External**: shadcn/ui tabs: https://ui.shadcn.com/docs/components/tabs
  - **External**: shadcn/ui select (timezone picker): https://ui.shadcn.com/docs/components/select

  **Acceptance Criteria**:
  - [ ] Settings page renders at `/en/dashboard/settings` with 4 tabs
  - [ ] Profile tab: name displays, timezone selector works, language toggle works
  - [ ] Connected Accounts: shows status for Telegram/LinkedIn/Twitter
  - [ ] Disconnect button removes OAuth token and shows disconnected state
  - [ ] Token expiry warning shown when LinkedIn/Twitter token expires within 7 days
  - [ ] Billing tab links to Stripe portal
  - [ ] AI Preferences: model selector and tone selector persist to DB
  - [ ] All settings persist across page reload
  - [ ] TDD tests pass

  **QA Scenarios:**
  ```
  Scenario: Update profile settings
    Tool: Playwright (playwright skill)
    Preconditions: Authenticated user
    Steps:
      1. Navigate to /en/dashboard/settings
      2. Assert Profile tab is active by default
      3. Change timezone to "Europe/Moscow" via dropdown
      4. Change language to "Russian" via toggle
      5. Click Save
      6. Assert success toast
      7. Refresh page
      8. Assert timezone shows "Europe/Moscow"
      9. Assert UI language is now Russian (check sidebar text)
    Expected Result: Profile settings persisted and applied
    Failure Indicators: Settings reset on refresh, language didn't change, timezone wrong
    Evidence: .sisyphus/evidence/task-28-profile-settings.png

  Scenario: Disconnect LinkedIn account
    Tool: Playwright (playwright skill)
    Preconditions: User with LinkedIn connected
    Steps:
      1. Navigate to /en/dashboard/settings
      2. Click "Connected Accounts" tab
      3. Assert LinkedIn shows "✅ Connected" with profile name
      4. Click "Disconnect" next to LinkedIn
      5. Assert confirmation dialog appears
      6. Confirm disconnect
      7. Assert LinkedIn now shows "❌ Disconnected" with "Connect" button
      8. Query DB: assert oauth_tokens row for LinkedIn is deleted/revoked
    Expected Result: Clean disconnection with status update
    Failure Indicators: Token not deleted, status not updated, error on disconnect
    Evidence: .sisyphus/evidence/task-28-disconnect-linkedin.png
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `feat(settings): profile, connected accounts, billing, AI preferences with tabbed layout`
  - Files: `src/app/(dashboard)/settings/**`, `src/lib/settings/**`
  - Pre-commit: `bun test --run`

- [ ] 29. Error Handling + Empty States + Loading States Audit

  **What to do**:
  - Audit ALL dashboard pages and implement consistent UX patterns:
  - **Loading states** for every page/component that fetches data:
    - Create reusable skeleton components at `src/components/ui/skeletons/`:
      - `table-skeleton.tsx` — for content library, analytics table, etc.
      - `card-skeleton.tsx` — for metric cards, preview cards
      - `chart-skeleton.tsx` — for analytics charts
      - `calendar-skeleton.tsx` — for scheduling calendar
    - Use Suspense boundaries with skeleton fallbacks where applicable
  - **Empty states** for every list/table/chart:
    - Create `src/components/ui/empty-state.tsx` — reusable: icon + title + description + CTA button
    - Map each page to its empty state:
      - Content library: "No posts imported yet" + "Connect a channel" CTA
      - Schedule: "No upcoming posts" + "Create your first schedule" CTA
      - Analytics: "No data yet" + "Cross-post content to see analytics" CTA
      - Channels: "No channels connected" + "Add your first channel" CTA
      - Cross-post: "No content to cross-post" + "Import from Telegram" CTA
  - **Error states** for every data fetch:
    - Create `src/components/ui/error-state.tsx` — reusable: error icon + message + "Retry" button
    - Create `src/app/(dashboard)/error.tsx` — dashboard-level error boundary
    - Create per-route `error.tsx` files for route-level error boundaries
    - Ensure all server actions return structured errors: `{ success: false, error: { code, message } }`
    - Ensure no empty catch blocks anywhere (grep + fix)
  - **Toast notifications** for all user actions:
    - Success: green toast for save/create/delete/connect
    - Error: red toast with actionable message (not "Something went wrong" — tell user WHAT went wrong)
    - Use shadcn/ui `sonner` toast library consistently
  - Write TDD tests: error boundary rendering, empty state content, skeleton display

  **Must NOT do**:
  - No generic "Something went wrong" messages — always specific
  - No `console.error` in production without user-facing feedback
  - No loading spinners for > 3 seconds without progress indication

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-ui-ux`]
  - `frontend-ui-ux`: Polishing UX states is design-sensitive work

  **Parallelization**:
  - **Can Run In Parallel**: NO (audit task — runs after all UI tasks complete)
  - **Parallel Group**: Wave 5 (last UI task)
  - **Blocks**: None
  - **Blocked By**: All UI tasks (6, 9, 10, 11, 13, 19, 21, 24, 27, 28)

  **References**:
  - **Pattern Reference**: All dashboard pages from Tasks 6, 9, 10, 11, 13, 19, 21, 24, 27, 28
  - **External**: shadcn/ui skeleton: https://ui.shadcn.com/docs/components/skeleton
  - **External**: shadcn/ui sonner (toasts): https://ui.shadcn.com/docs/components/sonner
  - **External**: Next.js error handling: https://nextjs.org/docs/app/building-your-application/routing/error-handling
  - **External**: Next.js loading UI: https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming

  **Acceptance Criteria**:
  - [ ] Every dashboard page has: loading skeleton, empty state, error boundary
  - [ ] Reusable skeleton components created for: table, card, chart, calendar
  - [ ] Reusable empty-state component with per-page CTA
  - [ ] Reusable error-state component with retry button
  - [ ] Dashboard-level `error.tsx` catches unhandled errors
  - [ ] All toasts use sonner consistently (no alert(), no console-only errors)
  - [ ] Grep confirms: zero empty catch blocks, zero `console.error` without user feedback
  - [ ] All server actions return structured error format
  - [ ] TDD tests pass for error boundaries, empty states, skeletons

  **QA Scenarios:**
  ```
  Scenario: Empty states across all pages
    Tool: Playwright (playwright skill)
    Preconditions: New user, no data, all tables empty
    Steps:
      1. Navigate to /en/dashboard — assert empty state CTAs visible
      2. Navigate to /en/dashboard/content — assert "No posts imported yet" message + CTA
      3. Navigate to /en/dashboard/schedule — assert "No upcoming posts" + CTA
      4. Navigate to /en/dashboard/analytics — assert "No data yet" + CTA
      5. Navigate to /en/dashboard/channels — assert "No channels connected" + CTA
      6. For each page: assert no JS errors in console
      7. Screenshot each page
    Expected Result: Every page has a clean, helpful empty state
    Failure Indicators: Blank pages, JS errors, missing CTAs, generic messages
    Evidence: .sisyphus/evidence/task-29-empty-states.png

  Scenario: Error boundary catches server error
    Tool: Playwright (playwright skill)
    Preconditions: Inject a server error (e.g., invalid DB query in content page)
    Steps:
      1. Navigate to page with injected error
      2. Assert error boundary renders (not blank page)
      3. Assert error message is specific (not "Something went wrong")
      4. Assert "Retry" button visible
      5. Click Retry
      6. Assert page attempts reload
    Expected Result: Graceful error handling with recovery option
    Failure Indicators: Blank page, unhandled exception, no retry option
    Evidence: .sisyphus/evidence/task-29-error-boundary.png
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `fix(ux): comprehensive loading skeletons, empty states, error boundaries, toast notifications`
  - Files: `src/components/ui/skeletons/**`, `src/components/ui/empty-state.tsx`, `src/components/ui/error-state.tsx`, `src/app/(dashboard)/**/error.tsx`
  - Pre-commit: `bun test --run`

- [ ] 30. CI/CD Pipeline — GitHub Actions + Vercel Deploy

  **What to do**:
  - Create GitHub Actions workflow at `.github/workflows/ci.yml`:
    - **Trigger**: push to `main`, pull_request to `main`
    - **Jobs** (parallel where possible):
      - `typecheck`: `tsc --noEmit`
      - `lint`: `bun lint`
      - `test`: `bun test --run`
      - `e2e` (only on main push): `bunx playwright test`
      - `build`: `bun run build` (depends on typecheck + lint + test passing)
  - Create `.github/workflows/playwright.yml` for E2E tests:
    - Uses `playwright` GitHub Action for browser setup
    - Runs against Vercel preview deploy URL (for PRs)
    - Uploads test results and screenshots as artifacts
  - Configure Vercel deployment:
    - `vercel.json` — build settings, environment variables reference
    - Document required env vars in `.env.example`:
      - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
      - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
      - `OPENROUTER_API_KEY`
      - `TELEGRAM_BOT_TOKEN`
      - `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
      - `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`
      - `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`
  - Create pre-commit hook via `husky` + `lint-staged`:
    - On commit: run `tsc --noEmit` + `bun lint --fix` on staged files
  - Write a simple smoke test: `bun test:smoke` that verifies app starts and /api/health returns 200

  **Must NOT do**:
  - No complex deployment strategies (blue-green, canary — Vercel handles this)
  - No Docker setup (Vercel serverless deployment)
  - No secrets in workflow files (use GitHub Secrets)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (independent of all other Wave 5 tasks)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Tasks 1 (project scaffolding), 2 (test infrastructure)

  **References**:
  - **Pattern Reference**: Task 1 project scaffolding — package.json scripts to use in CI
  - **Pattern Reference**: Task 2 test infrastructure — vitest + Playwright config
  - **External**: GitHub Actions for Next.js: https://github.com/actions/setup-node
  - **External**: Playwright GitHub Action: https://playwright.dev/docs/ci-intro
  - **External**: Vercel CLI: https://vercel.com/docs/cli
  - **External**: Husky: https://typicode.github.io/husky/
  - **External**: lint-staged: https://github.com/lint-staged/lint-staged

  **Acceptance Criteria**:
  - [ ] `ci.yml` runs on push to main and PRs
  - [ ] Parallel jobs: typecheck, lint, test all pass
  - [ ] Build succeeds after checks pass
  - [ ] E2E tests run with Playwright on main push
  - [ ] `.env.example` lists all required environment variables
  - [ ] Pre-commit hook runs typecheck + lint on staged files
  - [ ] Smoke test verifies app starts and /api/health returns 200
  - [ ] Failed CI blocks merge (branch protection recommended in docs)

  **QA Scenarios:**
  ```
  Scenario: CI pipeline passes on clean codebase
    Tool: Bash
    Preconditions: All code committed, tests passing locally
    Steps:
      1. Run: tsc --noEmit
      2. Assert exit code 0
      3. Run: bun lint
      4. Assert exit code 0
      5. Run: bun test --run
      6. Assert exit code 0, all tests pass
      7. Run: bun run build
      8. Assert exit code 0, .next/ directory created
      9. Run: bun test:smoke (start app, curl /api/health, stop)
      10. Assert health check returns {"status":"ok"}
    Expected Result: Full CI pipeline passes locally
    Failure Indicators: Any step exits non-zero, build fails, health check fails
    Evidence: .sisyphus/evidence/task-30-ci-local.txt

  Scenario: Pre-commit hook catches lint errors
    Tool: Bash
    Preconditions: Husky + lint-staged installed
    Steps:
      1. Create a file with intentional lint error (unused variable)
      2. git add the file
      3. git commit -m "test"
      4. Assert commit is rejected by pre-commit hook
      5. Assert lint error message is shown
      6. Fix the lint error, git add, git commit
      7. Assert commit succeeds
    Expected Result: Pre-commit hook enforces code quality
    Failure Indicators: Bad code committed, hook not running, no error message
    Evidence: .sisyphus/evidence/task-30-precommit-hook.txt
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `chore(ci): GitHub Actions CI/CD pipeline, Playwright E2E, Husky pre-commit hooks`
  - Files: `.github/workflows/**`, `vercel.json`, `.env.example`, `.husky/**`
  - Pre-commit: `bun test --run`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Full E2E QA** — `unspecified-high` + `playwright` skill
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit | Message | Pre-commit |
|------|--------|---------|------------|
| 1 | After T1-T7 | `chore: project scaffolding with Next.js 15, Supabase, Inngest, vitest, Playwright, i18n, UI shell` | `bun test && bun lint` |
| 2 | After T8-T13 | `feat(telegram): bot integration, content/media library, scheduling engine, message parser` | `bun test && bun lint` |
| 3 | After T14-T19 | `feat(crosspost): AI adaptation engine, LinkedIn/Twitter OAuth, cross-post workflow UI` | `bun test && bun lint` |
| 4 | After T20-T24 | `feat(analytics+billing): analytics dashboard, Stripe billing, usage tracking, welcome messages` | `bun test && bun lint` |
| 5 | After T25-T30 | `feat(polish): multi-platform broadcast, recurring schedules, dashboard home, settings, CI/CD` | `bun test && bun lint` |
| FINAL | After F1-F4 | `chore: final verification pass, evidence captured` | `bun test && bun lint && bunx playwright test` |

---

## Success Criteria

### Verification Commands
```bash
bun test                          # Expected: ALL tests pass
bun lint                          # Expected: 0 errors, 0 warnings
tsc --noEmit                      # Expected: 0 errors
bunx playwright test              # Expected: ALL E2E tests pass
curl http://localhost:3000/api/health  # Expected: {"status":"ok"}
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All vitest unit/integration tests pass
- [ ] All Playwright E2E tests pass
- [ ] TypeScript compiles with zero errors
- [ ] App deploys successfully to Vercel
- [ ] Telegram bot connects and receives webhook updates
- [ ] AI adaptation produces English output from Russian input
- [ ] LinkedIn posting works end-to-end
- [ ] Twitter posting works end-to-end
- [ ] Scheduling calendar shows correct timezone-adjusted times
- [ ] Stripe checkout flow completes for Plus and Pro tiers
- [ ] Free tier enforces 5 cross-posts/month limit
- [ ] Russian and English UI both render correctly
