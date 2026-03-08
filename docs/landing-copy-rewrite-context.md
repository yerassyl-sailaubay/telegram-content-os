# Landing Copy Rewrite Context

**Date:** March 9, 2026  
**Purpose:** Handoff context for the next session that rewrites landing copy to match the actual product.

---

## 1. What changed in this session

The docs were updated to reflect the real app rather than the earlier aspirational story:

- `docs/prd.md`
- `docs/features.md`
- `docs/features-audit.md`

This file is a practical rewrite brief for the landing copy specifically.

---

## 2. Which landing surfaces matter

### Live landing

This is the real marketing surface in the Next.js app:

- `src/app/[locale]/page.tsx`
- `src/components/marketing/landing-page.tsx`
- `src/messages/en.json`
- `src/messages/ru.json`

Most of the actual copy lives in the translation files under `landing`.

### Prototype landing

There is also a separate prototype app:

- `telegram-content-os-landing/src/App.tsx`

Important:

- `telegram-content-os-landing/` is excluded from the main app config in `tsconfig.json:33`
- it should be treated as a separate prototype, not the primary live landing

If time is limited, rewrite the live landing first.

---

## 3. Current product truth to anchor the rewrite

These are safe, evidence-backed claims:

- Telegram-first content workflow
- Telegram channel connection and webhook-based post ingestion
- web quick capture for ideas in the dashboard
- content library for ideas, drafts, scheduled posts, and published content
- AI workflows for:
  - developing ideas into drafts
  - repurposing content
  - generating from YouTube links and article URLs
  - adapting content for LinkedIn and X
- scheduling with calendar views and recurring schedules
- Telegram publishing
- Telegram analytics focused on growth, timing, and content performance
- billing, plan limits, settings, welcome templates, and localization

Safe product framing:

> Telegram-first content operating system with AI drafting, scheduling, publishing, and Telegram analytics.

---

## 4. Claims that should be removed or softened

### Remove for now

- Telegram bot as a real creator idea-capture inbox
- voice notes / voice memos as supported draft input
- podcast ingestion
- custom AI fine-tuning

### Soften heavily

- "AI learns your voice" -> use channel-profile-guided wording instead
- "feedback loop" -> keep analytics, remove automated-loop implications
- "next slot suggested" -> only if a visible suggestion-review flow exists
- anything implying polished end-to-end multi-platform publishing UX

### Fix immediately

- pricing copy must match `src/lib/billing/plans.ts`

Current enforced pricing:

- Free: `10` AI calls/month, `5` cross-posts/month, `1` Telegram channel
- Plus: `100` AI calls/month, `50` cross-posts/month, `5` Telegram channels
- Pro: unlimited AI, cross-posts, and channels

---

## 5. Biggest landing discrepancies found

### Live landing problems

The live copy in `src/messages/en.json` currently overclaims:

- sending ideas directly to a Telegram bot
- voice-note capture
- stronger closed-loop analytics behavior than is actually shipped
- outdated pricing numbers

### Prototype landing problems

The prototype in `telegram-content-os-landing/src/App.tsx` overclaims:

- podcasts as an input source
- voice memos in the ideas vault
- custom AI fine-tuning
- Plus plan at `3` connected channels instead of `5`

See `docs/features-audit.md` for the full evidence map.

---

## 6. Recommended narrative direction

The landing should lean into what is actually strong today:

- Telegram is the primary workflow center
- the app helps creators collect, shape, schedule, publish, and review content in one place
- AI helps with drafting and repurposing, but the creator remains in control

Good positioning direction:

- Telegram-first workflow, not generic social suite
- AI-assisted editorial system, not autonomous content machine
- operations and consistency, not hype

Useful angle:

> Turn Telegram posts, ideas, YouTube links, and article URLs into drafts, scheduled posts, and a cleaner publishing workflow.

---

## 7. Suggested rewrite priorities

### Hero

- remove bot-intake and voice-note claims
- replace with web idea capture + Telegram channel ingestion + supported source URLs
- keep the product Telegram-first

### Workflow section

- make the capture step truthful: imported Telegram posts, saved ideas, article links, YouTube links
- keep scheduling and analytics, but avoid autonomous-loop wording

### Proof / feature cards

- replace "Telegram becomes the capture layer" with language that does not require DM bot capture
- reframe voice modeling as channel-guided prompting

### Pricing

- update all numbers to match `src/lib/billing/plans.ts`
- remove any language suggesting fine-tuning or unsupported premium analytics

### FAQ / final CTA

- avoid language that implies users stay fully inside Telegram for all core actions
- emphasize that Telegram is a core input and publishing surface, while the dashboard handles organization and planning

---

## 8. Files most likely to be edited next

- `src/messages/en.json`
- `src/messages/ru.json`
- `src/components/marketing/landing-page.tsx` only if structure/layout changes are needed
- `telegram-content-os-landing/src/App.tsx` if the prototype is still worth keeping aligned

---

## 9. Recommended copy guardrails

- Do not promise bot inbox capture until it is actually built
- Do not mention voice notes unless transcription/input flow exists
- Do not mention podcasts until parser + ingestion support exists
- Do not imply drag-and-drop scheduling
- Do not imply unified cross-platform analytics
- Do not imply fine-tuned custom models
- Prefer "guided by your channel profile" over "learns your voice"
- Prefer "Telegram analytics" over broad "analytics loop" language

---

## 10. Best next product features if copy and product are aligned

These are the strongest implementation candidates if the next session shifts from copy to product work:

1. cross-post review and publish UI
2. broadcast UI
3. Telegram bot text-only inbox capture
4. calendar suggestion review flow
5. media route consolidation and composer integration

Those recommendations are documented in more detail in `docs/features-audit.md`.
