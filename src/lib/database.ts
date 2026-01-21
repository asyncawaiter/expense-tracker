import { supabase } from './supabase';
import { 
  Transaction, 
  Category, 
  Income, 
  BudgetGoal, 
  SmartSuggestion,
  TransactionHistory,
  CategoryType,
  ParsedTransaction,
  SourceFile,
  DEFAULT_BUDGET_GOALS
} from './types';

// ============ TRANSACTIONS ============

export async function getTransactions(options: {
  month?: number;
  year?: number;
  categoryType?: CategoryType;
  isArchived?: boolean;
  limit?: number;
}): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .order('date', { ascending: false });
  
  if (options.month && options.year) {
    const startDate = new Date(options.year, options.month - 1, 1);
    const endDate = new Date(options.year, options.month, 0);
    query = query
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);
  }
  
  if (options.categoryType) {
    query = query.eq('major_category_type', options.categoryType);
  }
  
  if (options.isArchived !== undefined) {
    query = query.eq('is_archived', options.isArchived);
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getUncategorizedTransactions(month?: number, year?: number): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .is('major_category_type', null)  // Check major_category_type, not just category_id
    .eq('is_archived', false)
    .eq('is_income', false)  // Only show expenses, not credits/income
    .neq('source', 'manual')
    .order('date', { ascending: false });
  
  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    query = query
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select('*, category:categories(*)')
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:categories(*)')
    .single();
  
  if (error) throw error;
  return data;
}

export async function categorizeTransaction(
  id: string, 
  categoryId: string | null, 
  majorCategoryType: CategoryType
): Promise<Transaction> {
  return updateTransaction(id, {
    category_id: categoryId,
    major_category_type: majorCategoryType
  });
}

export async function archiveTransactions(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .in('id', ids);
  
  if (error) throw error;
}

export async function unarchiveTransactions(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ is_archived: false, updated_at: new Date().toISOString() })
    .in('id', ids);
  
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export async function deleteTransactions(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', ids);
  
  if (error) throw error;
}

// ============ TRANSACTION HISTORY ============

export async function getTransactionHistory(transactionId: string): Promise<TransactionHistory[]> {
  const { data, error } = await supabase
    .from('transaction_history')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('changed_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function addTransactionHistory(
  transactionId: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null
): Promise<TransactionHistory> {
  const { data, error } = await supabase
    .from('transaction_history')
    .insert({
      transaction_id: transactionId,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update transaction with history tracking
export async function updateTransactionWithHistory(
  id: string,
  updates: Partial<Pick<Transaction, 'description' | 'amount' | 'notes' | 'date'>>,
  currentTransaction: Transaction
): Promise<Transaction> {
  const historyPromises: Promise<TransactionHistory>[] = [];

  // Track description changes
  if (updates.description !== undefined && updates.description !== currentTransaction.description) {
    historyPromises.push(
      addTransactionHistory(id, 'description', currentTransaction.description, updates.description)
    );
  }

  // Track amount changes
  if (updates.amount !== undefined && updates.amount !== currentTransaction.amount) {
    historyPromises.push(
      addTransactionHistory(id, 'amount', String(currentTransaction.amount), String(updates.amount))
    );
  }

  // Track notes changes
  if (updates.notes !== undefined && updates.notes !== currentTransaction.notes) {
    historyPromises.push(
      addTransactionHistory(id, 'notes', currentTransaction.notes, updates.notes)
    );
  }

  // Track date changes
  if (updates.date !== undefined && updates.date !== currentTransaction.date) {
    historyPromises.push(
      addTransactionHistory(id, 'date', currentTransaction.date, updates.date)
    );
  }

  // Save history entries
  await Promise.all(historyPromises);

  // Update the transaction
  return updateTransaction(id, updates);
}

export interface BulkInsertResult {
  inserted: number;
  duplicates: number;
  credits: number;
  insertedTransactions: ParsedTransaction[];
  duplicateTransactions: ParsedTransaction[];
  creditTransactions: ParsedTransaction[];
}

// Bulk insert parsed transactions with duplicate detection
// Credits are tracked separately and marked as is_income
export async function bulkInsertTransactions(
  parsedTransactions: ParsedTransaction[],
  source: SourceFile
): Promise<BulkInsertResult> {
  const insertedTransactions: ParsedTransaction[] = [];
  const duplicateTransactions: ParsedTransaction[] = [];
  const creditTransactions: ParsedTransaction[] = [];
  
  // Separate credits from debits first
  const debits = parsedTransactions.filter(tx => tx.type === 'debit');
  const credits = parsedTransactions.filter(tx => tx.type === 'credit');
  
  // Process debits (expenses)
  for (const tx of debits) {
    // Check for duplicate (same date, description, amount)
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('date', tx.date.toISOString().split('T')[0])
      .eq('description', tx.description)
      .eq('amount', -tx.amount)
      .single();
    
    if (existing) {
      duplicateTransactions.push(tx);
      continue;
    }
    
    // Insert new transaction
    const { error } = await supabase
      .from('transactions')
      .insert({
        date: tx.date.toISOString().split('T')[0],
        description: tx.description,
        amount: -tx.amount,
        source: source,
        is_income: false,
        is_archived: false,
        notes: tx.sub_description || null
      });
    
    if (!error) {
      insertedTransactions.push(tx);
    }
  }
  
  // Process credits (payments, refunds, etc.) - track separately
  for (const tx of credits) {
    // Check for duplicate
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('date', tx.date.toISOString().split('T')[0])
      .eq('description', tx.description)
      .eq('amount', tx.amount)
      .single();
    
    if (existing) {
      // Still track as credit for display purposes
      creditTransactions.push(tx);
      continue;
    }
    
    // Insert credit transaction
    const { error } = await supabase
      .from('transactions')
      .insert({
        date: tx.date.toISOString().split('T')[0],
        description: tx.description,
        amount: tx.amount,
        source: source,
        is_income: true,
        is_archived: false,
        notes: tx.sub_description || null
      });
    
    if (!error) {
      creditTransactions.push(tx);
    }
  }
  
  return { 
    inserted: insertedTransactions.length, 
    duplicates: duplicateTransactions.length,
    credits: creditTransactions.length,
    insertedTransactions,
    duplicateTransactions,
    creditTransactions
  };
}

// ============ CATEGORIES ============

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function getCategoriesByType(type: CategoryType): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function createCategory(category: { name: string; type: CategoryType }): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...category, is_active: true })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('categories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) throw error;
}

// ============ INCOME ============

export async function getIncome(month: number, year: number): Promise<Income[]> {
  const { data, error } = await supabase
    .from('income')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .order('source_name');
  
  if (error) throw error;
  return data || [];
}

export async function upsertIncome(income: Omit<Income, 'id' | 'created_at' | 'updated_at'>): Promise<Income> {
  const { data, error } = await supabase
    .from('income')
    .upsert({
      source_name: income.source_name,
      amount: income.amount,
      date: income.date,
      month: income.month,
      year: income.year
    }, { onConflict: 'source_name,month,year' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase
    .from('income')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ BUDGET GOALS ============

export async function getBudgetGoals(month: number, year: number): Promise<BudgetGoal[]> {
  const { data, error } = await supabase
    .from('budget_goals')
    .select('*')
    .eq('month', month)
    .eq('year', year);
  
  if (error) throw error;
  
  // If no goals exist, return defaults
  if (!data || data.length === 0) {
    return Object.entries(DEFAULT_BUDGET_GOALS).map(([type, percentage]) => ({
      id: '',
      category_type: type as CategoryType,
      goal_percentage: percentage,
      month,
      year,
      created_at: '',
      updated_at: ''
    }));
  }
  
  return data;
}

export async function upsertBudgetGoal(goal: Omit<BudgetGoal, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetGoal> {
  const { data, error } = await supabase
    .from('budget_goals')
    .upsert(goal, { onConflict: 'category_type,month,year' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============ SMART SUGGESTIONS ============

export async function getSmartSuggestions(): Promise<SmartSuggestion[]> {
  const { data, error } = await supabase
    .from('smart_suggestions')
    .select('*, category:categories(*)')
    .eq('is_active', true)
    .order('priority', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createSmartSuggestion(
  suggestion: Omit<SmartSuggestion, 'id' | 'created_at' | 'updated_at' | 'category'>
): Promise<SmartSuggestion> {
  const { data, error } = await supabase
    .from('smart_suggestions')
    .insert(suggestion)
    .select('*, category:categories(*)')
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSmartSuggestion(
  id: string, 
  updates: Partial<SmartSuggestion>
): Promise<SmartSuggestion> {
  const { data, error } = await supabase
    .from('smart_suggestions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, category:categories(*)')
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteSmartSuggestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('smart_suggestions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Apply smart suggestions to a transaction
export function applySmartSuggestions(
  transaction: Transaction,
  suggestions: SmartSuggestion[]
): SmartSuggestion | null {
  for (const suggestion of suggestions) {
    if (matchesSuggestion(transaction.description, suggestion)) {
      return suggestion;
    }
  }
  return null;
}

function matchesSuggestion(description: string, suggestion: SmartSuggestion): boolean {
  const text = suggestion.case_sensitive ? description : description.toLowerCase();
  const keyword = suggestion.case_sensitive ? suggestion.keyword : suggestion.keyword.toLowerCase();
  
  switch (suggestion.match_type) {
    case 'CONTAINS':
      return text.includes(keyword);
    case 'STARTS_WITH':
      return text.startsWith(keyword);
    case 'ENDS_WITH':
      return text.endsWith(keyword);
    case 'EXACT_MATCH':
      return text === keyword;
    case 'REGEX':
      try {
        const flags = suggestion.case_sensitive ? '' : 'i';
        return new RegExp(suggestion.keyword, flags).test(description);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

// ============ DASHBOARD AGGREGATIONS ============

export async function getDashboardData(month: number, year: number) {
  // Get income for the month
  const income = await getIncome(month, year);
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  
  // Get budget goals
  const goals = await getBudgetGoals(month, year);
  
  // Get transactions for the month
  const transactions = await getTransactions({ month, year, isArchived: false });
  
  // Calculate spending by category type
  const spendingByType: Record<CategoryType, { spent: number; count: number }> = {
    FIXED: { spent: 0, count: 0 },
    FUN: { spent: 0, count: 0 },
    FUTURE_YOU: { spent: 0, count: 0 }
  };
  
  for (const tx of transactions) {
    if (tx.major_category_type && !tx.is_income) {
      const absAmount = Math.abs(tx.amount);
      spendingByType[tx.major_category_type].spent += absAmount;
      spendingByType[tx.major_category_type].count++;
    }
  }
  
  // Build budget summaries - ensure all 3 category types are always present
  const allCategoryTypes: CategoryType[] = ['FIXED', 'FUN', 'FUTURE_YOU'];
  const goalsMap = new Map(goals.map(g => [g.category_type, g]));
  
  const budgetSummaries = allCategoryTypes.map(categoryType => {
    const goal = goalsMap.get(categoryType);
    const goalPercentage = goal?.goal_percentage ?? DEFAULT_BUDGET_GOALS[categoryType];
    const spending = spendingByType[categoryType];
    const budgeted = totalIncome * goalPercentage;
    
    return {
      category_type: categoryType,
      goal_percentage: goalPercentage,
      budgeted_amount: budgeted,
      spent_amount: spending.spent,
      remaining_amount: budgeted - spending.spent,
      transaction_count: spending.count
    };
  });
  
  return {
    total_income: totalIncome,
    income_sources: income,
    budget_summaries: budgetSummaries,
    recent_transactions: transactions.slice(0, 10)
  };
}

