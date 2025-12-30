'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LiveTVQuickFiltersRowProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

export function LiveTVQuickFiltersRow({ options, selected, onSelect }: LiveTVQuickFiltersRowProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide pb-2 sm:pb-4 px-3 sm:px-4 border-b border-border/50 bg-gradient-to-b from-background/50 to-transparent">
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-max">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            aria-pressed={selected === option}
            aria-label={`Filter by ${option}`}
            className={cn(
              'px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all duration-300 whitespace-nowrap relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              selected === option
                ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md sm:shadow-lg shadow-primary/30 scale-105'
                : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 hover:scale-105 border border-border/50'
            )}
          >
            {selected === option && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
            )}
            <span className="relative">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

