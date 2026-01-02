'use client';

import TeamChatStyleDemoHost from '@/components/teams/TeamChatStyleDemoHost';

export default function TeamLiveStyleDemoPage() {
  return (
    <div className="min-h-screen bg-[#020409] text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Team live</p>
          <h1 className="text-3xl font-semibold text-white">Team identity & chat styling demo</h1>
          <p className="text-sm text-white/60">
            UI-only adapter for the upcoming team live surface. Switch between team contexts to verify
            that badges, chat card selection, and styling never leak outside the active team.
          </p>
        </div>
        <TeamChatStyleDemoHost />
      </div>
    </div>
  );
}
