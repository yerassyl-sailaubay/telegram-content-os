# Telegram Content OS

Telegram-first content operating system for creators who publish regularly.

One workspace for the full loop: capture an idea, ingest a Telegram post or a YouTube/article URL, draft with Gemini, schedule, publish back to Telegram, and review channel performance. Russian is the default locale; English is supported.

This is a working V1, not a landing-page mock. Auth, Telegram webhooks, AI workflows, calendar publishing, Stripe billing, and analytics are implemented.

## What it does

- Connect a Telegram channel and ingest posts (including media groups) over webhooks
- Keep a content library: ideas, drafts, scheduled and published posts
- Run 7 Gemini-powered workflows: source-to-Telegram, idea development, repurposing, calendar gap fill, channel profiling, AI writer, LinkedIn/X adaptation
- Schedule one-off and recurring Telegram posts, then publish
- Track Telegram growth, timing, and top content
- Enforce plan quotas with Stripe checkout, customer portal, and webhooks
- Localize the product in RU/EN

LinkedIn and X have backend plumbing; the shipped product experience is Telegram-first.

## Stack

- **App:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui
- **Data:** Supabase Postgres, Drizzle ORM, Row Level Security
- **Jobs:** Inngest (ingest, AI generation, publishing, analytics)
- **AI:** Google Gemini
- **Payments:** Stripe
- **Tests:** Vitest + Playwright

## Setup

```bash
bun install
cp .env.local.example .env.local
# fill in Supabase, Stripe, Gemini, Telegram, and Inngest values
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Dev server on port 3000 |
| `bun build` | Production build |
| `bun start` | Production server |
| `bun lint` | ESLint |
| `bun format` | Prettier |
| `bun test` | Unit tests (Vitest) |
| `bun test:e2e` | End-to-end tests (Playwright) |
| `bun inngest-dev` | Inngest dev worker |

## Layout

```
src/
├── app/           # App Router pages, auth, API routes, webhooks
├── components/    # Dashboard, content, calendar, billing, marketing UI
├── lib/           # AI, Telegram, billing, scheduling, Inngest functions
├── server/        # Server actions and Drizzle schema
├── messages/      # RU/EN catalogs
└── test/          # Shared test helpers
docs/              # Product, QA, and launch notes
e2e/               # Playwright specs
drizzle/           # SQL migrations
```

## Docs

- [Feature status](docs/features.md)
- [PRD](docs/prd.md)
- [AI features](docs/AI_FEATURES_AUDIT.md)
- [Testing plan](docs/testing-plan.md)
