'use client';

import { FILTERS } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function FilterPanel() {
  const { activeFilter, setActiveFilter } = useAppStore();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filters</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              'relative flex flex-col items-center gap-1.5 rounded-xl p-2 min-w-[72px] transition-all',
              activeFilter === filter.id
                ? 'bg-primary/10 ring-2 ring-primary'
                : 'bg-muted/50 hover:bg-muted'
            )}
          >
            <div className="h-12 w-12 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-100 to-amber-50 dark:from-emerald-900/30 dark:to-amber-900/20">
              <div
                className="h-full w-full bg-gradient-to-br from-emerald-400/40 to-amber-400/30"
                style={{ filter: filter.cssFilter === 'none' ? undefined : filter.cssFilter }}
              />
            </div>
            <span className="text-[10px] font-medium text-foreground whitespace-nowrap">
              {filter.label}
            </span>
            {activeFilter === filter.id && (
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
