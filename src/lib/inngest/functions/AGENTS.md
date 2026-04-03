# INNGEST FUNCTIONS KNOWLEDGE BASE

**Generated:** 2026-03-21
**Commit:** e02001e
**Branch:** work/telegram-content-os

## OVERVIEW

`src/lib/inngest/functions` contains 22 registered background job functions orchestrated by Inngest. Functions are organized by domain (AI, scheduling, Telegram, analytics, platforms) and registered in the canonical `index.ts` barrel.

## STRUCTURE

```
functions/
├── index.ts                    # Canonical registry — 22 functions exported
├── hello-world.ts              # Example function
├── scheduled-example.ts        # Cron example
├── broadcast.ts                # Multi-platform broadcast
│
├── ai/                         # AI generation functions (7)
│   ├── adapt-content.ts
│   ├── develop-idea.ts
│   ├── generate-from-source.ts
│   ├── profile-channel.ts
│   ├── repurpose-content.ts
│   ├── suggest-calendar-fill.ts
│   └── cleanup-prompt-cache.ts
│
├── scheduling/                 # Scheduling functions (2)
│   ├── execute-scheduled-post.ts
│   └── process-recurring.ts
│
├── telegram/                   # Telegram functions (3)
│   ├── inbox-received.ts
│   ├── post-received.ts
│   └── publish-to-telegram.ts
│
├── analytics/                  # Analytics collection (3)
│   ├── collect-linkedin-analytics.ts
│   ├── collect-twitter-analytics.ts
│   └── collect-telegram-analytics.ts
│
├── platforms/                  # Platform publishing (2)
│   ├── post-to-linkedin.ts
│   └── post-to-twitter.ts
│
└── sources/                    # Source processing (1)
    └── process-external-source.ts
```

## FUNCTION REGISTRY

Export all functions from `index.ts`:

```typescript
export const functions = [
  helloWorld, // Example
  scheduledExample, // Cron demo
  telegramInboxReceived, // Bot inbox handler
  telegramPostReceived, // Post ingestion
  executeScheduledPost, // Scheduled publishing
  profileChannel, // AI voice profiling
  adaptContent, // Cross-platform adaptation
  collectLinkedInAnalytics,
  collectTwitterAnalytics,
  collectTelegramAnalytics,
  executeBroadcast, // Multi-platform fanout
  processRecurringSchedules,
  processExternalSource, // URL → content
  generateFromSource, // AI generation
  developIdea, // Idea → draft
  repurposeContent, // Content variants
  cleanupPromptCache, // Maintenance
  publishToTelegram,
  suggestCalendarFill, // AI gap suggestions
  postToLinkedIn,
  postToTwitter,
];
```

## CONVENTIONS

- **Register in index.ts**: Every new function MUST be imported and added to the `functions` array.
- **Step-based execution**: Use `step.run()` for idempotent units, `step.sleep()` for delays, `step.waitForEvent()` for signals.
- **Event triggers**: Functions triggered by events include the event payload typing.
- **Quota enforcement**: AI functions MUST call `enforceAiQuota()` within a step before generation.
- **Idempotency**: Functions should be safely retryable — use event IDs for deduplication.
- **Tests**: Colocated in `__tests__/{function}.test.ts` with `vi.hoisted()` mocks.

## TESTING PATTERN

```typescript
const { mockInngestSend } = vi.hoisted(() => ({
  mockInngestSend: vi.fn(),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    createFunction: (_c: unknown, _t: unknown, fn: unknown) => ({ fn }),
    send: mockInngestSend,
  },
}));

// Extract and run handler
const handler = (await import("./my-function")).default;
const step = { run: vi.fn(), sendEvent: vi.fn() };
await handler.fn({ event: mockEvent, step });
```

## ANTI-PATTERNS

- Do NOT forget to register in `index.ts` — unregistered functions won't be served.
- Do NOT bypass quota checks in AI functions — always `enforceAiQuota()`.
- Do NOT place long-running work outside `step.run()` — breaks idempotency and retries.
- Do NOT use `console.log` — use Inngest's built-in logging or structured telemetry.

## NOTES

- Served via `src/app/api/inngest/route.ts` using `serve({ client, functions })`.
- Local dev: `bun inngest-dev` (requires Inngest dev server).
- Functions span AI, scheduling, Telegram, analytics, and cross-platform publishing.
