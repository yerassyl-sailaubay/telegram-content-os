# AI MODULE KNOWLEDGE BASE

**Generated:** 2026-03-21
**Commit:** e02001e
**Branch:** work/telegram-content-os

## OVERVIEW

`src/lib/ai` contains the AI provider layer, prompt builders, and generation engines. Built on Google Gemini with OpenRouter fallback. Handles content adaptation, generation, channel profiling, and prompt caching.

## STRUCTURE

```
ai/
├── index.ts                    # Barrel exports
├── types.ts                    # Core AI types (AIModel, TokenUsage, etc.)
├── provider.ts                 # AIProvider interface
│
├── google.ts                   # Google Gemini client
├── openrouter.ts               # OpenRouter fallback client
├── provider.ts                 # Provider abstraction
│
├── generation-engine.ts        # Content generation orchestration
├── adaptation-engine.ts        # Cross-platform content adaptation
├── channel-profiler.ts         # Channel voice profiling
├── source-summarizer.ts        # URL/article summarization
├── voice-to-post.ts            # Voice note → post conversion
│
├── telemetry.ts                # Token usage tracking
├── prompt-cache.ts             # Prompt caching for deduplication
│
└── prompts/                    # Prompt builders
    ├── adapt-linkedin.ts
    ├── adapt-twitter.ts
    ├── calendar-fill.ts
    ├── channel-profile.ts
    ├── generate-from-source.ts
    ├── idea-to-draft.ts
    ├── repurpose-telegram.ts
    └── translate.ts
```

## MODULE MAP

| File                   | Purpose             | Key Exports                            |
| ---------------------- | ------------------- | -------------------------------------- |
| `google.ts`            | Gemini API client   | `GoogleClient`, `CompletionResult`     |
| `generation-engine.ts` | Content generation  | `GenerationEngine`                     |
| `adaptation-engine.ts` | Platform adaptation | `AdaptationEngine`, `runQualityChecks` |
| `channel-profiler.ts`  | Voice profiling     | `ChannelProfiler`                      |
| `telemetry.ts`         | Cost tracking       | `recordAiTelemetry`, `estimateAiCost`  |
| `prompt-cache.ts`      | Cache layer         | `readPromptCache`, `writePromptCache`  |

## PROMPT BUILDERS

Prompts are organized by use case in `prompts/`:

| Prompt                      | Purpose                             |
| --------------------------- | ----------------------------------- |
| `buildLinkedInAdaptPrompt`  | Adapt content for LinkedIn          |
| `buildTwitterAdaptPrompt`   | Adapt content for Twitter/X         |
| `buildChannelProfilePrompt` | Analyze channel history for voice   |
| `generateFromSource`        | Create posts from URLs/articles     |
| `calendarFill`              | Suggest content for calendar gaps   |
| `ideaToDraft`               | Expand idea into full draft         |
| `repurposeTelegram`         | Create variants from Telegram posts |

## CONVENTIONS

- **Token tracking**: All completions record telemetry via `recordAiTelemetry()`.
- **Prompt caching**: Use `createPromptCacheKey()` + `read/writePromptCache()` for deterministic prompts.
- **Error handling**: `AIProviderError` for provider failures with retry logic.
- **Quality checks**: `runQualityChecks()` validates adapted content length, hashtags, etc.
- **Tests**: Colocated in `__tests__/*.test.ts`, mock Gemini client with `vi.hoisted()`.

## ANTI-PATTERNS

- Do NOT call AI providers directly from actions — use `GenerationEngine` or `AdaptationEngine`.
- Do NOT skip telemetry — always record token usage for billing.
- Do NOT bypass prompt cache for deterministic prompts — use cache layer.
- Do NOT hardcode prompts in actions — extract to `prompts/` modules.

## TESTING

```typescript
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));
```

## MODEL TIERS

| Model                  | Tier         | Use Case                          |
| ---------------------- | ------------ | --------------------------------- |
| `gemini-1.5-flash`     | fast         | Simple adaptations, short content |
| `gemini-1.5-pro`       | standard     | Most generation tasks             |
| `gemini-2.0-flash-exp` | experimental | New features, testing             |

## NOTES

- Primary provider: Google Gemini (via `@google/genai`).
- Fallback: OpenRouter for provider diversity.
- Prompt cache reduces token costs for repeated prompts.
- Channel profiler analyzes last 50 posts to extract voice characteristics.
