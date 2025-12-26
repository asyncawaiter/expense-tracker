'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Calendar, Wallet, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction, Income } from '@/lib/types';

interface CalendarEntry {
  id: string;
  description: string;
  amount: number;
  is_income: boolean;
  category?: { name: string } | null;
  notes?: string | null;
  type: 'transaction' | 'income';
}

interface ExpenseCalendarProps {
  month: number;
  year: number;
  transactions: Transaction[];
  incomes?: Income[];
}

interface DayData {
  date: number;
  income: number;
  expense: number;
  net: number;
  entries: CalendarEntry[];
}

export function ExpenseCalendar({ month, year, transactions, incomes = [] }: ExpenseCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Parse date string without timezone issues (YYYY-MM-DD format)
  const parseDateDay = (dateStr: string): number => {
    const parts = dateStr.split('-');
    return parseInt(parts[2], 10);
  };

  // Calculate data for each day
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    
    // Group transactions by day
    const dayMap = new Map<number, DayData>();
    
    for (let day = 1; day <= daysInMonth; day++) {
      dayMap.set(day, {
        date: day,
        income: 0,
        expense: 0,
        net: 0,
        entries: []
      });
    }
    
    // Add transactions (only expenses, not credits/income from bank statements)
    for (const tx of transactions) {
      // Skip credits/income from transactions - we only want expenses here
      // Actual income comes from the incomes table, not the transactions table
      if (tx.is_income || tx.amount > 0) {
        continue;
      }
      
      const day = parseDateDay(tx.date);
      const dayData = dayMap.get(day);
      
      if (dayData) {
        dayData.entries.push({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          is_income: false,
          category: tx.category,
          notes: tx.notes,
          type: 'transaction'
        });
        dayData.expense += Math.abs(tx.amount);
        dayData.net = dayData.income - dayData.expense;
      }
    }
    
    // Add income sources that have a date
    for (const inc of incomes) {
      if (inc.date) {
        const day = parseDateDay(inc.date);
        const dayData = dayMap.get(day);
        
        if (dayData) {
          dayData.entries.push({
            id: inc.id,
            description: inc.source_name,
            amount: inc.amount,
            is_income: true,
            category: null,
            type: 'income'
          });
          dayData.income += inc.amount;
          dayData.net = dayData.income - dayData.expense;
        }
      }
    }
    
    return {
      daysInMonth,
      firstDayOfMonth,
      days: Array.from(dayMap.values())
    };
  }, [month, year, transactions, incomes]);

  // Find max absolute net value for scaling gradients
  const maxAbsNet = useMemo(() => {
    return Math.max(
      ...calendarData.days.map(d => Math.abs(d.net)),
      1 // Prevent division by zero
    );
  }, [calendarData]);

  const getDayColor = (dayData: DayData, isSelected: boolean) => {
    if (dayData.entries.length === 0) {
      return 'bg-muted/30 hover:bg-muted/50';
    }
    
    const intensity = Math.min(Math.abs(dayData.net) / maxAbsNet, 1);
    
    if (dayData.net > 0) {
      // Green gradient for income
      if (isSelected) return 'bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-2';
      if (intensity > 0.7) return 'bg-emerald-500 text-white hover:bg-emerald-600';
      if (intensity > 0.4) return 'bg-emerald-400 text-white hover:bg-emerald-500';
      if (intensity > 0.2) return 'bg-emerald-300 text-emerald-900 hover:bg-emerald-400';
      return 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300';
    } else if (dayData.net < 0) {
      // Red gradient for expenses
      if (isSelected) return 'bg-rose-600 text-white ring-2 ring-rose-600 ring-offset-2';
      if (intensity > 0.7) return 'bg-rose-500 text-white hover:bg-rose-600';
      if (intensity > 0.4) return 'bg-rose-400 text-white hover:bg-rose-500';
      if (intensity > 0.2) return 'bg-rose-300 text-rose-900 hover:bg-rose-400';
      return 'bg-rose-200 text-rose-800 hover:bg-rose-300';
    }
    
    // Net zero with transactions
    if (isSelected) return 'bg-slate-500 text-white ring-2 ring-slate-500 ring-offset-2';
    return 'bg-slate-200 text-slate-700 hover:bg-slate-300';
  };

  const handleDayClick = (dayData: DayData) => {
    if (dayData.entries.length > 0) {
      setSelectedDay(selectedDay?.date === dayData.date ? null : dayData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const monthYear = new Date(year, month - 1).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const grid: (DayData | null)[] = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < calendarData.firstDayOfMonth; i++) {
      grid.push(null);
    }
    
    // Add days of the month
    for (const day of calendarData.days) {
      grid.push(day);
    }
    
    // Fill remaining cells to complete the last week
    while (grid.length % 7 !== 0) {
      grid.push(null);
    }
    
    return grid;
  }, [calendarData]);

  return (
    <Card className="shadow-apple">
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold">Spending Calendar</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground font-medium">{monthYear}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex gap-6">
          {/* Left Pane - Day Details (40%) */}
          <div className="w-[40%] flex-shrink-0">
            {selectedDay ? (
              <div className="h-full flex flex-col">
                {/* Selected Day Header */}
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {new Date(year, month - 1, selectedDay.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </h3>
                </div>

                {/* Day Summary */}
                <div className="grid grid-cols-3 gap-1 text-center py-2 bg-muted/30 rounded-lg mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Income</p>
                    <p className="text-xs font-bold text-emerald-600">{formatCurrency(selectedDay.income)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Expense</p>
                    <p className="text-xs font-bold text-rose-600">{formatCurrency(selectedDay.expense)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Net</p>
                    <p className={cn(
                      'text-xs font-bold',
                      selectedDay.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    )}>
                      {selectedDay.net >= 0 ? '+' : ''}{formatCurrency(selectedDay.net)}
                    </p>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 max-h-80">
                  {selectedDay.entries
                    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'p-2 rounded-md border',
                          entry.is_income
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-rose-50 border-rose-200'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            {entry.type === 'income' ? (
                              <Wallet className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <Receipt className="h-3 w-3 text-rose-600 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{entry.description}</p>
                              {entry.category && (
                                <p className="text-[10px] text-muted-foreground truncate">{entry.category.name}</p>
                              )}
                            </div>
                          </div>
                          <p className={cn(
                            'text-xs font-bold tabular-nums ml-2 flex-shrink-0',
                            entry.is_income ? 'text-emerald-600' : 'text-rose-600'
                          )}>
                            {entry.is_income ? '+' : ''}{formatCurrency(entry.amount)}
                          </p>
                        </div>
                        {entry.notes && (
                          <div className="mt-1.5 pt-1.5 border-t border-dashed border-current/20">
                            <p className={cn(
                              'text-[10px] italic',
                              entry.is_income ? 'text-emerald-700' : 'text-rose-700'
                            )}>
                              "{entry.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">Select a day</p>
                <p className="text-xs">Click on a colored day to see transactions</p>
              </div>
            )}
          </div>

          {/* Right Side - Calendar (60%) */}
          <div className="w-[60%]">
            {/* Legend */}
            <div className="flex items-center justify-end gap-4 mb-2 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-400" />
                <span className="text-muted-foreground">Income</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-rose-400" />
                <span className="text-muted-foreground">Expense</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted/50" />
                <span className="text-muted-foreground">None</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase"
                >
                  {day}
                </div>
              ))}
              
              {/* Calendar cells */}
              {calendarGrid.map((dayData, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-14 rounded-lg flex flex-col items-center justify-center transition-all duration-200',
                    dayData
                      ? cn(
                          getDayColor(dayData, selectedDay?.date === dayData.date),
                          dayData.entries.length > 0 && 'cursor-pointer hover:scale-105'
                        )
                      : 'bg-transparent'
                  )}
                  onClick={() => dayData && handleDayClick(dayData)}
                >
                  {dayData && (
                    <>
                      <span className="text-base font-semibold">{dayData.date}</span>
                      {dayData.entries.length > 0 && (
                        <span className="text-[10px] font-medium opacity-80">
                          {dayData.entries.length} tx
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Monthly Summary */}
            <div className="mt-4 pt-3 border-t grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-[10px] font-medium uppercase">Income</span>
                </div>
                <p className="text-sm font-bold text-emerald-600">
                  {calendarData.days.filter(d => d.net > 0).length}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-rose-600">
                  <TrendingDown className="h-3 w-3" />
                  <span className="text-[10px] font-medium uppercase">Expense</span>
                </div>
                <p className="text-sm font-bold text-rose-600">
                  {calendarData.days.filter(d => d.net < 0).length}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-slate-600">
                  <Minus className="h-3 w-3" />
                  <span className="text-[10px] font-medium uppercase">None</span>
                </div>
                <p className="text-sm font-bold text-slate-600">
                  {calendarData.days.filter(d => d.entries.length === 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
