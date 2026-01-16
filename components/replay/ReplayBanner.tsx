'use client';

/**
 * Replay Banner Component
 * 
 * Displays the banner for the global Replay page.
 * Shows uploaded banner if exists, otherwise auto-generated default.
 * Admin/owner can edit/remove banner via simple upload modal.
 */

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Camera, X, Upload, Trash2, Loader2 } from 'lucide-react';
import { uploadReplayBanner, removeReplayBanner, generateDefaultReplayBanner, getReplayBannerUrl, clearReplayBannerCache } from '@/lib/replayBanner';

interface ReplayBannerProps {
  isAdmin?: boolean;
  onBannerUpdate?: (newUrl: string | null) => void;
}

export function ReplayBanner({ isAdmin = false, onBannerUpdate }: ReplayBannerProps) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadBanner = async () => {
      try {
        const url = await getReplayBannerUrl();
        setBannerUrl(url);
      } catch (err) {
        console.error('Failed to load replay banner:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadBanner();
  }, []);

  const displayUrl = previewUrl || bannerUrl || generateDefaultReplayBanner();
  const hasCustomBanner = !!bannerUrl;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const newUrl = await uploadReplayBanner(selectedFile);
      clearReplayBannerCache(); // Clear cache so new banner is fetched
      setBannerUrl(newUrl);
      onBannerUpdate?.(newUrl);
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload banner');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!hasCustomBanner) return;

    setIsRemoving(true);
    setError(null);

    try {
      await removeReplayBanner();
      clearReplayBannerCache(); // Clear cache so removal is reflected
      setBannerUrl(null);
      onBannerUpdate?.(null);
      setIsEditing(false);
    } catch (err) {
      console.error('Remove error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove banner');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="relative w-full aspect-[16/4] sm:aspect-[16/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800" />
    );
  }

  return (
    <div className="relative w-full mb-6">
      {/* Banner Image */}
      <div className="relative w-full aspect-[16/4] sm:aspect-[16/3] rounded-2xl overflow-hidden shadow-lg">
        <Image
          src={displayUrl}
          alt="Replay banner"
          fill
          className="object-cover"
          unoptimized={displayUrl.startsWith('data:')}
          priority
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Admin Edit Button */}
        {isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 text-white text-sm font-medium rounded-xl transition-all backdrop-blur-sm shadow-lg"
          >
            <Camera className="w-4 h-4" />
            Edit Banner
          </button>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Edit Replay Banner
              </h2>
              <button
                onClick={handleCancel}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Preview */}
              <div className="relative aspect-[16/4] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <Image
                  src={previewUrl || bannerUrl || generateDefaultReplayBanner()}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isRemoving}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-400 disabled:to-pink-400 text-white font-medium rounded-xl transition-all shadow-lg"
                >
                  <Upload className="w-5 h-5" />
                  {selectedFile ? 'Choose Different Image' : 'Upload Image'}
                </button>

                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors shadow-lg"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Save Banner'
                    )}
                  </button>
                )}

                {hasCustomBanner && !selectedFile && (
                  <button
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-xl transition-colors"
                  >
                    {isRemoving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        Remove Banner
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleCancel}
                  disabled={isUploading || isRemoving}
                  className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Recommended: 1920×480 or wider. Max 5MB.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReplayBanner;
