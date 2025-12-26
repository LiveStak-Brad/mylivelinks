'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UserPlus, Check, ExternalLink, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { StatusBadge, LiveDot } from '@/components/ui';
import { Tooltip } from '@/components/ui/Tooltip';

interface ProfileCardProps {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    follower_count: number;
    is_live: boolean;
  };
  currentUserId: string | null;
  onFollow?: (profileId: string, isFollowing: boolean) => void;
}

export default function ProfileCard({ profile, currentUserId, onFollow }: ProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsYou, setFollowsYou] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const supabase = createClient();

  // Check follow status on mount
  useEffect(() => {
    if (!currentUserId) return;
    
    const checkFollowStatus = async () => {
      // Check if you follow them
      const { data: youFollowThem } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('followee_id', profile.id)
        .maybeSingle();
      
      setIsFollowing(!!youFollowThem);

      // Check if they follow you
      const { data: theyFollowYou } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', profile.id)
        .eq('followee_id', currentUserId)
        .maybeSingle();
      
      setFollowsYou(!!theyFollowYou);
    };
    
    checkFollowStatus();
  }, [currentUserId, profile.id, supabase]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUserId || followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followee_id', profile.id);
        setIsFollowing(false);
        onFollow?.(profile.id, false);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            followee_id: profile.id
          });
        setIsFollowing(true);
        onFollow?.(profile.id, true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const displayName = profile.display_name || profile.username;
  const truncatedBio = profile.bio ? (profile.bio.length > 80 ? profile.bio.substring(0, 80) + '...' : profile.bio) : 'No bio yet';

  return (
    <div 
      className="relative flex-shrink-0 w-72 group"
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      {/* Card */}
      <Link
        href={`/${profile.username}`}
        className="block bg-card rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-border hover:border-primary/50 group-hover:scale-[1.02]"
      >
        {/* Avatar & Live Badge */}
        <div className="relative h-48 bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />
          </div>
          
          {/* Avatar */}
          <div className="relative">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={120}
                height={120}
                className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-xl ring-4 ring-white/20"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-card flex items-center justify-center border-4 border-white shadow-xl ring-4 ring-white/20">
                <span className="text-4xl font-bold gradient-text">
                  {(displayName?.charAt(0) ?? '?').toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Live indicator on avatar */}
            {profile.is_live && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-red-500 flex items-center justify-center">
                <LiveDot />
              </div>
            )}
          </div>
          
          {/* Status Badge */}
          {profile.is_live && (
            <div className="absolute top-4 right-4">
              <StatusBadge variant="live" size="sm" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {displayName}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              @{profile.username}
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {truncatedBio}
          </p>
          
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Tooltip content={`${profile.follower_count.toLocaleString()} followers`} position="bottom">
              <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {profile.follower_count >= 1000 
                    ? `${(profile.follower_count / 1000).toFixed(1)}K` 
                    : profile.follower_count.toLocaleString()
                  }
                </span>
              </div>
            </Tooltip>
            
            {currentUserId && currentUserId !== profile.id && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200
                  ${isFollowing
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : followsYou
                    ? 'bg-primary/10 text-primary border-2 border-primary/30 hover:bg-primary/20'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
                  } 
                  disabled:opacity-50 hover:scale-105 active:scale-95
                `}
              >
                {followLoading ? (
                  <span className="animate-pulse">...</span>
                ) : isFollowing ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Following
                  </>
                ) : followsYou ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Follow Back
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Link>

      {/* Hover Popup - Desktop Only */}
      {showPopup && (
        <div className="hidden md:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-80 bg-card rounded-2xl shadow-2xl border border-border p-5 z-50 pointer-events-none animate-fade-in">
          {/* Arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-r border-b border-border rotate-45" />
          
          <div className="flex items-start gap-4 mb-4">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={60}
                height={60}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-border">
                <span className="text-2xl font-bold text-white">
                  {(displayName?.charAt(0) ?? '?').toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-foreground truncate">
                {displayName}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                @{profile.username}
              </p>
              {profile.is_live && (
                <StatusBadge variant="live" size="xs" className="mt-2" />
              )}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {profile.bio || 'No bio yet'}
          </p>
          
          <div className="flex items-center justify-between text-sm pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{profile.follower_count.toLocaleString()} followers</span>
            </div>
            <span className="text-primary flex items-center gap-1 font-medium">
              View Profile <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
