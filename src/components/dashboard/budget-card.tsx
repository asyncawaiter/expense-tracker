'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CategoryType, CATEGORY_TYPE_INFO, BudgetSummary } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BudgetCardProps {
  summary: BudgetSummary;
  totalIncome: number;
}

export function BudgetCard({ summary, totalIncome }: BudgetCardProps) {
  const info = CATEGORY_TYPE_INFO[summary.category_type];
  const progressPercent = summary.budgeted_amount > 0 
    ? (summary.spent_amount / summary.budgeted_amount) * 100
    : 0;
  
  const isOverBudget = summary.spent_amount > summary.budgeted_amount;
  const isNearLimit = progressPercent >= 80 && progressPercent < 100;
  
  const getStatusColor = () => {
    if (isOverBudget) return 'text-red-600';
    if (isNearLimit) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getStatusIcon = () => {
    if (isOverBudget) return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (summary.spent_amount === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return <TrendingDown className="h-4 w-4 text-emerald-600" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryGradient = (type: CategoryType) => {
    switch (type) {
      case 'FIXED':
        return 'from-blue-500 to-blue-600';
      case 'FUN':
        return 'from-emerald-500 to-emerald-600';
      case 'FUTURE_YOU':
        return 'from-purple-500 to-purple-600';
    }
  };

  const getCategoryBgGradient = (type: CategoryType) => {
    switch (type) {
      case 'FIXED':
        return 'bg-gradient-to-br from-blue-50 to-blue-100/50';
      case 'FUN':
        return 'bg-gradient-to-br from-emerald-50 to-emerald-100/50';
      case 'FUTURE_YOU':
        return 'bg-gradient-to-br from-purple-50 to-purple-100/50';
    }
  };

  return (
    <Card className={cn(
      'relative overflow-hidden shadow-apple hover:shadow-apple-lg transition-all duration-300',
      getCategoryBgGradient(summary.category_type)
    )}>
      {/* Accent bar */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
        getCategoryGradient(summary.category_type)
      )} />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{info.label}</CardTitle>
          <span className={cn(
            'text-sm font-medium px-2 py-0.5 rounded-full',
            info.bgColor,
            info.color
          )}>
            {(summary.goal_percentage * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{info.description}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Spent</p>
            <p className={cn('text-2xl font-bold tabular-nums', getStatusColor())}>
              {formatCurrency(summary.spent_amount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Budget</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(summary.budgeted_amount)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress 
            value={Math.min(progressPercent, 100)} 
            className={cn(
              'h-2',
              isOverBudget && '[&>div]:bg-red-500',
              isNearLimit && !isOverBudget && '[&>div]:bg-amber-500',
              !isOverBudget && !isNearLimit && '[&>div]:bg-emerald-500'
            )}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {progressPercent.toFixed(0)}% used
            </span>
            <span className={cn('flex items-center gap-1', getStatusColor())}>
              {getStatusIcon()}
              {isOverBudget 
                ? `${formatCurrency(Math.abs(summary.remaining_amount))} over`
                : `${formatCurrency(summary.remaining_amount)} left`
              }
            </span>
          </div>
        </div>

        {/* Transaction count */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {summary.transaction_count} transaction{summary.transaction_count !== 1 ? 's' : ''}
          </span>
          {totalIncome > 0 && (
            <span className="text-xs text-muted-foreground">
              of {formatCurrency(totalIncome)} income
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

