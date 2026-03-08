# API ROUTES KNOWLEDGE BASE

## OVERVIEW

`src/app/api` owns OAuth endpoints, billing endpoints, health checks, Inngest serving, and the Telegram webhook. These files define request contracts and security checks; business logic stays in `src/lib` and `src/server`.

## STRUCTURE

```
api/
├── auth/              # LinkedIn + Twitter OAuth initiation/callback routes
├── billing/           # Checkout, portal, Stripe webhook
├── health/            # Smoke-test target
├── inngest/           # serve() wrapper for registered functions
└── telegram/          # Telegram webhook ingestion
```

## ROUTE INVENTORY

| Route                             | Methods              | Purpose                                                                | Notes                                                  |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `auth/linkedin/route.ts`          | `GET`                | Start LinkedIn PKCE OAuth flow                                         | Requires `LINKEDIN_CLIENT_ID` + `NEXT_PUBLIC_APP_URL`  |
| `auth/linkedin/callback/route.ts` | `GET`                | Exchange code, encrypt tokens, upsert connection                       | `runtime = "nodejs"`; clears OAuth cookies             |
| `auth/twitter/route.ts`           | `GET`                | Start Twitter PKCE OAuth flow                                          | Stores verifier/state in HTTP-only cookies             |
| `auth/twitter/callback/route.ts`  | `GET`                | Exchange code, encrypt/store Twitter tokens                            | Redirects to `/dashboard/settings`                     |
| `billing/checkout/route.ts`       | `POST`               | Create Stripe Checkout session                                         | Requires authenticated user and `priceId` body         |
| `billing/portal/route.ts`         | `POST`               | Create Stripe customer portal session                                  | Requires stored `stripeCustomerId`                     |
| `billing/webhook/route.ts`        | `POST`               | Verify Stripe signature and dispatch webhook handler                   | Read raw body with `request.text()` first              |
| `health/route.ts`                 | `GET`                | Return app health status                                               | Used by smoke tests                                    |
| `inngest/route.ts`                | `GET`, `POST`, `PUT` | Serve registered Inngest functions                                     | Registry lives in `src/lib/inngest/functions/index.ts` |
| `telegram/webhook/route.ts`       | `POST`               | Verify secret, batch media groups, persist updates, emit Inngest event | `runtime = "nodejs"`; uses lazy DB imports             |

## CONVENTIONS

- Export named HTTP verbs only; no default exports.
- Prefer lazy imports for DB, billing, or platform clients in routes that must build without runtime env vars.
- Use `NextResponse.json(...)` for machine endpoints and redirects only for browser-facing OAuth callbacks.
- Verify authenticity before side effects: Stripe uses raw-body signature verification, Telegram checks a secret header, OAuth callbacks validate state cookies.
- Set `runtime = "nodejs"` when a route depends on Node APIs like `crypto`.
- Clear transient OAuth cookies after successful callback handling.
- The localized Supabase auth callback is outside this subtree at `src/app/[locale]/(auth)/auth/callback/route.ts`.

## ANTI-PATTERNS

- Do NOT parse Stripe JSON before signature verification.
- Do NOT import DB clients eagerly in webhook routes that need to evaluate without `DATABASE_URL`.
- Do NOT return 5xx for Telegram app-level processing failures after the payload is accepted; log and acknowledge to avoid retries.
- Do NOT duplicate OAuth token encryption/storage logic in pages or components; keep it in callback routes + `src/lib/platforms/*`.
