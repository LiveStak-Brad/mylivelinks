'use client';

/**
 * ProfilePage Pattern Template
 * 
 * Use for: User profiles, creator pages
 * Examples: /[username], /u/[username]
 * 
 * Features:
 * - Banner and avatar header
 * - Stats section
 * - Bio and links
 * - Content tabs (posts, streams, etc.)
 * - Follow/message actions
 * - Mobile-optimized layout
 */

import { ReactNode, useState } from 'react';
import Image from 'next/image';
import { Button, IconButton, Badge, Skeleton } from '@/components/ui';
import { ArrowLeft, Share2, MoreHorizontal, MapPin, Link as LinkIcon, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface ProfileTab {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export interface ProfileStat {
  label: string;
  value: number | string;
  onClick?: () => void;
}

export interface ProfilePageProps {
  /** User's display name */
  displayName: string;
  /** Username with @ */
  username: string;
  /** Avatar URL */
  avatarUrl?: string | null;
  /** Banner URL */
  bannerUrl?: string | null;
  /** Bio text */
  bio?: string | null;
  /** Location */
  location?: string | null;
  /** Website URL */
  website?: string | null;
  /** Join date */
  joinDate?: string | null;
  /** Is this the current user's profile */
  isOwnProfile?: boolean;
  /** Is user verified */
  isVerified?: boolean;
  /** Is user live streaming */
  isLive?: boolean;
  /** Profile stats (followers, following, etc.) */
  stats?: ProfileStat[];
  /** Badges to display */
  badges?: ReactNode;
  /** Content tabs */
  tabs?: ProfileTab[];
  /** Default active tab */
  defaultTab?: string;
  /** Primary action button (Follow, Edit Profile, etc.) */
  primaryAction?: ReactNode;
  /** Secondary actions (Message, Share, etc.) */
  secondaryActions?: ReactNode;
  /** Additional header content */
  headerExtra?: ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Show back button */
  showBackButton?: boolean;
  /** Custom back handler */
  onBack?: () => void;
}

export function ProfilePage({
  displayName,
  username,
  avatarUrl,
  bannerUrl,
  bio,
  location,
  website,
  joinDate,
  isOwnProfile = false,
  isVerified = false,
  isLive = false,
  stats = [],
  badges,
  tabs = [],
  defaultTab,
  primaryAction,
  secondaryActions,
  headerExtra,
  isLoading = false,
  showBackButton = true,
  onBack,
}: ProfilePageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  if (isLoading) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-32 sm:h-48 md:h-56 bg-gradient-to-br from-primary/20 to-accent/20">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt="Profile banner"
            fill
            className="object-cover"
            priority
          />
        )}
        
        {/* Back button overlay */}
        {showBackButton && (
          <div className="absolute top-4 left-4 z-10">
            <IconButton
              variant="ghost"
              size="md"
              onClick={handleBack}
              aria-label="Go back"
              className="bg-background/50 backdrop-blur-sm hover:bg-background/70"
            >
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
          </div>
        )}
        
        {/* Share button */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <IconButton
            variant="ghost"
            size="md"
            aria-label="Share profile"
            className="bg-background/50 backdrop-blur-sm hover:bg-background/70"
          >
            <Share2 className="w-5 h-5" />
          </IconButton>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative px-4 md:px-6 max-w-4xl mx-auto">
        {/* Avatar */}
        <div className="relative -mt-16 sm:-mt-20 mb-4 flex justify-between items-end">
          <div className="relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-background bg-muted overflow-hidden">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl sm:text-4xl font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Live indicator */}
            {isLive && (
              <div className="absolute bottom-0 right-0 px-2 py-1 bg-destructive text-white text-xs font-bold rounded-full border-2 border-background animate-pulse">
                LIVE
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-2">
            {secondaryActions}
            {primaryAction}
          </div>
        </div>

        {/* Name and username */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {displayName}
            </h1>
            {isVerified && (
              <Badge variant="primary" size="sm">Verified</Badge>
            )}
            {badges}
          </div>
          <p className="text-muted-foreground">@{username}</p>
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-foreground mb-3 whitespace-pre-wrap">{bio}</p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-4">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {location}
            </span>
          )}
          {website && (
            <a 
              href={website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <LinkIcon className="w-4 h-4" />
              {website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {joinDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Joined {joinDate}
            </span>
          )}
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="flex gap-4 mb-4">
            {stats.map((stat, index) => (
              <button
                key={index}
                onClick={stat.onClick}
                className={`text-sm ${stat.onClick ? 'hover:underline cursor-pointer' : ''}`}
                disabled={!stat.onClick}
              >
                <span className="font-bold text-foreground">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </span>{' '}
                <span className="text-muted-foreground">{stat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Extra header content */}
        {headerExtra}
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <>
          <div className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="max-w-4xl mx-auto px-4 md:px-6">
              <div className="flex overflow-x-auto scrollbar-hidden">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-3 text-sm font-medium 
                      border-b-2 transition whitespace-nowrap mobile-touch-target
                      ${activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      }
                    `}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                        {tab.count.toLocaleString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={activeTab === tab.id ? 'animate-fade-in' : 'hidden'}
              >
                {tab.content}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Banner skeleton */}
      <Skeleton className="h-32 sm:h-48 md:h-56 w-full rounded-none" />
      
      <div className="relative px-4 md:px-6 max-w-4xl mx-auto">
        {/* Avatar skeleton */}
        <div className="-mt-16 sm:-mt-20 mb-4 flex justify-between items-end">
          <Skeleton variant="circle" className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        
        {/* Name skeleton */}
        <div className="mb-3 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        
        {/* Bio skeleton */}
        <Skeleton variant="text" lines={2} className="mb-4" />
        
        {/* Stats skeleton */}
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;


