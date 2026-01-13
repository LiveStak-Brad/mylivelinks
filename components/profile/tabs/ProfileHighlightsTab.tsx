'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Star, Plus, Play } from 'lucide-react';
import Image from 'next/image';

interface HighlightCollection {
  highlight_id: string;
  title: string;
  cover_url: string | null;
  item_count: number;
  created_at: string;
}

interface HighlightItem {
  item_id: string;
  post_id: string;
  title: string | null;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
}

interface ProfileHighlightsTabProps {
  profileId: string;
  isOwner?: boolean;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}

export default function ProfileHighlightsTab({
  profileId,
  isOwner = false,
  cardStyle = {},
  borderRadiusClass = 'rounded-xl',
}: ProfileHighlightsTabProps) {
  const [collections, setCollections] = useState<HighlightCollection[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [highlightItems, setHighlightItems] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const loadHighlights = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('rpc_get_profile_highlights', {
          p_profile_id: profileId,
        });

        if (error) {
          console.error('Error loading highlights:', error);
        } else {
          setCollections(data || []);
        }
      } catch (err) {
        console.error('Error loading highlights:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHighlights();
  }, [profileId, supabase]);

  const loadHighlightItems = async (highlightId: string) => {
    setLoadingItems(true);
    setSelectedHighlight(highlightId);
    try {
      const { data, error } = await supabase.rpc('rpc_get_highlight_items', {
        p_highlight_id: highlightId,
      });

      if (error) {
        console.error('Error loading highlight items:', error);
      } else {
        setHighlightItems(data || []);
      }
    } catch (err) {
      console.error('Error loading highlight items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className={`${borderRadiusClass} p-8`} style={cardStyle}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className={`${borderRadiusClass} p-8 text-center`} style={cardStyle}>
        <Star className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500">No highlights yet</p>
        {isOwner && (
          <p className="text-gray-400 text-sm mt-1">Create highlights to showcase your best content</p>
        )}
      </div>
    );
  }

  // If viewing items from a selected highlight
  if (selectedHighlight) {
    const collection = collections.find(c => c.highlight_id === selectedHighlight);
    
    return (
      <div className={`${borderRadiusClass}`} style={cardStyle}>
        {/* Back button and title */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setSelectedHighlight(null);
              setHighlightItems([]);
            }}
            className="text-purple-500 hover:text-purple-600 font-medium"
          >
            ← Back
          </button>
          <h3 className="font-semibold text-lg">{collection?.title}</h3>
        </div>
        
        {/* Items grid */}
        <div className="p-2">
          {loadingItems ? (
            <div className="grid grid-cols-3 gap-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[9/16] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : highlightItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No items in this highlight
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {highlightItems.map((item) => (
                <a
                  key={item.item_id}
                  href={`/post/${item.post_id}`}
                  className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden group"
                >
                  {(() => {
                    // Use thumbnail if available, or media_url if it's an image (not video)
                    const isImage = item.media_url && /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(item.media_url);
                    const imageUrl = item.thumbnail_url || (isImage ? item.media_url : null);
                    
                    return imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.title || 'Highlight item'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600" />
                    );
                  })()}
                  
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-white drop-shadow-lg" fill="white" />
                  </div>
                  
                  <div className="absolute bottom-2 left-2 text-white text-xs">
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {formatCount(item.view_count)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show highlight collections
  return (
    <div className={`${borderRadiusClass} p-4`} style={cardStyle}>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* Add highlight button (owner only) */}
        {isOwner && (
          <button
            className="flex-shrink-0 flex flex-col items-center gap-2"
            onClick={() => {
              // TODO: Open create highlight modal
              console.log('Create highlight');
            }}
          >
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-purple-500 transition-colors">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <span className="text-xs text-gray-500">New</span>
          </button>
        )}
        
        {/* Highlight collections */}
        {collections.map((collection) => (
          <button
            key={collection.highlight_id}
            className="flex-shrink-0 flex flex-col items-center gap-2"
            onClick={() => loadHighlightItems(collection.highlight_id)}
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
              <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 overflow-hidden">
                {collection.cover_url ? (
                  <Image
                    src={collection.cover_url}
                    alt={collection.title}
                    width={80}
                    height={80}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-center max-w-[80px] truncate">
              {collection.title}
            </span>
            <span className="text-[10px] text-gray-400">
              {collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
