# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-09
**Commit:** 47dc025
**Branch:** work/telegram-content-os

## OVERVIEW

AI-powered content operating system for Telegram creators. The app ingests Telegram and external sources, generates/adapts content with Gemini, and handles scheduling, cross-posting, analytics, and billing.

Core stack: Next.js 16 App Router + TypeScript strict + Supabase + Drizzle ORM + Inngest + Stripe.

## STRUCTURE

```
src/
├── app/                        # App Router pages, layouts, route handlers; see src/app/AGENTS.md
│   ├── [locale]/               # Locale shell (en, ru; default: ru)
│   └── api/                    # OAuth, billing, health, Inngest, Telegram; see src/app/api/AGENTS.md
├── components/                 # UI + feature components; see src/components/AGENTS.md
├── lib/                        # Business/domain logic + Inngest functions; see src/lib/AGENTS.md
├── server/                     # Server actions + DB access; see src/server/AGENTS.md
│   └── db/schema/              # Table, enum, relation inventory; see src/server/db/schema/AGENTS.md
├── hooks/                      # Small shared hooks
├── i18n/                       # next-intl routing/navigation wrappers
├── messages/                   # en.json / ru.json message catalogs
├── test/                       # Shared test setup/factories/mocks
└── middleware.ts               # i18n + Supabase auth request pipeline
```

## WHERE TO LOOK

| Task                                 | Location                                   | Notes                                                   |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------- |
| Add or move page/layout routes       | `src/app/AGENTS.md`                        | Route groups, locale rules, loading/error placement     |
| Add API route or webhook             | `src/app/api/AGENTS.md`                    | Named HTTP methods, OAuth/webhook constraints           |
| Add feature component                | `src/components/AGENTS.md`                 | Feature folders, large component hotspots, shadcn rules |
| Add business logic or background job | `src/lib/AGENTS.md`                        | Module map, Inngest registry, quota rules               |
| Add server action                    | `src/server/AGENTS.md`                     | `ActionResult<T>`, auth-first patterns, DB access       |
| Add DB table/schema                  | `src/server/db/schema/AGENTS.md`           | Barrel exports, enums, relations, schema tests          |
| Adjust locale config/navigation      | `src/i18n/{routing,request,navigation}.ts` | Default locale is `ru`                                  |
| Update shared test utilities         | `src/test/`                                | Helpers only; feature tests stay colocated              |

## CODE MAP

| Symbol         | Type         | Location                             | Refs | Role                                              |
| -------------- | ------------ | ------------------------------------ | ---- | ------------------------------------------------- |
| `middleware`   | function     | `src/middleware.ts`                  | 1    | Request gate for i18n + auth redirects            |
| `db`           | proxy export | `src/server/db/index.ts`             | 244  | Canonical DB access surface across app/lib/server |
| `functions`    | constant     | `src/lib/inngest/functions/index.ts` | 3    | Canonical Inngest registration array              |
| `LocaleLayout` | async layout | `src/app/[locale]/layout.tsx`        | n/a  | Owns `<html>`, fonts, providers, analytics        |

## CONVENTIONS

- **Package manager**: Bun in the main app; use `bun install`, `bun run ...`, `bunx ...`.
- **Imports**: `@/` aliases `src/`.
- **Formatting**: Prettier with double quotes, semicolons, trailing commas, 100-column width, Tailwind plugin ordering.
- **TypeScript**: strict mode is on; the main `tsconfig.json` excludes `telegram-content-os-landing/`.
- **DB access**: import `db` from `@/server/db`; do not open direct `postgres` clients in app code.
- **i18n**: default locale is `ru`; user-facing strings live in `src/messages/{locale}.json`.
- **Tests**: Vitest + Testing Library for unit tests, Playwright for e2e, colocated `__tests__/` when practical.

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

## BACKGROUND JOBS

- Canonical function inventory lives in `src/lib/AGENTS.md`.
- Register every new function in `src/lib/inngest/functions/index.ts`.

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
bunx tsc --noEmit    # CI typecheck command
```

## DEPLOYMENT (HEROKU)

- Heroku app: `morning-plains-48170`.
- Deploys are currently triggered by pushing to the Heroku git remote (`heroku/main`), not by GitHub pushes alone.
- `git push origin main` updates GitHub only.
- To redeploy on Heroku, run `git push heroku main` (or `git push heroku HEAD:main`).
- GitHub `main` can auto-deploy only if Heroku Deploy -> GitHub integration with Automatic Deploys is explicitly enabled.

## NOTES

- Current database migrations include `drizzle/0000` through `drizzle/0005`.
- DB schema currently has **19 tables**; full inventory lives in `src/server/db/schema/AGENTS.md`.
- Middleware file naming is still `middleware.ts`; Next.js 16 warns that `proxy` is the newer convention.
- `telegram-content-os-landing/` is a separate Vite app excluded from the main `tsconfig.json`; it is not the production landing route.
