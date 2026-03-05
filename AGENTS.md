# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-05
**Commit:** 0356cf7
**Branch:** work/telegram-content-os

## OVERVIEW

AI-powered content operating system for Telegram creators. The app ingests Telegram and external sources (YouTube/articles), generates/adapts content with Google Gemini, and handles scheduling, cross-posting, analytics, and billing.

Core stack: Next.js 16 App Router + TypeScript strict + Supabase + Drizzle ORM + Inngest + Stripe.

## STRUCTURE

```
src/
├── app/                        # App Router pages + API routes
│   ├── [locale]/               # Locale wrapper (en, ru; default: ru)
│   │   ├── (auth)/             # Login/signup/callback
│   │   └── (dashboard)/        # Auth-protected UI
│   │       └── dashboard/      # Main product surfaces (admin, analytics, billing, channels, create, crosspost, media, posts, publish, schedule, settings, telegram-post)
│   └── api/                    # health, inngest, telegram webhook, billing webhooks, social auth
├── components/                 # UI + feature components (see src/components/AGENTS.md)
├── lib/                        # Business/domain logic (see src/lib/AGENTS.md)
├── server/                     # Server actions + DB layer (see src/server/AGENTS.md)
├── hooks/                      # Shared hooks
├── i18n/                       # next-intl routing/navigation
├── messages/                   # en.json / ru.json
├── test/                       # Shared test setup/factories/mocks
└── middleware.ts               # i18n + Supabase auth request pipeline
```

## WHERE TO LOOK

| Task                    | Location                                                     | Notes                                 |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------- |
| Add locale page         | `src/app/[locale]/.../page.tsx`                              | Keep locale-aware navigation/messages |
| Add dashboard page      | `src/app/[locale]/(dashboard)/dashboard/{feature}/page.tsx`  | Most product pages live here          |
| Add API route           | `src/app/api/{domain}/route.ts`                              | Export named HTTP methods             |
| Add server action       | `src/server/actions/{domain}.ts`                             | Return `ActionResult<T>` union        |
| Add DB table/schema     | `src/server/db/schema/{table}.ts` + `schema/index.ts`        | Keep barrel exports in sync           |
| Add background function | `src/lib/inngest/functions/{domain}/` + `functions/index.ts` | Must register in index                |
| Add component           | `src/components/{feature}/{name}.tsx`                        | Co-locate tests in `__tests__/`       |
| Add UI primitive        | `src/components/ui/`                                         | Use shadcn CLI                        |

## CONVENTIONS

- **Package manager**: Bun (`bun install`, `bun run ...`, `bunx ...`).
- **Imports**: `@/` alias for `src/`.
- **Formatting**: Prettier (double quotes, semicolons, trailing commas, 100 width).
- **Styling**: Tailwind CSS 4 + `cn()` helper from `@/lib/utils`.
- **Actions**: `ActionResult<T>` pattern (`{ success: true, data } | { success: false, error }`).
- **DB access**: Use `db` from `@/server/db` (lazy singleton proxy), never direct `postgres` imports.
- **i18n**: Default locale is `ru`; user-facing strings belong in `src/messages/{locale}.json`.
- **Tests**: Vitest + Testing Library; keep tests close to features when possible.

## ANTI-PATTERNS

- Do NOT insert code between `createServerClient()` and `supabase.auth.getUser()` in `src/lib/supabase/middleware.ts`.
- Do NOT skip quota enforcement before AI-heavy operations.
- Do NOT hardcode locale strings or route assumptions; use next-intl helpers.
- Do NOT edit generated/shadcn UI primitives in ways that conflict with regeneration.

## REQUEST FLOW

```
Request
  -> src/middleware.ts (i18n + auth gating)
  -> locale root /[locale] stays public (landing)
  -> /[locale]/dashboard/* requires auth
  -> /[locale]/login|signup redirects away if already authenticated

Root /
  -> src/app/page.tsx redirects to default locale (/ru)

Telegram webhook
  -> /api/telegram/webhook
  -> DB write + Inngest event

External source pipeline
  -> server action (sources.ts)
  -> Inngest: process external source
  -> optional AI generation fanout

Billing webhook
  -> /api/billing/webhook
  -> subscription + usage updates
```

## BACKGROUND JOBS (Inngest)

Registered in `src/lib/inngest/functions/index.ts`:

- `telegramPostReceived`
- `publishToTelegram`
- `adaptContent`
- `developIdea`
- `repurposeContent`
- `generateFromSource`
- `profileChannel`
- `suggestCalendarFill`
- `executeScheduledPost`
- `processRecurringSchedules`
- `executeBroadcast`
- `processExternalSource`
- `collectLinkedInAnalytics`
- `collectTwitterAnalytics`
- `collectTelegramAnalytics`
- `helloWorld` (example)
- `scheduledExample` (example)

## COMMANDS

```bash
bun dev              # Dev server
bun build            # Production build
bun start            # Start production server
bun lint             # ESLint
bun format           # Prettier write
bun test             # Vitest run
bun test:watch       # Vitest watch
bun test:coverage    # Vitest coverage
bun test:e2e         # Playwright
bun inngest-dev      # Inngest local dev
bun test:smoke       # Smoke test script
```

## NOTES

- Current database migrations include `drizzle/0000` through `drizzle/0005`.
- DB schema currently has **19 tables** (`external-sources` is included).
- Middleware file naming is still `middleware.ts`; Next.js 16 warns that `proxy` is the newer convention.
- There is an untracked standalone subproject folder `telegram-content-os-landing/`; it is separate from `src/app/[locale]/page.tsx` landing.
