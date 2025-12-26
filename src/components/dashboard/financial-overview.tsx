'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Wallet, 
  Receipt, 
  TrendingUp, 
  Hash,
  Plus, 
  Trash2, 
  Check, 
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CategoryType, 
  CATEGORY_TYPE_INFO, 
  BudgetSummary, 
  Income,
  Transaction,
  SourceFile
} from '@/lib/types';
import { formatSource } from '@/lib/parser';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface FinancialOverviewProps {
  month: number;
  year: number;
  totalIncome: number;
  budgetSummaries: BudgetSummary[];
  incomes: Income[];
  transactions: Transaction[];
  onAddIncome: (sourceName: string, amount: number, date: string | null) => Promise<void>;
  onUpdateIncome: (id: string, amount: number, date: string | null) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
  onUpdateGoal: (categoryType: CategoryType, goalPercentage: number) => Promise<void>;
}

export function FinancialOverview({
  month,
  year,
  totalIncome,
  budgetSummaries,
  incomes,
  transactions,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
  onUpdateGoal,
}: FinancialOverviewProps) {
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState<string | null>(null);
  const [incomeExpanded, setIncomeExpanded] = useState(true);
  const [cardSpendingExpanded, setCardSpendingExpanded] = useState(true);
  const [editingGoalType, setEditingGoalType] = useState<CategoryType | null>(null);
  const [editGoalValue, setEditGoalValue] = useState('');

  const totalSpent = budgetSummaries.reduce((sum, s) => sum + s.spent_amount, 0);
  const totalRemaining = totalIncome - totalSpent;
  const totalTransactions = budgetSummaries.reduce((sum, s) => sum + s.transaction_count, 0);
  const totalGoalPercentage = budgetSummaries.reduce((sum, s) => sum + s.goal_percentage, 0);
  const goalPercentageMismatch = Math.abs(totalGoalPercentage - 1) > 0.001; // Not equal to 100%

  const SOURCE_LABELS: Record<SourceFile, string> = {
    amex: 'Amex',
    pc: 'PC Financial',
    scotia_chequing: 'Scotia Chequing',
    scotia_visa: 'Scotia Visa',
    manual: 'Manual Entry',
  };

  const SOURCE_COLORS: Record<SourceFile, { bg: string; text: string; dot: string; border: string }> = {
    amex: { bg: 'bg-blue-500', text: 'text-blue-600', dot: 'bg-blue-500', border: 'border-blue-200' },
    pc: { bg: 'bg-orange-500', text: 'text-orange-600', dot: 'bg-orange-500', border: 'border-orange-200' },
    scotia_chequing: { bg: 'bg-red-500', text: 'text-red-600', dot: 'bg-red-500', border: 'border-red-200' },
    scotia_visa: { bg: 'bg-teal-500', text: 'text-teal-600', dot: 'bg-teal-500', border: 'border-teal-200' },
    manual: { bg: 'bg-slate-500', text: 'text-slate-600', dot: 'bg-slate-500', border: 'border-slate-200' },
  };

  // Get color for pie chart cells
  const getPieColor = (source: SourceFile) => {
    const colorMap: Record<SourceFile, string> = {
      amex: '#3b82f6', // blue-500
      pc: '#f97316', // orange-500
      scotia_chequing: '#ef4444', // red-500
      scotia_visa: '#14b8a6', // teal-500
      manual: '#64748b', // slate-500
    };
    return colorMap[source];
  };

  // Calculate spending by card/source
  const cardSpending = transactions
    .filter(t => !t.is_income && t.amount < 0)
    .reduce((acc, t) => {
      const source = t.source;
      if (!acc[source]) {
        acc[source] = { amount: 0, count: 0 };
      }
      acc[source].amount += Math.abs(t.amount);
      acc[source].count += 1;
      return acc;
    }, {} as Record<SourceFile, { amount: number; count: number }>);

  const cardSpendingEntries = (Object.entries(cardSpending) as [SourceFile, { amount: number; count: number }][])
    .sort((a, b) => b[1].amount - a[1].amount);

  // Prepare data for pie chart
  const pieChartData = cardSpendingEntries.map(([source, data]) => ({
    name: SOURCE_LABELS[source],
    value: data.amount,
    count: data.count,
    source: source,
  }));

  const formatCurrency = (amount: number, decimals = 0) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const formatCurrencyCompact = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date without timezone issues
  const formatDateDisplay = (dateStr: string) => {
    const [, monthNum, day] = dateStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[monthNum - 1]} ${day}`;
  };

  const handleAddIncome = async () => {
    if (newSourceName.trim() && newAmount) {
      await onAddIncome(newSourceName.trim(), parseFloat(newAmount), newDate);
      setNewSourceName('');
      setNewAmount('');
      setNewDate(null);
      setIsAddingIncome(false);
    }
  };

  const handleUpdateIncome = async (id: string) => {
    if (editAmount) {
      await onUpdateIncome(id, parseFloat(editAmount), editDate);
      setEditingIncomeId(null);
      setEditAmount('');
      setEditDate(null);
    }
  };

  const startEditingIncome = (income: Income) => {
    setEditingIncomeId(income.id);
    setEditAmount(income.amount.toString());
    setEditDate(income.date);
  };

  const cancelEditingIncome = () => {
    setEditingIncomeId(null);
    setEditAmount('');
    setEditDate(null);
  };

  const startEditingGoal = (categoryType: CategoryType, currentPercentage: number) => {
    setEditingGoalType(categoryType);
    setEditGoalValue((currentPercentage * 100).toFixed(0));
  };

  const handleUpdateGoal = async (categoryType: CategoryType) => {
    if (editGoalValue) {
      const percentage = parseFloat(editGoalValue) / 100;
      if (percentage >= 0 && percentage <= 1) {
        await onUpdateGoal(categoryType, percentage);
      }
      setEditingGoalType(null);
      setEditGoalValue('');
    }
  };

  const getCategoryColor = (type: CategoryType) => {
    switch (type) {
      case 'FIXED': return 'bg-blue-500';
      case 'FUN': return 'bg-emerald-500';
      case 'FUTURE_YOU': return 'bg-purple-500';
    }
  };

  const getProgressColor = (spent: number, budget: number) => {
    if (budget === 0) return '[&>div]:bg-gray-300';
    const percent = (spent / budget) * 100;
    if (percent >= 100) return '[&>div]:bg-red-500';
    if (percent >= 80) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-emerald-500';
  };

  const getSpentColor = (spent: number, budget: number) => {
    if (budget === 0) return 'text-muted-foreground';
    const percent = (spent / budget) * 100;
    if (percent >= 100) return 'text-red-600';
    if (percent >= 80) return 'text-amber-600';
    return 'text-emerald-600';
  };

  // Custom label renderer for pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    // Position labels outside the pie chart
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        <tspan x={x} dy="0">{name}</tspan>
        <tspan x={x} dy="16" fontWeight="700" fontSize="13">{(percent * 100).toFixed(0)}%</tspan>
      </text>
    );
  };

  const monthYear = new Date(year, month - 1).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <Card className="shadow-apple">
      {/* Header */}
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Financial Overview</CardTitle>
          <span className="text-sm text-muted-foreground font-medium">{monthYear}</span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Summary Metrics Row */}
        <div className="grid grid-cols-4 divide-x border-b">
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Income</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 tabular-nums">
              {formatCurrency(totalIncome, 2)}
            </p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Spent</span>
            </div>
            <p className="text-xl font-bold text-red-600 tabular-nums">
              {formatCurrency(totalSpent, 2)}
            </p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className={cn('h-4 w-4', totalRemaining >= 0 ? 'text-blue-600' : 'text-red-600')} />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</span>
            </div>
            <p className={cn(
              'text-xl font-bold tabular-nums',
              totalRemaining >= 0 ? 'text-blue-600' : 'text-red-600'
            )}>
              {formatCurrency(totalRemaining, 2)}
            </p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Hash className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Transactions</span>
            </div>
            <p className="text-xl font-bold text-purple-600 tabular-nums">
              {totalTransactions}
            </p>
          </div>
        </div>

        {/* Budget Breakdown Table */}
        <div className="border-b">
          <div className="px-4 py-3 bg-muted/30">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Budget Breakdown
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b bg-muted/20">
                <th className="text-center py-2 px-4 font-medium">Category</th>
                <th className="text-center py-2 px-2 font-medium">Goal</th>
                <th className="text-center py-2 px-3 font-medium">Budget</th>
                <th className="text-center py-2 px-3 font-medium">Spent</th>
                <th className="text-center py-2 px-3 font-medium">Remaining</th>
                <th className="text-center py-2 px-4 font-medium w-32">Progress</th>
                <th className="text-center py-2 px-3 font-medium">#</th>
              </tr>
            </thead>
            <tbody>
              {budgetSummaries.map((summary) => {
                const info = CATEGORY_TYPE_INFO[summary.category_type];
                const progressPercent = summary.budgeted_amount > 0 
                  ? (summary.spent_amount / summary.budgeted_amount) * 100
                  : 0;
                const isOver = summary.spent_amount > summary.budgeted_amount;

                return (
                  <tr 
                    key={summary.category_type} 
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className={cn('w-2.5 h-2.5 rounded-full', getCategoryColor(summary.category_type))} />
                        <span className="font-medium text-base">{info.label}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      {editingGoalType === summary.category_type ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            value={editGoalValue}
                            onChange={(e) => setEditGoalValue(e.target.value)}
                            className="w-14 h-6 text-xs px-1 text-center"
                            min="0"
                            max="100"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateGoal(summary.category_type);
                              if (e.key === 'Escape') setEditingGoalType(null);
                            }}
                          />
                          <span className="text-xs">%</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={() => handleUpdateGoal(summary.category_type)}
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={() => setEditingGoalType(null)}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <span 
                          className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 transition-all',
                            info.bgColor,
                            info.color
                          )}
                          onClick={() => startEditingGoal(summary.category_type, summary.goal_percentage)}
                          title="Click to edit"
                        >
                          {(summary.goal_percentage * 100).toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="text-center py-3 px-3 tabular-nums text-base font-medium">
                      {formatCurrencyCompact(summary.budgeted_amount)}
                    </td>
                    <td className={cn(
                      'text-center py-3 px-3 tabular-nums text-base font-semibold',
                      getSpentColor(summary.spent_amount, summary.budgeted_amount)
                    )}>
                      {formatCurrencyCompact(summary.spent_amount)}
                    </td>
                    <td className={cn(
                      'text-center py-3 px-3 tabular-nums text-base font-medium',
                      isOver ? 'text-red-600' : 'text-muted-foreground'
                    )}>
                      {isOver ? '-' : ''}{formatCurrencyCompact(Math.abs(summary.remaining_amount))}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Progress 
                          value={Math.min(progressPercent, 100)} 
                          className={cn('h-2 flex-1', getProgressColor(summary.spent_amount, summary.budgeted_amount))}
                        />
                        <span className="text-xs text-muted-foreground w-8 text-center">
                          {progressPercent.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-3 tabular-nums text-base text-muted-foreground">
                      {summary.transaction_count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="text-center py-3 px-4 text-base">Total</td>
                <td className="text-center py-3 px-2">
                  <span 
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      goalPercentageMismatch 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'text-muted-foreground'
                    )}
                  >
                    {(totalGoalPercentage * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="text-center py-3 px-3 tabular-nums text-base">
                  {formatCurrencyCompact(totalIncome)}
                </td>
                <td className="text-center py-3 px-3 tabular-nums text-base text-red-600">
                  {formatCurrencyCompact(totalSpent)}
                </td>
                <td className={cn(
                  'text-center py-3 px-3 tabular-nums text-base',
                  totalRemaining >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {formatCurrencyCompact(totalRemaining)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <Progress 
                      value={totalIncome > 0 ? Math.min((totalSpent / totalIncome) * 100, 100) : 0} 
                      className={cn('h-2 flex-1', getProgressColor(totalSpent, totalIncome))}
                    />
                    <span className="text-xs text-muted-foreground w-8 text-center">
                      {totalIncome > 0 ? ((totalSpent / totalIncome) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </td>
                <td className="text-center py-3 px-3 tabular-nums text-base">
                  {totalTransactions}
                </td>
              </tr>
            </tfoot>
          </table>
          
          {/* Goal percentage warning */}
          {goalPercentageMismatch && (
            <div className="mx-4 mb-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Goal percentages sum to <span className="font-semibold">{(totalGoalPercentage * 100).toFixed(0)}%</span> instead of 100%. 
                Adjust your category goals to ensure accurate budget allocation.
              </p>
            </div>
          )}
        </div>

        {/* Income Sources Section */}
        <div className="border-b">
          <button
            onClick={() => setIncomeExpanded(!incomeExpanded)}
            className="w-full px-4 py-3 bg-muted/30 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Income Sources ({incomes.length})
            </h3>
            {incomeExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {incomeExpanded && (
            <div className="p-4 space-y-2">
              {/* Income list */}
              {incomes.length === 0 && !isAddingIncome ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No income sources added yet
                </p>
              ) : (
                <div className="space-y-2">
                  {incomes.map((income) => (
                    <div
                      key={income.id}
                      className="group flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200"
                    >
                      {editingIncomeId === income.id ? (
                        <>
                          <span className="text-sm font-medium text-emerald-700 min-w-fit">{income.source_name}:</span>
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-24 h-7 text-sm px-2"
                            autoFocus
                            placeholder="Amount"
                          />
                          <DatePicker
                            value={editDate}
                            onChange={setEditDate}
                            defaultMonth={month}
                            defaultYear={year}
                            placeholder="Date"
                            className="h-7 text-xs w-28"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleUpdateIncome(income.id)}
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={cancelEditingIncome}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-emerald-700">{income.source_name}:</span>
                          <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                            {formatCurrencyCompact(income.amount)}
                          </span>
                          {income.date && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600/70 bg-emerald-100 px-2 py-0.5 rounded">
                              <Calendar className="h-3 w-3" />
                              {formatDateDisplay(income.date)}
                            </span>
                          )}
                          <div className="flex-1" />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => startEditingIncome(income)}
                          >
                            <Pencil className="h-3 w-3 text-emerald-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onDeleteIncome(income.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add income form */}
              {isAddingIncome ? (
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Source name"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex-1 h-8 text-sm"
                    autoFocus
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-28 h-8 text-sm"
                  />
                  <DatePicker
                    value={newDate}
                    onChange={setNewDate}
                    defaultMonth={month}
                    defaultYear={year}
                    placeholder="Date (optional)"
                    className="h-8 text-sm w-36"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={handleAddIncome}>
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => {
                    setIsAddingIncome(false);
                    setNewSourceName('');
                    setNewAmount('');
                    setNewDate(null);
                  }}>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsAddingIncome(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Income
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Card Spending Section */}
        <div>
          <button
            onClick={() => setCardSpendingExpanded(!cardSpendingExpanded)}
            className="w-full px-4 py-3 bg-muted/30 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Spending by Card
            </h3>
            {cardSpendingExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {cardSpendingExpanded && (
            <>
              {cardSpendingEntries.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No spending recorded yet
                  </p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: 2x2 Card Tiles */}
                    <div className="grid grid-cols-2 gap-3">
                      {cardSpendingEntries.slice(0, 4).map(([source, data]) => {
                        const colors = SOURCE_COLORS[source];
                        const percentage = totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0;
                        return (
                          <div
                            key={source}
                            className={cn(
                              'p-4 rounded-lg border-2 transition-all hover:shadow-md',
                              colors.border
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn('w-3 h-3 rounded-full', colors.dot)} />
                              <span className={cn('text-xs font-semibold uppercase tracking-wide', colors.text)}>
                                {SOURCE_LABELS[source]}
                              </span>
                            </div>
                            <p className={cn('text-2xl font-bold tabular-nums mb-1', colors.text)}>
                              {formatCurrencyCompact(data.amount)}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{data.count} txn{data.count !== 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span className="text-base font-bold tabular-nums">{percentage.toFixed(0)}%</span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Fill empty slots if less than 4 cards */}
                      {Array.from({ length: Math.max(0, 4 - cardSpendingEntries.length) }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="p-4 rounded-lg border-2 border-dashed border-muted" />
                      ))}
                    </div>

                    {/* Right: Pie Chart */}
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={renderCustomLabel}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieChartData.map((entry) => (
                              <Cell key={entry.source} fill={getPieColor(entry.source as SourceFile)} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string, props: any) => [
                              formatCurrencyCompact(value),
                              `${name} (${props.payload.count} txn${props.payload.count !== 1 ? 's' : ''})`,
                            ]}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              padding: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

