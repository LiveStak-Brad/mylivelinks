'use client';

/**
 * PlaylistUploaderModal - Create/Edit Curator Playlists
 * 
 * YouTube URL-only curator playlists for long-form content.
 * Categories: music, movies, education, comedy, podcasts, series, mixed
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, ListVideo, Upload, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase';

// Category options
const PLAYLIST_CATEGORIES = [
  { id: 'music', label: 'Music' },
  { id: 'movies', label: 'Movies' },
  { id: 'education', label: 'Education' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'series', label: 'Series' },
  { id: 'mixed', label: 'Mixed / All' },
] as const;

// Visibility options
const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public', description: 'Anyone can view' },
  { id: 'unlisted', label: 'Unlisted', description: 'Only with link' },
  { id: 'private', label: 'Private', description: 'Only you' },
] as const;

// Genre/subcategory suggestions per category
const SUBCATEGORY_SUGGESTIONS: Record<string, string[]> = {
  music: ['Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Country', 'Latin', 'Indie'],
  movies: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Documentary', 'Animation', 'Thriller', 'Romance'],
  education: ['Programming', 'Business', 'Science', 'Math', 'Language', 'History', 'Art', 'Health', 'Finance'],
  comedy: ['Stand-up', 'Sketch', 'Improv', 'Roast', 'Satire', 'Parody'],
  podcasts: ['Interview', 'True Crime', 'News', 'Sports', 'Tech', 'Culture', 'Health', 'Business'],
  series: ['Drama', 'Comedy', 'Reality', 'Documentary', 'Anime', 'Talk Show'],
  mixed: [],
};

export type PlaylistFormData = {
  id?: string;
  title: string;
  description: string;
  visibility: 'public' | 'unlisted' | 'private';
  category: string;
  subcategory: string;
  thumbnail_url: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlaylistFormData) => Promise<void>;
  initialData?: Partial<PlaylistFormData>;
  buttonColor?: string;
};

export default function PlaylistUploaderModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  buttonColor = '#8B5CF6',
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [category, setCategory] = useState('mixed');
  const [subcategory, setSubcategory] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(initialData?.id);

  // Upload thumbnail to replay_thumbs bucket
  const handleThumbnailUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `playlist_${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;
      
      // Upload to replay_thumbs bucket
      const { error: uploadError } = await supabase.storage
        .from('replay_thumbs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('replay_thumbs')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get thumbnail URL');
      }
      
      setThumbnailUrl(urlData.publicUrl);
    } catch (e) {
      console.error('[PlaylistUploaderModal] upload failed', e);
      setError(e instanceof Error ? e.message : 'Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setVisibility(initialData?.visibility || 'public');
      setCategory(initialData?.category || 'mixed');
      setSubcategory(initialData?.subcategory || '');
      setThumbnailUrl(initialData?.thumbnail_url || '');
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: initialData?.id,
        title: trimmedTitle,
        description: description.trim(),
        visibility,
        category,
        subcategory: subcategory.trim(),
        thumbnail_url: thumbnailUrl.trim(),
      });
      onClose();
    } catch (e) {
      console.error('[PlaylistUploaderModal] save failed', e);
      setError(e instanceof Error ? e.message : 'Failed to save playlist');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const suggestions = SUBCATEGORY_SUGGESTIONS[category] || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={() => !saving && onClose()} 
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${buttonColor}20` }}
            >
              <ListVideo className="w-5 h-5" style={{ color: buttonColor }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Playlist' : 'Create Playlist'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Curate YouTube videos into a playlist
              </p>
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Favorite Videos"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              maxLength={500}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVisibility(opt.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    visibility === opt.id
                      ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {VISIBILITY_OPTIONS.find(o => o.id === visibility)?.description}
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYLIST_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setSubcategory(''); // Reset subcategory when category changes
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    category === cat.id
                      ? 'text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  style={category === cat.id ? { backgroundColor: buttonColor } : undefined}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory / Genre */}
          {category !== 'mixed' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Genre / Subcategory
              </label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g., Hip-Hop, Documentary..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                maxLength={50}
              />
              {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubcategory(s)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        subcategory === s
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Thumbnail */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Custom Thumbnail <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            
            {/* Thumbnail preview or upload area */}
            {thumbnailUrl ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                <img
                  src={thumbnailUrl}
                  alt="Playlist thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    title="Change thumbnail"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('')}
                    disabled={uploading}
                    className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                    title="Remove thumbnail"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm font-medium">Uploading...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm font-medium">Click to upload thumbnail</span>
                    <span className="text-xs">PNG, JPG up to 5MB</span>
                  </>
                )}
              </button>
            )}
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleThumbnailUpload(file);
                e.target.value = ''; // Reset for re-upload
              }}
            />
            
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to use the first video's thumbnail
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: buttonColor }}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Playlist'}
          </button>
        </div>
      </div>
    </div>
  );
}
