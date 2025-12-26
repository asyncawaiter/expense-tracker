'use client';

import { useState, useEffect, useCallback } from 'react';
import { FinancialOverview } from '@/components/dashboard/financial-overview';
import { ExpenseCalendar } from '@/components/dashboard/expense-calendar';
import { usePeriod } from '@/components/layout/app-layout';
import { 
  CategoryType, 
  BudgetSummary, 
  Income,
  Transaction
} from '@/lib/types';
import { 
  getDashboardData,
  getTransactions,
  upsertIncome,
  deleteIncome as deleteIncomeDb,
  upsertBudgetGoal
} from '@/lib/database';
import { isSupabaseConfigured, testSupabaseConnection, ConnectionTestResult } from '@/lib/supabase';
import { pageRefresh } from '@/lib/events';
import { toast } from 'sonner';
import { AlertCircle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Demo data for when Supabase is not configured
const getDemoData = (month: number, year: number) => {
  const totalIncome = 5000;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Generate demo transactions for the month
  const demoTransactions: Transaction[] = [];
  const descriptions = [
    { desc: 'Grocery Store', amount: -85, category: 'Groceries' },
    { desc: 'Coffee Shop', amount: -5.50, category: 'Dining' },
    { desc: 'Gas Station', amount: -45, category: 'Transportation' },
    { desc: 'Electric Bill', amount: -120, category: 'Utilities' },
    { desc: 'Restaurant', amount: -65, category: 'Dining' },
    { desc: 'Freelance Payment', amount: 250, category: 'Income' },
    { desc: 'Online Shopping', amount: -42, category: 'Shopping' },
    { desc: 'Subscription', amount: -15, category: 'Entertainment' },
  ];
  
  for (let day = 1; day <= daysInMonth; day++) {
    // Random number of transactions per day (0-3)
    const txCount = Math.floor(Math.random() * 4);
    for (let i = 0; i < txCount; i++) {
      const item = descriptions[Math.floor(Math.random() * descriptions.length)];
      const date = new Date(year, month - 1, day);
      demoTransactions.push({
        id: `demo-${day}-${i}`,
        description: item.desc,
        amount: item.amount,
        date: date.toISOString().split('T')[0],
        source: 'manual',
        category_id: null,
        major_category_type: item.amount > 0 ? null : 'FUN',
        is_income: item.amount > 0,
        is_archived: false,
        notes: null,
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
      });
    }
  }
  
  return {
    total_income: totalIncome,
    income_sources: [
      { id: '1', source_name: 'Salary', amount: 4500, date: new Date(year, month - 1, 15).toISOString().split('T')[0], month, year, created_at: '', updated_at: '' },
      { id: '2', source_name: 'Side Project', amount: 500, date: new Date(year, month - 1, 20).toISOString().split('T')[0], month, year, created_at: '', updated_at: '' },
    ] as Income[],
    budget_summaries: [
      {
        category_type: 'FIXED' as CategoryType,
        goal_percentage: 0.50,
        budgeted_amount: 2500,
        spent_amount: 1850,
        remaining_amount: 650,
        transaction_count: 12
      },
      {
        category_type: 'FUN' as CategoryType,
        goal_percentage: 0.30,
        budgeted_amount: 1500,
        spent_amount: 1200,
        remaining_amount: 300,
        transaction_count: 8
      },
      {
        category_type: 'FUTURE_YOU' as CategoryType,
        goal_percentage: 0.20,
        budgeted_amount: 1000,
        spent_amount: 800,
        remaining_amount: 200,
        transaction_count: 3
      }
    ] as BudgetSummary[],
    transactions: demoTransactions
  };
};

export default function DashboardPage() {
  const { month, year } = usePeriod();
  const [isLoading, setIsLoading] = useState(true);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgetSummaries, setBudgetSummaries] = useState<BudgetSummary[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      if (!isSupabaseConfigured()) {
        // Use demo data
        const demo = getDemoData(month, year);
        setIncomes(demo.income_sources);
        setBudgetSummaries(demo.budget_summaries);
        setTotalIncome(demo.total_income);
        setTransactions(demo.transactions);
        setIsDemo(true);
      } else {
        const data = await getDashboardData(month, year);
        const monthTransactions = await getTransactions({ month, year, isArchived: false });
        setIncomes(data.income_sources);
        setBudgetSummaries(data.budget_summaries);
        setTotalIncome(data.total_income);
        setTransactions(monthTransactions);
        setIsDemo(false);
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error?.message || error?.code || JSON.stringify(error) || error);
      toast.error(error?.message || 'Failed to load dashboard data');
      // Fall back to demo data
      const demo = getDemoData(month, year);
      setIncomes(demo.income_sources);
      setBudgetSummaries(demo.budget_summaries);
      setTotalIncome(demo.total_income);
      setTransactions(demo.transactions);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to sidebar navigation clicks for this page
  useEffect(() => {
    const unsubscribe = pageRefresh.subscribe('/', loadData);
    return unsubscribe;
  }, [loadData]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    
    try {
      const result = await testSupabaseConnection();
      setConnectionResult(result);
      
      if (result.success) {
        toast.success(result.message);
        // Reload data since connection is working
        await loadData();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      setConnectionResult({
        success: false,
        message: 'Test failed',
        details: {
          configured: false,
          url: '(unknown)',
          error: error.message || 'Unknown error'
        }
      });
      toast.error('Failed to test connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleAddIncome = async (sourceName: string, amount: number, date: string | null) => {
    if (isDemo) {
      const newIncome: Income = {
        id: Date.now().toString(),
        source_name: sourceName,
        amount,
        date,
        month,
        year,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setIncomes([...incomes, newIncome]);
      setTotalIncome(totalIncome + amount);
      // Also add to transactions for the calendar
      if (date) {
        const incomeTransaction: Transaction = {
          id: `income-${Date.now()}`,
          description: sourceName,
          amount: amount,
          date: date,
          source: 'manual',
          category_id: null,
          major_category_type: null,
          is_income: true,
          is_archived: false,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setTransactions([...transactions, incomeTransaction]);
      }
      toast.success('Income added (demo mode)');
      return;
    }

    try {
      await upsertIncome({ source_name: sourceName, amount, date, month, year });
      await loadData();
      toast.success('Income added');
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('Failed to add income');
    }
  };

  const handleUpdateIncome = async (id: string, amount: number, date: string | null) => {
    if (isDemo) {
      const updatedIncomes = incomes.map(i => i.id === id ? { ...i, amount, date } : i);
      setIncomes(updatedIncomes);
      const diff = amount - (incomes.find(i => i.id === id)?.amount || 0);
      setTotalIncome(totalIncome + diff);
      // Update transactions for calendar if date changed
      const oldIncome = incomes.find(i => i.id === id);
      if (oldIncome) {
        // Remove old income transaction and add new one if date exists
        const filteredTransactions = transactions.filter(t => t.id !== `income-${oldIncome.id}`);
        if (date) {
          const incomeTransaction: Transaction = {
            id: `income-${id}`,
            description: oldIncome.source_name,
            amount: amount,
            date: date,
            source: 'manual',
            category_id: null,
            major_category_type: null,
            is_income: true,
            is_archived: false,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setTransactions([...filteredTransactions, incomeTransaction]);
        } else {
          setTransactions(filteredTransactions);
        }
      }
      toast.success('Income updated (demo mode)');
      return;
    }

    try {
      const income = incomes.find(i => i.id === id);
      if (income) {
        await upsertIncome({ source_name: income.source_name, amount, date, month, year });
        await loadData();
        toast.success('Income updated');
      }
    } catch (error) {
      console.error('Error updating income:', error);
      toast.error('Failed to update income');
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (isDemo) {
      const income = incomes.find(i => i.id === id);
      setIncomes(incomes.filter(i => i.id !== id));
      setTotalIncome(totalIncome - (income?.amount || 0));
      toast.success('Income deleted (demo mode)');
      return;
    }

    try {
      await deleteIncomeDb(id);
      await loadData();
      toast.success('Income deleted');
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Failed to delete income');
    }
  };

  const handleUpdateGoal = async (categoryType: CategoryType, goalPercentage: number) => {
    if (isDemo) {
      setBudgetSummaries(budgetSummaries.map(s => 
        s.category_type === categoryType 
          ? { ...s, goal_percentage: goalPercentage, budgeted_amount: totalIncome * goalPercentage }
          : s
      ));
      toast.success('Goal updated (demo mode)');
      return;
    }

    try {
      await upsertBudgetGoal({
        category_type: categoryType,
        goal_percentage: goalPercentage,
        month,
        year
      });
      await loadData();
      toast.success('Budget goal updated');
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="grid grid-cols-3 gap-6">
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Demo mode notice */}
      {isDemo && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">
                Running in demo mode. Connect Supabase to persist your data.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="bg-white hover:bg-amber-100 border-amber-300 text-amber-800"
            >
              {isTestingConnection ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Connection
                </>
              )}
            </Button>
          </div>
          
          {/* Connection test result */}
          {connectionResult && (
            <div className={cn(
              'px-4 py-3 rounded-lg border',
              connectionResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            )}>
              <div className="flex items-start gap-2">
                {connectionResult.success ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="font-medium">{connectionResult.message}</p>
                  {connectionResult.details && (
                    <div className="text-sm space-y-1">
                      {connectionResult.details.error && (
                        <p className="font-mono text-xs bg-white/50 px-2 py-1 rounded">
                          {connectionResult.details.error}
                        </p>
                      )}
                      {connectionResult.details.tablesFound && (
                        <p>
                          Tables found: {connectionResult.details.tablesFound.join(', ')}
                        </p>
                      )}
                      {!connectionResult.success && (
                        <p className="text-xs mt-2">
                          <strong>Tip:</strong> Make sure you have a <code className="bg-white/50 px-1 rounded">.env.local</code> file with:
                          <br />
                          <code className="bg-white/50 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL=your-url</code>
                          <br />
                          <code className="bg-white/50 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key</code>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Financial Overview - Single Comprehensive Tile */}
      <FinancialOverview
        month={month}
        year={year}
        totalIncome={totalIncome}
        budgetSummaries={budgetSummaries}
        incomes={incomes}
        transactions={transactions}
        onAddIncome={handleAddIncome}
        onUpdateIncome={handleUpdateIncome}
        onDeleteIncome={handleDeleteIncome}
        onUpdateGoal={handleUpdateGoal}
      />

      {/* Spending Calendar */}
      <ExpenseCalendar
        month={month}
        year={year}
        transactions={transactions}
        incomes={incomes}
      />
    </div>
  );
}
