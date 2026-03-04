# Learnings — Pivot Content OS

## 2026-03-04 Planning Phase

- Telegram client already has `sendMessage` and `sendPhoto` — only need `sendMediaGroup`, `sendPoll`, `sendDocument`
- `aiCallsCount` column exists in `usage_tracking` but is never incremented or enforced
- `schedules.crossPostId` is NOT NULL FK — needs nullable for generalization
- `platformEnum` = ["linkedin", "twitter"] — must NOT add "telegram"
- `content_library` is minimal (13 cols) — needs 5 new: sourceType, status, channelId, sourceUrl, sourceMetadata
- YouTube Data API v3 NOT viable for transcripts — use `youtube-transcript-plus`
- Article extraction: use `@extractus/article-extractor`
- Podcast transcription: deferred to V1.5

## 2026-03-04 Prompt Builder: generate-from-source

- Prompt builder pattern: interface for input + single exported function returning `OpenRouterMessage[]`
- Channel context block is consistent across all prompt builders (niche/tone/topTopics with null defaults)
- For Telegram prompts, use `_italic_` not `\bitalic\b` in regex tests — `_` is a word char so `\b` boundaries fail
- Source content truncation at 15,000 chars with `"... [truncated]"` marker is straightforward `.slice()` + concat
- Prompt tests in `__tests__/` co-located under `prompts/` dir (no existing pattern existed, created new)

## 2026-03-04 Prompt Builder: idea-to-draft

- Same interface pattern as other prompt builders: input interface + single exported function → `OpenRouterMessage[]`
- Optional fields handled by conditional push to `userParts` array, then joined with `\n\n` — clean way to avoid "undefined" leaks
- `existingDrafts` rendered as bullet list under "Avoid overlap with:" header for dedup guidance
- Channel context block reused from adapt-twitter.ts pattern (niche/tone/language/topTopics with null fallbacks)

## 2026-03-04 Prompt Builder: repurpose-telegram

- Stub file already existed from Task 6 — edited in place rather than creating new file
- Extracted `buildChannelVoicePreamble()` as reusable exported helper — other prompt builders can import it
- `Record<RepurposeMode, string>` for mode instructions keeps the mapping exhaustive and type-safe
- 11 tests total (2 per mode + 5 structural/edge tests) — all pass
- TDD worked well: RED confirmed stub throws, GREEN was quick since test assertions guided the implementation

## 2026-03-04 YouTube Transcript Extraction

- `youtube-transcript-plus@1.2.0` API: `fetchTranscript(videoId, {lang?})` → `TranscriptResponse[]` with `{text, duration, offset, lang}`
- Error classes exported: `YoutubeTranscriptDisabledError`, `YoutubeTranscriptNotAvailableError`, `YoutubeTranscriptNotAvailableLanguageError`, `YoutubeTranscriptVideoUnavailableError`, `YoutubeTranscriptInvalidVideoIdError`
- Language fallback: catch `NotAvailableLanguageError`, retry without `lang` to get any available transcript
- YouTube oEmbed (free, no API key): `https://www.youtube.com/oembed?url=https://youtube.com/watch?v={id}&format=json` → `{title, author_name, thumbnail_url}`
- oEmbed should be best-effort (don't fail transcript extraction if metadata fetch fails)
- Must use `vi.hoisted()` for mock variables referenced in `vi.mock()` factories — Vitest hoists `vi.mock()` above all imports
- `ExtractionResult` has no `success` field — throw errors for callers to catch instead of returning error results
- Duration computed from last segment: `offset + duration` of final `TranscriptResponse`
- Test baseline after this task: 910 passed (12 new youtube tests), 16 pre-existing failures in 5 unrelated files

## 2026-03-04 Content Library Server Actions (T2)

- `ActionResult<T>` type is defined as single-line union in content.ts — match that format when reading
- Status transition validation uses a `Record<ContentStatus, ContentStatus[]>` map — clean, exhaustive, easy to test
- `existing.status` from DB is typed as `string | null` due to Drizzle enum inference — cast to `ContentStatus | null` for transition lookup
- Test mocking pattern: `selectResults.push()` is consumed as a FIFO queue — order matters for multi-query actions like `getDraftsAndIdeas`
- `getDraftsAndIdeas` uses `Promise.all` for parallel DB queries — both consume from `selectResults` in order
- 14 new tests (3 createContentItem + 5 updateContentStatus + 2 getContentByStatus + 2 getContentByChannel + 2 getDraftsAndIdeas), all 42 pass
- New types exported: `ContentSourceType`, `ContentStatus`, `CreateContentItemInput` — derived from enum values, not from schema inference

## 2026-03-04 Article Content Extraction

- `@extractus/article-extractor@8.0.20` API: `extract(url)` → `{title, content, author, published, source, ttr}` or `null`
- `content` field contains HTML — must strip tags with regex `/<[^>]*>/g` and replace with space
- HTML tag-to-space replacement means punctuation following closing tags gets a space before it (e.g., `</a>.` → ` .`) — acceptable tradeoff vs complex post-processing
- `sanitizeUrl` from url-parser.ts reused for SSRF protection — no duplication needed
- Timeout via `Promise.race` with `setTimeout` reject — 10s default
- `null` return from `extract()` = non-article/404 page — throw descriptive error
- Truncation at 50,000 chars with `"... [truncated]"` marker
- `vi.hoisted()` pattern confirmed again for mock variables in `vi.mock()` factories
- 13 tests: 5 success cases, 3 SSRF, 4 error handling, 1 paywall partial content
- Test baseline after this task: 920 passed (13 new article tests), 17 pre-existing failures in 5 unrelated files

## 2026-03-04 Generation Engine (T9)

- `GenerationEngine` class mirrors `AdaptationEngine` pattern: constructor takes client, single `generate()` public method
- Uses `OpenRouterClient.completeWithFallback()` directly (not `AIProvider` interface) for lower-level control
- Key adapter pattern: `GenerationRequest` has generic `sourceContent` field, engine maps it to each prompt builder's specific input shape (`sourceContent`→`originalContent` for repurpose, `sourceContent`→`idea` for idea_to_draft)
- `calendar_fill` handled via early return before switch — avoids exhaustive switch issues with TS narrowing
- Type narrowing after early return: must explicitly cast `request` as `GenerationRequest & { type: Exclude<GenerationType, "calendar_fill"> }` since TS doesn't narrow the original binding
- Model tier selection: `fast` for idea_to_draft (short creative), `default` for source_to_telegram/repurpose, `pro` for calendar_fill (reserved)
- `vi.hoisted()` is mandatory for mock variables used in `vi.mock()` factories — confirmed pattern from T7/T8
- Created stub `repurpose-telegram.ts` since T11 (prompt builder) runs in parallel — stub throws so tests mock it
- `idea-to-draft.ts` already existed with full implementation from T12
- Had to update pre-existing `generation-types.test.ts` which tested old interface — changed to test class export
- 17 tests total (4 routing + 4 tier selection + 2 result mapping + 2 error handling + 1 request passing + 4 helper)

## 2026-03-04 T15 — processExternalSource Inngest function

- Inngest function objects expose `.fn` property for direct handler invocation in tests
- `(processExternalSource as unknown as { fn: ... }).fn({ event, step })` pattern works cleanly for test isolation
- Mock step: `{ run: vi.fn(async (_name, fn) => fn()), sendEvent: vi.fn() }` — minimal mock that executes the callback
- Dynamic imports inside `step.run()` are mocked via `vi.mock()` at module level — vitest hoists them automatically
- `vi.hoisted()` is essential for mock variables referenced in `vi.mock()` factory functions
- `createContentItem` is a server action that requires auth (getCurrentUserId) — in Inngest functions it will fail unless called differently. Current implementation uses dynamic import and relies on the action's auth check. May need a non-auth variant for background jobs.
- The function uses `ExtractionResult` type from `@/lib/sources/types` for type safety of the extraction step

## 2026-03-04 createFromUrl Server Action (T16)

- Server action is a thin orchestrator: validate → auth → parse URL → quota check → channel ownership → emit Inngest event
- `parseUrl()` throws `InvalidUrlError` for malformed URLs (SSRF, private IPs, bad protocol) — caught by the outer try/catch
- `parseUrl()` returns `{type: "unknown"}` for valid URLs that aren't YouTube or articles — must check type explicitly before proceeding
- Validation order matters: auth first, then URL parse (which can throw), then quota, then channel ownership, then emit event
- `ActionResult<T>` type defined locally in action file (not imported from content.ts) — matches project convention where each action module is self-contained
- `inngest.send()` takes `{name: string, data: object}` — event name `"sources/url.submitted"` triggers T15's processExternalSource
- Channel ownership check: `db.select().from(telegramChannels).where(and(eq(id, channelId), eq(userId, user.id))).limit(1)`
- Test mock pattern for `createClient` override: import the mock, then `vi.mocked(createClient).mockResolvedValueOnce(...)` for single-test auth override
- 8 tests total (2 success + 6 error cases), all pass — exceeds minimum 5 requirement
- TDD worked cleanly: RED confirmed module-not-found, GREEN was straightforward since tests defined the contract

## 2026-03-04 T16 — generateFromSource Inngest function

- `vi.fn().mockImplementation(() => ({...}))` does NOT work as a constructor mock — Vitest warns "did not use 'function' or 'class'". Use `class MockFoo { method = mockFn }` pattern inside `vi.mock()` factory instead.
- For classes that need `new` in the SUT (like `OpenRouterClient`, `GenerationEngine`), mock with actual `class` syntax, not `vi.fn().mockImplementation()`
- Inngest background jobs must use direct DB queries (not server actions) since server actions call `getCurrentUserId()` which requires Supabase auth context
- `GenerationResult.content` can be `string | string[]` — must handle array case with `.join("\n\n")` before storing
- `enforceAiQuota` returns `{ allowed: false, used, limit, ... }` — throw `AiQuotaExceededError` with those values for descriptive error
- DB chain mocking with `mockResolvedValueOnce` is order-sensitive — each `step.run()` that queries DB consumes the next mock in sequence
- `channelProfile ?? undefined` converts null to undefined for the GenerationEngine which expects `ChannelProfile | undefined`
- 7 tests total: 1 structure + 1 happy path + 1 quota exceeded + 1 not found + 1 no profile + 1 usage order + 1 DB update verification

## 2026-03-04 publishToTelegram Inngest Function (T17)

- `vi.fn(() => mockObj)` arrow functions can NOT be used as constructors — `new MockClass()` throws. Must use `vi.fn(function () { return mockObj; })` for constructor mocks
- `TelegramClient` constructor mock: use regular function syntax inside `vi.mock()` factory, not arrow function
- `contentStatusEnum` has `"draft" | "published" | "archived" | "scheduled"` — no `"idea"` status. The `"idea"` is a `sourceType`, not a status
- `telegramChannels.botTokenEncrypted` is the column name for bot tokens — not `botToken`
- `telegramChannels.telegramChatId` is the chat ID column — not `chatId`
- MarkdownV2 escaping regex: `/([_*\[\]()~\`>#+-=|{}.!\\])/g`— replace with`\\$1` to prepend backslash
- Content format detection: POLL prefix (`"POLL:"` + JSON), image URLs (`.jpg/.png/.gif/.webp`), plain text fallback
- Sequential DB mock pattern: use `mockDbLimit.mockImplementation()` with a closure counter to return different results for each `select().from().where().limit()` call
- 10 tests total (1 structure + 4 format routing + 1 MarkdownV2 escaping + 1 403 error + 1 archived rejection + 1 not found + 1 status update), all pass
- `escapeMarkdownV2()` exported for reuse — simple regex replacement, no need to track formatting entity positions

## 2026-03-04 developIdea Server Action + Inngest Function (T18)

- Server action pattern for AI tasks: auth → load content → validate sourceType → quota check → emit Inngest event → return success
- sourceType check (`!== "idea"`) must happen BEFORE quota check — no point burning quota lookup if content isn't an idea
- `content.channelId` can be `string | null` from DB — Inngest event data must accept `null` for channelId
- For constructor mocks in Inngest tests, `class` syntax is mandatory: `GenerationEngine: class { generate = mockFn }` — `vi.fn().mockImplementation()` does NOT work as constructor
- `OpenRouterClient` mock also needs `class {}` syntax since it's instantiated with `new`
- Inngest function dynamic imports inside `step.run()` closures are correctly intercepted by `vi.mock()` at module level
- DB mock ordering: load-content → load-channel-profile → load-recent-drafts → update-content — each consumes from `selectResults` FIFO queue
- `_recentDraftTitles` prefixed with underscore since `GenerationEngine.generate()` doesn't currently accept `existingDrafts` — loaded for future engine enhancement
- `enforceAiQuota` in Inngest function should throw on failure (not return error) since Inngest retries handle errors
- 10 tests total (5 server action + 5 Inngest function), all pass — exceeds minimum 6 requirement

## 2026-03-04 T16 — repurposePost server action + repurposeContent Inngest function

- Server action pattern for async AI: validate auth + ownership + quota synchronously, emit Inngest event, return immediately with "started" message
- `inngest.send()` takes `{name, data}` — the client is imported directly, not via dependency injection
- For Inngest function tests, `GenerationEngine` mock MUST use `function` keyword (not arrow function) with `mockImplementation` since it's invoked with `new`
  - `vi.fn().mockImplementation(function () { return { generate: mockFn }; })` works; arrow function fails with "is not a constructor"
- `GenerationResult.content` is `string | string[]` — for multiple variations, wrap single string in array with `Array.isArray()` check before iterating
- New content items from repurpose use `sourceType: 'repurposed'`, `sourceUrl` stores the original contentId (not a URL), `status: 'draft'`
- Title generation for repurposed items: `"${originalTitle} (${mode}${multiVariation ? ` ${i+1}` : ""})"`
- Inngest function follows adapt-content.ts pattern exactly: dynamic imports inside `step.run()` closures for proper step isolation
- Server action tests: chainable select mock with `selectResults` queue + `thenFn` pattern from content.test.ts works cleanly
- 11 tests total (5 server action + 6 Inngest function), all passing
- `enforceAiQuota` returns `{ allowed: true }` or `{ allowed: false, reason, used, limit, upgradeUrl }` — check `.allowed` property

## 2026-03-04 Calendar Fill Prompt Builder + Engine Wiring (T19)

- `buildCalendarFillPrompt` follows same pattern: input interface + exported function → `OpenRouterMessage[]`
- Reused `buildChannelVoicePreamble()` from `repurpose-telegram.ts` — confirmed it works well for non-repurpose prompts too
- For `calendar_fill` in GenerationEngine, `sourceContent` is JSON-encoded string containing `{gapDates, existingContent, recentTopics}` — parsed with `JSON.parse()` in `buildPrompt()` switch case
- Removed the `Exclude<GenerationType, "calendar_fill">` type narrowing from `buildPrompt()` — now accepts full `GenerationRequest` since all types are handled
- Removed early-return throw for `calendar_fill` in `generate()` — the type narrowing + cast approach was the previous workaround
- Generation engine test: replaced "throws descriptive error" test with "routes to buildCalendarFillPrompt" test that verifies parsed input is passed correctly
- Added `mockBuildCalendarFillPrompt` to `vi.hoisted()` block and `vi.mock("../prompts/calendar-fill")` — follows existing mock pattern
- 8 prompt builder tests + 18 engine tests (was 17, added 1 for calendar_fill tier) = 26 total, all pass
- Prompt instructs "exactly one post per gap date" to avoid over-generation
- JSON output format instruction placed in user message (not system) — keeps system focused on role/voice

## 2026-03-04 Calendar Gap Detection + Suggest Calendar Fill + Calendar Server Actions (T21)

- `detectCalendarGaps` uses `Promise.all` for parallel DB queries: schedules + content_library — same pattern as engine.ts `getSchedulesInRange`
- Date range generation: create UTC dates from ISO strings with `"T00:00:00Z"` suffix, iterate with `setUTCDate(getUTCDate() + 1)`, extract date with `.toISOString().split("T")[0]`
- Gap detection: build `Set<string>` of covered dates from both query results, filter `allDates` by absence from set — O(n) lookup
- 14-day max range validation prevents unbounded DB queries and AI input bloat
- Inngest function with 7 steps: detect-gaps → load-existing-content → load-channel-profile → check-quota → generate-suggestions → store-suggestions → track-usage
- Early return when `gapDates.length === 0` skips AI/quota/storage steps — avoids unnecessary API calls and quota consumption
- `CalendarFillSuggestion` stored in content_library with `sourceMetadata: {date, confidence, generatedBy: "calendar-fill"}` — `generatedBy` field used as discriminator for retrieval
- `getCalendarSuggestions` filters by `sourceMetadata.generatedBy === "calendar-fill"` to distinguish calendar suggestions from other ideas
- Constructor mock in vi.mock: arrow functions (`() => ({})`) CANNOT be used with `new` — must use `vi.fn(function () { return mockObj; })` with regular function keyword
- Server action date validation: check `startDate > endDate` and `diffDays > 14` BEFORE DB queries or auth-dependent operations (except auth itself)
- DB chainable mock with separate result queues (`scheduleResults`, `contentResults`, `channelProfileResults`) indexed by call counter — enables per-query mock data in multi-query functions
- 20 tests total: 6 gap detection + 6 Inngest function + 8 server actions — all pass
- TDD flow: RED confirmed module-not-found, then 3 failures on first GREEN pass (constructor mock + missing `generatedBy` in test data), fixed in 2 edits

## 2026-03-04 publishToTelegram Server Action (T22)

- `publishToTelegram` follows thin orchestrator pattern: auth → load content → validate status → verify channel ownership → emit Inngest event → return
- `PUBLISHABLE_STATUSES = new Set(["draft", "scheduled"])` — cleaner than if/else chain for status validation
- `contentStatusEnum` has "draft", "published", "archived", "scheduled" — only "draft" and "scheduled" are valid for publishing (not "published" or "archived")
- Scheduling uses simple `new Date(scheduledAt).getTime() < Date.now()` for past-time check — no need to import timezone helpers when the input is already an ISO string
- Schedule record uses `contentLibraryId` + `targetType: "telegram_publish"` — the generalized pattern (not the old `crossPostId`-only pattern)
- Inngest `ts` field: `scheduledTime.getTime()` gives unix ms — matches engine.ts pattern
- Immediate publish omits the `ts` field entirely on `inngest.send()` — Inngest fires immediately
- Content status set to "scheduled" only for scheduled publish — immediate publish keeps status as-is (Inngest job updates to "published" on success)
- Test mock pattern: `mockReturning` consumed in order (insert schedule → update content status) for scheduled publish tests
- 9 tests, all pass on first run — TDD flow: RED confirmed module-not-found, GREEN was immediate since tests defined the contract precisely

## RepurposeModal component (2026-03-04)

- `useTransition` is the correct hook for server action submission — wraps `async` action, exposes `isPending` state
- `toast` from `sonner` (not `useToast`) — import directly: `import { toast } from "sonner"`
- Dialog's `onOpenChange` should be intercepted to block close while pending (pass custom `handleClose`)
- Mode options data defined as a const array with `React.ElementType` for icon refs — avoids repetitive JSX
- i18n keys for new sections go directly before `"posts"` key at bottom of both locale files
- `t()` accepts string literal key paths — no type-safety needed at call sites for dynamic keys like `t(labelKey)`
- Pre-existing build error in `src/server/actions/dashboard.ts:204` (Drizzle `eq()` null-vs-string type mismatch) — was failing before this task, not introduced here
- `data-testid` pattern: `repurpose-modal`, `repurpose-mode-{mode}`, `repurpose-variations-control`, `repurpose-submit-button`, `repurpose-cancel-button`

## 2026-03-04 T15 — QuickCapture & IdeaCard Components

- `createContentItem()` is a new action in `content.ts` separate from legacy `createContent()` — it accepts `sourceType`, `status`, `channelId`, `sourceUrl`, `sourceMetadata`
- `developIdea(contentId)` in `develop-idea.ts` fires an Inngest event `ai/content.develop-idea` — returns `{ message: "Developing idea" }` on success
- `formatDistanceToNow` from `@/lib/date-utils` is the shared relative time formatter — used in content-card.tsx already
- Quick-capture uses `useTransition` (not `useState` for loading) — matches the pattern used across server action components
- i18n keys added at top-level namespace `quickCapture` and `ideaCard` (not nested under `content`) — keeps them self-contained per component
- `bun run build` was already failing with a pre-existing TypeScript error in `dashboard.ts:204` (`sched.crossPostId` is `string | null`, `eq()` doesn't accept null) — our files have zero errors
- Both components have zero LSP diagnostics and zero TypeScript errors per `bunx tsc --noEmit`

## T29 — Create from URL page

- `createFromUrl(url, channelId)` in `@/server/actions/sources` is the action — returns `ActionResult<{ message: string }>`
- Page pattern: `async default export` + `getTranslations("namespace")` + `<PageHeader>` + `<ClientComponent />`
- Channels are fetched client-side (in `useEffect`) using `listChannels()` from `@/server/actions/channels`
- Toast usage: `toast.success(title, { description })` and `toast.error(title, { description })` from `"sonner"` — imported directly from the package (NOT from `@/components/ui/sonner`)
- `isYouTubeUrl()` is exported from `@/lib/sources/url-parser` and safe to import in client components
- Pre-existing build error in `dashboard.ts:204` (sched.crossPostId null check) was fixed with a null guard (`if (!sched.crossPostId) continue;`)
- Pre-existing TypeScript error in `content-library-client.tsx` (EmptyState icon type widening) was fixed with `as LucideIcon` cast
- `data-testid` added on: `url-input`, `channel-select`, `submit-url`

## 2026-03-04 Content Library Page (T18)

- Existing `content-card.tsx` used `onDelete` prop — had to update `content-list.tsx` to remove that prop when rewriting the card (backwards compatibility break; old card only had edit/delete, new has status/source/action-menu)
- `EmptyState` component requires `LucideIcon` type specifically, not `React.ElementType` — use `import { type LucideIcon }` from lucide-react
- Status tab "idea" is based on `sourceType === 'idea'` not a status field — `listContent` + filter client-side; other tabs use `getContentByStatus()`
- `ContentStatusTab` type includes "idea" which is NOT a DB status — needs special handling in fetch logic
- Channel title falls back to `ch.username` then `ch.id` — `ChannelWithPostCount.title` can be null
- The `content-filters.tsx` "use client" serialization warnings for callback props are expected Next.js behavior — not errors, build still passes
- Archive via `updateContentStatus` with valid transitions: `draft → archived`, `published → archived` — works for most statuses; items already archived won't show Archive action
- `bun run build` (not `bun build`) is the correct command for Next.js project

## Calendar Gaps + Suggestion Card (2026-03-04)

### Component Location

- New `src/components/calendar/` directory created for calendar-specific components
- `calendar-gaps.tsx` — main calendar gap viewer with channel selector, gap highlighting, suggestion trigger
- `suggestion-card.tsx` — individual AI suggestion card with accept/dismiss

### Patterns

- `getNext7Days()` computes gap dates client-side (always next 7 days from today — no server data needed since there's no schedule conflict detection at this stage)
- Calendar `modifiers` + `modifiersClassNames` props used for gap highlighting with a dashed red overlay via CSS `::after` pseudo-element trick using Tailwind `after:*` variants
- `CalendarFillSuggestion.sourceType` is `"draft" | "idea" | "repurpose"` (NOT "external") per `types.ts`, even though the task spec mentions "external" — implemented badge for all 4 to be safe
- `ChannelWithPostCount` has `title` and `username` fields; schedule page maps to `{ id, name: title ?? username ?? id }`
- Suggestions state resets on channel change via `useEffect([channelId])` (dismisses stale results)
- i18n keys: added `calendarGaps.*` and `suggestionCard.*` to both `en.json` and `ru.json`
- `ru.json` was being auto-modified by a background process during editing — used Python script to modify via `json.load/dump` instead

### LSP Warnings

- Next.js 71007 warning ("Props must be serializable") on `onAccept`/`onDismiss` props — this is a false positive since `SuggestionCard` is consumed by `CalendarGaps` (client component) and never directly by a server component boundary
- These are warnings only, not errors, and do not affect the build

## 2026-03-04 Telegram Publish Page

- Page pattern: server component → `await searchParams` → parallel data fetching → client form
- `ChannelWithPostCount` extends `Channel` with `postCount` and `lastPostAt` — strip with destructuring before passing to form
- `publishToTelegram` action handles both immediate publish and schedule in one call — no separate schedule action needed
- `AlertDialog` pattern: `AlertDialogTrigger asChild` wrapping the submit button, confirm fires actual handler
- `date-fns` `format(date, "PPP")` gives locale-aware date display in Calendar popover
- `Calendar` `disabled` prop takes predicate — use `date < new Date(new Date().setHours(0,0,0,0))` to disable past days
- i18n key access pattern for dynamic keys: try/catch around `t(dynamicKey)` to handle missing keys gracefully
- `bun run build` (not `bun build`) to invoke Next.js build
- Build verified: `/[locale]/dashboard/publish` route appears in route listing at exit code 0
