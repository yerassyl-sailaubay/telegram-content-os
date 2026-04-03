# Engineering Launch Readiness Checklist

Last updated: 2026-04-02 (Asia/Almaty)

## Purpose

This document is the engineering-only gate before starting or scaling marketing.

Use it to answer one question:

**Is the product technically safe enough to drive more traffic into right now?**

This checklist complements, not replaces:

- `docs/features.md` — product truth and marketing-safe claims
- `docs/testing-plan.md` — full execution plan
- `docs/manual-qa-checklist.md` — detailed human QA artifact
- `docs/PRELAUNCH_CHECKLIST.md` — concise launch overview

## How To Use This Document

1. Run the automated gate first.
2. Fix all P0 failures before manual testing.
3. Run production-like smoke and manual QA.
4. Collect evidence, not opinions.
5. Do not start marketing until all P0 items are complete.

## Go / No-Go Rule

You can market the product only if:

- All **P0** items are complete.
- No open **Sev 0** or **Sev 1** defects remain.
- Product behavior matches `docs/features.md`.
- Billing behavior matches current shipped reality.
- Engineering has evidence for the core flows in a production-like environment.

---

## P0 — Release-Blocking Engineering Gate

### 1. Automated Baseline

- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] `bunx tsc --noEmit` passes
- [ ] `bun run build` passes
- [ ] No newly introduced TypeScript, ESLint, or build warnings are ignored as “later” if they affect launch-critical flows

### 2. Core Product Flows

- [ ] Signup, login, logout work in both locales (`/ru`, `/en`)
- [ ] Unauthenticated users cannot access dashboard routes
- [ ] Telegram channel connection works with a real test channel
- [ ] Telegram webhook ingestion works for at least one valid text post
- [ ] Draft create -> reopen -> edit -> save works
- [ ] Publish-now flow sends a real Telegram post successfully
- [ ] Schedule flow works for a near-term post (+2 minutes)
- [ ] Scheduled post actually publishes on time
- [ ] Analytics page loads without runtime errors
- [ ] At least one AI flow works end-to-end in a production-like environment:
  - Develop idea, or
  - Repurpose content, or
  - Generate from source URL

### 3. Billing and Quotas

- [ ] Stripe checkout session can be created successfully
- [ ] Successful Stripe checkout updates the user plan correctly
- [ ] Stripe customer portal opens for an eligible subscribed user
- [ ] Stripe webhook signature verification is active and tested
- [ ] Free/Plus/Pro quota enforcement matches the current shipped pricing truth in `docs/features.md`
- [ ] AI quota enforcement is applied consistently across all launch-critical AI entry points
- [ ] Payment failures are visible to the user and do not fail silently

### 4. Security and Permissions

- [ ] User A cannot read or edit User B data
- [ ] Stripe webhook rejects invalid signatures
- [ ] Telegram webhook rejects invalid secret headers
- [ ] No secrets appear in client-rendered output
- [ ] No secrets or sensitive payloads are leaked in logs, screenshots, or test artifacts
- [ ] Auth redirects and locale behavior are verified for real navigation flows
- [ ] Required environment variables are present in the deployed environment

### 5. Background Jobs and Operations

- [ ] `GET /api/health` returns HTTP 200 with `{ "status": "ok" }`
- [ ] `GET /api/inngest` returns healthy cloud mode with keys present
- [ ] `PUT /api/inngest` sync succeeds
- [ ] At least one launch-critical Inngest path has been exercised successfully in a deployed environment
- [ ] Failed job/webhook behavior is visible in logs or alerts
- [ ] Rollback path is documented and understood
- [ ] Supabase backup/snapshot strategy has been verified recently

---

## P1 — Strongly Recommended Before Scaling Marketing

### 1. UX and Reliability

- [ ] Key pages look acceptable at 320px, 768px, and 1440px
- [ ] Long-running actions show loading states
- [ ] Duplicate-submit prevention works on critical forms
- [ ] Error states are actionable and understandable
- [ ] Day-boundary and timezone scheduling cases are verified
- [ ] Failed schedule states are visible and recoverable

### 2. Observability and Safety Rails

- [ ] Runtime error monitoring is configured (not only console logs)
- [ ] Alerts exist for failed webhooks, payment failures, and broken scheduling
- [ ] Admin/ops view or equivalent visibility exists for environment and billing state
- [ ] Launch-day smoke script can be executed in 15–20 minutes

### 3. Security Hardening

- [ ] Security headers have been reviewed for production readiness
- [ ] OAuth callback and state/cookie tampering paths have been checked
- [ ] Sensitive env/config failures are caught early instead of surfacing only at runtime
- [ ] Media/webhook edge cases are reviewed for scale/restart safety

---

## Payments Scope Rule

### Current shipped billing truth

Today’s coded billing path is Stripe-first.

Before marketing, verify:

- Stripe checkout
- Stripe webhook handling
- Plan updates
- Quota enforcement
- Billing portal behavior

### KZ / CIS / Russia scope decision

If you are planning to market to buyers who need local CIS/Russia-friendly payment rails, Stripe validation alone is not enough.

In that case, treat the following as a separate launch track before promising payment availability to that audience:

- [ ] Choose provider path (`robokassa.kz` is the leading documented candidate)
- [ ] Confirm onboarding/legal/commercial fit
- [ ] Implement provider callbacks/webhooks
- [ ] Add idempotent internal payment state handling
- [ ] Test one-time payment flow end-to-end
- [ ] Test recurring/subscription behavior end-to-end

Reference: `docs/PAYMENTS_KZ_CIS_RESEARCH.md`

---

## AI-Assisted Verification Workflow

Use coding AI to speed up validation, not to replace evidence.

### Recommended flow

1. Run automated checks.
2. Run production-like smoke (`docs/testing-agent.md`).
3. Run manual QA for P0 items (`docs/manual-qa-checklist.md`).
4. Ask AI to audit the following surfaces directly:
   - auth boundaries
   - webhook verification
   - billing and quota enforcement
   - scheduling reliability
   - env/config risks
5. Fix only verified blockers first.

### Good AI usage

- Ask AI to compare `docs/features.md` against actual behavior
- Ask AI to inspect route handlers and server actions for missing auth/quota checks
- Ask AI to review logs, failing smoke runs, and webhook paths
- Ask AI to summarize gaps into P0 / P1 / deferred buckets

### Bad AI usage

- “Looks good” without running tests
- Claiming flows work without production-like evidence
- Treating partial features as launch-ready because code exists somewhere
- Expanding scope into unrelated refactors during launch hardening

---

## Evidence Required For Engineering Sign-Off

Before marketing, engineering should be able to point to:

- [ ] Automated gate output
- [ ] Smoke test output or Playwright report
- [ ] Manual QA checklist with P0 completion
- [ ] Logs/screenshots for critical payment and webhook checks
- [ ] Confirmation that public claims match `docs/features.md`
- [ ] List of any accepted P1/P2 issues with owner and ETA

---

## Blocker Policy

Marketing is blocked if any of the following are true:

- A core Telegram-first flow is broken
- Billing or quota behavior is wrong or unclear
- A webhook accepts invalid signatures/secrets
- A user can access another user’s data
- Production env/config is incomplete
- Background jobs silently fail without detection
- Marketing copy claims features that are still partial or internal

---

## Final Engineering Sign-Off

- [ ] All P0 items complete
- [ ] No open Sev 0 / Sev 1 issues
- [ ] Evidence pack collected
- [ ] Product truth checked against `docs/features.md`
- [ ] Payments scope decision is explicit for target market
- [ ] Engineering approves launch or traffic scale-up
