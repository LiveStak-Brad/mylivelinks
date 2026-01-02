'use client';

import clsx from 'clsx';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui';

interface TeamChatStyleTriggerProps {
  teamId: string;
  currentSelection: 'my' | 'team';
  onOpen: () => void;
  disabled?: boolean;
}

export default function TeamChatStyleTrigger({
  teamId,
  currentSelection,
  onOpen,
  disabled = false,
}: TeamChatStyleTriggerProps) {
  if (!teamId) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onOpen}
      disabled={disabled}
      className={clsx(
        'min-w-[150px] rounded-full border-white/20 bg-white/10 px-3 py-1.5 text-left shadow-lg backdrop-blur-md !h-auto',
        disabled ? 'cursor-not-allowed border-white/10 text-white/40' : 'hover:bg-white/20 text-white'
      )}
      aria-label="Choose chat card style"
    >
      <span
        className={clsx(
          'inline-flex h-8 w-8 items-center justify-center rounded-full',
          disabled ? 'bg-white/10 text-white/40' : 'bg-gradient-to-br from-white/90 to-white/60 text-black'
        )}
      >
        <Palette className="h-4 w-4" />
      </span>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[11px] uppercase tracking-[0.15em] text-white/60">Chat card</span>
        <span className="text-sm font-semibold text-white">
          {currentSelection === 'team' ? 'Team Style' : 'My Style'}
        </span>
      </div>
    </Button>
  );
}
