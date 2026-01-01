'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SafetyModal } from '@/components/link/SafetyModal';

export default function DatingLandingPage() {
  const router = useRouter();
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 dark:from-gray-950 dark:to-pink-900/10 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Safety link */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/link')}
            className="p-2 hover:bg-pink-100 dark:hover:bg-pink-900/20 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => setSafetyModalOpen(true)}
            className="flex items-center gap-1.5 text-sm text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Safety
          </button>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-block p-6 bg-gradient-to-br from-pink-600 to-rose-600 rounded-3xl shadow-2xl mb-6">
            <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            Link Dating
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Opt-in dating mode. Find your match.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/link/dating/swipe')}
              className="px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all"
            >
              Start Swiping
            </button>
            <button
              onClick={() => router.push('/link/dating/profile')}
              className="px-8 py-4 bg-white dark:bg-gray-800 border-2 border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-xl font-bold text-lg transition-all"
            >
              Edit Dating Profile
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-pink-200 dark:border-pink-800 shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="font-bold mb-2">Set Preferences</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Choose what you're looking for</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-pink-200 dark:border-pink-800 shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="font-bold mb-2">Swipe</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Like or pass on profiles</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-pink-200 dark:border-pink-800 shadow-sm">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="font-bold mb-2">Match</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Connect when both like each other</p>
          </div>
        </div>
      </div>

      {/* Safety Modal */}
      <SafetyModal
        open={safetyModalOpen}
        onClose={() => setSafetyModalOpen(false)}
        mode="dating"
      />
    </div>
  );
}
