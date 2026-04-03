# Low-Budget Yandex Direct Launch Plan for Telegram Content OS

## TL;DR

> **Summary**: Prepare Telegram Content OS for truthful paid acquisition, validate technical and SEO readiness, then launch a low-budget Yandex Direct program that starts with Master Campaign CPA and expands to Expert RSYA only if economics are proven.
> **Deliverables**:
>
> - truthful RU/EN landing for paid traffic
> - SEO audit + prioritized fix list
> - keyword map from Yandex Wordstat + Google Keyword Planner
> - Yandex Metrica goals + UTM taxonomy + evidence pack
> - one Master Campaign, one conditional RSYA campaign, one conditional retargeting setup
> - month-1 go / iterate / stop decision report
>   **Effort**: Large
>   **Parallel**: YES - 3 waves
>   **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 8 → Task 9 → Task 10

## Context

### Original Request

Create a research-backed low-budget ads marketing plan for Telegram Content OS using Yandex Direct, preceded by SEO analysis, with keyword research based on Yandex Wordstat and Google Keyword Planner.

### Interview Summary

- Product is a Telegram-first AI content workflow tool with AI drafting, repurposing, scheduling, publishing, and Telegram analytics.
- Target audience is Russian-speaking Telegram creators and small SMM operators.
- Budget cap is under 30,000 RUB/month.
- Pre-work must include SEO audit, keyword research, truthful landing alignment, and conversion tracking.
- Campaign strategy is intentionally conservative: Master Campaign first, RSYA second, Search delayed until economics are proven.

### Metis Review (gaps addressed)

- Lock phase 1 to one primary KPI: completed signup.
- Do not launch paid traffic until landing claims match shipped product truth.
- Add stop-loss thresholds before launch.
- Exclude Google Ads, VK Ads, Telegram Ads, CRM automation, and broad redesign from phase 1.
- Define clear scale / iterate / stop rules after the first 28-day cycle.

## Work Objectives

### Core Objective

Acquire the first economical, truthfully-qualified paid signups from Yandex Direct without exceeding 24,000 RUB in month 1, while preserving product-message fidelity and collecting enough evidence to decide whether Yandex is a scalable channel.

### Deliverables

- Updated live landing copy in `src/messages/en.json`, `src/messages/ru.json`, and landing structure only if required.
- SEO audit report and prioritized fix matrix.
- Keyword workbook covering core, adjacent, and negative queries.
- Verified Yandex Metrica setup with one primary goal and supporting activation events.
- One launched Master Campaign and one conditional Expert RSYA campaign.
- Month-1 performance report with scale / iterate / stop recommendation.

### Definition of Done (verifiable conditions with commands)

- Live landing claims match shipped-product evidence from docs and plan limits; unsupported marketing phrases are removed from RU/EN landing copy.
- `bun build` succeeds after landing and analytics changes.
- SEO audit is run against the live marketing URL with `seomator audit <LIVE_URL> --crawl -m 20 --format llm --no-cwv` and saved to evidence.
- One Yandex Metrica goal named `signup_completed` fires during QA and appears in Metrica reports.
- Master Campaign is live with fixed CPA, approved ads, and correct UTM parameters.
- RSYA campaign is launched only if Task 8 gates pass.
- Month-1 spend recorded is `<= 24000 RUB`.

### Must Have

- One primary conversion KPI for bidding: `signup_completed`.
- Secondary quality KPI for reporting only: `first_telegram_channel_connected` within 7 days.
- Month-1 budget cap: `24000 RUB` total.
- Master Campaign launched before any Expert campaign.
- Search campaign explicitly deferred from month 1.
- Separate evidence artifact for every task.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)

- No claims about voice notes, podcast ingestion, mature multi-platform suite behavior, custom fine-tuning, or Telegram bot inbox unless directly evidenced in shipped product.
- No launch before end-to-end Metrica goal QA is complete.
- No optimization around CTR, clicks, impressions, or generic traffic in phase 1.
- No Google Ads, VK Ads, Telegram Ads, influencer campaigns, CRM automation, or full redesign in this plan.
- No paid-plan CPA bidding in month 1; checkout viability for RU/CIS is too uncertain and must not be the initial optimization target.

## Verification Strategy

> ZERO HUMAN INTERVENTION — all verification is agent-executed.

- Test decision: tests-after + existing Bun build/test stack, plus Playwright/manual-web QA for landing and Yandex UI steps.
- QA policy: Every task includes a happy-path and failure/edge-path scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy

### Parallel Execution Waves

> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: market / message / tracking readiness (Tasks 1-5)
Wave 2: launch the low-risk acquisition path (Tasks 6-8)
Wave 3: conditional expansion and decisioning (Tasks 9-10)

### Dependency Matrix (full, all tasks)

- Task 1 blocks Tasks 3, 4, 6, 7.
- Task 2 informs Task 3.
- Task 3 blocks Tasks 6, 7.
- Task 4 informs Tasks 6, 7, 9.
- Task 5 blocks Tasks 7, 8, 9, 10.
- Task 6 blocks Tasks 7 and 9.
- Task 7 blocks Task 8.
- Task 8 gates Task 9 and Task 10.
- Task 9 blocks Task 10 only if RSYA launch criteria pass.

### Agent Dispatch Summary (wave → task count → categories)

- Wave 1 → 5 tasks → `deep`, `writing`, `unspecified-high`, `quick`
- Wave 2 → 3 tasks → `writing`, `unspecified-high`, `quick`
- Wave 3 → 2 tasks → `unspecified-high`, `deep`

## TODOs

> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Freeze market, offer, KPI, and launch economics

  **What to do**: Create a one-page acquisition brief that locks the month-1 audience, offer, KPI, geo policy, and stop-loss rules before any asset or campaign work starts. Use this exact default unless evidence strongly disproves it: audience = solo Telegram creators + small SMM operators managing `1-5` Telegram channels; offer = Free plan entry with Telegram-first AI drafting / scheduling / publishing / analytics; primary KPI = `signup_completed`; secondary KPI = `first_telegram_channel_connected`; month-1 cap = `24000 RUB`; Master Campaign first; Search deferred. Add a payment-risk note: paid-plan economics are reporting-only until checkout availability for RU/CIS is verified.
  **Must NOT do**: Do not optimize for paid checkout, demos, vanity traffic, or a multi-channel social-suite positioning. Do not widen scope to Google Ads, VK Ads, or Telegram Ads.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this task makes all downstream decisions and removes ambiguity.
  - Skills: `[]` — No specialized skill is needed beyond repo truth + ad-planning logic.
  - Omitted: `[landing-page-copywriter]` — Messaging writing comes later after constraints are frozen.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3, 4, 6, 7 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Product truth: `docs/prd.md:12-18` — product scope must follow current codebase, not aspirational story.
  - Positioning: `docs/prd.md:58-68` — product is Telegram-first, not a mature multi-platform suite.
  - Shipped scope: `docs/prd.md:97-127` — shipped, partial, and internal-only capabilities.
  - Pricing truth: `docs/prd.md:199-214` — public pricing must match enforced plans.
  - Marketing-safe claims: `docs/features.md:111-127` — safe claims vs claims to avoid.
  - Launch gate: `docs/PRELAUNCH_CHECKLIST.md:5-18` — core flows and readiness criteria.
  - Billing enforcement: `src/lib/billing/plans.ts:17-75` — exact free/plus/pro limits.
  - RU/CIS payments risk: `docs/PAYMENTS_KZ_CIS_RESEARCH.md:47-65` — local PSP may be needed for RU/CIS monetization.
  - Provider questions: `docs/PAYMENTS_KZ_CIS_RESEARCH.md:66-73` — do not assume RU recurring payment viability.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.sisyphus/evidence/task-1-acquisition-brief.md` exists and contains the locked audience, offer, KPI, geo defaults, budget cap, stop-loss rules, and “Search deferred” rule.
  - [ ] The brief explicitly states `signup_completed` as the only bidding KPI for month 1.
  - [ ] The brief explicitly states month-1 cap `<= 24000 RUB` and Search = deferred.
  - [ ] The brief explicitly notes RU/CIS payment viability as a reporting caveat, not a hidden assumption.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — acquisition brief is decision-complete
    Tool: Read
    Steps: Open .sisyphus/evidence/task-1-acquisition-brief.md and verify it includes audience, offer, KPI, geo, budget cap, stop-loss thresholds, and search deferral.
    Expected: All six decision areas are present with exact values and no TODO placeholders.
    Evidence: .sisyphus/evidence/task-1-acquisition-brief.md

  Scenario: Failure/edge case — hidden monetization assumption
    Tool: Read
    Steps: Inspect the same brief for any statement that assumes RU/CIS paid checkout already works.
    Expected: No such assumption exists; the brief labels payment viability as a risk/caveat.
    Evidence: .sisyphus/evidence/task-1-acquisition-brief-risk-check.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `.sisyphus/evidence/task-1-acquisition-brief.md`

- [ ] 2. Run live landing SEO audit and prioritize only P0/P1 fixes

  **What to do**: Audit the live landing URL, not localhost, using the SEOmator workflow. First run `seomator self doctor`; if missing, install the CLI from the local skill path. Then run a 20-page crawl with LLM output and an HTML report. Convert the findings into a fix matrix with four columns: issue, severity, affected URL/path, action owner. Only P0/P1 issues that affect crawlability, indexability, page trust, page speed, or conversion clarity should feed the launch backlog.
  **Must NOT do**: Do not turn this into a broad SEO program. Do not fix low-impact warnings before paid-launch blockers. Do not audit localhost unless no live URL exists.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: tool-driven analysis plus prioritization across technical and content issues.
  - Skills: `[seo-audit]` — Needed for exact CLI setup, crawl, and output format.
  - Omitted: `[webapp-testing]` — This is SEO audit work, not product-flow browser testing.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Live landing surfaces: `docs/landing-copy-rewrite-context.md:22-31` — real marketing surface lives in Next.js app and translation files.
  - Rewrite priority: `docs/landing-copy-rewrite-context.md:144-170` — hero/workflow/proof/pricing/CTA sections to protect.
  - Prelaunch quality gate: `docs/PRELAUNCH_CHECKLIST.md:43-56` — mobile/desktop, errors, deployment readiness.
  - Skill workflow: `seo-audit` skill — use `seomator self doctor` then `seomator audit <LIVE_URL> --crawl -m 20 --format llm --no-cwv`.
  - Yandex campaign-master site guidance: `https://www.yandex.com/support/direct/ru/campaign-master/site` — landing requirements for site promotion.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `seomator self doctor` completes successfully OR installation steps are executed and the tool then completes successfully.
  - [ ] Audit artifacts exist: `.sisyphus/evidence/task-2-seo-audit.llm.xml` and `.sisyphus/evidence/task-2-seo-audit.html`.
  - [ ] `.sisyphus/evidence/task-2-seo-fix-matrix.md` exists and contains only P0/P1 launch-relevant issues.
  - [ ] The fix matrix clearly separates “must fix before ads” from “backlog after launch”.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — live audit completes and produces usable backlog
    Tool: Bash
    Steps: Run `seomator self doctor`, then `seomator audit <LIVE_URL> --crawl -m 20 --format llm --no-cwv -o .sisyphus/evidence/task-2-seo-audit.llm.xml`, and generate an HTML report as well.
    Expected: Audit exits successfully and both reports are created.
    Evidence: .sisyphus/evidence/task-2-seo-audit.llm.xml

  Scenario: Failure/edge case — tool missing or live URL unavailable
    Tool: Bash
    Steps: If `seomator` is unavailable, install from the local skill path; if live URL is unavailable, document the block and stop before using localhost as a silent substitute.
    Expected: Either the tool is installed and the live audit runs, or a blocking note is captured explicitly with no fake audit output.
    Evidence: .sisyphus/evidence/task-2-seo-audit-blocker.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `.sisyphus/evidence/task-2-*`

- [ ] 3. Fix landing truthfulness and conversion blockers for paid traffic

  **What to do**: Update the live landing copy so every paid-traffic claim is verifiable against shipped product truth. Remove or soften unsupported claims about Telegram bot inbox capture, voice notes, podcasts, mature cross-platform analytics, and “AI learns your voice.” Replace them with safe wording around Telegram-first workflow, web idea capture, imported Telegram posts, channel-profile-guided prompting, and Telegram analytics. Apply only the minimum layout/CTA changes required to improve conversion clarity and mobile usability. Keep pricing synchronized with enforced plan limits.
  **Must NOT do**: Do not redesign the site broadly, introduce new feature claims, or add roadmap promises. Do not change pricing away from `src/lib/billing/plans.ts`.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: this is copy truth alignment first, structure second.
  - Skills: `[landing-page-copywriter]` — Needed to rewrite benefits and CTAs without hype or false claims.
  - Omitted: `[ui-ux-pro-max]` — broad visual redesign is explicitly out of scope.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6, 7 | Blocked By: 1, 2

  **References** (executor has NO interview context — be exhaustive):
  - Landing surfaces: `docs/landing-copy-rewrite-context.md:22-31` — primary files to edit.
  - Safe claims: `docs/landing-copy-rewrite-context.md:48-68` — evidence-backed positioning.
  - Remove/soften claims: `docs/landing-copy-rewrite-context.md:72-97` — unsupported copy to remove now.
  - Recommended direction: `docs/landing-copy-rewrite-context.md:124-170` — hero, workflow, proof, pricing, CTA rewrite guidance.
  - Copy guardrails: `docs/landing-copy-rewrite-context.md:183-191` — exact statements to avoid.
  - Landing overclaims (EN): `src/messages/en.json:879-903` — hero/proof language currently overclaims voice matching and Telegram bot capture.
  - Landing overclaims (EN): `src/messages/en.json:990-1046` — idea inbox, voice notes, and “learns how you write” copy that must be softened or removed.
  - Landing overclaims (RU): `src/messages/ru.json:877-899` — “От голосовой заметки” and Telegram capture claims.
  - Landing overclaims (RU): `src/messages/ru.json:987-1019` — bot-centric capture and voice-profile claims to soften.
  - Pricing source of truth: `src/lib/billing/plans.ts:17-75` — exact quotas and names.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun build` succeeds after landing edits.
  - [ ] Grep across `src/messages/en.json` and `src/messages/ru.json` no longer returns unsupported paid-traffic phrases in landing sections for: `voice note`, `podcast`, `learns how you write`, `голосовая заметка`, and equivalent unsupported claims.
  - [ ] Landing pricing copy matches `src/lib/billing/plans.ts:17-75` exactly for Free, Plus, and Pro.
  - [ ] Updated landing clearly presents one primary CTA for the paid-traffic route: sign up for free.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — truthful landing builds and presents a clear signup CTA
    Tool: Bash + Playwright
    Steps: Run `bun build`, open the RU landing and EN landing, inspect hero, pricing, workflow, and final CTA sections.
    Expected: Build passes, pricing is correct, unsupported claims are absent, and the main CTA leads to signup.
    Evidence: .sisyphus/evidence/task-3-landing-truthful.png

  Scenario: Failure/edge case — unsupported claim survives in one locale
    Tool: Grep + Read
    Steps: Search `src/messages/en.json` and `src/messages/ru.json` for old unsupported phrases and review the matched lines.
    Expected: Zero unsupported claim matches remain in landing copy; any remaining match blocks completion.
    Evidence: .sisyphus/evidence/task-3-landing-claims-check.md
  ```

  **Commit**: YES | Message: `docs(marketing): align landing claims with shipped product` | Files: `src/messages/en.json`, `src/messages/ru.json`, `src/components/marketing/landing-page.tsx` (only if structure must change), `src/app/[locale]/page.tsx` (only if routing/CTA wiring must change)

- [ ] 4. Build the keyword map with intent labels, negatives, and launch clusters

  **What to do**: Build one keyword workbook with four tabs: `core`, `adjacent`, `negative`, `deferred`. Use Yandex Wordstat as the source of truth and Google Keyword Planner only as corroboration. Seed categories are fixed: Telegram scheduling / autoposting, Telegram content workflow, AI text/content generation, and SMM planner alternatives. For each keyword capture: phrase, source, monthly volume estimate, intent (`high-commercial`, `mid-commercial`, `informational`, `competitor`, `negative`), launch decision, and landing match. Build launch clusters for month 1: `telegram planner`, `telegram autoposting`, `content plan for telegram`, `ai content drafting for telegram`, `smmplanner alternatives`. Add a strict negative list for jobs, free downloads, cracked tools, generic bot trivia, course-seekers, and unrelated Telegram bots.
  **Must NOT do**: Do not launch broad informational AI terms like `нейросеть для текста` unless the phrase includes workflow or Telegram context. Do not mix positive and competitor terms in the same cluster. Do not treat Google data as authoritative over Wordstat for Yandex buying decisions.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this task determines spend allocation, negatives, and campaign structure.
  - Skills: `[]` — No dedicated skill needed; this is analytical compilation work.
  - Omitted: `[seo-audit]` — SEO audit is already handled separately and should not absorb keyword clustering work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6, 7, 9 | Blocked By: 1

  **References** (executor has NO interview context — be exhaustive):
  - User-requested tools: Yandex Wordstat + Google Keyword Planner.
  - Wordstat access point: `https://wordstat.yandex.ru/` — primary source for Yandex search demand.
  - Wordstat usage background: `https://kokoc.com/blog/yandex-wordstat` — operator and query research refresher.
  - Product-safe offer framing: `docs/prd.md:71-92` — Telegram-first, AI-assisted drafting, optional cross-platform support.
  - Shipped feature set to match keywords: `docs/prd.md:97-113` — actual user-facing workflows.
  - Marketing-safe claim set: `docs/features.md:111-127` — keep keyword intent aligned to safe public claims.
  - Competitor set from research: SMMplanner, LiveDune, Postmypost, SMMFlow.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.sisyphus/evidence/task-4-keyword-map.csv` exists with columns: `phrase,source,volume_estimate,intent,cluster,launch_decision,landing_match,negative_reason`.
  - [ ] The map contains at least `50` phrases total, at least `20` negative keywords, and at least `5` launch clusters.
  - [ ] Competitor phrases are isolated into their own cluster and marked `competitor`.
  - [ ] If Google Keyword Planner is unavailable within `20 minutes`, the workbook is completed with Wordstat-only data and a clearly marked `gkp_unavailable` note.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — keyword workbook is launch-ready
    Tool: Read
    Steps: Open .sisyphus/evidence/task-4-keyword-map.csv and verify required columns, minimum phrase counts, negative list, and cluster assignments.
    Expected: File meets the required schema and contains a bounded, launch-ready list rather than an unfiltered dump.
    Evidence: .sisyphus/evidence/task-4-keyword-map.csv

  Scenario: Failure/edge case — Google Keyword Planner access is blocked
    Tool: Read
    Steps: Inspect the workbook header/notes section for the `gkp_unavailable` fallback note and ensure launch decisions still rely on Wordstat data.
    Expected: Work continues with Wordstat as source of truth; no empty deliverable is left waiting for GKP access.
    Evidence: .sisyphus/evidence/task-4-keyword-map-notes.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `.sisyphus/evidence/task-4-keyword-map.csv`

- [ ] 5. Implement Yandex Metrica, goal tracking, and UTM taxonomy for the signup funnel

  **What to do**: Add Yandex Metrica to the live landing/app shell in the canonical location, then define one primary goal `signup_completed` and one reporting-only activation event `first_telegram_channel_connected`. If the app already has analytics instrumentation, extend it rather than duplicating it. Create a fixed UTM taxonomy for all month-1 campaigns: `utm_source=yandex`, `utm_medium=cpc`, `utm_campaign=tcos_{campaign_type}_{cluster}_{locale}`, `utm_content={creative_id}`, `utm_term={keyword_or_audience}`. Verify that Metrica receives the signup goal end-to-end using a tagged test visit.
  **Must NOT do**: Do not create multiple bidding goals, duplicate counters, or inconsistent UTM parameter names. Do not make checkout or paid-plan purchase the bidding goal.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: combines app changes, analytics wiring, and QA.
  - Skills: `[]` — Existing repo patterns should guide implementation; no extra skill required.
  - Omitted: `[seo-audit]` — This is event instrumentation, not SEO work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 8, 9, 10 | Blocked By: 1, 3

  **References** (executor has NO interview context — be exhaustive):
  - App root and locale shell: `AGENTS.md:73-96` — request flow and locale routing constraints.
  - Live landing surfaces: `docs/landing-copy-rewrite-context.md:24-31` — real landing is in Next.js app and message catalogs.
  - Prelaunch requirement: `docs/PRELAUNCH_CHECKLIST.md:43-56` — loading states, mobile, and operational readiness matter for paid traffic.
  - Yandex support: `https://www.yandex.com/support/direct/ru/campaign-master/site` — campaigns to site require working metrics.
  - CPA strategy guidance: `https://yandex.ru/adv/edu/materials/oplata-za-konversii` — conversion-based strategy needs reliable goals.
  - Existing pricing/activation context: `docs/prd.md:217-228` — current user journey from signup to channel connection.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Exactly one Yandex Metrica counter is installed for the paid-traffic landing/app surface.
  - [ ] Goal `signup_completed` appears in Metrica after a tagged QA signup flow.
  - [ ] Reporting event `first_telegram_channel_connected` is captured and visible in analytics/logging, even if not used for bidding.
  - [ ] `.sisyphus/evidence/task-5-utm-taxonomy.md` documents the exact UTM structure and naming rules.
  - [ ] `bun build` succeeds after analytics changes.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — tagged visit converts and Metrica records signup
    Tool: Playwright + Read
    Steps: Open the landing with a Yandex-style UTM URL, complete the signup flow, then verify Metrica shows the `signup_completed` goal after the expected delay.
    Expected: Goal fires exactly once for the test session and the UTM tags are preserved through signup.
    Evidence: .sisyphus/evidence/task-5-metrica-goal-check.png

  Scenario: Failure/edge case — signup works but goal does not fire
    Tool: Playwright + Read
    Steps: Repeat the same signup flow and inspect the analytics instrumentation / Metrica debug evidence.
    Expected: Missing goal is treated as a blocking defect; campaign launch cannot proceed.
    Evidence: .sisyphus/evidence/task-5-metrica-blocker.md
  ```

  **Commit**: YES | Message: `feat(analytics): add yandex metrica tracking for signup funnel` | Files: tracking entrypoint(s) in `src/app`, `src/components`, analytics helpers, and any environment/config files required for Metrica wiring

- [ ] 6. Build the messaging matrix and ad asset pack for Master + RSYA

  **What to do**: Create one asset pack that maps each launch cluster to one value proposition, one CTA, one proof point, and one landing-section match. The messaging defaults are fixed: `Telegram-first`, `AI-assisted drafting`, `schedule and publish`, `repurpose existing content`, `analyze what works`. Create at least `8` headlines, `6` descriptions, `6` sitelinks, `6` callouts, `3` promotional angles, and `3` static visual directions for RSYA. All copy must point to free signup, not direct paid purchase. Competitor clusters should use alternative/comparison copy, not trademark stuffing or misleading “official” wording.
  **Must NOT do**: Do not let Yandex auto-generate copy unchecked. Do not reuse one generic headline across all clusters. Do not promise unsupported features or “fully automatic content machine” behavior.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: this is a structured copy-and-offer asset task.
  - Skills: `[landing-page-copywriter]` — Needed for strong but credible CTA and benefit language.
  - Omitted: `[ui-ux-pro-max]` — visual direction is lightweight asset guidance, not full design work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7, 9 | Blocked By: 1, 3, 4

  **References** (executor has NO interview context — be exhaustive):
  - Product positioning: `docs/prd.md:58-68` — Telegram-first positioning only.
  - Value proposition: `docs/prd.md:71-92` — one system for creation and operations, AI guided by channel context.
  - Safe claims: `docs/features.md:111-127` — approved public claim set.
  - Landing direction: `docs/landing-copy-rewrite-context.md:124-170` — hero/workflow/proof messaging priorities.
  - Enforced pricing and offer ladder: `src/lib/billing/plans.ts:17-75` — free plan is the entry offer.
  - Campaign-master guidance from research: `https://vc.ru/marketing/1754788-kak-effektivno-nastroit-yandeks-direkt-v-2025-godu-instrukciya-ot-a-do-ya` — rewrite auto-generated ads manually and use sitelinks/callouts as advantages.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.sisyphus/evidence/task-6-messaging-matrix.md` exists with cluster-to-message mapping.
  - [ ] `.sisyphus/evidence/task-6-ad-assets.md` contains at least the required counts for headlines, descriptions, sitelinks, callouts, promo angles, and RSYA visual directions.
  - [ ] Every asset points to free signup or product exploration, never to unsupported promises or paid-checkout-first messaging.
  - [ ] Competitor assets are labeled clearly and separated from core-intent assets.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — each launch cluster has a distinct message and CTA
    Tool: Read
    Steps: Review the messaging matrix and confirm every launch cluster maps to a distinct angle, proof, CTA, and landing match.
    Expected: No cluster is left with generic filler copy or missing CTA/landing mapping.
    Evidence: .sisyphus/evidence/task-6-messaging-matrix.md

  Scenario: Failure/edge case — unsupported or duplicated messaging leaks into assets
    Tool: Read
    Steps: Review the ad asset pack for unsupported claims, duplicate headlines, or competitor confusion.
    Expected: Unsupported and duplicate assets are removed before campaign entry.
    Evidence: .sisyphus/evidence/task-6-assets-review.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `.sisyphus/evidence/task-6-*`

- [ ] 7. Launch the Master Campaign as the month-1 low-risk acquisition path

  **What to do**: Create exactly one Yandex Direct Master Campaign with these locked settings: type = `Конверсии и трафик`; campaign name = `TCOS | MC | Signup | RU | Core`; geo = `Russia`; language = RU assets first; bidding strategy = `Maximum target actions`; goal = `signup_completed`; payment = fixed CPA; initial CPA = `600 RUB`; week-1 budget = `6000 RUB`; schedule = `24/7`; audience = `optimal audience`; manual ads only from Task 6; UTM taxonomy from Task 5; `Direct helps`/auto-application disabled where configurable; neural auto-generated ad variants disabled. Use the free-signup landing only. Add sitelinks/callouts and at least one promo extension only if it states a truthful offer such as free plan / free start, not an invented discount.
  **Must NOT do**: Do not launch Search in parallel. Do not use checkout or paid subscription as the campaign goal. Do not leave system-generated copy/images unchecked.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: external ad-platform execution with multiple irreversible settings.
  - Skills: `[]` — This is platform operation, not a repo-skill problem.
  - Omitted: `[landing-page-copywriter]` — assets should already be finalized from Task 6.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8 | Blocked By: 1, 3, 4, 5, 6

  **References** (executor has NO interview context — be exhaustive):
  - Campaign Master setup guidance: `https://www.yandex.com/support/direct/ru/campaign-master/site` — site-promotion flow and key settings.
  - CPA strategy basics: `https://yandex.ru/adv/edu/materials/oplata-za-konversii` — goal quality and conversion strategy expectations.
  - Multi-goal support context: `https://yandex.ru/adv/news/oplata-za-konversii-po-neskolkim-tselyam-v-mastere-kampaniy` — do not use this in phase 1; stay on one bidding goal.
  - Month-1 KPI and budget rules: `.sisyphus/evidence/task-1-acquisition-brief.md` — source of truth for this launch.
  - UTM taxonomy: `.sisyphus/evidence/task-5-utm-taxonomy.md` — required tags for every ad URL.
  - Asset pack: `.sisyphus/evidence/task-6-ad-assets.md` — only approved headlines/descriptions/extensions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A live campaign named `TCOS | MC | Signup | RU | Core` exists in Yandex Direct with the specified goal, fixed CPA, weekly budget, and geo.
  - [ ] Ads are approved by moderation.
  - [ ] Every ad URL contains the UTM schema from Task 5.
  - [ ] Evidence screenshots/export exist for campaign settings, ads, and moderation status.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — Master Campaign launches with exact locked settings
    Tool: Playwright
    Steps: Open Yandex Direct, create the campaign with the exact name, goal, CPA, budget, geo, and approved manual assets, then review the final settings screen.
    Expected: Campaign settings match the plan exactly and the campaign enters moderation / active state without missing required fields.
    Evidence: .sisyphus/evidence/task-7-master-campaign-settings.png

  Scenario: Failure/edge case — Yandex pushes auto-generated assets or wrong goal settings
    Tool: Playwright
    Steps: Inspect the ad creation flow and final review screen for auto-generated ads, extra goals, or missing UTM parameters.
    Expected: Auto-generated assets are disabled/removed and only `signup_completed` is used as the bidding goal.
    Evidence: .sisyphus/evidence/task-7-master-campaign-safeguards.png
  ```

  **Commit**: NO | Message: `n/a` | Files: `.sisyphus/evidence/task-7-*`

- [ ] 8. Hold the Master Campaign steady for learning, then gate scale vs iterate vs stop

  **What to do**: After launch, do not make routine optimizations for the first `7` full days unless a blocking tracking or moderation defect appears. At day 7 and day 14, export a performance review covering spend, clicks, signups, signup CPA, device split, and activation rate to `first_telegram_channel_connected`. Apply these fixed rules: if spend reaches `3000 RUB` with `0` signups, verify tracking first; if tracking is healthy, raise CPA once from `600` to `750 RUB` and wait `4` more days; if spend reaches `6000 RUB` with fewer than `3` signups, classify campaign as red and stop expansion; if at least `10` signups are recorded and signup CPA is `<= 850 RUB`, classify as eligible for RSYA expansion. Mine search-term / audience insights and landing behavior from Direct + Metrica reports, then produce one action log with “keep / pause / exclude / rewrite” decisions.
  **Must NOT do**: Do not tweak copy daily, rotate multiple goals, or change geo/audience mid-learning. Do not expand to RSYA without the eligibility gate.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this task interprets noisy early data and decides channel fate.
  - Skills: `[]` — No specialized skill required beyond disciplined analysis.
  - Omitted: `[seo-audit]` — SEO is no longer the gating issue here.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 9, 10 | Blocked By: 5, 7

  **References** (executor has NO interview context — be exhaustive):
  - Month-1 KPI thresholds: `.sisyphus/evidence/task-1-acquisition-brief.md` — green/yellow/red economics source.
  - User-journey activation benchmark: `docs/prd.md:217-228` — signup → channel connect is the relevant quality path.
  - Low-risk campaign discipline from research: `https://vc.ru/marketing/1754788-kak-effektivno-nastroit-yandeks-direkt-v-2025-godu-instrukciya-ot-a-do-ya` — avoid over-touching early CPA campaigns.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.sisyphus/evidence/task-8-master-review-day7.md` exists with spend, signups, CPA, device split, and activation observations.
  - [ ] `.sisyphus/evidence/task-8-master-review-day14.md` exists with the same metrics and a final classification: `scale`, `iterate`, or `stop`.
  - [ ] Any CPA change from `600` to `750` is documented with the exact trigger condition.
  - [ ] `.sisyphus/evidence/task-8-action-log.md` records every keep/pause/exclude/rewrite decision with reason.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — campaign reaches a clear decision state
    Tool: Read
    Steps: Inspect day-7 and day-14 review files and confirm they include spend, signups, CPA, activation rate, and a final scale/iterate/stop decision.
    Expected: Decision is evidence-based and explicitly tied to the fixed thresholds in this plan.
    Evidence: .sisyphus/evidence/task-8-master-review-day14.md

  Scenario: Failure/edge case — no signups but tracking is broken, not traffic quality
    Tool: Read
    Steps: Review the action log and blocker notes for a branch that checks tracking before changing CPA or pausing the campaign.
    Expected: Tracking failure is diagnosed first; the campaign is not misclassified as a traffic failure without that check.
    Evidence: .sisyphus/evidence/task-8-tracking-vs-traffic-check.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `.sisyphus/evidence/task-8-*`

- [ ] 9. Launch one Expert RSYA campaign only from proven clusters

  **What to do**: Only if Task 8 ends in `scale` or high-confidence `iterate`, create exactly one Expert Mode RSYA campaign from the best-performing `2-3` clusters only. Use these locked defaults: campaign name = `TCOS | RSYA | Signup | RU | Core`; network = `RSYA only`; no Search; goal = `signup_completed`; strategy = maximum conversions with fixed CPA where available; initial CPA target = `500 RUB`; weekly budget = `1500 RUB`; schedule = `24/7`; creatives = the RSYA-safe assets from Task 6; negative list = Task 4 list plus any day-7/day-14 exclusions from Task 8. After `3` days, review placements and exclude obviously irrelevant inventory. If delivery is <30% of budget with `0` conversions and tracking is healthy, raise CPA once to `650 RUB` and continue for `4` more days.
  **Must NOT do**: Do not launch RSYA from all keyword groups. Do not run Search + RSYA in the same expert campaign. Do not use competitor terms in the first RSYA expansion.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: execution in external platform with conditional budget/CPA logic.
  - Skills: `[]` — The task is operational, not skill-bound.
  - Omitted: `[landing-page-copywriter]` — assets must already be approved.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10 | Blocked By: 4, 5, 6, 8

  **References** (executor has NO interview context — be exhaustive):
  - Search vs RSYA rationale from research: `https://butskevich.ru/poisk-vs-rsy/` — RSYA is colder/cheaper and must follow proven intent.
  - Cost context: `https://team-b.ru/blog/skolko-stoit-reklama-v-yandeks-direkt/` — CPC/lead costs vary widely, so phase-1 proof is required before expansion.
  - Keyword clusters: `.sisyphus/evidence/task-4-keyword-map.csv` — only highest-intent clusters may graduate into RSYA.
  - Asset pack: `.sisyphus/evidence/task-6-ad-assets.md` — use only approved static assets.
  - Day-14 decision: `.sisyphus/evidence/task-8-master-review-day14.md` — must justify RSYA launch.

  **Acceptance Criteria** (agent-executable only):
  - [ ] RSYA campaign exists only if Task 8 marked the account eligible for expansion.
  - [ ] Campaign is `RSYA only`, not mixed with Search.
  - [ ] Budget, CPA target, negative list, and selected clusters match the locked settings above.
  - [ ] Placement review evidence exists and irrelevant placements are either documented or excluded.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — proven clusters are launched in a bounded RSYA test
    Tool: Playwright + Read
    Steps: Create the Expert campaign, verify RSYA-only placement, apply the approved asset set and negatives, then capture the settings.
    Expected: One bounded RSYA campaign is launched exactly from the selected clusters and budgets.
    Evidence: .sisyphus/evidence/task-9-rsya-settings.png

  Scenario: Failure/edge case — expansion attempted without Task 8 eligibility
    Tool: Read
    Steps: Compare Task 9 launch evidence against Task 8 day-14 classification.
    Expected: If Task 8 did not approve expansion, Task 9 is skipped and documented as skipped rather than force-launched.
    Evidence: .sisyphus/evidence/task-9-rsya-gate-check.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `.sisyphus/evidence/task-9-*`

- [ ] 10. Launch retargeting only if the audience is eligible, then publish the month-1 decision report

  **What to do**: Check whether Yandex/Metrica audience sizes are large enough for remarketing. If an eligible audience exists for recent non-converters (target: at least `300` recent visitors or the platform’s minimum eligible audience, whichever is higher) and remaining month-1 budget is available, launch one small retargeting campaign named `TCOS | RT | Signup | RU | 30d` with `500 RUB/week` and free-signup reminder messaging. If the audience is ineligible or budget headroom is gone, skip retargeting and document the skip. In all cases, produce the month-1 report with campaign totals, CPA, activation rate, device/creative learnings, excluded queries/placements, and a single recommendation: `scale`, `iterate`, or `stop`.
  **Must NOT do**: Do not force retargeting when audience size is below eligibility. Do not exceed the overall month-1 cap of `24000 RUB`. Do not produce a vague report without a binary recommendation.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: final decisioning, budget control, and channel recommendation.
  - Skills: `[]` — Analytical consolidation only.
  - Omitted: `[seo-audit]` — not relevant to final paid-channel decisioning.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: none | Blocked By: 5, 8, 9

  **References** (executor has NO interview context — be exhaustive):
  - Budget cap and KPI thresholds: `.sisyphus/evidence/task-1-acquisition-brief.md`.
  - Master Campaign performance: `.sisyphus/evidence/task-8-master-review-day14.md`.
  - RSYA performance (if launched): `.sisyphus/evidence/task-9-rsya-gate-check.md`, campaign exports, and placement review.
  - Product journey benchmark: `docs/prd.md:217-228` — signup alone is insufficient; activation quality matters.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.sisyphus/evidence/task-10-month1-report.md` exists and includes spend by campaign, signups, CPA, activation rate, exclusions, creative learnings, and final recommendation.
  - [ ] If retargeting launched, `.sisyphus/evidence/task-10-retargeting-settings.png` exists and month-1 spend still totals `<= 24000 RUB`.
  - [ ] If retargeting did not launch, `.sisyphus/evidence/task-10-retargeting-skip.md` exists with the exact reason: audience ineligible or budget exhausted.
  - [ ] Final recommendation is exactly one of: `scale`, `iterate`, `stop`.

  **QA Scenarios** (MANDATORY — task incomplete without these):

  ```
  Scenario: Happy path — final report supports a clear next-step decision
    Tool: Read
    Steps: Open the month-1 report and verify spend, signup CPA, activation rate, exclusions, learnings, and final recommendation are all present.
    Expected: Report is complete, numeric, and ends with exactly one recommendation.
    Evidence: .sisyphus/evidence/task-10-month1-report.md

  Scenario: Failure/edge case — retargeting audience is too small
    Tool: Read
    Steps: Check the retargeting note for audience eligibility and budget status.
    Expected: Retargeting is explicitly skipped with reason; no forced low-signal campaign is launched.
    Evidence: .sisyphus/evidence/task-10-retargeting-skip.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `.sisyphus/evidence/task-10-*`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy

- Commit 1: `docs(marketing): align landing claims with shipped product`
- Commit 2: `feat(analytics): add yandex metrica tracking for signup funnel`
- No commit for Yandex account changes; store screenshots and exports under `.sisyphus/evidence/` only.

## Success Criteria

- Landing copy is truthful in RU and EN and matches product/docs evidence.
- Month-1 spend stays under `24000 RUB`.
- At least `25` verified `signup_completed` conversions OR enough data to reject channel with confidence.
- Signup CPA is green at `<= 600 RUB`, yellow at `601-850 RUB`, red at `> 850 RUB` after at least `15` signups.
- Activation rate from signup to `first_telegram_channel_connected` is `>= 20%` in the paid cohort.
- A binary next-step recommendation exists: `scale`, `iterate`, or `stop`.
