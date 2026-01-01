'use client';

import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { ReactionType } from '@/hooks/useFeedLikes';

export type { ReactionType } from '@/hooks/useFeedLikes';

export interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
}

export const REACTIONS: ReactionConfig[] = [
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
];

interface ReactionPickerProps {
  anchorRect: DOMRect;
  selectedReaction?: ReactionType | null;
  onSelect: (reaction: ReactionType) => void;
  onClose: () => void;
}

/**
 * Floating reaction picker used on long-press / hover interactions.
 * Renders a simple emoji bar with keyboard escape handling.
 */
export function ReactionPicker({ anchorRect, selectedReaction = null, onSelect, onClose }: ReactionPickerProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const pickerStyle = useMemo<CSSProperties>(() => {
    const horizontalCenter = anchorRect.left + anchorRect.width / 2;
    const top = Math.max(16, anchorRect.top - 64);
    const left = Math.max(16, horizontalCenter - 180);
    return { top, left };
  }, [anchorRect]);

  return (
    <div className="fixed inset-0 z-[9998]" onClick={onClose}>
      <div
        className="absolute flex gap-1 px-2 py-2 rounded-full bg-background shadow-xl border border-border"
        style={pickerStyle}
        role="listbox"
        aria-label="Pick a reaction"
        onClick={(event) => event.stopPropagation()}
      >
        {REACTIONS.map((reaction) => {
          const isActive = selectedReaction === reaction.type;
          return (
            <button
              key={reaction.type}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => onSelect(reaction.type)}
              className={`
                w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-transform
                hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                ${isActive ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/40'}
              `}
            >
              <span aria-hidden="true">{reaction.emoji}</span>
              <span className="sr-only">{reaction.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
