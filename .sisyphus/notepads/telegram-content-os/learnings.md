## Task 12: Telegram Message Parser — Learnings

### UTF-16 Offset Handling
- Telegram entity offsets use UTF-16 code units, and JavaScript's `.length` and `.slice()` also operate on UTF-16 code units. **They match directly** — no conversion needed for basic operations.
- The key insight: `string.slice(offset, offset + length)` works correctly with Telegram's UTF-16 offsets because JS strings ARE UTF-16 internally.
- Emoji like 💰, 🌍 use 2 UTF-16 code units (surrogate pairs). Cyrillic chars use 1 each. Both work correctly with direct offset usage.
- The only gotcha would be if using codepoint-based iteration (`for...of`, `Array.from`), which we don't need.

### Entity Parsing Architecture
- Separated entities into "structural" (blockquote, pre, text_link, mention, hashtag, url, etc.) and "formatting" (bold, italic, underline, etc.).
- Structural entities create their own ContentBlock; formatting entities become FormattingMark annotations on text blocks.
- For overlapping formatting, used a boundary-based approach: split text at all formatting boundaries, apply active marks per segment.
- Top-level structural entity filtering needed to avoid double-processing (e.g., mention inside blockquote).

### HTML XSS Prevention
- Must escape `<`, `>`, `&`, `"`, `'` in ALL user content before embedding in HTML.
- **Critical**: URL sanitization is separate from HTML escaping. Must block `javascript:`, `data:`, `vbscript:` protocols by replacing with `about:blank`.
- HTML escaping alone does NOT prevent `javascript:` in `href` attributes — the browser interprets the URL before applying HTML entity decoding.

### Testing Patterns
- Entity offset counting: be precise. `"const x = 1;"` is 12 chars, not 13. Easy to miscount.
- Use `makeMessage()` and `makeEntity()` helpers for test readability.
- Test every entity type individually, then in combination and with edge cases.
- Pre-existing test failures in `content.test.ts` (4 tests) — unrelated to this task, caused by missing DB mocks.

### Build Note
- `bun run build` fails at page data collection stage due to missing `DATABASE_URL` env var. TypeScript compilation succeeds. This is a pre-existing issue.

## Task 10: Media Library + Supabase Storage Integration

### Patterns Discovered
- **Server actions pattern**: Use `"use server"` directive, create authenticated helper `getAuthenticatedUser()` that returns both supabase client and user. Return `{success, data/error}` result types.
- **Supabase Storage SDK**: Use `supabase.storage.from(bucket).upload/remove/createSignedUrl`. Pass `SupabaseClient` type from `@supabase/supabase-js` for typed helpers.
- **Storage path convention**: `{userId}/{timestamp}-{sanitizedFilename}` prevents collisions.
- **Page pattern**: Server component page → Client wrapper for interactivity. Use `getTranslations` in server, `useTranslations` in client.
- **Loading skeleton**: Separate `loading.tsx` file at route level. Use `Skeleton` component from shadcn.
- **Test mocking**: Mock `@/lib/supabase/server`, `@/server/db`, and `drizzle-orm` at module level. Chained return values for Drizzle query builder pattern (`select().from().where().limit()`).
- **i18n**: Add namespaced keys to both `en.json` and `ru.json`. Use `{count}` for interpolation.

### Dependencies Added
- `react-dropzone@15.0.0` — drag-and-drop file upload
- `@radix-ui/react-progress` (via shadcn progress component)

### Architecture Decisions
- Storage helper (`src/lib/storage/client.ts`) is framework-agnostic, takes `SupabaseClient` as parameter
- Server actions (`src/server/actions/media.ts`) handle auth + DB + storage orchestration
- Media picker (`src/components/media-picker.tsx`) is reusable modal — accepts `onSelect(file, signedUrl)` callback
- Client components use `"use client"` directive; page is thin server component wrapper
- Signed URLs used for all media access (private bucket pattern)
- File validation happens in both storage helper (reusable) and server action (authoritative)

## Task 9: Content Library CRUD + Search + Categories

### Drizzle Mock Pattern for Tests
- **Thenable chains**: Drizzle query chains are thenable (awaitable). When mocking, `select()` chains need a `.then()` method on the returned chain object. Use a shared queue (`selectResults[]`) that shifts values on `.then()` calls.
- **Mutation chains**: `insert/update/delete` chains use `.returning()` — mock this as a standalone function with `mockResolvedValueOnce`.
- **vi.hoisted()**: All mock variables referenced inside `vi.mock()` factory functions MUST be declared via `vi.hoisted()` — otherwise `vi.mock` hoisting causes "Cannot access before initialization" errors.
- **importOriginal for drizzle-orm**: Schema files import `relations`, `pgTable` etc. from `drizzle-orm`. Mock must use `importOriginal()` to preserve these while overriding operators (`eq`, `and`, `ilike`, etc.).

### Full-Text Search with Postgres tsvector
- Used raw SQL via `sql` template tag: `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')) @@ to_tsquery('english', ...)`
- Search query transformation: split on whitespace, append `:*` for prefix matching, join with ` & ` for AND semantics.
- `ts_rank()` used for relevance-based ordering.

### Categories as Derived Data
- Categories are NOT a separate table — they're derived from `DISTINCT category` values in content_library.
- Rename = update all matching rows. Delete = set category to null on matching rows.
- Categories created "optimistically" in UI state for immediate use before first content with that category is saved.

### useRef in React 19 Strict Mode
- `React.useRef<T>()` without initial arg is a compile error in strict TS. Must pass `undefined` or `null` explicitly: `React.useRef<T | null>(null)`.

### Pre-existing Build Issue
- `src/lib/inngest/functions/scheduling/execute-scheduled-post.ts` has TS error (`db.query.schedules` — type `{}`) that predates this task. Build fails at TS check, not from content library changes.

### Architecture
- Server page fetches data, passes to client `ContentList` component
- Client component manages all interactivity (search, filter, sort, CRUD modals)
- URL search params used for filter state (shareable, back-button friendly)
- Debounced search input → URL param update → useEffect refresh

## Task 8: Telegram Bot Setup + Webhook Pipeline + Post Ingestion

### Lazy Dynamic Imports for Next.js API Routes
- Importing `@/server/db` at module top-level in API routes causes build failure — `DATABASE_URL` isn't available during static page generation.
- Solution: `async function getDb() { const { db } = await import("@/server/db"); return db; }` pattern.
- Same applies to `@/server/db/schema`, `@/lib/inngest/client`, and `drizzle-orm` — all need lazy imports in webhook route.
- Inngest function bodies also need lazy imports inside `step.run()` callbacks — top-level module imports get evaluated when the functions barrel is imported by the inngest API route.

### Telegram Webhook Best Practices
- Always return HTTP 200 to Telegram, even on application errors. Returning 4xx/5xx causes Telegram to retry, creating loops.
- `X-Telegram-Bot-Api-Secret-Token` header verification using `crypto.timingSafeEqual` for constant-time comparison.
- `crypto.timingSafeEqual` requires both buffers to be the same length — check length first before calling.
- Use `require("crypto")` with eslint disable comment since crypto module needs careful import handling in Next.js.

### Media Group Batching
- Telegram sends album posts as multiple separate messages with the same `media_group_id`.
- Used in-memory `Map<string, { timeout, post }>` with 1-second window — first message creates the record, subsequent messages append media to it.
- `setTimeout` triggers final DB update + Inngest event after the window closes.
- Trade-off: in-memory batching doesn't survive server restarts. Acceptable for MVP; production would use Redis or DB-based batching.

### Telegram Bot API Client Pattern
- No external SDK (telegraf/grammy) — pure `fetch` wrapper with typed responses.
- `withRetry()` function with exponential backoff for retryable status codes: 429 (rate limit), 500, 502, 503, 504.
- `getTelegramClient()` factory with singleton caching per bot token — prevents multiple instances.
- Custom `TelegramApiError` class extends `Error` with `statusCode` and `description` fields.

### Vitest Fake Timers + Rejected Promises
- Using `vi.useFakeTimers()` with `mockRejectedValue()` (not `Once`) in retry tests causes unhandled rejection warnings.
- Solution: use `mockImplementation(() => Promise.reject(...))` or switch to real timers with tiny delays for exhaustion tests.

### Pre-existing Issues Fixed
- Missing comma in `src/messages/en.json` and `ru.json` (line 121) — broke JSON parsing.
- `block.formatting` not null-safe in `src/lib/telegram/converters.ts` — added `?? []` fallback (4 occurrences).
- `React.useRef` without initial arg in `src/components/content/content-list.tsx` — React 19 strict mode requires explicit `null`.

### Build Stats After Task 8
- `bun run test` — 240 tests pass (9 test files), 0 failures
- `bun run build` — clean, 22 routes generated
- `npx tsc --noEmit` — zero type errors
- 6 new files created, 1 existing file modified, 3 pre-existing files fixed

## Channel Management (Task completed 2026-02-28)
- **No `Alert` component**: shadcn Alert is not installed — use custom `div` with destructive styling instead
- **No `Switch` component**: shadcn Switch is not installed — use `Button` with variant toggle as alternative
- **Telegram `getChat` test**: Bot access check for a channel works by catching the thrown `TelegramApiError` when bot isn't admin
- **Server action pattern for nested queries**: Use `Promise.all` for parallel queries; `sql<Date | null>` for max aggregates
- **Channel detail page**: Use `"use server"` inline function + `redirect()` for server-side disconnect action in Server Component
- **Test `selectResults` queue**: Each `db.select()` call consumes one entry from the queue — remember to push entries for ALL selects in a single action call (channel lookup + post stats + recent posts = 3 pushes)
- **Build fix**: Always check `ls src/components/ui/` before importing shadcn components; not all are installed

## Task 18: Twitter/X OAuth + Posting Integration

### OAuth 2.0 PKCE Flow
- Twitter uses OAuth 2.0 with PKCE (not OAuth 1.0a) for v2 API access.
- `code_verifier` (32 random bytes, base64url) + `code_challenge` (SHA-256 of verifier, base64url) is the PKCE pair.
- Store `code_verifier` and `state` in HTTP-only cookies during OAuth redirect; retrieve in callback.
- Token endpoint requires Basic auth header (`base64(client_id:client_secret)`) + `application/x-www-form-urlencoded` body.
- Twitter access tokens expire every 2 hours — must refresh proactively or on 401.

### Twitter API v2 Specifics
- Create tweet: `POST https://api.x.com/2/tweets` with `{ text: "..." }`.
- Reply: add `reply: { in_reply_to_tweet_id: "..." }` to body.
- Thread = sequence of replies: post first tweet, then reply to it, then reply to reply, etc.
- Media upload STILL uses v1.1: `POST https://upload.twitter.com/1.1/media/upload.json` with `media_data` (base64) in form body.
- User info: `GET https://api.x.com/2/users/me` with Bearer token.

### Rate Limit Tracking
- Free tier: 1,500 posts/month. Track in `usage_tracking` table (shared with AI calls tracking).
- Upsert pattern: try `UPDATE ... WHERE userId=X AND month=YYYY-MM`, if 0 rows affected, `INSERT`.
- `crossPostsCount` field in `usage_tracking` serves as the monthly counter.

### Parallel Task Coordination (Task 17 LinkedIn)
- Task 17 created `src/lib/platforms/types.ts` with shared types (`TokenPair`, `EncryptedTokenPair`, `PlatformConnection`, `PostResult`, `LinkedInApiError`).
- When adding Twitter types, APPEND to existing `types.ts` — don't overwrite LinkedIn types.
- Created `src/lib/platforms/index.ts` barrel export for both LinkedIn and Twitter.
- Created shared `src/lib/platforms/encryption.ts` (AES-256-GCM) usable by both platforms.

### Inngest Function Pattern
- Inngest function for platform posting NOT added to the functions barrel (`src/lib/inngest/functions/index.ts`) to avoid conflicts with parallel tasks. Created as standalone export.
- Each `step.run()` block does its own lazy imports — this is critical for avoiding build-time failures.
- 401 handling: catch error, refresh token, retry once within the same step.

### Testing Patterns
- Mock global `fetch` with `vi.stubGlobal("fetch", mockFetch)` for Twitter API tests.
- DB mock pattern: chain methods (`select().from().where().limit()`) with controllable return values via `mockLimit.mockReturnValueOnce()`.
- Retry tests with real timers (small `baseDelayMs: 1`) are more reliable than fake timers for this use case.
- Web Crypto (`crypto.subtle.digest`) is available in happy-dom test environment — no need to mock it.
- 40 new tests covering: PKCE, auth URL, token exchange, refresh, user info, tweet creation, replies, media, threads, rate limits, encryption, retry logic, error classes.

### Build Stats After Task 18
- `bun run test` — 370 tests pass (13 test files), 0 failures
- `bun run build` — clean, 26 routes (including `/api/auth/twitter` and `/api/auth/twitter/callback`)
- Zero TS diagnostics on all new files

## Task 15: AI Content Adaptation Engine

### Architecture
- `AdaptationEngine` class takes `AIProvider` (dependency injection) — easy to mock in tests.
- Pipeline: extract plain text → AI provider call → quality checks → Twitter threading.
- Pure utility functions exported separately for unit testing: `extractPlainText`, `isEnglish`, `fitsLengthLimit`, `hasHashtags`, `runQualityChecks`, `splitIntoThread`.

### Twitter Thread Splitting
- Split at sentence boundaries first (regex: `/[^.!?]*[.!?]\s?|[^.!?]+$/g`).
- If single sentence exceeds `maxLength`, fall back to word-boundary splitting.
- Thread numbering added as ` N/M` suffix (e.g., ` 1/3`).
- Default `maxLength=270` (reserves 10 chars for numbering within 280 limit).
- Content ≤ 280 chars → no splitting, returned as single-element array.

### Quality Checks
- `isEnglish()`: Counts Latin vs Cyrillic alpha chars. >90% Latin = English. Extended Latin (accented) counted as Latin.
- `fitsLengthLimit()`: LinkedIn ≤ 3000, Twitter ≤ 280.
- For Twitter threads, checks each tweet individually (not total content).
- `hasHashtags()`: Simple regex `/#\w+/`.
- Warnings array collects human-readable issues for UI display.

### Inngest Function Pattern (adapt-content)
- Event: `ai/content.adapt` with `{ postId, userId, platform, channelId?, modelTier? }`.
- Uses lazy imports pattern consistently (`await import(...)` inside `step.run()`).
- `contentParsed` from DB is `jsonb` — needs type assertion to `ParsedContent` shape.
- For inline type imports in runtime code: `import("@/lib/telegram/parser.types").ParsedContent` works for type position only.
- Cannot destructure types from dynamic `import()` — `const { ParsedContent } = await import(...)` fails because types are erased.
- Channel profile fetched from `channel_profiles` table if `channelId` available (from event data or post's `channelId`).
- Result stored in `cross_posts` with `status: "draft"` — user reviews before posting.

### Testing
- 45 tests covering: extractPlainText (8), isEnglish (6), fitsLengthLimit (4), hasHashtags (4), runQualityChecks (8), splitIntoThread (7), AdaptationEngine (8).
- Mock `AIProvider` via `vi.fn().mockResolvedValue()` — no actual API calls.
- `satisfies` keyword useful for type-checking mock return values against interface.

### Build Stats After Task 15
- `bun run test` — 430 tests pass (15 test files), 0 failures
- `bun run build` — clean, 26 routes
- Zero TS diagnostics on all new files


## Task 22: Stripe Billing Integration + Subscription Tiers

### Architecture
- **Billing module**: `src/lib/billing/` — 7 files (types, plans, stripe client, checkout, portal, webhook, barrel export).
- **Plan tiers**: Free ($0, default), Plus ($19/mo), Pro ($49/mo). Stripe Price IDs from env vars.
- **Stripe Checkout hosted page** — no custom payment forms. Monthly only in V1.
- **Dynamic imports in webhook handlers**: Each handler uses `const { db } = await import("@/server/db")` to avoid build-time DB connection.
- **Webhook dispatcher**: handles 4 event types (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed). Returns `{handled, eventType, error?}` — never throws.

### Stripe SDK v20 (API 2026-02-25.clover) Breaking Change
- **CRITICAL**: `current_period_end` and `current_period_start` moved from `Subscription` to `SubscriptionItem` level.
- Must read from `sub.items.data[0].current_period_end` instead of `sub.current_period_end`.
- `stripe.subscriptions.retrieve()` returns `Response<Subscription>` — access period dates via items.

### Mocking Stripe in Tests
- `vi.mock("stripe")` with a class-based mock, NOT `vi.fn().mockImplementation()`. The Stripe SDK uses `new Stripe()` constructor — arrow functions are not constructable.
- Correct pattern: `class StripeMock { checkout = {...}; constructor(_key, _opts) {} }` then `return { default: StripeMock }`.
- DB mocking for dynamic imports: `vi.mock("@/server/db")`, `vi.mock("@/server/db/schema")`, `vi.mock("drizzle-orm")` at module level works because vitest resolves these the same way as dynamic `import()` calls.

### UI Components
- `PricingCard`: shows plan features, current plan indicator, popular badge.
- `UsageMeter`: progress bar with warning/exceeded states, unlimited support.
- `BillingClient`: client component orchestrating pricing cards grid, usage meters, manage subscription button, checkout flow.
- Server page (`billing/page.tsx`) fetches subscription + usage data, renders `PageHeader + BillingClient`.

### i18n JSON Editing Lessons
- **ALWAYS validate JSON after editing** with `node -e "JSON.parse(fs.readFileSync(...))"`.
- When appending a new top-level namespace to JSON, ensure the previous closing brace gets a trailing comma.
- The `"nav"` key must stay as a nested object — never flatten it.

### Build Stats After Task 22
- `bun run test` — 524 tests pass (18 test files), 0 failures
- `bun run build` — clean, 31 routes (including `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook`, `/dashboard/billing`)
- 26 billing-specific tests covering: plan definitions, tier resolution, Stripe client singleton, checkout session, portal session, webhook signature verification, all 4 webhook event handlers, error handling, barrel exports
## Task 23 — Usage Tracking + Tier Enforcement (enforce.ts + tests)

### vi.hoisted() pattern for DB mock symbols
When `vi.mock` factory callbacks reference module-level variables (like `Symbol()`), those variables must be created via `vi.hoisted()` — not as plain `const`. `vi.mock` factories are hoisted above ALL `const` declarations in the file, causing temporal dead zone errors.

**Wrong:**
```ts
const mockTable = Symbol("table"); // TDZ error inside factory
vi.mock("@/server/db/schema", () => ({ table: mockTable }));
```

**Correct:**
```ts
const { mockTable } = vi.hoisted(() => ({ mockTable: Symbol("table") }));
vi.mock("@/server/db/schema", () => ({ table: mockTable }));
```

### buildSelectChain utility
Test helper that builds a chainable DB select mock (`.select().from().where().limit()`) returning a resolved value. Must be defined as a plain `function` (hoisted) or `const` at module scope — NOT inside `vi.hoisted` (which only runs once at hoist time, not per-call).

### enforceQuota / withQuotaCheck design
- `enforceQuota` is a "never throws" function returning a discriminated union
- `withQuotaCheck` throws `QuotaExceededError` (extends `Error` with `used`, `limit`, `upgradeUrl` properties)
- When a user exceeds quota, `enforceQuota` calls both `canCrossPost` AND `getRemainingQuota` — so the DB select mock needs 4 call slots (2 for canCrossPost, 2 for getRemainingQuota)

### DB mock call counting pattern
For functions that internally make multiple DB select calls, track `callCount` per test:
```ts
let callCount = 0;
mockSelect.mockImplementation(() => {
  callCount++;
  if (callCount === 1) return buildSelectChain([{ plan: "free" }]);
  return buildSelectChain([{ crossPostsCount: 5 }]);
});
```

## Task 21 — Analytics Dashboard UI (2026-02-28)

### Component Architecture
- Server component page.tsx calls server action and passes `initialData` to client `AnalyticsDashboard`
- Client dashboard holds dateRange/channelId state and re-fetches on user interaction
- Each sub-component (metrics-card, engagement-chart, etc.) is pure — accepts props, renders UI
- All charts wrapped in their own `Card` with `data-testid` attributes

### Recharts in Tests
- Must mock recharts entirely in vitest/happy-dom — `ResizeObserver` doesn't exist in happy-dom
- Mock `ResponsiveContainer` as a plain div, `LineChart`/`BarChart` as plain divs too
- Pattern: `vi.mock("recharts", () => ({ ResponsiveContainer: ({children}) => <div>{children}</div>, ... }))`

### i18n JSON Editing Safety
- When adding a new namespace to en.json/ru.json, the last key of the previous namespace must end with `},` not `}`
- The stray closing brace issue from previous agents: using Edit to replace the last `}` + `}` pair with single `},` 
- Always validate with: `node -e "require('./src/messages/en.json'); console.log('valid')"`

### toLocaleString() in Tests
- `(1250).toLocaleString()` renders as `"1 250"` (non-breaking space) in some locales (Node.js test env)
- Use regex matchers: `screen.getByText(/1[,\s]?250/)` to handle locale differences

### Heatmap Pattern
- CSS grid approach: 7 rows (days) × 24 cols (hours) implemented as nested flex
- Opacity-based color intensity using Tailwind `bg-primary/X` classes (15/30/50/70/90)
- TooltipProvider wraps the whole grid; each cell has a Tooltip
- Day labels (Mon-Sun) on left column, hour markers (every 3h) above as absolute-positioned spans

### Empty State Pattern
- All chart components check if data is empty/all-zero and show centered message
- `data.every((d) => d.total === 0)` for line chart, `data.length === 0` for bar/table
- Consistent message: noDataYet + noDataDescription i18n keys
