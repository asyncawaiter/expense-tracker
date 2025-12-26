'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePeriod } from '@/components/layout/app-layout';
import { 
  Transaction, 
  CATEGORY_TYPE_INFO 
} from '@/lib/types';
import { 
  getTransactions, 
  unarchiveTransactions,
  deleteTransaction
} from '@/lib/database';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatSource } from '@/lib/parser';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Archive, 
  ArchiveRestore, 
  Trash2,
  RefreshCw
} from 'lucide-react';

// Demo archived transactions
const DEMO_ARCHIVED: Transaction[] = [
  { id: 'a1', description: 'Duplicate - METRO GROCERY', amount: -125.80, date: '2024-12-02', source: 'scotia_visa', category_id: null, major_category_type: null, is_income: false, is_archived: true, notes: 'Duplicate entry', created_at: '', updated_at: '' },
  { id: 'a2', description: 'Refund - Amazon Return', amount: 45.99, date: '2024-12-01', source: 'amex', category_id: null, major_category_type: null, is_income: true, is_archived: true, notes: null, created_at: '', updated_at: '' },
];

export default function ArchivedPage() {
  const { month, year } = usePeriod();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setTransactions(DEMO_ARCHIVED);
        setIsDemo(true);
      } else {
        const data = await getTransactions({ month, year, isArchived: true });
        setTransactions(data);
        setIsDemo(false);
      }
    } catch (error) {
      console.error('Error loading archived:', error);
      setTransactions(DEMO_ARCHIVED);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleUnarchive = async () => {
    if (selectedIds.size === 0) return;

    if (isDemo) {
      setTransactions(transactions.filter(t => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      toast.success(`Restored ${selectedIds.size} transactions (demo mode)`);
      return;
    }

    try {
      await unarchiveTransactions(Array.from(selectedIds));
      toast.success(`Restored ${selectedIds.size} transactions`);
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      console.error('Error unarchiving:', error);
      toast.error('Failed to restore transactions');
    }
  };

  const handleDelete = async (id: string) => {
    if (isDemo) {
      setTransactions(transactions.filter(t => t.id !== id));
      toast.success('Deleted (demo mode)');
      return;
    }

    try {
      await deleteTransaction(id);
      await loadData();
      toast.success('Transaction deleted permanently');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(Math.abs(amount));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-muted rounded-lg" />
        <div className="h-96 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-apple">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Archive className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-apple">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ArchiveRestore className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-xl font-bold">{selectedIds.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-apple">
          <CardContent className="pt-6 flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleUnarchive}
              disabled={selectedIds.size === 0}
              className="flex-1"
            >
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore Selected
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Archived Table */}
      <Card className="shadow-apple">
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-16">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No archived transactions</h3>
              <p className="text-muted-foreground">
                Archived transactions will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === transactions.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-24">Source</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const typeInfo = tx.major_category_type 
                    ? CATEGORY_TYPE_INFO[tx.major_category_type]
                    : null;
                  
                  return (
                    <TableRow key={tx.id} className="text-muted-foreground">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(tx.id)}
                          onCheckedChange={() => handleSelectOne(tx.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {format(new Date(tx.date), 'MMM d')}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{tx.description}</p>
                        {tx.notes && (
                          <p className="text-xs text-muted-foreground">{tx.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {typeInfo ? (
                          <Badge 
                            variant="secondary" 
                            className={cn('text-xs opacity-60', typeInfo.bgColor, typeInfo.color)}
                          >
                            {typeInfo.label}
                          </Badge>
                        ) : (
                          <span className="text-xs">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs opacity-60">
                          {formatSource(tx.source).split(' ')[0]}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(
                        'text-right text-sm tabular-nums',
                        tx.is_income ? 'text-emerald-600/60' : ''
                      )}>
                        {tx.is_income ? '+' : '-'}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tx.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

