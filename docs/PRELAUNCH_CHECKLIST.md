# Prelaunch Checklist

Last updated: 2026-03-08 (Asia/Almaty)

## 1) Release blockers

- [ ] Full CI test suite is green (`bun run test`).
- [ ] Build is green (`bun run build`).
- [ ] No critical Sentry/runtime errors in the last 24h (or equivalent logs).
- [ ] Environment variables are complete in production (`SUPABASE`, `STRIPE`, `INNGEST`, `TELEGRAM`, `GEMINI`).

## 2) Core user flows (must-pass E2E in prod-like env)

- [ ] Signup/login/logout for both locales (`/ru`, `/en`).
- [ ] Connect Telegram channel (bot is admin, webhook active).
- [ ] Create post -> publish now -> message appears in Telegram channel.
- [ ] Create post -> save draft -> reopen/edit -> save works.
- [ ] Create post -> schedule -> appears in calendar -> posts at time.
- [ ] Edit scheduled post -> reschedule/cancel works.
- [ ] Content library statuses stay consistent (`draft/scheduled/published/archived`).

## 3) Scheduler reliability checks

- [ ] Timezone correctness: UTC vs local time in calendar and execution.
- [ ] Near-time schedule test (1-3 minutes ahead).
- [ ] Day-boundary test (23:55 local and next-day execution).
- [ ] Failed schedule is visible as `failed` and recoverable.

## 4) Billing and quota checks

- [ ] Free/Plus/Pro quota enforcement works for AI generation.
- [ ] Upgrade flow changes limits immediately.
- [ ] Billing webhook updates subscription and usage correctly.
- [ ] Payment failure states are clear to user (no silent failures).

## 5) Security and permissions

- [ ] Unauthenticated users cannot access dashboard routes/actions.
- [ ] User A cannot read/edit User B data.
- [ ] Webhook signature checks are active (billing, telegram).
- [ ] No secrets in client bundle or logs.

## 6) Performance and UX quality

- [ ] Dashboard first load acceptable on mobile + desktop.
- [ ] No obvious layout breakages at 320px, 768px, 1440px.
- [ ] Error states show actionable text and retry path.
- [ ] Long operations have loading states and disabled duplicate-submit buttons.

## 7) Operations readiness

- [ ] `/api/inngest` reachable in production.
- [ ] Alerting configured for failed schedules/webhooks.
- [ ] Simple rollback plan documented (previous deployment or hotfix path).
- [ ] Deployment trigger is documented and understood (`git push origin main` does not deploy unless GitHub auto-deploy is enabled; standard path is `git push heroku HEAD:main`).
- [ ] Daily backup/snapshot strategy verified for Supabase data.

## 8) Launch-day smoke script (15-20 min)

1. Login as a fresh user.
2. Connect test Telegram channel.
3. Publish one post immediately.
4. Schedule one post for +2 minutes.
5. Confirm scheduled post is sent.
6. Verify calendar and content statuses updated.
7. Run one payment flow (checkout + webhook + entitlement/plan update).
