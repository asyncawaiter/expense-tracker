# Expense Tracker

A beautiful expense tracker built with Next.js 16.1, Tailwind CSS 4, and shadcn/ui. Uses the 50/30/20 budgeting rule (Fixed/Fun/Future You).

## Features

- **Dashboard** - Budget overview with progress tracking for Fixed (50%), Fun (30%), and Future You (20%) categories
- **Expense Calendar** - Visual calendar showing daily spending and income
- **Upload** - Drag-drop Excel/CSV file parsing for Amex, Scotia Visa, Scotia Chequing, and PC Financial statements
- **Add Expense** - Manual expense entry with category selection
- **Bulk Categorize** - Quickly categorize imported transactions
- **Transactions** - View and manage categorized expenses by type
- **Categories** - Create and organize spending categories
- **Smart Rules** - Auto-categorize transactions based on keyword patterns
- **Archived** - Manage archived transactions
- **Demo Mode** - Works without database for testing/exploration

## Tech Stack

- **Frontend**: Next.js 16.1 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Excel/CSV Parsing**: SheetJS (xlsx) - 100% client-side
- **Charts**: Recharts
- **Deployment**: Vercel

## Architecture

All processing is done client-side - no server-side compute needed!

```
┌─────────────────────────────────────────┐     ┌─────────────────┐
│  Next.js 16.1 (Static on Vercel CDN)    │────▶│  Supabase       │
│  + Client-side Excel/CSV parsing        │     │  PostgreSQL     │
│  + Supabase JS Client (browser → DB)    │     │  (FREE tier)    │
└─────────────────────────────────────────┘     └─────────────────┘
       All computation in browser                  Database only
```

**Cost: $0/month** - Completely free to run on Vercel + Supabase free tiers!

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/asyncawaiter/expense-tracker.git
cd expense-tracker
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase-schema.sql`
3. Go to **Settings > API** and copy your project URL and anon key

### 3. Configure Environment

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Mode

The app works without Supabase! It runs in demo mode with sample data so you can explore all features. A "Check Connection" button on the dashboard lets you test your Supabase setup.

## Deployment to Vercel

This app is optimized for Vercel deployment - all processing is client-side, so no serverless functions or cold starts to worry about.

### Option 1: Vercel Dashboard

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

## Supported Bank Statements

| Bank | File Format | File Pattern |
|------|-------------|--------------|
| American Express | .xls | `Summary.xls` or `*amex*.xls` |
| Scotia Visa | .xlsx | `Scene_Visa_card_*.xlsx` or `*visa_card*.xlsx` |
| Scotia Chequing | .xlsx | `Preferred_Package_*.xlsx` or `*chequing*.xlsx` |
| PC Financial Mastercard | .csv | `report.csv` or `*pc*.csv` |

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── page.tsx         # Dashboard with calendar
│   ├── add-expense/     # Manual expense entry
│   ├── transactions/    # Transactions list
│   ├── categories/      # Category management
│   ├── categorize/      # Bulk categorization
│   ├── archived/        # Archived transactions
│   ├── suggestions/     # Smart rules
│   └── upload/          # File upload
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Sidebar, header, app layout
│   ├── dashboard/       # Budget cards, expense calendar, financial overview
│   ├── shared/          # Category selector, month picker
│   └── upload/          # File uploader with drag-drop
└── lib/
    ├── types.ts         # TypeScript types & constants
    ├── supabase.ts      # Supabase client with connection testing
    ├── database.ts      # Database operations (CRUD)
    ├── parser.ts        # Excel/CSV parsing (client-side)
    ├── events.ts        # Page refresh event system
    └── utils.ts         # Utilities (cn, formatting)
```

## Database Schema

See `supabase-schema.sql` for the complete schema including:

- `transactions` - Transaction records with category, amount, date, source
- `transaction_history` - Audit trail for transaction edits
- `categories` - Spending categories (Fixed/Fun/Future You)
- `income` - Monthly income sources
- `budget_goals` - Budget percentages per category type
- `smart_suggestions` - Auto-categorization rules with keyword matching

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes* | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes* | Your Supabase anon/public key |

*Not required for demo mode

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
