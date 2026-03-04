# Learnings — telegram-content-os

## 2026-02-27 Session Start

- Project is greenfield — no existing code
- Worktree: /Users/yerassyl/Documents/Code/telegram-content-os-work
- Plan: 30 implementation tasks + 4 verification tasks across 6 waves
- Wave 1 has 7 tasks, all independent, MAX PARALLEL after T1 scaffolding
- Task 1 must complete FIRST since all other Wave 1 tasks depend on it

## 2026-02-27 Task 1: Project Scaffolding

### Next.js + Shadcn/ui setup

- `create-next-app` cannot run in a directory with existing files (.sisyphus blocked it)
  → Workaround: scaffold in /tmp then rsync (excluding .git and node_modules)
- `create-next-app` latest installed Next.js 16.1.6 (not 15) — still uses App Router
- `--no-turbopack` flag is respected; but production build still shows "Turbopack" in output (expected)
- `bunx shadcn@latest init --defaults --base-color slate` works non-interactively with Tailwind v4
- shadcn/ui creates `src/lib/utils.ts` automatically with `cn()` helper
- shadcn/ui Button component lands at `src/components/ui/button.tsx`

### Tailwind CSS 4

- No `tailwind.config.ts` in v4 — config moved to CSS via `@import "tailwindcss"` in globals.css
- postcss.config.mjs uses `@tailwindcss/postcss` plugin

### TypeScript

- tsconfig.json strict mode enabled by default in create-next-app
- `@/*` path alias maps to `./src/*` — configured correctly

### Build verification

- `bun run lint` — clean (0 errors)
- `bun run build` — clean (0 TypeScript errors)
- `/api/health` → `{"status":"ok"}` (200) confirmed via curl
- Health route uses `NextResponse.json({ status: "ok" }, { status: 200 })`

### Package versions installed

- next@16.1.6, react@19.2.3, tailwindcss@4.2.1, typescript@5.9.3
- prettier@3.8.1, prettier-plugin-tailwindcss@0.7.2
- @typescript-eslint/eslint-plugin@8.56.1

## 2026-02-27 Task 3: Supabase + DB Schema + Drizzle ORM

### Dependencies installed

- drizzle-orm@0.45.1, postgres@3.4.8, drizzle-kit@0.31.9
- @supabase/supabase-js@2.98.0, @supabase/ssr@0.8.0

### Schema architecture

- 12 tables in `src/server/db/schema/` with individual files + barrel export
- Drizzle `pgEnum` for: plan, subscription_status, platform, cross_post_status, schedule_status
- `platformEnum` is shared between platform_connections and cross_posts (imported from platform-connections.ts)
- All tables use UUID primary keys via `uuid('id').defaultRandom().primaryKey()`
- All timestamps use `{ withTimezone: true }` for Supabase compatibility
- Foreign keys use `onDelete: 'cascade'` except cross_posts.source_post_id which uses `onDelete: 'set null'`
- usage_tracking has composite unique constraint on (user_id, month)

### Drizzle ORM patterns (v0.45.1)

- `pgEnum()` call without explicit column name creates a reusable enum type
- `relations()` must be defined separately from table schema
- Circular imports between schema files work fine with Drizzle (users → subscriptions → users)
- `unique()` from `drizzle-orm/pg-core` for composite unique constraints in table config callback
- Table config callback now returns array (not object) in latest Drizzle: `(table) => [unique(...)]`

### DB client singleton

- Uses `globalThis` cache pattern for Next.js HMR (prevents connection leaks in dev)
- `postgres(url, { prepare: false })` — `prepare: false` required for Supabase transaction pooler
- DB client throws on missing DATABASE_URL — intentional for clear error messaging

### Build verification

- `bun run build` passes cleanly with all schema files
- Zero LSP diagnostics across all 16 new files
- Schema files don't trigger Next.js build issues since they're not imported by any pages/routes yet

## 2026-02-27 Task 2: Test Infrastructure

### Vitest + Happy-DOM setup

- Use `happy-dom` as test environment (NOT jsdom) — faster and more accurate
- vitest config MUST set `include: ["src/**/*.{test,spec}.{ts,tsx}"]` to exclude e2e/ from vitest glob
  → Without explicit include, `bun run test` (vitest) picks up e2e/\*.spec.ts and fails with Playwright conflict error
- Path alias `@/*` → `./src/*` must be set in vitest.config.ts resolve.alias to match tsconfig
- `setupFiles: ["./src/test/setup.ts"]` loads jest-dom matchers globally

### bun test vs bun run test

- `bun test --run` invokes bun's NATIVE test runner (not vitest) — picks up ALL \*.spec.ts files
- `bun run test` invokes the npm script → `vitest --run` — correct way to run unit tests
- E2E tests (e2e/\*.spec.ts) must be excluded from vitest include pattern to avoid Playwright collision

### Playwright setup

- `bunx playwright install chromium` — installs only chromium (no output on success = OK)
- playwright.config.ts uses `webServer` to auto-start dev server during E2E runs
- E2E tests should NOT be run without a live dev server — do not include in `bun run test`
- E2E test in e2e/health.spec.ts uses `request` fixture (no browser needed for API tests)

### Package versions installed

- vitest@4.0.18, @vitejs/plugin-react@5.1.4, happy-dom@20.7.0
- @testing-library/react@16.3.2, @testing-library/jest-dom@6.9.1, @testing-library/user-event@14.6.1
- @vitest/coverage-v8@4.0.18, @playwright/test@1.58.2

### Build verification

- `bun run test` (vitest --run) — 7/7 unit tests passing
- `bun run build` — clean (0 TypeScript errors)
- `.next/lock` file can cause spurious build failures if a previous build was interrupted — delete and retry

## [2026-02-27] Task 7: Inngest Setup

### Package

- Installed `inngest@3.52.4` via `bun add inngest`
- `inngest/next` subpath export provides `serve()` for Next.js App Router API routes

### Pattern: Inngest Client

```ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "telegram-content-os" });
```

### Pattern: Event-triggered function

```ts
inngest.createFunction({ id: "test/hello-world" }, { event: "test/hello" }, async ({ event, step }) => { ... })
```

### Pattern: Cron function

```ts
inngest.createFunction({ id: "scheduled/example" }, { cron: "* * * * *" }, async ({ step }) => { ... })
```

### Pattern: Next.js App Router API Route

```ts
import { serve } from "inngest/next";
export const { GET, POST, PUT } = serve({ client: inngest, functions });
```

### Dev Script

- `"inngest-dev": "bunx inngest-cli@latest dev"` in package.json
- Runs local Inngest dev server (no cloud connection needed)

### Build Result

- `bun run build` compiles cleanly with zero TypeScript errors
- `/api/inngest` route registered as Dynamic (server-rendered)
- Build shows `ƒ /api/inngest` confirming dynamic route works

## 2026-02-27 Task 4: Supabase Auth

### @supabase/ssr v0.8.0 API

- `createBrowserClient(url, key)` from `@supabase/ssr` — singleton browser client, no cookie config needed
- `createServerClient(url, key, { cookies: { getAll, setAll } })` — server client with cookie handlers
- Both use `getAll`/`setAll` pattern (NOT deprecated `get`/`set`/`remove`)
- Server client `setAll` wraps in try/catch — silently fails in Server Components (middleware handles refresh)
- Middleware client copies cookies from request → response using `NextResponse` cookie API

### Auth architecture

- Browser client: `src/lib/supabase/client.ts` — simple `createBrowserClient` wrapper
- Server client: `src/lib/supabase/server.ts` — `cookies()` from `next/headers`, async
- Middleware helper: `src/lib/supabase/middleware.ts` — refreshes session, returns `{ user, supabaseResponse }`
- Next.js middleware: `src/middleware.ts` — route protection + session refresh
- Server actions: `src/server/actions/auth.ts` — login, signup, logout, signInWithOAuth
- OAuth callback: `src/app/(auth)/auth/callback/route.ts` — exchanges code for session

### Route protection pattern

- Middleware matches all routes except static files, images, favicon, health API
- Unauthenticated → /dashboard/\* → redirect to /login
- Authenticated → /login|/signup → redirect to /dashboard
- Dashboard layout also checks session server-side as defense-in-depth

### Next.js 16 specifics

- `searchParams` is now `Promise<{...}>` in page props — must await
- `cookies()` from `next/headers` is async — must await
- `headers()` from `next/headers` is async — must await
- Middleware file triggers deprecation warning: 'Use proxy instead' — still works

### Parallel task conflicts

- Task 5 (i18n) added `src/app/[locale]/page.tsx` importing non-existent `@/components/language-switcher`
- Created stub component to unblock build — Task 5 should replace it

### shadcn components installed

- Card, Input, Label (added for auth forms)
- Button (pre-existing from scaffolding)

### Build result

- `bun run build` passes cleanly with all auth files
- Zero LSP diagnostics across all 10 new auth files
- Routes: /login, /signup, /auth/callback, /dashboard all registered correctly

## 2026-02-27 Task 5: i18n Setup

### next-intl v4.8.3 Setup

- `next-intl@4.8.3` installed — latest stable for Next.js App Router
- `createNextIntlPlugin` wraps `nextConfig` in `next.config.ts` — pass path to request config
- `defineRouting` from `next-intl/routing` for locale config (locales, defaultLocale)
- `createNavigation` from `next-intl/navigation` exports: Link, redirect, usePathname, useRouter
- `getRequestConfig` from `next-intl/server` for server-side locale resolution + message loading
- `hasLocale` from `next-intl` validates locale strings

### File structure

- `src/i18n/routing.ts` — defineRouting({ locales: ['en', 'ru'], defaultLocale: 'ru' })
- `src/i18n/request.ts` — getRequestConfig with dynamic import for message JSON files
- `src/i18n/navigation.ts` — createNavigation(routing) re-exports
- `src/messages/en.json` + `src/messages/ru.json` — structured by namespace (common, auth, nav, dashboard)
- `src/app/[locale]/layout.tsx` — locale-aware layout with NextIntlClientProvider
- `src/app/[locale]/page.tsx` — locale-aware home page with useTranslations
- `src/components/language-switcher.tsx` — DropdownMenu from shadcn/ui to switch locale

### Layout architecture with next-intl

- Root `src/app/layout.tsx` becomes a passthrough (`return children`) — no <html> or <body>
- `src/app/[locale]/layout.tsx` renders `<html lang={locale}>` and wraps with `NextIntlClientProvider`
- `generateStaticParams` returns all locales for SSG
- `setRequestLocale(locale)` called for static rendering support
- Geist fonts configured with `cyrillic` subset for Russian support

### Middleware integration with auth (Task 4)

- next-intl uses `createMiddleware(routing)` — called as function in custom middleware
- Auth middleware (Supabase session check) integrated: i18n routing runs first, then auth checks
- Auth routes (`/login`, `/signup`, `/dashboard`) checked after stripping locale prefix
- `/auth/callback` route skips i18n (API-like route)
- Next.js 16 shows deprecation: 'middleware file convention is deprecated, use proxy instead' — still works

### Geist fonts

- Geist and Geist_Mono support `cyrillic` subset — added to font config for Russian

### Build result

- `bun run build` passes cleanly with zero TypeScript errors
- Routes: `/en` and `/ru` registered as SSG (static)
- All auth routes (`/login`, `/signup`, `/dashboard`, `/auth/callback`) still work
- shadcn `dropdown-menu` component added for language switcher

## [2026-02-27] Task 6: UI Shell

### Patterns Used

- shadcn/ui Sidebar component (`bunx shadcn@latest add sidebar`) installs `src/components/ui/sidebar.tsx` + `src/hooks/use-mobile.ts` + skeleton
- shadcn Sidebar provides: `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarInset`, `SidebarTrigger` — all composable
- `SidebarMenuButton` accepts `isActive` prop for active nav highlighting, and `tooltip` prop for collapsed tooltip
- `SidebarInset` wraps the main content area next to the sidebar
- `SidebarTrigger` in the header triggers mobile hamburger

### next-themes Integration

- `bun add next-themes@0.4.6`
- `ThemeProvider` wraps `NextIntlClientProvider > children` in `[locale]/layout.tsx`
- Use `attribute="class"` with `enableSystem` — dark mode class applies to `<html>`
- `disableTransitionOnChange` prevents flash on theme switch

### i18n Server Components in App Router

- Placeholder pages are server components: use `getTranslations('namespace')` (async)
- Client components: use `useTranslations('namespace')` (sync hook)
- Added `comingSoon` key to `common` namespace in both en.json and ru.json

### Architecture

- `Shell` is a server component that receives `userEmail` and renders `SidebarProvider > AppSidebar + SidebarInset > AppHeader + main`
- `AppSidebar` is `"use client"` — uses `useTranslations`, `usePathname` for active state
- `AppHeader` is `"use client"` — breadcrumbs derived from `usePathname()` with segment map
- `(dashboard)/layout.tsx` remains a server component — preserves Supabase auth check, passes `user.email` to Shell

### Gotchas

- zsh glob expands `(dashboard)` — must quote paths with parentheses in mkdir: `mkdir -p "/path/(dashboard)/..."`
- shadcn Breadcrumb component not installed by default — needed `bunx shadcn@latest add breadcrumb`
- The sidebar nav group label used `t("dashboard")` — could use a dedicated "navigation" label instead in future
- `globals.css` already had sidebar CSS variables pre-configured from a previous shadcn install attempt

### Build

- `bun run build` passes clean with 0 TypeScript errors
- `bun run test` — 7/7 unit tests pass
- All 7 dashboard routes render as dynamic server-rendered pages

## Task 11: Scheduling Engine + Calendar UI

### Timezone Handling

- Asia/Almaty is UTC+5 (not UTC+6) per IANA database — always verify against `date-fns-tz` output
- `date-fns-tz@3.x` uses `TZDate` class instead of `utcToZonedTime`/`zonedTimeToUtc` from v2
- For timezone grouping, `Intl.supportedValuesOf('timeZone')` gives browser-supported zones
- `getTimezoneOffset` from date-fns-tz returns offset in milliseconds, divide by 3600000 for hours

### Calendar UI (No Heavy Libraries)

- Built month/week/day views from scratch using date-fns — no FullCalendar/react-big-calendar needed
- Month view: 6-row grid with `startOfWeek`/`endOfWeek` around `startOfMonth`/`endOfMonth`
- Week view: 7-column × 24-row grid with hour labels; events positioned by `top` percentage
- Day view: single column × 24-row; same positioning logic as week
- shadcn `Calendar` component (react-day-picker) used only for the date picker in dialogs, not the main view

### Scheduling Engine Pattern

- Engine functions take `db` as parameter for testability (dependency injection)
- `validateScheduleTime` enforces minimum 5-minute future window
- Inngest `step.run()` for each discrete operation: fetch → mark-processing → emit-event → mark-completed
- Used `inngest.send()` to emit a `post/publish.requested` event rather than directly posting
- Schedule statuses: pending → processing → completed/failed; also cancelled (from user action)

### Testing with vi.mock

- Mock `@/server/db` and `@/lib/inngest/client` at module level for engine tests
- `vi.mocked(db.insert).mockReturnValue(chain)` pattern for Drizzle query builder chains
- Timezone tests don't need mocks — pure function tests with known inputs/outputs

### Server Actions Pattern

- `createScheduleAction` uses `getUser()` for auth, then delegates to engine functions
- `getSchedulesForCalendar` accepts date range + timezone, returns typed schedule objects
- Revalidation: `revalidatePath('/dashboard/schedule')` after mutations

### Build Stats After Task 11

- `bun run test` — 240 tests pass (9 test files, 23 new scheduling tests)
- `bun run build` — clean, 0 TypeScript errors
- `/dashboard/schedule` route registered as dynamic (ƒ)
- 13 new files created, 3 existing files modified

## [2026-02-28] Task 14: OpenRouter AI Provider Abstraction Layer

### Architecture

- 2-step pipeline: translate (RU→EN literal) → adapt (platform-specific EN)
- `AIProvider` interface in `provider.ts` defines the contract: `adaptContent()` + `analyzeChannelProfile()`
- `OpenRouterClient` class implements `AIProvider` with lazy API key validation
- Prompt templates are pure functions returning `OpenRouterMessage[]` arrays
- Model registry: `AI_MODELS` record keyed by tier (default/fast/pro)

### Lazy Init Pattern (Critical)

- Constructor does NOT validate `OPENROUTER_API_KEY` — only checks at request time via `getApiKey()`
- This matches the project pattern: DB uses Proxy-based lazy init, Telegram uses factory function
- Prevents build-time failures when env vars aren't set

### OpenRouter API

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Auth: `Authorization: Bearer <key>` header
- Request body matches OpenAI format: `{ model, messages, temperature, max_tokens }`
- Response includes `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`
- Headers: also sends `HTTP-Referer` and `X-Title` (OpenRouter best practice)

### Retry & Fallback

- Exponential backoff with jitter: `baseDelayMs * 2^attempt + random(0-200)ms`
- Retryable status codes: 429, 500, 502, 503, 504
- Model fallback: if primary model returns 502/503 after exhausting retries, tries `default` → `fast` tiers
- `AIProviderError` class carries `statusCode` + `retryable` flag for callers to handle

### Timeout

- Uses `AbortController` with `AbortSignal.timeout` pattern
- Default 30s timeout, configurable via `options.timeoutMs`
- `AbortError` is caught and re-thrown as retryable `AIProviderError` (408)

### Prompt Design

- Translate prompt: emphasizes LITERAL translation, low temperature (0.3)
- LinkedIn: professional tone, thought-provoking question, 1-2 hashtags, <3000 chars
- Twitter: conversational/punchy, 2-5 hashtags, emoji, 280 char/tweet, thread splitting
- Channel profile: expects JSON output with niche, tone, topTopics, language
- All prompts accept optional `channelProfile` for tone-matching context

### JSON Parsing from AI

- AI may wrap JSON in markdown code fences (`json ... `)
- `parseJsonResponse()` strips fences before `JSON.parse()`
- Throws `AIProviderError` on parse failure with content preview

### Testing

- 46 new tests covering: prompt templates, model config, client, retry, fallback, pipeline, error handling
- `mockFetch.mockReset()` in `beforeEach` is essential — `vi.restoreAllMocks()` alone doesn't reset call counts for manually created `vi.fn()` mocks
- Fake timers (`vi.useFakeTimers()`) + `vi.advanceTimersByTimeAsync()` for retry tests
- Real timers needed for exhaustion tests (tiny delays, multiple retries)

### Files Created (9 new)

- `src/lib/ai/types.ts` — All AI types, model config, error class
- `src/lib/ai/provider.ts` — AIProvider interface
- `src/lib/ai/openrouter.ts` — OpenRouter client implementation
- `src/lib/ai/prompts/translate.ts` — RU→EN literal translation prompt
- `src/lib/ai/prompts/adapt-linkedin.ts` — LinkedIn adaptation prompt
- `src/lib/ai/prompts/adapt-twitter.ts` — Twitter adaptation prompt
- `src/lib/ai/prompts/channel-profile.ts` — Channel profile analysis prompt
- `src/lib/ai/__tests__/openrouter.test.ts` — 46 tests
- `src/lib/ai/index.ts` — Barrel export

### Build Stats After Task 14

- `bun run test` — 370 tests pass (13 test files, 46 new AI tests)
- `bun run build` — clean, 0 TypeScript errors
- Zero LSP diagnostics across all 9 new files

## [2026-02-28] Task 17: LinkedIn OAuth + Posting Integration

### OAuth 2.0 PKCE Flow

- LinkedIn OAuth uses PKCE with S256 code challenge method
- `code_verifier` is 43-128 char random string (RFC 7636), stored in HTTP-only cookie during OAuth redirect
- `code_challenge` = Base64URL(SHA-256(code_verifier)) — no padding, URL-safe alphabet
- LinkedIn token endpoint: `https://www.linkedin.com/oauth/v2/accessToken`
- Authorization URL: `https://www.linkedin.com/oauth/v2/authorization`
- Required scopes: `openid`, `profile`, `w_member_social` (for Posts API)

### LinkedIn API Headers

- `LinkedIn-Version: 202401` — required version header for all API calls
- `X-Restli-Protocol-Version: 2.0.0` — required for REST.li endpoints
- `Content-Type: application/json` — standard
- `Authorization: Bearer <token>` — standard OAuth bearer token

### Posts API (v2)

- POST `https://api.linkedin.com/rest/posts` — create text or image posts
- Image upload is 2-step: (1) `POST /rest/images?action=initializeUpload` to get upload URL, (2) `PUT` binary to upload URL
- Image initialize request body: `{ initializeUploadRequest: { owner: "urn:li:person:<id>" } }`
- Post body uses `shareCommentary` for text content and `content.media.id` for image attachment
- User info endpoint: `https://api.linkedin.com/v2/userinfo` (OpenID Connect)

### Token Encryption

- Used AES-256-GCM for encrypting tokens before DB storage
- Key derived via SHA-256 hash of `ENCRYPTION_KEY` env var (any string works, hashed to 32 bytes)
- IV is random 12 bytes, prepended to ciphertext, auth tag appended (16 bytes)
- Different from existing `encryption.ts` which expects 64 hex char key — both coexist

### Name Collision with Twitter Module

- Both `twitter.ts` and `linkedin.ts` export identically-named functions (generateCodeVerifier, buildAuthorizationUrl, etc.)
- Barrel `index.ts` uses namespace re-exports: `export * as linkedin from './linkedin'`, `export * as twitter from './twitter'`
- `export * as encryption from './encryption'` for shared encryption module

### Inngest Function Pattern

- Event: `platform/linkedin.post` with data: `{ crossPostId, userId }`
- Steps: mark-processing → fetch-connection → decrypt-tokens → (optional) upload-image → create-post → (on 401) refresh-and-retry → mark-completed
- `crossPostStatusEnum` only has: draft, scheduled, posted, failed — no `processing`, so used `scheduled` as intermediate
- 401 from API triggers automatic token refresh + single retry

### Testing Insights

- `mockFetch.mockReset()` in `beforeEach` is essential — `vi.restoreAllMocks()` doesn't clear mock call history for `vi.fn()` mocks
- Test command: `bun vitest run <path>` for single file (NOT `bun run test -- --run <path>` which causes double `--run` flag)
- 24 new tests covering: PKCE helpers, token encryption, buildAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken, getUserInfo, createPost, uploadImage, withLinkedInRetry

### API Route Lazy Imports

- LinkedIn API routes use dynamic `import()` for DB/library imports to avoid build-time failures
- `cookies()` and `searchParams` are async Promises in Next.js 16 — must `await`
- OAuth state parameter uses `crypto.randomUUID()` stored in cookie for CSRF protection

### Build Stats After Task 17

- `bun run test` — 370 tests pass (13 test files, 24 new LinkedIn tests)
- `bun run build` — clean, 0 TypeScript errors
- New routes: `/api/auth/linkedin` and `/api/auth/linkedin/callback` registered as dynamic (ƒ)
- 7 new files created (linkedin.ts, linkedin.test.ts, 2 API routes, inngest function, updated index.ts and types.ts)

## [2026-02-28] Task 20: Analytics Data Collection — Track Cross-Post Performance

### Schema Design

- 3 new tables: `postAnalytics`, `channelMetrics`, `analyticsSyncLog`
- `postAnalytics` has FK to `crossPosts` + `platformEnum` reuse from `platform-connections.ts`
- `channelMetrics` has FK to `telegramChannels` for per-channel aggregate metrics
- `analyticsSyncLog` tracks sync windows per user/platform to prevent duplicate fetches
- All tables follow existing patterns: UUID PKs, `withTimezone: true` timestamps, `onDelete: 'cascade'`

### Rate Limiting Pattern

- Implemented sliding window rate limiter: `createRateLimiter(platform)` → `{ tryAcquire, getWaitTime }`
- LinkedIn: 100 requests/day (86400000ms window)
- Telegram: 30 messages/second (1000ms window)
- Rate limiter is in-memory per function invocation — suitable for 6h cron intervals

### Platform-Specific Analytics

- **LinkedIn**: Uses `socialActions` endpoint for per-post engagement (likes, comments) — impressions NOT available from this endpoint
- **Twitter**: Free tier is write-only, NO engagement endpoints — collector only captures metadata (charCount, hasMedia, hashtags)
- **Telegram**: Bot API doesn't have a direct 'get reactions' endpoint — reactions come via webhook events. Cron function stores defaults (0) as placeholders

### DB Type Mismatch Fix

- Inngest `step.run()` callbacks use dynamic imports for DB — the inferred type differs from direct `db` import
- Solution: `hasSyncedWindow` and `recordSyncWindow` accept `db: unknown` and cast internally to `any`
- Avoids `as any` at call sites — keeps type safety at the interface boundary

### Inngest Cron Pattern for Analytics

- All 3 functions use `cron: '0 */6 * * *'` (every 6 hours)
- Pattern: step.run('get-users') → loop users → step.run per user → step.run('save-analytics')
- Dynamic imports inside `step.run()` for DB and libraries (same pattern as post-to-linkedin.ts)
- Sync dedup via `analyticsSyncLog` prevents re-fetching same time window

### Testing

- 41 new tests covering: rate limiter, sync dedup, Twitter metadata, engagement aggregation, LinkedIn fetch, Telegram reactions, error types, edge cases
- Mocked `global.fetch` for API call tests with `vi.stubGlobal('fetch', mockFetch)`
- `consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})` to suppress error logs in tests

### Build Stats After Task 20

- `bun run test` — 498 tests pass (17 test files, 41 new analytics tests)
- `bun run build` — clean, 0 TypeScript errors
- Zero LSP diagnostics across all analytics files
- 10 new files created, 2 existing files modified (schema/index.ts, inngest/functions/index.ts)

## [2026-02-28] UX Audit: Loading Skeletons, Empty States, Error Boundaries, Toast Notifications

### Existing State Before Audit

- 3 pages already had custom `loading.tsx`: channels, crosspost, billing — left untouched (page-specific skeletons are better than generic ones)
- Posts, Media, Schedule pages were "coming soon" placeholders — no real empty state handling
- No `alert()` usage in non-test code (only in XSS tests in `converters.test.ts`)
- No sonner/Toaster was present anywhere in the app
- No dashboard-level error boundary existed

### Reusable UI Components Created

- `skeleton-variants.tsx`: 7 variants — TableSkeleton, CardSkeleton, ChartSkeleton, CalendarSkeleton, StatsRowSkeleton, PageHeaderSkeleton, TabsSkeleton
- `empty-state.tsx`: Generic empty state with icon (lucide-react), title, description, optional CTA button
- `error-state.tsx`: Error display with retry button, uses `useTranslations('uxStates')`
- All components use `cn()` for className merging and accept standard HTML div props

### shadcn sonner Integration

- `bunx shadcn@latest add sonner` generates `src/components/ui/sonner.tsx`
- `<Toaster />` added to `src/app/[locale]/layout.tsx` — renders outside providers, inside `<body>`
- sonner re-exports `toast()` function for imperative use from any client component

### i18n Pattern for UX States

- New `uxStates` namespace in both `en.json` and `ru.json`
- Keys: `errorTitle`, `errorDescription`, `retryButton`, `backToDashboard`
- Empty state keys per page: `postsEmptyTitle`, `postsEmptyDescription`, `postsEmptyCta`, etc.
- Client components use `useTranslations('uxStates')`, server components use `getTranslations('uxStates')`

### Next.js 16 Error Boundary Pattern

- `error.tsx` MUST have `"use client"` directive — it's a Client Component requirement
- Props: `{ error: Error & { digest?: string }, reset: () => void }`
- `reset()` re-renders the route segment — equivalent to React error boundary retry
- Dashboard-level `error.tsx` catches errors from any nested dashboard page

### Loading Page Pattern

- `loading.tsx` files use skeleton variants matching the expected page layout
- No i18n needed in loading pages — skeletons are visual-only, no text content
- Each loading page is a default export React component returning JSX

### Empty State Pattern for "Coming Soon" Pages

- Dedicated components per page: `posts-empty-state.tsx`, `media-empty-state.tsx`, `schedule-empty-state.tsx`
- Each uses the generic `EmptyState` component with page-specific icon, title, description from i18n
- Page files (`page.tsx`) import the empty state component directly — no conditional logic needed since these pages don't have data yet

### Testing with vi.hoisted()

- `vi.hoisted()` is REQUIRED for variables referenced inside `vi.mock()` factory functions
- Pattern: `const mockTranslations = vi.hoisted(() => vi.fn((key: string) => key))`
- Without `vi.hoisted()`, the variable is `undefined` when the mock factory runs (hoisting issue)
- Mocked `next-intl` with: `vi.mock('next-intl', () => ({ useTranslations: () => mockTranslations }))`

### Build Stats After UX Audit

- `bun run test` — 756 tests pass (27 test files, 20 new UX state tests)
- `bun run build` — clean, 0 TypeScript errors, 32 routes
- Zero LSP diagnostics across all 15 new files and 6 modified files
- 15 new files created, 6 existing files modified
