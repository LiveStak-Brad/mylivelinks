'use client';

import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface LiveTVHorizontalRailProps<T> {
  title: string;
  data: T[];
  loading?: boolean;
  itemWidth?: number;
  keyExtractor: (item: T) => string;
  renderItem: (props: { item: T }) => ReactNode;
  emptyState?: ReactNode;
  onSeeAll?: () => void;
}

export function LiveTVHorizontalRail<T>({
  title,
  data,
  loading,
  itemWidth = 292,
  keyExtractor,
  renderItem,
  emptyState,
  onSeeAll,
}: LiveTVHorizontalRailProps<T>) {
  if (loading) {
    return (
      <div className="py-1 sm:py-1.5">
        <div className="px-3 sm:px-4 md:px-6 mb-2 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">{title}</h2>
        </div>
        <div className="overflow-x-auto scrollbar-hide px-3 sm:px-4 md:px-6">
          <div className="flex gap-2 sm:gap-3 min-w-max">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl sm:rounded-2xl animate-pulse flex-shrink-0"
                style={{ width: 180, height: 220 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="py-1.5">
        <div className="px-4 mb-2 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground tracking-tight">{title}</h2>
        </div>
        <div className="px-4">{emptyState}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="py-1 sm:py-1.5">
      <div className="px-3 sm:px-4 md:px-6 mb-2 flex items-center justify-between group">
        <h2 className="text-base sm:text-lg font-black tracking-tight relative">
          <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">{title}</span>
          <div className="absolute -bottom-0.5 left-0 h-0.5 w-6 sm:w-8 bg-gradient-to-r from-primary via-accent to-primary rounded-full shadow-sm shadow-primary/30" />
        </h2>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-[10px] sm:text-xs font-black text-primary hover:text-primary/80 transition-all flex items-center gap-0.5 sm:gap-1 hover:gap-1.5 group bg-primary/10 hover:bg-primary/20 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg"
          >
            <span>See All</span>
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
      {/* Horizontal scroll on all sizes */}
      <div className="overflow-x-auto scrollbar-hide px-3 sm:px-4 md:px-6 touch-pan-x overscroll-x-contain">
        <div className="flex gap-2 sm:gap-3 min-w-max pb-1">
          {data.map((item) => (
            <div key={keyExtractor(item)} className="animate-fade-in">
              {renderItem({ item })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

