# Heroku Deployment Runbook

This project is Bun-first in local development, but the Heroku deploy path below uses the official `heroku/nodejs` buildpack.

## Deployment Trigger Model (Important)

- Current production app: `morning-plains-48170`.
- Deploys are triggered by pushing code to the Heroku git remote.
- `git push origin main` does **not** redeploy Heroku by itself.
- Heroku redeploy happens when you push to `heroku/main` (for example: `git push heroku HEAD:main`).
- GitHub branch auto-deploy is optional and only works if Heroku Deploy -> GitHub integration + Automatic Deploys is enabled for the target branch.

## 1. Install and log in to Heroku CLI

```bash
heroku --version
heroku login
```

## 2. Create app and set stack/buildpack

```bash
heroku create <your-app-name> --stack heroku-24
heroku buildpacks:set heroku/nodejs -a <your-app-name>
```

## 3. Set environment variables

Set every value from `.env.local` on Heroku.

```bash
heroku config:set -a <your-app-name> \
  NODE_ENV=production \
  HUSKY=0 \
  NEXT_PUBLIC_APP_URL=https://<your-app-name>.herokuapp.com \
  NEXT_PUBLIC_SUPABASE_URL=... \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  DATABASE_URL=... \
  GEMINI_API_KEY=... \
  TELEGRAM_BOT_TOKEN=... \
  TELEGRAM_WEBHOOK_SECRET=... \
  INNGEST_SIGNING_KEY=... \
  INNGEST_EVENT_KEY=... \
  ENCRYPTION_KEY=... \
  STRIPE_SECRET_KEY=... \
  STRIPE_WEBHOOK_SECRET=... \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=... \
  STRIPE_PLUS_PRICE_ID=... \
  STRIPE_PRO_PRICE_ID=... \
  LINKEDIN_CLIENT_ID=... \
  LINKEDIN_CLIENT_SECRET=... \
  TWITTER_CLIENT_ID=... \
  TWITTER_CLIENT_SECRET=...
```

Optional:

```bash
heroku config:set -a <your-app-name> \
  ADMIN_EMAIL=... \
  ADMIN_EMAILS=... \
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=... \
  GOOGLE_SITE_VERIFICATION=... \
  YANDEX_VERIFICATION=... \
  SUPPORT_EMAIL=...
```

## 4. Deploy current branch to Heroku

```bash
heroku git:remote -a <your-app-name>
git push heroku HEAD:main
```

Typical flow when you also use GitHub:

```bash
git push origin main    # updates GitHub only
git push heroku main    # triggers Heroku build/release
```

## 5. Smoke check

```bash
heroku logs --tail -a <your-app-name>
curl -sf https://<your-app-name>.herokuapp.com/api/health
```

Expected health response:

```json
{ "status": "ok" }
```

## 6. Post-deploy webhooks and callbacks

- Telegram webhook URL: `https://<your-app-name>.herokuapp.com/api/telegram/webhook`
- Stripe webhook URL: `https://<your-app-name>.herokuapp.com/api/billing/webhook`
- Inngest endpoint: `https://<your-app-name>.herokuapp.com/api/inngest`
- Set LinkedIn/Twitter OAuth callback URLs to this app domain.

Example Telegram webhook registration:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://<your-app-name>.herokuapp.com/api/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```
