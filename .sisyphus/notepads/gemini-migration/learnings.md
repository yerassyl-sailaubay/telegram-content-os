## Gemini Migration Learnings

### SDK

- Package: `@google/genai` (NOT `@google/generative-ai` which is old)
- Init: `new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY})`
- Call: `ai.models.generateContent({model, contents, config})`
- Response: `response.text` for text, `response.usageMetadata` for tokens

### Models

- pro: `gemini-3-pro-preview`
- default: `gemini-3-flash-preview`
- fast: `gemini-3-flash-preview` with `thinkingConfig: { thinkingLevel: 'MINIMAL' }`

### Message Format Mapping

- OpenRouter `{role: "system", content}` → Google `config.systemInstruction`
- OpenRouter `{role: "user", content}` → Google `{role: "user", parts: [{text}]}`
- OpenRouter `{role: "assistant", content}` → Google `{role: "model", parts: [{text}]}`

### Integration Points Pattern

All Inngest functions use dynamic imports inside step.run:

```typescript
const { OpenRouterClient } = await import("@/lib/ai/openrouter");
```

These need to become:

```typescript
const { GoogleClient } = await import("@/lib/ai/google");
```

### Key Interfaces to Preserve

- `CompletionResult { content, model, tokenUsage }`
- `AIProvider { adaptContent, analyzeChannelProfile }`
- `CompleteOptions { maxRetries, baseDelayMs, timeoutMs }`

### Task 1 Completion Notes (Replace OpenRouter with Google Gemini)

- `@google/genai@1.43.0` installed
- GoogleClient created at `src/lib/ai/google.ts` — mirrors OpenRouterClient's public API exactly
- Google SDK errors have `.status` property (not `.statusCode`) — mapped to AIProviderError
- Google SDK supports `config.abortSignal` for timeout (AbortController pattern)
- `response.text` is a getter (not a method) — returns `string | undefined`
- Usage metadata fields: `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount` (all optional)
- Decided NOT to use thinkingConfig for fast tier initially — keeping it simple, can optimize later
- Default timeout bumped to 60s (from 30s) since Gemini models may take longer for thinking
- `openrouter.ts` preserved untouched for reference — no longer imported anywhere
- All 9 integration points updated: 1 server action + 7 Inngest functions + 1 broadcast function
- Zero TypeScript errors across all changed files
