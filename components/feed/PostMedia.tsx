'use client';

import { useState, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

type PostMediaMode = 'feed' | 'grid';
type PostMediaType = 'photo' | 'video';

export interface PostMediaProps {
  mediaUrl: string;
  mediaType: PostMediaType;
  mode: PostMediaMode;
  alt?: string;
  className?: string;
  onClick?: () => void;
  thumbnailUrl?: string | null;
}

export default function PostMedia({
  mediaUrl,
  mediaType,
  mode,
  alt,
  className = '',
  onClick,
  thumbnailUrl,
}: PostMediaProps) {
  const isVideo = mediaType === 'video';
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleVideoError = useCallback(() => {
    console.error('[PostMedia] Video failed to load:', mediaUrl);
    setVideoError(true);
  }, [mediaUrl]);

  const handleImageError = useCallback(() => {
    console.error('[PostMedia] Image failed to load:', mediaUrl);
    setImageError(true);
  }, [mediaUrl]);

  const handleRetry = useCallback(() => {
    setVideoError(false);
    setImageError(false);
    setRetryCount(prev => prev + 1);
  }, []);

  // Error state UI
  const ErrorState = ({ type }: { type: 'video' | 'image' }) => (
    <div 
      className="w-full aspect-video bg-muted/50 flex flex-col items-center justify-center gap-2 rounded-lg border border-border"
      onClick={(e) => { e.stopPropagation(); handleRetry(); }}
    >
      <AlertCircle className="w-8 h-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {type === 'video' ? 'Video unavailable' : 'Image unavailable'}
      </p>
      <button className="flex items-center gap-1 text-xs text-primary hover:underline">
        <RefreshCw className="w-3 h-3" />
        Tap to retry
      </button>
    </div>
  );

  // Add cache-busting on retry
  const urlWithRetry = retryCount > 0 ? `${mediaUrl}${mediaUrl.includes('?') ? '&' : '?'}_r=${retryCount}` : mediaUrl;

  if (mode === 'grid') {
    return (
      <div className={`aspect-square overflow-hidden relative ${className}`} onClick={onClick}>
        {isVideo ? (
          videoError ? (
            <div className="w-full h-full bg-muted/50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
          ) : (
            <video 
              src={urlWithRetry} 
              className="w-full h-full object-cover" 
              preload="metadata"
              poster={thumbnailUrl || undefined}
              onError={handleVideoError}
            />
          )
        ) : (
          imageError ? (
            <div className="w-full h-full bg-muted/50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
          ) : (
            <img 
              src={urlWithRetry} 
              alt={alt || 'Media'} 
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} onClick={onClick}>
      {isVideo ? (
        videoError ? (
          <ErrorState type="video" />
        ) : (
          <video 
            src={urlWithRetry} 
            controls 
            playsInline
            preload="metadata"
            poster={thumbnailUrl || undefined}
            className="w-full h-auto block" 
            onError={handleVideoError}
          />
        )
      ) : (
        imageError ? (
          <ErrorState type="image" />
        ) : (
          <img 
            src={urlWithRetry} 
            alt={alt || 'Post media'} 
            className="w-full h-auto block"
            onError={handleImageError}
          />
        )
      )}
    </div>
  );
}
