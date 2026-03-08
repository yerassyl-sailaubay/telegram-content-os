# DB SCHEMA KNOWLEDGE BASE

## OVERVIEW

`src/server/db/schema` is the canonical Drizzle schema layer. Each file owns one table plus its colocated relations and enums; `index.ts` is the barrel every runtime import flows through.

## WHERE TO LOOK

| Task                           | Location                                         | Notes                                            |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| Add new table                  | `src/server/db/schema/{table}.ts`                | Keep table, relations, and enums together        |
| Export schema surface          | `src/server/db/schema/index.ts`                  | Required for runtime imports to see the new file |
| Add schema regression test     | `src/server/db/schema/__tests__/{table}.test.ts` | Assert enum values and exported columns          |
| Inspect self-relations/indexes | `src/server/db/schema/content-library.ts`        | Best example of indexes + self-reference         |
| Inspect ingestion status enums | `src/server/db/schema/external-sources.ts`       | Best example of pipeline lifecycle enums         |

## INVENTORY

| File                      | Exports                                                                                               | Notes                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------- |
| `users.ts`                | `users`, `usersRelations`                                                                             | Base user record                  |
| `subscriptions.ts`        | `subscriptions`, `subscriptionsRelations`, `planEnum`, `subscriptionStatusEnum`                       | Billing plan state                |
| `telegram-channels.ts`    | `telegramChannels`, `telegramChannelsRelations`                                                       | Connected channels                |
| `telegram-posts.ts`       | `telegramPosts`, `telegramPostsRelations`                                                             | Ingested Telegram posts           |
| `platform-connections.ts` | `platformConnections`, `platformConnectionsRelations`, `platformEnum`                                 | OAuth token storage               |
| `cross-posts.ts`          | `crossPosts`, `crossPostsRelations`, `crossPostStatusEnum`                                            | Adapted/published post state      |
| `schedules.ts`            | `schedules`, `schedulesRelations`, `scheduleStatusEnum`, `scheduleTargetTypeEnum`                     | Scheduled publishing              |
| `content-library.ts`      | `contentLibrary`, `contentLibraryRelations`, `contentSourceTypeEnum`, `contentStatusEnum`             | Drafts, templates, self-relations |
| `media-files.ts`          | `mediaFiles`, `mediaFilesRelations`                                                                   | Uploaded media                    |
| `channel-profiles.ts`     | `channelProfiles`, `channelProfilesRelations`                                                         | AI profile metadata               |
| `usage-tracking.ts`       | `usageTracking`, `usageTrackingRelations`                                                             | Usage metering                    |
| `welcome-messages.ts`     | `welcomeMessages`, `welcomeMessagesRelations`                                                         | Sent welcome log                  |
| `post-analytics.ts`       | `postAnalytics`, `postAnalyticsRelations`                                                             | Per-post metrics                  |
| `channel-metrics.ts`      | `channelMetrics`, `channelMetricsRelations`                                                           | Channel metric snapshots          |
| `analytics-sync-log.ts`   | `analyticsSyncLog`, `analyticsSyncLogRelations`                                                       | Analytics sync runs               |
| `welcome-templates.ts`    | `welcomeTemplates`, `welcomeTemplatesRelations`                                                       | Welcome presets                   |
| `user-preferences.ts`     | `userPreferences`, `userPreferencesRelations`, `aiModelEnum`, `adaptationToneEnum`                    | User + AI settings                |
| `recurring-schedules.ts`  | `recurringSchedules`, `recurringSchedulesRelations`, `recurringFrequencyEnum`                         | Recurring automation              |
| `external-sources.ts`     | `externalSources`, `externalSourcesRelations`, `externalSourceTypeEnum`, `sourceProcessingStatusEnum` | URL ingestion lifecycle           |

## CONVENTIONS

- One schema file owns its `pgTable(...)`, `relations(...)`, and colocated `pgEnum(...)` definitions.
- Export both `{table}` and `{table}Relations` from the same file; then re-export them from `src/server/db/schema/index.ts`.
- Keep DB enum identifiers snake_case in Postgres, but TypeScript export names camelCase like `{entity}{Field}Enum`.
- Use `timestamp(..., { withTimezone: true })` for persisted timestamps.
- Put indexes in the `pgTable(..., (table) => [...])` callback, not in ad hoc helpers.
- Add or update schema tests in `__tests__/` when enum values, columns, or relation exports change.

## CHECKLIST

1. Create `src/server/db/schema/{table}.ts` with the table, relations, and any colocated enums.
2. Export the new symbols from `src/server/db/schema/index.ts`.
3. Add the matching migration and update `src/server/db/schema/__tests__/` if the table shape or enum values changed.

## ANTI-PATTERNS

- Do NOT add a schema file without exporting it from `src/server/db/schema/index.ts`.
- Do NOT split a table and its relations across different files.
- Do NOT change enum order or values silently; schema tests assert exact arrays.
- Do NOT import `db` from schema files; keep this layer declarative.
