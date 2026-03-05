# LIB — BUSINESS LOGIC MODULES

**Overview:** Business logic modules — AI, billing, platforms, scheduling, analytics, Telegram, and broadcast

## STRUCTURE

```
lib/
├── ai/               # OpenRouter + adaptation engine + prompt builders (8 files)
├── analytics/        # Cross-platform metrics collector (4 files)
├── billing/          # Stripe + plans + quota + usage tracking (9 files)
├── broadcast/        # Multi-platform broadcast orchestrator (4 files)
├── inngest/          # Background jobs client + 11 functions
├── platforms/        # Twitter + LinkedIn API clients (6 files)
├── scheduling/       # Engine + recurring schedules + timezone (4 files)
├── storage/          # Supabase storage client (1 file)
├── supabase/         # Auth helpers: server.ts, middleware.ts, client.ts
├── telegram/         # Bot API client + message parser + converters (7 files)
├── date-utils.ts     # Shared date formatting
├── utils.ts          # cn() helper (clsx + tailwind-merge)
└── utils.test.ts
```

## MODULE MAP

| Module      | Entry Point                    | Key Exports                                                               | Notes                                                            |
| ----------- | ------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| ai/         | index.ts                       | `AdaptationEngine`, `OpenRouterClient`, `ChannelProfiler`                 | 2-step pipeline: translate → adapt. Prompts in `prompts/` subdir |
| analytics/  | index.ts                       | `MetricsCollector`                                                        | Collects from LinkedIn, Twitter, Telegram                        |
| billing/    | index.ts                       | `enforceQuota`, `PLANS`, `getStripe`, `getCurrentUsage`, `incrementUsage` | Pro tier uses `Infinity` for unlimited                           |
| broadcast/  | index.ts                       | `BroadcastOrchestrator`                                                   | Parallel multi-platform posting                                  |
| inngest/    | client.ts + functions/index.ts | 11 background functions                                                   | Event-driven; see root AGENTS.md for full function list          |
| platforms/  | index.ts                       | `linkedin.*`, `twitter.*` (namespace exports)                             | Namespace exports avoid name collisions                          |
| scheduling/ | engine.ts                      | `SchedulingEngine`, `processRecurring`                                    | `timezone.ts` handles TZ conversions                             |
| storage/    | client.ts                      | `StorageClient`                                                           | Supabase file storage                                            |
| supabase/   | server.ts, middleware.ts       | `createClient`, `updateSession`                                           | `middleware.ts` has critical anti-pattern — see below            |
| telegram/   | parser.ts, client.ts           | `parseTelegramMessage`, `TelegramClient`                                  | UTF-16 offset handling for emoji/surrogate pairs                 |

## CONVENTIONS

- Each module has a barrel `index.ts` (except `scheduling/`, `telegram/`, `supabase/` — use named entry files)
- Types co-located in `types.ts` per module, not in a global types dir
- Tests live in `__tests__/` dirs alongside source
- Platform modules use namespace exports: `export * as linkedin from "./linkedin"`
- AI prompts: one file per platform at `ai/prompts/adapt-{platform}.ts`
- New Inngest functions must be registered in `inngest/functions/index.ts`

## ANTI-PATTERNS

- Do NOT skip `enforceQuota` before any AI operation
- Do NOT use the LinkedIn UGC API — deprecated. `linkedin.ts` already uses Posts API
- Do NOT place any code between `createServerClient()` and `supabase.auth.getUser()` in `supabase/middleware.ts` — causes random logouts
- Do NOT import `postgres` directly — always use `db` from `@/server/db`
