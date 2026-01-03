'use client';

import { useState, useEffect } from 'react';

interface GiftAnimationProps {
  giftName: string;
  giftIcon?: string;
  senderUsername: string;
  coinAmount: number;
  onComplete: () => void;
}

export default function GiftAnimation({
  giftName,
  giftIcon,
  senderUsername,
  coinAmount,
  onComplete,
}: GiftAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const computeScale = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      if (w <= 420) return 0.55;
      if (w <= 640) return 0.7;
      if (w <= 900) return 0.85;
      return 1;
    };

    const apply = () => setScale(computeScale());
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  useEffect(() => {
    // Animation duration: 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Map gift names to emojis (fallback if no icon_url - matches GiftModal)
  const getGiftEmoji = (name: string) => {
    const emojiMap: { [key: string]: string } = {
      'Rose': '🌹',
      'Heart': '❤️',
      'Star': '⭐',
      'Diamond': '💎',
      'Super Star': '🌟',
      'Crown': '👑',
      'Platinum': '💠',
      'Legendary': '🏆',
      'Fire': '🔥',
      'Rocket': '🚀',
      'Rainbow': '🌈',
      'Unicorn': '🦄',
      'Party': '🎉',
      'Confetti': '🎊',
      'Champagne': '🍾',
      'Money': '💰',
      'Cash': '💵',
      'Gold': '🥇',
      'Silver': '🥈',
      'Bronze': '🥉',
      'Kiss': '💋',
      'Hug': '🤗',
      'Love': '💕',
      'Sparkle': '✨',
      'Gem': '💎',
      'Crystal': '🔮',
      'Music': '🎵',
      'Microphone': '🎤',
      'Camera': '📸',
      'Clap': '👏',
      'Thumbs Up': '👍',
      'Wave': '👋',
      'Flex': '💪',
      'Cool': '😎',
      'Hot': '🥵',
      'VIP': '🎯',
      'King': '🤴',
      'Queen': '👸',
      'Angel': '😇',
      'Devil': '😈',
    };
    return emojiMap[name] || '🎁';
  };

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 via-transparent to-transparent animate-pulse" />
      
      {/* Gift animation */}
      <div
        className="relative z-10 text-center animate-gift-bounce"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        {/* Gift icon */}
        <div className="mb-4 animate-gift-spin">
          {giftIcon ? (
            <img src={giftIcon} alt={giftName} className="w-24 h-24 mx-auto drop-shadow-2xl" />
          ) : (
            <div className="text-8xl drop-shadow-2xl filter brightness-125">
              {getGiftEmoji(giftName)}
            </div>
          )}
        </div>
        
        {/* Gift info */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-sm">
          <p className="text-lg font-bold drop-shadow-lg">
            {senderUsername} sent {giftName}!
          </p>
          <p className="text-sm opacity-90">
            +{coinAmount} coins
          </p>
        </div>
      </div>
      
      {/* Sparkles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

