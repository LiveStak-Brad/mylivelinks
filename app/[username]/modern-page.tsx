'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { UserPlus, UserCheck, Users, Share2, MessageCircle } from 'lucide-react';
import SocialCountsWidget from '@/components/profile/SocialCountsWidget';
import TopSupportersWidget from '@/components/profile/TopSupportersWidget';
import TopStreamersWidget from '@/components/profile/TopStreamersWidget';
import StatsCard from '@/components/profile/StatsCard';
import ModernLinksSection from '@/components/profile/ModernLinksSection';
import AdultLinksSection from '@/components/adult/AdultLinksSection';
import FollowersModal from '@/components/profile/FollowersModal';
import SocialMediaBar from '@/components/profile/SocialMediaBar';
import ProfileLivePlayer from '@/components/ProfileLivePlayer';
import UserConnectionsList from '@/components/UserConnectionsList';

interface ProfileData {
  profile: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    is_live: boolean;
    live_stream_id?: number;
    follower_count: number;
    total_gifts_received: number;
    total_gifts_sent: number;
    gifter_level: number;
    created_at: string;
    // Customization
    profile_bg_url?: string;
    profile_bg_overlay?: string;
    card_color?: string;
    card_opacity?: number;
    card_border_radius?: string;
    font_preset?: string;
    accent_color?: string;
    links_section_title?: string;
    // Social Media
    social_instagram?: string;
    social_twitter?: string;
    social_youtube?: string;
    social_tiktok?: string;
    social_facebook?: string;
    social_twitch?: string;
    social_discord?: string;
    social_snapchat?: string;
    social_linkedin?: string;
    social_github?: string;
    social_spotify?: string;
    social_onlyfans?: string;
    // Display preferences
    hide_streaming_stats?: boolean;
    // Private (only if owner)
    coin_balance?: number;
    earnings_balance?: number;
  };
  links: Array<{
    id: number;
    title: string;
    url: string;
    icon?: string;
    click_count: number;
    display_order: number;
  }>;
  adult_links: Array<{
    id: number;
    title: string;
    url: string;
    icon?: string;
    click_count: number;
    display_order: number;
    adult_category?: string;
    requires_warning: boolean;
  }>;
  show_adult_section: boolean;
  follower_count: number;
  following_count: number;
  friends_count: number;
  relationship: 'none' | 'following' | 'followed_by' | 'friends';
  top_supporters: Array<{
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    gifter_level: number;
    total_gifted: number;
  }>;
  top_streamers: Array<{
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    is_live: boolean;
    diamonds_earned_lifetime: number;
    peak_viewers: number;
    total_streams: number;
  }>;
  stream_stats: {
    total_streams: number;
    total_minutes_live: number;
    total_viewers: number;
    peak_viewers: number;
    diamonds_earned_lifetime: number;
    diamonds_earned_7d: number;
    followers_gained_from_streams: number;
    last_stream_at?: string;
  };
}

export default function ModernProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<number | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeConnectionsTab, setActiveConnectionsTab] = useState<'following' | 'followers' | 'friends'>('following');
  
  const supabase = createClient();
  
  useEffect(() => {
    loadProfile();
    
    // Subscribe to real-time updates for live status
    const channel = supabase
      .channel(`profile_live_status_${username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
          filter: `profile_id=eq.${profileData?.profile?.id}`,
        },
        (payload: any) => {
          console.log('[PROFILE] Live stream status changed:', payload);
          
          // Reload profile to get updated live status
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            loadProfile();
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [username]);
  
  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      // Fetch profile via API
      const response = await fetch(`/api/profile/${username}`);
      const profileData = await response.json();
      
      if (profileData.error) {
        console.error('Profile error:', profileData.error);
        setProfileData(null);
        return;
      }
      
      // Fetch live_stream_id if user is live
      if (profileData.profile.is_live) {
        const { data: liveStream } = await supabase
          .from('live_streams')
          .select('id')
          .eq('profile_id', profileData.profile.id)
          .eq('live_available', true)
          .maybeSingle();
        
        if (liveStream) {
          setLiveStreamId(liveStream.id);
        }
      }
      
      console.log('[PROFILE] Loaded:', {
        username: profileData.profile.username,
        relationship: profileData.relationship,
        isOwnProfile: user?.id === profileData.profile.id
      });
      
      setProfileData(profileData);
      setIsOwnProfile(user?.id === profileData.profile.id);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFollow = async () => {
    if (!profileData || followLoading) return;
    
    setFollowLoading(true);
    try {
      const response = await fetch('/api/profile/follow', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ targetProfileId: profileData.profile.id })
      });
      
      const data = await response.json();
      
      if (response.status === 401) {
        alert('Please log in to follow users');
        router.push('/login?returnUrl=' + encodeURIComponent(`/${username}`));
        return;
      }
      
      if (!response.ok) {
        console.error('Follow failed:', data);
        alert(data.error || 'Failed to follow/unfollow');
        return;
      }
      
      if (data.success) {
        // Update relationship status locally
        const wasFollowing = profileData.relationship !== 'none';
        const isFollowingNow = data.status !== 'none';
        
        console.log('[FOLLOW] Updating state:', {
          oldRelationship: profileData.relationship,
          newRelationship: data.status,
          wasFollowing,
          isFollowingNow
        });
        
        setProfileData(prev => {
          if (!prev) return null;
          
          const updated = {
            ...prev,
            relationship: data.status,
            follower_count: isFollowingNow 
              ? (wasFollowing ? prev.follower_count : prev.follower_count + 1)
              : prev.follower_count - 1
          };
          
          console.log('[FOLLOW] State updated:', {
            relationship: updated.relationship,
            follower_count: updated.follower_count
          });
          
          return updated;
        });
      } else {
        console.error('Follow unsuccessful:', data);
        alert(data.error || 'Failed to follow/unfollow');
      }
    } catch (error) {
      console.error('Follow error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };
  
  const handleShare = async () => {
    const url = `${window.location.origin}/${username}`;
    const title = `${profileData?.profile.display_name || username} on MyLiveLinks`;
    const text = `Check out ${profileData?.profile.display_name || username}'s profile on MyLiveLinks - Live streaming, links, and exclusive content! 🔥`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard with better message
      const shareText = `${text}\n${url}`;
      navigator.clipboard.writeText(shareText);
      alert('Profile link and message copied to clipboard! 🎉');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-32 h-32 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-64 mx-auto mb-2" />
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }
  
  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The user @{username} doesn't exist.
          </p>
          <Link href="/live" className="text-blue-500 hover:text-blue-600">
            Go to Live Room
          </Link>
        </div>
      </div>
    );
  }
  
  const { profile } = profileData;
  
  // Apply customization
  const bgOverlay = profile.profile_bg_overlay || 'dark-medium';
  const overlayClass = {
    'none': '',
    'dark-light': 'bg-black/30',
    'dark-medium': 'bg-black/50',
    'dark-heavy': 'bg-black/70',
    'blur': 'backdrop-blur-sm bg-black/40'
  }[bgOverlay] || 'bg-black/50';
  
  const cardStyle = {
    backgroundColor: profile.card_color || '#FFFFFF',
    opacity: profile.card_opacity || 0.95
  };
  
  const borderRadiusClass = {
    'small': 'rounded-lg',
    'medium': 'rounded-xl',
    'large': 'rounded-2xl'
  }[profile.card_border_radius || 'medium'] || 'rounded-xl';
  
  const fontClass = {
    'modern': 'font-sans',
    'classic': 'font-serif',
    'bold': 'font-bold',
    'minimal': 'font-light'
  }[profile.font_preset || 'modern'] || 'font-sans';
  
  const accentColor = profile.accent_color || '#3B82F6';
  
  // Follow button config
  const getFollowButtonConfig = () => {
    switch (profileData.relationship) {
      case 'friends':
        return {
          icon: Users,
          text: 'Friends',
          className: 'bg-green-500 hover:bg-green-600 text-white'
        };
      case 'following':
        return {
          icon: UserCheck,
          text: 'Following',
          className: 'bg-gray-500 hover:bg-gray-600 text-white'
        };
      default:
        return {
          icon: UserPlus,
          text: 'Follow',
          className: 'text-white'
        };
    }
  };
  
  const followBtnConfig = getFollowButtonConfig();
  const FollowIcon = followBtnConfig.icon;
  
  return (
    <div className={`min-h-screen overflow-y-auto overflow-x-hidden ${fontClass}`}>
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {profile.profile_bg_url ? (
          <Image
            src={profile.profile_bg_url}
            alt="Profile background"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={75}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
        )}
        <div className={`absolute inset-0 ${overlayClass}`} />
      </div>
      
      {/* Content - Scrollable */}
      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-20">
        {/* Login to See Live Banner (if not logged in and profile is live) */}
        {profile.is_live && !currentUser && (
          <div className="mb-4 sm:mb-6">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-4 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="font-bold text-white text-sm">LIVE NOW</span>
                </div>
                <p className="text-white font-semibold">
                  {profile.display_name || profile.username} is streaming live!
                </p>
              </div>
              <Link
                href={`/login?returnTo=/${profile.username}`}
                className="bg-white text-red-500 font-bold px-4 py-2 rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg whitespace-nowrap"
              >
                Login to Watch
              </Link>
            </div>
          </div>
        )}
        
        {/* Live Video Player (if live and logged in) */}
        {profile.is_live && currentUser && (
          <div className={`${borderRadiusClass} overflow-hidden shadow-2xl mb-4 sm:mb-6`}>
            <ProfileLivePlayer
              profileId={profile.id}
              username={profile.username}
              liveStreamId={liveStreamId}
              className="w-full aspect-video"
            />
          </div>
        )}
        
        {/* Hero Section */}
        <div className={`${borderRadiusClass} overflow-hidden shadow-2xl mb-4 sm:mb-6`} style={cardStyle}>
          <div className="p-4 sm:p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {profile.avatar_url ? (
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-white/50 shadow-lg">
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 96px, 128px"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold ring-4 ring-white/50 shadow-lg"
                    style={{ backgroundColor: accentColor }}
                  >
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
                {profile.is_live && (
                  <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 sm:px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 text-center md:text-left w-full">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 break-words">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg mb-3">
                  @{profile.username}
                </p>
                
                {profile.bio && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-2xl text-sm sm:text-base break-words">
                    {profile.bio}
                  </p>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center md:justify-start">
                  {!isOwnProfile && (
                    <>
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm sm:text-base ${followBtnConfig.className}`}
                        style={{ backgroundColor: profileData.relationship === 'none' ? accentColor : undefined }}
                      >
                        <FollowIcon size={18} className="sm:w-5 sm:h-5" />
                        {followLoading ? 'Loading...' : followBtnConfig.text}
                      </button>
                      
                      <button className="px-4 sm:px-6 py-2 rounded-lg font-semibold transition bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 text-sm sm:text-base">
                        <MessageCircle size={18} className="sm:w-5 sm:h-5" />
                        Message
                      </button>
                    </>
                  )}
                  
                  {isOwnProfile && (
                    <Link
                      href="/settings/profile"
                      className="px-4 sm:px-6 py-2 rounded-lg font-semibold transition bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm sm:text-base"
                    >
                      Edit Profile
                    </Link>
                  )}
                  
                  <button
                    onClick={handleShare}
                    className="px-4 sm:px-6 py-2 rounded-lg font-semibold transition bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Share2 size={18} className="sm:w-5 sm:h-5" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats & Social Grid - Hide if hideStreamingStats is true */}
        {!profile.hide_streaming_stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
            <SocialCountsWidget
              followerCount={profileData.follower_count}
              followingCount={profileData.following_count}
              friendsCount={profileData.friends_count}
              onShowFollowers={() => setShowFollowersModal(true)}
              onShowFollowing={() => setShowFollowingModal(true)}
              onShowFriends={() => setShowFriendsModal(true)}
              cardStyle={cardStyle}
              borderRadiusClass={borderRadiusClass}
              accentColor={accentColor}
            />
            
            <TopSupportersWidget
              supporters={profileData.top_supporters}
              cardStyle={cardStyle}
              borderRadiusClass={borderRadiusClass}
              accentColor={accentColor}
            />
            
            <TopStreamersWidget
              streamers={profileData.top_streamers}
              cardStyle={cardStyle}
              borderRadiusClass={borderRadiusClass}
              accentColor={accentColor}
            />
          </div>
        )}
        
        {/* Social Media Bar */}
        {(profile.social_instagram || profile.social_twitter || profile.social_youtube || 
          profile.social_tiktok || profile.social_facebook || profile.social_twitch ||
          profile.social_discord || profile.social_snapchat || profile.social_linkedin ||
          profile.social_github || profile.social_spotify || profile.social_onlyfans) && (
          <div className={`${borderRadiusClass} overflow-hidden shadow-lg mb-4 sm:mb-6 p-4 sm:p-6`} style={cardStyle}>
            <SocialMediaBar
              socials={{
                social_instagram: profile.social_instagram,
                social_twitter: profile.social_twitter,
                social_youtube: profile.social_youtube,
                social_tiktok: profile.social_tiktok,
                social_facebook: profile.social_facebook,
                social_twitch: profile.social_twitch,
                social_discord: profile.social_discord,
                social_snapchat: profile.social_snapchat,
                social_linkedin: profile.social_linkedin,
                social_github: profile.social_github,
                social_spotify: profile.social_spotify,
                social_onlyfans: profile.social_onlyfans
              }}
              accentColor={accentColor}
            />
          </div>
        )}
        
        {/* Connections Section - Following, Followers, Friends */}
        <div className={`${borderRadiusClass} overflow-hidden shadow-lg mb-4 sm:mb-6`} style={cardStyle}>
          <div className="p-4 sm:p-6">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
              <button
                onClick={() => setActiveConnectionsTab('following')}
                className={`flex-1 px-4 py-3 text-sm sm:text-base font-semibold transition-colors border-b-2 ${
                  activeConnectionsTab === 'following'
                    ? 'border-purple-500 text-purple-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                style={activeConnectionsTab === 'following' ? { borderColor: accentColor, color: accentColor } : {}}
              >
                Following ({profileData.following_count})
              </button>
              <button
                onClick={() => setActiveConnectionsTab('followers')}
                className={`flex-1 px-4 py-3 text-sm sm:text-base font-semibold transition-colors border-b-2 ${
                  activeConnectionsTab === 'followers'
                    ? 'border-purple-500 text-purple-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                style={activeConnectionsTab === 'followers' ? { borderColor: accentColor, color: accentColor } : {}}
              >
                Followers ({profileData.follower_count})
              </button>
              <button
                onClick={() => setActiveConnectionsTab('friends')}
                className={`flex-1 px-4 py-3 text-sm sm:text-base font-semibold transition-colors border-b-2 ${
                  activeConnectionsTab === 'friends'
                    ? 'border-purple-500 text-purple-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                style={activeConnectionsTab === 'friends' ? { borderColor: accentColor, color: accentColor } : {}}
              >
                Friends ({profileData.friends_count})
              </button>
            </div>
            
            {/* Tab Content */}
            <UserConnectionsList
              userId={profile.id}
              listType={activeConnectionsTab}
              currentUserId={currentUser?.id}
            />
          </div>
        </div>
        
        {/* Links Section */}
        {profileData.links.length > 0 && (
          <ModernLinksSection
            links={profileData.links}
            sectionTitle={profile.links_section_title || 'My Links'}
            cardStyle={cardStyle}
            borderRadiusClass={borderRadiusClass}
            accentColor={accentColor}
            isOwner={isOwnProfile}
          />
        )}
        
        {/* Adult Links Section (WEB ONLY, 18+, CONSENT REQUIRED) */}
        <AdultLinksSection
          links={profileData.adult_links || []}
          show={profileData.show_adult_section || false}
          cardStyle={cardStyle}
          borderRadiusClass={borderRadiusClass}
          accentColor={accentColor}
        />
        
        {/* Stats Card - Hide if hideStreamingStats is true */}
        {!profile.hide_streaming_stats && (
          <StatsCard
            streamStats={profileData.stream_stats}
            gifterLevel={profile.gifter_level}
            totalGiftsSent={profile.total_gifts_sent}
            totalGiftsReceived={profile.total_gifts_received}
            cardStyle={cardStyle}
            borderRadiusClass={borderRadiusClass}
            accentColor={accentColor}
          />
        )}
        
        {/* Premium Branding Footer - Powered by MyLiveLinks */}
        <div className={`${borderRadiusClass} overflow-hidden shadow-lg mt-6 p-6 sm:p-8 text-center`} style={cardStyle}>
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Image
                src="/branding/mylivelinkstransparent.png"
                alt="MyLiveLinks"
                width={240}
                height={60}
                className="h-12 sm:h-16 w-auto"
                priority
              />
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Create your own stunning profile, go live, and connect with your audience.
            </p>
            
            <Link
              href="/signup"
              className="inline-block px-8 py-3 rounded-lg font-semibold text-white text-base transition shadow-lg hover:shadow-xl transform hover:scale-105"
              style={{ backgroundColor: accentColor }}
            >
              Create Your Free Profile
            </Link>
            
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
              All-in-one platform: Live streaming • Links • Social • Monetization
            </p>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showFollowersModal && (
        <FollowersModal
          profileId={profile.id}
          onClose={() => setShowFollowersModal(false)}
        />
      )}
      
      {showFollowingModal && (
        <FollowersModal
          profileId={profile.id}
          type="following"
          onClose={() => setShowFollowingModal(false)}
        />
      )}
      
      {showFriendsModal && (
        <FollowersModal
          profileId={profile.id}
          type="friends"
          onClose={() => setShowFriendsModal(false)}
        />
      )}
    </div>
  );
}

