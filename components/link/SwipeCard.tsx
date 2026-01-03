'use client';

import { useState } from 'react';
import { LocationBadge } from '@/components/location/LocationBadge';
import type { ProfileLocation } from '@/lib/location';

interface SwipeCardProps {
  displayName: string;
  username?: string;
  bio: string;
  photos?: string[];
  location?: string | ProfileLocation;
  tags?: string[];
  style?: React.CSSProperties;
  orientationLabel?: string;
}

export function SwipeCard({
  displayName,
  username,
  bio,
  photos = [],
  location,
  tags = [],
  style,
  orientationLabel,
}: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const mainPhoto = photos[currentPhotoIndex] || photos[0] || '/placeholder-avatar.png';
  const photoHeight = 'min(460px, 55vh)';

  const derivedLocation: ProfileLocation | null =
    typeof location === 'string'
      ? { label: location }
      : location || null;

  return (
    <div
      className="absolute inset-0 flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-800"
      style={style}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Photo */}
        <div
          className="relative w-full flex-shrink-0 overflow-hidden bg-gray-200 dark:bg-gray-700"
          style={{ height: photoHeight, minHeight: 240 }}
        >
          <img src={mainPhoto} alt={displayName} className="h-full w-full object-cover" />
        
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{displayName}</h2>
              {username && <p className="text-gray-600 dark:text-gray-400">@{username}</p>}
              {derivedLocation && (
                <LocationBadge location={derivedLocation} muted size="sm" className="mt-1" />
              )}
              {orientationLabel && (
                <p className="text-sm font-semibold text-pink-600 dark:text-pink-300 mt-1">
                  Orientation: {orientationLabel}
                </p>
              )}
            </div>

            <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">{bio}</p>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
