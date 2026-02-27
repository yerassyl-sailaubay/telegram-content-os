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
  → Without explicit include, `bun run test` (vitest) picks up e2e/*.spec.ts and fails with Playwright conflict error
- Path alias `@/*` → `./src/*` must be set in vitest.config.ts resolve.alias to match tsconfig
- `setupFiles: ["./src/test/setup.ts"]` loads jest-dom matchers globally

### bun test vs bun run test
- `bun test --run` invokes bun's NATIVE test runner (not vitest) — picks up ALL *.spec.ts files
- `bun run test` invokes the npm script → `vitest --run` — correct way to run unit tests
- E2E tests (e2e/*.spec.ts) must be excluded from vitest include pattern to avoid Playwright collision

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
- Unauthenticated → /dashboard/* → redirect to /login
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
