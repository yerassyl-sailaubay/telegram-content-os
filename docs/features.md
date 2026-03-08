# Telegram Content OS — Product Features

Telegram Content OS is a Telegram-first content workflow product. It helps creators connect Telegram channels, collect and organize content, generate or adapt drafts with AI, schedule publication, publish to Telegram, and review Telegram performance from one place.

Where a capability is still partial, limited, or mainly backend-facing, that is called out directly.

---

## Implemented Now

### Telegram Channel Connection

Connect Telegram channels through the built-in bot setup flow. Once connected, new posts can be ingested into the app automatically. Imported content includes text and common Telegram media types, including media groups.

Each channel also has its own settings area, including welcome-message configuration for greeting new subscribers with template variables such as the subscriber name or channel name.

---

### Content Library

All imported and generated content is stored in a searchable library. You can filter by channel and content status, review drafts, and manage categories and tags.

The library is designed for working with Telegram-originated content over time, not just one-off AI generation.

---

### AI Drafting and Repurposing

The product currently supports several AI-assisted creation workflows:

- **Develop Ideas** — turn a rough idea into a draft
- **Repurpose Content** — reshape an existing post into a different version, including shorter, thread, or poll-oriented variants
- **Generate from Sources** — create drafts from supported source URLs

Supported source ingestion today is focused on **YouTube videos** and **web articles**.

The app also builds a channel profile and stores user preferences so prompts can be guided by channel context and tone preferences. This should be understood as AI assistance informed by your channel, not model fine-tuning.

---

### AI Adaptation for Other Platforms

Telegram content can be adapted for **LinkedIn** and **X / Twitter** with platform-specific prompt flows and previews.

This is best described as optional expansion from a Telegram-first workflow. The strongest and most complete product experience is still Telegram itself.

---

### Scheduling and Calendar

The app includes a visual calendar with **month, week, and day views**. You can create schedules from calendar slots, cancel scheduled posts, and use a limited reschedule flow.

Scheduling is timezone-aware and also supports recurring schedules.

Important limitation: the current experience is **not drag-and-drop scheduling**.

---

### Telegram Publishing

Drafts can be published to Telegram immediately or scheduled for later. The publishing flow supports typical Telegram post shapes, including text posts, single-image posts, media groups, and poll-like content handling.

Telegram publishing is the core distribution workflow in the product today.

---

### Telegram Analytics

Analytics currently centers on Telegram channels. The shipped experience focuses on:

- channel growth
- best posting times
- top-performing content

This is a real user-facing analytics surface and should be described as Telegram analytics first.

---

### Billing and Limits

Billing uses Stripe and includes live plan enforcement inside the app.

Current plans:

- **Free** — `$0`, `10` AI calls/month, `5` cross-posts/month, `1` Telegram channel
- **Plus** — `$19/month`, `100` AI calls/month, `50` cross-posts/month, `5` Telegram channels
- **Pro** — `$49/month`, unlimited AI calls, unlimited cross-posts, unlimited channels

Usage is tracked in-product, and paid plans use Stripe checkout and customer portal flows.

---

### Settings and Localization

The settings area covers profile information, timezone, language, AI preferences, billing snapshot, and connected-platform status.

The interface is localized in **Russian** and **English**, with **Russian as the default locale**.

---

## Implemented with Limited or Partial Surface

### LinkedIn and X Integrations

The codebase includes LinkedIn and X connection flows, adaptation logic, publishing/background orchestration, and some analytics plumbing. That said, the product should not yet be described as a fully mature multi-platform publishing suite.

Use careful wording such as:

- optional LinkedIn and X support
- platform-specific workflows where available
- features subject to platform API limitations

---

### Broader Analytics Plumbing

There is backend work for LinkedIn and X analytics collection, but the main dashboard experience is still Telegram-focused.

Do not describe the current product as having a complete unified analytics dashboard across all connected platforms.

---

### Media Management

The backend includes media upload, storage, deletion, and signed URL support. The dedicated media page is still thin, so this is better described as an available backend capability rather than a polished media library experience.

---

### Rescheduling UX

Rescheduling exists, but it is not yet a full drag-and-drop calendar workflow.

---

## Not Shipped as User-Facing Features

These should not be presented as current product capabilities:

- AI image generation
- podcast ingestion
- comment analysis
- viral prediction
- team collaboration workspaces
- native mobile apps
- non-Stripe payment methods
- a fully unified cross-platform analytics experience

---

## Roadmap Direction

Near-term improvements that fit the current codebase direction:

- stronger LinkedIn and X publishing UX
- broader analytics UI on top of existing collectors
- better rescheduling interactions
- fuller media library UI

Longer-term ideas:

- competitor tracking
- comment and sentiment workflows
- prediction/scoring features
- collaboration features
- additional publishing platforms
- mobile apps
