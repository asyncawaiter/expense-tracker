'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, DollarSign, Check, X } from 'lucide-react';
import { Income } from '@/lib/types';
import { cn } from '@/lib/utils';

interface IncomeSectionProps {
  incomes: Income[];
  month: number;
  year: number;
  onAddIncome: (sourceName: string, amount: number) => Promise<void>;
  onUpdateIncome: (id: string, amount: number) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
}

export function IncomeSection({
  incomes,
  month,
  year,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
}: IncomeSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAdd = async () => {
    if (newSourceName.trim() && newAmount) {
      await onAddIncome(newSourceName.trim(), parseFloat(newAmount));
      setNewSourceName('');
      setNewAmount('');
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (editAmount) {
      await onUpdateIncome(id, parseFloat(editAmount));
      setEditingId(null);
      setEditAmount('');
    }
  };

  const startEditing = (income: Income) => {
    setEditingId(income.id);
    setEditAmount(income.amount.toString());
  };

  return (
    <Card className="shadow-apple">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Income
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-emerald-600 tabular-nums">
            {formatCurrency(totalIncome)}
          </p>
          <p className="text-xs text-muted-foreground">Total Income</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-1.5 px-4 pt-0 pb-3">
        {/* Existing income sources */}
        {incomes.map((income) => (
          <div
            key={income.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50 group"
          >
            <span className="text-sm font-medium">{income.source_name}</span>
            
            {editingId === income.id ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-24 h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleUpdate(income.id)}
                >
                  <Check className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold tabular-nums cursor-pointer hover:text-primary transition-colors"
                  onClick={() => startEditing(income)}
                >
                  {formatCurrency(income.amount)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDeleteIncome(income.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Add new income form */}
        {isAdding ? (
          <div className="flex items-center gap-1.5 py-1">
            <Input
              placeholder="Source name"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              className="flex-1 h-7 text-sm"
              autoFocus
            />
            <Input
              type="number"
              placeholder="Amount"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-24 h-7 text-sm"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAdd}>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAdding(false)}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs mt-1"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Income Source
          </Button>
        )}

        {/* Empty state */}
        {incomes.length === 0 && !isAdding && (
          <p className="text-xs text-muted-foreground text-center py-3">
            No income sources added yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

