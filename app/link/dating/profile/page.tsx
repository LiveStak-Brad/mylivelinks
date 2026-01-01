'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { DatingProfile, DatingProfilePrefs } from '@/lib/link/dating-types';
import * as linkApi from '@/lib/link/api';
import { uploadLinkPhoto } from '@/lib/link/storage';
import { SafetyModal } from '@/components/link/SafetyModal';

const INTEREST_TAGS = [
  'Music', 'Gaming', 'Fitness', 'Business', 'Art', 'Tech',
  'Travel', 'Food', 'Sports', 'Fashion', 'Photography', 'Reading',
  'Movies', 'Cooking', 'Dancing', 'Yoga', 'Hiking', 'Pets'
];

const DATING_GUIDELINES_KEY = 'mll_link_dating_guidelines_accepted';

const INITIAL_PREFS: DatingProfilePrefs = {
  show_me: 'everyone',
  age_min: 18,
  age_max: 99,
  smoker_ok: 'doesnt_matter',
  drinker_ok: 'doesnt_matter',
  religion_pref: 'doesnt_matter',
  height_pref: 'doesnt_matter',
  build_pref: 'doesnt_matter',
  interests_pref: 'doesnt_matter',
};

const mergePrefs = (prefs?: Partial<DatingProfilePrefs> | null): DatingProfilePrefs => ({
  ...INITIAL_PREFS,
  ...(prefs || {}),
});

export default function DatingProfileEditor() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Partial<DatingProfile>>({
    enabled: false,
    bio: '',
    location_text: '',
    photos: [],
    prefs: { ...INITIAL_PREFS },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean[]>([]);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await linkApi.getMyDatingProfile();
      if (data) {
        setProfile({ ...data, prefs: mergePrefs(data.prefs) });
      }
    } catch (err: any) {
      console.error('Failed to load dating profile:', err);
      setError(`Failed to load profile: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if ((profile.photos || []).length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }

    // Check if trying to enable dating without accepting guidelines
    if (profile.enabled) {
      const hasAccepted = localStorage.getItem(DATING_GUIDELINES_KEY) === '1';
      if (!hasAccepted) {
        setPendingEnable(true);
        setSafetyModalOpen(true);
        return;
      }
    }

    await saveDatingProfile();
  };

  const saveDatingProfile = async () => {
    setSaving(true);
    setError(null);
    setSavedRecently(false);
    try {
      await linkApi.upsertDatingProfile({
        enabled: profile.enabled || false,
        bio: profile.bio || undefined,
        location_text: profile.location_text || undefined,
        photos: profile.photos || [],
        prefs: mergePrefs(profile.prefs as Partial<DatingProfilePrefs> | undefined),
      });
      
      await loadProfile();
      
      setSavedRecently(true);
      setTimeout(() => setSavedRecently(false), 3000);
    } catch (err: any) {
      console.error('Failed to save dating profile:', err);
      setError(`Failed to save profile: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDating = (newValue: boolean) => {
    if (newValue) {
      // Trying to enable dating
      const hasAccepted = localStorage.getItem(DATING_GUIDELINES_KEY) === '1';
      if (!hasAccepted) {
        setPendingEnable(true);
        setSafetyModalOpen(true);
        return;
      }
    }
    setProfile({ ...profile, enabled: newValue });
  };

  const handleAcceptGuidelines = () => {
    localStorage.setItem(DATING_GUIDELINES_KEY, '1');
    setProfile({ ...profile, enabled: true });
    setPendingEnable(false);
    setSafetyModalOpen(false);
  };

  const handleDeclineGuidelines = () => {
    setProfile({ ...profile, enabled: false });
    setPendingEnable(false);
    setSafetyModalOpen(false);
  };

  const updatePrefs = (key: keyof DatingProfilePrefs, value: any) => {
    setProfile((prev) => ({
      ...prev,
      prefs: {
        ...mergePrefs(prev.prefs as Partial<DatingProfilePrefs> | undefined),
        [key]: value,
      },
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const photos = profile.photos || [];
    if (photos.length >= 5) {
      setError('Maximum 5 photos allowed');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newPhotos = [...photos, previewUrl];
    setProfile({ ...profile, photos: newPhotos });

    const newUploadingState = [...uploadingPhotos];
    newUploadingState[photos.length] = true;
    setUploadingPhotos(newUploadingState);

    try {
      const uploadedUrl = await uploadLinkPhoto(file);
      const finalPhotos = [...photos, uploadedUrl];
      setProfile({ ...profile, photos: finalPhotos });
      URL.revokeObjectURL(previewUrl);
    } catch (err: any) {
      console.error('Failed to upload photo:', err);
      setError(`Failed to upload photo: ${err?.message || 'Unknown error'}`);
      setProfile({ ...profile, photos });
      URL.revokeObjectURL(previewUrl);
    } finally {
      const updatedUploadingState = [...newUploadingState];
      updatedUploadingState[photos.length] = false;
      setUploadingPhotos(updatedUploadingState);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const photos = profile.photos || [];
    const photoUrl = photos[index];
    
    if (photoUrl && photoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoUrl);
    }
    
    setProfile({
      ...profile,
      photos: photos.filter((_, i) => i !== index),
    });

    const newUploadingState = uploadingPhotos.filter((_, i) => i !== index);
    setUploadingPhotos(newUploadingState);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dating profile...</p>
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

            <h1 className="text-lg font-bold">Dating Profile</h1>

            <button
              onClick={handleSave}
              disabled={saving || savedRecently}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                savedRecently
                  ? 'bg-green-500 text-white'
                  : saving
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500'
                  : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-md'
              }`}
            >
              {savedRecently ? '✓ Saved' : saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Enable Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-4 border border-pink-200 dark:border-pink-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-0.5">Enable Dating Mode</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Show your dating profile in the dating swipe stack
              </p>
            </div>
            <button
              onClick={() => handleToggleDating(!profile.enabled)}
              className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
                profile.enabled ? 'bg-gradient-to-r from-pink-600 to-rose-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${
                  profile.enabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-4 border border-pink-200 dark:border-pink-800">
          <h2 className="text-lg font-semibold mb-3">
            Photos <span className="text-gray-500 font-normal text-sm">(Up to 5)</span>
          </h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="grid grid-cols-3 gap-3">
            {profile.photos?.map((photo, idx) => (
              <div key={idx} className="relative aspect-square group">
                <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                
                {uploadingPhotos[idx] && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {(!profile.photos || profile.photos.length < 5) && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-pink-500 dark:hover:border-pink-500 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors group"
              >
                <svg className="w-8 h-8 text-gray-400 group-hover:text-pink-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium text-gray-500 group-hover:text-pink-500 transition-colors">
                  Add Photo
                </span>
              </button>
            )}
          </div>
        </div>

        {/* About You */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-pink-200 dark:border-pink-800">
          <h2 className="text-xl font-bold mb-6">About You</h2>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Age</label>
                <input
                  type="number"
                  value={profile.prefs?.age || ''}
                  onChange={(e) => updatePrefs('age', parseInt(e.target.value) || undefined)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Height</label>
                <select
                  value={profile.prefs?.height || ''}
                  onChange={(e) => updatePrefs('height', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="">Prefer not to say</option>
                  <option value="short">Under 5'4"</option>
                  <option value="average">5'4" - 5'9"</option>
                  <option value="tall">5'10" - 6'2"</option>
                  <option value="very-tall">Over 6'2"</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Build</label>
                <select
                  value={profile.prefs?.build || ''}
                  onChange={(e) => updatePrefs('build', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="">Prefer not to say</option>
                  <option value="slim">Slim</option>
                  <option value="average">Average</option>
                  <option value="athletic">Athletic</option>
                  <option value="curvy">Curvy</option>
                  <option value="heavyset">Heavyset</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Religion</label>
                <select
                  value={profile.prefs?.religion || ''}
                  onChange={(e) => updatePrefs('religion', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="">Prefer not to say</option>
                  <option value="christian">Christian</option>
                  <option value="muslim">Muslim</option>
                  <option value="jewish">Jewish</option>
                  <option value="hindu">Hindu</option>
                  <option value="buddhist">Buddhist</option>
                  <option value="spiritual">Spiritual</option>
                  <option value="agnostic">Agnostic</option>
                  <option value="atheist">Atheist</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Smoker</label>
                <select
                  value={profile.prefs?.smoker || ''}
                  onChange={(e) => updatePrefs('smoker', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="">Prefer not to say</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="sometimes">Sometimes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Drinker</label>
                <select
                  value={profile.prefs?.drinker || ''}
                  onChange={(e) => updatePrefs('drinker', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="">Prefer not to say</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="socially">Socially</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Dating Bio</label>
              <textarea
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="What are you looking for?"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Looking For (short text)</label>
              <input
                type="text"
                value={profile.prefs?.looking_for_text || ''}
                onChange={(e) => updatePrefs('looking_for_text', e.target.value)}
                placeholder="e.g., Long-term relationship, casual dating, friends first..."
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1.5">Max 100 characters</p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Hobbies / Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map((tag) => {
                  const isSelected = profile.prefs?.hobbies?.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentHobbies = profile.prefs?.hobbies || [];
                        const newHobbies = isSelected
                          ? currentHobbies.filter((t: string) => t !== tag)
                          : [...currentHobbies, tag];
                        updatePrefs('hobbies', newHobbies);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Location (Optional)</label>
              <input
                type="text"
                value={profile.location_text || ''}
                onChange={(e) => setProfile({ ...profile, location_text: e.target.value })}
                placeholder="e.g., Los Angeles, CA"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Who You're Looking For */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-pink-200 dark:border-pink-800">
          <h2 className="text-xl font-bold mb-6">Who You're Looking For</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2">Show Me</label>
              <select
                value={profile.prefs?.looking_for || 'all'}
                onChange={(e) => updatePrefs('looking_for', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              >
                <option value="all">Everyone</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Age Range</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={profile.prefs?.age_min || ''}
                  onChange={(e) => updatePrefs('age_min', parseInt(e.target.value) || undefined)}
                  placeholder="Min"
                  min="18"
                  max="99"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
                <span className="text-gray-500 font-semibold">—</span>
                <input
                  type="number"
                  value={profile.prefs?.age_max || ''}
                  onChange={(e) => updatePrefs('age_max', parseInt(e.target.value) || undefined)}
                  placeholder="Max"
                  min="18"
                  max="99"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Smoker Preference</label>
              <select
                value={profile.prefs?.smoker_pref || ''}
                onChange={(e) => updatePrefs('smoker_pref', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              >
                <option value="">Doesn't matter</option>
                <option value="yes">Okay with smoker</option>
                <option value="no">Not okay with smoker</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Drinker Preference</label>
              <select
                value={profile.prefs?.drinker_pref || ''}
                onChange={(e) => updatePrefs('drinker_pref', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              >
                <option value="">Doesn't matter</option>
                <option value="yes">Okay with drinker</option>
                <option value="no">Not okay with drinker</option>
                <option value="socially">Socially only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Religion Preference</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updatePrefs('religion_pref', [])}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !profile.prefs?.religion_pref || profile.prefs.religion_pref.length === 0
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Doesn't matter
                </button>
                {['Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Spiritual', 'Agnostic', 'Atheist', 'Other'].map((religion) => {
                  const isSelected = profile.prefs?.religion_pref?.includes(religion.toLowerCase());
                  return (
                    <button
                      key={religion}
                      onClick={() => {
                        const currentReligions = profile.prefs?.religion_pref || [];
                        const newReligions = isSelected
                          ? currentReligions.filter((r: string) => r !== religion.toLowerCase())
                          : [...currentReligions, religion.toLowerCase()];
                        updatePrefs('religion_pref', newReligions);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {religion}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Height Preference</label>
              <div className="flex items-center gap-3">
                <select
                  value={profile.prefs?.height_pref_min || ''}
                  onChange={(e) => updatePrefs('height_pref_min', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="">Min (Any)</option>
                  <option value="short">Under 5'4"</option>
                  <option value="average">5'4"</option>
                  <option value="tall">5'10"</option>
                  <option value="very-tall">6'3"</option>
                </select>
                <span className="text-gray-500 font-semibold">—</span>
                <select
                  value={profile.prefs?.height_pref_max || ''}
                  onChange={(e) => updatePrefs('height_pref_max', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                >
                  <option value="">Max (Any)</option>
                  <option value="short">5'4"</option>
                  <option value="average">5'9"</option>
                  <option value="tall">6'2"</option>
                  <option value="very-tall">Over 6'2"</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Build Preference</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updatePrefs('build_pref', [])}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !profile.prefs?.build_pref || profile.prefs.build_pref.length === 0
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Doesn't matter
                </button>
                {['Slim', 'Average', 'Athletic', 'Curvy', 'Heavyset'].map((build) => {
                  const isSelected = profile.prefs?.build_pref?.includes(build.toLowerCase());
                  return (
                    <button
                      key={build}
                      onClick={() => {
                        const currentBuilds = profile.prefs?.build_pref || [];
                        const newBuilds = isSelected
                          ? currentBuilds.filter((b: string) => b !== build.toLowerCase())
                          : [...currentBuilds, build.toLowerCase()];
                        updatePrefs('build_pref', newBuilds);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {build}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Interests Preference</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updatePrefs('interests_pref', [])}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    !profile.prefs?.interests_pref || profile.prefs.interests_pref.length === 0
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Doesn't matter
                </button>
                {INTEREST_TAGS.map((tag) => {
                  const isSelected = profile.prefs?.interests_pref?.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentInterests = profile.prefs?.interests_pref || [];
                        const newInterests = isSelected
                          ? currentInterests.filter((t: string) => t !== tag)
                          : [...currentInterests, tag];
                        updatePrefs('interests_pref', newInterests);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Modal */}
      <SafetyModal
        open={safetyModalOpen}
        onClose={() => {
          if (pendingEnable) {
            handleDeclineGuidelines();
          } else {
            setSafetyModalOpen(false);
          }
        }}
        mode="dating"
        requireCheckbox={pendingEnable}
        onAccept={pendingEnable ? handleAcceptGuidelines : undefined}
        onDecline={pendingEnable ? handleDeclineGuidelines : undefined}
      />
    </div>
  );
}
