'use client';

import { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import TeamChatCardPreview from './TeamChatCardPreview';
import type { TeamIdentityContext, TeamThemeTokens } from '@/types/teams';
import { Button } from '@/components/ui';

interface TeamChatStyleSheetProps {
  isOpen: boolean;
  team?: TeamIdentityContext | null;
  selection: 'my' | 'team';
  onSelect: (style: 'my' | 'team') => void;
  onClose: () => void;
  myStyleTheme: TeamThemeTokens;
  teamTheme: TeamThemeTokens | null;
}

const focusableSelector = '[data-focusable="true"]';

export default function TeamChatStyleSheet({
  isOpen,
  team,
  selection,
  onSelect,
  onClose,
  myStyleTheme,
  teamTheme,
}: TeamChatStyleSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const focusables = useRef<HTMLElement[]>([]);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    lastFocused.current = document.activeElement as HTMLElement | null;

    const node = sheetRef.current;
    focusables.current = node
      ? Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
      : [];

    if (focusables.current.length > 0) {
      focusables.current[0].focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && focusables.current.length > 0) {
        const currentIndex = focusables.current.findIndex((el) => el === document.activeElement);
        let nextIndex = currentIndex;
        if (event.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusables.current.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex === focusables.current.length - 1 ? 0 : currentIndex + 1;
        }
        event.preventDefault();
        focusables.current[nextIndex].focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      focusables.current = [];
      if (lastFocused.current) {
        lastFocused.current.focus();
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const node = sheetRef.current;
    focusables.current = node
      ? Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
      : [];
  }, [isOpen, selection]);

  const teamUnavailableHelp = useMemo(() => {
    if (teamTheme) {
      return null;
    }
    if (!team) {
      return 'Team style requires a team context.';
    }
    return 'Team style not available';
  }, [team, teamTheme]);

  if (!isOpen || !team) {
    return null;
  }

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const disableTeamStyle = !teamTheme;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Choose chat card style"
    >
      <div
        ref={sheetRef}
        className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#05070d]/95 px-5 pb-8 pt-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
            {team.iconUrl ? (
              <Image
                src={team.iconUrl}
                alt={team.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-white/30"
              />
            ) : (
              <span className="text-xs font-semibold text-white/70 uppercase">{team.tag}</span>
            )}
          </div>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Team live</p>
            <h2 className="text-lg font-semibold text-white">{team.name}</h2>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Button
            type="button"
            variant="ghost"
            className={clsx(
              'w-full flex-col items-stretch rounded-3xl border p-1 text-left',
              selection === 'my'
                ? 'border-white/40 bg-white/10 shadow-lg'
                : 'border-white/10 bg-white/5'
            )}
            onClick={() => onSelect('my')}
            data-focusable="true"
          >
            <TeamChatCardPreview theme={myStyleTheme} applied={selection === 'my'} label="My style" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            className={clsx(
              'w-full flex-col items-stretch rounded-3xl border p-1 text-left',
              selection === 'team'
                ? 'border-white/40 bg-white/10 shadow-lg'
                : 'border-white/10 bg-white/5',
              disableTeamStyle && 'cursor-not-allowed opacity-70'
            )}
            onClick={() => {
              if (disableTeamStyle) return;
              onSelect('team');
            }}
            disabled={disableTeamStyle}
            aria-disabled={disableTeamStyle}
            data-focusable="true"
          >
            <TeamChatCardPreview
              theme={teamTheme ?? myStyleTheme}
              applied={selection === 'team'}
              label="Team style"
              disabled={disableTeamStyle}
            />
          </Button>

          {teamUnavailableHelp && (
            <p className="text-sm text-white/60">{teamUnavailableHelp}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Selection</p>
            <p className="text-sm font-semibold text-white">
              {selection === 'team' ? 'Team card applied' : 'Using personal style'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-full border-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:border-white/40 hover:bg-white/10"
            data-focusable="true"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
