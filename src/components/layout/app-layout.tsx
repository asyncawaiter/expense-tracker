'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Toaster } from '@/components/ui/sonner';

interface AppLayoutProps {
  children: React.ReactNode;
  showMonthPicker?: boolean;
}

export function AppLayout({ children, showMonthPicker = true }: AppLayoutProps) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Store month/year in localStorage for persistence
  useEffect(() => {
    const stored = localStorage.getItem('expense-tracker-period');
    if (stored) {
      const { month: m, year: y } = JSON.parse(stored);
      setMonth(m);
      setYear(y);
    }
  }, []);

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    localStorage.setItem('expense-tracker-period', JSON.stringify({ month: newMonth, year: newYear }));
    
    // Dispatch custom event so pages can react to period changes
    window.dispatchEvent(new CustomEvent('periodChange', { 
      detail: { month: newMonth, year: newYear } 
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="pl-64">
        <Header
          month={month}
          year={year}
          onMonthYearChange={handleMonthYearChange}
          showMonthPicker={showMonthPicker}
        />
        
        <main className="p-6">
          {children}
        </main>
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}

// Custom hook to get current period
export function usePeriod() {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('expense-tracker-period');
    if (stored) {
      setPeriod(JSON.parse(stored));
    }

    // Listen for period changes
    const handlePeriodChange = (e: CustomEvent<{ month: number; year: number }>) => {
      setPeriod(e.detail);
    };

    window.addEventListener('periodChange', handlePeriodChange as EventListener);
    return () => {
      window.removeEventListener('periodChange', handlePeriodChange as EventListener);
    };
  }, []);

  return period;
}

