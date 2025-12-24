# Broker Platform

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + Drizzle ORM |
| **Authentication** | NextAuth.js |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |

## Domain Overview

This is a **vehicle leasing broker platform** that:
1. Aggregates pricing from multiple lease funders
2. Matches vehicles using CAP codes (industry standard)
3. Scores deals by value (price-to-P11D ratio)
4. Manages leads/CRM
5. Provides consumer-facing vehicle browser ("Splitlease")

## Directory Structure

```
src/
├── app/
│   ├── admin/           # Admin dashboard (protected)
│   │   ├── dashboard/   # KPIs, best deals, recent imports
│   │   ├── deals/       # Deal finder with heatmap
│   │   ├── rates/       # Rate explorer
│   │   ├── matching/    # CAP code matching UI
│   │   ├── ratesheets/  # Upload rate sheets
│   │   ├── uploader/    # Venus/CSV imports
│   │   ├── lex-*/       # Lex Autolease integration
│   │   ├── ogilvie/     # Ogilvie Fleet integration
│   │   └── fleet-marque/ # Manufacturer discounts
│   ├── api/             # API routes
│   ├── cars/            # Public vehicle pages
│   ├── quote/           # Quote detail pages
│   └── (root)           # Public homepage
├── components/
│   ├── admin/           # Admin UI components
│   ├── splitlease/      # Consumer-facing components
│   └── shared/          # Shared components
└── lib/
    ├── db/              # Drizzle schema + connection
    ├── auth/            # NextAuth config
    ├── scraper/         # Ogilvie, Fleet Marque scrapers
    ├── lex/             # Lex API client
    ├── matching/        # Vehicle matcher
    ├── rates/           # Scoring algorithms
    └── imports/         # Ratebook importers
```

## Database Schema

### Core Entities
| Table | Purpose |
|-------|---------|
| `users` | Auth users with password support |
| `accounts` | OAuth accounts (NextAuth) |
| `sessions` | User sessions |
| `brokers` | Broker company profiles |
| `vehicles` | Master vehicle catalog with CAP codes |

### Pricing Data
| Table | Purpose |
|-------|---------|
| `provider_rates` | Unified rates from all providers |
| `ratebook_imports` | Import batches with status tracking |
| `vehicle_pricing` | Legacy pricing table |

### Provider Integrations
| Table | Purpose |
|-------|---------|
| `lex_sessions` | Stored Lex auth sessions |
| `lex_quotes` | Fetched quotes from Lex |
| `lex_quote_requests` | Batch quote requests |
| `ogilvie_sessions` | Stored Ogilvie auth |
| `ogilvie_exports` | Export job tracking |
| `ogilvie_ratebook` | Scraped Ogilvie rates |
| `ogilvie_cap_mappings` | Ogilvie→CAP code mappings |
| `fleet_marque_terms` | Manufacturer discount terms |

### CRM
| Table | Purpose |
|-------|---------|
| `leads` | Customer leads with scoring |
| `lead_messages` | Lead communication history |

## Key Features

### 1. Multi-Provider Rate Aggregation
- **Lex Autolease**: Session capture → automated quote fetching
- **Ogilvie Fleet**: Session-based CSV export scraping
- **Venus Fleet**: Excel workbook upload
- **CSV Ratebooks**: Generic CSV import with mapping

### 2. Vehicle Matching System (`src/app/admin/matching/`)
- Fuzzy matching algorithm for CAP codes
- Confidence scoring (high/medium/low)
- Manual assignment fallback
- Keyboard shortcuts (J/K navigate, Y confirm, N reject)

### 3. Deal Scoring (`src/lib/rates/scoring.ts`)
```
Score = f(total_rental × term / P11D)
- < 0.20 → 95 (exceptional)
- 0.20-0.28 → 80-95 (excellent)
- 0.28-0.38 → 65-80 (good)
- > 0.70 → 10-25 (poor)
```

### 4. Admin Dashboard
- KPIs: Vehicles with rates, rate freshness, provider count
- Contract type breakdown (CH, CHNM, PCH, PCHNM, BSSNL)
- Best deals leaderboard
- Recent imports tracking

### 5. Consumer Interface ("Splitlease")
- Vehicle browser with filters
- Enquiry modal
- Voice call integration
- Chat widget

## Data Flow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  External APIs   │    │   Scrapers/      │    │   Upload Forms   │
│  (Lex, Ogilvie)  │───▶│   Importers      │───▶│   (Venus, CSV)   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   provider_rates     │
                    │   (unified table)    │
                    └──────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
          ┌─────────────────┐     ┌─────────────────┐
          │  Vehicle        │     │  Deal Scoring   │
          │  Matcher        │     │  Algorithm      │
          └─────────────────┘     └─────────────────┘
                    │                       │
                    └───────────┬───────────┘
                                ▼
                    ┌──────────────────────┐
                    │   Admin Dashboard    │
                    │   + Consumer UI      │
                    └──────────────────────┘
```

## Contract Types

| Code | Description |
|------|-------------|
| `CH` | Contract Hire (with maintenance) |
| `CHNM` | Contract Hire (no maintenance) |
| `PCH` | Personal Contract Hire (with maintenance) |
| `PCHNM` | Personal Contract Hire (no maintenance) |
| `BSSNL` | Salary Sacrifice |

## Notable Patterns

1. **Unified Rate Table**: All providers normalize to `provider_rates`
2. **Import Versioning**: `ratebook_imports.is_latest` flag for freshness
3. **CAP Code Matching**: Fuzzy matching with manual override
4. **Score-Based Filtering**: Value scoring enables "best deals" features
5. **Dark Theme Admin**: Consistent `#0f1419` / `#79d5e9` color palette

## Common Commands

```bash
# Development
npm run dev

# Database
npm run db:generate    # Generate migrations
npm run db:migrate     # Run migrations
npm run db:push        # Push schema changes

# Build
npm run build
```
