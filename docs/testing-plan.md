# Telegram Content OS - Comprehensive Feature Testing Plan

Last updated: 2026-03-17 (Asia/Almaty)
Owner: QA + Product + Engineering
Target: Production-readiness validation before scaling marketing

## 1. Objective

Validate that the currently marketed product works reliably for real creators in a Telegram-first workflow, with clear boundaries for partial features.

Success criteria:

1. Core value path (capture -> create -> schedule/publish -> review analytics) is stable.
2. Billing/quotas/security are reliable.
3. Integrations and background jobs do not silently fail.
4. Marketing claims match actual behavior.

## 2. Test Scope

In scope:

- User-facing dashboard flows
- Server actions and API routes
- Webhooks and background jobs (Inngest, Telegram, Stripe)
- Billing, quotas, localization, security boundaries
- Operational readiness on deployed environment

Out of scope (for this cycle):

- New feature development
- Visual redesign polish beyond critical UX defects
- Non-Stripe payment provider implementation

## 3. Environments

| Environment                  | Purpose                                   | Required |
| ---------------------------- | ----------------------------------------- | -------- |
| Local (`bun dev`)            | Fast iteration + isolated checks          | Yes      |
| Production-like deployed app | End-to-end integration checks             | Yes      |
| Real external services       | Telegram, Stripe test mode, Inngest Cloud | Yes      |

## 4. Required Test Accounts and Assets

1. Two user accounts (`User A`, `User B`) for authorization/isolation tests.
2. One Telegram test channel where bot is admin.
3. Stripe test customer and test card.
4. Inngest Cloud project with valid signing/event keys.
5. LinkedIn/X test apps (if you want to validate partial multi-platform flows).
6. Test content set:
   - 5 short text ideas
   - 2 long drafts
   - 1 YouTube URL
   - 1 article URL
   - 1 media-group Telegram post

## 5. Execution Order

### Phase 0 - Automated baseline gate (must pass first)

1. `bun run lint`
2. `bun run test`
3. `bunx tsc --noEmit`
4. `bun run build`

Exit rule:

- Stop manual testing if any of the above fails.

### Agent-run smoke automation

You can run an authenticated production-like smoke suite through a real QA account:

```bash
bash scripts/run-agent-smoke.sh
```

Detailed setup is documented in [docs/testing-agent.md](./testing-agent.md).

Manual checkbox checklist for human QA runs: [docs/manual-qa-checklist.md](./manual-qa-checklist.md).

### Phase 1 - P0 critical manual/integration flows

Run suites A through H and L below.

Exit rule:

- All P0 cases pass.
- No data-loss/security/billing-blocker defects open.

### Phase 2 - P1 confidence expansion

Run suites I through N.

Exit rule:

- Product is safe to scale marketing with caveats documented.

### Phase 3 - Launch-day smoke

Run suite O in 15-20 minutes immediately before campaigns.

## 6. Test Suites and Cases

## Suite A - Platform Health and Deploy Integrity

### A-01 (P0) Health endpoint

- Steps:
  1. `curl -sS https://<app-domain>/api/health`
- Expected:
  1. HTTP 200
  2. Body includes `{"status":"ok"}`

### A-02 (P0) Inngest endpoint status

- Steps:
  1. `curl -sS https://<app-domain>/api/inngest`
- Expected:
  1. `mode: "cloud"`
  2. `has_signing_key: true`
  3. `has_event_key: true`
  4. Function count is non-zero

### A-03 (P0) Inngest sync

- Steps:
  1. `curl -i -X PUT https://<app-domain>/api/inngest`
- Expected:
  1. HTTP 200
  2. Response indicates successful registration/sync

### A-04 (P0) Basic dyno/process sanity

- Steps:
  1. Check hosting logs for startup errors
  2. Verify app process stays up after deployment
- Expected:
  1. No crash loop
  2. No fatal runtime env errors

## Suite B - Authentication and Localization

### B-01 (P0) Signup/Login RU locale

- Steps:
  1. Open `/ru/signup`
  2. Create account
  3. Log out and log in again at `/ru/login`
- Expected:
  1. Auth succeeds
  2. Redirect to dashboard
  3. RU locale preserved

### B-02 (P0) Signup/Login EN locale

- Steps:
  1. Repeat B-01 for `/en`
- Expected:
  1. Same success behavior in EN

### B-03 (P0) Auth guard on dashboard routes

- Steps:
  1. Log out
  2. Access `/ru/dashboard`, `/en/dashboard/settings`, `/en/dashboard/posts`
- Expected:
  1. Redirect to login
  2. No data leak in response

### B-04 (P1) Login/Signup pages redirect when already authenticated

- Steps:
  1. Log in
  2. Visit `/ru/login` and `/ru/signup`
- Expected:
  1. Redirect away from auth pages

### B-05 (P1) Locale switch consistency

- Steps:
  1. Navigate between RU and EN while authenticated
- Expected:
  1. Route + UI strings switch correctly
  2. No broken links due locale prefix

## Suite C - Telegram Channel Connection and Webhook Ingestion

### C-01 (P0) Connect Telegram channel

- Steps:
  1. Go to dashboard channels page
  2. Complete channel connection flow
- Expected:
  1. Channel appears in list
  2. Channel detail page loads

### C-02 (P0) Webhook secret validation

- Steps:
  1. Send webhook request with wrong/missing secret
- Expected:
  1. Request rejected
  2. No DB writes from invalid call

### C-03 (P0) Telegram post ingestion (text)

- Steps:
  1. Publish text post in Telegram test channel
  2. Wait for webhook + processing
- Expected:
  1. Post appears in app content flow
  2. Related channel metadata remains consistent

### C-04 (P1) Telegram media group ingestion

- Steps:
  1. Publish album/media-group post
- Expected:
  1. Media grouped correctly
  2. Content record is coherent (no split/dup corruption)

### C-05 (P1) Idempotency/retry safety

- Steps:
  1. Re-send same webhook payload
- Expected:
  1. No duplicate post spam
  2. Pipeline remains stable

### C-06 (P1) Welcome template management per channel

- Steps:
  1. Configure welcome template in channel settings
- Expected:
  1. Save/read/update works

## Suite D - Content Library and Draft Operations

### D-01 (P0) Quick capture creates idea draft

- Steps:
  1. Use quick capture on dashboard
- Expected:
  1. Item appears in content library
  2. Correct status/source type

### D-02 (P0) Create draft and reopen/edit

- Steps:
  1. Create draft
  2. Reopen edit page
  3. Save update
- Expected:
  1. Changes persist
  2. No status mismatch

### D-03 (P1) Filters/search by channel/status

- Steps:
  1. Create mixed content (draft/scheduled/published)
  2. Use library filters/search
- Expected:
  1. Correct result subsets

### D-04 (P1) Archive/restore flows

- Steps:
  1. Archive item
  2. Restore if available
- Expected:
  1. Status transitions are correct

### D-05 (P1) Derived content lineage

- Steps:
  1. Repurpose a post
- Expected:
  1. Parent/child relationships preserved where applicable

## Suite E - AI Workflows

### E-01 (P0) Develop idea to draft

- Steps:
  1. Run Develop Idea action from a short seed
- Expected:
  1. Draft generated
  2. Action result success is visible

### E-02 (P0) Repurpose content

- Steps:
  1. Repurpose existing Telegram-style draft
- Expected:
  1. Repurposed output generated
  2. Stored as draft/derived content

### E-03 (P0) Generate from YouTube URL

- Steps:
  1. Submit valid YouTube URL in create flow
- Expected:
  1. External source enters pipeline
  2. Generated drafts appear

### E-04 (P0) Generate from article URL

- Steps:
  1. Submit valid article URL
- Expected:
  1. Same as E-03, with article extraction path

### E-05 (P1) Invalid source URL handling

- Steps:
  1. Submit unsupported/invalid URL
- Expected:
  1. Clear error shown
  2. No broken pipeline state

### E-06 (P1) Quota enforcement for AI actions

- Steps:
  1. Exhaust AI quota on Free plan
  2. Trigger another AI operation
- Expected:
  1. Action blocked with clear message

### E-07 (P1) Channel profile influence sanity

- Steps:
  1. Run profile update conditions
  2. Generate content again
- Expected:
  1. No crashes in profile logic
  2. Preferences/profile remain persisted

### E-08 (P1) Failure observability

- Steps:
  1. Force one AI failure case (invalid key or malformed input in test env)
- Expected:
  1. Error is surfaced in logs/UI
  2. No silent corruption in content records

## Suite F - Scheduling and Recurring Reliability

### F-01 (P0) Schedule a post for +2 minutes

- Steps:
  1. Create draft
  2. Schedule for near future
- Expected:
  1. Appears in calendar
  2. Executes on time

### F-02 (P0) Cancel scheduled post

- Steps:
  1. Schedule post
  2. Cancel before due time
- Expected:
  1. Status updates correctly
  2. Post is not published

### F-03 (P1) Reschedule flow

- Steps:
  1. Move scheduled time via current UX
- Expected:
  1. New time persists
  2. Calendar reflects update

### F-04 (P1) Timezone correctness

- Steps:
  1. Change timezone in settings
  2. Schedule another near-time post
- Expected:
  1. Display and execution align with selected timezone

### F-05 (P1) Day-boundary case

- Steps:
  1. Schedule around 23:55 local / next-day boundary
- Expected:
  1. Correct day/time execution

### F-06 (P1) Recurring schedule processing

- Steps:
  1. Create recurring schedule
  2. Observe at least one recurrence
- Expected:
  1. Recurring task executes without duplicates

## Suite G - Telegram Publishing

### G-01 (P0) Publish now (text)

- Steps:
  1. Publish draft immediately
- Expected:
  1. Message appears in Telegram channel
  2. App status updates to published

### G-02 (P1) Publish media post

- Steps:
  1. Publish draft with media
- Expected:
  1. Media appears correctly

### G-03 (P1) Publish media group

- Steps:
  1. Publish album/multi-media content
- Expected:
  1. Grouped publish behavior is correct

### G-04 (P1) Publish failure handling

- Steps:
  1. Trigger controlled failure (invalid channel permission in test)
- Expected:
  1. User sees actionable error
  2. Failed state is visible/recoverable

## Suite H - Telegram Analytics

### H-01 (P0) Analytics page loads with real channel

- Steps:
  1. Open dashboard analytics page after ingestion/publishing activity
- Expected:
  1. Page loads without errors
  2. Core blocks render

### H-02 (P1) Growth/timing/top-content views

- Steps:
  1. Inspect available charts/cards
- Expected:
  1. Values are present and coherent

### H-03 (P1) Empty-state behavior

- Steps:
  1. Test with a new channel with minimal data
- Expected:
  1. Helpful empty state text, no crashes

### H-04 (P1) Analytics refresh cadence sanity

- Steps:
  1. Run/observe analytics collection jobs
- Expected:
  1. Freshness updates over time

## Suite I - Billing, Plans, and Quotas

### I-01 (P0) Free plan baseline limits

- Steps:
  1. Verify Free account limit behavior for AI/cross-post/channel count
- Expected:
  1. Enforced limits match plan definitions

### I-02 (P0) Checkout flow (test mode)

- Steps:
  1. Upgrade to paid plan via Stripe checkout
- Expected:
  1. Checkout completes
  2. Subscription updates in app

### I-03 (P0) Billing portal flow

- Steps:
  1. Open customer portal
- Expected:
  1. Portal session created and redirects properly

### I-04 (P0) Stripe webhook handling

- Steps:
  1. Trigger test webhook events
- Expected:
  1. Signature verified
  2. Subscription/usage state updates correctly

### I-05 (P1) Upgrade applies limits immediately

- Steps:
  1. Hit limit on Free
  2. Upgrade to Plus/Pro
  3. Retry action
- Expected:
  1. Action succeeds post-upgrade

### I-06 (P1) Payment failure behavior

- Steps:
  1. Simulate failed payment event
- Expected:
  1. Clear state to user/admin
  2. No silent entitlement mismatch

### I-07 (P1) Pricing copy parity check

- Steps:
  1. Compare visible pricing with enforced plans
- Expected:
  1. No copy/product mismatch

## Suite J - LinkedIn/X Partial Surfaces

### J-01 (P1) OAuth connect flows

- Steps:
  1. Run LinkedIn and X connect callbacks
- Expected:
  1. Tokens stored successfully
  2. Settings page reflects connection state

### J-02 (P1) Adaptation output generation

- Steps:
  1. Run AI adaptation for LinkedIn/X
- Expected:
  1. Platform-specific outputs generated

### J-03 (P2) Posting pipeline sanity (where UI path exists)

- Steps:
  1. Execute a controlled post path through available actions
- Expected:
  1. Background orchestration works

### J-04 (P1) Marketing boundary check

- Steps:
  1. Confirm no claim implies fully mature multi-platform suite
- Expected:
  1. Public copy remains aligned with actual UX maturity

## Suite K - Media Management

### K-01 (P1) Media upload and retrieval

- Steps:
  1. Upload media
  2. Retrieve/display in UI where available
- Expected:
  1. Upload succeeds
  2. Media metadata persists

### K-02 (P2) Media delete/cleanup

- Steps:
  1. Delete media asset
- Expected:
  1. Asset no longer selectable
  2. No stale references

### K-03 (P2) Composer integration sanity

- Steps:
  1. Use media in publish/composer path
- Expected:
  1. Attachment flow is stable

## Suite L - Security and Data Isolation

### L-01 (P0) Route access control

- Steps:
  1. Attempt dashboard API/action access while unauthenticated
- Expected:
  1. Denied/redirected consistently

### L-02 (P0) Cross-user data isolation

- Steps:
  1. As User A, attempt to access/edit User B data via URLs/actions
- Expected:
  1. Access denied

### L-03 (P0) Stripe webhook signature enforcement

- Steps:
  1. Send webhook with invalid signature
- Expected:
  1. Rejected

### L-04 (P0) Telegram webhook secret enforcement

- Steps:
  1. Send webhook with invalid secret
- Expected:
  1. Rejected

### L-05 (P1) Secret leakage check

- Steps:
  1. Inspect logs and client bundles for sensitive env values
- Expected:
  1. No secrets exposed

### L-06 (P1) OAuth callback state/cookie integrity

- Steps:
  1. Tamper state/cookie values in callback flow
- Expected:
  1. Flow rejected safely

## Suite M - Operational Reliability and Observability

### M-01 (P0) Background queue visibility

- Steps:
  1. Trigger multiple Inngest functions (test/hello, schedule, AI)
- Expected:
  1. Runs visible and debuggable

### M-02 (P1) Failure alerting path

- Steps:
  1. Introduce one controlled failure
- Expected:
  1. Failure detectable quickly via logs/monitoring

### M-03 (P1) Restart resilience

- Steps:
  1. Restart app process
  2. Re-run key smoke calls
- Expected:
  1. System recovers cleanly

### M-04 (P1) Backup/snapshot readiness

- Steps:
  1. Confirm database backup strategy exists and last run succeeded
- Expected:
  1. Recovery path documented and tested recently

### M-05 (P1) Rollback readiness

- Steps:
  1. Confirm previous release rollback procedure
- Expected:
  1. Team can roll back within minutes

## Suite N - UX and Performance Sanity

### N-01 (P1) Responsive layout checks

- Steps:
  1. Validate key pages at 320px, 768px, 1440px
- Expected:
  1. No critical layout breakage

### N-02 (P1) Loading states and duplicate-submit prevention

- Steps:
  1. Trigger long operations and rapid-click submits
- Expected:
  1. Buttons disable properly
  2. No duplicate operations

### N-03 (P2) Dashboard first-load responsiveness

- Steps:
  1. Measure rough first-load timing on mobile/desktop networks
- Expected:
  1. Acceptable perceived performance for launch

### N-04 (P1) Error message quality

- Steps:
  1. Trigger representative failures
- Expected:
  1. Errors are actionable and understandable

## Suite O - Launch-Day 20-Minute Smoke Runbook

1. Login with fresh user.
2. Connect Telegram test channel.
3. Create one draft from quick capture.
4. Develop one idea with AI.
5. Publish one post now to Telegram.
6. Schedule one post for +2 minutes.
7. Confirm scheduled publish executes.
8. Open analytics page and verify it loads.
9. Run Inngest endpoint checks (`GET` + `PUT`).
10. Execute one Stripe test checkout flow.

Pass rule:

- All 10 steps succeed without blocker-level defects.

## 7. Defect Triage Rules

### Severity

- Sev 0: Data loss, security issue, billing corruption, complete outage
- Sev 1: Core flow blocked (cannot create/schedule/publish)
- Sev 2: Major but workaround exists
- Sev 3: Minor issue/polish

### Release gate policy

- No open Sev 0 or Sev 1 defects.
- Sev 2 allowed only with explicit mitigation and ownership.
- Sev 3 can be deferred.

## 8. Evidence Pack for Marketing Go-Live

Collect and store:

1. Screenshots/video of core P0 flows passing.
2. Logs proving Inngest jobs execute successfully.
3. Stripe checkout + webhook proof in test mode.
4. Telegram publish-now and scheduled publish proof.
5. Copy/product parity checklist signed off.

## 9. Final Sign-Off Checklist

- [ ] Phase 0 automated baseline passed.
- [ ] All P0 tests passed.
- [ ] No unresolved Sev 0/1 defects.
- [ ] Pricing/capability claims match real product behavior.
- [ ] Ops owner and rollback owner confirmed.
- [ ] Marketing launch approved.
