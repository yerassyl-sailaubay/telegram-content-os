# SERVER KNOWLEDGE BASE

## OVERVIEW

`src/server` contains server actions and the Drizzle ORM data layer. It is the main place for auth-scoped mutations/queries and DB schema definitions.

## STRUCTURE

```
server/
├── actions/          # 20 server action modules + tests
│   ├── admin.ts
│   ├── ai-writer.ts
│   ├── analytics.ts
│   ├── analytics-telegram.ts
│   ├── auth.ts
│   ├── calendar.ts
│   ├── channels.ts
│   ├── content.ts
│   ├── crosspost.ts
│   ├── dashboard.ts
│   ├── develop-idea.ts
│   ├── media.ts
│   ├── publish-telegram.ts
│   ├── repurpose.ts
│   ├── schedule.ts
│   ├── settings.ts
│   ├── sources.ts
│   ├── telegram-post.ts
│   ├── telegram-post-edit.ts
│   └── welcome.ts
└── db/
    ├── index.ts      # Lazy DB singleton proxy
    ├── schema/       # 19 table schema files + barrel exports
    └── seed.ts
```

## WHERE TO LOOK

| Task                    | Location                                         |
| ----------------------- | ------------------------------------------------ |
| Add/update action       | `src/server/actions/{domain}.ts`                 |
| Add DB table            | `src/server/db/schema/AGENTS.md`                 |
| Adjust DB bootstrapping | `src/server/db/index.ts`                         |
| Seed data updates       | `src/server/db/seed.ts`                          |
| Test action behavior    | `src/server/actions/__tests__/{domain}.test.ts`  |
| Test schema shape       | `src/server/db/schema/__tests__/{table}.test.ts` |

## CONVENTIONS

- **ActionResult contract**: return `{ success: true, data }` or `{ success: false, error }`.
- **Auth-first pattern**: verify current user before user-scoped DB reads/writes.
- **DB import**: always `import { db } from "@/server/db"`.
- **Schema hygiene**: one table per schema file; keep `schema/index.ts` in sync; full schema rules live in `src/server/db/schema/AGENTS.md`.
- **Revalidation**: use `revalidatePath` after state-changing actions where UI cache depends on it.

## DB SCHEMA

- Full table, relation, and enum inventory lives in `src/server/db/schema/AGENTS.md`.
- New schema work requires a file in `src/server/db/schema/`, a matching export in `src/server/db/schema/index.ts`, and migration/test updates.

## ANTI-PATTERNS

- Do NOT import `postgres` directly in actions.
- Do NOT throw raw values from action boundaries where `ActionResult` should be returned.
- Do NOT skip ownership/auth checks on user data.
- Do NOT add schema files without exporting them in `src/server/db/schema/index.ts`.
