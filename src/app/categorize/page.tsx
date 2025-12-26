'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Category, 
  CategoryType, 
  CATEGORY_TYPE_INFO,
  SmartSuggestion 
} from '@/lib/types';
import { 
  getUncategorizedTransactions, 
  categorizeTransaction,
  archiveTransactions,
  deleteTransactions,
  getSmartSuggestions,
  applySmartSuggestions,
  getCategories,
  createCategory,
  updateTransactionWithHistory
} from '@/lib/database';
import { Input } from '@/components/ui/input';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatSource } from '@/lib/parser';
import { pageRefresh } from '@/lib/events';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Tags, 
  Archive, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  Trash2,
  Save,
  MessageSquare,
  Check,
  X,
  Plus,
  ChevronDown
} from 'lucide-react';

// Demo uncategorized transactions
const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'UBER EATS - TORONTO', amount: -35.50, date: '2024-12-01', source: 'amex', category_id: null, major_category_type: null, is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
  { id: '2', description: 'METRO GROCERY', amount: -125.80, date: '2024-12-02', source: 'scotia_visa', category_id: null, major_category_type: null, is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
  { id: '3', description: 'NETFLIX.COM', amount: -22.99, date: '2024-12-03', source: 'amex', category_id: null, major_category_type: null, is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
  { id: '4', description: 'HYDRO ONE PAYMENT', amount: -85.00, date: '2024-12-04', source: 'scotia_chequing', category_id: null, major_category_type: null, is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
  { id: '5', description: 'TIM HORTONS', amount: -8.50, date: '2024-12-05', source: 'scotia_visa', category_id: null, major_category_type: null, is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
];

// Demo categories for when Supabase is not configured
const DEMO_CATEGORIES: Category[] = [
  { id: '1', name: 'Rent', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'Utilities', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Groceries', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '4', name: 'Insurance', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '5', name: 'Phone/Internet', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '6', name: 'Transportation', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '7', name: 'Dining Out', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '8', name: 'Entertainment', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '9', name: 'Shopping', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '10', name: 'Subscriptions', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '11', name: 'Savings', type: 'FUTURE_YOU', is_active: true, created_at: '', updated_at: '' },
  { id: '12', name: 'Investments', type: 'FUTURE_YOU', is_active: true, created_at: '', updated_at: '' },
  { id: '13', name: 'Debt Payment', type: 'FUTURE_YOU', is_active: true, created_at: '', updated_at: '' },
];

export default function CategorizePage() {
  const { month, year } = usePeriod();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCategorizations, setPendingCategorizations] = useState<Map<string, { type: CategoryType; categoryId?: string }>>(new Map());
  const [isDemo, setIsDemo] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [newSubcategoryInputs, setNewSubcategoryInputs] = useState<Map<string, string>>(new Map());
  // Track which pre-filled notes user wants to keep (checkbox confirmed)
  const [confirmedNotes, setConfirmedNotes] = useState<Set<string>>(new Set());
  // Track which notes were manually edited by user (these are always saved)
  const [userEditedNotes, setUserEditedNotes] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setTransactions(DEMO_TRANSACTIONS);
        setCategories(DEMO_CATEGORIES);
        setIsDemo(true);
      } else {
        const [txns, suggestions, cats] = await Promise.all([
          getUncategorizedTransactions(month, year),
          getSmartSuggestions(),
          getCategories()
        ]);
        setTransactions(txns);
        setSmartSuggestions(suggestions);
        setCategories(cats);
        setIsDemo(false);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions(DEMO_TRANSACTIONS);
      setCategories(DEMO_CATEGORIES);
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
    const unsubscribe = pageRefresh.subscribe('/categorize', loadData);
    return unsubscribe;
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

  const handleQuickCategorize = (txId: string, type: CategoryType) => {
    const newPending = new Map(pendingCategorizations);
    const existing = pendingCategorizations.get(txId);
    
    // If clicking the same type, toggle it off
    if (existing?.type === type) {
      newPending.delete(txId);
    } else {
      // Set the new type, clear any previous subcategory
      newPending.set(txId, { type, categoryId: undefined });
    }
    setPendingCategorizations(newPending);
  };

  const handleSubcategoryChange = (txId: string, categoryId: string | undefined) => {
    const newPending = new Map(pendingCategorizations);
    const existing = pendingCategorizations.get(txId);
    if (existing) {
      newPending.set(txId, { ...existing, categoryId });
    }
    setPendingCategorizations(newPending);
  };

  const handleSaveAllPending = async () => {
    if (pendingCategorizations.size === 0) return;

    setIsSaving(true);

    if (isDemo) {
      const pendingIds = Array.from(pendingCategorizations.keys());
      // Clear notes for transactions with pre-filled notes that weren't confirmed
      setTransactions(prev => prev.map(t => {
        if (pendingIds.includes(t.id) && t.notes && !confirmedNotes.has(t.id) && !userEditedNotes.has(t.id)) {
          return { ...t, notes: null };
        }
        return t;
      }).filter(t => !pendingIds.includes(t.id)));
      setPendingCategorizations(new Map());
      setConfirmedNotes(new Set());
      setIsSaving(false);
      toast.success(`Categorized ${pendingIds.length} transactions (demo mode)`);
      return;
    }

    try {
      const categorizationPromises = Array.from(pendingCategorizations.entries()).map(([id, { type, categoryId }]) =>
        categorizeTransaction(id, categoryId || null, type)
      );
      
      // Clear notes for transactions with pre-filled notes that weren't confirmed or edited
      const noteClearPromises: Promise<unknown>[] = [];
      for (const [id] of pendingCategorizations) {
        const tx = transactions.find(t => t.id === id);
        if (tx?.notes && !confirmedNotes.has(id) && !userEditedNotes.has(id)) {
          // Clear the unconfirmed pre-filled note
          noteClearPromises.push(
            updateTransactionWithHistory(id, { notes: null }, tx)
          );
        }
      }
      
      await Promise.all([...categorizationPromises, ...noteClearPromises]);
      toast.success(`Categorized ${pendingCategorizations.size} transactions`);
      setPendingCategorizations(new Map());
      setConfirmedNotes(new Set());
      await loadData();
    } catch (error) {
      console.error('Error categorizing:', error);
      toast.error('Failed to categorize transactions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.size === 0) return;

    if (isDemo) {
      setTransactions(transactions.filter(t => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      toast.success(`Archived ${selectedIds.size} transactions (demo mode)`);
      return;
    }

    try {
      await archiveTransactions(Array.from(selectedIds));
      toast.success(`Archived ${selectedIds.size} transactions`);
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      console.error('Error archiving:', error);
      toast.error('Failed to archive transactions');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    if (isDemo) {
      setTransactions(transactions.filter(t => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} transactions (demo mode)`);
      return;
    }

    try {
      await deleteTransactions(Array.from(selectedIds));
      toast.success(`Deleted ${selectedIds.size} transactions permanently`);
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete transactions');
    }
  };

  const handleApplySmartSuggestions = () => {
    const newPending = new Map(pendingCategorizations);
    let matchCount = 0;

    for (const tx of transactions) {
      const suggestion = applySmartSuggestions(tx, smartSuggestions);
      if (suggestion) {
        newPending.set(tx.id, { 
          type: suggestion.major_category_type, 
          categoryId: suggestion.category_id 
        });
        matchCount++;
      }
    }

    setPendingCategorizations(newPending);
    if (matchCount > 0) {
      toast.success(`Applied ${matchCount} smart suggestions`);
    } else {
      toast.info('No matching suggestions found');
    }
  };

  const handleStartEditNote = (tx: Transaction) => {
    setEditingNoteId(tx.id);
    setNoteValue(tx.notes || '');
  };

  const handleCancelNote = () => {
    setEditingNoteId(null);
    setNoteValue('');
  };

  const handleSaveNote = async (tx: Transaction) => {
    // Mark as user-edited so it's always saved
    setUserEditedNotes(prev => new Set(prev).add(tx.id));
    
    if (isDemo) {
      setTransactions(prev => prev.map(t => 
        t.id === tx.id ? { ...t, notes: noteValue || null } : t
      ));
      toast.success('Note saved (demo mode)');
      setEditingNoteId(null);
      setNoteValue('');
      return;
    }

    try {
      await updateTransactionWithHistory(tx.id, { notes: noteValue || null }, tx);
      setTransactions(prev => prev.map(t => 
        t.id === tx.id ? { ...t, notes: noteValue || null } : t
      ));
      toast.success('Note saved');
      setEditingNoteId(null);
      setNoteValue('');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    }
  };

  const handleToggleConfirmNote = (txId: string) => {
    setConfirmedNotes(prev => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

  const handleNewSubcategoryInput = (txId: string, value: string) => {
    setNewSubcategoryInputs(prev => {
      const next = new Map(prev);
      next.set(txId, value);
      return next;
    });
  };

  const handleCreateSubcategory = async (txId: string, type: CategoryType) => {
    const name = newSubcategoryInputs.get(txId)?.trim();
    if (!name) return;

    if (isDemo) {
      const newCat: Category = {
        id: Date.now().toString(),
        name,
        type,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCategories(prev => [...prev, newCat]);
      // Also set this as the selected subcategory for the transaction
      const newPending = new Map(pendingCategorizations);
      newPending.set(txId, { type, categoryId: newCat.id });
      setPendingCategorizations(newPending);
      // Clear the input
      setNewSubcategoryInputs(prev => {
        const next = new Map(prev);
        next.delete(txId);
        return next;
      });
      toast.success(`Created "${name}" subcategory (demo mode)`);
      return;
    }

    try {
      const newCat = await createCategory({ name, type });
      // Add to local state immediately so it's available for other transactions
      setCategories(prev => [...prev, newCat]);
      // Set as selected subcategory for this transaction
      const newPending = new Map(pendingCategorizations);
      newPending.set(txId, { type, categoryId: newCat.id });
      setPendingCategorizations(newPending);
      // Clear the input
      setNewSubcategoryInputs(prev => {
        const next = new Map(prev);
        next.delete(txId);
        return next;
      });
      toast.success(`Created "${name}" subcategory`);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      toast.error('Failed to create subcategory');
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
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="shadow-apple">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Tags className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uncategorized</p>
                <p className="text-xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-apple">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-xl font-bold">{selectedIds.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-apple">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suggestions Ready</p>
                <p className="text-xl font-bold">{pendingCategorizations.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-apple">
          <CardContent className="pt-6 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card className="shadow-apple">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {smartSuggestions.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleApplySmartSuggestions}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply Smart Suggestions
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleArchiveSelected}
                disabled={selectedIds.size === 0}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>
            </div>
            <Button
              onClick={handleSaveAllPending}
              disabled={pendingCategorizations.size === 0 || isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : `Categorize Tagged (${pendingCategorizations.size})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="shadow-apple">
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                No uncategorized transactions for this period.
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
                  <TableHead className="w-24">Source</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                  <TableHead className="w-48">Note</TableHead>
                  <TableHead className="w-80">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const pending = pendingCategorizations.get(tx.id);
                  return (
                    <TableRow 
                      key={tx.id}
                      className={cn(pending && 'bg-emerald-50/50')}
                    >
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
                        <p className="text-sm font-medium truncate max-w-xs">
                          {tx.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {formatSource(tx.source).split(' ')[0]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        {editingNoteId === tx.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={noteValue}
                              onChange={(e) => setNoteValue(e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Add note..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNote(tx);
                                if (e.key === 'Escape') handleCancelNote();
                              }}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleSaveNote(tx)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={handleCancelNote}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : tx.notes && !userEditedNotes.has(tx.id) ? (
                          /* Pre-filled note: show checkbox to confirm keeping it */
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              checked={confirmedNotes.has(tx.id)}
                              onCheckedChange={() => handleToggleConfirmNote(tx.id)}
                              className="h-3.5 w-3.5"
                            />
                            <button
                              onClick={() => handleStartEditNote(tx)}
                              className={cn(
                                'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors text-left flex-1 truncate',
                                confirmedNotes.has(tx.id)
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-white text-muted-foreground border border-dashed border-muted-foreground/40 hover:border-muted-foreground/60 hover:bg-muted/30'
                              )}
                              title={confirmedNotes.has(tx.id) ? 'Click to edit' : 'Check box to keep this note, or click to edit'}
                            >
                              <span className="truncate">{tx.notes}</span>
                            </button>
                          </div>
                        ) : tx.notes && userEditedNotes.has(tx.id) ? (
                          /* User-edited note: always saved, show as confirmed */
                          <button
                            onClick={() => handleStartEditNote(tx)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors w-full text-left bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            <Check className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{tx.notes}</span>
                          </button>
                        ) : (
                          /* No note: show add button */
                          <button
                            onClick={() => handleStartEditNote(tx)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors w-full text-left text-muted-foreground hover:bg-muted/50"
                          >
                            <MessageSquare className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Add note</span>
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {/* Major category buttons */}
                          <div className="flex items-center gap-1">
                            {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
                              const info = CATEGORY_TYPE_INFO[type];
                              const isSelected = pending?.type === type;
                              return (
                                <button
                                  key={type}
                                  onClick={() => handleQuickCategorize(tx.id, type)}
                                  className={cn(
                                    'px-2 py-1 text-xs rounded transition-all flex items-center gap-0.5',
                                    isSelected
                                      ? cn(info.bgColor, info.color, 'font-medium ring-1 ring-current')
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  )}
                                >
                                  {info.label}
                                  {!pending && <ChevronDown className="h-2.5 w-2.5 opacity-50" />}
                                </button>
                              );
                            })}
                          </div>
                          {/* Subcategory radio buttons - shown when a type is selected */}
                          {pending && (
                            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-dashed border-muted-foreground/20">
                              <button
                                onClick={() => handleSubcategoryChange(tx.id, undefined)}
                                className={cn(
                                  'px-2 py-0.5 text-xs rounded transition-all',
                                  !pending.categoryId
                                    ? 'bg-gray-200 text-gray-700 font-medium'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                )}
                              >
                                None
                              </button>
                              {categories
                                .filter(c => c.type === pending.type)
                                .map((cat) => {
                                  const isSubSelected = pending.categoryId === cat.id;
                                  const typeInfo = CATEGORY_TYPE_INFO[pending.type];
                                  return (
                                    <button
                                      key={cat.id}
                                      onClick={() => handleSubcategoryChange(tx.id, cat.id)}
                                      className={cn(
                                        'px-2 py-0.5 text-xs rounded transition-all',
                                        isSubSelected
                                          ? cn(typeInfo.bgColor, typeInfo.color, 'font-medium')
                                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                      )}
                                    >
                                      {cat.name}
                                    </button>
                                  );
                                })}
                              {/* Quick add new subcategory */}
                              <div className="flex items-center gap-0.5 ml-1">
                                <Input
                                  value={newSubcategoryInputs.get(tx.id) || ''}
                                  onChange={(e) => handleNewSubcategoryInput(tx.id, e.target.value)}
                                  className="h-5 w-24 text-xs px-1.5 py-0"
                                  placeholder="+ New"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newSubcategoryInputs.get(tx.id)?.trim()) {
                                      handleCreateSubcategory(tx.id, pending.type);
                                    }
                                  }}
                                />
                                {newSubcategoryInputs.get(tx.id)?.trim() && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => handleCreateSubcategory(tx.id, pending.type)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
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

