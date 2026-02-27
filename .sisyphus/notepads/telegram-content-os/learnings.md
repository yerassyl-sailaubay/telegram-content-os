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
