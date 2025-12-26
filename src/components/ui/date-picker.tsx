'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  defaultMonth?: number;
  defaultYear?: number;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  defaultMonth,
  defaultYear,
  placeholder = 'Pick a date',
  className,
}: DatePickerProps) {
  const today = new Date();
  
  // Parse value without timezone issues
  const getValueParts = (val: string | null) => {
    if (!val) return null;
    const [year, month] = val.split('-').map(Number);
    return { year, month };
  };
  
  const valueParts = getValueParts(value);
  const initialMonth = defaultMonth ?? (valueParts ? valueParts.month : today.getMonth() + 1);
  const initialYear = defaultYear ?? (valueParts ? valueParts.year : today.getFullYear());
  
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [viewYear, setViewYear] = useState(initialYear);
  const [isOpen, setIsOpen] = useState(false);

  const calendarData = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  }, [viewMonth, viewYear]);

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setIsOpen(false);
  };

  // Parse date string without timezone conversion
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return { year, month, day };
  };

  const isSelectedDay = (day: number) => {
    if (!value) return false;
    const parsed = parseLocalDate(value);
    return (
      parsed.day === day &&
      parsed.month === viewMonth &&
      parsed.year === viewYear
    );
  };

  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() + 1 === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  const formatDisplayDate = (dateStr: string) => {
    const parsed = parseLocalDate(dateStr);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parsed.month - 1]} ${parsed.day}`;
  };

  const monthYear = new Date(viewYear, viewMonth - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const grid: (number | null)[] = [];
    
    for (let i = 0; i < calendarData.firstDayOfMonth; i++) {
      grid.push(null);
    }
    
    for (let day = 1; day <= calendarData.daysInMonth; day++) {
      grid.push(day);
    }
    
    while (grid.length % 7 !== 0) {
      grid.push(null);
    }
    
    return grid;
  }, [calendarData]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value ? formatDisplayDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{monthYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}

          {/* Days */}
          {calendarGrid.map((day, index) => (
            <div key={index} className="aspect-square">
              {day && (
                <button
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={cn(
                    'w-full h-full rounded-md text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    isSelectedDay(day) && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    isToday(day) && !isSelectedDay(day) && 'bg-accent text-accent-foreground',
                  )}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Clear button */}
        {value && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground"
              onClick={handleClear}
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

