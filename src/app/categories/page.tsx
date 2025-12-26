'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Category, 
  CategoryType, 
  CATEGORY_TYPE_INFO 
} from '@/lib/types';
import { 
  getCategories, 
  createCategory, 
  updateCategory,
  deleteCategory 
} from '@/lib/database';
import { isSupabaseConfigured } from '@/lib/supabase';
import { pageRefresh } from '@/lib/events';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FolderOpen,
  Check,
  X
} from 'lucide-react';

// Demo categories
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('FIXED');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to sidebar navigation clicks for this page
  useEffect(() => {
    const unsubscribe = pageRefresh.subscribe('/categories', loadData);
    return unsubscribe;
  }, [loadData]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    if (isDemo) {
      const newCat: Category = {
        id: Date.now().toString(),
        name: newCategoryName.trim(),
        type: newCategoryType,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCategories([...categories, newCat]);
      setNewCategoryName('');
      setIsAddDialogOpen(false);
      toast.success('Subcategory added (demo mode)');
      return;
    }

    try {
      await createCategory({ name: newCategoryName.trim(), type: newCategoryType });
      await loadData();
      setNewCategoryName('');
      setIsAddDialogOpen(false);
      toast.success('Subcategory created');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create subcategory');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editName.trim()) return;

    if (isDemo) {
      setCategories(categories.map(c => c.id === id ? { ...c, name: editName.trim() } : c));
      setEditingId(null);
      toast.success('Subcategory updated (demo mode)');
      return;
    }

    try {
      await updateCategory(id, { name: editName.trim() });
      await loadData();
      setEditingId(null);
      toast.success('Subcategory updated');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update subcategory');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (isDemo) {
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Subcategory deleted (demo mode)');
      return;
    }

    try {
      await deleteCategory(id);
      await loadData();
      toast.success('Subcategory deleted');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete subcategory');
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const getCategoriesByType = (type: CategoryType) => {
    return categories.filter(c => c.type === type);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-6 animate-pulse">
        <div className="h-96 bg-muted rounded-lg" />
        <div className="h-96 bg-muted rounded-lg" />
        <div className="h-96 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Manage Subcategories</h2>
          <p className="text-sm text-muted-foreground">
            Organize your spending into Fixed, Fun, and Future You subcategories
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcategory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subcategory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subcategory Name</label>
                <Input
                  placeholder="e.g., Groceries, Netflix, RRSP"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Major Category</label>
                <Select
                  value={newCategoryType}
                  onValueChange={(v) => setNewCategoryType(v as CategoryType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
                      const info = CATEGORY_TYPE_INFO[type];
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={cn('text-xs', info.bgColor, info.color)}>
                              {info.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{info.description}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleAddCategory} className="flex-1">
                  Add Subcategory
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Columns */}
      <div className="grid grid-cols-3 gap-6">
        {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
          const info = CATEGORY_TYPE_INFO[type];
          const typeCategories = getCategoriesByType(type);

          return (
            <Card key={type} className={cn('shadow-apple', info.bgColor.replace('bg-', 'border-l-4 border-'))}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className={cn('h-5 w-5', info.color)} />
                  <span className={info.color}>{info.label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {typeCategories.length}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {typeCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/60 group"
                    >
                      {editingId === category.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleUpdateCategory(category.id)}
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
                        <>
                          <span className="text-sm font-medium">{category.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => startEditing(category)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {typeCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No subcategories yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

