/**
 * Link Module - Regular Lane Landing
 */

'use client';

import { useRouter } from 'next/navigation';

export default function RegularLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="inline-block p-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl shadow-2xl">
            <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h1 className="text-5xl font-bold mb-4">Link or Nah</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
          Swipe to build mutuals. Connect intentionally without DM spam.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => router.push('/link/regular/swipe')}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-bold rounded-2xl shadow-xl transition-all transform hover:scale-105"
          >
            Start Swiping
          </button>

          <div className="flex gap-4">
            <button
              onClick={() => router.push('/link/profile')}
              className="flex-1 py-3 px-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl font-semibold transition-all"
            >
              Edit Profile
            </button>
            <button
              onClick={() => router.push('/link/mutuals')}
              className="flex-1 py-3 px-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl font-semibold transition-all"
            >
              View Mutuals
            </button>
          </div>

          <button
            onClick={() => router.push('/link')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
          >
            ← Back to Link Modes
          </button>
        </div>
      </div>
    </div>
  );
}
