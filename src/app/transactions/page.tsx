'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePeriod } from '@/components/layout/app-layout';
import { 
  Transaction, 
  TransactionHistory,
  Category,
  CategoryType, 
  SourceFile,
  CATEGORY_TYPE_INFO,
} from '@/lib/types';
import { 
  getTransactions, 
  archiveTransactions,
  deleteTransaction,
  updateTransactionWithHistory,
  getTransactionHistory,
  getCategories,
  categorizeTransaction
} from '@/lib/database';
import { isSupabaseConfigured } from '@/lib/supabase';
import { pageRefresh } from '@/lib/events';
import { formatSource } from '@/lib/parser';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MoreHorizontal,
  Archive,
  Trash2,
  Receipt,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
  StickyNote,
  History,
  MessageSquare,
  Tags,
  ArrowUpDown,
  FolderOpen,
  Search,
  Calendar,
} from 'lucide-react';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'description-asc' | 'description-desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date-desc', label: 'Date (Newest First)' },
  { value: 'date-asc', label: 'Date (Oldest First)' },
  { value: 'amount-desc', label: 'Amount (High to Low)' },
  { value: 'amount-asc', label: 'Amount (Low to High)' },
  { value: 'description-asc', label: 'Description (A-Z)' },
  { value: 'description-desc', label: 'Description (Z-A)' },
];

type SourceFilter = SourceFile | 'ALL';

const SOURCE_FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'ALL', label: 'All Cards' },
  { value: 'amex', label: 'Amex' },
  { value: 'pc', label: 'PC' },
  { value: 'scotia_chequing', label: 'SC' },
  { value: 'scotia_visa', label: 'SV' },
  { value: 'manual', label: 'Manual' },
];

// Demo transactions
const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'Rent Payment', amount: -1500, date: '2024-12-01', source: 'scotia_chequing', category_id: '1', major_category_type: 'FIXED', is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
  { id: '2', description: 'METRO GROCERY', amount: -125.80, date: '2024-12-02', source: 'scotia_visa', category_id: '3', major_category_type: 'FIXED', is_income: false, is_archived: false, notes: 'Weekly groceries', created_at: '', updated_at: '' },
  { id: '3', description: 'HYDRO ONE', amount: -85.00, date: '2024-12-04', source: 'scotia_chequing', category_id: '2', major_category_type: 'FIXED', is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
  { id: '4', description: 'UBER EATS', amount: -35.50, date: '2024-12-01', source: 'amex', category_id: '7', major_category_type: 'FUN', is_income: false, is_archived: false, notes: 'Late night dinner', created_at: '', updated_at: '' },
  { id: '5', description: 'NETFLIX.COM', amount: -22.99, date: '2024-12-03', source: 'amex', category_id: '10', major_category_type: 'FUN', is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
  { id: '6', description: 'TIM HORTONS', amount: -8.50, date: '2024-12-05', source: 'scotia_visa', category_id: '7', major_category_type: 'FUN', is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
  { id: '7', description: 'Transfer to TFSA', amount: -500, date: '2024-12-01', source: 'manual', category_id: '11', major_category_type: 'FUTURE_YOU', is_income: false, is_archived: false, notes: 'Monthly savings', created_at: '', updated_at: '' },
  { id: '8', description: 'Student Loan Payment', amount: -300, date: '2024-12-05', source: 'scotia_chequing', category_id: '13', major_category_type: 'FUTURE_YOU', is_income: false, is_archived: false, notes: null, created_at: '', updated_at: '' },
];

interface ExpandedRowProps {
  transaction: Transaction;
  history: TransactionHistory[];
  isLoading: boolean;
  categories: Category[];
  onSaveNote: (note: string) => Promise<void>;
  onSaveEdit: (description: string, amount: number, date: string) => Promise<void>;
  onSaveCategory: (type: CategoryType, categoryId: string | null) => Promise<void>;
}

function ExpandedRow({ transaction, history, isLoading, categories, onSaveNote, onSaveEdit, onSaveCategory }: ExpandedRowProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const isManual = transaction.notes?.includes('<!--MANUAL-->') ?? false;
  const cleanNote = transaction.notes?.replace('<!--MANUAL-->', '').trim() || '';
  const [noteValue, setNoteValue] = useState(cleanNote);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editDescription, setEditDescription] = useState(transaction.description);
  const [editAmount, setEditAmount] = useState(String(Math.abs(transaction.amount)));
  const [editDate, setEditDate] = useState(transaction.date);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [selectedType, setSelectedType] = useState<CategoryType | null>(transaction.major_category_type);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(transaction.category_id);

  const handleSaveNote = async () => {
    // Note: The marker preservation is handled in the parent handleSaveNote function
    await onSaveNote(noteValue);
    setIsEditingNote(false);
  };

  const handleSaveDetails = async () => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount)) {
      toast.error('Invalid amount');
      return;
    }
    const signedAmount = transaction.amount < 0 ? -amount : amount;
    await onSaveEdit(editDescription, signedAmount, editDate);
    setIsEditingDetails(false);
  };

  const formatFieldName = (name: string) => {
    switch (name) {
      case 'description': return 'Title';
      case 'amount': return 'Amount';
      case 'notes': return 'Note';
      case 'date': return 'Date';
      default: return name;
    }
  };

  const formatHistoryValue = (fieldName: string, value: string | null) => {
    if (value === null) return '(empty)';
    if (fieldName === 'amount') {
      return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
      }).format(Math.abs(parseFloat(value)));
    }
    if (fieldName === 'date') {
      return format(new Date(value), 'MMM d, yyyy');
    }
    return value;
  };

  return (
    <div className="bg-muted/20 px-6 py-5 border-t border-border/50">
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Notes & Edit */}
        <div className="space-y-4">
          {/* Edit Description/Amount/Date */}
          <div className="bg-background rounded-lg border border-border/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/40">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                Edit Transaction
              </h4>
              {!isEditingDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs hover:bg-muted"
                  onClick={() => setIsEditingDetails(true)}
                >
                  Edit
                </Button>
              )}
            </div>
            <div className="px-4 py-3">
              {isEditingDetails ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Transaction title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Amount"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSaveDetails}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIsEditingDetails(false);
                        setEditDescription(transaction.description);
                        setEditAmount(String(Math.abs(transaction.amount)));
                        setEditDate(transaction.date);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-border/40">
                    <span className="text-muted-foreground">Title</span>
                    <span className="font-medium text-foreground">{transaction.description}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-dashed border-border/40">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium text-foreground">
                      {new Intl.NumberFormat('en-CA', {
                        style: 'currency',
                        currency: 'CAD',
                      }).format(Math.abs(transaction.amount))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Date
                    </span>
                    <span className="font-medium text-foreground">
                      {format(new Date(transaction.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="bg-background rounded-lg border border-border/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/40">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                Note
              </h4>
              {!isEditingNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs hover:bg-muted"
                  onClick={() => setIsEditingNote(true)}
                >
                  {cleanNote ? 'Edit' : 'Add'}
                </Button>
              )}
            </div>
            <div className="px-4 py-3">
              {isEditingNote ? (
                <div className="space-y-2">
                  <Input
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Add a note about this transaction..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNote();
                      if (e.key === 'Escape') {
                        setIsEditingNote(false);
                        setNoteValue(cleanNote);
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSaveNote}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIsEditingNote(false);
                        setNoteValue(cleanNote);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  'text-sm rounded-md px-3 py-2',
                  cleanNote
                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                    : 'text-muted-foreground italic'
                )}>
                  {cleanNote || 'No note added'}
                </div>
              )}
            </div>
          </div>

          {/* Change Category */}
          <div className="bg-background rounded-lg border border-border/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/40">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                Category
              </h4>
              {!isEditingCategory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs hover:bg-muted"
                  onClick={() => setIsEditingCategory(true)}
                >
                  Change
                </Button>
              )}
            </div>
            <div className="px-4 py-3">
              {isEditingCategory ? (
                <div className="space-y-3">
                  {/* Major category buttons */}
                  <div className="flex items-center gap-1.5">
                    {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
                      const info = CATEGORY_TYPE_INFO[type];
                      const isSelected = selectedType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedType(type);
                            setSelectedCategoryId(null);
                          }}
                          className={cn(
                            'px-3 py-1.5 text-xs rounded-md transition-all',
                            isSelected
                              ? cn(info.bgColor, info.color, 'font-medium ring-1 ring-current')
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {info.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Subcategory buttons */}
                  {selectedType && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
                      <button
                        onClick={() => setSelectedCategoryId(null)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-md transition-all',
                          !selectedCategoryId
                            ? 'bg-gray-200 text-gray-700 font-medium'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        )}
                      >
                        None
                      </button>
                      {categories
                        .filter(c => c.type === selectedType)
                        .map((cat) => {
                          const isSubSelected = selectedCategoryId === cat.id;
                          const typeInfo = CATEGORY_TYPE_INFO[selectedType];
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategoryId(cat.id)}
                              className={cn(
                                'px-2.5 py-1 text-xs rounded-md transition-all',
                                isSubSelected
                                  ? cn(typeInfo.bgColor, typeInfo.color, 'font-medium')
                                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                              )}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={async () => {
                        if (selectedType) {
                          await onSaveCategory(selectedType, selectedCategoryId);
                          setIsEditingCategory(false);
                        }
                      }}
                      disabled={!selectedType}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIsEditingCategory(false);
                        setSelectedType(transaction.major_category_type);
                        setSelectedCategoryId(transaction.category_id);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {transaction.major_category_type && (
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', CATEGORY_TYPE_INFO[transaction.major_category_type].bgColor, CATEGORY_TYPE_INFO[transaction.major_category_type].color)}
                    >
                      {CATEGORY_TYPE_INFO[transaction.major_category_type].label}
                    </Badge>
                  )}
                  {transaction.category && (
                    <span className="text-muted-foreground text-sm">→</span>
                  )}
                  {transaction.category && (
                    <span className="font-medium text-sm">{transaction.category.name}</span>
                  )}
                  {!transaction.category && (
                    <span className="text-muted-foreground italic text-sm">No subcategory</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Change History */}
        <div className="bg-background rounded-lg border border-border/60 shadow-sm overflow-hidden h-fit">
          <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              Change History
            </h4>
          </div>
          <div className="px-4 py-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse py-2">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-muted-foreground italic py-2">
                No changes recorded
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="text-xs bg-muted/30 rounded-md px-3 py-2.5 border-l-2 border-primary/40"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-foreground">
                        {formatFieldName(entry.field_name)}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="line-through">{formatHistoryValue(entry.field_name, entry.old_value)}</span>
                      <span>→</span>
                      <span className="text-foreground font-medium">{formatHistoryValue(entry.field_name, entry.new_value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo categories for expanded row
const DEMO_CATEGORIES: Category[] = [
  { id: '1', name: 'Rent', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'Utilities', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Groceries', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '7', name: 'Dining Out', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '10', name: 'Subscriptions', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '11', name: 'Savings', type: 'FUTURE_YOU', is_active: true, created_at: '', updated_at: '' },
  { id: '13', name: 'Debt Payment', type: 'FUTURE_YOU', is_active: true, created_at: '', updated_at: '' },
];

export default function TransactionsPage() {
  const { month, year } = usePeriod();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CategoryType | 'ALL'>('ALL');
  const [isDemo, setIsDemo] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [historyCache, setHistoryCache] = useState<Record<string, TransactionHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [groupBySubcategory, setGroupBySubcategory] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setTransactions(DEMO_TRANSACTIONS);
        setCategories(DEMO_CATEGORIES);
        setIsDemo(true);
      } else {
        const [txData, catData] = await Promise.all([
          getTransactions({ month, year, isArchived: false }),
          getCategories()
        ]);
        setTransactions(txData.filter(t => t.major_category_type !== null));
        setCategories(catData);
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

  useEffect(() => {
    const unsubscribe = pageRefresh.subscribe('/transactions', loadData);
    return unsubscribe;
  }, [loadData]);

  // Reset category filter when active tab changes
  useEffect(() => {
    setCategoryFilter('ALL');
  }, [activeTab]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadData]);

  const loadHistory = async (txId: string) => {
    if (historyCache[txId] || loadingHistory.has(txId)) return;
    
    if (isDemo) {
      // Demo history
      setHistoryCache(prev => ({
        ...prev,
        [txId]: []
      }));
      return;
    }
    
    setLoadingHistory(prev => new Set(prev).add(txId));
    try {
      const history = await getTransactionHistory(txId);
      setHistoryCache(prev => ({
        ...prev,
        [txId]: history
      }));
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryCache(prev => ({
        ...prev,
        [txId]: []
      }));
    } finally {
      setLoadingHistory(prev => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
    }
  };

  const toggleRow = (txId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
        loadHistory(txId);
      }
      return next;
    });
  };

  const handleArchive = async (id: string) => {
    if (isDemo) {
      setTransactions(transactions.filter(t => t.id !== id));
      toast.success('Archived (demo mode)');
      return;
    }

    try {
      await archiveTransactions([id]);
      await loadData();
      toast.success('Transaction archived');
    } catch (error) {
      console.error('Error archiving:', error);
      toast.error('Failed to archive');
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
      toast.success('Transaction deleted');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
  };

  const handleSaveNote = async (txId: string, note: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    // Preserve manual marker if transaction was originally manual
    const isManual = tx.notes?.includes('<!--MANUAL-->') ?? false;
    const finalNote = note.trim() 
      ? (isManual ? `<!--MANUAL-->${note.trim()}` : note.trim())
      : (isManual ? '<!--MANUAL-->' : null);

    if (isDemo) {
      setTransactions(prev => prev.map(t => 
        t.id === txId ? { ...t, notes: finalNote } : t
      ));
      toast.success('Note saved (demo mode)');
      return;
    }

    try {
      await updateTransactionWithHistory(txId, { notes: finalNote }, tx);
      // Clear history cache to force reload
      setHistoryCache(prev => {
        const next = { ...prev };
        delete next[txId];
        return next;
      });
      await loadData();
      loadHistory(txId);
      toast.success('Note saved');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    }
  };

  const handleSaveEdit = async (txId: string, description: string, amount: number, date: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    if (isDemo) {
      setTransactions(prev => prev.map(t =>
        t.id === txId ? { ...t, description, amount, date } : t
      ));
      toast.success('Updated (demo mode)');
      return;
    }

    try {
      await updateTransactionWithHistory(txId, { description, amount, date }, tx);
      setHistoryCache(prev => {
        const next = { ...prev };
        delete next[txId];
        return next;
      });
      await loadData();
      loadHistory(txId);
      toast.success('Transaction updated');
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
    }
  };

  const handleSaveCategory = async (txId: string, type: CategoryType, categoryId: string | null) => {
    if (isDemo) {
      setTransactions(prev => prev.map(t => 
        t.id === txId ? { 
          ...t, 
          major_category_type: type, 
          category_id: categoryId,
          category: categoryId ? categories.find(c => c.id === categoryId) : undefined
        } : t
      ));
      toast.success('Category updated (demo mode)');
      return;
    }

    try {
      await categorizeTransaction(txId, categoryId, type);
      await loadData();
      toast.success('Category updated');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(Math.abs(amount));
  };

  const isManualEntry = (notes: string | null): boolean => {
    return notes?.includes('<!--MANUAL-->') ?? false;
  };

  const cleanNotes = (notes: string | null): string | null => {
    if (!notes) return null;
    return notes.replace('<!--MANUAL-->', '').trim() || null;
  };

  const getEntryType = (notes: string | null): string => {
    return isManualEntry(notes) ? 'Manual' : 'Import';
  };

  const formatSourceForDisplay = (source: SourceFile): string => {
    return formatSource(source).split(' ')[0];
  };

  // Filter by category tab
  const filteredByTab = activeTab === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.major_category_type === activeTab);

  // Filter by source/card type
  const filteredBySource = sourceFilter === 'ALL'
    ? filteredByTab
    : filteredByTab.filter(t => t.source === sourceFilter);

  // Filter by subcategory
  const filteredByCategory = categoryFilter === 'ALL'
    ? filteredBySource
    : filteredBySource.filter(t => t.category_id === categoryFilter);

  // Filter by search query
  const filteredBySearch = searchQuery.trim() === ''
    ? filteredByCategory
    : filteredByCategory.filter(t => {
        const query = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(query) ||
          t.notes?.toLowerCase().includes(query) ||
          t.category?.name.toLowerCase().includes(query) ||
          t.source.toLowerCase().includes(query)
        );
      });

  // Sort transactions
  const sortTransactions = (txns: Transaction[]): Transaction[] => {
    return [...txns].sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-desc':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'amount-asc':
          return Math.abs(a.amount) - Math.abs(b.amount);
        case 'description-asc':
          return a.description.localeCompare(b.description);
        case 'description-desc':
          return b.description.localeCompare(a.description);
        default:
          return 0;
      }
    });
  };

  const sortedTransactions = sortTransactions(filteredBySearch);

  // Group transactions by subcategory
  interface TransactionGroup {
    id: string;
    name: string;
    categoryId: string | null;
    transactions: Transaction[];
    total: number;
  }

  const getGroupedTransactions = (): TransactionGroup[] => {
    const groups = new Map<string, TransactionGroup>();
    
    for (const tx of sortedTransactions) {
      const groupId = tx.category_id || 'uncategorized';
      const groupName = tx.category?.name || 'No Subcategory';
      
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          name: groupName,
          categoryId: tx.category_id,
          transactions: [],
          total: 0
        });
      }
      
      const group = groups.get(groupId)!;
      group.transactions.push(tx);
      group.total += Math.abs(tx.amount);
    }
    
    // Sort groups by total (highest first)
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  };

  const groupedTransactions = getGroupedTransactions();

  // Collapse all groups when grouping is enabled
  const prevGroupBySubcategory = useRef(groupBySubcategory);
  useEffect(() => {
    if (groupBySubcategory && !prevGroupBySubcategory.current && sortedTransactions.length > 0) {
      // Grouping was just enabled, collapse all groups
      const groups = new Set<string>();
      for (const tx of sortedTransactions) {
        const groupId = tx.category_id || 'uncategorized';
        groups.add(groupId);
      }
      setCollapsedGroups(groups);
    }
    prevGroupBySubcategory.current = groupBySubcategory;
  }, [groupBySubcategory, sortedTransactions]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const getTypeTotal = (type: CategoryType) => {
    return transactions
      .filter(t => t.major_category_type === type)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-muted rounded-lg" />
        <div className="h-96 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="shadow-apple">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Receipt className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
          const info = CATEGORY_TYPE_INFO[type];
          const total = getTypeTotal(type);
          return (
            <Card key={type} className="shadow-apple">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', info.bgColor)}>
                    <TrendingDown className={cn('h-5 w-5', info.color)} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{info.label}</p>
                    <p className={cn('text-xl font-bold tabular-nums', info.color)}>
                      {formatCurrency(total)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transactions Table */}
      <Card className="shadow-apple">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryType | 'ALL')} className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="ALL">
                  All ({transactions.length})
                </TabsTrigger>
                {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
                  const count = transactions.filter(t => t.major_category_type === type).length;
                  return (
                    <TabsTrigger key={type} value={type}>
                      {CATEGORY_TYPE_INFO[type].label} ({count})
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
          
          {/* Sorting and Grouping Controls */}
          <div className="flex items-center justify-between mt-4 pb-2 border-b">
            <div className="flex items-center gap-2">
              <Button
                variant={groupBySubcategory ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setGroupBySubcategory(!groupBySubcategory)}
                className="h-8 text-xs"
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                Group by Subcategory
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {/* Source/Card Filter */}
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Subcategory Filter */}
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Subcategories</SelectItem>
                  {categories
                    .filter(cat => activeTab === 'ALL' || cat.type === activeTab)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                  <SelectTrigger className="h-8 w-48 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Search Bar Row */}
          <div className="pb-0">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedTransactions.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No matches found' : 'No transactions'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? `No transactions matching "${searchQuery}"`
                  : 'No categorized transactions for this period.'
                }
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-44">Category</TableHead>
                    <TableHead className="w-24">Source</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead className="w-28 text-right">Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupBySubcategory ? (
                    /* Grouped by subcategory view */
                    <>
                      {/* First render groups with actual subcategories */}
                      {groupedTransactions
                        .filter(group => group.categoryId !== null)
                        .map((group) => {
                          const isGroupCollapsed = collapsedGroups.has(group.id);
                          const firstTx = group.transactions[0];
                          const typeInfo = firstTx?.major_category_type 
                            ? CATEGORY_TYPE_INFO[firstTx.major_category_type]
                            : null;
                          
                          return (
                            <React.Fragment key={group.id}>
                              {/* Group Header Row */}
                              <TableRow 
                                className="bg-muted/40 hover:bg-muted/60 cursor-pointer border-t-2"
                                onClick={() => toggleGroup(group.id)}
                              >
                                <TableCell className="text-muted-foreground">
                                  {isGroupCollapsed ? (
                                    <ChevronRight className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </TableCell>
                                <TableCell colSpan={2}>
                                  <div className="flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{group.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {group.transactions.length} txn{group.transactions.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {typeInfo && (
                                    <Badge 
                                      variant="secondary" 
                                      className={cn('text-xs', typeInfo.bgColor, typeInfo.color)}
                                    >
                                      {typeInfo.label}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-bold tabular-nums">
                                  {formatCurrency(group.total)}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                              
                              {/* Group Transactions */}
                              {!isGroupCollapsed && group.transactions.map((tx) => {
                                const isExpanded = expandedRows.has(tx.id);
                                const txTypeInfo = tx.major_category_type 
                                  ? CATEGORY_TYPE_INFO[tx.major_category_type]
                                  : null;
                                
                                return (
                                  <React.Fragment key={tx.id}>
                                    <TableRow 
                                      className={cn(
                                        'cursor-pointer hover:bg-muted/50 transition-colors',
                                        isExpanded && 'bg-muted/30'
                                      )}
                                      onClick={() => toggleRow(tx.id)}
                                    >
                                      <TableCell className="text-muted-foreground pl-8">
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                                        {format(new Date(tx.date), 'MMM d, yyyy')}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium">{tx.description}</p>
                                          {cleanNotes(tx.notes) && (
                                            <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1.5">
                                          {txTypeInfo && (
                                            <Badge 
                                              variant="secondary" 
                                              className={cn('text-xs', txTypeInfo.bgColor, txTypeInfo.color)}
                                            >
                                              {txTypeInfo.label}
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          {formatSourceForDisplay(tx.source)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            'text-xs',
                                            getEntryType(tx.notes) === 'Manual' 
                                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                              : 'bg-gray-50 text-gray-700 border-gray-200'
                                          )}
                                        >
                                          {getEntryType(tx.notes)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className={cn(
                                        'text-right text-sm font-medium tabular-nums',
                                        tx.is_income ? 'text-emerald-600' : ''
                                      )}>
                                        {tx.is_income ? '+' : '-'}{formatCurrency(tx.amount)}
                                      </TableCell>
                                      <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleArchive(tx.id)}>
                                              <Archive className="h-4 w-4 mr-2" />
                                              Archive
                                            </DropdownMenuItem>
                                            {tx.source === 'manual' && (
                                              <DropdownMenuItem 
                                                onClick={() => handleDelete(tx.id)}
                                                className="text-destructive"
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                      <TableRow>
                                        <TableCell colSpan={8} className="p-0">
                                          <ExpandedRow
                                            transaction={tx}
                                            history={historyCache[tx.id] || []}
                                            isLoading={loadingHistory.has(tx.id)}
                                            categories={categories}
                                            onSaveNote={(note) => handleSaveNote(tx.id, note)}
                                            onSaveEdit={(desc, amt, date) => handleSaveEdit(tx.id, desc, amt, date)}
                                            onSaveCategory={(type, catId) => handleSaveCategory(tx.id, type, catId)}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      
                      {/* Then render ungrouped transactions (no subcategory) as flat rows */}
                      {groupedTransactions
                        .filter(group => group.categoryId === null)
                        .flatMap(group => group.transactions)
                        .map((tx) => {
                          const typeInfo = tx.major_category_type 
                            ? CATEGORY_TYPE_INFO[tx.major_category_type]
                            : null;
                          const isExpanded = expandedRows.has(tx.id);
                          
                          return (
                            <React.Fragment key={tx.id}>
                              <TableRow 
                                className={cn(
                                  'cursor-pointer hover:bg-muted/50 transition-colors',
                                  isExpanded && 'bg-muted/30'
                                )}
                                onClick={() => toggleRow(tx.id)}
                              >
                                <TableCell className="text-muted-foreground">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </TableCell>
                                <TableCell className="text-sm tabular-nums text-muted-foreground">
                                  {format(new Date(tx.date), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{tx.description}</p>
                                    {cleanNotes(tx.notes) && (
                                      <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    {typeInfo && (
                                      <Badge 
                                        variant="secondary" 
                                        className={cn('text-xs', typeInfo.bgColor, typeInfo.color)}
                                      >
                                        {typeInfo.label}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {formatSourceForDisplay(tx.source)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      'text-xs',
                                      getEntryType(tx.notes) === 'Manual' 
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-gray-50 text-gray-700 border-gray-200'
                                    )}
                                  >
                                    {getEntryType(tx.notes)}
                                  </Badge>
                                </TableCell>
                                <TableCell className={cn(
                                  'text-right text-sm font-medium tabular-nums',
                                  tx.is_income ? 'text-emerald-600' : ''
                                )}>
                                  {tx.is_income ? '+' : '-'}{formatCurrency(tx.amount)}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleArchive(tx.id)}>
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                      {tx.source === 'manual' && (
                                        <DropdownMenuItem 
                                          onClick={() => handleDelete(tx.id)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={8} className="p-0">
                                    <ExpandedRow
                                      transaction={tx}
                                      history={historyCache[tx.id] || []}
                                      isLoading={loadingHistory.has(tx.id)}
                                      categories={categories}
                                      onSaveNote={(note) => handleSaveNote(tx.id, note)}
                                      onSaveEdit={(desc, amt, date) => handleSaveEdit(tx.id, desc, amt, date)}
                                      onSaveCategory={(type, catId) => handleSaveCategory(tx.id, type, catId)}
                                    />
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </>
                  ) : (
                    /* Flat list view */
                    sortedTransactions.map((tx) => {
                      const typeInfo = tx.major_category_type 
                        ? CATEGORY_TYPE_INFO[tx.major_category_type]
                        : null;
                      const isExpanded = expandedRows.has(tx.id);
                      
                      return (
                        <React.Fragment key={tx.id}>
                          <TableRow 
                            className={cn(
                              'cursor-pointer hover:bg-muted/50 transition-colors',
                              isExpanded && 'bg-muted/30'
                            )}
                            onClick={() => toggleRow(tx.id)}
                          >
                            <TableCell className="text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm tabular-nums text-muted-foreground">
                              {format(new Date(tx.date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{tx.description}</p>
                                {cleanNotes(tx.notes) && (
                                  <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {typeInfo && (
                                  <Badge 
                                    variant="secondary" 
                                    className={cn('text-xs', typeInfo.bgColor, typeInfo.color)}
                                  >
                                    {typeInfo.label}
                                  </Badge>
                                )}
                                {tx.category && (
                                  <span className="text-xs text-muted-foreground">
                                    / {tx.category.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {formatSourceForDisplay(tx.source)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  'text-xs',
                                  getEntryType(tx.notes) === 'Manual' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-gray-50 text-gray-700 border-gray-200'
                                )}
                              >
                                {getEntryType(tx.notes)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn(
                              'text-right text-sm font-medium tabular-nums',
                              tx.is_income ? 'text-emerald-600' : ''
                            )}>
                              {tx.is_income ? '+' : '-'}{formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleArchive(tx.id)}>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  {tx.source === 'manual' && (
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(tx.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0">
                                <ExpandedRow
                                  transaction={tx}
                                  history={historyCache[tx.id] || []}
                                  isLoading={loadingHistory.has(tx.id)}
                                  categories={categories}
                                  onSaveNote={(note) => handleSaveNote(tx.id, note)}
                                  onSaveEdit={(desc, amt, date) => handleSaveEdit(tx.id, desc, amt, date)}
                                  onSaveCategory={(type, catId) => handleSaveCategory(tx.id, type, catId)}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
