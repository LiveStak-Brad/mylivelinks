'use client';

import { RotateCw, Smartphone } from 'lucide-react';

interface RotatePhoneOverlayProps {
  onContinue: () => void;
}

/**
 * Full-screen overlay shown on mobile web when device is in portrait mode.
 * Instructs the user to rotate their phone to landscape to watch live streams.
 */
export default function RotatePhoneOverlay({ onContinue }: RotatePhoneOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-8 text-center max-w-md">
        {/* Animated phone icon */}
        <div className="relative mb-8">
          {/* Phone body */}
          <div className="relative animate-pulse-slow">
            <Smartphone 
              size={80} 
              className="text-white transform -rotate-90 transition-transform duration-1000" 
              strokeWidth={1.5}
            />
            {/* Rotation arrow overlay */}
            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
              <RotateCw 
                size={32} 
                className="text-purple-400 animate-spin-slow" 
                strokeWidth={2}
              />
            </div>
          </div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 -m-4 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Rotate Your Phone
        </h1>

        {/* Description */}
        <p className="text-gray-300 text-base mb-8 leading-relaxed">
          Turn your phone to landscape mode for the best live viewing experience.
        </p>

        {/* Visual indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {/* Portrait (current) */}
          <div className="flex flex-col items-center opacity-50">
            <div className="w-8 h-12 border-2 border-gray-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-2 bg-gray-500 rounded" />
            </div>
            <span className="text-xs text-gray-500 mt-2">Portrait</span>
          </div>

          {/* Arrow */}
          <div className="text-purple-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>

          {/* Landscape (target) */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-8 border-2 border-purple-400 rounded-lg flex items-center justify-center bg-purple-400/10">
              <div className="w-2 h-4 bg-purple-400 rounded" />
            </div>
            <span className="text-xs text-purple-400 mt-2">Landscape</span>
          </div>
        </div>

        {/* Continue button (rechecks orientation) */}
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg active:scale-95"
        >
          Continue
        </button>

        {/* Help text */}
        <p className="text-gray-500 text-xs mt-6">
          Tap Continue after rotating to landscape
        </p>
      </div>

      {/* Decorative corner elements */}
      <div className="absolute top-8 left-8">
        <div className="w-16 h-16 border-l-2 border-t-2 border-purple-500/30 rounded-tl-xl" />
      </div>
      <div className="absolute bottom-8 right-8">
        <div className="w-16 h-16 border-r-2 border-b-2 border-purple-500/30 rounded-br-xl" />
      </div>
    </div>
  );
}

