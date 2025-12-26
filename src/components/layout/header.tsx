'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MonthYearPicker } from '@/components/shared/month-year-picker';
import { Button } from '@/components/ui/button';
import { testSupabaseConnection, ConnectionTestResult } from '@/lib/supabase';
import { Database, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Dashboard', description: 'Your financial overview' },
  '/transactions': { title: 'Transactions', description: 'View and manage your expenses' },
  '/categories': { title: 'Categories', description: 'Organize your spending categories' },
  '/categorize': { title: 'Categorize', description: 'Quickly categorize your transactions' },
  '/archived': { title: 'Archived', description: 'View archived transactions' },
  '/suggestions': { title: 'Smart Rules', description: 'Auto-categorization rules' },
  '/upload': { title: 'Upload', description: 'Import bank statements' },
};

interface HeaderProps {
  month: number;
  year: number;
  onMonthYearChange: (month: number, year: number) => void;
  showMonthPicker?: boolean;
}

export function Header({ month, year, onMonthYearChange, showMonthPicker = true }: HeaderProps) {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] || { title: 'Page', description: '' };
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setShowResult(true);
    
    try {
      const result = await testSupabaseConnection();
      setConnectionResult(result);
    } catch (error: any) {
      setConnectionResult({
        success: false,
        message: 'Test failed',
        details: {
          configured: false,
          url: '(unknown)',
          error: error.message || 'Unknown error'
        }
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/80 backdrop-blur-md px-6">
      <div className="flex h-16 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{pageInfo.title}</h1>
          <p className="text-sm text-muted-foreground">{pageInfo.description}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className={cn(
              'gap-2 transition-colors',
              connectionResult?.success && 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
              connectionResult && !connectionResult.success && 'border-red-300 text-red-700 hover:bg-red-50'
            )}
          >
            {isTestingConnection ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : connectionResult?.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : connectionResult && !connectionResult.success ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isTestingConnection 
                ? 'Testing...' 
                : connectionResult?.success 
                  ? 'Connected' 
                  : connectionResult 
                    ? 'Error' 
                    : 'Check DB'}
            </span>
          </Button>

          {showMonthPicker && (
            <MonthYearPicker
              month={month}
              year={year}
              onChange={onMonthYearChange}
            />
          )}
        </div>
      </div>
      
      {/* Connection Result Panel */}
      {showResult && connectionResult && (
        <div className={cn(
          'mb-3 px-4 py-3 rounded-lg border text-sm animate-in slide-in-from-top-2',
          connectionResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2">
              {connectionResult.success ? (
                <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-medium">{connectionResult.message}</p>
                {connectionResult.details && (
                  <div className="space-y-1">
                    {connectionResult.details.error && (
                      <p className="font-mono text-xs bg-white/50 px-2 py-1 rounded inline-block">
                        {connectionResult.details.error}
                      </p>
                    )}
                    {connectionResult.details.tablesFound && (
                      <p className="text-xs">
                        Tables: {connectionResult.details.tablesFound.join(', ')}
                      </p>
                    )}
                    {!connectionResult.success && (
                      <p className="text-xs mt-1">
                        <strong>Tip:</strong> Add <code className="bg-white/50 px-1 rounded">.env.local</code> with{' '}
                        <code className="bg-white/50 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                        <code className="bg-white/50 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResult(false)}
              className="h-6 w-6 p-0 hover:bg-white/50"
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

