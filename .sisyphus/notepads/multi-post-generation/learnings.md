## sourceType bug fix (2026-03-04)

### Problem

`generation-engine.ts` hardcoded `sourceType: "article"` in the `source_to_telegram` case, ignoring actual source type (youtube vs article).

### Fix

- Added `sourceType?: "youtube" | "article" | "unknown"` to `GenerationOptions` in `src/lib/ai/types.ts`
- `generation-engine.ts` now uses `request.options?.sourceType ?? "article"` (defaults to article as safe fallback)
- `generate-from-source.ts` Inngest function now:
  - Loads `sourceUrl` from `contentLibrary` row (was previously dropping it)
  - Calls `parseUrl(sourceUrl).type` to detect source type
  - Passes detected type as `options: { sourceType }` to the engine

### Key insight: SourceType vs contentSourceTypeEnum

Two different "source type" concepts exist:

- `SourceType` in `src/lib/sources/types.ts`: `"youtube" | "article" | "unknown"` — extraction-level type
- `contentSourceTypeEnum` in DB schema: `"telegram_import" | "idea" | "repurposed" | "external_source" | "ai_generated"` — pipeline-level type
  The `contentLibrary.sourceType` DB column is the pipeline type, NOT the extraction type. The extraction type must be derived from `sourceUrl` via `parseUrl()`.

## externalSources table audit (2026-03-04)

### Finding

`externalSources` table exists in schema (`src/server/db/schema/external-sources.ts`) and is exported in the barrel (`schema/index.ts`) and tested (`__tests__/external-sources.test.ts`), but is **never used in any business logic**.

The pipeline (`process-external-source.ts`) bypasses it entirely: extracts content → stores directly in `contentLibrary` with `sourceType: "external_source"`.

### Decision

No dead code to remove. Schema export + schema test are valid infrastructure. The table may have been intended for a "queue" pattern that was later simplified. No imports/queries of `externalSources` exist outside schema layer.

### Pre-existing test failures (unrelated)

- `src/components/ui/__tests__/ux-states.test.tsx` — missing `@/app/(dashboard)/dashboard/error` file
- `src/server/actions/__tests__/channels.test.ts` — 2 tests failing (error message mismatch, mock assertion)
  These failures exist before this task and are not caused by any of these changes.

## Multi-post generation implementation (2026-03-05)

### What was built

Modified the `source_to_telegram` pipeline to generate 3 posts from a single video/URL source instead of 1.

### Architecture decisions

1. **Separator approach for multi-post AI output**: Rather than making N separate AI calls, a single call returns all posts separated by `---POST_SEPARATOR---`. This is cheaper and faster. `parseMultiPostResponse()` in `generation-engine.ts` handles parsing.

2. **Parent-child content model**: Added `parentId` (nullable UUID) to `contentLibrary` table as a self-referencing FK. The original content item (with raw transcript/article) becomes the "parent" and gets archived. Each generated post is a separate "child" row with `status: "draft"` and `sourceType: "ai_generated"`.

3. **`POSTS_PER_SOURCE = 3` constant**: Exported from `src/lib/ai/prompts/generate-from-source.ts`. Configurable but defaults to 3. Passed to prompt as `numPosts` option.

4. **Inngest step renamed**: `store-result` → `store-children` to reflect the bulk insert of child rows. Uses `db.insert(contentLibrary).values(childRows)` for a single batch insert.

### Key gotchas

- `contentStatusEnum` has no `"processed"` value — used `"archived"` for parent after children are created.
- `GenerationResult.content` already had `string | string[]` union type but `string[]` was unused — we now use it for `source_to_telegram`.
- In Vitest, `vi.clearAllMocks()` does NOT clear `mockReturnValue` set in `vi.mock()` factories — only clears calls/instances/results. Chain mocks persist.
- Mock chain gotcha: `mockDbWhere.mockResolvedValueOnce(undefined)` gets consumed on the FIRST `.where()` call in the chain, not the intended one. Solution: don't mock terminal `.where()` as resolved — `await chain` resolves naturally.

### Files modified

- `src/lib/ai/prompts/generate-from-source.ts` — multi-post prompt + POSTS_PER_SOURCE
- `src/lib/ai/generation-engine.ts` — parseMultiPostResponse() + array return
- `src/server/db/schema/content-library.ts` — parentId column + relations
- `src/lib/inngest/functions/ai/generate-from-source.ts` — bulk child creation
- Tests: 3 files, 44 tests total, all pass

### Build verification

- `bun run build` passes cleanly (Next.js 16.1.6 Turbopack, 52 static pages, 0 errors)
- All 44 tests across modified test files pass
- 16 pre-existing test failures in unrelated files (settings, channels, billing, ux-states)
