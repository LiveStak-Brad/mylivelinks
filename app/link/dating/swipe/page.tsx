'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DatingProfile, DatingDecisionResult } from '@/lib/link/api';
import * as linkApi from '@/lib/link/api';
import { SwipeCard } from '@/components/link/SwipeCard';
import { ProfileInfoModal } from '@/components/link/ProfileInfoModal';
import { ConnectionModal } from '@/components/link/ConnectionModal';

export default function DatingSwipePage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<DatingProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<DatingProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await linkApi.getDatingCandidates(20, currentIndex);
      setCandidates((prev) => [...prev, ...data]);
    } catch (err) {
      console.error('Failed to load dating candidates:', err);
      setError('Failed to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (submitting || currentIndex >= candidates.length) return;
    
    setSubmitting(true);
    const candidate = candidates[currentIndex];
    const decision = direction === 'right' ? 'like' : 'nah';
    
    setCurrentIndex((prev) => prev + 1);
    
    if (currentIndex >= candidates.length - 3) {
      loadCandidates();
    }
    
    try {
      const result: DatingDecisionResult = await linkApi.submitDatingDecision(
        candidate.profile_id,
        decision
      );

      if (result.match) {
        setCurrentMatch(candidate);
        setMatchModalOpen(true);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Failed to submit dating decision:', err);
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-950 dark:to-pink-900/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (error && candidates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-950 dark:to-pink-900/10 flex items-center justify-center px-4">
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
            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-950 dark:to-pink-900/10">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/link')}
            className="p-3 hover:bg-pink-100 dark:hover:bg-pink-900/20 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Dating
            </h1>
            <p className="text-xs text-pink-600 dark:text-pink-400">Find your match</p>
          </div>

          <button
            onClick={() => router.push('/link/dating/profile')}
            className="p-3 hover:bg-pink-100 dark:hover:bg-pink-900/20 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
                <div className="w-32 h-32 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-8">
                  <svg className="w-16 h-16 text-pink-600 dark:text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4">No More Profiles</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  Check back later for new matches!
                </p>
                <button
                  onClick={() => router.push('/link/dating/matches')}
                  className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold transition-colors"
                >
                  View Matches
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
                    tags={[]}
                    onSwipe={idx === 0 ? handleSwipe : () => {}}
                    onShowInfo={idx === 0 ? () => setInfoModalOpen(true) : () => {}}
                    style={{
                      transform: `translateY(${offset}px) scale(${scale})`,
                      opacity,
                      zIndex: 10 - idx,
                      pointerEvents: idx === 0 ? 'auto' : 'none',
                    }}
                    primaryActionLabel="Like"
                    secondaryActionLabel="Nah"
                  />
                );
              })}
            </>
          )}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <p className="text-sm text-pink-600 dark:text-pink-400 font-medium">
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
          tags={[]}
        />
      )}

      {currentMatch && (
        <ConnectionModal
          open={matchModalOpen}
          onClose={() => setMatchModalOpen(false)}
          displayName={currentMatch.display_name || currentMatch.username || 'Unknown'}
          username={currentMatch.username}
          avatarUrl={currentMatch.avatar_url || (currentMatch.photos && currentMatch.photos[0]) || ''}
          tags={[]}
          type="match"
          onKeepGoing={() => {
            setMatchModalOpen(false);
            setCurrentMatch(null);
          }}
        />
      )}
    </div>
  );
}
