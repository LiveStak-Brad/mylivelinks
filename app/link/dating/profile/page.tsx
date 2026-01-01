'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DatingProfile } from '@/lib/link/api';
import * as linkApi from '@/lib/link/api';
import { uploadLinkPhoto } from '@/lib/link/storage';

const INTEREST_TAGS = ['Music', 'Gaming', 'Fitness', 'Business', 'Art', 'Tech', 'Travel', 'Food', 'Sports', 'Fashion', 'Photography', 'Reading'];

export default function DatingProfileEditor() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Partial<DatingProfile>>({
    enabled: false,
    bio: '',
    location_text: '',
    photos: [],
    prefs: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await linkApi.getMyDatingProfile();
      if (data) {
        setProfile(data);
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

    setSaving(true);
    setError(null);
    setSavedRecently(false);
    try {
      await linkApi.upsertDatingProfile({
        enabled: profile.enabled || false,
        bio: profile.bio || undefined,
        location_text: profile.location_text || undefined,
        photos: profile.photos || [],
        prefs: profile.prefs || {},
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

  const updatePrefs = (key: string, value: any) => {
    setProfile({
      ...profile,
      prefs: { ...(profile.prefs || {}), [key]: value },
    });
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
              onClick={() => setProfile({ ...profile, enabled: !profile.enabled })}
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

        {/* Bio & Location */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-4 border border-pink-200 dark:border-pink-800">
          <h2 className="text-lg font-semibold mb-4">About</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Dating Bio</label>
              <textarea
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="What are you looking for?"
                rows={4}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Location (Optional)</label>
              <input
                type="text"
                value={profile.location_text || ''}
                onChange={(e) => setProfile({ ...profile, location_text: e.target.value })}
                placeholder="e.g., Los Angeles, CA"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-4 border border-pink-200 dark:border-pink-800">
          <h2 className="text-lg font-semibold mb-4">Dating Preferences</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Show Me</label>
              <select
                value={profile.prefs?.looking_for || 'all'}
                onChange={(e) => updatePrefs('looking_for', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              >
                <option value="all">Everyone</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Age Range</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={profile.prefs?.age_min || ''}
                  onChange={(e) => updatePrefs('age_min', parseInt(e.target.value) || undefined)}
                  placeholder="Min"
                  className="flex-1 px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
                <span className="text-gray-500">—</span>
                <input
                  type="number"
                  value={profile.prefs?.age_max || ''}
                  onChange={(e) => updatePrefs('age_max', parseInt(e.target.value) || undefined)}
                  placeholder="Max"
                  className="flex-1 px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
