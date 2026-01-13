'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Repeat2, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import MllProBadge from '@/components/mll/MllProBadge';

interface RepostItem {
  repost_id: string;
  reposted_at: string;
  post_id: string;
  title: string | null;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  author_id: string;
  author_username: string;
  author_avatar_url: string | null;
  author_is_mll_pro: boolean;
  post_created_at: string;
}

interface ProfileRepostsTabProps {
  profileId: string;
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}

export default function ProfileRepostsTab({
  profileId,
  cardStyle = {},
  borderRadiusClass = 'rounded-xl',
}: ProfileRepostsTabProps) {
  const [items, setItems] = useState<RepostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadReposts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('rpc_get_profile_reposts', {
          p_profile_id: profileId,
          p_limit: 30,
        });

        if (error) {
          console.error('Error loading reposts:', error);
        } else {
          setItems(data || []);
        }
      } catch (err) {
        console.error('Error loading reposts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReposts();
  }, [profileId, supabase]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className={`${borderRadiusClass} p-8`} style={cardStyle}>
        <div className="grid grid-cols-3 gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[9/16] bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`${borderRadiusClass} p-8 text-center`} style={cardStyle}>
        <Repeat2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-500">No reposts yet</p>
      </div>
    );
  }

  return (
    <div className={`${borderRadiusClass} p-2`} style={cardStyle}>
      <div className="grid grid-cols-3 gap-1">
        {items.map((item) => (
          <Link
            key={item.repost_id}
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
                  alt={item.title || 'Reposted content'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600" />
              );
            })()}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
            
            {/* Repost badge */}
            <div className="absolute top-2 left-2">
              <Repeat2 className="w-4 h-4 text-white drop-shadow-lg" />
            </div>
            
            {/* Play icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-10 h-10 text-white drop-shadow-lg" fill="white" />
            </div>
            
            {/* Stats */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs">
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                {formatCount(item.view_count)}
              </span>
            </div>
            
            {/* Original author */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <span className="text-white text-[10px] bg-black/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                @{item.author_username}
                {item.author_is_mll_pro && <MllProBadge size="compact" className="!h-[1.2em] !w-[1.2em]" clickable={false} />}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
