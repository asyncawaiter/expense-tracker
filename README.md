# Expense Tracker

A beautiful expense tracker built with Next.js 14, Tailwind CSS, and shadcn/ui. Uses the 50/30/20 budgeting rule (Fixed/Fun/Future You).

## Features

- **Dashboard** - Budget overview with progress tracking for Fixed (50%), Fun (30%), and Future You (20%) categories
- **Upload** - Drag-drop Excel file parsing for Amex, Scotia Visa, and Scotia Chequing statements
- **Bulk Categorize** - Quickly categorize imported transactions
- **Transactions** - View and manage categorized expenses by type
- **Categories** - Create and organize spending categories
- **Smart Rules** - Auto-categorize transactions based on patterns
- **Archived** - Manage archived transactions

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Excel Parsing**: SheetJS (client-side, no backend needed)
- **Deployment**: Vercel (free tier)

## Architecture

```
┌───────────────────────────────────────┐     ┌─────────────────┐
│  Next.js 14 (Vercel - FREE)           │────▶│  Supabase       │
│  + Client-side Excel parsing (SheetJS)│     │  PostgreSQL     │
│  + Supabase JS Client                 │     │  (FREE tier)    │
└───────────────────────────────────────┘     └─────────────────┘
      All computation in browser                 Database only
```

**Cost: $0/month** - Completely free to run!

## Quick Start

### 1. Clone and Install

```bash
cd expense-tracker-v2
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase-schema.sql`
3. Go to **Settings > API** and copy your project URL and anon key

### 3. Configure Environment

Create a `.env.local` file:

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

The app works without Supabase! It runs in demo mode with sample data so you can explore all features.

## Deployment to Vercel

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
| American Express | .xls | Summary.xls |
| Scotia Visa | .xlsx | Scene_Visa_card_*.xlsx |
| Scotia Chequing | .xlsx | Preferred_Package_*.xlsx |

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── page.tsx         # Dashboard
│   ├── transactions/    # Transactions list
│   ├── categories/      # Category management
│   ├── categorize/      # Bulk categorization
│   ├── archived/        # Archived transactions
│   ├── suggestions/     # Smart rules
│   └── upload/          # File upload
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Sidebar, header
│   ├── dashboard/       # Budget cards, income section
│   ├── shared/          # Category selector, month picker
│   └── upload/          # File uploader
└── lib/
    ├── types.ts         # TypeScript types
    ├── supabase.ts      # Supabase client
    ├── database.ts      # Database operations
    ├── parser.ts        # Excel parsing (client-side)
    └── utils.ts         # Utilities
```

## Database Schema

See `supabase-schema.sql` for the complete schema including:

- `transactions` - Transaction records
- `categories` - Spending categories
- `income` - Monthly income sources
- `budget_goals` - Budget percentages per category type
- `smart_suggestions` - Auto-categorization rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
