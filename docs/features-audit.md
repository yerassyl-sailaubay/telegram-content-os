# Features Audit

**Product:** Telegram Content OS / Teleflow  
**Date:** March 9, 2026  
**Purpose:** Compare landing-page promises against the shipped product, identify real gaps, and recommend which missing or latent features are worth building next.

---

## 1. Audit Boundary

This audit compares three things:

1. **Live landing copy** rendered by `src/app/[locale]/page.tsx`, `src/components/marketing/landing-page.tsx`, and `src/messages/en.json`.
2. **Prototype landing copy** in `telegram-content-os-landing/src/App.tsx`.
3. **Actual product implementation** across `src/app`, `src/components`, `src/server`, and `src/lib`.

Important source-classification note:

- `telegram-content-os-landing/` is a separate Vite app and is excluded from the main app TypeScript config in `tsconfig.json:33`.
- That makes the prototype landing lower-risk than the live Next.js landing, but it still matters because it contains feature ideas that may get reused later.

---

## 2. Bottom Line

- The **live landing** overclaims Telegram bot intake, voice-note capture, automated feedback-loop behavior, and pricing limits.
- The **prototype landing** overclaims podcasts, voice memos, quote-card style repurposing, custom AI fine-tuning, and a lighter Plus plan channel limit than the real app enforces.
- The strongest shipped experience is still **Telegram-first**: channel ingestion, content library, web quick capture, AI drafting/repurposing, scheduling, Telegram publishing, Telegram analytics, settings, billing, and welcome templates.
- The best near-term product work is not speculative AI. It is **productizing backend-ready flows**: cross-post UI, broadcast UI, calendar suggestion review, and a narrow Telegram bot text-capture inbox.
- The Telegram bot for creator idea capture is only worth building as a **small text-first inbox feature**. Voice-note transcription is a later bet, not a launch-near requirement.

---

## 3. What Is Clearly Shipped Today

These areas are real product capability and safe to talk about, with accurate wording:

- **Telegram channel ingestion** via webhook and bot setup: `src/server/actions/channels.ts`, `src/app/api/telegram/webhook/route.ts`
- **Web quick capture for ideas** on the dashboard: `src/components/content/quick-capture.tsx`, `src/app/[locale]/(dashboard)/dashboard/page.tsx`
- **Content library and idea/draft storage**: `src/server/actions/content.ts`
- **Generate from ideas, YouTube links, and article URLs**: `src/server/actions/develop-idea.ts`, `src/server/actions/sources.ts`, `src/app/[locale]/(dashboard)/dashboard/create/page.tsx`, `src/components/create/url-input-form.tsx`
- **Repurposing and channel-profile-guided AI output**: `src/server/actions/repurpose.ts`, `src/lib/inngest/functions/ai/profile-channel.ts`
- **Scheduling and recurring schedules**: `src/app/[locale]/(dashboard)/schedule/client.tsx`, `src/server/actions/schedule.ts`, `src/lib/inngest/functions/scheduling/process-recurring.ts`
- **Telegram publishing**: `src/server/actions/publish-telegram.ts`, `src/lib/inngest/functions/telegram/publish-to-telegram.ts`
- **Telegram analytics**: `src/app/[locale]/(dashboard)/dashboard/analytics/page.tsx`, `src/components/analytics/telegram-analytics.tsx`, `src/server/actions/analytics-telegram.ts`
- **Media library UI exists on the compatibility route**: `src/app/[locale]/(dashboard)/media/page.tsx`, `src/components/media/media-library-client.tsx`
- **Settings, connections, billing, and welcome templates**: `src/server/actions/settings.ts`, `src/server/actions/welcome.ts`, `src/lib/billing/plans.ts`

---

## 4. Landing Discrepancies

### 4.1 Telegram bot idea capture

**Claim appears in:**

- live landing: `src/messages/en.json:809`, `src/messages/en.json:821`, `src/messages/en.json:909`, `src/messages/en.json:921`, `src/messages/en.json:944`, `src/messages/en.json:1168`, `src/messages/en.json:1191`
- prototype landing: `telegram-content-os-landing/src/App.tsx:315`, `telegram-content-os-landing/src/App.tsx:329`

**What the copy implies:**

- creators can send ideas directly to a Telegram bot
- Telegram is an inbound capture layer for creator ideas
- the bot is part of the everyday idea workflow, not just channel connection

**What the app actually does:**

- the webhook handles channel posts, edited channel posts, and new chat members
- no evidence was found for private-message idea capture, bot command routing, or creator DM intake
- the only clearly shipped capture flow for ideas is the **web quick-capture textarea** on the dashboard

**Evidence:**

- webhook behavior: `src/app/api/telegram/webhook/route.ts:333`, `src/app/api/telegram/webhook/route.ts:386`, `src/app/api/telegram/webhook/route.ts:408`
- shipped quick capture: `src/components/content/quick-capture.tsx:24`, `src/components/content/quick-capture.tsx:27`

**Status:** Missing as a user-facing creator feature

**Worth implementing?** Yes, but narrowly.

**Recommendation:**

- build a **text-only Telegram inbox capture** first
- do not market this as a broad bot workflow until private-message capture actually exists

---

### 4.2 Voice notes / voice memos as draft input

**Claim appears in:**

- live landing: `src/messages/en.json:809`, `src/messages/en.json:850`, `src/messages/en.json:921`, `src/messages/en.json:944`, `src/messages/en.json:971`, `src/messages/en.json:998`, `src/messages/en.json:1191`
- prototype landing: `telegram-content-os-landing/src/App.tsx:205`, `telegram-content-os-landing/src/App.tsx:273`

**What the copy implies:**

- creators can send a voice note or voice memo and get it turned into usable draft material

**What the app actually does:**

- the Telegram webhook can detect/store media metadata such as audio presence in channel content
- no transcription pipeline, speech-to-text integration, or creator voice-note-to-draft flow was found

**Evidence:**

- media extraction in webhook: `src/app/api/telegram/webhook/route.ts:113`, `src/app/api/telegram/webhook/route.ts:138`
- no voice transcription evidence found in app code beyond parser/media types and landing copy

**Status:** Missing

**Worth implementing?** Not now.

**Recommendation:**

- remove voice-note capture from public copy for now
- if validated later, ship it only after a basic text bot inbox proves demand

---

### 4.3 Podcast ingestion

**Claim appears in:**

- prototype landing: `telegram-content-os-landing/src/App.tsx:78`, `telegram-content-os-landing/src/App.tsx:212`, `telegram-content-os-landing/src/App.tsx:329`

**What the app actually does:**

- source ingestion supports YouTube and article URLs in practice
- the server action type still includes a `podcast` union value, but the parser and create flow reject unknown URLs and only accept YouTube/article sources

**Evidence:**

- parser enforcement and user error message: `src/server/actions/sources.ts:42`, `src/server/actions/sources.ts:45`, `src/server/actions/sources.ts:67`
- create page: `src/app/[locale]/(dashboard)/dashboard/create/page.tsx:10`
- UI for source imports and recent jobs: `src/components/create/url-input-form.tsx:112`, `src/components/create/url-input-form.tsx:257`

**Status:** Missing as a real supported feature

**Worth implementing?** Low priority

**Recommendation:** remove from copy before building it

---

### 4.4 Web quick capture vs. the broader "ideas vault"

**Claim appears in:**

- prototype landing: `telegram-content-os-landing/src/App.tsx:269`, `telegram-content-os-landing/src/App.tsx:273`, `telegram-content-os-landing/src/App.tsx:274`

**What the copy implies:**

- there is an ideas vault
- it accepts text and voice memos
- AI periodically revisits old ideas and suggests turning them into drafts

**What the app actually does:**

- users can save text ideas through web quick capture
- saved ideas become content items with `sourceType: "idea"` and `status: "draft"`
- a develop-idea flow exists, but no periodic resurfacing loop for old ideas was verified

**Evidence:**

- web quick capture: `src/components/content/quick-capture.tsx:24`, `src/components/content/quick-capture.tsx:28`
- dashboard surface: `src/app/[locale]/(dashboard)/dashboard/page.tsx:128`, `src/app/[locale]/(dashboard)/dashboard/page.tsx:132`

**Status:** Partial

**Worth implementing?** Medium

**Recommendation:**

- keep the shipped feature framed as **web quick capture**
- if expanded, do text-first bot inbox before trying voice memos or periodic idea reactivation

---

### 4.5 AI "learns your voice"

**Claim appears in:**

- live landing: `src/messages/en.json:834`, `src/messages/en.json:925`, `src/messages/en.json:976`, `src/messages/en.json:1143`
- prototype landing: `telegram-content-os-landing/src/App.tsx:239`, `telegram-content-os-landing/src/App.tsx:243`, `telegram-content-os-landing/src/App.tsx:316`

**What the app actually does:**

- the app profiles channel content and uses that profile to guide prompts and output style
- this is real and shipped
- there is no evidence of fine-tuning, long-horizon autonomous learning, or an actual personalized model

**Evidence:**

- profiling and prompt-guided generation path: `src/lib/inngest/functions/ai/profile-channel.ts`, `src/server/actions/ai-writer.ts`

**Status:** Shipped, but the current phrasing overstates the mechanism

**Worth implementing deeper?** Medium, but not urgent

**Recommendation:**

- keep the capability
- soften the wording to "guided by your channel profile" or "shaped by your channel's tone and structure"

---

### 4.6 Scheduling, gap filling, and the "next slot suggested" story

**Claim appears in:**

- live landing: `src/messages/en.json:839`, `src/messages/en.json:873`, `src/messages/en.json:883`, `src/messages/en.json:954`, `src/messages/en.json:986`, `src/messages/en.json:1079`, `src/messages/en.json:1172`
- prototype landing: `telegram-content-os-landing/src/App.tsx:258`, `telegram-content-os-landing/src/App.tsx:343`

**What the app actually does:**

- calendar scheduling is shipped
- recurring schedules are shipped
- dashboard gap awareness exists
- an Inngest function for calendar-fill suggestions exists
- no clear user-facing suggestion review or acceptance flow was found

**Evidence:**

- schedule UI: `src/app/[locale]/(dashboard)/schedule/client.tsx:82`, `src/app/[locale]/(dashboard)/schedule/client.tsx:110`
- recurring processor: `src/lib/inngest/functions/scheduling/process-recurring.ts`
- dashboard gap alert: `src/app/[locale]/(dashboard)/dashboard/page.tsx:137`
- backend function exists: `src/lib/inngest/functions/index.ts:18`, `src/lib/inngest/functions/ai/suggest-calendar-fill.ts:13`

**Status:** Partial

**Worth implementing?** Yes

**Recommendation:**

- ship a visible review-and-accept flow for AI schedule suggestions
- until then, soften copy from "next slot suggested" to plain schedule/gap visibility

---

### 4.7 Analytics as an automated feedback loop

**Claim appears in:**

- live landing: `src/messages/en.json:887`, `src/messages/en.json:904`, `src/messages/en.json:930`, `src/messages/en.json:959`, `src/messages/en.json:991`, `src/messages/en.json:1042`, `src/messages/en.json:1199`
- prototype landing: `telegram-content-os-landing/src/App.tsx:284`, `telegram-content-os-landing/src/App.tsx:289`

**What the app actually does:**

- Telegram analytics is real and user-facing
- the app shows channel growth, timing information, and content-performance views
- no evidence was found that analytics automatically feeds planning decisions back into the queue in a closed-loop way

**Evidence:**

- analytics page: `src/app/[locale]/(dashboard)/dashboard/analytics/page.tsx:17`
- Telegram analytics component: `src/components/analytics/telegram-analytics.tsx`

**Status:** Shipped analytics, overstated automation

**Worth implementing deeper?** Medium

**Recommendation:** keep analytics claims, remove autonomous-loop wording

---

### 4.8 Cross-posting and broadcast UX

**Claim appears in:**

- live landing: `src/messages/en.json:981`
- prototype landing implies broader multi-output workflows: `telegram-content-os-landing/src/App.tsx:228`, `telegram-content-os-landing/src/App.tsx:288`

**What the app actually does:**

- LinkedIn/X backend adaptation and posting infrastructure exists
- OAuth flows exist
- broadcast orchestration exists
- tests and empty-state links reference `/dashboard/crosspost` and `/dashboard/crosspost/broadcast`
- route files for those pages were not found in the app router search

**Evidence:**

- backend actions: `src/server/actions/crosspost.ts:420`, `src/server/actions/crosspost.ts:498`
- broadcast orchestration: `src/lib/broadcast/orchestrator.ts`
- app links/tests referencing routes: `src/components/dashboard/__tests__/dashboard-home.test.tsx:302`, `src/components/dashboard/__tests__/dashboard-home.test.tsx:310`, `src/components/posts/posts-empty-state.tsx:16`, `src/components/schedule/schedule-empty-state.tsx:16`

**Status:** Partial / latent

**Worth implementing?** Yes, high priority

**Recommendation:** build the missing UI surfaces before expanding copy

---

### 4.9 Pricing and entitlement claims

**Claim appears in:**

- live landing: `src/messages/en.json:1103`, `src/messages/en.json:1115`
- prototype landing: `telegram-content-os-landing/src/App.tsx:378`, `telegram-content-os-landing/src/App.tsx:417`, `telegram-content-os-landing/src/App.tsx:457`

**What the copy says:**

- live landing says Free = 50 AI generations, Plus = 500 AI generations
- prototype says Plus = 3 connected channels and Pro includes custom AI fine-tuning

**What the app actually enforces:**

- Free = 10 AI calls/month, 5 cross-posts/month, 1 channel
- Plus = 100 AI calls/month, 50 cross-posts/month, 5 channels
- Pro = unlimited AI/cross-posts/channels
- no custom AI fine-tuning feature is shipped

**Evidence:**

- plan definitions: `src/lib/billing/plans.ts:17`

**Status:** Incorrect copy

**Worth implementing?** No. Fix the copy.

**Recommendation:** treat pricing mismatches as immediate copy bugs, not product gaps

---

## 5. Features From Landing That Are Not Worth Building Right Now

### Voice-note transcription pipeline

- high integration and cost complexity
- no narrow MVP path is currently in place
- not needed to validate the core Telegram-first workflow

### Podcast ingestion

- not supported today
- lower leverage than improving existing YouTube/article flows and source management

### Custom AI fine-tuning

- overclaimed in the prototype only
- not supported by the current product architecture or public positioning

### Fully automated analytics-to-planning loop

- current analytics is useful as a human decision surface
- turning it into automated planning would add complexity before the core UI gaps are closed

---

## 6. Features Worth Implementing Next

These are the highest-leverage additions because the repo already contains real foundations for them.

### 6.1 Cross-post review and publish UI

**Why it is worth it:**

- backend adaptation, posting, and broadcast layers already exist
- the app already points users toward `/dashboard/crosspost`
- this closes one of the most visible product-vs-copy gaps

**Suggested scope:**

- list adaptable posts
- preview LinkedIn/X outputs
- post now or schedule

---

### 6.2 Broadcast UI

**Why it is worth it:**

- broadcast orchestration already exists
- tests reference a broadcast route
- this turns latent backend capability into a visible product advantage

**Suggested scope:**

- multi-platform selection
- schedule now/later
- per-platform status

---

### 6.3 Telegram bot text-only inbox capture

**Why it is worth it:**

- it directly resolves the landing's biggest credibility gap
- external research supports a narrow MVP: quick capture / save to drafts
- it reuses the existing idea storage model instead of requiring a whole new CMS

**Suggested scope:**

- accept private text messages to the bot
- save them as `sourceType: "idea"`
- optional simple commands such as `/idea` and `/help`

**Do not include in v1 scope:**

- voice memo transcription
- complex inline keyboard workflows
- autonomous draft generation from every message

---

### 6.4 Calendar suggestion review flow

**Why it is worth it:**

- gap detection exists
- suggestion backend exists
- this would turn a real backend capability into user-visible planning value

**Suggested scope:**

- review suggested draft candidates
- accept into schedule
- dismiss or regenerate

---

### 6.5 Media route consolidation and composer integration

**Why it is worth it:**

- a real media library client exists on `/(dashboard)/media`
- the canonical dashboard media page still shows an empty state
- this is a clean productization and discoverability fix

**Suggested scope:**

- point the canonical media route to the real library client
- make media selection easier from publishing/composer flows

**Evidence:**

- real library route: `src/app/[locale]/(dashboard)/media/page.tsx:1`
- empty canonical page: `src/app/[locale]/(dashboard)/dashboard/media/page.tsx:1`

---

## 7. Copy Fixes To Make Immediately

These should be fixed even if no feature work happens:

- remove or soften **Telegram bot idea capture** claims
- remove **voice notes / voice memos** from public copy
- remove **podcasts** from source-ingestion claims
- replace **AI learns your voice** with channel-profile-guided wording
- replace automated **feedback loop** language with plain analytics language
- correct all **pricing numbers** to match `src/lib/billing/plans.ts`
- remove **custom AI fine-tuning** from any plan or landing copy

---

## 8. Recommended Priority Order

1. Fix landing pricing and unsupported copy
2. Build cross-post review/publish UI
3. Build broadcast UI
4. Build Telegram bot text-only inbox capture
5. Build calendar suggestion review flow
6. Consolidate and surface the media library properly
7. Re-evaluate voice-note capture only after text inbox usage proves demand

---

## 9. Final Assessment

The product is stronger than the landing in some areas and weaker in others.

- It is **stronger** in real Telegram workflow depth: ingestion, content operations, billing, scheduling, and Telegram analytics are all real.
- It is **weaker** where the landing implies a seamless Telegram bot capture workflow, voice-note intake, and a tighter cross-post UI than users can actually access today.

The right move is not to chase every flashy idea from the landing. The right move is to:

- fix misleading copy now
- productize the backend-ready features next
- only then consider higher-cost bets like voice transcription
