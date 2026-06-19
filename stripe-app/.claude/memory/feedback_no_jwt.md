---
name: Always use --no-verify-jwt when deploying Slack Connector edge functions
description: Every supabase edge function in the slack connector must be deployed with --no-verify-jwt. Omitting it re-enables JWT and immediately breaks that function for all users.
type: feedback
originSessionId: 8ce6f887-481e-466d-bb9a-5b4bd71ed3f5
---
Every `supabase functions deploy` command in the Slack Connector project (`/home/hugoburet/stripe-slack-notifier/`) MUST include `--no-verify-jwt --project-ref gbtzgszldsarfwzcqoiz`.

**Why:** Supabase re-enables JWT verification every time you deploy without the flag. None of the callers (Stripe App frontend, Stripe webhooks, pg_cron) send JWT tokens, so re-enabling JWT instantly causes 401 errors for all users. This happened on 2026-06-01 when deploying without the flag broke `stripe-webhook` for all existing notification users.

**How to apply:** No exceptions — always use:
```bash
supabase functions deploy <name> --no-verify-jwt --project-ref gbtzgszldsarfwzcqoiz
```
This applies to every function: `stripe-webhook`, `merchant-config`, `slack-channels`, `slack-actions`, `slack-oauth-callback`, `log-event`, `create-checkout-session`, `stripe-billing-webhook`, `create-portal-session`, `submit-feedback`, and any new functions added in future.
