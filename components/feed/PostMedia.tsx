'use client';

type PostMediaMode = 'feed' | 'grid';
type PostMediaType = 'photo' | 'video';

export interface PostMediaProps {
  mediaUrl: string;
  mediaType: PostMediaType;
  mode: PostMediaMode;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export default function PostMedia({
  mediaUrl,
  mediaType,
  mode,
  alt,
  className = '',
  onClick,
}: PostMediaProps) {
  const isVideo = mediaType === 'video';

  if (mode === 'grid') {
    return (
      <div className={`aspect-square overflow-hidden relative ${className}`} onClick={onClick}>
        {isVideo ? (
          <video src={mediaUrl} className="w-full h-full object-cover" preload="metadata" />
        ) : (
          <img src={mediaUrl} alt={alt || 'Media'} className="w-full h-full object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} onClick={onClick}>
      {isVideo ? (
        <video 
          src={mediaUrl} 
          controls 
          playsInline
          muted
          preload="metadata"
          className="w-full h-auto block" 
        />
      ) : (
        <img src={mediaUrl} alt={alt || 'Post media'} className="w-full h-auto block" />
      )}
    </div>
  );
}
