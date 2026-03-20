# Telegram Content OS - Manual QA Master Checklist

Last updated: 2026-03-17 (Asia/Almaty)

## Test Session Info

- [ ] Tester name recorded
- [ ] Date/time recorded
- [ ] Build/commit SHA recorded
- [ ] Environment recorded (`local` / `staging` / `production-like`)
- [ ] Test user accounts prepared (`User A`, `User B`)
- [ ] Telegram test channel connected
- [ ] Stripe test mode ready
- [ ] Inngest Cloud keys set and valid

## How To Use This Checklist

- Mark each item `[x]` when passed.
- If failed, keep unchecked and add bug ID in your test report.
- Release gate: all `P0` items must be checked.

## Phase 0 - Automated Baseline Gate

- [x] P0-00 `bun run lint` passes
- [x] P0-01 `bun run test` passes
- [x] P0-02 `bunx tsc --noEmit` passes
- [x] P0-03 `bun run build` passes

## Suite A - Platform Health and Deploy Integrity

- [ ] A-01 (P0) `GET /api/health` returns HTTP 200
- [ ] A-02 (P0) `GET /api/health` returns `{"status":"ok"}`
- [ ] A-03 (P0) `GET /api/inngest` returns HTTP 200
- [ ] A-04 (P0) `GET /api/inngest` shows `mode: cloud`
- [ ] A-05 (P0) `GET /api/inngest` shows signing/event keys present
- [ ] A-06 (P0) `PUT /api/inngest` sync returns HTTP 200
- [ ] A-07 (P0) Web process is stable (no crash loop)
- [ ] A-08 (P0) No fatal startup env/config errors in logs

## Suite B - Authentication and Localization

- [ ] B-01 (P0) Signup works on `/ru/signup`
- [ ] B-02 (P0) Login works on `/ru/login`
- [ ] B-03 (P0) Signup works on `/en/signup`
- [ ] B-04 (P0) Login works on `/en/login`
- [ ] B-05 (P0) Unauthenticated access to dashboard routes is blocked
- [ ] B-06 (P1) Authenticated user visiting login/signup is redirected out
- [ ] B-07 (P1) Locale switch RU <-> EN works without broken routes
- [ ] B-08 (P1) Logout works cleanly in both locales

## Suite C - Telegram Channel Connection and Ingestion

- [ ] C-01 (P0) Channel connection flow completes successfully
- [ ] C-02 (P0) Connected channel appears in channel list
- [ ] C-03 (P0) Invalid Telegram webhook secret is rejected
- [ ] C-04 (P0) Valid Telegram text post is ingested
- [ ] C-05 (P1) Telegram media-group post ingestion is correct
- [ ] C-06 (P1) Replayed webhook does not create harmful duplicates
- [ ] C-07 (P1) Channel detail page loads correctly
- [ ] C-08 (P1) Welcome template can be created/updated for channel

## Suite D - Content Library and Draft Management

- [ ] D-01 (P0) Quick capture creates an idea item
- [ ] D-02 (P0) Create draft -> reopen -> edit -> save works
- [ ] D-03 (P0) Draft status remains consistent after edits
- [ ] D-04 (P1) Filters by status return correct items
- [ ] D-05 (P1) Channel filter returns correct items
- [ ] D-06 (P1) Search returns expected items
- [ ] D-07 (P1) Archive flow works correctly
- [ ] D-08 (P1) Derived/repurposed items preserve lineage behavior

## Suite E - AI Features

- [ ] E-01 (P0) Develop Idea generates a draft from short input
- [ ] E-02 (P0) Repurpose Content generates expected variant(s)
- [ ] E-03 (P0) Generate from YouTube URL pipeline completes
- [ ] E-04 (P0) Generate from article URL pipeline completes
- [ ] E-05 (P0) Generated outputs appear in content library
- [ ] E-06 (P1) Invalid URL is rejected with clear error
- [ ] E-07 (P1) AI quota limit blocks further generation on Free
- [ ] E-08 (P1) Post-upgrade AI operations resume (quota increased)
- [ ] E-09 (P1) Channel profile read/analyze flow does not error
- [ ] E-10 (P1) AI failure path shows actionable error (no silent fail)

## Suite F - Scheduling and Recurring

- [ ] F-01 (P0) Schedule post for +2 min works
- [ ] F-02 (P0) Scheduled post appears in calendar/list
- [ ] F-03 (P0) Scheduled post publishes at expected time
- [ ] F-04 (P0) Cancel scheduled post prevents publish
- [ ] F-05 (P1) Reschedule flow updates target time correctly
- [ ] F-06 (P1) Timezone setting affects displayed/scheduled times correctly
- [ ] F-07 (P1) Day-boundary scheduling behaves correctly
- [ ] F-08 (P1) Recurring schedule executes once per expected interval
- [ ] F-09 (P1) Failed schedule is visible and recoverable

## Suite G - Telegram Publishing

- [ ] G-01 (P0) Publish now (text) sends to Telegram channel
- [ ] G-02 (P0) App status updates to published after successful send
- [ ] G-03 (P1) Publish with image works correctly
- [ ] G-04 (P1) Publish media group works correctly
- [ ] G-05 (P1) Publish failure path shows clear error and safe state

## Suite H - Telegram Analytics

- [ ] H-01 (P0) Analytics page loads without runtime errors
- [ ] H-02 (P1) Growth metrics render with valid values
- [ ] H-03 (P1) Best time insights render coherently
- [ ] H-04 (P1) Top content list/table renders coherently
- [ ] H-05 (P1) Empty-state analytics UX is clear for low-data channels
- [ ] H-06 (P1) Analytics data refreshes over time as expected

## Suite I - Billing, Plans, and Quotas

- [ ] I-01 (P0) Free plan limits enforced exactly
- [ ] I-02 (P0) Stripe checkout session is created successfully
- [ ] I-03 (P0) Successful checkout updates user plan
- [ ] I-04 (P0) Stripe customer portal session opens successfully
- [ ] I-05 (P0) Billing webhook signature verification works
- [ ] I-06 (P0) Billing webhook updates entitlements correctly
- [ ] I-07 (P1) Upgrade applies increased limits immediately
- [ ] I-08 (P1) Payment failure state is visible and not silent
- [ ] I-09 (P1) Displayed pricing matches enforced backend plan limits

## Suite J - LinkedIn/X Partial Surfaces

- [ ] J-01 (P1) LinkedIn OAuth connect flow succeeds
- [ ] J-02 (P1) X OAuth connect flow succeeds
- [ ] J-03 (P1) Connected platform status appears in settings
- [ ] J-04 (P1) AI adaptation to LinkedIn output works
- [ ] J-05 (P1) AI adaptation to X output works
- [ ] J-06 (P2) Cross-platform posting pipeline sanity check passes (where accessible)
- [ ] J-07 (P1) No public copy implies full multi-platform maturity beyond shipped UX

## Suite K - Media Management

- [ ] K-01 (P1) Media upload works
- [ ] K-02 (P1) Uploaded media is retrievable and visible in UI
- [ ] K-03 (P2) Media delete/cleanup works without stale references
- [ ] K-04 (P2) Media usage in composer/publish flow works

## Suite L - Security and Permissions

- [ ] L-01 (P0) Unauthenticated users cannot access protected dashboard data
- [ ] L-02 (P0) User A cannot read/edit User B resources
- [ ] L-03 (P0) Stripe webhook with invalid signature is rejected
- [ ] L-04 (P0) Telegram webhook with invalid secret is rejected
- [ ] L-05 (P1) OAuth callback state/cookie tampering is rejected
- [ ] L-06 (P1) No secrets exposed in client-visible output
- [ ] L-07 (P1) No sensitive secrets leaked in logs/screenshots

## Suite M - Inngest and Operations Reliability

- [ ] M-01 (P0) Inngest endpoint is reachable (`GET /api/inngest`)
- [ ] M-02 (P0) Inngest sync works (`PUT /api/inngest`)
- [ ] M-03 (P0) Test event triggers function run successfully
- [ ] M-04 (P1) Background function runs are observable in logs/dashboard
- [ ] M-05 (P1) Controlled failure is detectable via logs/alerts
- [ ] M-06 (P1) App restart/redeploy recovers cleanly
- [ ] M-07 (P1) Backup/snapshot strategy verified and recent
- [ ] M-08 (P1) Rollback procedure is documented and tested recently

## Suite N - UX and Performance Sanity

- [ ] N-01 (P1) Key dashboard pages look correct at 320px
- [ ] N-02 (P1) Key dashboard pages look correct at 768px
- [ ] N-03 (P1) Key dashboard pages look correct at 1440px
- [ ] N-04 (P1) Loading states appear during long actions
- [ ] N-05 (P1) Duplicate-submit prevention works on critical forms
- [ ] N-06 (P1) Error messages are clear and actionable
- [ ] N-07 (P2) First-load experience is acceptable on mobile network

## Suite O - Launch-Day 20-Minute Smoke

- [ ] O-01 Login with fresh test user
- [ ] O-02 Confirm at least one channel connected
- [ ] O-03 Create one idea via quick capture
- [ ] O-04 Run one AI feature (Develop Idea or Repurpose)
- [ ] O-05 Publish one post now to Telegram
- [ ] O-06 Schedule one post for +2 minutes
- [ ] O-07 Confirm scheduled post is delivered
- [ ] O-08 Confirm analytics page loads
- [ ] O-09 Confirm Inngest `GET` + `PUT` checks pass
- [ ] O-10 Confirm Stripe checkout test path passes

## Defect Policy

- [ ] No open Sev 0 defects
- [ ] No open Sev 1 defects
- [ ] All Sev 2 defects documented with workaround + owner + ETA
- [ ] Sev 3 items triaged and accepted for deferral

## Final Release Sign-Off

- [ ] All P0 checklist items complete
- [ ] Core marketing claims verified against real product behavior
- [ ] Evidence pack prepared (screenshots, logs, run links)
- [ ] Engineering sign-off complete
- [ ] Product sign-off complete
- [ ] Marketing launch approved
