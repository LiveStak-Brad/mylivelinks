'use client';

/**
 * Channel Banner Component
 * 
 * Displays the channel banner for [username]TV pages.
 * Shows uploaded banner if exists, otherwise auto-generated default.
 * Owner can edit/remove banner via modal.
 */

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, X, Upload, Trash2, Loader2 } from 'lucide-react';
import { uploadChannelBanner, removeChannelBanner, getChannelBannerUrl } from '@/lib/channelBanner';

interface ChannelBannerProps {
  profile: {
    id: string;
    username: string;
    display_name?: string | null;
    channel_banner_url?: string | null;
  };
  isOwner: boolean;
  onBannerUpdate?: (newUrl: string | null) => void;
}

export function ChannelBanner({ profile, isOwner, onBannerUpdate }: ChannelBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bannerUrl = getChannelBannerUrl(profile);
  const hasCustomBanner = !!profile.channel_banner_url;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const newUrl = await uploadChannelBanner(profile.id, selectedFile);
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
      await removeChannelBanner(profile.id);
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

  return (
    <div className="relative w-full mb-6">
      {/* Banner Image - 16:9 aspect ratio */}
      <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Banner preview"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <Image
            src={bannerUrl}
            alt={`${profile.username}TV channel banner`}
            fill
            className="object-cover"
            unoptimized={bannerUrl.startsWith('data:')}
            priority
          />
        )}

        {/* Owner Edit Button (top-right overlay) */}
        {isOwner && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-sm font-medium rounded-lg transition-colors backdrop-blur-sm"
          >
            <Camera className="w-4 h-4" />
            Edit Banner
          </button>
        )}
      </div>

      {/* Edit Modal/Sheet */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Edit Channel Banner
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
              <div className="relative aspect-[16/5] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <Image
                  src={previewUrl || bannerUrl}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                  unoptimized={!previewUrl && bannerUrl.startsWith('data:')}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
                  className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  {selectedFile ? 'Choose Different Image' : 'Upload Image'}
                </button>

                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
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
                    className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors"
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
                Recommended: 1280×720 or larger, 16:9 aspect ratio. Max 5MB.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChannelBanner;
