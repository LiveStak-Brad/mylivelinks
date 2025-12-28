/**
 * Merchandise Section (Musician/Comedian Profile Types)
 * 
 * Displays merch products with images, prices, and purchase links.
 * Shows empty state with owner CTA if no products available.
 */

'use client';

import { ShoppingBag } from 'lucide-react';
import { getMockMerchandise, getEmptyStateText, Product } from '@/lib/mockDataProviders';
import { ProfileType } from '@/lib/profileTypeConfig';
import Image from 'next/image';

interface MerchandiseProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  products?: Product[]; // Real data when available
  onAddProduct?: () => void;
}

export default function Merchandise({ 
  profileType, 
  isOwner = false,
  products,
  onAddProduct,
}: MerchandiseProps) {
  // Use real data if provided, otherwise fall back to mock data
  const merchandise = products || getMockMerchandise(profileType);
  const emptyState = getEmptyStateText('merchandise', profileType);

  // Empty state
  if (merchandise.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-500" />
            🛍️ Merchandise
          </h2>
        </div>
        
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {emptyState.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {emptyState.text}
          </p>
          {isOwner && (
            <button
              onClick={onAddProduct}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
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
          <ShoppingBag className="w-5 h-5 text-green-500" />
          🛍️ Merchandise
        </h2>
        {isOwner && (
          <button
            onClick={onAddProduct}
            className="text-sm font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
          >
            + Add Product
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {merchandise.map((product) => (
          <div
            key={product.id}
            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30 hover:shadow-md transition-shadow"
          >
            {product.imageUrl && (
              <div className="relative w-full h-40 mb-3 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              {product.name}
            </h3>
            <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 mb-2">
              ${product.price.toFixed(2)}
            </p>
            {product.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {product.description}
              </p>
            )}
            <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm">
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

