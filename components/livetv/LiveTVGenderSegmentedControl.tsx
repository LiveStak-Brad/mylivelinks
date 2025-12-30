'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type LiveTVGenderFilter = 'All' | 'Men' | 'Women';

interface LiveTVGenderSegmentedControlProps {
  value: LiveTVGenderFilter;
  onChange: (value: LiveTVGenderFilter) => void;
}

export function LiveTVGenderSegmentedControl({ value, onChange }: LiveTVGenderSegmentedControlProps) {
  const options: LiveTVGenderFilter[] = ['All', 'Men', 'Women'];

  return (
    <div className="px-4 py-4">
      <div className="inline-flex bg-gradient-to-r from-muted/80 to-muted/60 rounded-2xl p-1.5 border border-border/50 shadow-inner">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={cn(
              'px-7 py-2.5 rounded-xl text-sm font-black transition-all duration-300 relative overflow-hidden',
              value === option
                ? 'bg-gradient-to-br from-background to-background/95 text-foreground shadow-lg scale-105'
                : 'text-muted-foreground hover:text-foreground hover:scale-105'
            )}
          >
            {value === option && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
            )}
            <span className="relative">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

