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

interface ProfileData {
  profile: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    is_live: boolean;
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
  
  const supabase = createClient();
  
  useEffect(() => {
    loadProfile();
  }, [username]);
  
  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch profile via API
      const response = await fetch(`/api/profile/${username}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Profile error:', data.error);
        setProfileData(null);
        return;
      }
      
      setProfileData(data);
      setIsOwnProfile(user?.id === data.profile.id);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfileId: profileData.profile.id })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update relationship status locally
        setProfileData(prev => prev ? {
          ...prev,
          relationship: data.status,
          follower_count: data.status === 'none' 
            ? prev.follower_count - 1 
            : prev.follower_count + 1
        } : null);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };
  
  const handleShare = async () => {
    const url = `${window.location.origin}/${username}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profileData?.profile.display_name || username}'s Profile`,
          url
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
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
    <div className={`min-h-screen ${fontClass}`}>
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {profile.profile_bg_url ? (
          <Image
            src={profile.profile_bg_url}
            alt="Profile background"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
        )}
        <div className={`absolute inset-0 ${overlayClass}`} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className={`${borderRadiusClass} overflow-hidden shadow-2xl mb-6`} style={cardStyle}>
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {profile.avatar_url ? (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/50 shadow-lg">
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white/50 shadow-lg"
                    style={{ backgroundColor: accentColor }}
                  >
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
                {profile.is_live && (
                  <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-3">
                  @{profile.username}
                </p>
                
                {profile.bio && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-2xl">
                    {profile.bio}
                  </p>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {!isOwnProfile && (
                    <>
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${followBtnConfig.className}`}
                        style={{ backgroundColor: profileData.relationship === 'none' ? accentColor : undefined }}
                      >
                        <FollowIcon size={20} />
                        {followLoading ? 'Loading...' : followBtnConfig.text}
                      </button>
                      
                      <button className="px-6 py-2 rounded-lg font-semibold transition bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2">
                        <MessageCircle size={20} />
                        Message
                      </button>
                    </>
                  )}
                  
                  {isOwnProfile && (
                    <Link
                      href="/settings/profile"
                      className="px-6 py-2 rounded-lg font-semibold transition bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Edit Profile
                    </Link>
                  )}
                  
                  <button
                    onClick={handleShare}
                    className="px-6 py-2 rounded-lg font-semibold transition bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <Share2 size={20} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats & Social Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
        
        {/* Social Media Bar */}
        {(profile.social_instagram || profile.social_twitter || profile.social_youtube || 
          profile.social_tiktok || profile.social_facebook || profile.social_twitch ||
          profile.social_discord || profile.social_snapchat || profile.social_linkedin ||
          profile.social_github || profile.social_spotify || profile.social_onlyfans) && (
          <div className={`${borderRadiusClass} overflow-hidden shadow-lg mb-6 p-6`} style={cardStyle}>
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
        
        {/* Stats Card */}
        <StatsCard
          streamStats={profileData.stream_stats}
          gifterLevel={profile.gifter_level}
          totalGiftsSent={profile.total_gifts_sent}
          totalGiftsReceived={profile.total_gifts_received}
          cardStyle={cardStyle}
          borderRadiusClass={borderRadiusClass}
          accentColor={accentColor}
        />
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

