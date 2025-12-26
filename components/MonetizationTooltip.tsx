'use client';

import { useState } from 'react';

interface MonetizationTooltipProps {
  type: 'coins' | 'diamonds' | 'conversion' | 'gift';
  children: React.ReactNode;
}

export default function MonetizationTooltip({ type, children }: MonetizationTooltipProps) {
  const [show, setShow] = useState(false);

  const tooltipContent = {
    coins: {
      title: 'Coins',
      description: 'Purchased currency. Buy coins to send gifts to streamers. Coins are never earned for free.',
    },
    diamonds: {
      title: 'Diamonds',
      description: 'Earned currency. Receive diamonds when viewers send you gifts. Convert diamonds to coins with a 40% platform fee.',
    },
    conversion: {
      title: 'Diamond Conversion',
      description: 'Convert diamonds to coins with a 40% platform fee. Minimum 2 diamonds required.',
    },
    gift: {
      title: 'Send Gift',
      description: 'Spend coins to send gifts. Streamer receives diamonds (1:1 with coins spent). Platform earns revenue from conversion fees.',
    },
  };

  const content = tooltipContent[type];

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-xl p-3 z-50">
          <div className="font-semibold mb-1">{content.title}</div>
          <div className="text-xs text-gray-300">{content.description}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
}


