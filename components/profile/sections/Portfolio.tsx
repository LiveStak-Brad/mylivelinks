/**
 * Portfolio Section (Business/Creator Profile Types)
 * 
 * Displays portfolio items with images and descriptions in a grid.
 * Shows empty state with owner CTA if no items available.
 */

'use client';

import { Briefcase } from 'lucide-react';
import { getMockPortfolio, getEmptyStateText, PortfolioItem } from '@/lib/mockDataProviders';
import { ProfileType } from '@/lib/profileTypeConfig';
import Image from 'next/image';

interface PortfolioProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  items?: PortfolioItem[]; // Real data when available
  onAddItem?: () => void;
}

export default function Portfolio({ 
  profileType, 
  isOwner = false,
  items,
  onAddItem,
}: PortfolioProps) {
  // Use real data if provided, otherwise fall back to mock data
  const portfolioItems = items || getMockPortfolio(profileType);
  const emptyState = getEmptyStateText('portfolio', profileType);

  // Empty state
  if (portfolioItems.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-500" />
            🎨 Portfolio
          </h2>
        </div>
        
        <div className="text-center py-12">
          <Briefcase className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {emptyState.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {emptyState.text}
          </p>
          {isOwner && (
            <button
              onClick={onAddItem}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
            >
              {emptyState.ownerCTA}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-purple-500" />
          🎨 Portfolio
        </h2>
        {isOwner && (
          <button
            onClick={onAddItem}
            className="text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            + Add Item
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {portfolioItems.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="relative w-full h-48">
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4 bg-white dark:bg-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

