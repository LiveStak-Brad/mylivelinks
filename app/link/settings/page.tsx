'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LinkSettings } from '@/lib/link/types';
import * as linkApi from '@/lib/link/api';

export default function LinkSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Partial<LinkSettings>>({
    auto_link_on_follow: false,
    auto_link_require_approval: false,
    auto_link_policy: 'everyone',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await linkApi.getMyLinkSettings();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await linkApi.upsertLinkSettings({
        auto_link_on_follow: settings.auto_link_on_follow || false,
        auto_link_require_approval: settings.auto_link_require_approval || false,
        auto_link_policy: settings.auto_link_policy || 'everyone',
      });
      setTimeout(() => {
        router.push('/link');
      }, 1000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-28">
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/link')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h1 className="text-lg font-bold">Link Settings</h1>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-6">Auto-Link (F4F)</h2>

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">Auto-Link Back on Follow</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  When someone follows you, automatically create a mutual link (F4F).
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, auto_link_on_follow: !settings.auto_link_on_follow })}
                className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
                  settings.auto_link_on_follow ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                    settings.auto_link_on_follow ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4 opacity-50">
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-1">Require Approval</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Review auto-link requests before accepting
                  </p>
                </div>
                <button
                  disabled
                  className="relative w-14 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 cursor-not-allowed"
                >
                  <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
