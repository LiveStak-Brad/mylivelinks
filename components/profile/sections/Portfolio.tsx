/**
 * Products/Shop Section (Business + Creator)
 *
 * IMPORTANT:
 * - No mock data for visitors.
 * - Owner actions must be wired to real forms + persistence via callbacks.
 * 
 * NOTE: Renamed from "Portfolio" to "Products" to match mobile naming.
 */

'use client';

import { ShoppingBag, Pencil, Trash2, ExternalLink, Video as VideoIcon, Image as ImageIcon, Link2 } from 'lucide-react';
import Image from 'next/image';
import { getEmptyStateText } from '@/lib/mockDataProviders';
import type { ProfileType } from '@/lib/profileTypeConfig';

export type PortfolioItemRow = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  media_type: 'image' | 'video' | 'link';
  media_url: string;
  thumbnail_url?: string | null;
  sort_order?: number | null;
};

interface PortfolioProps {
  profileType?: ProfileType;
  isOwner?: boolean;
  items?: PortfolioItemRow[];
  onAddItem?: () => void;
  onEditItem?: (item: PortfolioItemRow) => void;
  onDeleteItem?: (itemId: string) => void;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
  buttonColor?: string;
}

export default function Portfolio({
  profileType,
  isOwner = false,
  items = [],
  onAddItem,
  onEditItem,
  onDeleteItem,
  cardStyle,
  borderRadiusClass = 'rounded-2xl',
  buttonColor = '#DB2777',
}: PortfolioProps) {
  const emptyState = getEmptyStateText('portfolio', profileType);

  if (!items.length) {
    if (!isOwner) return null;
    return (
      <div
        className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-500" />
            🛍️ Products
          </h2>
        </div>

        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Shop Items Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Add your shop links or individual product links here.</p>
          {typeof onAddItem === 'function' && (
            <button
              onClick={onAddItem}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: buttonColor }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Product
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${borderRadiusClass} p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg mb-6 bg-white/80 dark:bg-gray-800/80`}
      style={cardStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-purple-500" />
          🛍️ Products
        </h2>
        {isOwner && typeof onAddItem === 'function' && (
          <button
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: buttonColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Product
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
          >
            <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700">
              {item.media_type === 'image' ? (
                <Image src={item.media_url} alt={item.title || 'Portfolio item'} fill className="object-cover" />
              ) : item.media_type === 'video' ? (
                <video
                  src={item.media_url}
                  poster={item.thumbnail_url || undefined}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : item.thumbnail_url ? (
                <Image src={item.thumbnail_url} alt={item.title || 'Portfolio link'} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold">
                    <Link2 className="w-5 h-5" />
                    Link
                  </div>
                </div>
              )}

              <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/60 text-white px-3 py-1 text-xs font-semibold">
                {item.media_type === 'image' ? <ImageIcon className="w-4 h-4" /> : null}
                {item.media_type === 'video' ? <VideoIcon className="w-4 h-4" /> : null}
                {item.media_type === 'link' ? <Link2 className="w-4 h-4" /> : null}
                {item.media_type.toUpperCase()}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1 truncate">
                    {item.title || 'Untitled'}
                  </h3>
                  {item.subtitle ? (
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{item.subtitle}</p>
                  ) : null}
                  {item.description ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{item.description}</p>
                  ) : null}
                </div>

                {isOwner && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onEditItem?.(item)}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                    </button>
                    <button
                      onClick={() => onDeleteItem?.(item.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                )}
              </div>

              {item.media_type === 'link' ? (
                <a
                  href={item.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:underline"
                >
                  View
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


