'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { pageRefresh } from '@/lib/events';
import {
  LayoutDashboard,
  Receipt,
  FolderOpen,
  Tags,
  Archive,
  Sparkles,
  Upload,
  ArrowDownToLine,
  Wallet,
  Settings,
  Plus,
} from 'lucide-react';

// Grouped navigation sections
const navigationSections = [
  {
    title: 'Import',
    icon: ArrowDownToLine,
    items: [
      { name: 'Upload', href: '/upload', icon: Upload },
      { name: 'Categorize', href: '/categorize', icon: Tags },
    ],
  },
  {
    title: 'Expenses',
    icon: Wallet,
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Transactions', href: '/transactions', icon: Receipt },
      { name: 'Add Expense', href: '/add-expense', icon: Plus },
    ],
  },
  {
    title: 'Manage',
    icon: Settings,
    items: [
      { name: 'Subcategories', href: '/categories', icon: FolderOpen },
      { name: 'Smart Rules', href: '/suggestions', icon: Sparkles },
      { name: 'Archived', href: '/archived', icon: Archive },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-white">$</span>
        </div>
        <span className="text-lg font-semibold text-foreground">Expenses</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-4 p-4">
        {navigationSections.map((section) => (
          <div key={section.title}>
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
              <section.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.title}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      pageRefresh.emit(item.href);
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', isActive ? 'text-primary' : '')} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p>Expense Tracker v2</p>
          <p className="mt-1">All data stored locally</p>
        </div>
      </div>
    </aside>
  );
}

