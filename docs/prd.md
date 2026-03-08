# Product Requirements Document

**Product:** Telegram Content OS  
**Version:** V1 documentation refresh  
**Date:** March 9, 2026  
**Status:** Functional V1 with some partial and in-progress workflows

---

## 1. Executive Summary

Telegram Content OS is a Telegram-first content operating system for creators who publish regularly and want one place to capture ideas, ingest Telegram posts, generate or adapt content with AI, schedule publication, publish to Telegram, and review core channel performance.

The product already covers the main Telegram workflow end to end: authentication, channel connection, post ingestion, content library, AI-assisted drafting, calendar scheduling, Telegram publishing, welcome templates, billing, localization, and a Telegram analytics surface. It also contains groundwork for LinkedIn and Twitter/X connections, cross-platform adaptation, cross-posting, and background analytics collection, but those areas should be described carefully because the user-facing product remains Telegram-first today.

This document reflects the current codebase, not the aspirational marketing version. Where a workflow is partial, backend-only, or still being surfaced in the UI, it is called out explicitly.

---

## 2. Problem Statement

Telegram creators often operate with a fragmented stack:

- Telegram itself for publishing
- notes or docs for idea capture
- spreadsheets or calendars for planning
- generic AI tools for drafting and rewriting
- separate dashboards or manual checks for performance

That fragmentation creates three practical problems:

1. **Telegram is underserved by creator software.** Most scheduling and content tools are built around Instagram, LinkedIn, or X and treat Telegram as a secondary destination.
2. **AI tools are disconnected from publishing workflows.** Creators can draft in ChatGPT or Gemini, but still need to manually move content into their scheduling, publishing, and archive systems.
3. **Expansion to other platforms increases operational load.** Reformatting Telegram-native writing for LinkedIn or X is possible, but repetitive and easy to delay.

The result is operational overhead: more copy-paste, more context switching, weaker reuse of existing content, and less visibility into what is working on Telegram.

---

## 3. Target User

**Primary user:** Solo or small-team Telegram creators publishing expert or commentary-driven content.

Typical characteristics:

- publish several times per week or daily
- work in text-heavy formats rather than image-first formats
- want to reuse and adapt existing content instead of starting from scratch every time
- care about tone consistency and editorial control
- may want optional distribution to LinkedIn or X without making that the center of the workflow

**Initial market orientation:** Russian-speaking creators first, with English-language support available in product.

**Secondary user:** Small operators managing multiple Telegram channels for a founder, brand, or client set.

---

## 4. Product Positioning

Telegram Content OS should be positioned as:

- a **Telegram-native creator workflow tool**
- with **AI-assisted drafting and adaptation**
- plus **calendar scheduling, Telegram publishing, and Telegram analytics**
- and **optional LinkedIn / X extensions where supported**

It should not be positioned as a fully mature multi-platform social suite. The product has cross-platform plumbing and some user-facing setup for LinkedIn and X, but the most complete and clearly shipped experience is still Telegram.

---

## 5. Value Proposition

### Telegram-first workflow

The product is built around Telegram channel operations rather than retrofitting Telegram into a generic scheduler.

### One system for creation and operations

Creators can move from imported posts or rough ideas to drafts, schedules, and published Telegram content without leaving the app.

### AI guided by channel context

The app profiles channel content and stores user preferences so AI generation and adaptation can be guided by channel context, tone, and style preferences. This is prompt-guided personalization, not model fine-tuning.

### Optional expansion paths

LinkedIn and X support exists as optional integrations and adaptation targets for creators who want to reuse Telegram ideas elsewhere.

### Localized for the initial audience

The app ships with Russian and English localization and defaults to Russian.

---

## 6. Current Product Scope

### Shipped user-facing workflows

- email/password auth and Google/GitHub OAuth
- Telegram channel connection and webhook-based post ingestion
- content library with search, filters, and status management
- AI workflows for:
  - developing ideas into drafts
  - repurposing existing content
  - generating drafts from YouTube links and article URLs
  - adapting content for other platforms
- calendar scheduling with month/week/day views
- Telegram publishing for immediate and scheduled posts
- Telegram analytics surface
- welcome message template management per channel
- billing, plan limits, and usage visibility
- profile, timezone, language, and AI preference settings

### Partial or limited workflows

- rescheduling exists, but the current UX is limited and not drag-and-drop
- media management backend exists, but the standalone media surface is thin
- analytics UI is primarily Telegram-focused even though broader analytics plumbing exists
- LinkedIn and X integrations exist in settings and backend flows, but the product should not yet be described as a fully polished multi-platform publishing suite

### Internal or background-only capability

- admin console for environment checks, billing overrides, failure visibility, and sync status
- background analytics collection for LinkedIn and X
- background broadcast / cross-post orchestration that is ahead of the public-facing product narrative

---

## 7. Core Features

### Telegram Channel Connection and Ingestion

- connect Telegram channels through the app's bot flow
- automatically import newly received Telegram content
- capture text, images, videos, documents, and media groups
- maintain channel-level settings and detail views
- configure welcome templates for new subscribers

### Content Library

- searchable content archive
- filters by channel and status
- support for drafts, scheduled content, published content, archived content, and idea-originated items
- category and tag management
- parent/child relationships for derived content

### AI-Assisted Content Creation

- **Develop Ideas:** turn a concept into a draft
- **Repurpose Content:** create shorter versions, thread-style variants, or poll-oriented variants
- **Generate from Sources:** generate from YouTube videos and article URLs
- **Channel Profiling:** build a channel profile used to guide prompts and output style

### AI Adaptation

- adapt Telegram-originated content for LinkedIn and X
- use a two-step pattern of translation/context normalization and then platform adaptation
- support platform-specific previews
- keep the creator in review/edit mode before publication

### Scheduling and Publishing

- month, week, and day calendar views
- click-to-create scheduling from calendar slots
- cancel scheduled posts
- limited reschedule flow
- recurring schedules
- timezone-aware publishing
- Telegram publish flows for text, single-photo, media-group, and poll-like content patterns

### Analytics

- Telegram analytics is the main shipped analytics experience
- current emphasis is channel growth, best posting times, and top-performing content
- cross-platform analytics plumbing exists but should not be described as a unified shipped analytics dashboard yet

### Billing and Limits

- Stripe checkout and customer portal
- usage tracking for AI operations and cross-posting
- plan-based limits for AI calls, channel count, and cross-post volume

### Localization

- Russian and English UI
- Russian default locale
- locale-aware navigation and formatting

---

## 8. Pricing Strategy

Pricing is currently enforced by plan definitions in the app.

| Plan | Price     | AI calls / month | Cross-posts / month | Telegram channels |
| ---- | --------- | ---------------- | ------------------- | ----------------- |
| Free | $0        | 10               | 5                   | 1                 |
| Plus | $19/month | 100              | 50                  | 5                 |
| Pro  | $49/month | Unlimited        | Unlimited           | Unlimited         |

Notes:

- Free is the default tier and does not require Stripe checkout.
- Plus and Pro are paid Stripe plans.
- plan descriptions in public docs must match these enforced limits exactly.

---

## 9. Current User Journey

1. **Sign up or log in** with email/password or OAuth.
2. **Connect a Telegram channel** through the bot-driven flow.
3. **Import and review content** inside the content library.
4. **Create new material** from an idea, a previous post, or a supported source URL.
5. **Edit the draft** before publishing.
6. **Publish to Telegram now** or **schedule it** on the calendar.
7. **Review Telegram analytics** to understand growth, timing, and top-performing posts.
8. **Upgrade plans** if AI or cross-post limits are reached.

Optional: connect LinkedIn or X in settings and use adaptation workflows where needed.

---

## 10. Launch Readiness

### Ready enough to present as available

- core Telegram workflow
- billing and quota enforcement
- localized interface
- AI-assisted drafting, repurposing, and source-based generation

### Needs careful wording

- cross-platform publishing: supported in parts, but not the most mature product surface
- analytics: Telegram-facing today, not a truly unified cross-network dashboard
- scheduling: functional and useful, but not drag-and-drop calendar management
- AI voice claims: guided by channel profile and user preferences, not continuously self-improving model training

Recommended public positioning:

> Telegram Content OS is a Telegram-first content workflow product with shipped AI drafting, scheduling, publishing, and Telegram analytics, plus early LinkedIn and X extension paths.

---

## 11. Success Metrics

Suggested product metrics remain reasonable, but should be interpreted against the actual current scope.

### Acquisition

- registered users
- Telegram channel connections per new cohort

### Activation

- first imported channel
- first AI-generated or AI-repurposed draft
- first scheduled or published Telegram post

### Retention

- weekly active channels
- weekly publishing activity per creator
- repeat AI usage per paid account

### Monetization

- free-to-paid conversion
- paid retention by tier
- average monthly AI usage by tier

### Product quality

- publish success rate
- background job failure rate
- analytics sync freshness for Telegram channels

---

## 12. Roadmap Priorities

### Near-term follow-ups

- stronger cross-posting UX for LinkedIn and X
- broader analytics UI for non-Telegram platforms where data is available
- improved rescheduling UX
- fuller media library surface on top of the existing backend

### Longer-horizon V2 items

- competitor channel tracking
- comment analysis and sentiment workflows
- viral prediction or scoring
- team workspaces and permissions
- native mobile apps
- additional publishing platforms
- custom model tuning or richer creator-specific learning loops
- alternative payment rails beyond Stripe

---

## 13. Risks and Constraints

### Platform dependence

Telegram, LinkedIn, and X API changes can affect publishing, ingestion, and analytics behavior.

### Analytics limitations

Different platforms expose different metrics and refresh windows. Public docs should acknowledge that analytics availability depends on platform APIs.

### AI quality variance

AI output still needs editorial review. Prompt-guided personalization improves relevance, but does not guarantee creator-perfect output.

### Product messaging risk

The biggest current risk is overclaiming multi-platform maturity when the strongest product story is Telegram-first execution.

---

## 14. Non-Goals for the Current V1 Narrative

The current product narrative should avoid claiming:

- a fully unified multi-platform analytics dashboard
- drag-and-drop calendar management
- podcast ingestion
- AI image generation
- team collaboration
- comment analysis or viral prediction
- advanced AI fine-tuning
- non-Stripe payment methods

These may become valid roadmap items later, but they should not appear as shipped capability today.
