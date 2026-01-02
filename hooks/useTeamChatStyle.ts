'use client';

import { useCallback, useEffect, useState } from 'react';

export type TeamChatStyle = 'my' | 'team';

const STORAGE_KEY = 'teamChatStyle';

export function useTeamChatStyle(teamId?: string | null) {
  const [selection, setSelectionState] = useState<TeamChatStyle>('my');

  useEffect(() => {
    if (!teamId || typeof window === 'undefined') {
      setSelectionState('my');
      return;
    }

    const stored = window.localStorage.getItem(`${STORAGE_KEY}:${teamId}`);
    if (stored === 'team' || stored === 'my') {
      setSelectionState(stored);
      return;
    }
    setSelectionState('my');
  }, [teamId]);

  const setSelection = useCallback(
    (next: TeamChatStyle) => {
      setSelectionState((prev) => {
        if (prev === next) {
          return prev;
        }
        return next;
      });

      if (!teamId || typeof window === 'undefined') {
        return;
      }
      window.localStorage.setItem(`${STORAGE_KEY}:${teamId}`, next);
    },
    [teamId]
  );

  return { selection, setSelection };
}

export { STORAGE_KEY as TEAM_CHAT_STYLE_STORAGE_KEY };
