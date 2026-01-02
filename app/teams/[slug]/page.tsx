'use client';

import { useParams } from 'next/navigation';
import { TeamProvider, useTeamContext } from '@/contexts/TeamContext';
import TeamPageContent from './TeamPageContent';

/**
 * Teams Dynamic Route
 * 
 * Wraps the team page in the TeamProvider to share state across all panels.
 * Navigation between panels (Home, Feed, Chat, Live, Members, Settings)
 * is handled via the TeamContext without refetching shared data.
 */
export default function TeamPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  if (!slug) {
    return <TeamNotFoundFallback />;
  }
  
  return (
    <TeamProvider teamSlug={slug}>
      <TeamPageContent />
    </TeamProvider>
  );
}

function TeamNotFoundFallback() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Team Not Found</h1>
        <p className="text-white/60">The team you're looking for doesn't exist.</p>
      </div>
    </div>
  );
}
