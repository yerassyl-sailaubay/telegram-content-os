# Payments Research: KZ Seller for CIS (Including Russia)

Last updated: 2026-03-08 (Asia/Almaty)

## TL;DR

- `Polar` can pay out to sellers in Kazakhstan, but it explicitly blocks payments from Russia (sanctions list).
- For Russia/CIS coverage, a local PSP route is needed. The strongest candidate from this research is `robokassa.kz`.
- `YooKassa` appears possible for non-RF companies, but onboarding is more manual (manager + extra docs) and should be validated before implementation.

## What the official docs/pages say

### 1) Polar.sh

- Polar MoR page says payments are global except sanctioned countries and explicitly includes `Russia` in blocked countries.
- The same page includes `Kazakhstan` in payout-supported countries.
- Polar has webhook support and supports subscription flows in docs.

Implication: Polar is good for global non-Russia users, but not for Russian buyers.

### 2) YooKassa

- YooKassa onboarding docs say non-resident onboarding starts in cabinet and continues with manager-assisted steps.
- Registration docs include a non-RF company path (country selection + manager consultation for document set).
- API examples and limits use `RUB` and Russian-local rails/methods.
- Recurring/autopay and HTTP notifications are documented.

Implication: You can likely attempt onboarding as a non-RF business, but it is not a pure self-serve path and needs commercial/legal confirmation.

### 3) Robokassa / Robokassa.kz

- `robokassa.com` is split by country and points Kazakhstan traffic to `robokassa.kz`.
- `robokassa.kz` is operated by KZ entity `ТОО "ФинСервисы"` and claims payment acceptance from Kazakhstan, CIS, and Europe.
- The KZ site explicitly advertises recurring payments and direct API integration.
- Robokassa docs describe webhook/callback confirmation via `ResultURL` and recurring payments flow.

Implication: For a KZ entrepreneur selling into CIS/Russia, this looks like the best-fitting primary rail from this set.

## Feasibility matrix (for your case)

| Provider     | KZ seller onboarding fit                | Russia buyer fit            | Recurring support        | Webhook/callback support | Verdict                                 |
| ------------ | --------------------------------------- | --------------------------- | ------------------------ | ------------------------ | --------------------------------------- |
| Polar        | High                                    | Low (blocked)               | Yes                      | Yes                      | Use for non-RU markets only             |
| YooKassa     | Medium (manager flow for non-residents) | High                        | Yes                      | Yes                      | Possible, validate contract terms first |
| Robokassa.kz | High                                    | High (claimed CIS coverage) | Yes (noted in site/docs) | Yes                      | Best primary candidate for KZ + CIS     |

## Recommended implementation model in this app

Use a `multi-provider` billing architecture instead of a single PSP.

1. Keep existing Stripe flow for current global traffic (or replace global with Polar later).
2. Add local provider flow for CIS/Russia (`robokassa.kz` first, optionally YooKassa if onboarding succeeds).
3. Route by billing country / user-selected payment region at checkout.
4. Normalize everything through one internal payment state machine:
   - `created -> pending -> paid -> failed -> refunded`
5. Keep one entitlement source of truth in your DB (not in PSP), updated by provider webhooks.

## Minimal rollout plan

1. Merchant onboarding with `robokassa.kz` (confirm legal entity, payout currency, settlement schedule).
2. One-time payment pilot (payment link + callback validation + idempotency).
3. Subscription pilot (recurring agreement + retry behavior + cancellation handling).
4. Add financial reconciliation job (daily compare PSP ledger vs internal invoices/subscriptions).
5. Expand routing rules (RU/CIS -> local PSP, Rest -> global PSP).

## Critical questions to ask provider managers before coding

1. Can a Kazakhstan `ИП/ТОО` accept payments from Russian buyers (cards + MIR/SBP-equivalent options) today?
2. Settlement details: payout currency, bank requirements, payout timing, FX conversion.
3. Recurring payments: eligibility, approval steps, failure retry policy, and cancel API.
4. Disputes/chargebacks: SLA, evidence workflow, and liability.
5. Cross-border/legal restrictions by product type (digital SaaS subscriptions).

## Sources

- Polar supported countries (includes sanctions + Kazakhstan payouts): https://polar.sh/docs/merchant-of-record/supported-countries
- Polar webhooks: https://polar.sh/docs/integrate/webhooks/endpoints
- Polar orders/subscriptions: https://polar.sh/docs/features/orders
- Stripe global availability (context for KZ limitations): https://stripe.com/global
- YooKassa onboarding docs (non-resident notes): https://yookassa.ru/docs/support/payments/onboarding/docs
- YooKassa registration (country selection, non-RF docs flow): https://yookassa.ru/docs/support/merchant/payments/implement/start
- YooKassa quick start (RUB in API example): https://yookassa.ru/developers/payment-acceptance/getting-started/quick-start
- YooKassa autopay: https://yookassa.ru/docs/support/payments/extra/autopayment
- YooKassa HTTP notifications: https://yookassa.ru/docs/support/merchant/payments/http-notifications
- Robokassa (RU site with KZ switch): https://robokassa.com/
- Robokassa Kazakhstan: https://robokassa.kz/
- Robokassa notifications/callbacks: https://docs.robokassa.ru/ru/notifications-and-redirects.html
- Robokassa recurring payments: https://docs.robokassa.ru/ru/recurring-payments

## Note

This document is product/technical research, not legal or tax advice. Final provider choice should be approved after direct commercial/legal confirmation with provider managers.
