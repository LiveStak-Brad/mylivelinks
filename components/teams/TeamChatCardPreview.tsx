'use client';

import clsx from 'clsx';
import type { TeamThemeTokens } from '@/types/teams';

interface TeamChatCardPreviewProps {
  theme: TeamThemeTokens;
  applied: boolean;
  label: string;
  disabled?: boolean;
}

const TEXT_CLASSES = {
  regular: { username: 'text-red-400', body: 'text-white' },
  gift: { username: 'text-yellow-200', body: 'text-yellow-200' },
  follow: { username: 'text-emerald-300', body: 'text-emerald-300' },
} as const;

export default function TeamChatCardPreview({
  theme,
  applied,
  label,
  disabled = false,
}: TeamChatCardPreviewProps) {
  const bubbleStyle = {
    background: `linear-gradient(140deg, ${theme.primary} 0%, ${theme.accent} 100%)`,
    fontFamily: theme.fontFamily,
  };

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition',
        disabled
          ? 'border-white/5 bg-white/5 text-white/40'
          : 'border-white/15 bg-white/5 text-white/80 hover:border-white/30'
      )}
    >
      {applied && !disabled && (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
          Applied
        </span>
      )}

      <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">{label}</p>

      <div className="space-y-2">
        <div
          className={clsx(
            'w-fit max-w-full rounded-2xl px-3 py-2 shadow-lg',
            disabled ? 'bg-black/30 border border-white/10' : 'border border-white/20'
          )}
          style={disabled ? undefined : bubbleStyle}
        >
          <p
            className={clsx('text-xs font-semibold', TEXT_CLASSES.regular.username)}
            style={{ fontFamily: theme.fontFamily }}
          >
            ScarletFox
          </p>
          <p
            className={clsx('text-sm', TEXT_CLASSES.regular.body)}
            style={{ fontFamily: theme.fontFamily }}
          >
            Team spirit check! 🔥
          </p>
        </div>

        <div
          className={clsx(
            'w-fit max-w-full rounded-2xl px-3 py-2 border border-white/10 bg-black/40 shadow-lg'
          )}
          style={{ fontFamily: theme.fontFamily }}
        >
          <p className={clsx('text-xs font-semibold', TEXT_CLASSES.gift.username)}>
            Gift Drop
          </p>
          <p className={clsx('text-sm font-semibold uppercase tracking-wide', TEXT_CLASSES.gift.body)}>
            sent a Firestorm gift!
          </p>
        </div>

        <div
          className="w-fit max-w-full rounded-2xl px-3 py-2 border border-white/10 bg-black/30 shadow-md"
          style={{ fontFamily: theme.fontFamily }}
        >
          <p className={clsx('text-xs font-semibold', TEXT_CLASSES.follow.username)}>
            Follow Pulse
          </p>
          <p className={clsx('text-sm font-semibold uppercase tracking-wide', TEXT_CLASSES.follow.body)}>
            just followed the team!
          </p>
        </div>
      </div>

      {theme.emoteSet && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
          Emote set: {theme.emoteSet}
        </div>
      )}
    </div>
  );
}
