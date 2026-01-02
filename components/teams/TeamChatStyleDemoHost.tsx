'use client';

import { useMemo, useState } from 'react';
import TeamLiveChatSurface from './TeamLiveChatSurface';
import type { TeamIdentityContext } from '@/types/teams';
import type { TeamChatStyle } from '@/hooks/useTeamChatStyle';
import { getMockTeamTheme } from '@/lib/teams/themeMocks';
import { Button } from '@/components/ui';

const TEAM_SAMPLES: TeamIdentityContext[] = [
  {
    id: 'team_demo_001',
    name: 'Neon Knights',
    tag: 'NEON',
    iconUrl: '/icon.png',
    theme: getMockTeamTheme('team_demo_001'),
  },
  {
    id: 'team_demo_002',
    name: 'Golden Hour',
    tag: 'GOLD',
    iconUrl: '/mylivelinksmeta.png',
    theme: getMockTeamTheme('team_demo_002'),
  },
  {
    id: 'team_demo_missing',
    name: 'Ghost Draft',
    tag: 'DRAFT',
    iconUrl: '/no-profile-pic.png',
    theme: null,
  },
];

export default function TeamChatStyleDemoHost() {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(TEAM_SAMPLES[0].id);
  const [log, setLog] = useState<Array<{ teamId: string; selection: TeamChatStyle; timestamp: number }>>([]);

  const activeTeam = useMemo(() => {
    if (!activeTeamId) {
      return undefined;
    }
    return TEAM_SAMPLES.find((team) => team.id === activeTeamId);
  }, [activeTeamId]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-white/70 mb-2">Team context</p>
        <div className="flex flex-wrap gap-2">
          {TEAM_SAMPLES.map((team) => (
            <Button
              key={team.id}
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setActiveTeamId(team.id)}
              className={`rounded-full px-4 py-1.5 ${
                activeTeamId === team.id
                  ? 'border-white bg-white/90 text-black'
                  : 'border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/15'
              }`}
            >
              {team.tag}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setActiveTeamId(null)}
            className={`rounded-full px-4 py-1.5 ${
              activeTeamId === null
                ? 'border-white bg-white/90 text-black'
                : 'border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/15'
            }`}
          >
            No team context
          </Button>
        </div>
      </div>

      <TeamLiveChatSurface
        team={activeTeam}
        onStyleChange={(teamId, selection) => {
          setLog((prev) => [{ teamId, selection, timestamp: Date.now() }, ...prev].slice(0, 4));
        }}
      />

      <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">Style change log</p>
        {log.length === 0 ? (
          <p className="text-sm text-white/60">No selection changes yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-white/80">
            {log.map((entry) => (
              <li key={entry.timestamp} className="flex justify-between text-xs">
                <span>{entry.teamId}</span>
                <span className="font-semibold uppercase">{entry.selection}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
