'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CategoryType, Category, CATEGORY_TYPE_INFO } from '@/lib/types';
import { getCategories, getCategoriesByType } from '@/lib/database';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';

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

interface CategorySelectorProps {
  selectedType?: CategoryType;
  selectedCategoryId?: string;
  onTypeChange: (type: CategoryType) => void;
  onCategoryChange: (categoryId: string | null, category?: Category) => void;
  showTypeFirst?: boolean;
  compact?: boolean;
}

export function CategorySelector({
  selectedType,
  selectedCategoryId,
  onTypeChange,
  onCategoryChange,
  showTypeFirst = true,
  compact = false,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedType) {
      setFilteredCategories(categories.filter(c => c.type === selectedType));
    } else {
      setFilteredCategories(categories);
    }
  }, [selectedType, categories]);

  const loadCategories = async () => {
    if (!isSupabaseConfigured()) {
      setCategories(DEMO_CATEGORIES);
      setIsLoading(false);
      return;
    }

    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(DEMO_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    onTypeChange(type as CategoryType);
    onCategoryChange(null); // Reset category when type changes
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    onCategoryChange(categoryId, category);
    
    // Auto-select type if not already selected
    if (category && !selectedType) {
      onTypeChange(category.type);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Type Badge Buttons */}
        <div className="flex gap-1">
          {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
            const info = CATEGORY_TYPE_INFO[type];
            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={cn(
                  'px-2 py-1 text-xs rounded-md transition-all',
                  selectedType === type
                    ? cn(info.bgColor, info.color, 'font-medium')
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {info.label}
              </button>
            );
          })}
        </div>

        {/* Category Select */}
        <Select
          value={selectedCategoryId || undefined}
          onValueChange={handleCategoryChange}
          disabled={!selectedType || isLoading}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder={selectedType ? 'Category' : 'Select type first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {filteredCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTypeFirst && (
        <div>
          <label className="text-sm font-medium mb-2 block">Category Type</label>
          <div className="flex gap-2">
            {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
              const info = CATEGORY_TYPE_INFO[type];
              return (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-lg border-2 transition-all',
                    selectedType === type
                      ? cn('border-current', info.color, info.bgColor)
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium',
                    selectedType === type ? info.color : 'text-foreground'
                  )}>
                    {info.label}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {info.description.split(' ').slice(0, 3).join(' ')}...
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-2 block">Category</label>
        <Select
          value={selectedCategoryId || undefined}
          onValueChange={handleCategoryChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No specific category</SelectItem>
            {(selectedType ? filteredCategories : categories).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'text-xs',
                      CATEGORY_TYPE_INFO[cat.type].bgColor,
                      CATEGORY_TYPE_INFO[cat.type].color
                    )}
                  >
                    {CATEGORY_TYPE_INFO[cat.type].label}
                  </Badge>
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

