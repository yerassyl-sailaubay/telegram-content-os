# SERVER ACTIONS KNOWLEDGE BASE

**Generated:** 2026-03-21
**Commit:** e02001e
**Branch:** work/telegram-content-os

## OVERVIEW

`src/server/actions` contains 20 centralized server action modules handling auth-scoped mutations and queries. This is a **non-standard pattern** for Next.js App Router (actions are typically colocated with routes), but centralizes auth-first patterns, `ActionResult` contracts, and DB access for better discoverability and testing.

## STRUCTURE

```
actions/
├── admin.ts              # Admin console operations
├── ai-writer.ts          # AI content generation actions
├── analytics.ts          # Cross-platform analytics
├── analytics-telegram.ts # Telegram-specific analytics
├── auth.ts               # Authentication helpers
├── calendar.ts           # Calendar gap detection
├── channels.ts           # Telegram channel CRUD + connect
├── content.ts            # Content library CRUD
├── crosspost.ts          # Cross-platform publishing
├── dashboard.ts          # Dashboard data aggregation
├── develop-idea.ts       # AI idea development
├── media.ts              # Media file management
├── publish-telegram.ts   # Telegram publishing
├── repurpose.ts          # Content repurposing
├── schedule.ts           # Post scheduling
├── settings.ts           # User settings
├── sources.ts            # External source ingestion
├── telegram-bot.ts       # Bot connection/linking
├── telegram-post.ts      # Telegram post creation
├── telegram-post-edit.ts # Telegram post editing
└── welcome.ts            # Welcome message templates
```

## ACTION INVENTORY

| Action         | Domain     | Key Operations                                                                     |
| -------------- | ---------- | ---------------------------------------------------------------------------------- |
| `channels.ts`  | Channels   | `listChannels`, `connectChannel`, `disconnectChannel`, `syncChannelPosts`          |
| `content.ts`   | Content    | `listContent`, `createContent`, `updateContent`, `deleteContent`, `archiveContent` |
| `schedule.ts`  | Scheduling | `createSchedule`, `updateSchedule`, `cancelSchedule`, `listSchedules`              |
| `sources.ts`   | Sources    | `createExternalSource`, `processExternalSource`                                    |
| `ai-writer.ts` | AI         | `generateContent`, `analyzeChannelVoice`                                           |
| `dashboard.ts` | Dashboard  | `getDashboardData`, `getQuickStats`, `getActivityFeed`                             |
| `admin.ts`     | Admin      | `getAdminMetrics`, `updateUserBilling`, `listRecentEvents`                         |

## CONVENTIONS

- **ActionResult contract**: All actions return `{ success: true, data: T }` or `{ success: false, error: string }`.
- **Auth-first pattern**: Verify current user via `getCurrentUserId()` before any user-scoped DB operations.
- **DB import**: Always `import { db } from "@/server/db"` — never import `postgres` directly.
- **Revalidation**: Use `revalidatePath` after state-changing actions where UI cache depends on it.
- **Performance monitoring**: Hot routes use `measurePerfStep()` for granular timing (see `dashboard.ts`, `channels.ts`).

## TESTING

- Tests colocated in `__tests__/{action}.test.ts`.
- Use `vi.hoisted()` for mock setup before imports.
- Mock Drizzle with `createSelectChain()` / `createMutationChain()` helpers.
- Mock Supabase auth with `getCurrentUserId()` returning test user.

## ANTI-PATTERNS

- Do NOT import `postgres` directly — use the `db` proxy from `@/server/db`.
- Do NOT skip auth checks — always call `getCurrentUserId()` or similar.
- Do NOT throw raw errors — wrap in `ActionResult` contract.
- Do NOT hardcode locale paths in `revalidatePath()` — derive from current locale context.

## NOTES

- Total: ~5,300 lines across 20 action modules.
- Densest modules: `channels.ts` (~400 lines), `content.ts`, `schedule.ts`.
- Actions are imported by server components and client components (via form actions).
