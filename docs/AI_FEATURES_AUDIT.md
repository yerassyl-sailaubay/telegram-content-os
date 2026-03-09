# AI Features Architecture Audit

**Generated:** 2026-03-09  
**Branch:** work/telegram-content-os  
**Commit:** d47f4d2

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core AI Components](#core-ai-components)
4. [AI Features Inventory](#ai-features-inventory)
5. [Database Schema](#database-schema)
6. [Prompts & Configuration](#prompts--configuration)
7. [External Dependencies](#external-dependencies)
8. [Issues & Recommendations](#issues--recommendations)

---

## Executive Summary

The application has **7 distinct AI features** powered by Google Gemini:

| Feature                                      | Status | Complexity |
| -------------------------------------------- | ------ | ---------- |
| Source-to-Telegram Generation                | Active | High       |
| Idea Development                             | Active | Medium     |
| Content Repurposing                          | Active | Medium     |
| Calendar Gap Fill                            | Active | Medium     |
| Channel Profiling                            | Active | Low        |
| Cross-Platform Adaptation (LinkedIn/Twitter) | Active | High       |
| AI Writer (Direct Post Generation)           | Active | Medium     |

**Total Files:** 25+ AI-related files  
**Lines of Code:** ~3,500+  
**Test Coverage:** Partial (some features have tests, others don't)

---

## Architecture Overview

### High-Level Flow

```
User Action
    ↓
Server Action / Component
    ↓
Inngest Event (async queue)
    ↓
AI Function
    ↓
GenerationEngine / AdaptationEngine
    ↓
GoogleClient (Gemini API)
    ↓
Store Result in DB
```

### Key Directories

```
src/lib/ai/
├── Core Engines
│   ├── generation-engine.ts      # Content generation (4 types)
│   ├── adaptation-engine.ts      # Platform adaptation (LinkedIn/Twitter)
│   ├── channel-profiler.ts       # Channel voice analysis
│   └── google.ts                 # Gemini API client
├── Prompts
│   ├── generate-from-source.ts   # YouTube/article → Telegram
│   ├── repurpose-telegram.ts     # Content repurposing
│   ├── idea-to-draft.ts          # Idea development
│   ├── calendar-fill.ts          # Calendar suggestions
│   ├── adapt-linkedin.ts         # LinkedIn adaptation
│   ├── adapt-twitter.ts          # Twitter adaptation
│   ├── channel-profile.ts        # Channel analysis
│   └── translate.ts              # Translation
└── Types
    └── types.ts                  # All AI type definitions

src/lib/inngest/functions/ai/
├── generate-from-source.ts       # External source → posts
├── develop-idea.ts               # Expand idea → draft
├── repurpose-content.ts          # Repurpose existing content
├── suggest-calendar-fill.ts      # Fill calendar gaps
├── profile-channel.ts            # Analyze channel voice
└── adapt-content.ts              # Adapt for LinkedIn/Twitter

src/server/actions/
├── ai-writer.ts                  # Direct AI post generation
├── repurpose.ts                  # Trigger repurposing
├── develop-idea.ts               # Trigger idea development
└── sources.ts                    # Trigger source processing
```

---

## Core AI Components

### 1. GoogleClient (`src/lib/ai/google.ts`)

**Purpose:** Low-level Gemini API client

**Key Methods:**

- `complete()` - Single completion request
- `completeWithFallback()` - With retry logic
- `adaptContent()` - Platform adaptation pipeline
- `analyzeChannelProfile()` - Channel voice analysis

**Configuration:**

```typescript
const AI_MODELS = {
  default: { id: "gemini-3-flash-preview", ... },
  fast: { id: "gemini-3-flash-preview", ... },
  pro: { id: "gemini-3-pro-preview", ... }
};
```

**Retry Logic:** 3 retries with exponential backoff (1s, 2s, 4s)

---

### 2. GenerationEngine (`src/lib/ai/generation-engine.ts`)

**Purpose:** Content generation orchestrator

**Supported Types:**
| Type | Temperature | Max Tokens | Model Tier |
|------|-------------|------------|------------|
| `source_to_telegram` | 0.5 | 4000 | default |
| `repurpose` | 0.6 | 4000 | default |
| `idea_to_draft` | 0.7 | 4000 | fast |
| `calendar_fill` | 0.7 | 4000 | pro |

**Pipeline:**

1. Build prompt based on type
2. Select model tier
3. Get temperature
4. Call GoogleClient
5. Parse response (split by `---POST_SEPARATOR---` for multi-post)

---

### 3. AdaptationEngine (`src/lib/ai/adaptation-engine.ts`)

**Purpose:** Cross-platform content adaptation

**Platforms:**

- LinkedIn (max 3000 chars)
- Twitter (max 280 chars per tweet)

**Pipeline:**

1. Extract plain text from parsed Telegram content
2. Call AI for translation + adaptation
3. Run quality checks (English, length, hashtags)
4. For Twitter: split into thread if > 280 chars

**Quality Checks:**

- `isEnglish()` - >90% Latin characters
- `fitsLengthLimit()` - Platform-specific
- `hasHashtags()` - At least one hashtag

---

### 4. ChannelProfiler (`src/lib/ai/channel-profiler.ts`)

**Purpose:** Analyze channel posts to extract voice profile

**Output:**

```typescript
{
  niche: string;        // e.g., "Technology & AI"
  tone: string;         // e.g., "Professional but conversational"
  topTopics: string[];  // e.g., ["AI", "Startups", "Productivity"]
  language: string;     // e.g., "ru" | "en"
}
```

**Input:** Up to 50 recent posts

---

## AI Features Inventory

### Feature 1: Source-to-Telegram Generation

**Purpose:** Convert YouTube videos or articles into Telegram posts

**Entry Points:**

- Server Action: `createFromUrl()` in `sources.ts`
- UI: "Create from URL" button in dashboard

**Flow:**

```
User pastes URL
    ↓
createFromUrl() validates URL
    ↓
Insert externalSources record (status: pending)
    ↓
Inngest: processExternalSource
    ↓
Extract content (YouTube transcript or article text)
    ↓
Insert contentLibrary record
    ↓
Emit: ai/content.generate-from-source
    ↓
Inngest: generateFromSource
    ↓
Load channel profile
    ↓
GenerationEngine.generate({ type: "source_to_telegram" })
    ↓
Create 3 child contentLibrary records (status: draft)
    ↓
Mark parent as archived
```

**Database Tables:**

- `external_sources` - Tracks ingestion pipeline
- `content_library` - Stores source + generated posts

**Prompt:** `buildGenerateFromSourcePrompt()`

- Includes video/article metadata (title, author, duration)
- Includes channel profile (niche, tone, topics)
- Creates 3 different angle variations

**Known Issues:**

1. ✅ FIXED: Raw transcript was messy → Now preprocessed (filler words removed, paragraphs)
2. YouTube transcripts limited to 15,000 chars (hard truncation)
3. No summarization for long content

---

### Feature 2: Idea Development

**Purpose:** Expand a brief idea into a full draft

**Entry Points:**

- Server Action: `developIdea()` in `develop-idea.ts`
- UI: "Develop Idea" button on content cards

**Flow:**

```
User clicks "Develop Idea" on idea card
    ↓
developIdea() server action
    ↓
Emit: ai/content.develop-idea
    ↓
Inngest: developIdea
    ↓
Load content + channel profile + recent drafts
    ↓
GenerationEngine.generate({ type: "idea_to_draft" })
    ↓
Update contentLibrary.content with generated text
    ↓
Change sourceType to "ai_generated"
```

**Prompt:** `buildIdeaToDraftPrompt()`

- Takes the idea text
- Channel profile for voice matching
- No recent drafts context currently used (BUG: `_recentDraftTitles` defined but unused)

---

### Feature 3: Content Repurposing

**Purpose:** Repurpose existing content (shorter, thread, poll)

**Entry Points:**

- Server Action: `repurposePost()` in `repurpose.ts`
- UI: Repurpose modal

**Modes:**

- `shorter` - Condensed version
- `thread` - Twitter-style thread
- `poll` - Convert to poll format

**Flow:**

```
User selects content + mode in modal
    ↓
repurposePost() server action
    ↓
Emit: ai/content.repurpose
    ↓
Inngest: repurposeContent
    ↓
Load content + channel profile
    ↓
GenerationEngine.generate({ type: "repurpose", repurposeMode: mode })
    ↓
Insert new contentLibrary records (sourceType: "repurposed")
```

**Prompt:** `buildRepurposePrompt()`

- Original content
- Mode instruction (make shorter, create thread, etc.)
- Channel profile

---

### Feature 4: Calendar Gap Fill

**Purpose:** Suggest content ideas for empty calendar slots

**Entry Points:**

- Server Action: `fillCalendarGaps()` in `calendar.ts`
- UI: Calendar gap detection

**Flow:**

```
Calendar view detects gaps
    ↓
fillCalendarGaps() server action
    ↓
Emit: ai/calendar.suggest-fill
    ↓
Inngest: suggestCalendarFill
    ↓
detectCalendarGaps() - Find empty dates
    ↓
Load existing content titles
    ↓
Load channel profile
    ↓
GenerationEngine.generate({ type: "calendar_fill" })
    ↓
Parse JSON response
    ↓
Insert contentLibrary records (sourceType: "idea")
```

**Prompt:** `buildCalendarFillPrompt()`

- Gap dates
- Recent content (to avoid repetition)
- Channel profile

**Output Format:** JSON array of suggestions

---

### Feature 5: Channel Profiling

**Purpose:** Analyze channel to extract voice/tone/niche

**Entry Points:**

- Server Action: `analyzeChannelVoice()` in `ai-writer.ts`
- UI: Channel profile card "Analyze" button

**Flow:**

```
User clicks "Analyze Channel"
    ↓
analyzeChannelVoice() server action
    ↓
Fetch 50 recent posts
    ↓
ChannelProfiler.generateProfile()
    ↓
GoogleClient.analyzeChannelProfile()
    ↓
Parse & validate result
    ↓
Upsert channel_profiles record
```

**Prompt:** `buildChannelProfilePrompt()`

- Channel name
- Up to 50 post samples
- Returns: niche, tone, topTopics, language

**Storage:** `channel_profiles` table (one per channel)

---

### Feature 6: Cross-Platform Adaptation

**Purpose:** Adapt Telegram posts for LinkedIn/Twitter

**Entry Points:**

- Component: `RepurposeModal`
- Server Action: Triggers via crosspost actions

**Platforms:**

- LinkedIn: Professional tone, up to 3000 chars
- Twitter: Conversational, up to 280 chars (threaded)

**Flow:**

```
User selects "Adapt for LinkedIn/Twitter"
    ↓
Parse Telegram content
    ↓
AdaptationEngine.adapt()
    ↓
  1. Extract plain text
  2. GoogleClient.adaptContent() - translate + adapt
  3. Quality checks
  4. Twitter: splitIntoThread() if needed
    ↓
Store in cross_posts table
```

**Prompts:**

- `buildLinkedInAdaptPrompt()` - Professional, long-form
- `buildTwitterAdaptPrompt()` - Conversational, short
- `buildTranslatePrompt()` - Intermediate translation step

**Pipeline Steps:**

1. Translate (RU → EN)
2. Adapt for platform
3. Quality checks
4. Thread splitting (Twitter only)

---

### Feature 7: AI Writer (Direct Generation)

**Purpose:** Generate post from scratch with topic

**Entry Points:**

- Server Action: `generatePostWithAI()` in `ai-writer.ts`
- UI: AI Writer interface

**Flow:**

```
User enters topic + optional tone
    ↓
generatePostWithAI()
    ↓
Load channel profile
    ↓
Load recent posts (for examples)
    ↓
Build system prompt with profile + examples
    ↓
GoogleClient.complete()
    ↓
Parse JSON response { content, hashtags }
    ↓
Return to UI (NOT stored yet)
```

**Prompt:** Hardcoded in `ai-writer.ts`

- Very detailed system prompt
- Includes channel profile
- Includes 5 recent post examples
- Requests JSON output

**Temperature:** 0.8 (highest creativity)

---

## Database Schema

### AI-Related Tables

#### 1. `content_library` - Content Storage

```typescript
// Enums
contentSourceTypeEnum: 'telegram_import' | 'idea' | 'repurposed' | 'external_source' | 'ai_generated'
contentStatusEnum: 'draft' | 'published' | 'archived' | 'scheduled'

// Key Columns
- id: uuid PK
- userId: uuid FK
- parentId: uuid self-ref  // Parent-child for AI variants
- title: varchar(255)
- content: text
- sourceType: contentSourceTypeEnum  // How it was created
- status: contentStatusEnum
- channelId: uuid FK
- sourceUrl: varchar(2048)  // For external sources
- sourceMetadata: jsonb     // AI generation metadata
```

**Self-Referential Pattern:**

- Parent: Original source (external_source or idea)
- Children: AI-generated variations

---

#### 2. `channel_profiles` - Channel Voice

```typescript
// Columns
- id: uuid PK
- channelId: uuid FK (unique)
- niche: varchar(255)       // AI-detected
- tone: varchar(255)        // AI-detected
- topTopics: jsonb          // AI-extracted
- language: varchar(10)     // default: 'ru'
- generatedAt: timestamp
```

---

#### 3. `external_sources` - Ingestion Pipeline

```typescript
// Enums
externalSourceTypeEnum: 'youtube' | 'article' | 'podcast'
sourceProcessingStatusEnum: 'pending' | 'extracting' | 'extracted' | 'generating' | 'completed' | 'failed'

// Columns
- id: uuid PK
- userId: uuid FK
- sourceUrl: varchar(2048)
- sourceType: externalSourceTypeEnum
- title: varchar(500)
- extractedText: text       // Raw extracted content
- extractedMetadata: jsonb  // Video/article metadata
- processingStatus: sourceProcessingStatusEnum
- errorMessage: text
- linkedDraftId: uuid FK   // Generated content link
```

---

#### 4. `cross_posts` - Platform Adaptation

```typescript
// Enums
crossPostStatusEnum: 'draft' | 'scheduled' | 'posted' | 'failed'

// AI Columns
- adaptedContent: text      // AI-adapted text
- originalLanguage: varchar(10)  // 'ru'
- targetLanguage: varchar(10)    // 'en'
- aiModelUsed: varchar(255)
```

---

#### 5. `user_preferences` - AI Settings

```typescript
// Enums
aiModelEnum: 'gemini-flash' | 'gemini-pro' | 'auto'
adaptationToneEnum: 'professional' | 'casual' | 'match-original'

// Columns
- aiModel: aiModelEnum
- adaptationTone: adaptationToneEnum
```

---

#### 6. `usage_tracking` - Quota Metering

```typescript
// Columns
- aiCallsCount: integer     // Per month
- crossPostsCount: integer  // Per month
- month: varchar(7)         // 'YYYY-MM'
```

---

## Prompts & Configuration

### Temperature Settings

| Feature            | Temperature | Reason               |
| ------------------ | ----------- | -------------------- |
| Source-to-Telegram | 0.5         | Factual extraction   |
| Repurposing        | 0.6         | Balanced creativity  |
| Idea Development   | 0.7         | Creative expansion   |
| Calendar Fill      | 0.7         | Creative suggestions |
| AI Writer          | 0.8         | Maximum creativity   |
| Adaptation         | 0.7         | Natural translation  |

### Model Tiers

| Tier    | Model                  | Cost/1K Input | Cost/1K Output |
| ------- | ---------------------- | ------------- | -------------- |
| default | gemini-3-flash-preview | $0.0005       | $0.003         |
| fast    | gemini-3-flash-preview | $0.0005       | $0.003         |
| pro     | gemini-3-pro-preview   | $0.00125      | $0.01          |

### Prompt Files

| File                      | Purpose                    | Lines |
| ------------------------- | -------------------------- | ----- |
| `generate-from-source.ts` | External source → Telegram | 92    |
| `repurpose-telegram.ts`   | Content repurposing        | ~80   |
| `idea-to-draft.ts`        | Idea expansion             | ~60   |
| `calendar-fill.ts`        | Gap suggestions            | ~70   |
| `adapt-linkedin.ts`       | LinkedIn adaptation        | ~50   |
| `adapt-twitter.ts`        | Twitter adaptation         | ~50   |
| `channel-profile.ts`      | Channel analysis           | ~40   |
| `translate.ts`            | Translation                | ~30   |

---

## External Dependencies

### Required Environment Variables

```bash
GEMINI_API_KEY=           # Google Gemini API key
```

### NPM Packages

```json
{
  "@google/genai": "^1.43.0", // Gemini client
  "inngest": "^3.52.4" // Background jobs
}
```

---

## Issues & Recommendations

### Critical Issues

#### 1. ✅ FIXED: Raw Transcript Quality

**Status:** Fixed in d47f4d2  
**Problem:** YouTube transcripts were raw, unpunctuated, filler-filled text  
**Solution:** Added preprocessing in `youtube.ts` - removes filler words, formats paragraphs

#### 2. Recent Drafts Not Used in Idea Development

**Location:** `develop-idea.ts` line 79  
**Problem:** `_recentDraftTitles` is fetched but never passed to GenerationEngine  
**Impact:** AI doesn't know what topics were recently covered  
**Fix:** Pass to prompt to avoid repetition

#### 3. Hardcoded Temperatures

**Location:** `ai-writer.ts` line 212  
**Problem:** Temperature 0.8 hardcoded, not using `getTemperatureForType()`  
**Impact:** Inconsistent with other features  
**Fix:** Use standardized temperature function

### Medium Priority

#### 4. No Content Summarization for Long Sources

**Location:** `generate-from-source.ts`  
**Problem:** 15,000 char hard truncation can cut mid-topic  
**Impact:** Long videos lose important middle content  
**Fix:** Add AI summarization step before generation

#### 5. Duplicate Model IDs

**Location:** `types.ts` lines 40-55  
**Problem:** `default` and `fast` both use same model  
**Impact:** Fallback provides no actual fallback  
**Fix:** Use different model for fast (or remove tier)

#### 6. Missing Test Coverage

**Features without tests:**

- `adapt-content.ts` Inngest function
- `ai-writer.ts` server actions
- `suggest-calendar-fill.ts` (has test file but minimal)

### Low Priority

#### 7. Unused Recent Topics in Calendar Fill

**Location:** `suggest-calendar-fill.ts` line 88  
**Problem:** `recentTopics: []` always empty  
**Fix:** Extract topics from recent content

#### 8. JSON Parsing Risk

**Location:** `suggest-calendar-fill.ts` line 94  
**Problem:** `JSON.parse()` without try-catch  
**Impact:** Can crash if AI returns malformed JSON  
**Fix:** Add error handling

---

## Architectural Recommendations

### 1. Unified Prompt Management

**Current:** Prompts scattered across 8 files  
**Recommendation:** Centralize with versioning and A/B testing support

### 2. Prompt Caching

**Current:** Every request rebuilds prompt strings  
**Recommendation:** Cache compiled prompts for identical inputs

### 3. Streaming Responses

**Current:** Wait for complete response  
**Recommendation:** Stream for better UX in long generations

### 4. Content Preprocessing Pipeline

**Current:** Each feature handles preprocessing differently  
**Recommendation:** Standardized pipeline: Extract → Clean → Summarize → Generate

### 5. Better Error Handling

**Current:** Some features don't handle AI failures gracefully  
**Recommendation:** Retry with fallback prompts, user-friendly error messages

---

## File Inventory

### Core AI (src/lib/ai/)

| File                   | Purpose                 | LOC  |
| ---------------------- | ----------------------- | ---- |
| `index.ts`             | Barrel exports          | 55   |
| `types.ts`             | Type definitions        | 246  |
| `google.ts`            | Gemini client           | 358  |
| `provider.ts`          | Provider interface      | ~20  |
| `openrouter.ts`        | OpenRouter client       | ~100 |
| `generation-engine.ts` | Generation orchestrator | 150  |
| `adaptation-engine.ts` | Adaptation orchestrator | 346  |
| `channel-profiler.ts`  | Channel analysis        | 94   |

### Prompts (src/lib/ai/prompts/)

| File                      | Purpose              | LOC |
| ------------------------- | -------------------- | --- |
| `generate-from-source.ts` | Source generation    | 92  |
| `repurpose-telegram.ts`   | Repurposing          | ~80 |
| `idea-to-draft.ts`        | Idea development     | ~60 |
| `calendar-fill.ts`        | Calendar suggestions | ~70 |
| `adapt-linkedin.ts`       | LinkedIn adaptation  | ~50 |
| `adapt-twitter.ts`        | Twitter adaptation   | ~50 |
| `channel-profile.ts`      | Channel analysis     | ~40 |
| `translate.ts`            | Translation          | ~30 |

### Inngest Functions (src/lib/inngest/functions/ai/)

| File                       | Purpose             | LOC  |
| -------------------------- | ------------------- | ---- |
| `generate-from-source.ts`  | Source → Posts      | 193  |
| `develop-idea.ts`          | Idea → Draft        | 146  |
| `repurpose-content.ts`     | Repurposing         | 144  |
| `suggest-calendar-fill.ts` | Calendar fill       | 129  |
| `profile-channel.ts`       | Channel profiling   | 124  |
| `adapt-content.ts`         | Platform adaptation | ~100 |

### Server Actions (src/server/actions/)

| File              | Purpose                   | LOC  |
| ----------------- | ------------------------- | ---- |
| `ai-writer.ts`    | Direct AI generation      | 287  |
| `repurpose.ts`    | Trigger repurposing       | 59   |
| `develop-idea.ts` | Trigger idea dev          | ~80  |
| `sources.ts`      | Trigger source processing | 144  |
| `calendar.ts`     | Trigger calendar fill     | ~100 |

---

## Next Steps

1. **Fix Recent Drafts Bug** - Pass `_recentDraftTitles` to GenerationEngine
2. **Add Summarization** - For long transcripts before generation
3. **Improve Error Handling** - Especially for JSON parsing
4. **Add Missing Tests** - Focus on `adapt-content.ts` and `ai-writer.ts`
5. **Consider Streaming** - For better UX on long generations
6. **Audit Prompt Quality** - Review all prompts for effectiveness

---

_End of Audit_
