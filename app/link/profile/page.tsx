'use client';

import { useState, useEffect } from 'react';
import { upsertLinkProfile, getMyLinkProfile } from '@/lib/link/api';
import { uploadLinkPhoto, MAX_PHOTOS } from '@/lib/link/storage';
import { INTEREST_TAGS } from '@/lib/link/types';

export default function LinkProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecently, setSavedRecently] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);
      
      const profile = await getMyLinkProfile();
      
      if (profile) {
        setEnabled(profile.enabled);
        setBio(profile.bio || '');
        setLocation(profile.location_text || '');
        setPhotos(profile.photos || []);
        setTags(profile.tags || []);
      } else {
        // Initialize with defaults for new profile
        setEnabled(false);
        setBio('');
        setLocation('');
        setPhotos([]);
        setTags([]);
      }
    } catch (err: any) {
      console.error('Failed to load profile:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err,
      });
      setError(`Failed to load profile: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      if (photos.length > MAX_PHOTOS) {
        throw new Error(`Maximum ${MAX_PHOTOS} photos allowed`);
      }

      await upsertLinkProfile({
        enabled,
        bio,
        location_text: location,
        photos,
        tags,
      });

      setSavedRecently(true);
      setTimeout(() => setSavedRecently(false), 3000);
    } catch (err: any) {
      console.error('Failed to save profile:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err,
      });
      setError(`Failed to save: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const url = await uploadLinkPhoto(file);
      setPhotos([...photos, url]);
      
      // Clear the input so the same file can be selected again if needed
      e.target.value = '';
    } catch (err: any) {
      console.error('Failed to upload photo:', {
        message: err?.message,
        fullError: err,
      });
      setError(`Failed to upload photo: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  function toggleTag(tag: string) {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Link Profile</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {savedRecently && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Profile saved successfully!
        </div>
      )}

      {/* Enable Toggle */}
      <div className="mb-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5"
          />
          <span className="text-lg font-medium">Enable my Link profile</span>
        </label>
        <p className="text-sm text-gray-600 mt-1 ml-8">
          When enabled, your profile will be visible to others
        </p>
      </div>

      {/* Bio */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell people about yourself..."
          className="w-full px-3 py-2 border rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={240}
        />
        <p className="text-sm text-gray-600 mt-1">{bio.length}/240</p>
      </div>

      {/* Location */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, State/Country"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Photos */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Photos ({photos.length}/{MAX_PHOTOS})
        </label>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {photos.length < MAX_PHOTOS && (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 
                file:mr-4 file:py-2 file:px-4 
                file:rounded-lg file:border-0 
                file:text-sm file:font-semibold 
                file:bg-blue-50 file:text-blue-700 
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {uploading && (
              <p className="text-sm text-gray-600 mt-2">
                Uploading...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Interest Tags */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Interests</label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                tags.includes(tag)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            {tags.length} {tags.length === 1 ? 'interest' : 'interests'} selected
          </p>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  );
}
