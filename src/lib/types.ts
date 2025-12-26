// Database types for the expense tracker

export type CategoryType = 'FIXED' | 'FUN' | 'FUTURE_YOU';

export type SourceFile = 'amex' | 'scotia_visa' | 'scotia_chequing' | 'pc' | 'manual';

export type MatchType = 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'EXACT_MATCH' | 'REGEX';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: SourceFile;
  category_id: string | null;
  major_category_type: CategoryType | null;
  is_income: boolean;
  is_archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: string;
  source_name: string;
  amount: number;
  date: string | null;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetGoal {
  id: string;
  category_type: CategoryType;
  goal_percentage: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface SmartSuggestion {
  id: string;
  name: string;
  keyword: string;
  match_type: MatchType;
  case_sensitive: boolean;
  category_id: string;
  major_category_type: CategoryType;
  is_income_suggestion: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
}

export interface TransactionHistory {
  id: string;
  transaction_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

// Parsed transaction from Excel (before saving to DB)
export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  source: SourceFile;
  sub_description?: string;
}

// Dashboard summary data
export interface BudgetSummary {
  category_type: CategoryType;
  goal_percentage: number;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
  transaction_count: number;
}

export interface DashboardData {
  total_income: number;
  income_sources: Income[];
  budget_summaries: BudgetSummary[];
  recent_transactions: Transaction[];
}

// Category type display info
export const CATEGORY_TYPE_INFO: Record<CategoryType, { label: string; color: string; bgColor: string; description: string }> = {
  FIXED: {
    label: 'Fixed',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Essential expenses like rent, utilities, groceries'
  },
  FUN: {
    label: 'Fun',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    description: 'Entertainment, dining out, hobbies'
  },
  FUTURE_YOU: {
    label: 'Future You',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Savings, investments, debt repayment'
  }
};

// Default budget percentages
export const DEFAULT_BUDGET_GOALS: Record<CategoryType, number> = {
  FIXED: 0.50,
  FUN: 0.30,
  FUTURE_YOU: 0.20
};

