'use client';

import { useState } from 'react';

interface SwipeCardProps {
  displayName: string;
  username?: string;
  bio: string;
  photos?: string[];
  location?: string;
  tags?: string[];
  onSwipe: (direction: 'left' | 'right') => void;
  onShowInfo: () => void;
  style?: React.CSSProperties;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
}

export function SwipeCard({
  displayName,
  username,
  bio,
  photos = [],
  location,
  tags = [],
  onSwipe,
  onShowInfo,
  style,
  primaryActionLabel = 'Link',
  secondaryActionLabel = 'Nah',
}: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const mainPhoto = photos[currentPhotoIndex] || photos[0] || '/placeholder-avatar.png';

  return (
    <div
      className="absolute inset-0 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden"
      style={style}
    >
      {/* Photo */}
      <div className="relative h-2/3 bg-gray-200 dark:bg-gray-700">
        <img src={mainPhoto} alt={displayName} className="w-full h-full object-cover" />
        
        {photos.length > 1 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 px-4">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full ${
                  idx === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {photos.length > 1 && (
          <div className="absolute inset-0 flex">
            <button
              onClick={() => setCurrentPhotoIndex((prev) => Math.max(0, prev - 1))}
              className="flex-1"
            />
            <button
              onClick={() => setCurrentPhotoIndex((prev) => Math.min(photos.length - 1, prev + 1))}
              className="flex-1"
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold">{displayName}</h2>
          {username && <p className="text-gray-600 dark:text-gray-400">@{username}</p>}
          {location && <p className="text-sm text-gray-500">{location}</p>}
        </div>

        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{bio}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => onSwipe('left')}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={onShowInfo}
            className="w-12 h-12 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={() => onSwipe('right')}
            className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
