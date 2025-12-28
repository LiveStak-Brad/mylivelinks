/**
 * ProfileTypePickerModal Component - Web
 * 
 * WEB PARITY: mobile/components/ProfileTypePickerModal.tsx
 * A modal for selecting profile type with card-based UI
 * UI-only component with placeholder save handler
 */

'use client';

import React, { useState } from 'react';

export type ProfileType = 'streamer' | 'musician' | 'comedian' | 'business' | 'creator';

type ProfileTypeOption = {
  id: ProfileType;
  icon: string;
  title: string;
  description: string;
};

const PROFILE_TYPES: ProfileTypeOption[] = [
  {
    id: 'streamer',
    icon: '📡',
    title: 'Streamer',
    description: 'Live streaming and broadcasting content',
  },
  {
    id: 'musician',
    icon: '🎵',
    title: 'Musician / Artist',
    description: 'Music performances and creative arts',
  },
  {
    id: 'comedian',
    icon: '🎭',
    title: 'Comedian',
    description: 'Comedy shows and entertainment',
  },
  {
    id: 'business',
    icon: '💼',
    title: 'Business / Brand',
    description: 'Professional and corporate presence',
  },
  {
    id: 'creator',
    icon: '✨',
    title: 'Creator',
    description: 'General content creation (default)',
  },
];

type ProfileTypePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  currentType?: ProfileType;
  onSelect?: (type: ProfileType) => void;
  allowSkip?: boolean;
};

export function ProfileTypePickerModal({
  visible,
  onClose,
  currentType = 'creator',
  onSelect,
  allowSkip = false,
}: ProfileTypePickerModalProps) {
  const [selectedType, setSelectedType] = useState<ProfileType>(currentType);

  if (!visible) return null;

  const handleContinue = () => {
    // TODO: In future, this will call backend to save to profiles.profile_type
    if (onSelect) {
      onSelect(selectedType);
    }
    onClose();
  };

  const handleSkip = () => {
    // Set to creator (default) and close
    if (onSelect) {
      onSelect('creator');
    }
    onClose();
  };

  const handleCardPress = (type: ProfileType) => {
    setSelectedType(type);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
            Choose Profile Type
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <span className="text-2xl font-light">✕</span>
          </button>
        </div>

        {/* Type Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {PROFILE_TYPES.map((option) => (
            <ProfileTypeCard
              key={option.id}
              option={option}
              selected={selectedType === option.id}
              onPress={() => handleCardPress(option.id)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 space-y-2.5">
          <button
            onClick={handleContinue}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-[0.99] shadow-lg"
          >
            Continue
          </button>

          {allowSkip && (
            <button
              onClick={handleSkip}
              className="w-full h-11 text-gray-500 dark:text-gray-400 font-semibold rounded-xl hover:text-gray-700 dark:hover:text-gray-300 transition-opacity active:opacity-60"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Profile Type Card Component
type ProfileTypeCardProps = {
  option: ProfileTypeOption;
  selected: boolean;
  onPress: () => void;
};

function ProfileTypeCard({ option, selected, onPress }: ProfileTypeCardProps) {
  return (
    <button
      onClick={onPress}
      className={`
        w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all
        ${
          selected
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
        active:opacity-80 active:scale-[0.98]
      `}
    >
      <div className="flex items-center gap-3.5 flex-1">
        <span className="text-3xl">{option.icon}</span>
        <div className="flex-1 text-left">
          <div
            className={`text-[15px] font-bold ${
              selected
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {option.title}
          </div>
          <div
            className={`text-[13px] leading-[18px] ${
              selected
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {option.description}
          </div>
        </div>
      </div>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-extrabold">✓</span>
        </div>
      )}
    </button>
  );
}

