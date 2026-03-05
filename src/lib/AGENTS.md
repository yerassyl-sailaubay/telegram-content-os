# LIB — BUSINESS LOGIC MODULES

## OVERVIEW

`src/lib` contains domain logic and integrations: AI generation/adaptation, external source ingestion, billing/quota, analytics, platform publishing, scheduling, storage, auth helpers, and Inngest functions.

## STRUCTURE

```
lib/
├── admin/            # Admin access helpers
├── ai/               # Gemini client + generation/adaptation engines + prompt builders
├── analytics/        # Metrics collection and Telegram enhanced analytics
├── billing/          # Stripe checkout/portal/webhook + quota/usage enforcement
├── broadcast/        # Multi-platform broadcast orchestration
├── inngest/          # Inngest client + registered background functions
├── platforms/        # LinkedIn/Twitter API clients + token encryption
├── scheduling/       # Scheduling engine, recurring processor, timezone helpers
├── sources/          # URL parsing + article/youtube extraction
├── storage/          # Supabase media storage client
├── supabase/         # Browser/server/middleware Supabase clients
├── telegram/         # Telegram parsing, conversion, and bot client helpers
├── date-utils.ts     # Shared date/time formatting helpers
└── utils.ts          # `cn()` and utility helpers
```

## MODULE MAP

| Module        | Entry Point                                       | Key Exports                                                               | Notes                                            |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| `admin/`      | `admin/index.ts`                                  | `requireAdmin`, role helpers                                              | Used by admin console/actions                    |
| `ai/`         | `ai/index.ts`                                     | `GoogleClient`, `GenerationEngine`, `AdaptationEngine`, `ChannelProfiler` | Main AI path is Gemini-based                     |
| `analytics/`  | `analytics/index.ts`                              | metrics collectors + helpers                                              | Includes Telegram-specific aggregations          |
| `billing/`    | `billing/index.ts`                                | checkout/portal/webhook + quota APIs                                      | `enforceQuota`, `enforceAiQuota`, usage counters |
| `broadcast/`  | `broadcast/index.ts`                              | `BroadcastOrchestrator`                                                   | Fanout publishing workflow                       |
| `inngest/`    | `inngest/client.ts`, `inngest/functions/index.ts` | Inngest client + 17 registered functions                                  | Includes production + example functions          |
| `platforms/`  | `platforms/index.ts`                              | `linkedin.*`, `twitter.*`, encryption                                     | OAuth + posting + retry logic                    |
| `scheduling/` | `scheduling/engine.ts`                            | `SchedulingEngine`, recurring processors                                  | Scheduling validation + queue creation           |
| `sources/`    | `sources/index.ts`                                | URL/article/youtube extraction                                            | Feeds `external_sources` + AI generation         |
| `storage/`    | `storage/client.ts`                               | `StorageClient`                                                           | Supabase bucket interactions                     |
| `supabase/`   | `supabase/{client,server,middleware}.ts`          | typed client factories                                                    | Middleware ordering is critical                  |
| `telegram/`   | `telegram/{client,parser,...}.ts`                 | `TelegramClient`, parsers/converters                                      | Handles webhook and publish formatting           |

## CONVENTIONS

- Keep module-local `types.ts` where practical; avoid dumping types globally.
- Keep tests in `__tests__/` alongside module code.
- Register every new Inngest function in `inngest/functions/index.ts`.
- Use namespace exports for platform modules (`linkedin`, `twitter`) to avoid collisions.
- For source processing, preserve the status lifecycle in `external_sources` (`pending` → `extracting` → `extracted`/`generating` → `completed`/`failed`).

## ANTI-PATTERNS

- Do NOT bypass quota checks around AI generation/adaptation workflows.
- Do NOT place logic between `createServerClient()` and `supabase.auth.getUser()` in middleware client creation.
- Do NOT use deprecated LinkedIn UGC endpoints; use Posts API flow.
- Do NOT import DB connection primitives directly from `postgres`; use `@/server/db`.

## INNGEST SNAPSHOT

Current registered functions (`src/lib/inngest/functions/index.ts`):

- AI: `adaptContent`, `developIdea`, `generateFromSource`, `profileChannel`, `repurposeContent`, `suggestCalendarFill`
- Scheduling/Broadcast: `executeScheduledPost`, `processRecurringSchedules`, `executeBroadcast`
- Sources/Telegram: `processExternalSource`, `telegramPostReceived`, `publishToTelegram`
- Analytics: `collectLinkedInAnalytics`, `collectTwitterAnalytics`, `collectTelegramAnalytics`
- Examples: `helloWorld`, `scheduledExample`
