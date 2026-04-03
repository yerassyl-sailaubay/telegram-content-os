# Teleflow Onboarding Implementation Plan

## TL;DR

> **Objective**: Implement hybrid onboarding flow for new Teleflow users
>
> **Approach**: 3-step wizard (Driver.js modals) → persistent sidebar checklist → contextual spotlights
>
> **Deliverables**:
>
> - Driver.js integration with tour system
> - 3-step welcome wizard component
> - Persistent sidebar checklist widget
> - Onboarding state management (DB + localStorage hybrid)
> - 5 contextual Driver.js tours
> - Updated empty states with educational content
>
> **Estimated Effort**: Medium (6-8 tasks, ~2-3 days)
> **Parallel Execution**: YES — UI components and state management can be built in parallel
> **Critical Path**: Schema → State Hook → Wizard → Checklist → Tours

---

## Context

### Original Request

Design and implement an onboarding flow for Teleflow that guides new users through:

1. Connecting their Telegram channel
2. Seeing AI generate drafts from their channel history
3. Setting up the idea capture bot

### Research Findings

- **Hybrid approach** (quick wizard + progressive hints) has 60% lower abandonment than upfront marathons
- **Driver.js** is the recommended library (5kb, MIT, 390K weekly downloads)
- **Time-to-value target**: Under 5 minutes to first "wow" moment
- **Checklist sweet spot**: 5 items maximum

### User Decisions

| Decision           | Choice                                       |
| ------------------ | -------------------------------------------- |
| Onboarding style   | Hybrid (2-3 step wizard → progressive hints) |
| Mandatory steps    | Connect Telegram channel only                |
| First value moment | AI generates drafts from channel history     |
| Empty states       | Educational with clear CTAs                  |
| Technical approach | Driver.js library                            |
| Ongoing guidance   | Sidebar checklist + contextual hints         |

### Metis Gap Analysis

- State persistence strategy: **DB (user_preferences) + localStorage hybrid**
- Checklist auto-detection: Must detect real usage, not just wizard completion
- Mobile fallback: Driver.js spotlights don't work on mobile — needs modal fallback
- Scope boundaries: No email notifications, no analytics dashboard, no A/B testing

---

## Work Objectives

### Core Objective

Create a seamless onboarding experience that gets users to their "wow" moment (AI draft generation) within 5 minutes of first login.

### Concrete Deliverables

- `OnboardingWizard` component (3-step modal)
- `OnboardingChecklist` sidebar widget
- `useOnboarding` state management hook
- Driver.js tour configurations (5 tours)
- Updated empty state components with educational content
- Database schema for onboarding progress
- i18n translations for all onboarding copy

### Definition of Done

- [ ] New user sees wizard on first login
- [ ] Channel connection triggers wizard advancement
- [ ] AI draft generation shows in wizard step 3
- [ ] Sidebar checklist auto-updates as user completes actions
- [ ] Driver.js tours trigger on first feature visits
- [ ] All copy translated to en/ru
- [ ] E2E tests pass for complete flow

### Must Have

- Wizard with 3 steps (welcome → connect → AI preview)
- Persistent checklist in sidebar
- Driver.js integration with 5 tours
- Onboarding state persistence
- Mobile-friendly fallback

### Must NOT Have (Guardrails)

- Email notification system for incomplete steps
- Analytics dashboard for onboarding metrics
- A/B testing framework
- Video embeds or rich media
- "Restart onboarding" feature
- Team/invite flows during onboarding
- Role-based customization

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Vitest + Playwright)
- **Automated tests**: YES — include in plan
- **Framework**: Vitest for unit, Playwright for E2E

### QA Policy

Every task includes agent-executed QA scenarios:

- **Frontend/UI**: Playwright opens browser, navigates, asserts DOM, screenshots
- **Component logic**: Vitest unit tests
- **E2E flows**: Playwright authenticated flows

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — can start immediately):
├── Task 1: DB schema for onboarding_progress
├── Task 2: Install Driver.js + tour config system
└── Task 3: Create useOnboarding state hook

Wave 2 (UI Components — depends on Wave 1):
├── Task 4: Build 3-step OnboardingWizard
├── Task 5: Build OnboardingChecklist sidebar widget
└── Task 6: Update empty states with educational content

Wave 3 (Tours & Polish — depends on Wave 2):
├── Task 7: Implement 5 Driver.js tours
└── Task 8: i18n translations + mobile fallback

Wave FINAL (Testing):
├── Task E2E: Playwright tests for complete flow
└── Task Review: Cross-browser, mobile verification

Critical Path: Task 1 → Task 3 → Task 4 → Task 5 → Task 7 → E2E
```

### Dependency Matrix

- **Task 1**: — → Tasks 3, 4, 5
- **Task 3**: Task 1 → Tasks 4, 5
- **Task 4**: Task 3 → Task 7
- **Task 5**: Task 3 → Task 7
- **Task 7**: Tasks 4, 5 → FINAL
- **E2E**: All implementation → FINAL

---

## TODOs

- [x] 1. Database Schema — Onboarding Progress Table

  **What to do**:
  - Add `onboarding_progress` column to `user_preferences` table (JSONB)
  - Schema: `{ wizardCompleted: boolean, wizardStepReached: number, checklistItems: object, toursCompleted: string[], dismissedAt?: string }`
  - Create migration in `drizzle/`
  - Update schema types

  **Must NOT do**:
  - Create separate table (keep in user_preferences)
  - Add fields for analytics/time tracking

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - Pattern: `src/server/db/schema/user-preferences.ts`
  - Migration location: `drizzle/`
  - Related: User preferences already stores JSON data

  **Acceptance Criteria**:
  - [ ] Migration file created
  - [ ] `bun drizzle-kit migrate` runs successfully
  - [ ] TypeScript types updated
  - [ ] Test: Can insert/read onboarding state via Drizzle

  **QA Scenarios**:

  ```
  Scenario: Schema migration
    Tool: Bash
    Preconditions: Local dev DB running
    Steps:
      1. Run `bun drizzle-kit generate`
      2. Run `bun drizzle-kit migrate`
    Expected Result: Migration succeeds, new column exists
    Evidence: .sisyphus/evidence/task-1-migration.png
  ```

  **Commit**: YES
  - Message: `feat(onboarding): add onboarding_progress schema`
  - Files: `drizzle/0010_add_onboarding_progress.sql`, `src/server/db/schema/user-preferences.ts`

- [x] 2. Driver.js Integration — Tour Configuration System

  **What to do**:
  - Install `driver.js`: `bun add driver.js`
  - Create `src/lib/onboarding/tours/` directory
  - Create tour configuration types and base config
  - Create 5 tour definitions:
    1. `dashboard-intro` — Highlights "Create from URL" button
    2. `content-library-intro` — Highlights content library features
    3. `schedule-intro` — Highlights scheduling UI
    4. `analytics-intro` — Highlights analytics dashboard
    5. `ai-generation-intro` — Highlights AI generation features
  - Create `TourProvider` context component

  **Must NOT do**:
  - Tours longer than 5 steps each
  - Mandatory/non-dismissible tours
  - Tours that auto-start on every login

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - Driver.js docs: https://driverjs.com/
  - Pattern: `src/components/providers/` for context providers
  - Styling: Must match shadcn/ui theme (use CSS variables)

  **Acceptance Criteria**:
  - [ ] `bun add driver.js` succeeds
  - [ ] Tour config files created for all 5 tours
  - [ ] TourProvider wraps app in layout
  - [ ] Tour can be triggered programmatically
  - [ ] Tour is dismissible and remembers dismissal

  **QA Scenarios**:

  ```
  Scenario: Tour triggers and completes
    Tool: Playwright
    Preconditions: Logged in as new user
    Steps:
      1. Navigate to /dashboard
      2. Trigger dashboard-intro tour
      3. Click through all steps
      4. Refresh page
    Expected Result: Tour doesn't reappear (dismissal persisted)
    Evidence: .sisyphus/evidence/task-2-tour.mp4
  ```

  **Commit**: YES
  - Message: `feat(onboarding): add Driver.js integration and tour configs`
  - Files: `package.json`, `src/lib/onboarding/tours/`, `src/components/providers/tour-provider.tsx`

- [x] 3. useOnboarding Hook — State Management

  **What to do**:
  - Create `src/hooks/use-onboarding.ts`
  - Hybrid persistence: localStorage for wizard, DB for completion flags
  - Methods:
    - `startWizard()` — Opens wizard at step 1
    - `advanceWizard(step: number)` — Saves progress
    - `completeWizard()` — Marks wizard complete
    - `dismissWizard()` — Dismisses permanently
    - `getChecklistStatus()` — Returns checklist item states
    - `markTourCompleted(tourId: string)` — Records tour completion
    - `resetOnboarding()` — For testing only
  - Auto-sync checklist items from real user data

  **Must NOT do**:
  - Analytics/time tracking
  - Complex state machines (keep it simple)
  - Optimistic UI that doesn't match DB

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 1

  **References**:
  - Pattern: `src/hooks/` for custom hooks
  - Server actions: `src/server/actions/settings.ts` for user prefs
  - LocalStorage pattern: Standard React useEffect + window.localStorage

  **Acceptance Criteria**:
  - [ ] Hook returns correct wizard state
  - [ ] localStorage persists wizard progress
  - [ ] DB syncs completion flags
  - [ ] Checklist auto-detects from actual user data
  - [ ] Unit tests pass

  **QA Scenarios**:

  ```
  Scenario: Wizard state persistence
    Tool: Vitest
    Preconditions: Mock localStorage and DB
    Steps:
      1. Call startWizard()
      2. Call advanceWizard(2)
      3. Unmount and remount hook
    Expected Result: Hook returns step 2 from localStorage
    Evidence: .sisyphus/evidence/task-3-unit-test.log
  ```

  **Commit**: YES
  - Message: `feat(onboarding): add useOnboarding state hook`
  - Files: `src/hooks/use-onboarding.ts`, `src/hooks/__tests__/use-onboarding.test.ts`

- [x] 4. OnboardingWizard Component — 3-Step Modal

  **What to do**:
  - Create `src/components/onboarding/onboarding-wizard.tsx`
  - Step 1: Welcome — "Welcome to Teleflow" + CTA to connect channel
  - Step 2: Channel Connection — Reuse existing `ConnectChannelWizard` via embed or link
  - Step 3: AI Preview — Shows AI-generated drafts from their channel
  - Progress indicator (Step X of 3)
  - Skip/"Explore first" option on all steps
  - Auto-advances when channel connection completes

  **Must NOT do**:
  - Duplicate channel connection logic (reuse existing)
  - Block UI if user dismisses (allow exploration)
  - Show on every login (only first time or until complete)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 3)
  - **Blocks**: Task 7
  - **Blocked By**: Task 3

  **References**:
  - Existing: `src/components/channels/connect-channel-wizard.tsx`
  - Modal pattern: `src/components/ui/dialog.tsx` (shadcn)
  - Step pattern: Use shadcn Stepper or custom tabs

  **Acceptance Criteria**:
  - [ ] Wizard opens automatically on first login
  - [ ] Step 1 shows welcome copy
  - [ ] Step 2 integrates with existing channel wizard
  - [ ] Step 3 shows AI drafts after connection
  - [ ] Can skip/dismiss at any point
  - [ ] i18n strings for all copy

  **QA Scenarios**:

  ```
  Scenario: Complete wizard flow
    Tool: Playwright
    Preconditions: New user account, no channels
    Steps:
      1. Log in
      2. Assert wizard opens automatically
      3. Click "Connect Channel" on step 1
      4. Complete channel connection in step 2
      5. Assert step 3 shows AI drafts
    Expected Result: Wizard advances smoothly, step 3 shows content
    Evidence: .sisyphus/evidence/task-4-wizard.mp4
  ```

  **Commit**: YES
  - Message: `feat(onboarding): add 3-step OnboardingWizard component`
  - Files: `src/components/onboarding/onboarding-wizard.tsx`, `src/components/onboarding/__tests__/onboarding-wizard.test.tsx`

- [x] 5. OnboardingChecklist — Sidebar Widget

  **What to do**:
  - Create `src/components/onboarding/onboarding-checklist.tsx`
  - Sidebar widget showing 5 items:
    1. ✅ Connect Telegram channel
    2. ⬜ Capture your first idea
    3. ⬜ Generate AI draft
    4. ⬜ Schedule a post
    5. ⬜ View analytics
  - Auto-checks based on real data (channels, content, schedules, analytics views)
  - Progress bar showing completion %
  - Collapsible (chevron to collapse/expand)
  - Auto-collapses when all items checked
  - "Getting Started" link to re-expand if collapsed

  **Must NOT do**:
  - More than 5 items
  - Manual checkboxes (auto-detect only)
  - Progress percentage if it adds complexity

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 3)
  - **Blocks**: Task 7
  - **Blocked By**: Task 3

  **References**:
  - Sidebar location: `src/components/layout/sidebar.tsx`
  - Widget pattern: Card with collapsible content
  - Check pattern: shadcn Checkbox with auto-state

  **Acceptance Criteria**:
  - [ ] Widget renders in sidebar
  - [ ] Items auto-check as user completes actions
  - [ ] Collapse/expand works
  - [ ] Auto-collapses when complete
  - [ ] Mobile: Hidden or moved to different location

  **QA Scenarios**:

  ```
  Scenario: Checklist auto-updates
    Tool: Playwright
    Preconditions: User with connected channel
    Steps:
      1. Open dashboard
      2. Assert "Connect channel" is checked
      3. Create first content item
      4. Assert "Capture first idea" becomes checked
    Expected Result: Checklist reflects real user progress
    Evidence: .sisyphus/evidence/task-5-checklist.mp4
  ```

  **Commit**: YES
  - Message: `feat(onboarding): add sidebar OnboardingChecklist widget`
  - Files: `src/components/onboarding/onboarding-checklist.tsx`, `src/components/layout/sidebar.tsx` (integration)

- [x] 6. Empty States — Educational Content

  **What to do**:
  - Update empty state components with onboarding-specific copy:
    - Content Library empty state
    - Schedule empty state
    - Analytics empty state
  - Educational copy explains:
    - What goes here
    - Why it matters
    - Clear CTA to first action
  - Different copy if user is in onboarding vs post-onboarding
  - Link to relevant tour if applicable

  **Must NOT do**:
  - Demo data insertion
  - Complex conditional logic
  - Non-educational generic copy

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 3)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:
  - Empty state component: `src/components/ui/empty-state.tsx`
  - Usage: `src/components/content/`, `src/components/schedule/`
  - Copy pattern: `src/messages/en.json` under appropriate keys

  **Acceptance Criteria**:
  - [ ] Content Library empty state has onboarding copy
  - [ ] Schedule empty state has onboarding copy
  - [ ] Analytics empty state has onboarding copy
  - [ ] All CTAs link to relevant actions
  - [ ] i18n translations included

  **QA Scenarios**:

  ```
  Scenario: Empty state shows educational content
    Tool: Playwright
    Preconditions: New user, no content
    Steps:
      1. Navigate to Content Library
      2. Assert empty state shows "Your content library is empty"
      3. Assert CTA "Create your first draft" is visible
    Expected Result: Educational copy guides user to first action
    Evidence: .sisyphus/evidence/task-6-empty-state.png
  ```

  **Commit**: YES
  - Message: `feat(onboarding): update empty states with educational content`
  - Files: `src/components/content/content-empty.tsx`, `src/components/schedule/schedule-empty.tsx`, `src/messages/en.json`, `src/messages/ru.json`

- [x] 7. Driver.js Tours — 5 Contextual Tours

  **What to do**:
  - Implement 5 Driver.js tours:
    1. **Dashboard Intro** — Highlights: Create from URL, Recent Activity, Quick Stats
    2. **Content Library Intro** — Highlights: Filters, Create buttons, Content cards
    3. **Schedule Intro** — Highlights: Calendar view, Add schedule button
    4. **Analytics Intro** — Highlights: KPI cards, Charts, Date filters
    5. **AI Generation Intro** — Highlights: AI generate button, Voice selector
  - Tours trigger on first visit to each section
  - Mobile fallback: Simple modal instead of spotlight
  - Tours are dismissible and remember dismissal
  - Max 5 steps per tour

  **Must NOT do**:
  - Tours longer than 5 steps
  - Tours that block UI
  - Tours that auto-start without user action
  - Multiple tours simultaneously

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 2, 4, 5)
  - **Blocks**: FINAL
  - **Blocked By**: Tasks 2, 4, 5

  **References**:
  - Driver.js config: Task 2 output
  - Tour trigger: Use `useOnboarding` hook to check first visit
  - Mobile detection: `window.matchMedia('(pointer: coarse)')` or similar

  **Acceptance Criteria**:
  - [ ] All 5 tours can be triggered
  - [ ] Tours show correct spotlight positioning
  - [ ] Mobile shows modal fallback
  - [ ] Dismissal is persisted
  - [ ] Tours don't reappear after dismissal

  **QA Scenarios**:

  ```
  Scenario: Tour triggers on first visit
    Tool: Playwright
    Preconditions: New user, never visited Content Library
    Steps:
      1. Navigate to Content Library
      2. Assert Driver.js spotlight appears
      3. Complete or dismiss tour
      4. Refresh and navigate to Content Library again
    Expected Result: Tour doesn't reappear
    Evidence: .sisyphus/evidence/task-7-tours.mp4
  ```

  **Commit**: YES
  - Message: `feat(onboarding): implement 5 Driver.js contextual tours`
  - Files: `src/lib/onboarding/tours/*.ts`, `src/app/[locale]/(dashboard)/dashboard/*/page.tsx` (tour triggers)

- [ ] 8. i18n + Mobile Fallback

  **What to do**:
  - Add all onboarding strings to:
    - `src/messages/en.json` (English)
    - `src/messages/ru.json` (Russian)
  - Keys under `onboarding.wizard.*`, `onboarding.checklist.*`, `onboarding.tours.*`
  - Mobile fallback for Driver.js:
    - Detect touch device
    - Show simple modal instead of spotlight
    - Same content, different presentation
  - Test responsive behavior at 320px, 768px, 1024px

  **Must NOT do**:
  - Hardcoded strings anywhere
  - Driver.js on mobile (it doesn't work well)
  - Skip i18n for any copy

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 4, 5, 7)
  - **Blocks**: FINAL
  - **Blocked By**: Tasks 4, 5, 7

  **References**:
  - i18n pattern: `src/messages/en.json`, `useTranslations()` hook
  - Mobile detection: CSS media queries or JS `matchMedia`
  - Responsive pattern: Tailwind `md:`, `lg:` prefixes

  **Acceptance Criteria**:
  - [ ] All strings in en.json and ru.json
  - [ ] Russian translations provided
  - [ ] Mobile shows modal fallback, not spotlight
  - [ ] Layout responsive at all breakpoints
  - [ ] No layout overflow on small screens

  **QA Scenarios**:

  ```
  Scenario: Mobile fallback works
    Tool: Playwright (mobile viewport)
    Preconditions: New user on mobile
    Steps:
      1. Set viewport to 375x667 (iPhone)
      2. Navigate to dashboard
      3. Trigger any tour
    Expected Result: Shows modal, not Driver.js spotlight
    Evidence: .sisyphus/evidence/task-8-mobile.png
  ```

  **Commit**: YES
  - Message: `feat(onboarding): add i18n translations and mobile fallback`
  - Files: `src/messages/en.json`, `src/messages/ru.json`, `src/lib/onboarding/mobile-detection.ts`

- [ ] E2E. End-to-End Tests — Complete Flow

  **What to do**:
  - Create `e2e/onboarding.spec.ts`
  - Test scenarios:
    1. New user sees wizard on first login
    2. User can complete wizard (connect → AI preview)
    3. User can skip wizard
    4. Checklist updates as actions completed
    5. Tours trigger on first visits
    6. Dismissal is persisted
    7. Onboarding state survives logout/login
  - Use Playwright fixtures for test isolation

  **Must NOT do**:
  - Skip E2E coverage
  - Test implementation details (test behavior, not internals)
  - Use real API calls (mock where possible)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all implementation tasks)
  - **Blocks**: FINAL
  - **Blocked By**: Tasks 1-8

  **References**:
  - E2E pattern: `e2e/agent-prod-smoke.spec.ts`
  - Auth setup: `e2e/prod-auth.global-setup.ts`
  - Fixtures: `e2e/fixtures.ts`

  **Acceptance Criteria**:
  - [ ] All test scenarios pass
  - [ ] Tests run in CI (`bun test:e2e`)
  - [ ] Screenshots captured for key steps
  - [ ] No flaky tests

  **QA Scenarios**:

  ```
  Scenario: Complete onboarding E2E
    Tool: Playwright
    Preconditions: Fresh test user
    Steps:
      1. Sign up as new user
      2. Assert wizard appears
      3. Complete wizard
      4. Assert checklist shows completion
      5. Trigger and complete a tour
      6. Log out and back in
      7. Assert onboarding state persisted
    Expected Result: All assertions pass
    Evidence: .sisyphus/evidence/task-e2e-report.html
  ```

  **Commit**: YES
  - Message: `test(onboarding): add E2E tests for complete flow`
  - Files: `e2e/onboarding.spec.ts`, `e2e/fixtures.ts` (if needed)

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. Verify:
  - All "Must Have" are implemented
  - All "Must NOT Have" are absent
  - Evidence files exist in `.sisyphus/evidence/`
  - Output: `VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `bun lint`, `bunx tsc --noEmit`, `bun test`.
      Check for AI slop, unused imports, missing types.
      Output: Build/Lint/Test status

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ Playwright)
      Run E2E tests, verify screenshots, test on mobile viewport.
      Output: `Scenarios [N/N pass]`

- [ ] F4. **Scope Fidelity Check** — `deep`
      Compare deliverables against plan. No scope creep.
      Output: `Tasks [N/N compliant]`

---

## Commit Strategy

```
commit 1: feat(onboarding): add onboarding_progress schema
commit 2: feat(onboarding): add Driver.js integration and tour configs
commit 3: feat(onboarding): add useOnboarding state hook
commit 4: feat(onboarding): add 3-step OnboardingWizard component
commit 5: feat(onboarding): add sidebar OnboardingChecklist widget
commit 6: feat(onboarding): update empty states with educational content
commit 7: feat(onboarding): implement 5 Driver.js contextual tours
commit 8: feat(onboarding): add i18n translations and mobile fallback
commit 9: test(onboarding): add E2E tests for complete flow
```

---

## Success Criteria

### Verification Commands

```bash
bun test:e2e          # Expected: all onboarding tests pass
bun lint              # Expected: no errors
bunx tsc --noEmit     # Expected: no type errors
```

### Final Checklist

- [ ] New user sees wizard on first login
- [ ] Wizard advances through 3 steps
- [ ] Channel connection works (reuses existing flow)
- [ ] AI preview shows drafts
- [ ] Checklist visible in sidebar
- [ ] Checklist items auto-check
- [ ] Tours trigger on first visits
- [ ] Mobile fallback works
- [ ] All copy in en/ru
- [ ] E2E tests pass

---

**Plan saved to:** `.sisyphus/plans/onboarding-implementation.md`

**Draft cleaned up:** `.sisyphus/drafts/onboarding-design.md` (deleted)

**To begin execution, run:**
/start-work onboarding-implementation

This will:

1. Register the plan as your active boulder
2. Track progress across sessions
3. Enable automatic continuation if interrupted
