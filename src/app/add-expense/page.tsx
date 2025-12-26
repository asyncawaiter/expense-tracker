'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { 
  CategoryType, 
  Category, 
  SourceFile,
  CATEGORY_TYPE_INFO 
} from '@/lib/types';
import { 
  createTransaction,
  getCategories,
  createCategory
} from '@/lib/database';
import { isSupabaseConfigured } from '@/lib/supabase';
import { pageRefresh } from '@/lib/events';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, ArrowLeft } from 'lucide-react';

// Demo categories for when Supabase is not configured
const DEMO_CATEGORIES: Category[] = [
  { id: '1', name: 'Rent', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'Utilities', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Groceries', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '7', name: 'Dining Out', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '10', name: 'Subscriptions', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '11', name: 'Savings', type: 'FUTURE_YOU', is_active: true, created_at: '', updated_at: '' },
  { id: '13', name: 'Debt Payment', type: 'FUTURE_YOU', is_active: true, created_at: '', updated_at: '' },
];

export default function AddExpensePage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CategoryType | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [selectedSource, setSelectedSource] = useState<SourceFile>('amex');

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      if (!isSupabaseConfigured()) {
        setCategories(DEMO_CATEGORIES);
        setIsDemo(true);
      } else {
        const data = await getCategories();
        setCategories(data);
        setIsDemo(false);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(DEMO_CATEGORIES);
      setIsDemo(true);
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !selectedType) return;

    const name = newSubcategoryName.trim();

    if (isDemo) {
      const newCat: Category = {
        id: Date.now().toString(),
        name,
        type: selectedType,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCategories(prev => [...prev, newCat]);
      setSelectedCategoryId(newCat.id);
      setNewSubcategoryName('');
      toast.success(`Created "${name}" subcategory (demo mode)`);
      return;
    }

    try {
      const newCat = await createCategory({ name, type: selectedType });
      setCategories(prev => [...prev, newCat]);
      setSelectedCategoryId(newCat.id);
      setNewSubcategoryName('');
      toast.success(`Created "${name}" subcategory`);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      toast.error('Failed to create subcategory');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    if (!selectedType) {
      toast.error('Please select a category type');
      return;
    }

    setIsLoading(true);

    try {
      // Add hidden marker to notes to identify manual entries
      const notesWithMarker = notes.trim() 
        ? `<!--MANUAL-->${notes.trim()}`
        : '<!--MANUAL-->';

      const transactionData = {
        description: description.trim(),
        amount: -Math.abs(parseFloat(amount)), // Ensure negative for expenses
        date: date,
        source: selectedSource, // Store as selected card type
        category_id: selectedCategoryId,
        major_category_type: selectedType,
        is_income: false,
        is_archived: false,
        notes: notesWithMarker,
      };

      if (isDemo) {
        toast.success('Expense added (demo mode)');
        // Reset form
        setDescription('');
        setAmount('');
        setDate(null);
        setSelectedType(null);
        setSelectedCategoryId(null);
        setNotes('');
        setNewSubcategoryName('');
        setIsLoading(false);
        return;
      }

      await createTransaction(transactionData);
      toast.success('Expense added successfully');
      
      // Refresh data
      pageRefresh.emit('/transactions');
      pageRefresh.emit('/');
      
      // Reset form
      setDescription('');
      setAmount('');
      setDate(null);
      setSelectedType(null);
      setSelectedCategoryId(null);
      setNotes('');
      setNewSubcategoryName('');
      
      // Navigate to transactions page
      router.push('/transactions');
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to add expense');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = selectedType
    ? categories.filter(c => c.type === selectedType)
    : [];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Add Expense</h1>
      </div>

      <Card className="shadow-apple">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Grocery shopping, Coffee, Rent payment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  defaultMonth={currentMonth}
                  defaultYear={currentYear}
                  placeholder="Select date"
                />
              </div>
            </div>

            {/* Category Type */}
            <div className="space-y-2">
              <Label>Category Type *</Label>
              <div className="flex items-center gap-2">
                {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
                  const info = CATEGORY_TYPE_INFO[type];
                  const isSelected = selectedType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedType(type);
                        setSelectedCategoryId(null);
                        setNewSubcategoryName('');
                      }}
                      className={cn(
                        'px-4 py-2 rounded-lg transition-all text-sm font-medium',
                        isSelected
                          ? cn(info.bgColor, info.color, 'ring-2 ring-offset-2 ring-current')
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategory */}
            {selectedType && (
              <div className="space-y-2">
                <Label>Subcategory (Optional)</Label>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-muted-foreground/20">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded transition-all',
                      !selectedCategoryId
                        ? 'bg-gray-200 text-gray-700 font-medium'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    None
                  </button>
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    const typeInfo = CATEGORY_TYPE_INFO[selectedType];
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded transition-all',
                          isSelected
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
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      className="h-6 w-24 text-xs px-1.5 py-0"
                      placeholder="+ New"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newSubcategoryName.trim()) {
                          handleCreateSubcategory();
                        }
                      }}
                    />
                    {newSubcategoryName.trim() && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={handleCreateSubcategory}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this expense..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Card Type */}
            <div className="space-y-2 pt-2 border-t">
              <Label>Card Type *</Label>
              <div className="flex flex-wrap items-center gap-2">
                {([
                  { value: 'amex', label: 'Amex' },
                  { value: 'pc', label: 'PC' },
                  { value: 'scotia_chequing', label: 'SC' },
                  { value: 'scotia_visa', label: 'SV' },
                ] as { value: SourceFile; label: string }[]).map((option) => {
                  const isSelected = selectedSource === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedSource(option.value)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded transition-all border',
                        isSelected
                          ? 'bg-primary/10 text-primary border-primary font-medium'
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  'Adding...'
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

