/** * Link Module - Auto-Link Swipe Experience (F4F Only)
 * Shows only users with auto_link_on_follow enabled
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LinkProfile, LinkDecisionResult } from '@/lib/link/api';
import * as linkApi from '@/lib/link/api';
import { SwipeCard } from '@/components/link/SwipeCard';
import { ProfileInfoModal } from '@/components/link/ProfileInfoModal';
import { ConnectionModal } from '@/components/link/ConnectionModal';

export default function AutoLinkSwipePage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<LinkProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [mutualModalOpen, setMutualModalOpen] = useState(false);
  const [currentMutual, setCurrentMutual] = useState<LinkProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await linkApi.getAutoLinkCandidates(20, currentIndex);
      setCandidates((prev) => [...prev, ...data]);
    } catch (err) {
      console.error('Failed to load auto-link candidates:', err);
      setError('Failed to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (submitting || currentIndex >= candidates.length) return;
    
    setSubmitting(true);
    const candidate = candidates[currentIndex];
    const decision = direction === 'right' ? 'link' : 'nah';
    
    setCurrentIndex((prev) => prev + 1);
    
    if (currentIndex >= candidates.length - 3) {
      loadCandidates();
    }
    
    try {
      const result: LinkDecisionResult = await linkApi.submitLinkDecision(
        candidate.profile_id,
        decision
      );

      if (result.mutual) {
        setCurrentMutual(candidate);
        setMutualModalOpen(true);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('[AUTO-LINK SWIPE] Failed to submit decision:', err);
      setError(`Failed to submit: ${err?.message || 'Unknown error'}`);
      setCurrentIndex((prev) => prev - 1);
    } finally {
      setSubmitting(false);
    }
  };

  const currentCandidate = candidates[currentIndex];
  const hasMore = currentIndex < candidates.length;

  if (loading && candidates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-emerald-900/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Auto-Link users...</p>
        </div>
      </div>
    );
  }

  if (error && candidates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-emerald-900/10 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Error Loading Profiles</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setCandidates([]);
              loadCandidates();
            }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-emerald-900/10">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/link')}
            className="p-3 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Auto-Link Swipe
            </h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">F4F users only</p>
          </div>

          <button
            onClick={() => router.push('/link/settings')}
            className="p-3 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="relative" style={{ height: 'calc(100vh - 250px)', minHeight: '550px' }}>
          {!hasMore ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-8">
                  <svg className="w-16 h-16 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4">No More Auto-Link Users</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  Check back later for new F4F connections!
                </p>
                <button
                  onClick={() => router.push('/link/mutuals')}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                >
                  View Mutuals
                </button>
              </div>
            </div>
          ) : (
            <>
              {candidates.slice(currentIndex, currentIndex + 3).map((candidate, idx) => {
                const offset = idx * 12;
                const scale = 1 - idx * 0.05;
                const opacity = 1 - idx * 0.3;

                return (
                  <SwipeCard
                    key={candidate.profile_id}
                    displayName={candidate.display_name || candidate.username || 'Unknown'}
                    username={candidate.username}
                    bio={candidate.bio || 'No bio yet'}
                    photos={candidate.photos || []}
                    location={candidate.location_text}
                    tags={candidate.tags}
                    onSwipe={idx === 0 ? handleSwipe : () => {}}
                    onShowInfo={idx === 0 ? () => setInfoModalOpen(true) : () => {}}
                    style={{
                      transform: `translateY(${offset}px) scale(${scale})`,
                      opacity,
                      zIndex: 10 - idx,
                      pointerEvents: idx === 0 ? 'auto' : 'none',
                    }}
                    primaryActionLabel="Link"
                    secondaryActionLabel="Nah"
                  />
                );
              })}
            </>
          )}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              {currentIndex + 1} of {candidates.length}
            </p>
          </div>
        )}
      </div>

      {currentCandidate && (
        <ProfileInfoModal
          open={infoModalOpen}
          onClose={() => setInfoModalOpen(false)}
          displayName={currentCandidate.display_name || currentCandidate.username || 'Unknown'}
          username={currentCandidate.username}
          bio={currentCandidate.bio || 'No bio yet'}
          photos={currentCandidate.photos || []}
          location={currentCandidate.location_text}
          tags={currentCandidate.tags}
        />
      )}

      {currentMutual && (
        <ConnectionModal
          open={mutualModalOpen}
          onClose={() => setMutualModalOpen(false)}
          displayName={currentMutual.display_name || currentMutual.username || 'Unknown'}
          username={currentMutual.username}
          avatarUrl={currentMutual.avatar_url || (currentMutual.photos && currentMutual.photos[0]) || ''}
          tags={currentMutual.tags}
          type="mutual"
          onKeepGoing={() => {
            setMutualModalOpen(false);
            setCurrentMutual(null);
          }}
        />
      )}
    </div>
  );
}
