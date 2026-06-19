---
name: Stripe-Zendesk Connector App
description: Stripe UI Extension that connects Stripe dashboard to Zendesk, showing support tickets for Stripe customers
type: project
originSessionId: 172a4d55-4425-46d5-905c-980e031206e0
---
A Stripe App (UI Extension) that integrates Zendesk into the Stripe dashboard.

**Location:** `/home/hugoburet/stripe-zendesk-link/stripe-app/`

**What it does:** Displays Zendesk support tickets for the current Stripe customer in the Stripe dashboard drawer. Supports searching tickets by email, creating new tickets, and OAuth connect/disconnect.

**Tech stack:**
- React + TypeScript, Stripe UI Extension SDK (`@stripe/ui-extension-sdk`)
- Supabase edge functions as proxy (CORS workaround): `https://gbtzgszldsarfwzcqoiz.supabase.co/functions/v1/`
- Zendesk OAuth PKCE flow; tokens stored in Stripe Secret Store
- App ID: `com.example.invoicetemplate`, current version: `0.0.158`, distribution: public

**Key files:**
- `src/views/App.tsx` — root, routes between views based on OAuth state and customer context
- `src/views/GetStartedView.tsx` — OAuth connect flow (enter subdomain, open auth URL)
- `src/views/CustomerDetailView.tsx` — tickets list for a specific customer + create ticket form
- `src/views/AppDrawerView.tsx` — search by email, disconnect option (shown when no customer context)
- `src/api/zendesk.ts` — proxy-based API: `fetchTicketsByEmail`, `createTicket`
- `src/hooks/useZendeskOAuth.ts` — PKCE OAuth, polling for tokens, Stripe Secret Store read/write
- `stripe-app.json` — app manifest (permissions: `customer_read`, `secret_write`)

**There is also a web app** at `/home/hugoburet/stripe-zendesk-link/` (React/Vite/Tailwind) which appears to be a companion or dashboard but the main Stripe app is the `stripe-app/` subdirectory.

**Why:** Allows support agents to see and manage Zendesk tickets without leaving the Stripe dashboard.
