'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Gift, Smile } from 'lucide-react';
import clsx from 'clsx';
import TeamBadge from './TeamBadge';
import TeamChatStyleTrigger from './TeamChatStyleTrigger';
import TeamChatStyleSheet from './TeamChatStyleSheet';
import { useTeamChatStyle } from '@/hooks/useTeamChatStyle';
import type { TeamChatStyle } from '@/hooks/useTeamChatStyle';
import type { TeamIdentityContext, TeamThemeTokens } from '@/types/teams';
import { getMockTeamTheme } from '@/lib/teams/themeMocks';
import { IconButton, Input } from '@/components/ui';

interface TeamLiveChatSurfaceProps {
  team?: TeamIdentityContext | null;
  onStyleChange?: (teamId: string, selection: TeamChatStyle) => void;
  sampleMessages?: TeamMessagePreview[];
}

interface TeamMessagePreview {
  id: string;
  type: 'regular' | 'gift' | 'follow';
  username: string;
  body: string;
  timestamp?: string;
}

const DEFAULT_MESSAGES: TeamMessagePreview[] = [
  { id: '1', type: 'regular', username: 'ScarletFox', body: 'Squad check-in! 🔥' },
  { id: '2', type: 'gift', username: 'GemmaGifted', body: 'sent a Meteor Shower gift' },
  { id: '3', type: 'follow', username: 'NewFan88', body: 'just followed the team' },
  { id: '4', type: 'regular', username: 'CaptainNova', body: 'Rotate to the right lane!' },
];

const TEXT_CLASS_MAP = {
  regular: { username: 'text-red-400', body: 'text-white' },
  gift: { username: 'text-yellow-200', body: 'text-yellow-200' },
  follow: { username: 'text-emerald-300', body: 'text-emerald-300' },
} as const;

const MY_STYLE_THEME: TeamThemeTokens = {
  primary: 'rgb(17 24 39)',
  accent: 'rgb(31 41 55)',
  fontFamily: '"Outfit", "Inter", sans-serif',
  emoteSet: 'default',
};

export default function TeamLiveChatSurface({
  team,
  onStyleChange,
  sampleMessages = DEFAULT_MESSAGES,
}: TeamLiveChatSurfaceProps) {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { selection, setSelection } = useTeamChatStyle(team?.id);

  useEffect(() => {
    if (!team) {
      setSheetOpen(false);
    }
  }, [team]);

  const teamTheme = useMemo(
    () => getMockTeamTheme(team?.id, team?.theme ?? null),
    [team]
  );

  const handleSelect = (next: TeamChatStyle) => {
    setSelection(next);
    if (team?.id) {
      onStyleChange?.(team.id, next);
    }
  };

  const teamStyleEnabled = Boolean(team && teamTheme);

  const appliedFont = selection === 'team' && teamTheme ? teamTheme.fontFamily : MY_STYLE_THEME.fontFamily;
  const appliedBubbleStyle =
    selection === 'team' && teamTheme
      ? {
          background: `linear-gradient(140deg, ${teamTheme.primary} 0%, ${teamTheme.accent} 100%)`,
          borderColor: teamTheme.accent,
        }
      : undefined;

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          {team && <TeamBadge team={team} />}
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Team live room</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Viewers</p>
          <p className="text-xl font-semibold text-white">2.4K</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-col gap-2 overflow-y-auto pr-2">
          {sampleMessages.map((msg) => {
            const textClasses = TEXT_CLASS_MAP[msg.type];
            const baseBubbleClasses =
              'inline-flex max-w-[90%] flex-col gap-1 self-start rounded-2xl border px-4 py-2 shadow-lg transition';
            return (
              <div key={msg.id} className="flex flex-col">
                <div
                  className={clsx(
                    baseBubbleClasses,
                    selection === 'team' && teamTheme ? 'bg-transparent' : 'bg-black/40 border-white/10'
                  )}
                  style={{
                    fontFamily: appliedFont,
                    ...(selection === 'team' && teamTheme ? appliedBubbleStyle : {}),
                  }}
                >
                  <span
                    className={clsx('text-xs font-semibold leading-tight', textClasses.username)}
                  >
                    {msg.username}
                  </span>
                  <span
                    className={clsx(
                      'text-sm leading-snug',
                      msg.type === 'regular' ? 'font-normal' : 'font-semibold uppercase tracking-wide',
                      textClasses.body
                    )}
                  >
                    {msg.body}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Input
          placeholder={team ? `Chat with ${team.tag}` : 'Chat is team-locked'}
          disabled={!team}
          inputSize="lg"
          className="rounded-full border-white/20 bg-white/5 text-white placeholder-white/40 focus:border-white/60 focus:ring-white/30"
        />
        <div className="flex items-center justify-end gap-2">
          <IconButton
            aria-label="Open emotes"
            variant="outline"
            className="rounded-full border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
          >
            <Smile />
          </IconButton>
          <IconButton
            aria-label="Send gift"
            variant="outline"
            className="rounded-full border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
          >
            <Gift />
          </IconButton>
          {team && (
            <TeamChatStyleTrigger
              teamId={team.id}
              currentSelection={selection}
              onOpen={() => setSheetOpen(true)}
              disabled={!teamStyleEnabled}
            />
          )}
        </div>
        {team && !teamStyleEnabled && (
          <p className="text-right text-xs text-white/50">Team style not available for this team.</p>
        )}
      </div>

      {team && (
        <TeamChatStyleSheet
          isOpen={isSheetOpen}
          team={team}
          selection={selection}
          onSelect={handleSelect}
          onClose={() => setSheetOpen(false)}
          myStyleTheme={MY_STYLE_THEME}
          teamTheme={teamTheme}
        />
      )}
    </div>
  );
}
