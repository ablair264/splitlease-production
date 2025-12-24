# Broker Platform

AI-powered lead management for UK vehicle leasing brokers.

## Features

- **AI Lead Analysis** - Automatically extracts intent, vehicle preferences, budget, and timeline from enquiries
- **Lead Scoring** - Scores leads 1-100 based on conversion likelihood
- **AI Draft Responses** - Generates personalised response drafts for broker review
- **Webhook Integration** - Receives leads from existing broker websites
- **Email Automation** - Send responses directly from the platform

## Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon (Postgres)
- **ORM**: Drizzle
- **Auth**: Auth.js v5
- **AI**: Claude API (Anthropic)
- **Email**: Resend
- **Styling**: Tailwind CSS + Shadcn/ui patterns
- **Hosting**: Railway

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd broker-platform
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` - Neon connection string
- `AUTH_SECRET` - Generate with `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` - From console.anthropic.com
- `RESEND_API_KEY` - From resend.com

### 3. Set up database

```bash
npm run db:generate
npm run db:migrate
```

### 4. Run locally

```bash
npm run dev
```

## Webhook Integration

To receive leads from an existing website, send POST requests to:

```
POST /api/webhook
Headers:
  x-broker-id: <broker-uuid>
  x-webhook-signature: <hmac-sha256-signature> (optional)
  x-lead-source: website (optional)

Body (JSON):
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "07123456789",
  "message": "Looking for a BMW X3 around £400/month...",
  "vehicle": "BMW X3",
  "budget": "400"
}
```

The webhook accepts flexible field names and will extract what it can.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/      # Protected routes
│   │   ├── leads/        # Main inbox
│   │   └── settings/     # Broker settings
│   ├── api/
│   │   ├── auth/         # Auth.js handlers
│   │   ├── leads/        # Lead CRUD + actions
│   │   └── webhook/      # Incoming leads
│   └── login/            # Auth pages
├── components/
│   ├── leads/            # Lead-specific components
│   ├── shared/           # Reusable components
│   └── ui/               # Shadcn components
└── lib/
    ├── ai/               # Claude API wrapper
    ├── auth/             # Auth.js config
    ├── db/               # Drizzle schema + client
    └── email/            # Resend wrapper
```

## Roadmap

- [ ] Value-based deal scoring
- [ ] Automated follow-up sequences
- [ ] Funder ratebook import
- [ ] Real-time funder pricing integration
- [ ] Portal exports (leasing.com, carwow)
- [ ] Multi-user broker teams
