-- Expense Tracker Database Schema for Supabase
-- Run this in the Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('FIXED', 'FUN', 'FUTURE_YOU')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('amex', 'scotia_visa', 'scotia_chequing', 'pc', 'manual')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  major_category_type VARCHAR(20) CHECK (major_category_type IN ('FIXED', 'FUN', 'FUTURE_YOU')),
  is_income BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Income table
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_name, month, year)
);

-- Migration: Add date column to income table if it doesn't exist
-- ALTER TABLE income ADD COLUMN IF NOT EXISTS date DATE;

-- Budget goals table
CREATE TABLE IF NOT EXISTS budget_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('FIXED', 'FUN', 'FUTURE_YOU')),
  goal_percentage DECIMAL(5, 4) NOT NULL CHECK (goal_percentage >= 0 AND goal_percentage <= 1),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_type, month, year)
);

-- Smart suggestions table
CREATE TABLE IF NOT EXISTS smart_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  keyword VARCHAR(200) NOT NULL,
  match_type VARCHAR(20) NOT NULL DEFAULT 'CONTAINS' CHECK (match_type IN ('CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'EXACT_MATCH', 'REGEX')),
  case_sensitive BOOLEAN NOT NULL DEFAULT false,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  major_category_type VARCHAR(20) NOT NULL CHECK (major_category_type IN ('FIXED', 'FUN', 'FUTURE_YOU')),
  is_income_suggestion BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transaction history table (for version control)
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_major_type ON transactions(major_category_type);
CREATE INDEX IF NOT EXISTS idx_transactions_archived ON transactions(is_archived);
CREATE INDEX IF NOT EXISTS idx_income_period ON income(month, year);
CREATE INDEX IF NOT EXISTS idx_budget_goals_period ON budget_goals(month, year);
CREATE INDEX IF NOT EXISTS idx_transaction_history_txn ON transaction_history(transaction_id);

-- Enable Row Level Security (optional - for multi-user setup)
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE income ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE smart_suggestions ENABLE ROW LEVEL SECURITY;

-- For single-user app, allow all access
-- If you need RLS, uncomment and configure policies above

-- Sample categories (optional - run after table creation)
INSERT INTO categories (name, type) VALUES
  ('Rent', 'FIXED'),
  ('Utilities', 'FIXED'),
  ('Groceries', 'FIXED'),
  ('Insurance', 'FIXED'),
  ('Phone/Internet', 'FIXED'),
  ('Transportation', 'FIXED'),
  ('Dining Out', 'FUN'),
  ('Entertainment', 'FUN'),
  ('Shopping', 'FUN'),
  ('Subscriptions', 'FUN'),
  ('Travel', 'FUN'),
  ('Savings', 'FUTURE_YOU'),
  ('Investments', 'FUTURE_YOU'),
  ('Emergency Fund', 'FUTURE_YOU'),
  ('Debt Payment', 'FUTURE_YOU')
ON CONFLICT (name) DO NOTHING;

