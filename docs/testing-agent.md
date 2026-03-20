# AI Agent E2E Testing (Using Your Real Account)

Last updated: 2026-03-17 (Asia/Almaty)

## Purpose

Run production-like smoke tests through your own account (with a connected Telegram channel) so an AI agent can validate core flows end-to-end.

## What It Tests

- Authenticated dashboard route health
- Connected channel visibility
- Quick-capture idea creation and appearance in posts
- `/api/health` and `/api/inngest` endpoint sanity

## Prerequisites

1. A dedicated test user account in your app.
2. At least one Telegram channel already connected for that user.
3. `E2E_BASE_URL`, `E2E_EMAIL`, and `E2E_PASSWORD` set.

## Setup

1. Copy `docs/testing-agent.env.example` to `.env.e2e`.
2. Fill real values.
3. Optional: set `E2E_EXPECTED_CHANNEL_NAME` to assert a specific channel is visible.

## Run

```bash
bash scripts/run-agent-smoke.sh
```

Or directly:

```bash
E2E_BASE_URL=https://your-app.com \
E2E_EMAIL=qa-user@example.com \
E2E_PASSWORD='your-password' \
bunx playwright test --config=playwright.agent.config.ts
```

## Reports

- Console output: immediate pass/fail
- HTML report: `playwright-report-agent/`
- Artifacts (screenshots/videos/traces): generated on failures

## GitHub Automation

A scheduled/manual workflow is included at:

- `.github/workflows/agent-prod-smoke.yml`

Required repository secrets:

- `E2E_BASE_URL`
- `E2E_EMAIL`
- `E2E_PASSWORD`
- `E2E_EXPECTED_CHANNEL_NAME` (optional)

It runs daily at 04:00 UTC and on manual trigger (`workflow_dispatch`).

## Safety Notes

- Use a dedicated QA account, not your personal primary account.
- Use a dedicated Telegram test channel to avoid publishing mistakes.
- This suite avoids destructive flows and does not force publish actions.
