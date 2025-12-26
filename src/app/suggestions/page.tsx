'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  SmartSuggestion, 
  Category,
  CategoryType, 
  MatchType,
  CATEGORY_TYPE_INFO 
} from '@/lib/types';
import { 
  getSmartSuggestions, 
  createSmartSuggestion,
  updateSmartSuggestion,
  deleteSmartSuggestion,
  getCategories
} from '@/lib/database';
import { isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Sparkles,
  Zap
} from 'lucide-react';

// Demo categories
const DEMO_CATEGORIES: Category[] = [
  { id: '1', name: 'Rent', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Groceries', type: 'FIXED', is_active: true, created_at: '', updated_at: '' },
  { id: '7', name: 'Dining Out', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '10', name: 'Subscriptions', type: 'FUN', is_active: true, created_at: '', updated_at: '' },
  { id: '11', name: 'Savings', type: 'FUTURE_YOU', is_active: true, created_at: '', updated_at: '' },
];

// Demo suggestions
const DEMO_SUGGESTIONS: SmartSuggestion[] = [
  { id: '1', name: 'Grocery Stores', keyword: 'METRO', match_type: 'CONTAINS', case_sensitive: false, category_id: '3', major_category_type: 'FIXED', is_income_suggestion: false, is_active: true, priority: 1, created_at: '', updated_at: '', category: DEMO_CATEGORIES[1] },
  { id: '2', name: 'Netflix', keyword: 'NETFLIX', match_type: 'CONTAINS', case_sensitive: false, category_id: '10', major_category_type: 'FUN', is_income_suggestion: false, is_active: true, priority: 1, created_at: '', updated_at: '', category: DEMO_CATEGORIES[3] },
  { id: '3', name: 'Food Delivery', keyword: 'UBER EATS', match_type: 'CONTAINS', case_sensitive: false, category_id: '7', major_category_type: 'FUN', is_income_suggestion: false, is_active: true, priority: 1, created_at: '', updated_at: '', category: DEMO_CATEGORIES[2] },
];

const MATCH_TYPES: { value: MatchType; label: string; description: string }[] = [
  { value: 'CONTAINS', label: 'Contains', description: 'Match if description contains the keyword' },
  { value: 'STARTS_WITH', label: 'Starts with', description: 'Match if description starts with the keyword' },
  { value: 'ENDS_WITH', label: 'Ends with', description: 'Match if description ends with the keyword' },
  { value: 'EXACT_MATCH', label: 'Exact match', description: 'Match if description exactly equals the keyword' },
  { value: 'REGEX', label: 'Regex', description: 'Match using regular expression' },
];

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<SmartSuggestion | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formKeyword, setFormKeyword] = useState('');
  const [formMatchType, setFormMatchType] = useState<MatchType>('CONTAINS');
  const [formCategoryType, setFormCategoryType] = useState<CategoryType>('FIXED');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPriority, setFormPriority] = useState('1');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setSuggestions(DEMO_SUGGESTIONS);
        setCategories(DEMO_CATEGORIES);
        setIsDemo(true);
      } else {
        const [suggestionsData, categoriesData] = await Promise.all([
          getSmartSuggestions(),
          getCategories()
        ]);
        setSuggestions(suggestionsData);
        setCategories(categoriesData);
        setIsDemo(false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setSuggestions(DEMO_SUGGESTIONS);
      setCategories(DEMO_CATEGORIES);
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormName('');
    setFormKeyword('');
    setFormMatchType('CONTAINS');
    setFormCategoryType('FIXED');
    setFormCategoryId('');
    setFormPriority('1');
    setEditingSuggestion(null);
  };

  const openDialog = (suggestion?: SmartSuggestion) => {
    if (suggestion) {
      setEditingSuggestion(suggestion);
      setFormName(suggestion.name);
      setFormKeyword(suggestion.keyword);
      setFormMatchType(suggestion.match_type);
      setFormCategoryType(suggestion.major_category_type);
      setFormCategoryId(suggestion.category_id);
      setFormPriority(suggestion.priority.toString());
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formKeyword.trim() || !formCategoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const data = {
      name: formName.trim(),
      keyword: formKeyword.trim(),
      match_type: formMatchType,
      case_sensitive: false,
      category_id: formCategoryId,
      major_category_type: formCategoryType,
      is_income_suggestion: false,
      is_active: true,
      priority: parseInt(formPriority) || 1
    };

    if (isDemo) {
      if (editingSuggestion) {
        setSuggestions(suggestions.map(s => 
          s.id === editingSuggestion.id 
            ? { ...s, ...data, category: categories.find(c => c.id === formCategoryId) }
            : s
        ));
        toast.success('Rule updated (demo mode)');
      } else {
        const newSuggestion: SmartSuggestion = {
          id: Date.now().toString(),
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: categories.find(c => c.id === formCategoryId)
        };
        setSuggestions([...suggestions, newSuggestion]);
        toast.success('Rule created (demo mode)');
      }
      setIsDialogOpen(false);
      resetForm();
      return;
    }

    try {
      if (editingSuggestion) {
        await updateSmartSuggestion(editingSuggestion.id, data);
        toast.success('Rule updated');
      } else {
        await createSmartSuggestion(data);
        toast.success('Rule created');
      }
      await loadData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving suggestion:', error);
      toast.error('Failed to save rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (isDemo) {
      setSuggestions(suggestions.filter(s => s.id !== id));
      toast.success('Rule deleted (demo mode)');
      return;
    }

    try {
      await deleteSmartSuggestion(id);
      await loadData();
      toast.success('Rule deleted');
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      toast.error('Failed to delete rule');
    }
  };

  const filteredCategories = categories.filter(c => c.type === formCategoryType);

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
      {/* Header */}
      <Card className="shadow-apple">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Smart Suggestion Rules</h2>
                <p className="text-sm text-muted-foreground">
                  Auto-categorize transactions based on description patterns
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingSuggestion ? 'Edit Rule' : 'Create Smart Rule'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Rule Name</Label>
                    <Input
                      placeholder="e.g., Grocery Stores"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Keyword to Match</Label>
                    <Input
                      placeholder="e.g., METRO, UBER EATS"
                      value={formKeyword}
                      onChange={(e) => setFormKeyword(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Match Type</Label>
                    <Select
                      value={formMatchType}
                      onValueChange={(v) => setFormMatchType(v as MatchType)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATCH_TYPES.map((mt) => (
                          <SelectItem key={mt.value} value={mt.value}>
                            {mt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Category Type</Label>
                    <div className="flex gap-2 mt-1">
                      {(['FIXED', 'FUN', 'FUTURE_YOU'] as CategoryType[]).map((type) => {
                        const info = CATEGORY_TYPE_INFO[type];
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              setFormCategoryType(type);
                              setFormCategoryId('');
                            }}
                            className={cn(
                              'flex-1 px-3 py-2 text-sm rounded-lg border transition-all',
                              formCategoryType === type
                                ? cn('border-current', info.color, info.bgColor)
                                : 'border-border hover:border-muted-foreground/50'
                            )}
                          >
                            {info.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select
                      value={formCategoryId}
                      onValueChange={setFormCategoryId}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority (higher = checked first)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} className="flex-1">
                      {editingSuggestion ? 'Update' : 'Create'} Rule
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card className="shadow-apple">
        <CardContent className="p-0">
          {suggestions.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No rules yet</h3>
              <p className="text-muted-foreground mb-4">
                Create rules to automatically categorize transactions.
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Match Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-20">Priority</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((suggestion) => {
                  const typeInfo = CATEGORY_TYPE_INFO[suggestion.major_category_type];
                  return (
                    <TableRow key={suggestion.id}>
                      <TableCell>
                        <span className="font-medium">{suggestion.name}</span>
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm">
                          {suggestion.keyword}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {MATCH_TYPES.find(m => m.value === suggestion.match_type)?.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className={cn('text-xs', typeInfo.bgColor, typeInfo.color)}
                          >
                            {typeInfo.label}
                          </Badge>
                          <span className="text-sm">{suggestion.category?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{suggestion.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openDialog(suggestion)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(suggestion.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

