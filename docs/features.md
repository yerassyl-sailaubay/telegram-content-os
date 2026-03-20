# Telegram Content OS - Feature Status Source of Truth

Last updated: 2026-03-17 (Asia/Almaty)
Owner: Product + Engineering

## Purpose

This document is the canonical product-truth snapshot for marketing, sales, QA, and launch readiness.

Use it to answer three questions:

1. What is clearly shipped and user-facing right now?
2. What exists but is partial or mostly backend?
3. What should not be claimed publicly yet?

## Current Status Snapshot

| Area                         | Status                   | Notes                                                                       |
| ---------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| Auth and account access      | Shipped                  | Email/password + OAuth routes are present; dashboard routes are auth-gated. |
| Localization                 | Shipped                  | RU/EN supported, RU default locale.                                         |
| Telegram channel connection  | Shipped                  | Bot setup + webhook ingestion flow is active.                               |
| Telegram post ingestion      | Shipped                  | Channel posts and media groups are persisted and processed.                 |
| Content library              | Shipped                  | Draft/scheduled/published workflows, filtering/search, idea storage.        |
| Web quick capture (ideas)    | Shipped                  | Text-first idea capture on dashboard.                                       |
| AI idea development          | Shipped                  | Idea to draft flow available.                                               |
| AI repurposing               | Shipped                  | Repurpose existing content into alternative formats.                        |
| AI generation from sources   | Shipped                  | YouTube + web article URL ingestion and generation.                         |
| AI channel profiling         | Shipped                  | Prompt guidance from channel profile is implemented.                        |
| AI adaptation for LinkedIn/X | Partial                  | Adaptation logic exists; broader UX maturity is still limited.              |
| Calendar scheduling          | Shipped with limitations | Month/week/day views + recurring schedules; no drag-and-drop UX.            |
| Telegram publishing          | Shipped                  | Publish now and scheduled publish are available.                            |
| Telegram analytics           | Shipped                  | Growth/timing/top-content focused user-facing analytics.                    |
| LinkedIn/X posting pipeline  | Partial                  | Backend actions/orchestration exist; UI surface is not fully productized.   |
| LinkedIn/X analytics surface | Partial                  | Collection plumbing exists; dashboard remains Telegram-first.               |
| Media management             | Partial                  | Backend + route exist, but UX depth is still limited.                       |
| Billing and quotas (Stripe)  | Shipped                  | Enforced plan limits, checkout, portal, webhook handling.                   |
| Inngest background jobs      | Shipped                  | Endpoint active and functions registered/invokable.                         |
| Admin/internal tools         | Internal                 | Useful for ops/debug, not a marketing headline.                             |

## Clearly Shipped User-Facing Features

### Telegram-first workflow

- Connect Telegram channels
- Ingest channel posts through webhook
- Store and manage drafts/content in one library
- Publish to Telegram now or on schedule
- Review Telegram analytics

### AI-assisted creation workflow

- Develop idea to draft
- Repurpose existing content
- Generate from supported source URLs (YouTube/articles)
- Adapt drafts for LinkedIn/X (with current maturity caveats)

### Scheduling and operations

- Calendar views: month/week/day
- Recurring schedules
- Timezone-aware scheduling
- Inngest-backed background execution

### Account, billing, and settings

- Stripe checkout and billing portal
- Enforced plan limits and usage tracking
- Profile/settings/preferences
- RU/EN localization

## Partial or Limited Surfaces

### Cross-platform operations

- LinkedIn/X adaptation and posting logic exist
- Product UX for cross-post review, broadcast, and lifecycle visibility is not fully polished

### Analytics breadth

- Telegram analytics is the strongest shipped surface
- LinkedIn/X analytics data paths exist but are not yet a fully unified analytics experience

### Media UX depth

- Media backend capabilities are present
- Standalone media workflow remains lighter than core post/schedule flows

### Scheduling UX depth

- Functional scheduling and recurring support are live
- Rescheduling and interaction UX are still less mature than ideal

## Not Shipped as Public Claims

Do not market these as available now:

- Telegram bot private-DM idea inbox as a core user feature
- Voice-note to draft transcription workflow
- Podcast URL ingestion
- Custom AI fine-tuning
- Fully unified cross-platform analytics dashboard
- Drag-and-drop scheduling as a polished workflow

## Marketing-Safe Positioning

### Safe claim set (now)

- Telegram-first content operating system
- AI-assisted drafting and repurposing
- Source-to-draft workflows for YouTube and articles
- Scheduling, Telegram publishing, and Telegram analytics
- Optional LinkedIn/X extensions where available

### Claims to avoid until productized

- "Telegram is your full capture layer"
- "Voice memos become drafts"
- "AI continuously learns your voice"
- "Closed-loop automated analytics to planning"
- "Fully mature multi-platform suite"

## Pricing Truth (Must Match Product)

Current enforced plan model:

| Plan | Price     | AI Calls / Month | Cross-posts / Month | Telegram Channels |
| ---- | --------- | ---------------- | ------------------- | ----------------- |
| Free | $0        | 10               | 5                   | 1                 |
| Plus | $19/month | 100              | 50                  | 5                 |
| Pro  | $49/month | Unlimited        | Unlimited           | Unlimited         |

## Launch Testing Plan

A comprehensive, execution-ready test plan is maintained in [docs/testing-plan.md](./testing-plan.md).

Use that plan as the gate before broad marketing push. Recommended release rule:

- All P0 tests pass
- No unresolved P0/P1 bugs affecting core user value proposition
- Public-facing copy is aligned with this document
