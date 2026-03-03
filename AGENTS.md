# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-28
**Commit:** 4db9712
**Branch:** work/telegram-content-os

## OVERVIEW

AI-powered content management system for Telegram creators. Ingests Telegram channel posts, adapts content via AI (OpenRouter) for cross-posting to Twitter/LinkedIn, with scheduling, analytics, and billing. Built on Next.js 16 App Router + TypeScript strict + Supabase + Drizzle ORM + Inngest background jobs + Stripe.

## STRUCTURE

```
src/
├── app/                  # Next.js App Router
│   ├── (dashboard)/      # Auth-protected dashboard (group route)
│   │   └── dashboard/    # /dashboard/* pages (analytics, billing, channels, crosspost, media, posts, schedule, settings)
│   ├── [locale]/         # i18n locale wrapper (en, ru; default: ru)
│   │   └── (auth)/       # Login/signup/callback
│   └── api/              # API routes: health, inngest, telegram/webhook, billing/*, auth/twitter|linkedin
├── components/           # React components → see components/AGENTS.md
├── lib/                  # Business logic modules → see lib/AGENTS.md
│   ├── ai/               # OpenRouter client, adaptation engine, prompt builders
│   ├── analytics/        # Cross-platform metrics collector
│   ├── billing/          # Stripe integration, plans, quota enforcement
│   ├── broadcast/        # Multi-platform broadcast orchestrator
│   ├── inngest/          # Background job definitions (11 functions)
│   ├── platforms/        # Twitter + LinkedIn API clients
│   ├── scheduling/       # Post scheduling engine + recurring schedules
│   ├── storage/          # Supabase storage client
│   ├── supabase/         # Supabase auth helpers (server + middleware)
│   └── telegram/         # Telegram Bot API client + message parser
├── server/               # Server-side logic → see server/AGENTS.md
│   ├── actions/          # 10 server action modules
│   └── db/               # Drizzle ORM client + 19 schema tables
├── hooks/                # Single hook: use-mobile.ts
├── i18n/                 # next-intl config (locales: en, ru; default: ru)
├── messages/             # i18n translation files (en.json, ru.json)
├── test/                 # Test setup, factories, mocks
└── middleware.ts          # Request pipeline: i18n routing → Supabase auth
```

## WHERE TO LOOK

| Task               | Location                                                                 | Notes                                         |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------------------- |
| Add a page         | `src/app/(dashboard)/dashboard/{feature}/page.tsx`                       | Follow existing page pattern                  |
| Add API route      | `src/app/api/{domain}/route.ts`                                          | Export named HTTP methods                     |
| Add server action  | `src/server/actions/{domain}.ts`                                         | Return `ActionResult<T>` discriminated union  |
| Add DB table       | `src/server/db/schema/{table}.ts` + re-export in `schema/index.ts`       | Drizzle ORM schema                            |
| Add background job | `src/lib/inngest/functions/{domain}/` + register in `functions/index.ts` | Inngest function                              |
| Add platform       | `src/lib/platforms/{name}.ts` + namespace export in `platforms/index.ts` | Follow Twitter/LinkedIn pattern               |
| Add AI prompt      | `src/lib/ai/prompts/adapt-{platform}.ts`                                 | Follow existing prompt builder pattern        |
| Add component      | `src/components/{feature}/{name}.tsx`                                    | Co-locate tests in `__tests__/`               |
| Add UI primitive   | `src/components/ui/`                                                     | Use shadcn CLI: `bunx shadcn add {component}` |

## CONVENTIONS

- **Package manager**: Bun (`bun install`, `bun run <script>`, `bunx`)
- **Imports**: Always `@/` alias for `src/` — e.g. `@/lib/utils`, `@/server/db`
- **Formatting**: Prettier — double quotes, semicolons, trailing commas, 100 char width
- **Styling**: Tailwind CSS 4 (CSS-first, no tailwind.config) + OKLCH colors. Use `cn()` from `@/lib/utils`
- **Component variants**: CVA pattern (`class-variance-authority`)
- **Module exports**: Barrel `index.ts` files. Platforms use namespace exports (`export * as linkedin`)
- **Types**: Co-located `types.ts` per module, not in global `src/types/`
- **Tests**: Co-located `__tests__/` dirs with `*.test.ts(x)`. Vitest globals enabled
- **Files**: kebab-case (`channel-card.tsx`, `adapt-twitter.ts`)
- **Server actions**: Return `ActionResult<T>` with `{ success: true, data }` | `{ success: false, error }`
- **DB**: Lazy Proxy singleton (`src/server/db/index.ts`). Never import `postgres` directly
- **i18n**: Default locale is `ru`. All user-facing strings in `src/messages/{locale}.json`
- **Env vars**: `NEXT_PUBLIC_*` for browser-safe, UPPERCASE for server-only

## ANTI-PATTERNS

- Do NOT place code between `createServerClient()` and `supabase.auth.getUser()` in middleware — causes random logouts
- Do NOT use LinkedIn UGC API — deprecated. Use Posts API (`linkedin.ts` already does)
- Do NOT import DB connection directly — always use `db` export from `@/server/db`
- Do NOT skip quota check before AI operations — always `enforceQuota` first
- Do NOT hardcode locale — use next-intl `useTranslations()` or `getTranslations()`

## REQUEST FLOW

```
Request → middleware.ts (i18n + auth)
  ├── API routes: /api/* (skip middleware matcher)
  ├── Auth pages: /[locale]/login, /signup → redirect if authenticated
  └── Dashboard: /[locale]/dashboard/* → redirect to login if unauthenticated

Telegram webhook → /api/telegram/webhook → Inngest event → background processing
Stripe webhook → /api/billing/webhook → subscription updates
OAuth callbacks → /api/auth/{twitter,linkedin}/callback → token storage
```

## BACKGROUND JOBS (Inngest)

| Function                    | Trigger          | Purpose                                 |
| --------------------------- | ---------------- | --------------------------------------- |
| `telegramPostReceived`      | Telegram webhook | Process new channel post                |
| `adaptContent`              | Server action    | AI content adaptation pipeline          |
| `profileChannel`            | Server action    | Analyze channel tone for AI             |
| `executeScheduledPost`      | Cron/schedule    | Post at scheduled time                  |
| `processRecurringSchedules` | Cron             | Generate posts from recurring schedules |
| `executeBroadcast`          | Server action    | Multi-platform simultaneous post        |
| `collectLinkedInAnalytics`  | Cron             | Fetch LinkedIn post metrics             |
| `collectTwitterAnalytics`   | Cron             | Fetch Twitter post metrics              |
| `collectTelegramAnalytics`  | Cron             | Fetch Telegram post metrics             |

## COMMANDS

```bash
bun dev              # Dev server (port 3000)
bun build            # Production build
bun lint             # ESLint
bun format           # Prettier
bun test             # Unit tests (Vitest)
bun test:watch       # Tests in watch mode
bun test:coverage    # Tests with coverage
bun test:e2e         # E2E tests (Playwright)
bun inngest-dev      # Inngest dev server (for background jobs)
bun test:smoke       # Smoke test (starts server, checks /api/health)
```

## NOTES

- CI runs: typecheck → lint → test → build (sequential). E2E runs separately on push to main
- Pre-commit hook (Husky): `lint-staged` runs `bun lint --fix` + `prettier --write`
- Tailwind CSS 4 uses CSS-first config in `src/app/globals.css` (not `tailwind.config.js`)
- DB schema has 19 tables — see `src/server/db/schema/` for full list
- AI adaptation is 2-step: literal translation (RU→EN) → platform-specific adaptation
- Twitter adaptation handles threading with sentence boundary splitting (reserves 10 chars for " 1/N")
