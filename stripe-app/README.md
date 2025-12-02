# Zendesk Connector - Stripe App

A Stripe App that displays Zendesk customer information and support tickets directly in the Stripe Dashboard.

## Prerequisites

- [Stripe CLI](https://stripe.com/docs/stripe-cli) installed
- Node.js 18+
- A Stripe account with App access
- A backend API serving Zendesk data (see API section below)

## Setup

### 1. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (scoop)
scoop install stripe

# Or download from https://github.com/stripe/stripe-cli/releases
```

### 2. Login to Stripe

```bash
stripe login
```

### 3. Create the App

```bash
# Navigate to parent directory of where you want the app
cd your-projects-folder

# Create a new Stripe app (this will scaffold the project)
stripe apps create zendesk-connector

# Copy these source files into the created project:
# - src/views/CustomerDetailView.tsx
# - src/views/AppDrawerView.tsx
# - src/types.ts
# - src/api/zendesk.ts
# - stripe-app.json (merge with generated one)
```

### 4. Configure the App

1. Update `stripe-app.json` with your app details
2. Update `src/api/zendesk.ts` with your actual backend API URL
3. Replace `your-subdomain` in the view files with your Zendesk subdomain

### 5. Run Locally

```bash
# Start the app in development mode
stripe apps start
```

### 6. Upload to Stripe

```bash
# Upload for testing (private)
stripe apps upload

# Submit for review (to publish on Marketplace)
stripe apps submit
```

## Project Structure

```
stripe-app/
├── stripe-app.json      # App manifest
├── icon.svg             # App icon
├── src/
│   ├── views/
│   │   ├── CustomerDetailView.tsx  # Shows on customer detail page
│   │   └── AppDrawerView.tsx       # Shows in app drawer
│   ├── api/
│   │   └── zendesk.ts   # API client for Zendesk data
│   └── types.ts         # TypeScript types
└── README.md
```

## Views

### CustomerDetailView
Displays Zendesk customer info and tickets when viewing a Stripe customer. Matches customers by email address.

### AppDrawerView
Full customer browser accessible from the Stripe Dashboard drawer. Includes search and customer detail view.

## Backend API Requirements

Your backend API needs to expose these endpoints:

```
GET /api/zendesk/customers
  - Returns: ZendeskCustomer[]

GET /api/zendesk/customers?email={email}
  - Returns: ZendeskCustomer | null

GET /api/zendesk/tickets?customerId={id}
  - Returns: ZendeskTicket[]
```

## Stripe UI Extension SDK Components Used

- `ContextView` - Main container for views
- `Box` - Layout primitive
- `Button` - Action buttons
- `Badge` - Status/priority indicators
- `TextField` - Search input
- `Spinner` - Loading states
- `Icon` - Icons
- `Link` - External links
- `Inline` - Horizontal layouts
- `Divider` - Visual separator

## Resources

- [Stripe Apps Documentation](https://stripe.com/docs/stripe-apps)
- [UI Extension SDK Reference](https://stripe.com/docs/stripe-apps/reference/ui-extension-sdk)
- [Stripe CLI Apps Commands](https://stripe.com/docs/stripe-apps/reference/cli)
