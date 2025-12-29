'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadRoomImage } from '@/lib/storage';

interface BannerUploaderProps {
  currentUrl: string | null;
  onUpload: (url: string) => void;
  onClear?: () => void;
  roomKeyOrId: string;
  label?: string;
  aspectRatio?: string;
  className?: string;
}

export default function BannerUploader({
  currentUrl,
  onUpload,
  onClear,
  roomKeyOrId,
  label = 'Banner Image',
  aspectRatio = 'aspect-[16/9]',
  className = '',
}: BannerUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
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
    setIsUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const url = await uploadRoomImage(roomKeyOrId, file);
      onUpload(url);
      setPreviewUrl(null); // Clear preview once uploaded
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, [roomKeyOrId, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const displayUrl = previewUrl || currentUrl;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative ${aspectRatio} w-full rounded-xl overflow-hidden
          border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-border hover:border-primary/50 bg-muted/30'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Banner preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition"
              >
                <Upload className="w-4 h-4" />
                Change
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                    setPreviewUrl(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/80 backdrop-blur-sm text-white rounded-lg hover:bg-red-600/80 transition"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="p-4 rounded-full bg-muted">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop an image here</p>
              <p className="text-sm">or click to browse</p>
            </div>
            <p className="text-xs text-muted-foreground/70">
              Recommended: 1200x675px (16:9)
            </p>
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading...</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}






