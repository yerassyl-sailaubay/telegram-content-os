# SERVER KNOWLEDGE BASE

## OVERVIEW

Server-side logic: server actions + Drizzle ORM database layer

## STRUCTURE

```
server/
├── actions/          # 10 server action modules + __tests__/
│   ├── analytics.ts
│   ├── auth.ts
│   ├── channels.ts
│   ├── content.ts
│   ├── crosspost.ts
│   ├── dashboard.ts
│   ├── media.ts
│   ├── schedule.ts
│   ├── settings.ts
│   └── welcome.ts
└── db/
    ├── index.ts      # Lazy Proxy singleton — never import postgres directly
    ├── schema/        # 19 Drizzle ORM table schemas + index.ts barrel
    └── seed.ts
```

## WHERE TO LOOK

| Task              | Location                                                   |
| ----------------- | ---------------------------------------------------------- |
| Add server action | `actions/{domain}.ts`                                      |
| Add DB table      | `db/schema/{table}.ts` + re-export in `db/schema/index.ts` |
| Modify DB client  | `db/index.ts` (Proxy singleton)                            |
| Add seed data     | `db/seed.ts`                                               |

## CONVENTIONS

- **ActionResult**: Every action returns `{ success: true, data: T }` | `{ success: false, error: string }`. No exceptions.
- **DB import**: `import { db } from "@/server/db"`. The Proxy in `db/index.ts` handles lazy init and HMR-safe caching on `globalThis`.
- **Schema files**: one table per file in `db/schema/`, re-exported via `db/schema/index.ts` barrel.
- **19 schema tables**: `users`, `telegram-channels`, `telegram-posts`, `cross-posts`, `platform-connections`, `subscriptions`, `usage-tracking`, `schedules`, `recurring-schedules`, `media-files`, `content-library`, `channel-profiles`, `channel-metrics`, `post-analytics`, `analytics-sync-log`, `user-preferences`, `welcome-messages`, `welcome-templates`.
- **Auth first**: actions get the user from Supabase before any DB operation.
- **Revalidation**: call `revalidatePath()` after mutations.
- **Quota**: call `enforceQuota` before any AI operation — never skip it.

## ANTI-PATTERNS

- Do NOT import `postgres` directly — use `db` from `@/server/db`.
- Do NOT return raw values from actions — always wrap in `ActionResult<T>`.
- Do NOT skip the auth check — every action verifies the user first.
- Do NOT add a schema file without re-exporting it from `db/schema/index.ts`.
