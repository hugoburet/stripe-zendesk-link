---
name: Stripe Slack Connector App
description: Stripe UI Extension (com.apptree.slack-connector) — v0.5.6 uncommitted, pending Slack App Directory approval before live push
type: project
originSessionId: e0af967e-41fa-4fe9-9ed4-0dcea440356e
---
A Stripe App (UI Extension) that sends real-time Stripe event notifications to a Slack workspace with actionable buttons (refund, retry, email customer).

**Locations:**
- Stripe App (UI Extension): `/home/hugoburet/stripe-slack-connector-app/` — v0.5.6 (uncommitted), app ID `com.apptree.slack-connector`
- Supabase backend: `/home/hugoburet/stripe-slack-notifier/supabase/`

**Stripe account:** `acct_1TN1V1EFclgB8tR2`

**Tech stack:**
- React + TypeScript, Stripe UI Extension SDK (`@stripe/ui-extension-sdk`)
- Supabase edge functions as proxy: `https://gbtzgszldsarfwzcqoiz.supabase.co/functions/v1/`
- Slack OAuth (bot token stored in Supabase)

**Plan tiers:**
- Free: 50 notifications lifetime (new users) / 200 (grandfathered existing users), 1 channel, basic events
- Pro ($5/month or $44/year): unlimited notifications, all event types, multi-channel routing, customer context, daily digest

---

## Current state (2026-06-17)

All 325 existing users set to `grandfathered = true` and `plan = 'free'` (billing reset — was set manually before proper billing was built).

**Free tier limits:**
- New users: 50 lifetime, warn DM at 40, hard stop DM at 50
- Grandfathered users: 200 lifetime, warn DM at 175, hard stop DM at 200
- `TEST_NOTIF_COUNT` in App.tsx is currently set to `50` for UI testing — must be flipped to `null` before going live

**Uncommitted changes in App.tsx / stripe-app.json vs v0.5.1:**
- `grandfathered_limit` field added to `MerchantConfig` interface — `effectiveLimit` now reads `config.grandfathered_limit` first, falling back to 200 or FREE_TIER_LIMIT
- Removed `billingInterval` state + monthly/yearly toggle buttons — upgrade button now links to `https://apptree.biz/pricing/?account_id=...&mode=...` with both prices in label
- Email field now required ("Email (required)"), Connect Slack button disabled until email filled, always saves email+name on connect
- Version bumped to `0.5.6` in stripe-app.json

**Backend functions deployed:**
- `activation-nudge` — one-shot + daily drip (pg_cron at 10:00 UTC) for users with 0 notifications 24h+ after connecting Slack
- `stripe-webhook` — updated with grandfathered limits (200) and DM nudges for both user types
- `stripe-billing-webhook`, `create-checkout-session`, `create-portal-session` — billing flow complete

---

## ⚠️ Pending — Push to live

**Do NOT push to live until Slack App Directory review is approved.**

Once approved, steps in order:
1. Flip `TEST_NOTIF_COUNT` to `null` in `src/views/App.tsx`
2. Commit + tag
3. Run `stripe apps upload -p slack --live`

**Why:** Waiting on Slack marketplace listing approval to maximize auth rate for new installs.
