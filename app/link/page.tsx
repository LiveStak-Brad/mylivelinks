'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SafetyModal } from '@/components/link/SafetyModal';

export default function LinkLandingPage() {
  const router = useRouter();
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [safetyModalMode, setSafetyModalMode] = useState<'link' | 'dating'>('link');

  type LinkMode = {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: JSX.Element;
    gradient: string;
    bgGradient: string;
    borderColor: string;
    startRoute: string;
    profileRoute: string;
    settingsRoute: string;
    badge?: string;
  };

  const modes: LinkMode[] = [
    {
      id: 'regular',
      title: 'Link or Nah',
      subtitle: 'Manual Swipe',
      description: 'Swipe to build mutuals without DM spam.',
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      gradient: 'from-blue-600 to-purple-600',
      bgGradient: 'from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      startRoute: '/link/regular/swipe',
      profileRoute: '/link/profile',
      settingsRoute: '/link/settings',
    },
    {
      id: 'auto-link',
      title: 'Auto-Link (F4F)',
      subtitle: 'Follow for Follow',
      description: 'Auto link-back on follow. Toggle on/off.',
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      gradient: 'from-emerald-600 to-teal-600',
      bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      startRoute: '/link/auto/swipe',
      profileRoute: '/link/profile',
      settingsRoute: '/link/settings',
    },
    {
      id: 'dating',
      title: 'Link Dating',
      subtitle: 'Opt-in Dating',
      description: 'Separate dating lane. Totally optional.',
      icon: (
        <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      ),
      gradient: 'from-pink-600 to-rose-600',
      bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
      borderColor: 'border-pink-200 dark:border-pink-800',
      startRoute: '/link/dating/swipe',
      profileRoute: '/link/dating/profile',
      settingsRoute: '/link/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-12 sm:mb-16">
          <div className="mb-6">
            <div className="inline-block p-5 sm:p-6 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl">
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Link
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Connect intentionally. Build mutuals. Choose your mode.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">
          {modes.map((mode) => (
            <div
              key={mode.id}
              className={`relative bg-gradient-to-br ${mode.bgGradient} rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 ${mode.borderColor} shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]`}
            >
              {mode.badge && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <span className={`px-2.5 py-1 bg-gradient-to-r ${mode.gradient} text-white text-xs font-bold rounded-full shadow-md`}>
                    {mode.badge}
                  </span>
                </div>
              )}

              <div className={`mb-4 sm:mb-6 inline-flex p-3 sm:p-4 bg-gradient-to-br ${mode.gradient} text-white rounded-xl sm:rounded-2xl shadow-lg`}>
                {mode.icon}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2">{mode.title}</h2>
              <p className={`text-sm font-semibold mb-3 sm:mb-4 bg-gradient-to-r ${mode.gradient} bg-clip-text text-transparent`}>
                {mode.subtitle}
              </p>

              {/* Add Safety link for Dating mode */}
              {mode.id === 'dating' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSafetyModalMode('dating');
                    setSafetyModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors mb-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Safety
                </button>
              )}

              <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8 min-h-[2.5rem] sm:min-h-[3rem]">
                {mode.description}
              </p>

              <div className="space-y-2.5 sm:space-y-3">
                <button
                  onClick={() => router.push(mode.startRoute)}
                  className={`w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r ${mode.gradient} hover:opacity-90 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all shadow-md hover:shadow-lg`}
                >
                  Start
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(mode.profileRoute)}
                    className="flex-1 py-2 px-2.5 sm:px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => router.push(mode.settingsRoute)}
                    className="flex-1 py-2 px-2.5 sm:px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
                  >
                    Settings
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold">How It Works</h2>
            <button
              onClick={() => {
                setSafetyModalMode('link');
                setSafetyModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Safety
            </button>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="font-bold mb-2">Swipe</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Browse profiles, swipe Link or Nah</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="font-bold mb-2">Match</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Both swiped Link? You're mutuals!</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="font-bold mb-2">Connect</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Message and follow each other</p>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Modal */}
      <SafetyModal
        open={safetyModalOpen}
        onClose={() => setSafetyModalOpen(false)}
        mode={safetyModalMode}
      />
    </div>
  );
}
