'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LiveTVCategoryTabsProps {
  tabs: string[];
  selected: string;
  onSelect: (tab: string) => void;
}

export function LiveTVCategoryTabs({ tabs, selected, onSelect }: LiveTVCategoryTabsProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide px-4 py-4">
      <div className="flex items-center gap-3 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onSelect(tab)}
            className={cn(
              'px-6 py-3 rounded-2xl text-sm font-black transition-all duration-300 whitespace-nowrap border-2 relative overflow-hidden',
              selected === tab
                ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground border-primary shadow-xl shadow-primary/40 scale-110'
                : 'bg-card/50 text-foreground border-border/50 hover:border-primary/30 hover:scale-105 hover:shadow-lg backdrop-blur-sm'
            )}
          >
            {selected === tab && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 animate-shimmer" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-white/50 rounded-full blur-sm" />
              </>
            )}
            <span className="relative">{tab}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

