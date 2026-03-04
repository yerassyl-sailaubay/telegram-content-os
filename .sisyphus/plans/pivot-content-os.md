# Pivot to Content OS for Telegram Creators

## TL;DR

> **Quick Summary**: Transform the app from "cross-post Telegram to LinkedIn/Twitter" into "content OS for Telegram creators" — adding YouTube/URL→Post generation, content repurposing, Telegram publishing, AI-powered content calendar, and Telegram-focused analytics, while preserving all existing cross-posting functionality as a secondary feature.
>
> **Deliverables**:
>
> - YouTube/URL → Telegram post generator (paste link, get draft in creator's voice)
> - Content repurposer (1 post → multiple variations)
> - Drafts & ideas vault with AI "develop this idea" action
> - Direct Telegram channel publishing from the app
> - Content calendar with AI gap-fill suggestions
> - Reshaped dashboard & navigation (content-creation-first)
> - Enhanced Telegram analytics (growth rate, best posting time, content performance)
> - Billing pivot from "cross-posts" to "AI generations" metering
>
> **Estimated Effort**: XL (40+ tasks across 6 waves)
> **Parallel Execution**: YES — 6 waves, up to 8 parallel tasks per wave
> **Critical Path**: Schema migrations → Content library extension → AI prompts → Telegram publishing → Calendar AI fill → Dashboard reshape

---

## Context

### Original Request

Transform the Telegram Content OS from a cross-posting tool into a full content creation and management platform for Telegram creators. The new core value proposition is "Never run out of content for your Telegram channel." Cross-posting to LinkedIn/Twitter becomes a secondary feature, not deleted.

### Interview Summary

**Key Discussions**:

- **Schedule decoupling**: Generalize the `schedules` table by making `crossPostId` nullable and adding `contentLibraryId` FK + `targetType` enum, rather than creating a separate table
- **Plan scope**: Full pivot — all 8 items from the pivot plan in ONE plan
- **Test strategy**: TDD — write tests first (RED→GREEN→REFACTOR)
- **Podcast**: Deferred to V1.5 (complex pipeline, not core)
- **YouTube transcripts**: Use `youtube-transcript-plus` (free, no API key, serverless-compatible). YouTube Data API v3 is NOT viable (can't download captions for non-owned videos)
- **Article extraction**: Use `@extractus/article-extractor`

**Research Findings**:

- Telegram client **already has** `sendMessage` and `sendPhoto` methods — no need to build them
- `aiCallsCount` column already exists in `usage_tracking` table but is **never incremented or enforced** — enforcement pipeline needs building from scratch
- `schedules.crossPostId` is NOT NULL FK — the entire scheduling pipeline is structurally coupled to cross-posts
- `platformEnum` = `["linkedin", "twitter"]` — should NOT add "telegram" (it's the primary platform, not a cross-post target)
- `content_library` is minimal — no status, source type, channel association, or source URL tracking
- Several dashboard pages are empty state (posts, schedule, media) — available for building
- AI `Platform` type and `AdaptationRequest` are scoped to cross-posting — new features need different pipeline shapes

### Metis Review

**Identified Gaps** (addressed):

- AI quota enforcement is a phantom — `aiCallsCount` exists but `incrementAiUsage()` and `enforceAiQuota()` don't. Must build from scratch BEFORE any new AI features.
- Schedule generalization is deeper than anticipated — `executeScheduledPost`, `processRecurringSchedules`, and `getSchedulesInRange` all hardcode cross-post resolution
- Telegram client lacks `sendMediaGroup` for multi-image posts and `sendPoll` for polls
- Content library needs 5+ new columns (sourceType, status, channelId, sourceUrl, sourceMetadata)
- No migration workflow exists beyond initial schema — need `drizzle-kit generate` for every change
- YouTube URL parser must handle all variants (youtu.be, shorts, live, embed)
- Telegram message limit is 4096 chars — AI must be constrained or system must auto-split
- No URL sanitization for external URL processing (SSRF risk)
- `platformEnum` must NOT be modified to add "telegram" — Telegram publishing routes through content_library → schedules, not cross_posts

---

## Work Objectives

### Core Objective

Enable Telegram creators to generate, manage, schedule, and publish content for their Telegram channels from any source (YouTube videos, articles, existing posts, raw ideas), with AI assistance throughout the workflow.

### Concrete Deliverables

- `src/lib/sources/youtube.ts` — YouTube transcript extraction module
- `src/lib/sources/article.ts` — Article/URL content extraction module
- `src/lib/sources/url-parser.ts` — Universal URL parser + sanitizer
- `src/lib/ai/prompts/generate-from-source.ts` — Source→Telegram post prompt
- `src/lib/ai/prompts/repurpose-telegram.ts` — Repurpose post into variations
- `src/lib/ai/prompts/idea-to-draft.ts` — Expand idea into full post
- `src/lib/ai/prompts/calendar-fill.ts` — Suggest content for empty calendar slots
- `src/lib/ai/generation-engine.ts` — New AI pipeline for content generation (distinct from adaptation)
- Extended `content_library` schema with sourceType, status, channelId, sourceUrl, sourceMetadata
- Generalized `schedules` schema with nullable crossPostId, new contentLibraryId, targetType enum
- `src/lib/billing/ai-quota.ts` — AI generation quota enforcement
- Extended Telegram client with `sendMediaGroup`, `sendPoll` methods
- New Inngest jobs: `processExternalSource`, `generateFromSource`, `publishToTelegram`, `suggestCalendarFill`
- New server actions: `createFromUrl`, `repurposePost`, `developIdea`, `publishToTelegram`, `getCalendarGaps`
- Reshaped dashboard with calendar-centric home, quick-capture, content creation CTAs
- Restructured navigation (content-creation-first, cross-posting demoted)
- Enhanced Telegram analytics (growth rate, best posting time, content type breakdown)
- Billing UI/logic updated for "AI generations" metering

### Definition of Done

- [ ] `bun test` — all tests pass (including all new TDD tests)
- [ ] `bun build` — compiles with zero TypeScript errors
- [ ] `bun lint` — no lint errors
- [ ] YouTube URL pasted → AI draft generated in content library (happy path + error states)
- [ ] Article URL pasted → AI draft generated in content library
- [ ] Content repurposed → N variations created as drafts
- [ ] Idea expanded → full Telegram post draft created
- [ ] Draft published directly to Telegram channel via bot API
- [ ] Scheduled Telegram post fires at correct time via Inngest
- [ ] Content calendar shows gaps, AI suggests fill for each gap
- [ ] Dashboard shows calendar, quick-capture, and recent drafts
- [ ] Navigation restructured with Create/Content Library/Schedule as primary
- [ ] Cross-posting still works end-to-end (no regression)
- [ ] AI quota enforced before every AI operation
- [ ] Billing page shows "AI Generations" meter

### Must Have

- YouTube transcript extraction with graceful fallback when captions unavailable
- Article content extraction from arbitrary URLs
- Channel voice profile used in ALL new AI generation prompts
- Telegram publishing via existing bot API (sendMessage, sendPhoto, sendMediaGroup)
- Content library with source tracking and draft status management
- AI generation quota enforcement (enforceAiQuota before every AI call)
- Proper Drizzle migrations for every schema change (not `push`)
- URL sanitization for all external URL inputs (prevent SSRF)
- Telegram 4096-char message limit handling in generated content
- i18n support for all new UI strings (ru + en)

### Must NOT Have (Guardrails)

- Must NOT modify `platformEnum` to add "telegram" — Telegram is primary platform, not a cross-post target
- Must NOT break existing cross-posting functionality (LinkedIn/Twitter flows must still work)
- Must NOT add AI operations without quota enforcement — every AI call must go through `enforceAiQuota()`
- Must NOT use `drizzle-kit push` for schema changes — generate proper migrations
- Must NOT hand-roll URL fetching without sanitization (no SSRF)
- Must NOT create a "god table" — keep schedules table clean, no 10+ nullable polymorphic columns
- Must NOT hardcode locale strings — use next-intl `useTranslations()` / `getTranslations()`
- Must NOT handle YouTube playlists, channels, or live streams — V1 = single video URL with captions only
- Must NOT build "freestyle" AI repurposing — V1 = 3 fixed modes (shorter, thread, poll)
- Must NOT build "trending topics" for calendar fill — V1 = suggest from existing drafts/ideas only
- Must NOT build podcast transcription — deferred to V1.5
- Must NOT build competitor/niche monitoring — deferred to V1.5
- Must NOT add empty catch blocks, `as any`, `@ts-ignore`, or console.log in production code

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision

- **Infrastructure exists**: YES (Vitest configured, `__tests__/` pattern established)
- **Automated tests**: TDD — tests first (RED→GREEN→REFACTOR)
- **Framework**: Vitest with globals enabled
- **Each task**: Write failing test → implement → verify test passes → refactor

### QA Policy

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Use interactive_bash (tmux) — Run command, send keystrokes, validate output
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun test / bun repl) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — schema migrations + billing + types):
├── Task 1: Drizzle migration setup + content_library schema extension [quick]
├── Task 2: Schedules table generalization schema [quick]
├── Task 3: External sources table creation [quick]
├── Task 4: AI generation quota enforcement module [deep]
├── Task 5: URL parser + sanitizer module [quick]
├── Task 6: AI generation types + generation engine interface [quick]
└── Task 7: Extend Telegram client (sendMediaGroup, sendPoll) [quick]

Wave 2 (Content Sources — extraction + AI prompts):
├── Task 8: YouTube transcript extraction module (depends: 5) [deep]
├── Task 9: Article content extraction module (depends: 5) [deep]
├── Task 10: AI prompt — generate-from-source.ts (depends: 6) [deep]
├── Task 11: AI prompt — repurpose-telegram.ts (depends: 6) [deep]
├── Task 12: AI prompt — idea-to-draft.ts (depends: 6) [deep]
├── Task 13: AI generation engine implementation (depends: 6, 4) [deep]
└── Task 14: Content library server actions extension (depends: 1) [unspecified-high]

Wave 3 (Backend Pipelines — Inngest jobs + server actions):
├── Task 15: Inngest job — processExternalSource (depends: 8, 9, 3) [deep]
├── Task 16: Inngest job — generateFromSource (depends: 10, 13, 15) [deep]
├── Task 17: Server action — createFromUrl (depends: 15, 16, 14) [unspecified-high]
├── Task 18: Server action — repurposePost (depends: 11, 13, 14) [unspecified-high]
├── Task 19: Server action — developIdea (depends: 12, 13, 14) [unspecified-high]
├── Task 20: Inngest job — publishToTelegram (depends: 7, 2) [deep]
├── Task 21: Server action — publishToTelegram + scheduling (depends: 20, 2) [unspecified-high]
├── Task 22: AI prompt — calendar-fill.ts (depends: 6) [deep]
└── Task 23: Inngest job — suggestCalendarFill (depends: 22, 13, 14) [deep]

Wave 4 (UI — Content Creation):
├── Task 24: "Create from URL" page + form UI (depends: 17) [visual-engineering]
├── Task 25: "Repurpose" modal/page UI (depends: 18) [visual-engineering]
├── Task 26: Quick-capture component (always-accessible idea input) (depends: 19) [visual-engineering]
├── Task 27: Content library page rebuild (source types, status filters) (depends: 14) [visual-engineering]
├── Task 28: Telegram publish UI (preview + send/schedule) (depends: 21) [visual-engineering]
└── Task 29: Calendar gap detection + AI suggestion UI (depends: 23) [visual-engineering]

Wave 5 (Navigation + Dashboard + Analytics + Billing):
├── Task 30: Navigation restructure (new sidebar hierarchy) (depends: 24-29) [visual-engineering]
├── Task 31: Dashboard home rebuild (calendar, quick-capture, drafts) (depends: 26, 29, 30) [visual-engineering]
├── Task 32: Enhanced Telegram analytics backend (depends: none) [unspecified-high]
├── Task 33: Enhanced Telegram analytics UI (depends: 32) [visual-engineering]
├── Task 34: Billing UI update (AI generations meter) (depends: 4) [visual-engineering]
├── Task 35: Billing plan definitions + feature text update (depends: 4) [quick]
└── Task 36: i18n message updates (ru.json + en.json) (depends: 24-35) [quick]

Wave FINAL (Verification — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 14 → Task 17 → Task 24 → Task 30 → Task 31 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Waves 1 & 2)
```

### Dependency Matrix

| Task  | Depends On | Blocks             | Wave  |
| ----- | ---------- | ------------------ | ----- |
| 1     | —          | 14, 2              | 1     |
| 2     | —          | 20, 21, 2          | 1     |
| 3     | —          | 15, 2              | 1     |
| 4     | —          | 13, 34, 35         | 1     |
| 5     | —          | 8, 9, 2            | 1     |
| 6     | —          | 10, 11, 12, 13, 22 | 1     |
| 7     | —          | 20, 2              | 1     |
| 8     | 5          | 15, 3              | 2     |
| 9     | 5          | 15, 3              | 2     |
| 10    | 6          | 16, 3              | 2     |
| 11    | 6          | 18, 3              | 2     |
| 12    | 6          | 19, 3              | 2     |
| 13    | 6, 4       | 16, 18, 19, 23     | 2     |
| 14    | 1          | 17, 18, 19, 27     | 2     |
| 15    | 8, 9, 3    | 16, 4              | 3     |
| 16    | 10, 13, 15 | 17, 4              | 3     |
| 17    | 15, 16, 14 | 24                 | 3     |
| 18    | 11, 13, 14 | 25                 | 3     |
| 19    | 12, 13, 14 | 26                 | 3     |
| 20    | 7, 2       | 21                 | 3     |
| 21    | 20, 2      | 28                 | 3     |
| 22    | 6          | 23                 | 3     |
| 23    | 22, 13, 14 | 29                 | 3     |
| 24    | 17         | 30                 | 4     |
| 25    | 18         | 30                 | 4     |
| 26    | 19         | 30, 31             | 4     |
| 27    | 14         | 30                 | 4     |
| 28    | 21         | 30                 | 4     |
| 29    | 23         | 30, 31             | 4     |
| 30    | 24-29      | 31                 | 5     |
| 31    | 26, 29, 30 | 36                 | 5     |
| 32    | —          | 33                 | 5     |
| 33    | 32         | 36                 | 5     |
| 34    | 4          | 36                 | 5     |
| 35    | 4          | 36                 | 5     |
| 36    | 24-35      | F1-F4              | 5     |
| F1-F4 | 36         | —                  | FINAL |

### Agent Dispatch Summary

- **Wave 1 (7 tasks)**: T1→`quick`, T2→`quick`, T3→`quick`, T4→`deep`, T5→`quick`, T6→`quick`, T7→`quick`
- **Wave 2 (7 tasks)**: T8→`deep`, T9→`deep`, T10→`deep`, T11→`deep`, T12→`deep`, T13→`deep`, T14→`unspecified-high`
- **Wave 3 (9 tasks)**: T15→`deep`, T16→`deep`, T17→`unspecified-high`, T18→`unspecified-high`, T19→`unspecified-high`, T20→`deep`, T21→`unspecified-high`, T22→`deep`, T23→`deep`
- **Wave 4 (6 tasks)**: T24→`visual-engineering`, T25→`visual-engineering`, T26→`visual-engineering`, T27→`visual-engineering`, T28→`visual-engineering`, T29→`visual-engineering`
- **Wave 5 (7 tasks)**: T30→`visual-engineering`, T31→`visual-engineering`, T32→`unspecified-high`, T33→`visual-engineering`, T34→`visual-engineering`, T35→`quick`, T36→`quick`
- **FINAL (4 tasks)**: F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [ ] 1. Content Library Schema Extension + Migration Setup

  **What to do**:
  - RED: Write tests for the new schema fields — verify `sourceType` enum accepts all values (`telegram_import`, `idea`, `repurposed`, `external_source`, `ai_generated`), verify `status` enum (`draft`, `published`, `archived`, `scheduled`), verify `channelId` FK, `sourceUrl` varchar, `sourceMetadata` jsonb
  - GREEN: Add new columns to `src/server/db/schema/content-library.ts`:
    - `sourceType` pgEnum: `content_source_type` with values `['telegram_import', 'idea', 'repurposed', 'external_source', 'ai_generated']`
    - `status` pgEnum: `content_status` with values `['draft', 'published', 'archived', 'scheduled']` — default `'draft'`
    - `channelId` uuid FK to `telegramChannels.id` (nullable — ideas might not target a specific channel yet)
    - `sourceUrl` varchar(2048) nullable — for YouTube/article URLs
    - `sourceMetadata` jsonb nullable — for extracted metadata (video title, article author, transcript length, etc.)
  - Add relation from contentLibrary to telegramChannels
  - Generate Drizzle migration: run `bunx drizzle-kit generate` and verify migration SQL
  - Re-export new enums from `src/server/db/schema/index.ts`
  - REFACTOR: Ensure all existing content library queries still work (new columns are nullable)

  **Must NOT do**:
  - Must NOT use `drizzle-kit push` — generate migration file only
  - Must NOT break existing content_library consumers
  - Must NOT modify existing column definitions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema file modification is a focused, single-file task with clear patterns to follow
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser work needed
    - `git-master`: No git operations needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6, 7)
  - **Blocks**: Tasks 14 (content library actions extension)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/server/db/schema/content-library.ts` — Current content_library table definition (13 lines of schema code). Extend this file with new columns.
  - `src/server/db/schema/cross-posts.ts:16-21` — Example of pgEnum definition pattern (`crossPostStatusEnum`). Follow same pattern for `contentSourceTypeEnum` and `contentStatusEnum`.
  - `src/server/db/schema/platform-connections.ts:12` — Example of pgEnum used across tables. New enums should be similarly exported.
  - `src/server/db/schema/telegram-channels.ts` — FK target for new `channelId` column. Import `telegramChannels` for the reference.

  **API/Type References**:
  - `src/server/db/schema/index.ts` — Barrel file that re-exports all schema tables and enums. New enums must be added here.
  - `drizzle.config.ts` — Drizzle Kit configuration file. Verify `schema` path and `out` directory for migrations.

  **Test References**:
  - No existing schema tests to follow — create `src/server/db/schema/__tests__/content-library.test.ts`

  **WHY Each Reference Matters**:
  - `content-library.ts` is the file being modified — read it to understand current structure
  - `cross-posts.ts` shows the enum definition pattern used throughout the project
  - `index.ts` barrel must be updated or new enums won't be importable via `@/server/db/schema`

  **Acceptance Criteria**:
  - [ ] Test file created: `src/server/db/schema/__tests__/content-library.test.ts`
  - [ ] `bun test src/server/db/schema/__tests__/content-library.test.ts` → PASS
  - [ ] Migration file generated in `drizzle/` directory via `bunx drizzle-kit generate`
  - [ ] `bun build` → Exit code 0 (no TypeScript errors)

  **QA Scenarios**:

  ```
  Scenario: Schema compiles and exports correctly
    Tool: Bash
    Preconditions: Wave 1 Task 1 implementation complete
    Steps:
      1. Run `bun run tsc --noEmit` — verify zero type errors
      2. Run `bunx drizzle-kit generate` — verify migration file created
      3. Read generated migration SQL — verify it contains ALTER TABLE statements for content_library
      4. Grep for `contentSourceTypeEnum` in `src/server/db/schema/index.ts` — verify export exists
      5. Grep for `contentStatusEnum` in `src/server/db/schema/index.ts` — verify export exists
    Expected Result: TypeScript compiles, migration generated, both enums exported from barrel
    Failure Indicators: Type errors, missing migration file, missing barrel exports
    Evidence: .sisyphus/evidence/task-1-schema-compile.txt

  Scenario: Existing content library queries don't break
    Tool: Bash
    Preconditions: Migration generated
    Steps:
      1. Run `bun test` — verify all existing tests still pass
      2. Grep for `contentLibrary` usage in `src/server/actions/content.ts` — verify no type errors from new nullable columns
    Expected Result: All existing tests pass, no type errors from content action consumers
    Failure Indicators: Test failures in content.ts actions, type errors in consumers
    Evidence: .sisyphus/evidence/task-1-no-regression.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(schema): extend content-library with sourceType, status, channelId, sourceUrl, sourceMetadata`
  - Files: `src/server/db/schema/content-library.ts`, `src/server/db/schema/index.ts`, `drizzle/`
  - Pre-commit: `bun test && bun build`

- [ ] 2. Schedules Table Generalization Schema

  **What to do**:
  - RED: Write tests verifying: `crossPostId` is nullable, new `contentLibraryId` FK exists (nullable), `targetType` enum accepts `'cross_post'` and `'telegram_publish'`, constraint ensures at least one of crossPostId/contentLibraryId is set
  - GREEN: Modify `src/server/db/schema/schedules.ts`:
    - Make `crossPostId` nullable (remove `.notNull()`)
    - Add `contentLibraryId` uuid FK to `contentLibrary.id` (nullable, onDelete cascade)
    - Add `targetType` pgEnum: `schedule_target_type` with values `['cross_post', 'telegram_publish']` — default `'cross_post'`
    - Add `channelId` uuid FK to `telegramChannels.id` (nullable — needed for Telegram publish target)
    - Update `schedulesRelations` to include `contentLibrary` and `channel` relations
  - Generate Drizzle migration
  - Re-export new enum from `src/server/db/schema/index.ts`
  - REFACTOR: Verify existing schedule queries still work — the crossPostId change from NOT NULL to nullable means existing code that assumes it's always present needs checking

  **Must NOT do**:
  - Must NOT delete crossPostId column — existing cross-post schedules depend on it
  - Must NOT add more than 3 new columns — avoid "god table" bloat
  - Must NOT modify scheduleStatusEnum

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused schema modification following established patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6, 7)
  - **Blocks**: Tasks 20 (publishToTelegram Inngest job), 21 (publishToTelegram server action)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/server/db/schema/schedules.ts` — Current schedules table (48 lines). This is the file being modified.
  - `src/server/db/schema/cross-posts.ts:26-29` — Shows how `crossPostId` FK is currently defined with `.notNull()`. Remove `.notNull()` to make nullable.
  - `src/server/db/schema/recurring-schedules.ts:22` — Shows nullable FK pattern (`channelId` without `.notNull()`). Follow this for new FKs.
  - `src/server/db/schema/content-library.ts` — FK target for new `contentLibraryId` column.

  **API/Type References**:
  - `src/lib/scheduling/engine.ts` — `CreateScheduleInput` type requires `crossPostId: string`. Will need updating in Wave 3 but must remain backward-compatible now.
  - `src/lib/inngest/functions/scheduling/execute-scheduled-post.ts` — Reads `schedule.crossPost`. Must handle null after this change.

  **WHY Each Reference Matters**:
  - `schedules.ts` is the file being modified — understand its current FK constraints
  - `engine.ts` is the primary consumer — understand what will break when crossPostId becomes nullable
  - `execute-scheduled-post.ts` reads the cross-post relation — must be updated to handle null in Wave 3

  **Acceptance Criteria**:
  - [ ] Test file created: `src/server/db/schema/__tests__/schedules.test.ts`
  - [ ] `bun test src/server/db/schema/__tests__/schedules.test.ts` → PASS
  - [ ] Migration file generated with ALTER TABLE for schedules
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Schema accepts both cross-post and Telegram publish schedules
    Tool: Bash
    Preconditions: Schema modification complete
    Steps:
      1. Run `bun run tsc --noEmit` — verify zero type errors
      2. Run `bunx drizzle-kit generate` — verify migration file created
      3. Read migration SQL — verify ALTER TABLE adds contentLibraryId, targetType, channelId columns
      4. Read migration SQL — verify ALTER TABLE makes crossPostId nullable
    Expected Result: Migration correctly generalizes the table
    Failure Indicators: Missing columns in migration, crossPostId still NOT NULL
    Evidence: .sisyphus/evidence/task-2-schema-generalization.txt

  Scenario: Existing schedule-related code compiles
    Tool: Bash
    Preconditions: Schema updated
    Steps:
      1. Run `bun build` — verify TypeScript compilation succeeds
      2. Check for type errors in `src/lib/scheduling/engine.ts` and `src/lib/inngest/functions/scheduling/`
    Expected Result: Build succeeds (nullable crossPostId is backward-compatible at type level for Drizzle)
    Failure Indicators: Type errors in scheduling engine or Inngest functions
    Evidence: .sisyphus/evidence/task-2-backward-compat.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(schema): generalize schedules table with contentLibraryId, targetType, channelId`
  - Files: `src/server/db/schema/schedules.ts`, `src/server/db/schema/index.ts`, `drizzle/`
  - Pre-commit: `bun test && bun build`

- [ ] 3. External Sources Table Creation

  **What to do**:
  - RED: Write tests verifying: table exists with correct columns, `sourceType` enum accepts `'youtube'`, `'article'`, `'podcast'`, processing status enum works, FK to contentLibrary and users
  - GREEN: Create `src/server/db/schema/external-sources.ts`:
    - `id` uuid PK
    - `userId` uuid FK to users.id (NOT NULL, onDelete cascade)
    - `sourceUrl` varchar(2048) NOT NULL
    - `sourceType` pgEnum: `external_source_type` with values `['youtube', 'article', 'podcast']`
    - `title` varchar(500) nullable — extracted title
    - `extractedText` text nullable — raw extracted content (transcript, article body)
    - `extractedMetadata` jsonb nullable — structured metadata (duration, author, word count, language)
    - `processingStatus` pgEnum: `source_processing_status` with values `['pending', 'extracting', 'extracted', 'generating', 'completed', 'failed']`
    - `errorMessage` text nullable — for failed extractions
    - `linkedDraftId` uuid FK to contentLibrary.id (nullable, onDelete set null) — the draft created from this source
    - `createdAt`, `updatedAt` timestamps
  - Add relations: user, linkedDraft (to contentLibrary)
  - Export from `src/server/db/schema/index.ts`
  - Generate Drizzle migration

  **Must NOT do**:
  - Must NOT include podcast processing logic — table supports it for future, but no podcast extraction code in V1
  - Must NOT store binary data (audio/video) — only text and metadata

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Creating a new schema file following established patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5, 6, 7)
  - **Blocks**: Task 15 (processExternalSource Inngest job)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/server/db/schema/cross-posts.ts` — Best pattern for a table with multiple enums, FKs, and jsonb columns. Follow the same structure.
  - `src/server/db/schema/content-library.ts` — FK target for `linkedDraftId`. Import `contentLibrary`.
  - `src/server/db/schema/users.ts` — FK target for `userId`.

  **API/Type References**:
  - `src/server/db/schema/index.ts` — Must add exports for `externalSources`, `externalSourcesRelations`, `externalSourceTypeEnum`, `sourceProcessingStatusEnum`

  **WHY Each Reference Matters**:
  - `cross-posts.ts` is the closest structural analog — table with status enum, jsonb, multiple FKs
  - `index.ts` barrel must be updated for imports to work

  **Acceptance Criteria**:
  - [ ] File created: `src/server/db/schema/external-sources.ts`
  - [ ] Test file: `src/server/db/schema/__tests__/external-sources.test.ts`
  - [ ] `bun test src/server/db/schema/__tests__/external-sources.test.ts` → PASS
  - [ ] Migration file generated
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: External sources schema is valid and exported
    Tool: Bash
    Preconditions: Schema file created
    Steps:
      1. Run `bun run tsc --noEmit` — verify zero type errors
      2. Grep for `externalSources` in `src/server/db/schema/index.ts` — verify export
      3. Run `bunx drizzle-kit generate` — verify migration includes CREATE TABLE external_sources
    Expected Result: Schema compiles, exported, migration generated
    Failure Indicators: Type errors, missing export, missing CREATE TABLE
    Evidence: .sisyphus/evidence/task-3-external-sources.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(schema): add external_sources table for YouTube/article tracking`
  - Files: `src/server/db/schema/external-sources.ts`, `src/server/db/schema/index.ts`, `drizzle/`
  - Pre-commit: `bun test && bun build`

- [ ] 4. AI Generation Quota Enforcement Module

  **What to do**:
  - RED: Write tests for `enforceAiQuota(userId)` — returns `{allowed: true}` when under limit, returns `{allowed: false, reason, used, limit, upgradeUrl}` when over, correctly reads `aiCallsCount` from usage_tracking. Test `incrementAiUsage(userId)` — increments `aiCallsCount`. Test `withAiQuotaCheck(userId, action)` — throws `AiQuotaExceededError` when over limit, executes action when under.
  - GREEN: Create `src/lib/billing/ai-quota.ts`:
    - `canGenerateAi(userId)` — checks `aiCallsCount` against plan's `aiCallsPerMonth` limit
    - `getRemainingAiQuota(userId)` — returns `{used, limit, remaining}`
    - `incrementAiUsage(userId)` — upserts `usage_tracking` row, increments `aiCallsCount`
    - `enforceAiQuota(userId)` — returns `AiQuotaCheckResult` discriminated union (mirrors `enforceQuota` pattern)
    - `withAiQuotaCheck(userId, action)` — throws `AiQuotaExceededError` if over limit
    - `AiQuotaExceededError` class extending Error
  - Export from `src/lib/billing/index.ts` barrel
  - REFACTOR: Consider if `enforceQuota` (cross-post) and `enforceAiQuota` should share a common base

  **Must NOT do**:
  - Must NOT modify existing `enforceQuota()` / `canCrossPost()` — cross-post enforcement stays separate
  - Must NOT change plan limit values yet (that's Task 35)
  - Must NOT remove `crossPostsCount` tracking — it still works for cross-posting

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Business logic with billing implications requires careful implementation and thorough testing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5, 6, 7)
  - **Blocks**: Task 13 (generation engine), Task 34 (billing UI), Task 35 (plan definitions)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/lib/billing/enforce.ts` — **Primary pattern to mirror.** Copy the structure of `enforceQuota()`, `withQuotaCheck()`, `QuotaExceededError` but for AI calls instead of cross-posts.
  - `src/lib/billing/usage.ts` — Contains `incrementUsage()` (for cross-posts), `canCrossPost()`, `getRemainingQuota()`. Mirror these for AI calls using `aiCallsCount` column.

  **API/Type References**:
  - `src/lib/billing/types.ts` — Contains `PlanDefinition` with `limits.aiCallsPerMonth`. This is what the new enforcement checks against.
  - `src/lib/billing/plans.ts` — Plan definitions with `aiCallsPerMonth`: Free=10, Plus=100, Pro=Infinity.
  - `src/server/db/schema/usage-tracking.ts` — Has `aiCallsCount: integer("ai_calls_count").default(0)` column already.

  **Test References**:
  - `src/lib/billing/__tests__/` — Check if tests exist for enforce.ts/usage.ts. Follow same mocking patterns.

  **WHY Each Reference Matters**:
  - `enforce.ts` is the exact pattern to replicate — same structure, different column
  - `usage.ts` shows the upsert pattern for monthly usage tracking
  - `types.ts` shows `aiCallsPerMonth` is already defined in plan limits

  **Acceptance Criteria**:
  - [ ] Test file: `src/lib/billing/__tests__/ai-quota.test.ts`
  - [ ] `bun test src/lib/billing/__tests__/ai-quota.test.ts` → PASS (all tests: canGenerateAi, enforceAiQuota, incrementAiUsage, withAiQuotaCheck, AiQuotaExceededError)
  - [ ] `enforceAiQuota` exported from `src/lib/billing/index.ts`
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: AI quota enforcement blocks when over limit
    Tool: Bash
    Preconditions: Module implemented
    Steps:
      1. Run `bun test src/lib/billing/__tests__/ai-quota.test.ts` — verify all tests pass
      2. Verify test covers: user with 10/10 AI calls on Free plan → enforceAiQuota returns {allowed: false}
      3. Verify test covers: user with 5/10 AI calls on Free plan → enforceAiQuota returns {allowed: true}
      4. Verify test covers: Pro user with 999 calls → enforceAiQuota returns {allowed: true} (Infinity)
    Expected Result: All quota scenarios pass
    Failure Indicators: Tests fail, missing edge cases
    Evidence: .sisyphus/evidence/task-4-ai-quota.txt

  Scenario: AI usage increment works correctly
    Tool: Bash
    Preconditions: Module implemented
    Steps:
      1. Verify test covers: incrementAiUsage creates new row for new month
      2. Verify test covers: incrementAiUsage increments existing row's aiCallsCount
      3. Verify test covers: incrementAiUsage doesn't affect crossPostsCount
    Expected Result: Increment is isolated to aiCallsCount
    Failure Indicators: Wrong column incremented, missing upsert
    Evidence: .sisyphus/evidence/task-4-ai-increment.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(billing): add AI generation quota enforcement module`
  - Files: `src/lib/billing/ai-quota.ts`, `src/lib/billing/index.ts`, `src/lib/billing/__tests__/ai-quota.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 5. URL Parser + Sanitizer Module

  **What to do**:
  - RED: Write tests for URL parsing — YouTube URL variants (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/live/, youtube.com/embed/), article URLs, invalid URLs, SSRF protection (reject private IPs, file:// protocol, localhost)
  - GREEN: Create `src/lib/sources/url-parser.ts`:
    - `parseUrl(url: string)` — returns `{type: 'youtube' | 'article' | 'unknown', url: string, videoId?: string}` or throws `InvalidUrlError`
    - `sanitizeUrl(url: string)` — validates URL format, rejects private IPs (10.x, 172.16-31.x, 192.168.x, 127.x), rejects file:// and other dangerous protocols, resolves redirects up to 3 hops
    - `extractYouTubeVideoId(url: string)` — handles all YouTube URL formats, returns video ID or null
    - `isYouTubeUrl(url: string)` — boolean check
    - `isArticleUrl(url: string)` — boolean check (not YouTube, valid HTTP/HTTPS)
  - Create `src/lib/sources/types.ts` — shared types for source modules
  - Create barrel `src/lib/sources/index.ts`

  **Must NOT do**:
  - Must NOT follow redirects to private IPs (redirect SSRF attack)
  - Must NOT accept non-HTTP(S) protocols
  - Must NOT attempt to parse playlist or channel URLs as video URLs

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Utility module with clear input/output, well-defined edge cases
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 6, 7)
  - **Blocks**: Tasks 8 (YouTube extraction), 9 (article extraction)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/lib/utils.ts` — Shows the utility module pattern. Follow kebab-case naming.

  **External References**:
  - YouTube URL formats: `youtube.com/watch?v=VIDEO_ID`, `youtu.be/VIDEO_ID`, `youtube.com/shorts/VIDEO_ID`, `youtube.com/live/VIDEO_ID`, `youtube.com/embed/VIDEO_ID`
  - OWASP SSRF prevention: validate against private IP ranges before any fetch

  **WHY Each Reference Matters**:
  - YouTube has 5+ URL formats — the parser must handle all without breaking
  - SSRF prevention is a security requirement — arbitrary URL processing is dangerous

  **Acceptance Criteria**:
  - [ ] File: `src/lib/sources/url-parser.ts`
  - [ ] File: `src/lib/sources/types.ts`
  - [ ] File: `src/lib/sources/index.ts`
  - [ ] Test: `src/lib/sources/__tests__/url-parser.test.ts`
  - [ ] `bun test src/lib/sources/__tests__/url-parser.test.ts` → PASS (15+ test cases covering all URL variants + SSRF protection)
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: YouTube URL variants all extract correct video ID
    Tool: Bash
    Preconditions: Module implemented
    Steps:
      1. Run tests — verify parseUrl("https://youtube.com/watch?v=dQw4w9WgXcQ") → {type: 'youtube', videoId: 'dQw4w9WgXcQ'}
      2. Verify parseUrl("https://youtu.be/dQw4w9WgXcQ") → same result
      3. Verify parseUrl("https://youtube.com/shorts/dQw4w9WgXcQ") → same result
      4. Verify parseUrl("https://youtube.com/live/dQw4w9WgXcQ") → same result
      5. Verify parseUrl("https://youtube.com/embed/dQw4w9WgXcQ") → same result
    Expected Result: All 5 YouTube URL formats correctly parsed
    Failure Indicators: Any format returns wrong type or missing videoId
    Evidence: .sisyphus/evidence/task-5-youtube-urls.txt

  Scenario: SSRF protection rejects dangerous URLs
    Tool: Bash
    Preconditions: Module implemented
    Steps:
      1. Verify sanitizeUrl("http://127.0.0.1/admin") → throws InvalidUrlError
      2. Verify sanitizeUrl("http://192.168.1.1/") → throws InvalidUrlError
      3. Verify sanitizeUrl("file:///etc/passwd") → throws InvalidUrlError
      4. Verify sanitizeUrl("http://10.0.0.1/") → throws InvalidUrlError
      5. Verify sanitizeUrl("https://example.com") → passes (valid public URL)
    Expected Result: All private/dangerous URLs rejected, public URLs accepted
    Failure Indicators: Private IP accepted, or valid URL rejected
    Evidence: .sisyphus/evidence/task-5-ssrf-protection.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(sources): add URL parser with YouTube variant handling and SSRF protection`
  - Files: `src/lib/sources/url-parser.ts`, `src/lib/sources/types.ts`, `src/lib/sources/index.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 6. AI Generation Types + Generation Engine Interface

  **What to do**:
  - RED: Write type tests verifying: `GenerationRequest` accepts source content + channel profile + generation type, `GenerationResult` returns content + token usage + model info, `GenerationType` union includes all new use cases
  - GREEN: Extend `src/lib/ai/types.ts` with new types:
    - `GenerationType = 'source_to_telegram' | 'repurpose' | 'idea_to_draft' | 'calendar_fill'`
    - `GenerationRequest` interface: `{type: GenerationType, sourceContent: string, channelProfile?: ChannelProfile, options?: GenerationOptions}` — different from `AdaptationRequest` (no source/target language, no platform requirement)
    - `GenerationOptions` interface: `{modelTier?: ModelTier, maxLength?: number, numVariations?: number, repurposeMode?: RepurposeMode}`
    - `RepurposeMode = 'shorter' | 'thread' | 'poll'` — exactly 3 fixed modes
    - `GenerationResult` interface: `{content: string | string[], type: GenerationType, modelUsed: string, tokenUsage: TokenUsage}` — content is `string[]` for repurpose (multiple variations)
    - `CalendarFillSuggestion` interface: `{date: string, suggestedContent: string, sourceId?: string, sourceType: 'draft' | 'idea' | 'repurpose', confidence: number}`
  - Create `src/lib/ai/generation-engine.ts` as an interface/abstract class that parallels `AdaptationEngine` but for content generation (implementation in Task 13)

  **Must NOT do**:
  - Must NOT modify existing `Platform`, `AdaptationRequest`, `AdaptedContent` types — those still work for cross-posting
  - Must NOT implement the engine logic — just define the interface and types
  - Must NOT add `'freestyle'` to RepurposeMode — exactly 3 fixed modes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type definitions and interface design — focused, no runtime logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5, 7)
  - **Blocks**: Tasks 10, 11, 12 (AI prompts), Task 13 (engine implementation), Task 22 (calendar fill prompt)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/lib/ai/types.ts` — **The file being extended.** Contains `AdaptationRequest`, `AdaptedContent`, `Platform`, `ChannelProfile`, `TokenUsage`. New types go in this file alongside existing ones.
  - `src/lib/ai/adaptation-engine.ts` — Pattern for the engine class. The generation engine should mirror its constructor/method structure but with `GenerationRequest`/`GenerationResult` instead of `AdaptationRequest`/`AdaptedContent`.
  - `src/lib/ai/provider.ts` — AIProvider interface. The generation engine will use this same provider (OpenRouter) for AI calls.

  **WHY Each Reference Matters**:
  - `types.ts` is extended in-place — new types must coexist with existing adaptation types
  - `adaptation-engine.ts` provides the class pattern — generation engine should feel structurally similar
  - `provider.ts` shows the interface the engine will call — generation uses same OpenRouter client

  **Acceptance Criteria**:
  - [ ] New types added to `src/lib/ai/types.ts`: GenerationType, GenerationRequest, GenerationOptions, RepurposeMode, GenerationResult, CalendarFillSuggestion
  - [ ] Interface file: `src/lib/ai/generation-engine.ts` (interface only, no implementation)
  - [ ] `bun build` → Exit code 0 (all new types compile)
  - [ ] Existing `AdaptationRequest` / `AdaptedContent` unchanged

  **QA Scenarios**:

  ```
  Scenario: New types compile alongside existing types
    Tool: Bash
    Preconditions: Types added
    Steps:
      1. Run `bun run tsc --noEmit` — zero errors
      2. Grep `src/lib/ai/types.ts` for `AdaptationRequest` — still present and unchanged
      3. Grep `src/lib/ai/types.ts` for `GenerationRequest` — present
      4. Grep `src/lib/ai/types.ts` for `RepurposeMode` — present with exactly 3 values
    Expected Result: Both old and new types coexist, RepurposeMode has exactly 'shorter' | 'thread' | 'poll'
    Failure Indicators: Type errors, missing types, RepurposeMode has extra values
    Evidence: .sisyphus/evidence/task-6-types.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(ai): add generation types and engine interface for content creation pipeline`
  - Files: `src/lib/ai/types.ts`, `src/lib/ai/generation-engine.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 7. Extend Telegram Client (sendMediaGroup, sendPoll)

  **What to do**:
  - RED: Write tests for `sendMediaGroup(chatId, media[])` — sends array of InputMediaPhoto/InputMediaVideo, returns array of Message objects. Test `sendPoll(chatId, question, options[])` — sends poll, returns Message. Test error handling for oversized media, invalid poll options.
  - GREEN: Add methods to `src/lib/telegram/client.ts`:
    - `sendMediaGroup(chatId, media, options?)` — calls Bot API `sendMediaGroup`. Media is `InputMediaPhoto[] | InputMediaVideo[]`. Used for multi-image posts.
    - `sendPoll(chatId, question, options, pollOptions?)` — calls Bot API `sendPoll`. Required for poll-type repurposed content.
    - `sendDocument(chatId, document, options?)` — calls Bot API `sendDocument`. For file attachments.
  - Add TypeScript types for `InputMediaPhoto`, `InputMediaVideo`, `PollOptions` in the client or a types file
  - REFACTOR: Ensure retry logic applies to new methods (should inherit from existing `callApi` pattern)

  **Must NOT do**:
  - Must NOT modify existing sendMessage/sendPhoto methods
  - Must NOT add media upload from local files — only support URL-based media for now
  - Must NOT add sendAnimation, sendSticker, or other niche methods

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding methods to existing class following established patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5, 6)
  - **Blocks**: Task 20 (publishToTelegram Inngest job)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/lib/telegram/client.ts` — **The file being extended.** Read the existing `sendMessage` and `sendPhoto` methods to understand the `callApi` pattern, retry logic, and response handling.

  **External References**:
  - Telegram Bot API `sendMediaGroup`: https://core.telegram.org/bots/api#sendmediagroup — Array of InputMediaPhoto/InputMediaVideo, max 10 items
  - Telegram Bot API `sendPoll`: https://core.telegram.org/bots/api#sendpoll — question (1-300 chars), options (2-10 items, 1-100 chars each)
  - Telegram Bot API `sendDocument`: https://core.telegram.org/bots/api#senddocument — file_id, HTTP URL, or multipart upload

  **Test References**:
  - `src/lib/telegram/__tests__/` — Check for existing client tests. Follow same mocking pattern for Bot API calls.

  **WHY Each Reference Matters**:
  - `client.ts` has a `callApi` private method with retry logic — new methods must use it, not raw fetch
  - Bot API docs define exact parameter shapes and limits that the types must match

  **Acceptance Criteria**:
  - [ ] Test file: `src/lib/telegram/__tests__/client-extensions.test.ts`
  - [ ] `bun test src/lib/telegram/__tests__/client-extensions.test.ts` → PASS
  - [ ] `sendMediaGroup`, `sendPoll`, `sendDocument` methods exist on TelegramClient
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: New Telegram client methods compile and are callable
    Tool: Bash
    Preconditions: Methods added
    Steps:
      1. Run `bun test src/lib/telegram/__tests__/client-extensions.test.ts` — all pass
      2. Verify sendMediaGroup test mocks Bot API call with correct endpoint
      3. Verify sendPoll test validates question length (1-300) and options count (2-10)
      4. Run `bun build` — zero type errors
    Expected Result: All new methods tested and compile
    Failure Indicators: Missing methods, wrong API endpoints, type errors
    Evidence: .sisyphus/evidence/task-7-telegram-client.txt

  Scenario: Existing Telegram client methods unaffected
    Tool: Bash
    Preconditions: Methods added
    Steps:
      1. Run full test suite for telegram module: `bun test src/lib/telegram/`
      2. Verify sendMessage and sendPhoto tests still pass
    Expected Result: No regression in existing methods
    Failure Indicators: Existing tests fail
    Evidence: .sisyphus/evidence/task-7-no-regression.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(telegram): add sendMediaGroup, sendPoll, sendDocument to client`
  - Files: `src/lib/telegram/client.ts`, `src/lib/telegram/__tests__/client-extensions.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 8. YouTube Transcript Extraction Module

  **What to do**:
  - RED: Write tests for `extractYouTubeTranscript(videoId: string)` — returns transcript text, handles missing captions, handles invalid video ID. Test `isYouTubeUrl(url: string)` utility (already in url-parser from Task 5, but test integration here).
  - GREEN: Create `src/lib/sources/youtube.ts`:
    - Install `youtube-transcript-plus`: `bun add youtube-transcript-plus`
    - `extractYouTubeTranscript(videoId: string, lang?: string): Promise<ExtractionResult>` — fetches transcript using `youtube-transcript-plus`, concatenates segments into clean text, returns `{content, metadata: {title, duration, language}}`
    - `extractYouTubeMetadata(videoId: string): Promise<YouTubeMetadata>` — extracts title, description, channel name from oEmbed endpoint (free, no API key: `https://www.youtube.com/oembed?url=...&format=json`)
    - Handle edge cases: captions disabled (return error result, not throw), auto-generated captions (accept as fallback), language preference (try requested lang first, fall back to any available)
  - REFACTOR: Ensure ExtractionResult type from `src/lib/sources/types.ts` (Task 5) is used consistently

  **Must NOT do**:
  - Must NOT use YouTube Data API v3 (requires OAuth for caption download)
  - Must NOT install yt-dlp or any binary dependency
  - Must NOT attempt to extract audio or do speech-to-text
  - Must NOT cache transcripts (caching is a future concern)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: External API integration with error handling edge cases, needs careful testing of third-party library behavior
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9, 10, 11, 12, 13, 14)
  - **Blocks**: Task 15 (processExternalSource Inngest job)
  - **Blocked By**: Task 5 (URL parser — uses ExtractionResult type and SourceType)

  **References**:

  **Pattern References**:
  - `src/lib/sources/types.ts` (Task 5) — `ExtractionResult`, `SourceType`, `SourceMetadata` types. YouTube module must return `ExtractionResult` with `sourceType: 'youtube'`.
  - `src/lib/sources/url-parser.ts` (Task 5) — `parseUrl()` extracts videoId from YouTube URLs. YouTube module receives already-parsed videoId, not raw URL.

  **External References**:
  - `youtube-transcript-plus` npm: https://www.npmjs.com/package/youtube-transcript-plus — `fetchTranscript(videoId, {lang})` returns `TranscriptSegment[]` with `{text, start, duration}`
  - YouTube oEmbed: `https://www.youtube.com/oembed?url=https://youtube.com/watch?v={id}&format=json` — returns `{title, author_name, thumbnail_url}`

  **Test References**:
  - `src/lib/telegram/__tests__/` — Follow same test file organization pattern

  **WHY Each Reference Matters**:
  - `types.ts` defines the contract this module must fulfill — ExtractionResult shape
  - `url-parser.ts` shows what data flows INTO this module (parsed videoId)
  - npm docs show exact API shape of `youtube-transcript-plus` — needed for mocking in tests
  - oEmbed is a free metadata endpoint — avoids needing API keys for video title/channel

  **Acceptance Criteria**:
  - [ ] File: `src/lib/sources/youtube.ts` with `extractYouTubeTranscript` and `extractYouTubeMetadata`
  - [ ] Test file: `src/lib/sources/__tests__/youtube.test.ts`
  - [ ] `bun test src/lib/sources/__tests__/youtube.test.ts` → PASS (≥5 tests)
  - [ ] `bun build` → Exit code 0
  - [ ] Package `youtube-transcript-plus` added to `package.json`

  **QA Scenarios**:

  ```
  Scenario: Extract transcript from known YouTube video
    Tool: Bash
    Preconditions: youtube-transcript-plus installed, network available
    Steps:
      1. Run test: `bun test src/lib/sources/__tests__/youtube.test.ts -t "extracts transcript"` — passes
      2. Verify mock returns array of segments that get concatenated into string
      3. Verify ExtractionResult has `sourceType: 'youtube'` and `metadata.title`
    Expected Result: Test passes, result shape matches ExtractionResult
    Failure Indicators: Import error for youtube-transcript-plus, wrong result shape
    Evidence: .sisyphus/evidence/task-8-youtube-transcript.txt

  Scenario: Handle captions-disabled video gracefully
    Tool: Bash
    Preconditions: youtube-transcript-plus mocked to throw "Transcript disabled"
    Steps:
      1. Run test: `bun test src/lib/sources/__tests__/youtube.test.ts -t "captions disabled"` — passes
      2. Verify function returns error result (not throws): `{success: false, error: "..."}`
    Expected Result: Graceful error, no unhandled exception
    Failure Indicators: Unhandled promise rejection, thrown error
    Evidence: .sisyphus/evidence/task-8-captions-disabled.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(sources): add YouTube transcript extraction with oEmbed metadata`
  - Files: `src/lib/sources/youtube.ts`, `src/lib/sources/__tests__/youtube.test.ts`, `package.json`
  - Pre-commit: `bun test && bun build`

- [ ] 9. Article Content Extraction Module

  **What to do**:
  - RED: Write tests for `extractArticle(url: string)` — returns article title + clean text content + author + publish date. Test HTML-heavy pages (strips ads/nav). Test non-article URLs (returns error). Test timeout handling.
  - GREEN: Create `src/lib/sources/article.ts`:
    - Install `@extractus/article-extractor`: `bun add @extractus/article-extractor`
    - `extractArticle(url: string): Promise<ExtractionResult>` — fetches URL, extracts article content using `@extractus/article-extractor`, returns `{content, metadata: {title, author, publishedDate, sourceUrl, wordCount}}`
    - Input sanitization: validate URL is HTTP/HTTPS, reject private IPs (reuse SSRF check from url-parser Task 5 if available)
    - Content cleaning: strip HTML tags from extracted content, normalize whitespace, truncate to reasonable max (50,000 chars — ~10k words)
    - Handle edge cases: paywalled content (extract what's visible), non-article pages (return error), timeout (10s max)
  - REFACTOR: Ensure consistent error handling pattern with YouTube module

  **Must NOT do**:
  - Must NOT use Puppeteer/Playwright for server-side rendering — `@extractus/article-extractor` uses fetch
  - Must NOT bypass paywalls or use headless browsers
  - Must NOT store raw HTML — only clean text
  - Must NOT import `@mozilla/readability` (heavier, needs JSDOM)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: External URL fetching with security considerations (SSRF), content cleaning, multiple error scenarios
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 10, 11, 12, 13, 14)
  - **Blocks**: Task 15 (processExternalSource Inngest job)
  - **Blocked By**: Task 5 (URL parser — uses ExtractionResult type and SourceType)

  **References**:

  **Pattern References**:
  - `src/lib/sources/types.ts` (Task 5) — `ExtractionResult` type. Article module must return same shape as YouTube module.
  - `src/lib/sources/url-parser.ts` (Task 5) — SSRF protection helper. Reuse `isPrivateIp` or similar check if exported.

  **External References**:
  - `@extractus/article-extractor` npm: https://www.npmjs.com/package/@extractus/article-extractor — `extract(url)` returns `{title, content, author, published, source, ttr}`
  - The `content` field from article-extractor contains HTML — must be stripped to plain text

  **Test References**:
  - `src/lib/sources/__tests__/youtube.test.ts` (Task 8) — Follow same test structure for consistency

  **WHY Each Reference Matters**:
  - `types.ts` ensures article extraction returns same contract as YouTube extraction — pipeline treats them uniformly
  - `url-parser.ts` SSRF protection should be reused, not duplicated
  - npm docs define the exact output shape to expect from the library

  **Acceptance Criteria**:
  - [ ] File: `src/lib/sources/article.ts` with `extractArticle`
  - [ ] Test file: `src/lib/sources/__tests__/article.test.ts`
  - [ ] `bun test src/lib/sources/__tests__/article.test.ts` → PASS (≥5 tests)
  - [ ] `bun build` → Exit code 0
  - [ ] Package `@extractus/article-extractor` added to `package.json`

  **QA Scenarios**:

  ```
  Scenario: Extract article content from mocked HTML response
    Tool: Bash
    Preconditions: @extractus/article-extractor installed, fetch mocked
    Steps:
      1. Run test: `bun test src/lib/sources/__tests__/article.test.ts -t "extracts article"` — passes
      2. Verify result has clean text content (no HTML tags)
      3. Verify ExtractionResult has `sourceType: 'article'` and metadata includes title, author
    Expected Result: Clean text extraction with proper metadata
    Failure Indicators: HTML tags in content, missing metadata fields
    Evidence: .sisyphus/evidence/task-9-article-extraction.txt

  Scenario: Reject private IP URLs (SSRF protection)
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run test: `bun test src/lib/sources/__tests__/article.test.ts -t "SSRF"` — passes
      2. Verify `extractArticle("http://192.168.1.1/article")` returns error result
      3. Verify `extractArticle("http://127.0.0.1/secret")` returns error result
    Expected Result: Private IP URLs rejected with descriptive error
    Failure Indicators: Request actually sent to private IP
    Evidence: .sisyphus/evidence/task-9-ssrf-protection.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(sources): add article content extraction with SSRF protection`
  - Files: `src/lib/sources/article.ts`, `src/lib/sources/__tests__/article.test.ts`, `package.json`
  - Pre-commit: `bun test && bun build`

- [ ] 10. AI Prompt — generate-from-source.ts

  **What to do**:
  - RED: Write tests for `buildGenerateFromSourcePrompt(params)` — verifies system prompt includes channel tone/niche, user prompt includes source content, output format specifies Telegram-appropriate length. Test with YouTube source (long transcript) and article source (medium text). Test truncation of very long source content.
  - GREEN: Create `src/lib/ai/prompts/generate-from-source.ts`:
    - `buildGenerateFromSourcePrompt(request: {sourceContent: string, sourceType: SourceType, channelProfile: ChannelProfile, options?: {maxLength?: number}}): PromptMessages`
    - System prompt: "You are a Telegram channel content creator. Channel niche: {niche}. Tone: {tone}. Language: {language}. Create an original Telegram post inspired by the source material below. Do NOT copy — extract key insights and rewrite in the channel's voice."
    - User prompt: "Source ({sourceType}): {truncated sourceContent}\n\nCreate a Telegram post (max {maxLength} chars). Include relevant emoji. Format for Telegram (bold with \*, italic with \_)."
    - Truncation: if source > 15,000 chars, truncate with "... [truncated]" marker
    - Return `PromptMessages` format (array of `{role, content}`)
  - REFACTOR: Ensure prompt follows patterns from existing `adapt-twitter.ts` / `adapt-linkedin.ts`

  **Must NOT do**:
  - Must NOT copy/paste source content into output — prompt must instruct "rewrite in your own voice"
  - Must NOT hardcode language — use `channelProfile.language`
  - Must NOT generate HTML — Telegram uses Markdown-like formatting
  - Must NOT include platform-specific hashtag logic (that's for cross-posting prompts)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Prompt engineering requires careful wording to get good AI outputs; needs understanding of existing prompt patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 11, 12, 13, 14)
  - **Blocks**: Task 16 (generateFromSource Inngest job)
  - **Blocked By**: Task 6 (AI generation types — uses GenerationType, GenerationRequest)

  **References**:

  **Pattern References**:
  - `src/lib/ai/prompts/adapt-twitter.ts` — **Primary pattern.** Shows how existing prompts are structured: `buildAdaptTwitterPrompt(request)` returns `PromptMessages`. Follow this exact function signature pattern.
  - `src/lib/ai/prompts/adapt-linkedin.ts` — Second example of prompt builder. Shows how channel tone is incorporated into system prompt.
  - `src/lib/ai/prompts/channel-profile.ts` — Shows how `ChannelProfile` fields (niche, tone, topics, language) are used in prompts.

  **API/Type References**:
  - `src/lib/ai/types.ts` — `ChannelProfile` interface (has niche, tone, topics, language fields), `GenerationType` (Task 6)
  - `src/lib/sources/types.ts` (Task 5) — `SourceType` enum used to label what kind of source content this is

  **WHY Each Reference Matters**:
  - `adapt-twitter.ts` is the gold standard for prompt function structure — new prompt must look structurally identical
  - `channel-profile.ts` shows exactly which ChannelProfile fields to use and how to format them
  - `types.ts` defines the interfaces this prompt builder consumes

  **Acceptance Criteria**:
  - [ ] File: `src/lib/ai/prompts/generate-from-source.ts`
  - [ ] Test file: `src/lib/ai/prompts/__tests__/generate-from-source.test.ts`
  - [ ] `bun test src/lib/ai/prompts/__tests__/generate-from-source.test.ts` → PASS (≥4 tests)
  - [ ] Prompt includes channel niche, tone, language from ChannelProfile
  - [ ] Source content truncated at 15,000 chars
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Build prompt with YouTube source and channel profile
    Tool: Bash
    Preconditions: Types from Task 5 and 6 available
    Steps:
      1. Run test: `bun test src/lib/ai/prompts/__tests__/generate-from-source.test.ts -t "YouTube source"` — passes
      2. Verify system message contains channel niche and tone
      3. Verify user message contains "Source (youtube):" prefix
      4. Verify output is PromptMessages array with role/content pairs
    Expected Result: Well-structured prompt with channel voice and source content
    Failure Indicators: Missing channel profile data, wrong source type label
    Evidence: .sisyphus/evidence/task-10-prompt-youtube.txt

  Scenario: Truncate very long source content
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run test: `bun test src/lib/ai/prompts/__tests__/generate-from-source.test.ts -t "truncat"` — passes
      2. Verify source content > 15,000 chars is truncated with "... [truncated]"
      3. Verify prompt total length is bounded
    Expected Result: Long content truncated safely
    Failure Indicators: Full 50k+ char content passed to prompt, no truncation marker
    Evidence: .sisyphus/evidence/task-10-truncation.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(ai): add generate-from-source prompt builder for URL→Telegram pipeline`
  - Files: `src/lib/ai/prompts/generate-from-source.ts`, `src/lib/ai/prompts/__tests__/generate-from-source.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 11. AI Prompt — repurpose-telegram.ts

  **What to do**:
  - RED: Write tests for `buildRepurposePrompt(params)` — verifies each mode produces different output structure: `'shorter'` returns condensed single post, `'thread'` returns array of connected posts, `'poll'` returns question + options. Test that channel voice is preserved. Test that original post content is included as reference.
  - GREEN: Create `src/lib/ai/prompts/repurpose-telegram.ts`:
    - `buildRepurposePrompt(request: {originalContent: string, mode: RepurposeMode, channelProfile: ChannelProfile, numVariations?: number}): PromptMessages`
    - Mode-specific system prompts:
      - `'shorter'`: "Condense this Telegram post into a shorter version that keeps the core message. Same voice, fewer words."
      - `'thread'`: "Split this content into a thread of 2-5 connected Telegram posts. Each post should stand alone but flow together."
      - `'poll'`: "Convert this content into an engaging poll. Generate a question and 2-4 answer options that spark discussion."
    - User prompt includes original content and channel profile for voice matching
    - For `numVariations > 1`: instruct AI to generate N different versions (default 1 for thread/poll, up to 3 for shorter)
    - Return `PromptMessages` format
  - REFACTOR: Extract common "channel voice" preamble shared with generate-from-source prompt into a helper

  **Must NOT do**:
  - Must NOT add modes beyond 'shorter' | 'thread' | 'poll' — exactly 3 as defined in Task 6
  - Must NOT generate cross-platform content (this is Telegram→Telegram repurposing)
  - Must NOT include hashtag generation (Telegram channels rarely use hashtags)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Three distinct prompt strategies that need careful engineering; mode-specific output formats
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 12, 13, 14)
  - **Blocks**: Task 18 (repurposePost server action)
  - **Blocked By**: Task 6 (AI generation types — uses RepurposeMode)

  **References**:

  **Pattern References**:
  - `src/lib/ai/prompts/adapt-twitter.ts` — Prompt builder pattern (function → PromptMessages)
  - `src/lib/ai/prompts/generate-from-source.ts` (Task 10) — Sister prompt. Share channel voice preamble pattern.

  **API/Type References**:
  - `src/lib/ai/types.ts` — `RepurposeMode = 'shorter' | 'thread' | 'poll'`, `ChannelProfile`, `GenerationRequest` (all from Task 6)

  **WHY Each Reference Matters**:
  - `adapt-twitter.ts` defines the structural pattern — all prompts must have consistent function signatures
  - Task 10 prompt handles channel voice injection — repurpose prompt needs the same approach
  - `RepurposeMode` type constrains exactly what modes are supported

  **Acceptance Criteria**:
  - [ ] File: `src/lib/ai/prompts/repurpose-telegram.ts`
  - [ ] Test file: `src/lib/ai/prompts/__tests__/repurpose-telegram.test.ts`
  - [ ] `bun test src/lib/ai/prompts/__tests__/repurpose-telegram.test.ts` → PASS (≥6 tests: 2 per mode)
  - [ ] Each mode produces structurally different prompt instructions
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Build repurpose prompt for each mode
    Tool: Bash
    Preconditions: Types from Task 6 available
    Steps:
      1. Run test: `bun test src/lib/ai/prompts/__tests__/repurpose-telegram.test.ts` — all pass
      2. Verify 'shorter' mode prompt asks for condensed version
      3. Verify 'thread' mode prompt asks for split into 2-5 posts
      4. Verify 'poll' mode prompt asks for question + options format
    Expected Result: Mode-specific prompts with correct output instructions
    Failure Indicators: Same prompt for all modes, missing mode handling
    Evidence: .sisyphus/evidence/task-11-repurpose-modes.txt

  Scenario: Channel voice preserved across modes
    Tool: Bash
    Preconditions: ChannelProfile with specific niche/tone
    Steps:
      1. Run tests with channelProfile: {niche: "crypto", tone: "casual", language: "ru"}
      2. Verify system prompt for each mode includes "crypto" niche and "casual" tone
    Expected Result: Channel profile data present in all mode prompts
    Failure Indicators: Generic prompts without channel-specific data
    Evidence: .sisyphus/evidence/task-11-channel-voice.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(ai): add repurpose-telegram prompt with shorter/thread/poll modes`
  - Files: `src/lib/ai/prompts/repurpose-telegram.ts`, `src/lib/ai/prompts/__tests__/repurpose-telegram.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 12. AI Prompt — idea-to-draft.ts

  **What to do**:
  - RED: Write tests for `buildIdeaToDraftPrompt(params)` — verifies prompt takes a short idea/note and produces a full Telegram post draft. Test with minimal idea (1 sentence), detailed idea (paragraph), and idea with tags/category context.
  - GREEN: Create `src/lib/ai/prompts/idea-to-draft.ts`:
    - `buildIdeaToDraftPrompt(request: {idea: string, channelProfile: ChannelProfile, category?: string, tags?: string[], existingDrafts?: string[]}): PromptMessages`
    - System prompt: "You are a Telegram channel content creator. Channel: {niche}, tone: {tone}, language: {language}. Develop the following idea into a complete Telegram post. Maintain the channel's voice. Include formatting (bold/italic) and emoji where appropriate."
    - User prompt: "Idea: {idea}\n\n{optional: Category: {category}}\n{optional: Tags: {tags.join(', ')}}\n{optional: Avoid overlap with: {existingDrafts summary}}"
    - `existingDrafts` is optional context to avoid generating content too similar to recent drafts
    - Return `PromptMessages` format
  - REFACTOR: Reuse channel voice helper from Task 11 if extracted

  **Must NOT do**:
  - Must NOT generate multiple posts from one idea (that's repurposing)
  - Must NOT add "expand with research" or web search capabilities
  - Must NOT generate content calendar from a single idea (that's calendar-fill)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Prompt engineering with context-aware instructions (existing drafts deduplication)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11, 13, 14)
  - **Blocks**: Task 19 (developIdea server action)
  - **Blocked By**: Task 6 (AI generation types)

  **References**:

  **Pattern References**:
  - `src/lib/ai/prompts/adapt-twitter.ts` — Prompt builder pattern
  - `src/lib/ai/prompts/generate-from-source.ts` (Task 10) — Channel voice preamble pattern
  - `src/lib/ai/prompts/repurpose-telegram.ts` (Task 11) — Sister prompt, shared helper usage

  **API/Type References**:
  - `src/lib/ai/types.ts` — `ChannelProfile`, `GenerationType` includes `'idea_to_draft'`

  **WHY Each Reference Matters**:
  - All prompt builders must follow the same structural pattern for engine compatibility
  - Channel voice helper (if extracted in Task 11) should be reused here

  **Acceptance Criteria**:
  - [ ] File: `src/lib/ai/prompts/idea-to-draft.ts`
  - [ ] Test file: `src/lib/ai/prompts/__tests__/idea-to-draft.test.ts`
  - [ ] `bun test src/lib/ai/prompts/__tests__/idea-to-draft.test.ts` → PASS (≥4 tests)
  - [ ] Prompt includes idea text and channel voice
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Build prompt from minimal idea
    Tool: Bash
    Preconditions: Types from Task 6 available
    Steps:
      1. Run test with idea: "Почему стейкинг лучше трейдинга" (short Russian idea)
      2. Verify system prompt has channel profile data
      3. Verify user prompt includes the idea text
      4. Verify output is valid PromptMessages array
    Expected Result: Complete prompt ready for AI generation
    Failure Indicators: Missing idea in prompt, wrong format
    Evidence: .sisyphus/evidence/task-12-minimal-idea.txt

  Scenario: Include existing drafts for deduplication
    Tool: Bash
    Preconditions: existingDrafts array provided with 2 drafts
    Steps:
      1. Run test with existingDrafts: ["Post about staking rewards", "DeFi yield comparison"]
      2. Verify user prompt includes "Avoid overlap with" section
      3. Verify drafts are summarized in the prompt
    Expected Result: Prompt instructs AI to avoid duplicate content
    Failure Indicators: No deduplication instruction, full draft text dumped raw
    Evidence: .sisyphus/evidence/task-12-dedup.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(ai): add idea-to-draft prompt for developing notes into Telegram posts`
  - Files: `src/lib/ai/prompts/idea-to-draft.ts`, `src/lib/ai/prompts/__tests__/idea-to-draft.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 13. AI Generation Engine Implementation

  **What to do**:
  - RED: Write tests for `GenerationEngine.generate(request: GenerationRequest): Promise<GenerationResult>` — routes to correct prompt builder based on `request.type`, calls AI provider, enforces quota before generation, returns structured result with token usage. Test each GenerationType routes correctly. Test quota exceeded scenario.
  - GREEN: Implement `src/lib/ai/generation-engine.ts` (interface was defined in Task 6, now add implementation):
    - Class `GenerationEngine` with constructor taking `AIProvider` (same as AdaptationEngine)
    - `async generate(request: GenerationRequest): Promise<GenerationResult>` method:
      - Switch on `request.type`:
        - `'source_to_telegram'` → call `buildGenerateFromSourcePrompt` (Task 10)
        - `'repurpose'` → call `buildRepurposePrompt` (Task 11)
        - `'idea_to_draft'` → call `buildIdeaToDraftPrompt` (Task 12)
        - `'calendar_fill'` → call `buildCalendarFillPrompt` (Task 22 — not yet available, add placeholder that throws "not implemented")
      - Call `this.provider.chat(promptMessages, {model: getModelForType(request.type)})` — use `fast` tier for shorter/idea, `default` tier for source_to_telegram, `pro` tier for calendar_fill
      - Parse response into `GenerationResult` shape
    - Model tier selection: `getModelForType(type: GenerationType): ModelTier` — helper mapping generation type to appropriate model quality
    - Token counting: extract from provider response (OpenRouter returns usage data)
  - REFACTOR: Ensure error handling matches AdaptationEngine patterns (wrap API errors, don't leak provider details)

  **Must NOT do**:
  - Must NOT call quota enforcement directly — that's the server action's responsibility (engine is a pure AI tool)
  - Must NOT implement calendar_fill routing yet — placeholder with descriptive error until Task 22
  - Must NOT add retry logic in the engine — provider already has retry
  - Must NOT cache results

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core orchestration logic connecting prompts, provider, and type routing — needs careful implementation matching existing engine patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11, 12, 14) — but practically depends on Task 10, 11, 12 for prompt builders. Can start with stubs/mocks.
  - **Blocks**: Task 16 (generateFromSource Inngest), Task 18 (repurposePost), Task 19 (developIdea), Task 23 (suggestCalendarFill)
  - **Blocked By**: Task 6 (generation types + interface), Task 4 (AI quota — engine needs to be quota-aware in types)

  **References**:

  **Pattern References**:
  - `src/lib/ai/adaptation-engine.ts` — **Primary pattern.** The existing engine class. Generation engine must mirror its structure: constructor with provider, main method, error wrapping.
  - `src/lib/ai/provider.ts` — `AIProvider` interface with `chat(messages, options)` method. Generation engine calls this.
  - `src/lib/ai/openrouter.ts` — Concrete provider implementation. Shows how model selection and token usage are returned.

  **API/Type References**:
  - `src/lib/ai/types.ts` — `GenerationType`, `GenerationRequest`, `GenerationResult`, `GenerationOptions`, `ModelTier` (all from Task 6)
  - `src/lib/ai/prompts/generate-from-source.ts` (Task 10) — Prompt builder to be called for `'source_to_telegram'` type
  - `src/lib/ai/prompts/repurpose-telegram.ts` (Task 11) — Prompt builder for `'repurpose'` type
  - `src/lib/ai/prompts/idea-to-draft.ts` (Task 12) — Prompt builder for `'idea_to_draft'` type

  **Test References**:
  - `src/lib/ai/__tests__/` — Existing AI module tests. Follow mocking patterns for provider.

  **WHY Each Reference Matters**:
  - `adaptation-engine.ts` is THE structural blueprint — new engine must look like a sibling, not a rewrite
  - `provider.ts` interface must be called correctly — wrong method signature → runtime error
  - `openrouter.ts` shows how token usage comes back — needed for GenerationResult mapping
  - Each prompt builder (T10/T11/T12) defines what the engine dispatches to

  **Acceptance Criteria**:
  - [ ] File: `src/lib/ai/generation-engine.ts` (interface from Task 6 replaced with full implementation)
  - [ ] Test file: `src/lib/ai/__tests__/generation-engine.test.ts`
  - [ ] `bun test src/lib/ai/__tests__/generation-engine.test.ts` → PASS (≥6 tests)
  - [ ] Routes correctly for `source_to_telegram`, `repurpose`, `idea_to_draft` types
  - [ ] `calendar_fill` throws "not implemented" placeholder
  - [ ] Token usage extracted from provider response
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Generate content from source routes to correct prompt builder
    Tool: Bash
    Preconditions: Provider mocked to return fixed response, prompt builders imported
    Steps:
      1. Run test: `bun test src/lib/ai/__tests__/generation-engine.test.ts -t "source_to_telegram"` — passes
      2. Verify buildGenerateFromSourcePrompt was called with correct args
      3. Verify provider.chat was called with prompt messages
      4. Verify GenerationResult has type, content, modelUsed, tokenUsage
    Expected Result: Full pipeline from request → prompt → provider → result
    Failure Indicators: Wrong prompt builder called, missing token usage
    Evidence: .sisyphus/evidence/task-13-source-routing.txt

  Scenario: Calendar fill type throws not-implemented error
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run test: `bun test src/lib/ai/__tests__/generation-engine.test.ts -t "calendar_fill"` — passes
      2. Verify calling generate with type 'calendar_fill' throws descriptive error
    Expected Result: Clear "not implemented" error, not a generic crash
    Failure Indicators: Silent failure, undefined behavior, or wrong error message
    Evidence: .sisyphus/evidence/task-13-calendar-fill-placeholder.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(ai): implement generation engine with type-based prompt routing`
  - Files: `src/lib/ai/generation-engine.ts`, `src/lib/ai/__tests__/generation-engine.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 14. Content Library Server Actions Extension

  **What to do**:
  - RED: Write tests for new server actions: `createContentItem(data)` handles new sourceType/status fields, `updateContentStatus(id, status)` transitions between draft/idea/published/archived, `getContentByStatus(userId, status)` filters by status, `getContentByChannel(userId, channelId)` filters by channel. Test validation: invalid status transitions rejected.
  - GREEN: Extend `src/server/actions/content.ts` (or create if not existing):
    - `createContentItem(data: CreateContentInput): Promise<ActionResult<ContentItem>>` — inserts into content_library with new columns (sourceType, status, channelId, sourceUrl, sourceMetadata). Returns created item.
    - `updateContentStatus(id: string, status: ContentStatus): Promise<ActionResult<ContentItem>>` — validates status transition (idea→draft→ready→published, any→archived), updates status
    - `getContentByStatus(userId: string, status: ContentStatus, opts?: {limit, offset}): Promise<ActionResult<ContentItem[]>>` — filtered query
    - `getContentByChannel(userId: string, channelId: string, opts?: {limit, offset}): Promise<ActionResult<ContentItem[]>>` — filtered by channel FK
    - `getDraftsAndIdeas(userId: string): Promise<ActionResult<{drafts: ContentItem[], ideas: ContentItem[]}>` — convenience for dashboard quick-access
    - All actions return `ActionResult<T>` pattern (success/error discriminated union)
    - All actions check `userId` ownership via `supabase.auth.getUser()` server-side
  - REFACTOR: If existing content actions exist, extend rather than duplicate

  **Must NOT do**:
  - Must NOT allow publishing directly from server action — publishing goes through Inngest job (Task 20)
  - Must NOT delete content permanently — use `archived` status
  - Must NOT skip auth check — every action must verify user ownership
  - Must NOT expose raw database errors to client

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server actions with auth, validation, multiple query patterns — medium complexity, follows clear existing patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11, 12, 13)
  - **Blocks**: Task 15 (processExternalSource — stores results), Task 17 (createFromUrl action), Task 18 (repurposePost action), Task 19 (developIdea action), Task 27 (content library UI)
  - **Blocked By**: Task 1 (content_library schema extension — new columns must exist)

  **References**:

  **Pattern References**:
  - `src/server/actions/` — **Existing server actions.** Read 2-3 files to understand `ActionResult<T>` pattern, auth checks, error handling. Every action returns `{success: true, data}` or `{success: false, error}`.
  - `src/server/db/schema/content-library.ts` (Task 1) — Extended schema with new columns. Actions must use correct column names.

  **API/Type References**:
  - `src/server/db/schema/content-library.ts` — `contentLibrary` table definition with new columns (sourceType, status, channelId, sourceUrl, sourceMetadata)
  - `src/server/db/index.ts` — `db` export for database queries (lazy proxy singleton, never import postgres directly)

  **Test References**:
  - `src/server/actions/__tests__/` — Existing action tests for mocking patterns (db mock, auth mock)

  **WHY Each Reference Matters**:
  - Existing server actions define the exact `ActionResult` pattern — new actions must match
  - Schema from Task 1 defines exact column names — queries must use matching field names
  - `db` import pattern is critical — NEVER import postgres directly (from AGENTS.md)

  **Acceptance Criteria**:
  - [ ] File: `src/server/actions/content.ts` (new or extended)
  - [ ] Test file: `src/server/actions/__tests__/content.test.ts`
  - [ ] `bun test src/server/actions/__tests__/content.test.ts` → PASS (≥8 tests)
  - [ ] All actions return `ActionResult<T>`
  - [ ] All actions verify user authentication
  - [ ] Status transitions validated (invalid transitions rejected)
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Create content item with all new fields
    Tool: Bash
    Preconditions: DB mocked, auth mocked with valid user
    Steps:
      1. Run test: `bun test src/server/actions/__tests__/content.test.ts -t "createContentItem"` — passes
      2. Verify insert includes sourceType, status, channelId, sourceUrl fields
      3. Verify result is ActionResult with success: true and created item
    Expected Result: Content item created with all new columns populated
    Failure Indicators: Missing columns in insert, wrong return shape
    Evidence: .sisyphus/evidence/task-14-create-content.txt

  Scenario: Invalid status transition rejected
    Tool: Bash
    Preconditions: DB mocked with content item in 'idea' status
    Steps:
      1. Run test: `bun test src/server/actions/__tests__/content.test.ts -t "invalid transition"` — passes
      2. Verify transitioning from 'idea' directly to 'published' returns `{success: false, error: "..."}`
      3. Verify the database was NOT updated
    Expected Result: Transition rejected with descriptive error message
    Failure Indicators: Status changed despite invalid transition, thrown error instead of ActionResult
    Evidence: .sisyphus/evidence/task-14-invalid-transition.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(actions): extend content library server actions with status management and channel filtering`
  - Files: `src/server/actions/content.ts`, `src/server/actions/__tests__/content.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 15. Inngest Job — processExternalSource

  **What to do**:
  - RED: Write tests for Inngest function `processExternalSource` — receives URL + userId + channelId event, parses URL type, dispatches to YouTube or article extractor, stores result in content_library with status 'draft' and correct sourceType, emits follow-up event for AI generation. Test YouTube URL flow. Test article URL flow. Test invalid URL rejection.
  - GREEN: Create `src/lib/inngest/functions/sources/process-external-source.ts`:
    - Event: `"sources/url.submitted"` with data: `{url: string, userId: string, channelId: string}`
    - Step 1 (`parse-url`): Call `parseUrl(url)` from url-parser to detect source type
    - Step 2 (`extract-content`): Based on sourceType:
      - `'youtube'` → call `extractYouTubeTranscript(videoId)` + `extractYouTubeMetadata(videoId)`
      - `'article'` → call `extractArticle(url)`
      - `'unknown'` → return error, store nothing
    - Step 3 (`store-content`): Insert into content_library via `createContentItem` action with: sourceType, status='draft', channelId, sourceUrl=url, sourceMetadata=extraction metadata, content=extracted text
    - Step 4 (`emit-generate`): Emit `"ai/content.generate-from-source"` event with contentItemId for downstream AI generation (Task 16 picks this up)
    - Register in `src/lib/inngest/functions/index.ts`
  - REFACTOR: Follow existing Inngest function patterns (step.run naming, error handling)

  **Must NOT do**:
  - Must NOT handle podcast URLs — deferred to V1.5
  - Must NOT call AI generation directly — emit event for separate Inngest function
  - Must NOT skip content storage before AI generation — content must be saved even if AI fails later
  - Must NOT process URLs without SSRF validation (url-parser handles this)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Inngest pipeline orchestration with multiple steps, event emission, and error handling across extraction modules
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16-23)
  - **Blocks**: Task 16 (generateFromSource — processes emitted event), Task 17 (createFromUrl server action — triggers this job)
  - **Blocked By**: Task 8 (YouTube extractor), Task 9 (article extractor), Task 3 (external_sources schema), Task 14 (content actions)

  **References**:

  **Pattern References**:
  - `src/lib/inngest/functions/` — **Read 2-3 existing Inngest functions.** Understand event shape definition, `step.run()` usage, error handling, event emission via `step.sendEvent()`.
  - `src/lib/inngest/client.ts` — Inngest client instance. Functions must use this client.

  **API/Type References**:
  - `src/lib/sources/url-parser.ts` (Task 5) — `parseUrl()` returns `{sourceType, videoId?, cleanUrl}`
  - `src/lib/sources/youtube.ts` (Task 8) — `extractYouTubeTranscript(videoId)`, `extractYouTubeMetadata(videoId)`
  - `src/lib/sources/article.ts` (Task 9) — `extractArticle(url)`
  - `src/server/actions/content.ts` (Task 14) — `createContentItem()` for storing extraction results

  **WHY Each Reference Matters**:
  - Existing Inngest functions define the EXACT pattern for event definitions, step naming, and registration
  - Each extraction module (T8, T9) is called here — must understand their return types
  - Content action (T14) is used for storage — must pass correct field shapes

  **Acceptance Criteria**:
  - [ ] File: `src/lib/inngest/functions/sources/process-external-source.ts`
  - [ ] Registered in `src/lib/inngest/functions/index.ts`
  - [ ] Test file: `src/lib/inngest/functions/sources/__tests__/process-external-source.test.ts`
  - [ ] `bun test src/lib/inngest/functions/sources/__tests__/process-external-source.test.ts` → PASS (≥5 tests)
  - [ ] YouTube URL → extract → store → emit event
  - [ ] Article URL → extract → store → emit event
  - [ ] Unknown URL → error, no content stored
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Process YouTube URL end-to-end
    Tool: Bash
    Preconditions: YouTube extractor and content actions mocked
    Steps:
      1. Run test: `bun test src/lib/inngest/functions/sources/__tests__/process-external-source.test.ts -t "YouTube"` — passes
      2. Verify parseUrl called with input URL
      3. Verify extractYouTubeTranscript called with parsed videoId
      4. Verify createContentItem called with sourceType: 'youtube', status: 'draft'
      5. Verify event "ai/content.generate-from-source" emitted with contentItemId
    Expected Result: Full pipeline from URL → extraction → storage → AI event
    Failure Indicators: Missing step, wrong event name, content not stored before event
    Evidence: .sisyphus/evidence/task-15-youtube-pipeline.txt

  Scenario: Unknown URL type returns error
    Tool: Bash
    Preconditions: URL parser returns sourceType: 'unknown'
    Steps:
      1. Run test with URL: "ftp://invalid.example.com/file"
      2. Verify no extraction attempted
      3. Verify no content stored in library
      4. Verify no downstream event emitted
    Expected Result: Graceful error, pipeline stops cleanly
    Failure Indicators: Extraction attempted on unknown type, event emitted despite error
    Evidence: .sisyphus/evidence/task-15-unknown-url.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(inngest): add processExternalSource pipeline for URL→content extraction`
  - Files: `src/lib/inngest/functions/sources/process-external-source.ts`, `src/lib/inngest/functions/index.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 16. Inngest Job — generateFromSource

  **What to do**:
  - RED: Write tests for Inngest function `generateFromSource` — receives contentItemId event, loads content item and channel profile, calls GenerationEngine, stores AI-generated draft back into content_library, increments AI quota. Test successful generation. Test quota exceeded rejection. Test missing content item error.
  - GREEN: Create `src/lib/inngest/functions/ai/generate-from-source.ts`:
    - Event: `"ai/content.generate-from-source"` with data: `{contentItemId: string, userId: string, channelId: string}`
    - Step 1 (`load-content`): Fetch content item from DB by contentItemId. If not found, fail with descriptive error.
    - Step 2 (`check-quota`): Call `enforceAiQuota(userId)` (Task 4). If exceeded, fail with quota error.
    - Step 3 (`load-channel-profile`): Fetch channel profile from DB for channelId (existing `channel_profiles` table)
    - Step 4 (`generate`): Call `GenerationEngine.generate({type: 'source_to_telegram', sourceContent: contentItem.content, channelProfile, options: {}})` (Task 13)
    - Step 5 (`store-result`): Update the content_library item: set generated AI content alongside source content (or create new sibling item with sourceType: 'ai_generated'), update status to 'draft'
    - Step 6 (`track-usage`): Call `incrementAiUsage(userId)` (Task 4)
  - REFACTOR: Follow existing Inngest AI function patterns (e.g., `adaptContent`)

  **Must NOT do**:
  - Must NOT skip quota check — MANDATORY before any AI call
  - Must NOT overwrite source content — AI draft is additional field or sibling item
  - Must NOT retry on quota exceeded — that's a user-facing limit, not a transient error
  - Must NOT call provider directly — must go through GenerationEngine

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-step Inngest job with quota enforcement, AI engine integration, and DB updates
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15, 17-23)
  - **Blocks**: Task 17 (createFromUrl — full pipeline)
  - **Blocked By**: Task 10 (generate-from-source prompt), Task 13 (generation engine), Task 15 (processExternalSource — emits triggering event)

  **References**:

  **Pattern References**:
  - `src/lib/inngest/functions/ai/` — **Existing AI Inngest functions** (e.g., `adaptContent`). Read for step structure, quota handling, and provider usage patterns.
  - `src/lib/billing/enforce.ts` — `enforceQuota()` pattern. AI quota enforcement (Task 4) follows this exact pattern.

  **API/Type References**:
  - `src/lib/ai/generation-engine.ts` (Task 13) — `GenerationEngine.generate(request)` method
  - `src/lib/billing/ai-quota.ts` (Task 4) — `enforceAiQuota(userId)` and `incrementAiUsage(userId)`
  - `src/server/db/schema/content-library.ts` (Task 1) — Updated schema for storing AI-generated content

  **WHY Each Reference Matters**:
  - Existing AI Inngest functions show the EXACT step pattern for quota→generate→store
  - `enforce.ts` pattern ensures quota is checked correctly (fail early, not after AI call)
  - Generation engine is the only valid way to call AI — no direct provider calls

  **Acceptance Criteria**:
  - [ ] File: `src/lib/inngest/functions/ai/generate-from-source.ts`
  - [ ] Registered in `src/lib/inngest/functions/index.ts`
  - [ ] Test file: `src/lib/inngest/functions/ai/__tests__/generate-from-source.test.ts`
  - [ ] `bun test src/lib/inngest/functions/ai/__tests__/generate-from-source.test.ts` → PASS (≥5 tests)
  - [ ] Quota checked BEFORE AI call
  - [ ] AI usage incremented AFTER successful generation
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Generate content from stored source
    Tool: Bash
    Preconditions: Content item in DB, channel profile available, quota not exceeded
    Steps:
      1. Run test: `bun test src/lib/inngest/functions/ai/__tests__/generate-from-source.test.ts -t "successful"` — passes
      2. Verify quota checked before generation
      3. Verify GenerationEngine.generate called with source_to_telegram type
      4. Verify content_library updated with AI-generated content
      5. Verify AI usage incremented
    Expected Result: Full flow: quota check → generate → store → track
    Failure Indicators: Quota skipped, AI usage not incremented, content not stored
    Evidence: .sisyphus/evidence/task-16-generate-success.txt

  Scenario: Quota exceeded prevents generation
    Tool: Bash
    Preconditions: enforceAiQuota mocked to return exceeded
    Steps:
      1. Run test: `bun test src/lib/inngest/functions/ai/__tests__/generate-from-source.test.ts -t "quota"` — passes
      2. Verify GenerationEngine.generate was NOT called
      3. Verify AI usage was NOT incremented
      4. Verify step fails with quota exceeded error
    Expected Result: Pipeline stops at quota check, no AI resources consumed
    Failure Indicators: AI call made despite quota exceeded
    Evidence: .sisyphus/evidence/task-16-quota-exceeded.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(inngest): add generateFromSource pipeline with quota enforcement`
  - Files: `src/lib/inngest/functions/ai/generate-from-source.ts`, `src/lib/inngest/functions/index.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 17. Server Action — createFromUrl

  **What to do**:
  - RED: Write tests for `createFromUrl(url: string, channelId: string)` server action — validates URL, checks auth, triggers Inngest pipeline, returns success with message. Test valid YouTube URL. Test valid article URL. Test invalid URL rejection. Test unauthorized access.
  - GREEN: Create or extend `src/server/actions/sources.ts`:
    - `createFromUrl(url: string, channelId: string): Promise<ActionResult<{message: string, contentId?: string}>>` —
      1. Authenticate user via `supabase.auth.getUser()`
      2. Validate URL with `parseUrl()` — reject unknown/invalid URLs
      3. Check AI quota with `enforceAiQuota(userId)` — fail early before triggering pipeline
      4. Emit Inngest event `"sources/url.submitted"` with `{url, userId, channelId}`
      5. Return `{success: true, data: {message: "Processing started"}}`
    - This is a thin orchestrator — heavy lifting happens in Inngest jobs (Task 15 + 16)
    - Validate channelId belongs to user (ownership check)
  - REFACTOR: Ensure error messages are user-friendly and i18n-ready

  **Must NOT do**:
  - Must NOT do extraction synchronously — must go through Inngest for resilience
  - Must NOT skip URL validation before triggering pipeline
  - Must NOT skip quota check — fail fast before starting async work
  - Must NOT expose Inngest internals in the response

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server action following established patterns, thin orchestration layer
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15, 16, 18-23)
  - **Blocks**: Task 24 (Create from URL page — calls this action)
  - **Blocked By**: Task 15 (processExternalSource Inngest job), Task 16 (generateFromSource Inngest job), Task 14 (content actions)

  **References**:

  **Pattern References**:
  - `src/server/actions/` — Existing server actions for `ActionResult<T>` pattern, auth checks, Inngest event emission
  - `src/lib/inngest/client.ts` — How to send Inngest events from server actions: `inngest.send({name, data})`

  **API/Type References**:
  - `src/lib/sources/url-parser.ts` (Task 5) — `parseUrl()` for URL validation
  - `src/lib/billing/ai-quota.ts` (Task 4) — `enforceAiQuota()` for pre-flight quota check

  **WHY Each Reference Matters**:
  - Server action pattern ensures consistent auth, error handling, and return types
  - Inngest client shows how events are emitted from actions — not HTTP calls, but SDK

  **Acceptance Criteria**:
  - [ ] File: `src/server/actions/sources.ts`
  - [ ] Test file: `src/server/actions/__tests__/sources.test.ts`
  - [ ] `bun test src/server/actions/__tests__/sources.test.ts` → PASS (≥5 tests)
  - [ ] URL validated before Inngest event emission
  - [ ] Quota checked before pipeline triggered
  - [ ] Returns `ActionResult` shape
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Submit valid YouTube URL
    Tool: Bash
    Preconditions: Auth mocked, quota available, Inngest client mocked
    Steps:
      1. Run test: `bun test src/server/actions/__tests__/sources.test.ts -t "YouTube URL"` — passes
      2. Verify parseUrl called, returns sourceType: 'youtube'
      3. Verify enforceAiQuota called with userId
      4. Verify inngest.send called with event "sources/url.submitted"
      5. Verify returns {success: true, data: {message: "Processing started"}}
    Expected Result: Action validates, checks quota, triggers pipeline, returns success
    Failure Indicators: Direct extraction, quota skipped, wrong event name
    Evidence: .sisyphus/evidence/task-17-youtube-submit.txt

  Scenario: Invalid URL rejected before pipeline trigger
    Tool: Bash
    Preconditions: Auth mocked
    Steps:
      1. Run test with URL: "not-a-url"
      2. Verify parseUrl rejects the input
      3. Verify inngest.send was NOT called
      4. Verify returns {success: false, error: "Invalid URL"}
    Expected Result: Fast failure, no resources consumed
    Failure Indicators: Inngest event emitted for invalid URL
    Evidence: .sisyphus/evidence/task-17-invalid-url.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(actions): add createFromUrl server action to trigger URL→content pipeline`
  - Files: `src/server/actions/sources.ts`, `src/server/actions/__tests__/sources.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 18. Server Action — repurposePost

  **What to do**:
  - RED: Write tests for `repurposePost(contentId: string, mode: RepurposeMode, options?: {numVariations?: number})` — loads original content, checks auth + quota, triggers Inngest AI generation with repurpose type, stores results as new content items linked to original. Test each mode. Test quota exceeded. Test invalid contentId.
  - GREEN: Create `src/server/actions/repurpose.ts`:
    - `repurposePost(contentId: string, mode: RepurposeMode, options?: {numVariations?: number}): Promise<ActionResult<{message: string}>>` —
      1. Authenticate user
      2. Load original content item from DB — verify ownership
      3. Check AI quota with `enforceAiQuota(userId)`
      4. Emit Inngest event `"ai/content.repurpose"` with `{contentId, mode, numVariations, userId, channelId}`
      5. Return success with "Repurposing started" message
    - Inngest function (runs async):
      - Load content item + channel profile
      - Call `GenerationEngine.generate({type: 'repurpose', sourceContent: original.content, channelProfile, options: {repurposeMode: mode, numVariations}})`
      - For each variation: create new content_library item with sourceType: 'repurposed', sourceUrl pointing to original contentId, status: 'draft'
      - Increment AI usage
  - REFACTOR: Inngest function goes in `src/lib/inngest/functions/ai/repurpose-content.ts`

  **Must NOT do**:
  - Must NOT modify the original content item — create new items
  - Must NOT add modes beyond 'shorter' | 'thread' | 'poll'
  - Must NOT skip quota enforcement
  - Must NOT run AI synchronously in the server action

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server action + Inngest job pair, follows established patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15-17, 19-23)
  - **Blocks**: Task 25 (Repurpose modal UI)
  - **Blocked By**: Task 11 (repurpose prompt), Task 13 (generation engine), Task 14 (content actions)

  **References**:

  **Pattern References**:
  - `src/server/actions/sources.ts` (Task 17) — Server action → Inngest event pattern. Repurpose follows same thin-action pattern.
  - `src/lib/inngest/functions/ai/generate-from-source.ts` (Task 16) — Inngest AI job pattern: quota → generate → store → track usage.

  **API/Type References**:
  - `src/lib/ai/types.ts` — `RepurposeMode`, `GenerationRequest`, `GenerationType = 'repurpose'`
  - `src/lib/ai/generation-engine.ts` (Task 13) — `GenerationEngine.generate()` with repurpose type
  - `src/server/actions/content.ts` (Task 14) — `createContentItem()` for storing repurposed items

  **WHY Each Reference Matters**:
  - Task 17 establishes the server action → Inngest pattern — repurpose must follow identically
  - Task 16 establishes the AI Inngest job pattern — quota → generate → store → track

  **Acceptance Criteria**:
  - [ ] File: `src/server/actions/repurpose.ts`
  - [ ] File: `src/lib/inngest/functions/ai/repurpose-content.ts`
  - [ ] Registered in `src/lib/inngest/functions/index.ts`
  - [ ] Test files for both action and Inngest function
  - [ ] `bun test` for both → PASS (≥8 tests total)
  - [ ] Each repurposed variation stored as separate content item
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Repurpose post into shorter version
    Tool: Bash
    Preconditions: Content item exists, quota available, mocks set up
    Steps:
      1. Run test: `bun test src/server/actions/__tests__/repurpose.test.ts -t "shorter"` — passes
      2. Verify server action emits "ai/content.repurpose" event with mode: 'shorter'
      3. Verify Inngest function calls GenerationEngine with type: 'repurpose'
      4. Verify new content item created with sourceType: 'repurposed'
    Expected Result: Original preserved, new shorter draft created
    Failure Indicators: Original modified, wrong source type, quota not checked
    Evidence: .sisyphus/evidence/task-18-repurpose-shorter.txt

  Scenario: Repurpose with poll mode produces question + options
    Tool: Bash
    Preconditions: Content item exists, AI mocked to return poll format
    Steps:
      1. Run test with mode: 'poll'
      2. Verify GenerationEngine called with repurposeMode: 'poll'
      3. Verify stored content has poll format (question + options)
    Expected Result: Poll-format content stored as new draft
    Failure Indicators: Plain text instead of poll format
    Evidence: .sisyphus/evidence/task-18-repurpose-poll.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(repurpose): add server action + Inngest job for content repurposing with 3 modes`
  - Files: `src/server/actions/repurpose.ts`, `src/lib/inngest/functions/ai/repurpose-content.ts`, `src/lib/inngest/functions/index.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 19. Server Action — developIdea

  **What to do**:
  - RED: Write tests for `developIdea(contentId: string)` — loads idea-status content item, checks auth + quota, triggers Inngest AI generation with idea_to_draft type, updates content item status from 'idea' to 'draft' with AI-generated content. Test successful development. Test non-idea status rejection. Test quota exceeded.
  - GREEN: Create `src/server/actions/develop-idea.ts`:
    - `developIdea(contentId: string): Promise<ActionResult<{message: string}>>` —
      1. Authenticate user
      2. Load content item — verify ownership AND status is 'idea'
      3. Check AI quota
      4. Emit Inngest event `"ai/content.develop-idea"` with `{contentId, userId, channelId}`
      5. Return success
    - Inngest function `src/lib/inngest/functions/ai/develop-idea.ts`:
      - Load content item (the idea) + channel profile
      - Load recent drafts for deduplication context (optional, last 5 drafts for this channel)
      - Call `GenerationEngine.generate({type: 'idea_to_draft', sourceContent: idea.content, channelProfile, options: {existingDrafts}})`
      - Update content item: set AI content, change status to 'draft'
      - Increment AI usage
  - REFACTOR: Follow same pattern as Task 18 (server action + Inngest function pair)

  **Must NOT do**:
  - Must NOT develop content that isn't in 'idea' status — reject with clear error
  - Must NOT create a new item — update the existing idea to draft status
  - Must NOT skip deduplication context (even if empty array)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server action + Inngest pair following established pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15-18, 20-23)
  - **Blocks**: Task 26 (Quick-capture component)
  - **Blocked By**: Task 12 (idea-to-draft prompt), Task 13 (generation engine), Task 14 (content actions)

  **References**:

  **Pattern References**:
  - `src/server/actions/repurpose.ts` (Task 18) — Same server action → Inngest pattern
  - `src/lib/inngest/functions/ai/generate-from-source.ts` (Task 16) — AI Inngest job pattern

  **API/Type References**:
  - `src/lib/ai/types.ts` — `GenerationType = 'idea_to_draft'`
  - `src/server/actions/content.ts` (Task 14) — `updateContentStatus()` for idea→draft transition

  **WHY Each Reference Matters**:
  - Task 18 is the direct template — identical action→Inngest→store flow
  - Content actions (T14) handle status transitions with validation

  **Acceptance Criteria**:
  - [ ] File: `src/server/actions/develop-idea.ts`
  - [ ] File: `src/lib/inngest/functions/ai/develop-idea.ts`
  - [ ] Registered in `src/lib/inngest/functions/index.ts`
  - [ ] Test files for both
  - [ ] `bun test` for both → PASS (≥6 tests total)
  - [ ] Non-idea content rejected with error
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Develop idea into draft
    Tool: Bash
    Preconditions: Content item with status 'idea', quota available
    Steps:
      1. Run test: `bun test src/server/actions/__tests__/develop-idea.test.ts -t "successful"` — passes
      2. Verify content item status updated from 'idea' to 'draft'
      3. Verify AI-generated content stored alongside original idea text
      4. Verify AI usage incremented
    Expected Result: Idea transformed into draft with AI content
    Failure Indicators: Status unchanged, idea text overwritten, quota not tracked
    Evidence: .sisyphus/evidence/task-19-develop-idea.txt

  Scenario: Reject non-idea content
    Tool: Bash
    Preconditions: Content item with status 'draft' (not 'idea')
    Steps:
      1. Run test: `bun test src/server/actions/__tests__/develop-idea.test.ts -t "non-idea"` — passes
      2. Verify returns {success: false, error: "Only ideas can be developed"}
      3. Verify no AI call made, no usage tracked
    Expected Result: Clear rejection, no resources consumed
    Failure Indicators: AI generation attempted on non-idea content
    Evidence: .sisyphus/evidence/task-19-non-idea-rejection.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(ideas): add developIdea server action + Inngest job for idea→draft AI generation`
  - Files: `src/server/actions/develop-idea.ts`, `src/lib/inngest/functions/ai/develop-idea.ts`, `src/lib/inngest/functions/index.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 20. Inngest Job — publishToTelegram

  **What to do**:
  - RED: Write tests for `publishToTelegram` Inngest function — receives contentId + channelId, loads content, detects content format (text-only, text+image, media group, poll), calls appropriate Telegram client method, records published status. Test plain text publishing. Test text+image publishing. Test poll publishing. Test Telegram API error handling.
  - GREEN: Create `src/lib/inngest/functions/telegram/publish-to-telegram.ts`:
    - Event: `"telegram/post.publish"` with data: `{contentId: string, userId: string, channelId: string, scheduledAt?: string}`
    - Step 1 (`load-content`): Load content item from DB, verify status is 'ready' or 'draft'
    - Step 2 (`load-channel`): Load telegram_channel from DB to get chatId and bot token
    - Step 3 (`detect-format`): Analyze content to determine sending method:
      - Plain text → `sendMessage(chatId, text, {parse_mode: 'MarkdownV2'})`
      - Text + single image URL → `sendPhoto(chatId, photoUrl, {caption: text})`
      - Text + multiple images → `sendMediaGroup(chatId, mediaArray)` (Task 7)
      - Poll format → `sendPoll(chatId, question, options)` (Task 7)
    - Step 4 (`publish`): Call appropriate Telegram client method
    - Step 5 (`update-status`): Update content_library item status to 'published', record `publishedAt` timestamp
    - Step 6 (`record-in-external-sources`): Optionally record the published Telegram message_id in external_sources table for analytics tracking
    - If `scheduledAt` is provided: the Inngest event has `ts` field for delayed execution (existing scheduling pattern)
  - Register in `src/lib/inngest/functions/index.ts`
  - REFACTOR: Follow existing Inngest publish patterns (e.g., executeScheduledPost)

  **Must NOT do**:
  - Must NOT publish content with status 'idea' — must be 'ready' or 'draft' at minimum
  - Must NOT send MarkdownV2 without escaping special characters (Telegram is strict about this)
  - Must NOT retry on Telegram "chat not found" errors — permanent failure, not transient
  - Must NOT add inline keyboard buttons or other bot-specific features

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex format detection logic, Telegram API integration with strict formatting rules, multiple code paths
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15-19, 21-23)
  - **Blocks**: Task 21 (publishToTelegram server action + scheduling)
  - **Blocked By**: Task 7 (Telegram client extensions — sendMediaGroup, sendPoll), Task 2 (schedules generalization)

  **References**:

  **Pattern References**:
  - `src/lib/inngest/functions/` — Existing publish/schedule functions (e.g., `executeScheduledPost`). Read for scheduling pattern with `ts` field.
  - `src/lib/telegram/client.ts` — `sendMessage`, `sendPhoto`, `sendMediaGroup` (Task 7), `sendPoll` (Task 7). Read all send methods.

  **API/Type References**:
  - `src/server/db/schema/telegram-channels.ts` — Schema for `telegram_channels` table with chatId and bot token
  - `src/server/db/schema/content-library.ts` (Task 1) — Content item with status field
  - `src/lib/telegram/client.ts` — Existing client with callApi pattern and retry logic

  **External References**:
  - Telegram Bot API MarkdownV2: https://core.telegram.org/bots/api#markdownv2-style — STRICT escaping rules: must escape `_*[]()~>#+-=|{}.!` outside of formatting entities

  **WHY Each Reference Matters**:
  - Existing publish functions show Inngest scheduling pattern (ts field for delayed execution)
  - Telegram client methods (existing + Task 7) are the exact API calls made here
  - MarkdownV2 escaping rules are critical — wrong escaping → Telegram rejects the message

  **Acceptance Criteria**:
  - [ ] File: `src/lib/inngest/functions/telegram/publish-to-telegram.ts`
  - [ ] Registered in `src/lib/inngest/functions/index.ts`
  - [ ] Test file: `src/lib/inngest/functions/telegram/__tests__/publish-to-telegram.test.ts`
  - [ ] `bun test` for test file → PASS (≥6 tests)
  - [ ] Plain text → sendMessage, image → sendPhoto, multi-image → sendMediaGroup, poll → sendPoll
  - [ ] MarkdownV2 special characters escaped correctly
  - [ ] Content status updated to 'published' after success
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Publish plain text post to Telegram
    Tool: Bash
    Preconditions: Content item with plain text, channel with valid chatId, Telegram client mocked
    Steps:
      1. Run test: `bun test src/lib/inngest/functions/telegram/__tests__/publish-to-telegram.test.ts -t "plain text"` — passes
      2. Verify sendMessage called with chatId and formatted text
      3. Verify parse_mode is 'MarkdownV2'
      4. Verify content status updated to 'published'
    Expected Result: Text sent via sendMessage, status updated
    Failure Indicators: Wrong Telegram method called, status not updated
    Evidence: .sisyphus/evidence/task-20-publish-text.txt

  Scenario: Handle Telegram API error gracefully
    Tool: Bash
    Preconditions: Telegram client mocked to return 403 "bot was blocked by the user"
    Steps:
      1. Run test: `bun test src/lib/inngest/functions/telegram/__tests__/publish-to-telegram.test.ts -t "API error"` — passes
      2. Verify content status NOT updated to 'published'
      3. Verify error recorded with descriptive message
      4. Verify no retry for permanent errors (403, 404)
    Expected Result: Graceful failure with error logging, no retry on permanent errors
    Failure Indicators: Status incorrectly set to 'published', infinite retry
    Evidence: .sisyphus/evidence/task-20-telegram-error.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(telegram): add publishToTelegram Inngest job with format detection and MarkdownV2 escaping`
  - Files: `src/lib/inngest/functions/telegram/publish-to-telegram.ts`, `src/lib/inngest/functions/index.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 21. Server Action — publishToTelegram + Scheduling Integration

  **What to do**:
  - RED: Write tests for `publishToTelegram(contentId: string, channelId: string, scheduledAt?: string)` — validates content status, checks auth, triggers Inngest publish event immediately or at scheduled time. Test immediate publish. Test scheduled publish (future timestamp). Test invalid content status rejection. Test scheduling via generalized schedules table.
  - GREEN: Create `src/server/actions/publish-telegram.ts`:
    - `publishToTelegram(contentId: string, channelId: string, scheduledAt?: string): Promise<ActionResult<{message: string}>>` —
      1. Authenticate user
      2. Load content item — verify ownership, verify status is 'draft' or 'ready'
      3. Verify channelId belongs to user's telegram_channels
      4. If `scheduledAt` provided:
      - Create schedule record in generalized `schedules` table (Task 2): set `contentLibraryId`, `targetType: 'telegram'`, `scheduledFor: scheduledAt`
      - Emit Inngest event `"telegram/post.publish"` with `ts: scheduledAt` for delayed execution
      - Update content status to 'scheduled' (add this status if not in Task 1's enum)
      5. If no `scheduledAt`:
      - Emit Inngest event `"telegram/post.publish"` immediately
      - Status updated to 'publishing' (Inngest job updates to 'published' on success)
      6. Return success
  - REFACTOR: Integrate with existing scheduling engine patterns in `src/lib/scheduling/engine.ts`

  **Must NOT do**:
  - Must NOT publish synchronously — always go through Inngest
  - Must NOT bypass content status validation
  - Must NOT create schedule records with the old crossPostId-only pattern — use new generalized columns
  - Must NOT allow scheduling in the past

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server action with scheduling integration, follows established patterns but touches two subsystems
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15-20, 22-23)
  - **Blocks**: Task 28 (Telegram publish UI)
  - **Blocked By**: Task 20 (publishToTelegram Inngest job), Task 2 (schedules generalization)

  **References**:

  **Pattern References**:
  - `src/server/actions/sources.ts` (Task 17) — Server action → Inngest event emission pattern
  - `src/lib/scheduling/engine.ts` — Existing scheduling logic with timezone handling and Inngest `ts` field usage
  - `src/server/db/schema/schedules.ts` (Task 2) — Generalized schedules table with `contentLibraryId` and `targetType`

  **API/Type References**:
  - `src/lib/inngest/functions/telegram/publish-to-telegram.ts` (Task 20) — The Inngest function this action triggers
  - `src/server/actions/content.ts` (Task 14) — `updateContentStatus()` for status transitions

  **WHY Each Reference Matters**:
  - Scheduling engine shows timezone→UTC conversion needed for `scheduledAt`
  - Generalized schedules table (Task 2) is the new storage for Telegram schedules — must use new columns
  - Task 20 defines the event shape this action must emit

  **Acceptance Criteria**:
  - [ ] File: `src/server/actions/publish-telegram.ts`
  - [ ] Test file: `src/server/actions/__tests__/publish-telegram.test.ts`
  - [ ] `bun test src/server/actions/__tests__/publish-telegram.test.ts` → PASS (≥6 tests)
  - [ ] Immediate publish emits event without `ts`
  - [ ] Scheduled publish creates schedule record AND emits event with `ts`
  - [ ] Past timestamps rejected
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Publish immediately to Telegram
    Tool: Bash
    Preconditions: Content item with status 'draft', valid channel, auth mocked
    Steps:
      1. Run test: `bun test src/server/actions/__tests__/publish-telegram.test.ts -t "immediate"` — passes
      2. Verify Inngest event emitted without ts field
      3. Verify content status updated to 'publishing'
      4. Verify no schedule record created
    Expected Result: Immediate publish triggered, status reflects in-progress
    Failure Indicators: Schedule record created unnecessarily, wrong status
    Evidence: .sisyphus/evidence/task-21-immediate-publish.txt

  Scenario: Schedule publish for future time
    Tool: Bash
    Preconditions: Content item, valid channel, scheduledAt = 1 hour from now
    Steps:
      1. Run test: `bun test src/server/actions/__tests__/publish-telegram.test.ts -t "scheduled"` — passes
      2. Verify schedule record created with contentLibraryId and targetType: 'telegram'
      3. Verify Inngest event emitted with ts matching scheduledAt
      4. Verify content status updated to 'scheduled'
    Expected Result: Schedule record + delayed Inngest event
    Failure Indicators: No schedule record, immediate execution, past time accepted
    Evidence: .sisyphus/evidence/task-21-scheduled-publish.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(publish): add publishToTelegram server action with immediate and scheduled modes`
  - Files: `src/server/actions/publish-telegram.ts`, `src/server/actions/__tests__/publish-telegram.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 22. AI Prompt — calendar-fill.ts

  **What to do**:
  - RED: Write tests for `buildCalendarFillPrompt(params)` — verifies prompt takes content gap dates + existing content + channel profile, and produces suggestions for filling each gap. Test with single gap. Test with multiple gaps. Test with existing drafts context for coherence.
  - GREEN: Create `src/lib/ai/prompts/calendar-fill.ts`:
    - `buildCalendarFillPrompt(request: {gapDates: string[], existingContent: {date: string, title: string}[], channelProfile: ChannelProfile, recentTopics?: string[]}): PromptMessages`
    - System prompt: "You are a content calendar strategist for a Telegram channel. Channel: {niche}, tone: {tone}, posting frequency: typical. Suggest content for the empty dates below. Each suggestion should be diverse (not repetitive), fit the channel's voice, and complement the existing calendar."
    - User prompt: "Calendar gaps: {gapDates.join(', ')}\n\nExisting scheduled content:\n{existingContent formatted}\n\nRecent topics to avoid repeating: {recentTopics}\n\nFor each gap date, provide: a post title, 1-sentence description, and suggested source type (idea/repurpose/external). Return as JSON array."
    - Output format: instruct AI to return JSON array of `CalendarFillSuggestion` (Task 6 type)
  - REFACTOR: Reuse channel voice helper. Also update GenerationEngine (Task 13) to remove calendar_fill placeholder and wire this prompt.

  **Must NOT do**:
  - Must NOT suggest more than 1 post per gap date
  - Must NOT generate full post content — only titles and descriptions (full generation is separate step)
  - Must NOT ignore existing scheduled content (would cause repetition)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex prompt with JSON output format, calendar context awareness, and integration with generation engine
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15-21, 23)
  - **Blocks**: Task 23 (suggestCalendarFill Inngest job)
  - **Blocked By**: Task 6 (AI generation types — CalendarFillSuggestion type)

  **References**:

  **Pattern References**:
  - `src/lib/ai/prompts/generate-from-source.ts` (Task 10) — Prompt builder pattern with channel voice
  - `src/lib/ai/prompts/idea-to-draft.ts` (Task 12) — Shows deduplication context pattern (existingDrafts)

  **API/Type References**:
  - `src/lib/ai/types.ts` — `CalendarFillSuggestion` interface (Task 6): `{date, suggestedContent, sourceId?, sourceType, confidence}`
  - `src/lib/ai/generation-engine.ts` (Task 13) — Remove calendar_fill placeholder, wire this prompt

  **WHY Each Reference Matters**:
  - Task 10/12 prompts show established channel voice and deduplication patterns to follow
  - CalendarFillSuggestion type constrains the AI output format — prompt must instruct matching JSON

  **Acceptance Criteria**:
  - [ ] File: `src/lib/ai/prompts/calendar-fill.ts`
  - [ ] Test file: `src/lib/ai/prompts/__tests__/calendar-fill.test.ts`
  - [ ] `bun test src/lib/ai/prompts/__tests__/calendar-fill.test.ts` → PASS (≥4 tests)
  - [ ] Prompt instructs JSON output matching CalendarFillSuggestion[]
  - [ ] Generation engine calendar_fill placeholder replaced with real routing
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Build prompt for 3 calendar gaps
    Tool: Bash
    Preconditions: Types available, channel profile with niche
    Steps:
      1. Run test with gapDates: ["2026-03-10", "2026-03-12", "2026-03-15"]
      2. Verify prompt includes all 3 dates
      3. Verify existing content context included
      4. Verify JSON output format instruction present
    Expected Result: Prompt ready to generate 3 gap-fill suggestions
    Failure Indicators: Missing dates, no JSON format instruction, missing existing content
    Evidence: .sisyphus/evidence/task-22-calendar-prompt.txt

  Scenario: Recent topics included for variety
    Tool: Bash
    Preconditions: recentTopics: ["DeFi yields", "NFT market crash"]
    Steps:
      1. Run test with recentTopics provided
      2. Verify prompt includes "avoid repeating" section with topics
    Expected Result: AI instructed to diversify away from recent topics
    Failure Indicators: No topic avoidance instruction
    Evidence: .sisyphus/evidence/task-22-topic-variety.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(ai): add calendar-fill prompt and wire into generation engine`
  - Files: `src/lib/ai/prompts/calendar-fill.ts`, `src/lib/ai/prompts/__tests__/calendar-fill.test.ts`, `src/lib/ai/generation-engine.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 23. Inngest Job — suggestCalendarFill + Server Action

  **What to do**:
  - RED: Write tests for: (a) `detectCalendarGaps(channelId, dateRange)` utility — finds dates without scheduled/published content. (b) `suggestCalendarFill` Inngest function — loads channel, detects gaps, calls AI, stores suggestions. (c) `getCalendarSuggestions(channelId, dateRange)` server action — triggers Inngest job or returns cached suggestions.
  - GREEN:
    - Create `src/lib/scheduling/calendar-gaps.ts`:
      - `detectCalendarGaps(channelId: string, startDate: string, endDate: string): Promise<string[]>` — queries schedules + content_library (published items) for date range, returns dates with no content
      - Uses channel's typical posting frequency as reference (e.g., if channel posts daily, every day without content is a gap)
    - Create `src/lib/inngest/functions/ai/suggest-calendar-fill.ts`:
      - Event: `"ai/calendar.suggest-fill"` with data: `{channelId, userId, startDate, endDate}`
      - Step 1: Detect calendar gaps
      - Step 2: Load existing scheduled content for context
      - Step 3: Load channel profile
      - Step 4: Check AI quota
      - Step 5: Call GenerationEngine with type 'calendar_fill'
      - Step 6: Store suggestions (as idea-status content items or in a suggestions cache)
      - Step 7: Increment AI usage
    - Create `src/server/actions/calendar.ts`:
      - `requestCalendarSuggestions(channelId: string, startDate: string, endDate: string): Promise<ActionResult<{message: string}>>` — triggers Inngest job
      - `getCalendarSuggestions(channelId: string): Promise<ActionResult<CalendarFillSuggestion[]>>` — returns stored suggestions
  - REFACTOR: Follow established patterns for all three components

  **Must NOT do**:
  - Must NOT auto-schedule suggestions — user must approve each one
  - Must NOT skip quota check before AI suggestion generation
  - Must NOT suggest filling dates that already have content
  - Must NOT suggest more than 7 days out by default

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Three interconnected components (utility + Inngest job + server action), calendar logic with date handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15-22)
  - **Blocks**: Task 29 (Calendar gap detection UI)
  - **Blocked By**: Task 22 (calendar-fill prompt), Task 13 (generation engine), Task 14 (content actions)

  **References**:

  **Pattern References**:
  - `src/lib/scheduling/engine.ts` — Existing scheduling engine for date/time handling patterns
  - `src/lib/inngest/functions/ai/generate-from-source.ts` (Task 16) — AI Inngest job pattern: quota → generate → store → track
  - `src/server/actions/sources.ts` (Task 17) — Server action → Inngest event pattern

  **API/Type References**:
  - `src/lib/ai/types.ts` — `CalendarFillSuggestion`, `GenerationType = 'calendar_fill'`
  - `src/server/db/schema/schedules.ts` (Task 2) — Query generalized schedules for existing content dates
  - `src/server/db/schema/content-library.ts` (Task 1) — Query published content for date coverage

  **WHY Each Reference Matters**:
  - Scheduling engine shows date handling patterns (timezone awareness, UTC conversion)
  - AI Inngest job pattern (Task 16) is the structural template
  - Schedules + content_library queries combined give the "what dates have content" picture

  **Acceptance Criteria**:
  - [ ] File: `src/lib/scheduling/calendar-gaps.ts`
  - [ ] File: `src/lib/inngest/functions/ai/suggest-calendar-fill.ts`
  - [ ] File: `src/server/actions/calendar.ts`
  - [ ] Registered in `src/lib/inngest/functions/index.ts`
  - [ ] Test files for all three
  - [ ] `bun test` for all → PASS (≥10 tests total)
  - [ ] Gap detection returns only dates without content
  - [ ] Suggestions stored as retrievable results
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Detect gaps in weekly schedule
    Tool: Bash
    Preconditions: Channel has content on Mon, Wed, Fri; checked range is Mon-Sun
    Steps:
      1. Run test: `bun test src/lib/scheduling/__tests__/calendar-gaps.test.ts -t "detect gaps"` — passes
      2. Verify gaps returned: [Tue, Thu, Sat, Sun] (4 days without content)
    Expected Result: Correct gap dates identified
    Failure Indicators: Dates with content listed as gaps, wrong date format
    Evidence: .sisyphus/evidence/task-23-gap-detection.txt

  Scenario: Generate and store calendar suggestions
    Tool: Bash
    Preconditions: Gaps detected, AI mocked to return suggestions array
    Steps:
      1. Run test: `bun test src/lib/inngest/functions/ai/__tests__/suggest-calendar-fill.test.ts -t "generate"` — passes
      2. Verify quota checked before AI call
      3. Verify GenerationEngine called with type 'calendar_fill'
      4. Verify suggestions stored and retrievable via getCalendarSuggestions
    Expected Result: Full pipeline: gaps → AI → stored suggestions
    Failure Indicators: Quota skipped, suggestions not stored, wrong generation type
    Evidence: .sisyphus/evidence/task-23-calendar-suggestions.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(calendar): add gap detection, AI fill suggestions, and calendar server actions`
  - Files: `src/lib/scheduling/calendar-gaps.ts`, `src/lib/inngest/functions/ai/suggest-calendar-fill.ts`, `src/server/actions/calendar.ts`, `src/lib/inngest/functions/index.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 24. "Create from URL" Page + Form UI

  **What to do**:
  - RED: Write component tests for: URL input with paste support, channel selector dropdown, submit button with loading state, success/error feedback display.
  - GREEN: Create `src/app/[locale]/(dashboard)/dashboard/create/page.tsx`:
    - Page title: "Create from URL" (i18n: `dashboard.create.title`)
    - Form with:
      - URL input field — large, prominent, with placeholder "Paste YouTube or article URL..." and paste icon
      - Channel selector — dropdown of user's Telegram channels (fetch via existing server action)
      - Submit button — calls `createFromUrl` server action (Task 17)
      - Loading state — show spinner + "Extracting content..." message while Inngest processes
    - After submission: redirect to content library filtered by latest draft, or show inline success with "View Draft" link
    - Create `src/components/create/url-input-form.tsx` — the form component (extracted for reuse)
    - Validation: show inline error for invalid URLs (use parseUrl from Task 5 for client-side check)
  - REFACTOR: Use existing UI components (Input, Button, Select from shadcn/ui). Follow existing page layout patterns.

  **Must NOT do**:
  - Must NOT add file upload — URL only for V1
  - Must NOT show AI generation progress in real-time (Inngest is async, user sees result after redirect)
  - Must NOT add podcast URL support (deferred V1.5)
  - Must NOT build custom components when shadcn/ui equivalents exist

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Full page + form component, needs consistent styling with existing dashboard
  - **Skills**: [`playwright`]
    - `playwright`: For browser-based QA verification of form interactions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 25, 26, 27, 28, 29)
  - **Blocks**: Task 30 (Navigation restructure — adds link to this page)
  - **Blocked By**: Task 17 (createFromUrl server action)

  **References**:

  **Pattern References**:
  - `src/app/[locale]/(dashboard)/dashboard/crosspost/page.tsx` — **Primary layout pattern.** Existing dashboard page with form. Follow same page structure, header, and layout.
  - `src/components/` — Existing component patterns. Check for form components to reuse.

  **API/Type References**:
  - `src/server/actions/sources.ts` (Task 17) — `createFromUrl(url, channelId)` server action called by the form
  - `src/lib/sources/url-parser.ts` (Task 5) — `parseUrl()` for client-side URL validation (can be used in browser)

  **UI References**:
  - `src/components/ui/` — shadcn/ui components: `input.tsx`, `button.tsx`, `select.tsx`, `card.tsx`
  - `src/app/globals.css` — Tailwind CSS 4 with OKLCH colors. Use `cn()` from `@/lib/utils`

  **WHY Each Reference Matters**:
  - Crosspost page is the closest existing analogue — form that triggers async background processing
  - shadcn/ui components ensure visual consistency with rest of app
  - Server action is the exact function wired to the submit button

  **Acceptance Criteria**:
  - [ ] File: `src/app/[locale]/(dashboard)/dashboard/create/page.tsx`
  - [ ] File: `src/components/create/url-input-form.tsx`
  - [ ] Page renders at `/dashboard/create`
  - [ ] Form submits to createFromUrl server action
  - [ ] Loading state shown during submission
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Submit valid YouTube URL
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user authenticated, at least 1 Telegram channel connected
    Steps:
      1. Navigate to `/dashboard/create`
      2. Verify page title "Create from URL" visible
      3. Paste "https://www.youtube.com/watch?v=dQw4w9WgXcQ" into URL input
      4. Select first channel from dropdown
      5. Click submit button
      6. Wait for loading state to appear (spinner or disabled button)
      7. Wait for success message or redirect (timeout: 10s)
    Expected Result: Form submits, loading state shown, success feedback displayed
    Failure Indicators: 404 page, form doesn't submit, no loading state, JavaScript error
    Evidence: .sisyphus/evidence/task-24-url-submit.png (screenshot)

  Scenario: Invalid URL shows validation error
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user authenticated
    Steps:
      1. Navigate to `/dashboard/create`
      2. Type "not-a-valid-url" into URL input
      3. Click submit button
      4. Wait for inline error message (timeout: 3s)
    Expected Result: Error message like "Please enter a valid URL" shown near input
    Failure Indicators: Form submits successfully, no error shown, page crash
    Evidence: .sisyphus/evidence/task-24-invalid-url.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): add "Create from URL" page with form and validation`
  - Files: `src/app/[locale]/(dashboard)/dashboard/create/page.tsx`, `src/components/create/url-input-form.tsx`
  - Pre-commit: `bun test && bun build`

- [ ] 25. "Repurpose" Modal/Page UI

  **What to do**:
  - RED: Write component tests for: repurpose mode selector (shorter/thread/poll), preview of original content, submit triggers repurposePost action, results display as list of new drafts.
  - GREEN: Create `src/components/content/repurpose-modal.tsx`:
    - Modal (or sheet) triggered from content library item actions menu
    - Shows original post content at top (read-only)
    - Mode selector — 3 buttons/tabs: "Shorter" | "Thread" | "Poll" with descriptions:
      - Shorter: "Condense into a shorter post"
      - Thread: "Split into a thread of posts"
      - Poll: "Convert into an engaging poll"
    - Optional: numVariations slider for 'shorter' mode (1-3)
    - Submit button — calls `repurposePost(contentId, mode, {numVariations})` (Task 18)
    - Loading state — "Repurposing..." with mode-specific message
    - On complete: show link to view new drafts in content library
  - REFACTOR: Use shadcn/ui Dialog/Sheet, RadioGroup/Tabs, Button components

  **Must NOT do**:
  - Must NOT show real-time AI generation progress — async via Inngest
  - Must NOT allow editing original content in repurpose modal
  - Must NOT add custom modes — exactly 3 fixed modes
  - Must NOT display repurposed content inline — redirect to content library

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Modal component with mode selection, loading states, and form interaction
  - **Skills**: [`playwright`]
    - `playwright`: Browser verification of modal behavior

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24, 26, 27, 28, 29)
  - **Blocks**: Task 30 (Navigation — repurpose accessible from content library)
  - **Blocked By**: Task 18 (repurposePost server action)

  **References**:

  **Pattern References**:
  - `src/components/` — Search for existing modal/dialog patterns. Use same animation and sizing.
  - `src/components/ui/dialog.tsx` or `sheet.tsx` — shadcn/ui modal primitives

  **API/Type References**:
  - `src/server/actions/repurpose.ts` (Task 18) — `repurposePost(contentId, mode, options)` server action
  - `src/lib/ai/types.ts` — `RepurposeMode = 'shorter' | 'thread' | 'poll'`

  **WHY Each Reference Matters**:
  - Existing modal patterns ensure visual and interaction consistency
  - RepurposeMode type constrains the UI options — must show exactly 3

  **Acceptance Criteria**:
  - [ ] File: `src/components/content/repurpose-modal.tsx`
  - [ ] Modal opens with original content displayed
  - [ ] 3 mode options rendered: Shorter, Thread, Poll
  - [ ] Submit calls repurposePost with correct mode
  - [ ] Loading state shown during submission
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Open repurpose modal and select mode
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user authenticated, content library has at least 1 item
    Steps:
      1. Navigate to `/dashboard/content` (or content library page)
      2. Find a content item's action menu (three-dot or similar)
      3. Click "Repurpose" action
      4. Verify modal opens with original content visible
      5. Verify 3 mode options visible: "Shorter", "Thread", "Poll"
      6. Click "Thread" option
      7. Click submit
      8. Verify loading state appears
    Expected Result: Modal interaction works, mode selectable, form submits
    Failure Indicators: Modal doesn't open, missing mode options, submit fails
    Evidence: .sisyphus/evidence/task-25-repurpose-modal.png (screenshot)

  Scenario: Poll mode shows correct description
    Tool: Playwright (playwright skill)
    Preconditions: Repurpose modal open
    Steps:
      1. Click "Poll" mode option
      2. Verify description text: "Convert into an engaging poll" (or i18n equivalent)
      3. Verify numVariations slider is NOT shown (only for 'shorter')
    Expected Result: Mode-specific UI displayed correctly
    Failure Indicators: Wrong description, variations slider shown for poll
    Evidence: .sisyphus/evidence/task-25-poll-mode.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): add repurpose modal with shorter/thread/poll mode selection`
  - Files: `src/components/content/repurpose-modal.tsx`
  - Pre-commit: `bun test && bun build`

- [ ] 26. Quick-Capture Component + Ideas Flow

  **What to do**:
  - RED: Write component tests for: text input for quick idea capture, category/tag optional fields, submit creates content item with status 'idea', "Develop" button triggers developIdea action (Task 19).
  - GREEN:
    - Create `src/components/content/quick-capture.tsx`:
      - Compact form: textarea (2-3 lines) + optional category dropdown + optional tags input
      - Submit: calls `createContentItem({content: text, sourceType: 'idea', status: 'idea', category, tags})` from Task 14
      - After submit: clear form, show toast "Idea saved!", item appears in ideas list below
      - Inline ideas list: show last 5 ideas with "Develop" action button on each
    - Create `src/components/content/idea-card.tsx`:
      - Small card showing idea text preview + category + created date
      - "Develop" button — calls `developIdea(contentId)` (Task 19)
      - Loading state on develop button while AI processes
    - Wire quick-capture into dashboard home page (Task 31) and content library page (Task 27)
  - REFACTOR: Use existing toast/notification system, shadcn Card, Badge for tags

  **Must NOT do**:
  - Must NOT add rich text editing — plain textarea for ideas
  - Must NOT auto-develop ideas — user must explicitly click "Develop"
  - Must NOT show full AI-generated content in idea card — that's for the content library

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Two interactive components with form handling, optimistic UI, and action integration
  - **Skills**: [`playwright`]
    - `playwright`: Browser verification of quick-capture and develop flow

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24, 25, 27, 28, 29)
  - **Blocks**: Task 31 (Dashboard home — embeds quick-capture)
  - **Blocked By**: Task 19 (developIdea server action), Task 14 (content actions)

  **References**:

  **Pattern References**:
  - `src/components/` — Existing card/list patterns for consistent styling
  - `src/components/ui/textarea.tsx`, `card.tsx`, `badge.tsx`, `button.tsx` — shadcn components

  **API/Type References**:
  - `src/server/actions/content.ts` (Task 14) — `createContentItem()` for saving ideas
  - `src/server/actions/develop-idea.ts` (Task 19) — `developIdea()` for AI development
  - `src/server/db/schema/content-library.ts` (Task 1) — Content item shape with sourceType, status

  **WHY Each Reference Matters**:
  - Content actions (Task 14) define the exact function signature for saving ideas
  - Develop idea action (Task 19) is triggered by the "Develop" button
  - Schema shows what fields are available for display in idea cards

  **Acceptance Criteria**:
  - [ ] File: `src/components/content/quick-capture.tsx`
  - [ ] File: `src/components/content/idea-card.tsx`
  - [ ] Quick capture saves idea to content library
  - [ ] "Develop" button triggers developIdea action
  - [ ] Toast shown on save
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Capture a quick idea
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user authenticated
    Steps:
      1. Navigate to page containing quick-capture component
      2. Type "Сравнение стейкинга ETH vs SOL" into textarea
      3. Click submit/save button
      4. Wait for toast notification (timeout: 3s)
      5. Verify idea appears in the ideas list below
    Expected Result: Idea saved, toast shown, appears in list
    Failure Indicators: Form doesn't submit, no toast, idea not in list
    Evidence: .sisyphus/evidence/task-26-quick-capture.png (screenshot)

  Scenario: Develop idea triggers AI generation
    Tool: Playwright (playwright skill)
    Preconditions: At least 1 idea exists in the list
    Steps:
      1. Find idea card in the list
      2. Click "Develop" button on the idea card
      3. Verify button shows loading state (spinner or disabled)
      4. Wait for completion indication (timeout: 15s)
    Expected Result: Develop action triggered, loading state visible
    Failure Indicators: Button doesn't respond, no loading state, JavaScript error
    Evidence: .sisyphus/evidence/task-26-develop-idea.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): add quick-capture component and idea cards with develop action`
  - Files: `src/components/content/quick-capture.tsx`, `src/components/content/idea-card.tsx`
  - Pre-commit: `bun test && bun build`

- [ ] 27. Content Library Page Rebuild

  **What to do**:
  - RED: Write component tests for: status filter tabs (all/ideas/drafts/ready/published/archived), channel filter dropdown, content cards showing status badge + source type icon + actions menu, bulk actions (archive multiple).
  - GREEN: Rebuild `src/app/[locale]/(dashboard)/dashboard/posts/page.tsx` (or rename route to `/content`):
    - Page header: "Content Library" (i18n key)
    - Filter bar:
      - Status tabs: All | Ideas | Drafts | Ready | Published | Archived — uses `getContentByStatus` (Task 14)
      - Channel filter dropdown — uses `getContentByChannel` (Task 14)
      - Search input — filters by title/content text (existing functionality if present)
    - Content grid/list:
      - Each item shows: title (or first 50 chars of content), status badge (color-coded), source type icon (💡idea, 🔗external, 🔄repurposed, 🤖ai_generated, 📱telegram_import), created date, channel name
      - Action menu per item: Edit, Develop (if idea), Repurpose, Publish to Telegram, Archive
    - Empty states per tab: "No ideas yet — use Quick Capture above" / "No drafts — create from URL or develop an idea"
    - Create `src/components/content/content-card.tsx` — reusable content item card
    - Create `src/components/content/content-filters.tsx` — filter bar component
  - REFACTOR: Reuse existing pagination, search, and layout patterns from current content library page

  **Must NOT do**:
  - Must NOT delete content — only archive
  - Must NOT show cross-post specific fields (adapted content, platform target) in content library cards
  - Must NOT break existing content library URL if it differs from new route — add redirect if needed
  - Must NOT build inline editing — edit navigates to detail page

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Full page rebuild with filtering, grid layout, cards, and action menus
  - **Skills**: [`playwright`]
    - `playwright`: Browser verification of filtering, cards, and actions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24, 25, 26, 28, 29)
  - **Blocks**: Task 30 (Navigation restructure), Task 31 (Dashboard — links to content library)
  - **Blocked By**: Task 14 (content library server actions)

  **References**:

  **Pattern References**:
  - `src/app/[locale]/(dashboard)/dashboard/posts/page.tsx` — **Current page to rebuild.** Read for existing layout, data fetching, and component structure.
  - `src/components/` — Existing card/list components for consistent styling

  **API/Type References**:
  - `src/server/actions/content.ts` (Task 14) — `getContentByStatus()`, `getContentByChannel()`, `getDraftsAndIdeas()`
  - `src/server/db/schema/content-library.ts` (Task 1) — Content item shape with all new fields

  **UI References**:
  - `src/components/ui/tabs.tsx`, `badge.tsx`, `card.tsx`, `dropdown-menu.tsx` — shadcn components for filters and cards

  **WHY Each Reference Matters**:
  - Current posts page is being rebuilt — need to understand what exists and what to preserve
  - Content actions define the exact data fetching functions for each filter
  - Schema defines what fields are available for display

  **Acceptance Criteria**:
  - [ ] File: `src/app/[locale]/(dashboard)/dashboard/posts/page.tsx` (rebuilt) or new `/content` route
  - [ ] File: `src/components/content/content-card.tsx`
  - [ ] File: `src/components/content/content-filters.tsx`
  - [ ] Status filter tabs work (switching shows filtered content)
  - [ ] Channel filter works
  - [ ] Action menu items present: Edit, Develop, Repurpose, Publish, Archive
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Filter content by status
    Tool: Playwright (playwright skill)
    Preconditions: Dev server, user authenticated, content items with various statuses exist
    Steps:
      1. Navigate to content library page
      2. Verify "All" tab is selected by default, showing all content
      3. Click "Ideas" tab
      4. Verify only items with 💡 idea icon shown
      5. Click "Drafts" tab
      6. Verify only draft items shown
    Expected Result: Each tab shows correctly filtered content
    Failure Indicators: Wrong items shown, filter not applied, empty results when items exist
    Evidence: .sisyphus/evidence/task-27-status-filter.png (screenshot)

  Scenario: Content card shows source type and actions
    Tool: Playwright (playwright skill)
    Preconditions: Content library has at least 1 item
    Steps:
      1. Navigate to content library page
      2. Find a content card
      3. Verify it shows: title/preview, status badge, source type icon, date
      4. Open action menu (click three-dot or similar)
      5. Verify menu items: Edit, Repurpose, Publish to Telegram, Archive
    Expected Result: Card displays all fields, action menu has correct items
    Failure Indicators: Missing fields, incomplete action menu
    Evidence: .sisyphus/evidence/task-27-content-card.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): rebuild content library page with status filters, source type icons, and action menus`
  - Files: `src/app/[locale]/(dashboard)/dashboard/posts/page.tsx`, `src/components/content/content-card.tsx`, `src/components/content/content-filters.tsx`
  - Pre-commit: `bun test && bun build`

- [ ] 28. Telegram Publish UI

  **What to do**:
  - RED: Write component tests for: publish form showing content preview, channel selector, date/time picker for scheduling, "Publish Now" and "Schedule" buttons, confirmation dialog before publishing.
  - GREEN: Create `src/components/publish/telegram-publish-form.tsx`:
    - Content preview section — shows the content that will be published (read-only, with Telegram formatting preview)
    - Channel selector — dropdown of user's Telegram channels
    - Publish mode toggle:
      - "Publish Now" — immediate publish button
      - "Schedule" — shows date picker + time picker, then "Schedule" button
    - Confirmation dialog: "Are you sure you want to publish to {channelName}?" with Publish/Cancel buttons
    - Calls `publishToTelegram(contentId, channelId, scheduledAt?)` server action (Task 21)
    - Loading state during publish
    - Success: "Published!" or "Scheduled for {date}" message
  - Create `src/app/[locale]/(dashboard)/dashboard/publish/page.tsx` — standalone publish page (can also be opened from content library action menu)
  - REFACTOR: Use existing date picker component if available, otherwise install shadcn date-picker

  **Must NOT do**:
  - Must NOT allow editing content in publish form — edit should happen in content library
  - Must NOT allow scheduling in the past — validate client-side and server-side
  - Must NOT auto-select channel — user must explicitly choose
  - Must NOT add LinkedIn/Twitter as publish targets here — this is Telegram-only

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form with date picker, confirmation dialog, preview formatting, multiple interaction modes
  - **Skills**: [`playwright`]
    - `playwright`: Browser verification of form interactions and date picker

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24, 25, 26, 27, 29)
  - **Blocks**: Task 30 (Navigation restructure)
  - **Blocked By**: Task 21 (publishToTelegram server action + scheduling)

  **References**:

  **Pattern References**:
  - `src/app/[locale]/(dashboard)/dashboard/schedule/page.tsx` — Existing schedule page. Read for date/time picker usage and scheduling UI patterns.
  - `src/components/ui/calendar.tsx` or date picker — Existing date selection component

  **API/Type References**:
  - `src/server/actions/publish-telegram.ts` (Task 21) — `publishToTelegram(contentId, channelId, scheduledAt?)` server action

  **WHY Each Reference Matters**:
  - Existing schedule page shows how date/time selection is handled in this app
  - Server action defines the exact parameters the form must provide

  **Acceptance Criteria**:
  - [ ] File: `src/components/publish/telegram-publish-form.tsx`
  - [ ] File: `src/app/[locale]/(dashboard)/dashboard/publish/page.tsx`
  - [ ] Content preview rendered
  - [ ] Channel selector works
  - [ ] "Publish Now" triggers immediate publish
  - [ ] "Schedule" shows date/time picker and triggers scheduled publish
  - [ ] Confirmation dialog shown before publish
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Publish now with confirmation
    Tool: Playwright (playwright skill)
    Preconditions: Dev server, user authenticated, content item and channel available
    Steps:
      1. Navigate to publish page with contentId parameter
      2. Verify content preview displayed
      3. Select a Telegram channel from dropdown
      4. Click "Publish Now" button
      5. Verify confirmation dialog appears: "Are you sure you want to publish to {channel}?"
      6. Click "Publish" in dialog
      7. Verify loading state, then success message
    Expected Result: Confirmation shown, publish triggered, success feedback
    Failure Indicators: No confirmation, publish fails, no feedback
    Evidence: .sisyphus/evidence/task-28-publish-now.png (screenshot)

  Scenario: Schedule for future date
    Tool: Playwright (playwright skill)
    Preconditions: Dev server, user authenticated
    Steps:
      1. Navigate to publish page
      2. Select channel
      3. Toggle to "Schedule" mode
      4. Verify date/time picker appears
      5. Select a future date and time
      6. Click "Schedule" button
      7. Verify success message includes scheduled date
    Expected Result: Scheduled publish created, confirmation with date shown
    Failure Indicators: Date picker not shown, past date accepted, no schedule confirmation
    Evidence: .sisyphus/evidence/task-28-schedule.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): add Telegram publish page with immediate and scheduled modes`
  - Files: `src/components/publish/telegram-publish-form.tsx`, `src/app/[locale]/(dashboard)/dashboard/publish/page.tsx`
  - Pre-commit: `bun test && bun build`

- [ ] 29. Calendar Gap Detection + AI Suggestion UI

  **What to do**:
  - RED: Write component tests for: calendar view with gap highlighting (empty dates shown differently), "Get AI Suggestions" button, suggestion cards showing title + description + source type, "Accept" button on suggestion that creates content item.
  - GREEN:
    - Create `src/components/calendar/calendar-gaps.tsx`:
      - Extends or wraps existing calendar component (check `src/components/` for existing calendar)
      - Highlights dates without content in a different color (e.g., light red or dashed border)
      - Shows count of gaps in date range: "3 gaps in the next 7 days"
      - "Get AI Suggestions" button — calls `requestCalendarSuggestions()` (Task 23)
    - Create `src/components/calendar/suggestion-card.tsx`:
      - Shows: suggested title, 1-sentence description, source type badge (idea/repurpose/external), confidence score
      - "Accept" button — creates content_library item from suggestion with status 'idea'
      - "Dismiss" button — removes suggestion from view
    - Wire into existing calendar/schedule page: `src/app/[locale]/(dashboard)/dashboard/schedule/page.tsx`
  - REFACTOR: Reuse existing calendar component, add gap overlay rather than building from scratch

  **Must NOT do**:
  - Must NOT auto-accept suggestions — user must approve each one
  - Must NOT modify existing calendar navigation/view switching
  - Must NOT show suggestions for dates that already have content
  - Must NOT allow suggesting more than 7 days into the future by default

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Calendar overlay component, suggestion cards, interactive accept/dismiss flow
  - **Skills**: [`playwright`]
    - `playwright`: Browser verification of calendar gaps and suggestion interactions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24, 25, 26, 27, 28)
  - **Blocks**: Task 31 (Dashboard home — shows upcoming gaps summary)
  - **Blocked By**: Task 23 (suggestCalendarFill server action + Inngest job)

  **References**:

  **Pattern References**:
  - `src/app/[locale]/(dashboard)/dashboard/schedule/page.tsx` — **Existing calendar page.** Read for current calendar component usage, layout.
  - `src/components/` — Search for existing calendar component (likely uses a library like react-day-picker or similar)

  **API/Type References**:
  - `src/server/actions/calendar.ts` (Task 23) — `requestCalendarSuggestions()` and `getCalendarSuggestions()`
  - `src/lib/ai/types.ts` — `CalendarFillSuggestion` interface for suggestion card display
  - `src/server/actions/content.ts` (Task 14) — `createContentItem()` for accepting suggestions

  **WHY Each Reference Matters**:
  - Existing calendar page/component is being extended — must understand current structure
  - CalendarFillSuggestion type defines what fields the suggestion card displays
  - Content actions create the item when user accepts a suggestion

  **Acceptance Criteria**:
  - [ ] File: `src/components/calendar/calendar-gaps.tsx`
  - [ ] File: `src/components/calendar/suggestion-card.tsx`
  - [ ] Calendar shows gap highlighting on empty dates
  - [ ] "Get AI Suggestions" triggers requestCalendarSuggestions
  - [ ] Suggestion cards display with Accept/Dismiss actions
  - [ ] Accept creates content item
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: View calendar with highlighted gaps
    Tool: Playwright (playwright skill)
    Preconditions: Dev server, user authenticated, some dates have content, some don't
    Steps:
      1. Navigate to schedule/calendar page
      2. Verify dates with content show normal styling
      3. Verify dates without content show gap highlighting (different background/border)
      4. Verify "3 gaps in the next 7 days" (or similar) count shown
    Expected Result: Visual distinction between content dates and gap dates
    Failure Indicators: No visual difference, wrong gap count
    Evidence: .sisyphus/evidence/task-29-calendar-gaps.png (screenshot)

  Scenario: Accept AI suggestion creates content item
    Tool: Playwright (playwright skill)
    Preconditions: AI suggestions available (mocked or previously requested)
    Steps:
      1. View suggestion cards below calendar
      2. Find a suggestion card with title and description
      3. Click "Accept" button
      4. Verify suggestion card updates (e.g., shows ✓ or disappears)
      5. Navigate to content library
      6. Verify new idea item exists with the suggestion's title
    Expected Result: Accepted suggestion becomes idea in content library
    Failure Indicators: Accept doesn't work, no content item created, suggestion still showing
    Evidence: .sisyphus/evidence/task-29-accept-suggestion.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(ui): add calendar gap highlighting and AI suggestion cards with accept/dismiss`
  - Files: `src/components/calendar/calendar-gaps.tsx`, `src/components/calendar/suggestion-card.tsx`, `src/app/[locale]/(dashboard)/dashboard/schedule/page.tsx`
  - Pre-commit: `bun test && bun build`

- [ ] 30. Navigation Restructure

  **What to do**:
  - RED: Write tests verifying new navigation order and grouping: "Create" section first (Create from URL, Quick Capture), "Content" section (Content Library, Calendar), "Publish" section (Telegram Publish), "Cross-post" section (existing LinkedIn/Twitter), "Analytics", "Settings/Billing".
  - GREEN: Modify `src/components/layout/sidebar.tsx`:
    - New navigation structure (content-creation-first):
      ```
      📝 Create
        └─ From URL (/dashboard/create)
      📚 Content Library (/dashboard/posts or /content)
      📅 Calendar (/dashboard/schedule)
      📤 Channels (/dashboard/channels)
      ─── (separator) ───
      🔄 Cross-post (/dashboard/crosspost) — existing, de-emphasized
      📊 Analytics (/dashboard/analytics)
      💳 Billing (/dashboard/billing)
      ⚙️ Settings (/dashboard/settings)
      ```
    - De-emphasize cross-posting: move below separator, use muted text/icon style
    - Add icons for new items (use Lucide icons consistent with existing)
    - Mobile navigation: update `src/components/layout/` mobile nav if separate
    - Highlight active page in sidebar
  - REFACTOR: Keep all existing navigation items — just reorder and add new ones

  **Must NOT do**:
  - Must NOT remove any existing navigation items — de-emphasize, don't delete
  - Must NOT change route paths for existing pages — only add new routes
  - Must NOT break mobile navigation
  - Must NOT add nested collapsible menus — flat structure with visual grouping

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Sidebar restructure affects every page's layout, needs consistent styling
  - **Skills**: [`playwright`]
    - `playwright`: Verify navigation on desktop and mobile viewports

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 31, 32, 33, 34, 35, 36)
  - **Blocks**: Task 31 (Dashboard home — navigation context)
  - **Blocked By**: Tasks 24-29 (all new pages must exist for navigation to link to)

  **References**:

  **Pattern References**:
  - `src/components/layout/sidebar.tsx` — **The file being modified.** Read current navigation structure, icon usage, active state logic.
  - `src/components/layout/` — Check for mobile nav, header, or other layout components that reference nav items.

  **WHY Each Reference Matters**:
  - Sidebar is the ONLY file defining navigation — must understand its current structure completely
  - Mobile nav may be separate or inline — must update both

  **Acceptance Criteria**:
  - [ ] File: `src/components/layout/sidebar.tsx` (modified)
  - [ ] New items: "Create from URL", "Content Library", "Calendar" visible and linked
  - [ ] Cross-post section visually de-emphasized (below separator, muted style)
  - [ ] All existing nav items still present and functional
  - [ ] Mobile navigation updated to match
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Desktop navigation shows new structure
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user authenticated
    Steps:
      1. Navigate to `/dashboard`
      2. Verify sidebar visible with new order
      3. Verify "Create" section appears near top
      4. Verify "Content Library" and "Calendar" links present
      5. Verify "Cross-post" appears below separator with muted styling
      6. Click each new nav item — verify correct page loads
    Expected Result: New navigation structure with correct ordering and links
    Failure Indicators: Missing items, wrong order, broken links, cross-post not de-emphasized
    Evidence: .sisyphus/evidence/task-30-desktop-nav.png (screenshot)

  Scenario: Mobile navigation updated
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, viewport set to 375x812 (mobile)
    Steps:
      1. Navigate to `/dashboard` on mobile viewport
      2. Open mobile navigation (hamburger menu or similar)
      3. Verify new items present in mobile nav
      4. Verify all links work on mobile
    Expected Result: Mobile nav matches desktop structure
    Failure Indicators: Missing items on mobile, layout broken on small screen
    Evidence: .sisyphus/evidence/task-30-mobile-nav.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(nav): restructure sidebar navigation to content-creation-first layout`
  - Files: `src/components/layout/sidebar.tsx`, potentially mobile nav files
  - Pre-commit: `bun test && bun build`

- [ ] 31. Dashboard Home Rebuild

  **What to do**:
  - RED: Write component tests for: quick-capture widget at top, content stats (ideas count, drafts count, published this week), upcoming schedule preview (next 3 scheduled posts), calendar gaps summary ("3 gaps in next 7 days"), recent activity feed.
  - GREEN: Rebuild `src/app/[locale]/(dashboard)/dashboard/page.tsx`:
    - Layout (top to bottom):
      1. **Quick Capture** — embed `quick-capture.tsx` (Task 26) at top for instant idea capture
      2. **Content Stats** — cards showing: Ideas (count), Drafts (count), Published This Week (count), AI Generations Used (count/limit)
      3. **Upcoming Schedule** — next 3 scheduled posts with date, channel, content preview. "View Calendar" link.
      4. **Calendar Gaps Alert** — if gaps detected: "You have 3 content gaps in the next 7 days. [Get Suggestions]" banner
      5. **Recent Activity** — last 5 actions (created, published, repurposed). Keep existing activity feed if present.
    - Data fetching: use `getDraftsAndIdeas()` (Task 14), `getCalendarSuggestions()` (Task 23), existing stats queries
    - Responsive: stack vertically on mobile, 2-column on desktop for stats
  - REFACTOR: Preserve any existing dashboard widgets that are still relevant (activity feed, channel stats)

  **Must NOT do**:
  - Must NOT remove existing cross-post stats — keep but de-emphasize
  - Must NOT add real-time updates — static data, refresh on navigation
  - Must NOT overcrowd — max 5 sections

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Full dashboard page with multiple widget sections, responsive layout, data integration
  - **Skills**: [`playwright`]
    - `playwright`: Browser verification of dashboard layout and widget rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 30, 32, 33, 34, 35, 36)
  - **Blocks**: None (final consumer page)
  - **Blocked By**: Task 26 (Quick-capture component), Task 29 (Calendar gaps), Task 30 (Navigation)

  **References**:

  **Pattern References**:
  - `src/app/[locale]/(dashboard)/dashboard/page.tsx` — **Current dashboard page.** Read to understand existing widgets, data fetching, layout.
  - `src/components/content/quick-capture.tsx` (Task 26) — Widget to embed at top

  **API/Type References**:
  - `src/server/actions/content.ts` (Task 14) — `getDraftsAndIdeas()` for content stats
  - `src/server/actions/calendar.ts` (Task 23) — `getCalendarSuggestions()` for gap alerts

  **WHY Each Reference Matters**:
  - Current dashboard page defines what exists — rebuild must preserve useful widgets
  - Quick-capture and calendar gaps are key differentiators embedded in the dashboard

  **Acceptance Criteria**:
  - [ ] File: `src/app/[locale]/(dashboard)/dashboard/page.tsx` (rebuilt)
  - [ ] Quick-capture widget at top
  - [ ] Content stats cards (ideas, drafts, published, AI usage)
  - [ ] Upcoming schedule preview
  - [ ] Calendar gaps alert (if gaps exist)
  - [ ] Responsive layout (desktop + mobile)
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Dashboard shows all sections
    Tool: Playwright (playwright skill)
    Preconditions: Dev server, user authenticated, some content and schedules exist
    Steps:
      1. Navigate to `/dashboard`
      2. Verify quick-capture textarea visible at top
      3. Verify content stats cards visible (Ideas, Drafts, Published, AI Usage)
      4. Verify upcoming schedule section with next posts
      5. Verify calendar gaps alert (if gaps exist)
    Expected Result: All 4-5 dashboard sections rendered correctly
    Failure Indicators: Missing sections, layout broken, data not loading
    Evidence: .sisyphus/evidence/task-31-dashboard.png (screenshot)

  Scenario: Dashboard responsive on mobile
    Tool: Playwright (playwright skill)
    Preconditions: Dev server, viewport 375x812
    Steps:
      1. Navigate to `/dashboard` on mobile
      2. Verify all sections stack vertically
      3. Verify no horizontal overflow
      4. Verify quick-capture is usable on mobile
    Expected Result: Clean mobile layout with all sections accessible
    Failure Indicators: Horizontal scroll, overlapping elements, cut-off text
    Evidence: .sisyphus/evidence/task-31-dashboard-mobile.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(dashboard): rebuild home with quick-capture, content stats, and calendar gaps alert`
  - Files: `src/app/[locale]/(dashboard)/dashboard/page.tsx`
  - Pre-commit: `bun test && bun build`

- [ ] 32. Enhanced Telegram Analytics Backend

  **What to do**:
  - RED: Write tests for: `getChannelGrowthRate(channelId, dateRange)` — calculates subscriber growth rate over time. `getBestPostingTimes(channelId)` — analyzes published post performance by time-of-day/day-of-week. `getContentPerformance(channelId, dateRange)` — aggregates views, reactions, forwards per post. Test with empty data. Test date range filtering.
  - GREEN: Create `src/lib/analytics/telegram-enhanced.ts`:
    - `getChannelGrowthRate(channelId: string, dateRange: {start: string, end: string}): Promise<{rate: number, trend: 'up' | 'down' | 'stable', dataPoints: {date: string, subscribers: number}[]}>` — queries analytics data, calculates daily growth rate
    - `getBestPostingTimes(channelId: string): Promise<{bestHours: number[], bestDays: string[], heatmap: {hour: number, day: string, avgViews: number}[]}>` — analyzes post performance by time
    - `getContentPerformance(channelId: string, dateRange: {start: string, end: string}): Promise<{posts: PostPerformance[], topPost: PostPerformance, avgViews: number, avgReactions: number}>` — per-post metrics
    - Create server actions in `src/server/actions/analytics-telegram.ts` for each function
  - REFACTOR: Build on existing analytics infrastructure in `src/lib/analytics/`

  **Must NOT do**:
  - Must NOT replace existing cross-platform analytics — extend with Telegram-specific views
  - Must NOT make real Telegram API calls in analytics — use stored data from `collectTelegramAnalytics` Inngest job
  - Must NOT expose per-user subscriber data (privacy)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Data aggregation logic with date math, but no AI or complex architecture
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 30, 31, 33, 34, 35, 36)
  - **Blocks**: Task 33 (Telegram analytics UI)
  - **Blocked By**: None (uses existing analytics data)

  **References**:

  **Pattern References**:
  - `src/lib/analytics/` — **Existing analytics module.** Read for data query patterns, aggregation helpers, and existing metrics structure.
  - `src/lib/inngest/functions/` — `collectTelegramAnalytics` job that stores the raw data this module queries

  **API/Type References**:
  - `src/server/db/schema/` — Analytics-related tables (look for analytics, metrics, or stats tables)
  - `src/server/actions/` — Existing analytics server actions for pattern

  **WHY Each Reference Matters**:
  - Existing analytics module defines query patterns and data structures to extend
  - collectTelegramAnalytics job shows what data is available in the DB

  **Acceptance Criteria**:
  - [ ] File: `src/lib/analytics/telegram-enhanced.ts`
  - [ ] File: `src/server/actions/analytics-telegram.ts`
  - [ ] Test file: `src/lib/analytics/__tests__/telegram-enhanced.test.ts`
  - [ ] `bun test` for test file → PASS (≥6 tests)
  - [ ] Growth rate, best posting times, content performance all functional
  - [ ] Handles empty data gracefully (returns defaults, not errors)
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Calculate channel growth rate
    Tool: Bash
    Preconditions: Analytics data mocked with subscriber counts over 7 days
    Steps:
      1. Run test: `bun test src/lib/analytics/__tests__/telegram-enhanced.test.ts -t "growth rate"` — passes
      2. Verify rate calculated correctly (e.g., 100→110 subscribers = 10% growth)
      3. Verify trend is 'up' for positive growth
      4. Verify dataPoints array has correct dates and values
    Expected Result: Accurate growth rate with trend direction
    Failure Indicators: Wrong calculation, missing data points, wrong trend
    Evidence: .sisyphus/evidence/task-32-growth-rate.txt

  Scenario: Handle channel with no analytics data
    Tool: Bash
    Preconditions: Empty analytics for channel
    Steps:
      1. Run test: `bun test src/lib/analytics/__tests__/telegram-enhanced.test.ts -t "empty"` — passes
      2. Verify returns default values (rate: 0, trend: 'stable', empty arrays)
      3. Verify no errors thrown
    Expected Result: Graceful defaults for missing data
    Failure Indicators: Thrown error, division by zero
    Evidence: .sisyphus/evidence/task-32-empty-data.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(analytics): add enhanced Telegram analytics with growth rate, best times, content performance`
  - Files: `src/lib/analytics/telegram-enhanced.ts`, `src/server/actions/analytics-telegram.ts`, tests
  - Pre-commit: `bun test && bun build`

- [ ] 33. Enhanced Telegram Analytics UI

  **What to do**:
  - RED: Write component tests for: growth rate chart (line graph), best posting times heatmap, content performance table with sorting, date range selector.
  - GREEN: Rebuild or extend `src/app/[locale]/(dashboard)/dashboard/analytics/page.tsx`:
    - Add "Telegram" tab/section (alongside existing platform analytics if any)
    - Components:
      - `src/components/analytics/growth-chart.tsx` — line chart showing subscriber growth over time. Use a lightweight chart library (recharts if already installed, or simple SVG)
      - `src/components/analytics/posting-heatmap.tsx` — 7x24 grid (days × hours) showing best posting times by color intensity
      - `src/components/analytics/content-performance-table.tsx` — sortable table: Post title, Views, Reactions, Forwards, Date
    - Date range selector at top (Last 7 days / 30 days / 90 days)
    - Data fetched from `getChannelGrowthRate`, `getBestPostingTimes`, `getContentPerformance` (Task 32)
  - REFACTOR: Check if recharts or similar is already in package.json. If not, use simple CSS/SVG charts or add recharts.

  **Must NOT do**:
  - Must NOT add real-time live updates — data refreshes on page load
  - Must NOT add export to CSV/PDF — future feature
  - Must NOT replace existing LinkedIn/Twitter analytics — add alongside

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Data visualization with charts, heatmap, and sortable table — heavy UI work
  - **Skills**: [`playwright`]
    - `playwright`: Browser verification of chart rendering and interactions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 30, 31, 32, 34, 35, 36)
  - **Blocks**: None (final consumer page)
  - **Blocked By**: Task 32 (Telegram analytics backend)

  **References**:

  **Pattern References**:
  - `src/app/[locale]/(dashboard)/dashboard/analytics/page.tsx` — **Existing analytics page.** Read for layout, data fetching, and chart component usage.
  - `src/components/analytics/` — Check for existing chart components

  **API/Type References**:
  - `src/server/actions/analytics-telegram.ts` (Task 32) — Server actions providing data

  **WHY Each Reference Matters**:
  - Existing analytics page defines chart library choice and layout patterns
  - Task 32 actions are the exact data sources for each visualization

  **Acceptance Criteria**:
  - [ ] File: `src/components/analytics/growth-chart.tsx`
  - [ ] File: `src/components/analytics/posting-heatmap.tsx`
  - [ ] File: `src/components/analytics/content-performance-table.tsx`
  - [ ] Analytics page shows Telegram section with 3 visualizations
  - [ ] Date range selector filters data
  - [ ] Table sortable by columns
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: View Telegram analytics dashboard
    Tool: Playwright (playwright skill)
    Preconditions: Dev server, user authenticated, some analytics data exists
    Steps:
      1. Navigate to `/dashboard/analytics`
      2. Find Telegram analytics section/tab
      3. Verify growth chart renders (SVG/canvas element present)
      4. Verify posting heatmap renders (grid visible)
      5. Verify content performance table has rows
      6. Change date range to "Last 30 days"
      7. Verify data updates
    Expected Result: All 3 visualizations render with data, date range works
    Failure Indicators: Missing charts, empty table, date range doesn't update data
    Evidence: .sisyphus/evidence/task-33-analytics-page.png (screenshot)

  Scenario: Sort content performance table
    Tool: Playwright (playwright skill)
    Preconditions: Performance table visible with multiple rows
    Steps:
      1. Click "Views" column header
      2. Verify table sorts by views descending
      3. Click "Views" again
      4. Verify table sorts by views ascending
    Expected Result: Column sorting works with visual indicator
    Failure Indicators: No sorting, wrong sort order, no sort indicator
    Evidence: .sisyphus/evidence/task-33-table-sort.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(ui): add Telegram analytics page with growth chart, posting heatmap, and performance table`
  - Files: `src/components/analytics/growth-chart.tsx`, `src/components/analytics/posting-heatmap.tsx`, `src/components/analytics/content-performance-table.tsx`, analytics page
  - Pre-commit: `bun test && bun build`

- [ ] 34. Billing UI Update

  **What to do**:
  - RED: Write component tests for: plan comparison cards showing "AI Generations" instead of "Cross-posts" as primary metric, usage meter showing AI generations used/limit, upgrade prompts when nearing AI quota.
  - GREEN: Modify `src/app/[locale]/(dashboard)/dashboard/billing/page.tsx`:
    - Update plan comparison cards:
      - Primary metric: "AI Generations" (not "Cross-posts")
      - Free: 10 AI generations/month
      - Plus: 100 AI generations/month
      - Pro: Unlimited AI generations
      - Secondary metric (smaller): "Cross-posts" kept but de-emphasized
    - Update usage display:
      - Primary bar: AI generations used / limit (e.g., "7 / 10 AI generations this month")
      - Secondary bar (collapsed/smaller): Cross-posts used / limit
    - Add upgrade prompt component: shown when usage > 80% of limit — "Running low on AI generations. Upgrade to Plus for 100/month."
    - Create `src/components/billing/usage-meter.tsx` — reusable progress bar with label + count
    - Create `src/components/billing/upgrade-prompt.tsx` — banner component for quota warnings
  - REFACTOR: Update existing billing components rather than rewriting — change labels and emphasis

  **Must NOT do**:
  - Must NOT change Stripe integration or pricing logic — just UI labels and emphasis
  - Must NOT remove cross-post metrics — de-emphasize
  - Must NOT hardcode plan names — use existing plan definitions from `billing/plans.ts`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Billing page UI with usage meters, plan cards, and prompt banners
  - **Skills**: [`playwright`]
    - `playwright`: Verify billing page displays correct metrics

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 30, 31, 32, 33, 35, 36)
  - **Blocks**: Task 36 (i18n — billing strings)
  - **Blocked By**: Task 4 (AI quota enforcement — provides usage data)

  **References**:

  **Pattern References**:
  - `src/app/[locale]/(dashboard)/dashboard/billing/page.tsx` — **Current billing page.** Read for plan card layout, usage display, Stripe integration.
  - `src/components/billing/` — Existing billing components if any

  **API/Type References**:
  - `src/lib/billing/plans.ts` — Plan definitions: Free/Plus/Pro with `aiCallsPerMonth` limits
  - `src/lib/billing/ai-quota.ts` (Task 4) — `getAiUsage(userId)` for current usage
  - `src/lib/billing/usage.ts` — Existing usage tracking queries

  **WHY Each Reference Matters**:
  - Current billing page defines what's being modified — must preserve Stripe integration
  - Plan definitions are the source of truth for limits — don't hardcode
  - AI quota functions (Task 4) provide the usage data the meter displays

  **Acceptance Criteria**:
  - [ ] File: `src/app/[locale]/(dashboard)/dashboard/billing/page.tsx` (modified)
  - [ ] File: `src/components/billing/usage-meter.tsx`
  - [ ] File: `src/components/billing/upgrade-prompt.tsx`
  - [ ] AI Generations shown as primary metric in plan cards
  - [ ] Usage meter shows AI generations count/limit
  - [ ] Upgrade prompt shown when usage > 80%
  - [ ] Cross-post metrics still present but de-emphasized
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Billing page shows AI-first metrics
    Tool: Playwright (playwright skill)
    Preconditions: Dev server, user authenticated with Free plan
    Steps:
      1. Navigate to `/dashboard/billing`
      2. Verify plan cards show "AI Generations" prominently
      3. Verify Free plan shows "10 AI generations/month"
      4. Verify usage meter shows current AI generation count
      5. Verify cross-post metrics visible but smaller/muted
    Expected Result: AI generations are the primary billing metric
    Failure Indicators: Cross-posts still primary, AI generations not shown, wrong limits
    Evidence: .sisyphus/evidence/task-34-billing-page.png (screenshot)

  Scenario: Upgrade prompt appears at high usage
    Tool: Playwright (playwright skill)
    Preconditions: User with 9/10 AI generations used (> 80%)
    Steps:
      1. Navigate to `/dashboard/billing`
      2. Verify upgrade prompt banner visible
      3. Verify text mentions upgrading for more AI generations
    Expected Result: Upgrade prompt visible with actionable message
    Failure Indicators: No prompt at high usage, prompt at low usage
    Evidence: .sisyphus/evidence/task-34-upgrade-prompt.png (screenshot)
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(billing): update billing UI to AI-generation-first metrics with usage meters`
  - Files: `src/app/[locale]/(dashboard)/dashboard/billing/page.tsx`, `src/components/billing/usage-meter.tsx`, `src/components/billing/upgrade-prompt.tsx`
  - Pre-commit: `bun test && bun build`

- [ ] 35. Billing Plan Definitions + Feature Text Update

  **What to do**:
  - RED: Write tests verifying: plan feature lists prioritize AI/content features, `aiCallsPerMonth` limits are correct per plan, plan descriptions mention "content creation" not "cross-posting", existing Stripe price IDs unchanged.
  - GREEN: Modify `src/lib/billing/plans.ts`:
    - Update plan feature lists (the text shown on pricing page):
      - Free: "10 AI content generations/month", "Create from URL", "Quick ideas capture", "1 Telegram channel", "Basic analytics" — de-emphasize "5 cross-posts"
      - Plus: "100 AI generations/month", "Repurpose content", "Calendar AI suggestions", "5 channels", "Enhanced analytics" — de-emphasize "50 cross-posts"
      - Pro: "Unlimited AI generations", "Priority AI models", "Unlimited channels", "Advanced analytics", "Team features (coming soon)" — de-emphasize "Unlimited cross-posts"
    - Keep `aiCallsPerMonth` values as-is (already correct: 10/100/unlimited)
    - Keep Stripe price IDs unchanged — billing logic untouched
    - Update plan `description` fields if they reference "cross-posting" as primary value
  - REFACTOR: Only change text/labels, not pricing logic or Stripe integration

  **Must NOT do**:
  - Must NOT change Stripe price IDs or product IDs
  - Must NOT change actual limits (10/100/unlimited)
  - Must NOT remove cross-post features from plans — keep as secondary items
  - Must NOT modify checkout flow or webhook handlers

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Text/label changes in a single file, no logic changes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 30, 31, 32, 33, 34, 36)
  - **Blocks**: Task 36 (i18n — billing feature text may need translation)
  - **Blocked By**: Task 4 (AI quota — confirms aiCallsPerMonth values)

  **References**:

  **Pattern References**:
  - `src/lib/billing/plans.ts` — **The file being modified.** Read current plan definitions, feature lists, and descriptions.

  **WHY Each Reference Matters**:
  - This IS the file — just changing text labels and feature emphasis order

  **Acceptance Criteria**:
  - [ ] File: `src/lib/billing/plans.ts` (modified)
  - [ ] Test file: `src/lib/billing/__tests__/plans.test.ts` (new or extended)
  - [ ] AI generation features listed first in each plan
  - [ ] Cross-post features still present but listed after AI features
  - [ ] Stripe price IDs unchanged
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: Plan features prioritize AI content creation
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run test: `bun test src/lib/billing/__tests__/plans.test.ts` — passes
      2. Verify Free plan features[0] mentions "AI" or "generation"
      3. Verify Plus plan features[0] mentions "AI" or "generation"
      4. Verify Pro plan features[0] mentions "AI" or "generation"
      5. Verify all plans still include cross-post feature somewhere in list
    Expected Result: AI features first, cross-post features present but secondary
    Failure Indicators: Cross-post still first, AI features missing
    Evidence: .sisyphus/evidence/task-35-plan-features.txt

  Scenario: Stripe price IDs unchanged
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run test verifying price IDs match original values
      2. Verify no new Stripe product/price IDs introduced
    Expected Result: Billing infrastructure completely unchanged
    Failure Indicators: Changed price IDs (would break existing subscriptions!)
    Evidence: .sisyphus/evidence/task-35-stripe-ids.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(billing): update plan feature text to AI-generation-first messaging`
  - Files: `src/lib/billing/plans.ts`, `src/lib/billing/__tests__/plans.test.ts`
  - Pre-commit: `bun test && bun build`

- [ ] 36. i18n Message Updates (en + ru)

  **What to do**:
  - RED: Write tests verifying: all new i18n keys exist in both `en.json` and `ru.json`, no missing keys between locales, all new pages use `useTranslations()` not hardcoded strings.
  - GREEN: Update `src/messages/en.json` and `src/messages/ru.json`:
    - Add new namespace keys for all new features:
      - `dashboard.create.title`: "Create from URL" / "Создать из URL"
      - `dashboard.create.placeholder`: "Paste YouTube or article URL..." / "Вставьте ссылку на YouTube или статью..."
      - `dashboard.create.submit`: "Extract & Generate" / "Извлечь и создать"
      - `dashboard.create.processing`: "Extracting content..." / "Извлекаем контент..."
      - `content.status.idea`: "Idea" / "Идея"
      - `content.status.draft`: "Draft" / "Черновик"
      - `content.status.ready`: "Ready" / "Готово"
      - `content.status.published`: "Published" / "Опубликовано"
      - `content.status.archived`: "Archived" / "В архиве"
      - `content.repurpose.title`: "Repurpose Content" / "Переработать контент"
      - `content.repurpose.shorter`: "Shorter" / "Короче"
      - `content.repurpose.thread`: "Thread" / "Тред"
      - `content.repurpose.poll`: "Poll" / "Опрос"
      - `publish.title`: "Publish to Telegram" / "Опубликовать в Telegram"
      - `publish.now`: "Publish Now" / "Опубликовать сейчас"
      - `publish.schedule`: "Schedule" / "Запланировать"
      - `calendar.gaps`: "Content gaps" / "Пробелы в контенте"
      - `calendar.suggest`: "Get AI Suggestions" / "Получить предложения ИИ"
      - `billing.aiGenerations`: "AI Generations" / "ИИ-генерации"
      - `billing.upgradePrompt`: "Running low on AI generations" / "Генерации ИИ заканчиваются"
      - `nav.create`: "Create" / "Создать"
      - `nav.contentLibrary`: "Content Library" / "Библиотека контента"
      - (additional keys as needed for all new UI text)
    - Verify key parity: every key in en.json has a counterpart in ru.json
  - REFACTOR: Organize new keys under logical namespaces matching existing structure

  **Must NOT do**:
  - Must NOT modify existing i18n keys — add new ones only
  - Must NOT hardcode any user-facing strings in components — all must use `useTranslations()`
  - Must NOT translate technical terms inconsistently (e.g., "Telegram" stays "Telegram" in both locales)
  - Must NOT add keys without using them in components (dead keys)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON file updates with translation strings, no logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 30-35)
  - **Blocks**: None (final polishing task)
  - **Blocked By**: Tasks 24-35 (all UI tasks must be complete to know which keys are needed)

  **References**:

  **Pattern References**:
  - `src/messages/en.json` — **File being extended.** Read for existing key structure and naming conventions.
  - `src/messages/ru.json` — **File being extended.** Must match en.json key-for-key.

  **API/Type References**:
  - `src/i18n/` — next-intl configuration. Understand namespace structure.

  **WHY Each Reference Matters**:
  - Existing message files define naming conventions (camelCase, dot-separated namespaces) — new keys must match
  - Both files must have identical key sets — missing key → runtime error

  **Acceptance Criteria**:
  - [ ] File: `src/messages/en.json` (extended with ~30 new keys)
  - [ ] File: `src/messages/ru.json` (extended with ~30 new keys matching en.json)
  - [ ] Test file: `src/i18n/__tests__/message-parity.test.ts` (or similar)
  - [ ] `bun test` for message parity → PASS
  - [ ] Every key in en.json exists in ru.json and vice versa
  - [ ] No hardcoded strings in new UI components (grep check)
  - [ ] `bun build` → Exit code 0

  **QA Scenarios**:

  ```
  Scenario: All new i18n keys present in both locales
    Tool: Bash
    Preconditions: Both message files updated
    Steps:
      1. Run test: `bun test src/i18n/__tests__/message-parity.test.ts` — passes
      2. Parse en.json and ru.json, extract all keys recursively
      3. Verify every key in en.json exists in ru.json
      4. Verify every key in ru.json exists in en.json
    Expected Result: 100% key parity between locales
    Failure Indicators: Missing keys in either locale
    Evidence: .sisyphus/evidence/task-36-key-parity.txt

  Scenario: No hardcoded strings in new components
    Tool: Bash
    Preconditions: All new components created
    Steps:
      1. Grep new component files for common hardcoded patterns
      2. Search for: standalone English/Russian text strings not wrapped in `t()` or `useTranslations`
      3. Verify all user-visible text uses i18n functions
    Expected Result: Zero hardcoded user-facing strings
    Failure Indicators: Raw text strings found in JSX
    Evidence: .sisyphus/evidence/task-36-no-hardcoded.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(i18n): add en + ru translations for all new content OS features`
  - Files: `src/messages/en.json`, `src/messages/ru.json`, `src/i18n/__tests__/message-parity.test.ts`
  - Pre-commit: `bun test && bun build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `bun run tsc --noEmit` + `bun lint` + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify every new module has proper barrel exports.
      Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
      Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (create from URL → edit draft → publish to Telegram → verify in calendar). Test edge cases: invalid URLs, empty transcripts, quota exceeded, large content. Test that cross-posting still works end-to-end. Save to `.sisyphus/evidence/final-qa/`.
      Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | Cross-post Regression [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance: no platformEnum modification, no podcast support, no trending topics, no freestyle repurposing. Detect cross-task contamination. Flag unaccounted changes.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit             | Message                                                                                          | Files                                                                                         | Pre-commit              |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------- |
| 1    | After all W1 tasks | `feat(schema): extend content-library, generalize schedules, add external-sources table`         | schema/\*.ts, billing/ai-quota.ts, sources/url-parser.ts, ai/types.ts, telegram/client.ts     | `bun test && bun build` |
| 2    | After all W2 tasks | `feat(ai): add content generation engine, source extraction, and new prompt builders`            | lib/sources/_.ts, lib/ai/prompts/_.ts, lib/ai/generation-engine.ts, server/actions/content.ts | `bun test && bun build` |
| 3    | After all W3 tasks | `feat(backend): add Inngest pipelines for URL→draft, repurpose, Telegram publish, calendar fill` | lib/inngest/functions/_.ts, server/actions/_.ts                                               | `bun test && bun build` |
| 4    | After all W4 tasks | `feat(ui): add content creation pages, publish UI, calendar gap suggestions`                     | app/(dashboard)/**/\*.tsx, components/**/\*.tsx                                               | `bun test && bun build` |
| 5    | After all W5 tasks | `feat(dashboard): reshape navigation, rebuild home, update analytics and billing`                | components/layout/_.tsx, app/(dashboard)/\*\*/_.tsx, messages/\*.json                         | `bun test && bun build` |

---

## Success Criteria

### Verification Commands

```bash
bun test                    # Expected: All tests pass (100+ new tests)
bun build                   # Expected: Exit code 0, zero TypeScript errors
bun lint                    # Expected: Zero lint errors
bun test:e2e                # Expected: E2E tests pass (if Playwright tests added)
```

### Final Checklist

- [ ] All "Must Have" features present and functional
- [ ] All "Must NOT Have" constraints verified (no forbidden patterns)
- [ ] All tests pass (unit + integration)
- [ ] Build compiles cleanly
- [ ] Cross-posting regression test passes (existing LinkedIn/Twitter flows work)
- [ ] AI quota enforced on every AI operation
- [ ] Drizzle migrations generated for all schema changes
- [ ] i18n strings added for ru + en
- [ ] Evidence captured for every QA scenario
