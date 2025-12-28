'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import {
  UserPlus,
  UserCheck,
  Users,
  Share2,
  MessageCircle,
  BarChart3,
  Flame,
  Trophy,
  Star,
  Info,
  LayoutGrid,
  Image as ImageIcon,
  Video,
  Clapperboard,
  Music,
  Calendar,
  ShoppingCart,
} from 'lucide-react';
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
import ProfileTypeBadge, { ProfileType } from '@/components/profile/ProfileTypeBadge';
import {
  getEnabledTabs,
  isSectionEnabled,
  type ProfileTab as ConfigProfileTab,
  type ProfileType as ConfigProfileType,
} from '@/lib/profileTypeConfig';
import {
  MusicShowcase,
  MusicVideos,
  ComedySpecials,
  UpcomingEvents,
  Merchandise,
  BusinessInfo,
  Portfolio,
  Schedule,
  TabEmptyState,
} from '@/components/profile/sections';
import SectionEditModal from '@/components/profile/edit/SectionEditModal';
import type { MusicTrackRow } from '@/components/profile/sections/MusicShowcase';
import type { ShowEventRow } from '@/components/profile/sections/UpcomingEvents';
import type { PortfolioItemRow } from '@/components/profile/sections/Portfolio';
import type { ScheduleItemRow } from '@/components/profile/sections/Schedule';
import PublicFeedClient from '@/components/feed/PublicFeedClient';
import ProfilePhotosClient from '@/components/photos/ProfilePhotosClient';
import VlogReelsClient from '@/components/profile/VlogReelsClient';
import { ReferralProgressModule } from '@/components/referral';

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
    profile_type?: ProfileType;
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
  gifter_statuses?: Record<string, any>;
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

  streak_days?: number;
  gifter_rank?: number;
  streamer_rank?: number;
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
  const [activeTab, setActiveTab] = useState<string>('info');
  const [activeConnectionsTab, setActiveConnectionsTab] = useState<'following' | 'followers' | 'friends'>('following');
  const [connectionsExpanded, setConnectionsExpanded] = useState(true);

  // Profile-type modules (real data; no mocks for visitors)
  const [musicTracks, setMusicTracks] = useState<MusicTrackRow[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ShowEventRow[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemRow[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItemRow[]>([]);
  const [modulesReloadNonce, setModulesReloadNonce] = useState(0);

  // Universal edit modals (one at a time)
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrackRow | null>(null);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ShowEventRow | null>(null);

  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioItemRow | null>(null);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItemRow | null>(null);
  
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

      const cleanedProfileData = {
        ...profileData,
        gifter_statuses:
          profileData && typeof profileData === 'object' && typeof (profileData as any).gifter_statuses === 'object'
            ? (profileData as any).gifter_statuses
            : {},
        top_supporters: Array.isArray(profileData?.top_supporters)
          ? profileData.top_supporters.filter((s: any) => Number(s?.total_gifted ?? 0) > 0)
          : [],
        top_streamers: Array.isArray(profileData?.top_streamers)
          ? profileData.top_streamers.filter((s: any) => Number(s?.diamonds_earned_lifetime ?? 0) > 0)
          : [],
      };

      setProfileData(cleanedProfileData);
      setIsOwnProfile(user?.id === profileData.profile.id);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tabs validation: Ensure active tab is valid for this profile type (must run before early returns).
  useEffect(() => {
    if (!profileData?.profile) return;
    const profile = profileData.profile;
    const enabledTabs = getEnabledTabs((profile.profile_type || 'creator') as ConfigProfileType);
    if (!enabledTabs?.length) return;
    const allowed = new Set(enabledTabs.map((t) => t.id));
    if (!allowed.has(activeTab as any)) {
      setActiveTab(enabledTabs[0].id);
    }
    // Only re-run when profile type changes or profileData loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData?.profile?.profile_type]);

  // Load profile-type module data (tracks + profile_content_blocks) after the main profile loads.
  useEffect(() => {
    const profileId = profileData?.profile?.id;
    if (!profileId) {
      setMusicTracks([]);
      setUpcomingEvents([]);
      setPortfolioItems([]);
      setScheduleItems([]);
      return;
    }

    let cancelled = false;

    const getBlocksByType = (blocks: any, blockType: string): any[] => {
      const byType = blocks?.blocks_by_type?.[blockType];
      if (Array.isArray(byType)) return byType;
      const direct = blocks?.[blockType];
      return Array.isArray(direct) ? direct : [];
    };

    const load = async () => {
      // Music tracks (musician)
      try {
        const { data, error } = await supabase.rpc('get_music_tracks', { p_profile_id: profileId });
        if (!cancelled) {
          if (error) {
            console.error('[ProfileModules] get_music_tracks failed:', error);
            setMusicTracks([]);
          } else {
            const rows = Array.isArray(data) ? (data as any[]) : [];
            setMusicTracks(
              rows.map((r) => ({
                id: String((r as any).id),
                title: String((r as any).title ?? ''),
                artist_name: (r as any).artist_name ?? null,
                audio_url: String((r as any).audio_url ?? ''),
                cover_art_url: (r as any).cover_art_url ?? null,
                rights_confirmed: (r as any).rights_confirmed ?? null,
              }))
            );
          }
        }
      } catch (e) {
        if (!cancelled) setMusicTracks([]);
      }

      // Upcoming Events (new dedicated table + RPC)
      try {
        const { data, error } = await supabase.rpc('get_profile_events', { p_profile_id: profileId });
        if (!cancelled) {
          if (error) {
            console.error('[ProfileModules] get_profile_events failed:', error);
            setUpcomingEvents([]);
          } else {
            const rows = Array.isArray(data) ? (data as any[]) : [];
            setUpcomingEvents(
              rows.map((r) => ({
                id: String((r as any).id),
                title: String((r as any).title ?? ''),
                date: (r as any).start_at ? new Date((r as any).start_at).toLocaleString() : null,
                location: (r as any).location ?? null,
                ticket_url: (r as any).url ?? null,
                description: (r as any).notes ?? null,
              }))
            );
          }
        }
      } catch (e) {
        if (!cancelled) setUpcomingEvents([]);
      }

      // Portfolio (new dedicated table + RPC)
      try {
        const { data, error } = await supabase.rpc('get_profile_portfolio', { p_profile_id: profileId });
        if (!cancelled) {
          if (error) {
            console.error('[ProfileModules] get_profile_portfolio failed:', error);
            setPortfolioItems([]);
          } else {
            const rows = Array.isArray(data) ? (data as any[]) : [];
            setPortfolioItems(
              rows.map((r) => ({
                id: String((r as any).id),
                title: (r as any).title ?? null,
                subtitle: (r as any).subtitle ?? null,
                description: (r as any).description ?? null,
                media_type: (r as any).media_type as 'image' | 'video' | 'link',
                media_url: String((r as any).media_url ?? ''),
                thumbnail_url: (r as any).thumbnail_url ?? null,
                sort_order: (r as any).sort_order ?? 0,
              }))
            );
          }
        }
      } catch (e) {
        if (!cancelled) setPortfolioItems([]);
      }

      // Blocks (merch/portfolio/etc)
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}/bundle`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        const blocks = (json as any)?.blocks ?? null;
        if (!cancelled) {
          const scheduleBlocks = getBlocksByType(blocks, 'schedule_item');

          setScheduleItems(
            scheduleBlocks.map((b) => ({
              id: String((b as any).id),
              title: String((b as any).title ?? ''),
              day_of_week: (b as any)?.metadata?.day_of_week ?? null,
              time: (b as any)?.metadata?.time ?? null,
              description: (b as any)?.metadata?.description ?? null,
              recurring: (b as any)?.metadata?.recurring ?? null,
            }))
          );
        }
      } catch (e) {
        if (!cancelled) {
          setScheduleItems([]);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [profileData?.profile?.id, supabase, username, modulesReloadNonce]);

  const handleMessage = async () => {
    if (!profileData) return;
    if (!currentUser) {
      alert('Please log in to message users');
      router.push('/login?returnUrl=' + encodeURIComponent(`/${username}?dm=${profileData.profile.id}`));
      return;
    }

    router.push(`/${username}?dm=${profileData.profile.id}`);
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
    const url = `${window.location.origin}/p/${username}`;
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

  // ---------------------------------------------------------------------------
  // Profile Type Section Editing (universal modal-backed)
  // ---------------------------------------------------------------------------

  const requireOwner = () => {
    if (!isOwnProfile) {
      alert('Only the profile owner can edit this section.');
      return false;
    }
    return true;
  };

  const openAddTrack = () => {
    if (!requireOwner()) return;
    setEditingTrack(null);
    setTrackModalOpen(true);
  };
  const openEditTrack = (t: MusicTrackRow) => {
    if (!requireOwner()) return;
    setEditingTrack(t);
    setTrackModalOpen(true);
  };
  const deleteTrack = async (trackId: string) => {
    if (!requireOwner()) return;
    if (!confirm('Delete this track?')) return;
    const { error } = await supabase.rpc('delete_music_track', { p_id: trackId });
    if (error) {
      alert(error.message || 'Failed to delete track.');
      return;
    }
    setModulesReloadNonce((n) => n + 1);
  };

  const saveTrack = async (values: Record<string, any>) => {
    if (!requireOwner()) return;
    const payload = {
      title: String(values.title ?? ''),
      artist_name: String(values.artist_name ?? ''),
      audio_url: String(values.audio_url ?? ''),
      cover_art_url: String(values.cover_art_url ?? ''),
      rights_confirmed: values.rights_confirmed === true,
    };

    const { error } = await supabase.rpc('upsert_music_track', {
      p_id: editingTrack?.id ?? null,
      p_payload: payload,
    });
    if (error) throw error;
    setTrackModalOpen(false);
    setEditingTrack(null);
    setModulesReloadNonce((n) => n + 1);
  };

  const openAddEvent = () => {
    if (!requireOwner()) return;
    setEditingEvent(null);
    setEventModalOpen(true);
  };
  const openEditEvent = (e: ShowEventRow) => {
    if (!requireOwner()) return;
    setEditingEvent(e);
    setEventModalOpen(true);
  };
  const deleteEvent = async (eventId: string) => {
    if (!requireOwner()) return;
    if (!confirm('Delete this event?')) return;
    const { error } = await supabase.rpc('delete_profile_event', { p_event_id: eventId });
    if (error) {
      alert(error.message || 'Failed to delete event.');
      return;
    }
    setModulesReloadNonce((n) => n + 1);
  };

  const saveEvent = async (values: Record<string, any>) => {
    if (!requireOwner()) return;
    const title = String(values.title ?? '').trim();
    const startAt = String(values.start_at ?? '').trim();
    const endAt = String(values.end_at ?? '').trim();
    const location = String(values.location ?? '').trim();
    const url = String(values.url ?? '').trim();
    const notes = String(values.notes ?? '').trim();

    if (!startAt) {
      alert('Start date/time is required.');
      return;
    }

    const payload: Record<string, any> = {
      title: title || null,
      start_at: startAt,
      location: location || null,
      url: url || null,
      notes: notes || null,
      sort_order: upcomingEvents.length,
    };

    if (endAt) {
      payload.end_at = endAt;
    }

    if (editingEvent?.id) {
      payload.id = editingEvent.id;
    }

    const { error } = await supabase.rpc('upsert_profile_event', { p_event: payload });
    if (error) throw error;

    setEventModalOpen(false);
    setEditingEvent(null);
    setModulesReloadNonce((n) => n + 1);
  };

  const openAddPortfolio = () => {
    if (!requireOwner()) return;
    setEditingPortfolio(null);
    setPortfolioModalOpen(true);
  };
  const openEditPortfolio = (p: PortfolioItemRow) => {
    if (!requireOwner()) return;
    setEditingPortfolio(p);
    setPortfolioModalOpen(true);
  };
  const deletePortfolio = async (id: string) => {
    if (!requireOwner()) return;
    if (!confirm('Delete this portfolio item?')) return;
    const { error } = await supabase.rpc('delete_profile_portfolio_item', { p_item_id: id });
    if (error) {
      alert(error.message || 'Failed to delete portfolio item.');
      return;
    }
    setModulesReloadNonce((n) => n + 1);
  };

  const savePortfolio = async (values: Record<string, any>) => {
    if (!requireOwner()) return;
    const title = String(values.title ?? '').trim();
    const subtitle = String(values.subtitle ?? '').trim();
    const description = String(values.description ?? '').trim();
    const mediaTypeRaw = String(values.media_type ?? '').trim().toLowerCase();
    const mediaUrl = String(values.media_url ?? '').trim();
    const thumbnailUrl = String(values.thumbnail_url ?? '').trim();

    if (!['image', 'video', 'link'].includes(mediaTypeRaw)) {
      throw new Error('Media Type must be one of: image, video, link.');
    }
    if (!mediaUrl) {
      throw new Error('Media URL is required.');
    }

    const payload: any = {
      title: title || null,
      subtitle: subtitle || null,
      description: description || null,
      media_type: mediaTypeRaw,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl || null,
      sort_order: editingPortfolio?.id ? (editingPortfolio.sort_order ?? 0) : portfolioItems.length,
    };
    if (editingPortfolio?.id) payload.id = editingPortfolio.id;

    const { error } = await supabase.rpc('upsert_profile_portfolio_item', { p_item: payload });
    if (error) throw error;
    setPortfolioModalOpen(false);
    setEditingPortfolio(null);
    setModulesReloadNonce((n) => n + 1);
  };

  const openAddSchedule = () => {
    if (!requireOwner()) return;
    setEditingSchedule(null);
    setScheduleModalOpen(true);
  };
  const openEditSchedule = (it: ScheduleItemRow) => {
    if (!requireOwner()) return;
    setEditingSchedule(it);
    setScheduleModalOpen(true);
  };
  const deleteSchedule = async (id: string) => {
    if (!requireOwner()) return;
    if (!confirm('Delete this schedule item?')) return;
    const { error } = await supabase.rpc('delete_profile_block', { p_id: Number(id) });
    if (error) {
      alert(error.message || 'Failed to delete schedule item.');
      return;
    }
    setModulesReloadNonce((n) => n + 1);
  };

  const saveSchedule = async (values: Record<string, any>) => {
    if (!requireOwner()) return;
    const title = String(values.title ?? '').trim();
    const meta = {
      day_of_week: String(values.day_of_week ?? '').trim() || null,
      time: String(values.time ?? '').trim() || null,
      description: String(values.description ?? '').trim() || null,
      recurring: values.recurring === true,
    };

    if (editingSchedule?.id) {
      const { error } = await supabase.rpc('update_profile_block', {
        p_id: Number(editingSchedule.id),
        p_title: title,
        p_url: null,
        p_metadata: meta,
        p_sort_order: 0,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.rpc('add_profile_block', {
        p_block_type: 'schedule_item',
        p_title: title,
        p_url: null,
        p_metadata: meta,
        p_sort_order: scheduleItems.length,
      });
      if (error) throw error;
    }
    setScheduleModalOpen(false);
    setEditingSchedule(null);
    setModulesReloadNonce((n) => n + 1);
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
          <Link href="/" className="text-blue-500 hover:text-blue-600">
            Go Home
          </Link>
        </div>
      </div>
    );
  }
  
  const { profile } = profileData;

  // Tabs are config-driven (parity with mobile).
  const enabledTabs = getEnabledTabs((profile.profile_type || 'creator') as ConfigProfileType);

  const tabIconMap: Record<ConfigProfileTab, any> = {
    info: Info,
    feed: LayoutGrid,
    reels: Clapperboard,
    photos: ImageIcon,
    videos: Video,
    music: Music,
    events: Calendar,
    products: ShoppingCart,
  };
  
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
        <div className={`${borderRadiusClass} overflow-hidden shadow-2xl mb-4 sm:mb-6 relative`} style={cardStyle}>
          {/* Top Right Stats - Streak & Global Ranks */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col items-end gap-2 z-10">
            {/* Streak Counter */}
            {!!profileData?.streak_days && profileData.streak_days > 0 && (
              <div
                className="group relative flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg"
                title="Streak days require real activity (comment, gift, chat, transactions, etc.). Refreshing the app/page doesn't count."
              >
                <Flame size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-bold">{profileData.streak_days}</span>
                <span className="text-[10px] sm:text-xs opacity-90">day streak</span>
                <div className="pointer-events-none absolute right-0 top-full mt-2 w-56 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="rounded-lg bg-black/85 px-3 py-2 text-[11px] leading-snug text-white shadow-xl">
                    Streak days require real activity (comment, gift, chat, transactions, etc.). Refreshing the app/page doesn&apos;t count.
                  </div>
                </div>
              </div>
            )}
            
            {/* Global Gifter Rank */}
            {!!profileData?.gifter_rank && profileData.gifter_rank > 0 && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg">
                <Trophy size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-bold">#{profileData.gifter_rank}</span>
                <span className="text-[10px] sm:text-xs opacity-90">Gifter</span>
              </div>
            )}
            
            {/* Global Streamer Rank */}
            {!!profileData?.streamer_rank && profileData.streamer_rank > 0 && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg">
                <Star size={14} className="sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-bold">#{profileData.streamer_rank}</span>
                <span className="text-[10px] sm:text-xs opacity-90">Streamer</span>
              </div>
            )}
          </div>
          
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
                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                  <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
                    @{profile.username}
                  </p>
                  {/* Profile Type Badge */}
                  <ProfileTypeBadge profileType={profile.profile_type || 'creator'} />
                </div>
                
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
                      
                      <button
                        onClick={handleMessage}
                        className="px-4 sm:px-6 py-2 rounded-lg font-semibold transition bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 text-sm sm:text-base"
                      >
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
                  
                  <Link
                    href={isOwnProfile ? '/me/analytics' : `/u/${profile.username}/analytics`}
                    className="px-3 sm:px-4 py-2 rounded-lg font-semibold transition bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center gap-2 text-sm sm:text-base"
                    title="View Stats"
                  >
                    <BarChart3 size={18} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Stats</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Profile Tabs (config-driven, parity with mobile) */}
        <div className={`${borderRadiusClass} overflow-hidden shadow-lg mb-4 sm:mb-6`} style={cardStyle}>
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {enabledTabs.map((tab) => {
              const TabIcon = tabIconMap[tab.id as ConfigProfileTab] || Info;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm sm:text-base font-semibold transition-colors border-b-2 ${
                    isActive
                      ? 'border-purple-500 text-purple-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                  style={isActive ? { borderColor: accentColor, color: accentColor } : {}}
                >
                  <TabIcon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Tab Content - Render based on activeTab */}
        {activeTab === 'info' && (
          <>
            {/* Referral Progress Module - Owner View Only */}
            {isOwnProfile && (
              <div className="mb-4 sm:mb-6">
                <ReferralProgressModule
                  cardStyle={cardStyle}
                  borderRadiusClass={borderRadiusClass}
                  accentColor={accentColor}
                />
              </div>
            )}

            {/* Streamer schedule (real data, owner-only empty state) */}
            {profile.profile_type === 'streamer' && (
              <Schedule
                isOwner={isOwnProfile}
                items={scheduleItems}
                onAdd={openAddSchedule}
                onEdit={openEditSchedule}
                onDelete={deleteSchedule}
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}
            
            {/* Config-driven section rendering for musician showcase */}
            {isSectionEnabled('music_showcase', profile.profile_type as ConfigProfileType) && (
              <MusicShowcase 
                profileType={profile.profile_type as ConfigProfileType}
                isOwner={isOwnProfile}
                tracks={musicTracks}
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}
            
            {/* Config-driven section rendering for upcoming events */}
            {isSectionEnabled('upcoming_events', profile.profile_type as ConfigProfileType) && (
              <UpcomingEvents 
                profileType={profile.profile_type as ConfigProfileType}
                isOwner={isOwnProfile}
                events={upcomingEvents}
                onAddEvent={openAddEvent}
                onEditEvent={openEditEvent}
                onDeleteEvent={deleteEvent}
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}
            
            {/* Config-driven section rendering for merchandise */}
            {isSectionEnabled('merchandise', profile.profile_type as ConfigProfileType) && (
              <Merchandise 
                profileId={profile.id}
                profileType={profile.profile_type as ConfigProfileType}
                isOwner={isOwnProfile}
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}
            
            {/* Config-driven section rendering for business info */}
            {isSectionEnabled('business_info', profile.profile_type as ConfigProfileType) && (
              <BusinessInfo 
                profileId={profile.id}
                profileType={profile.profile_type as ConfigProfileType}
                isOwner={isOwnProfile}
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}
            
            {/* Config-driven section rendering for portfolio */}
            {isSectionEnabled('portfolio', profile.profile_type as ConfigProfileType) && (
              <Portfolio 
                profileType={profile.profile_type as ConfigProfileType}
                isOwner={isOwnProfile}
                items={portfolioItems}
                onAddItem={openAddPortfolio}
                onEditItem={openEditPortfolio}
                onDeleteItem={deletePortfolio}
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}
            
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
                  gifterStatuses={profileData.gifter_statuses}
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
              {/* Header with Collapse Button */}
              <div className="p-4 sm:p-6 pb-0">
                <button
                  onClick={() => setConnectionsExpanded(!connectionsExpanded)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <h3 className="text-xl font-bold">Connections</h3>
                  <svg
                    className={`w-6 h-6 transition-transform duration-200 ${connectionsExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Collapsible Content */}
              {connectionsExpanded && (
                <div className="p-4 sm:p-6 pt-4">
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
              )}
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
                gifterStatus={(profileData as any)?.gifter_statuses?.[profile.id] ?? null}
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
          </>
        )}
        
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <PublicFeedClient 
            username={profile.username} 
            cardStyle={cardStyle}
            borderRadiusClass={borderRadiusClass}
          />
        )}

        {/* Vlog Tab (Creator + Streamer: VLOG / Vlog <= 60s) */}
        {activeTab === 'reels' && (
          <VlogReelsClient
            profileId={profile.id}
            isOwner={isOwnProfile}
            title="Vlog"
            cardStyle={cardStyle}
            borderRadiusClass={borderRadiusClass}
          />
        )}
        
        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <ProfilePhotosClient 
            username={profile.username}
            cardStyle={cardStyle}
            borderRadiusClass={borderRadiusClass}
          />
        )}
        
        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <>
            {profile.profile_type === 'musician' && (
              <MusicVideos
                profileId={profile.id}
                isOwner={isOwnProfile}
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}

            {profile.profile_type === 'comedian' && (
              <ComedySpecials
                profileId={profile.id}
                isOwner={isOwnProfile}
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}

            {(profile.profile_type === 'creator' || profile.profile_type === 'streamer') && (
              <VlogReelsClient
                profileId={profile.id}
                isOwner={isOwnProfile}
                allowEdit={false}
                title="Videos"
                contentLabel="videos"
                cardStyle={cardStyle}
                borderRadiusClass={borderRadiusClass}
              />
            )}

            {profile.profile_type !== 'musician' &&
              profile.profile_type !== 'comedian' &&
              profile.profile_type !== 'creator' &&
              profile.profile_type !== 'streamer' && (
                <TabEmptyState type="videos" isOwner={isOwnProfile} />
              )}
          </>
        )}
        
        {/* Music Tab - Musician-specific (shows MusicShowcase) */}
        {activeTab === 'music' && (
          <MusicShowcase 
            profileType={profile.profile_type as ConfigProfileType}
            isOwner={isOwnProfile}
            tracks={musicTracks}
            cardStyle={cardStyle}
            borderRadiusClass={borderRadiusClass}
          />
        )}
        
        {/* Events Tab - Musician/Comedian-specific (shows UpcomingEvents) */}
        {activeTab === 'events' && (
          <UpcomingEvents 
            profileType={profile.profile_type as ConfigProfileType}
            isOwner={isOwnProfile}
            events={upcomingEvents}
            onAddEvent={openAddEvent}
            onEditEvent={openEditEvent}
            onDeleteEvent={deleteEvent}
            cardStyle={cardStyle}
            borderRadiusClass={borderRadiusClass}
          />
        )}
        
        {/* Products Tab - Business-specific (shows Portfolio for now) */}
        {activeTab === 'products' && (
          <Portfolio 
            profileType={profile.profile_type as ConfigProfileType}
            isOwner={isOwnProfile}
            items={portfolioItems}
            onAddItem={openAddPortfolio}
            onEditItem={openEditPortfolio}
            onDeleteItem={deletePortfolio}
            cardStyle={cardStyle}
            borderRadiusClass={borderRadiusClass}
          />
        )}
        
        {/* Type-specific tab placeholders (kept for backward compatibility) */}
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

      {/* Universal Edit Section Modals */}
      {isOwnProfile && (
        <>
          <SectionEditModal
            isOpen={trackModalOpen}
            onClose={() => {
              setTrackModalOpen(false);
              setEditingTrack(null);
            }}
            title={editingTrack ? 'Edit Track' : 'Add Track'}
            description="Add a public audio URL and confirm you have rights to share it."
            initialValues={{
              title: editingTrack?.title ?? '',
              artist_name: editingTrack?.artist_name ?? '',
              audio_url: editingTrack?.audio_url ?? '',
              cover_art_url: editingTrack?.cover_art_url ?? '',
              rights_confirmed: true,
            }}
            fields={[
              { key: 'title', label: 'Track Title', type: 'text', required: true },
              { key: 'artist_name', label: 'Artist Name', type: 'text' },
              { key: 'audio_url', label: 'Audio URL', type: 'url', required: true, placeholder: 'https://.../track.mp3' },
              { key: 'cover_art_url', label: 'Cover Art URL (optional)', type: 'url', placeholder: 'https://.../cover.jpg' },
              {
                key: 'rights_confirmed',
                label: 'Rights Confirmation',
                type: 'checkbox',
                required: true,
                checkboxLabel: 'I own the rights or have permission to upload/share this content.',
              },
            ]}
            onSubmit={saveTrack}
          />

          <SectionEditModal
            isOpen={eventModalOpen}
            onClose={() => {
              setEventModalOpen(false);
              setEditingEvent(null);
            }}
            title={editingEvent ? 'Edit Event' : 'Add Event'}
            description="Add event details. Start date/time is required."
            initialValues={{
              title: editingEvent?.title ?? '',
              start_at: editingEvent?.date ?? '',
              end_at: '',
              location: editingEvent?.location ?? '',
              url: editingEvent?.ticket_url ?? '',
              notes: editingEvent?.description ?? '',
            }}
            fields={[
              { key: 'title', label: 'Event Title', type: 'text', required: true },
              { key: 'start_at', label: 'Start Date/Time', type: 'text', required: true, placeholder: '2026-01-15 20:00:00' },
              { key: 'end_at', label: 'End Date/Time (optional)', type: 'text', placeholder: '2026-01-15 23:00:00' },
              { key: 'location', label: 'Location', type: 'text', placeholder: 'Venue, City' },
              { key: 'url', label: 'Ticket/Event URL', type: 'url', placeholder: 'https://tickets...' },
              { key: 'notes', label: 'Notes/Description', type: 'textarea' },
            ]}
            onSubmit={saveEvent}
          />

          <SectionEditModal
            isOpen={portfolioModalOpen}
            onClose={() => {
              setPortfolioModalOpen(false);
              setEditingPortfolio(null);
            }}
            title={editingPortfolio ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
            initialValues={{
              title: editingPortfolio?.title ?? '',
              subtitle: editingPortfolio?.subtitle ?? '',
              description: editingPortfolio?.description ?? '',
              media_type: editingPortfolio?.media_type ?? 'image',
              media_url: editingPortfolio?.media_url ?? '',
              thumbnail_url: editingPortfolio?.thumbnail_url ?? '',
            }}
            fields={[
              { key: 'title', label: 'Title (optional)', type: 'text' },
              { key: 'subtitle', label: 'Subtitle (optional)', type: 'text' },
              {
                key: 'media_type',
                label: 'Media Type',
                type: 'text',
                required: true,
                placeholder: 'image | video | link',
                helpText: 'Allowed values: image, video, link',
              },
              { key: 'media_url', label: 'Media URL', type: 'url', required: true, placeholder: 'https://...' },
              { key: 'thumbnail_url', label: 'Thumbnail URL (optional)', type: 'url', placeholder: 'https://.../thumb.jpg' },
              { key: 'description', label: 'Description (optional)', type: 'textarea' },
            ]}
            onSubmit={savePortfolio}
          />

          <SectionEditModal
            isOpen={scheduleModalOpen}
            onClose={() => {
              setScheduleModalOpen(false);
              setEditingSchedule(null);
            }}
            title={editingSchedule ? 'Edit Schedule Item' : 'Add Schedule Item'}
            initialValues={{
              title: editingSchedule?.title ?? '',
              day_of_week: editingSchedule?.day_of_week ?? '',
              time: editingSchedule?.time ?? '',
              description: editingSchedule?.description ?? '',
              recurring: editingSchedule?.recurring === true,
            }}
            fields={[
              { key: 'title', label: 'Title', type: 'text', required: true },
              { key: 'day_of_week', label: 'Day of Week', type: 'text', placeholder: 'e.g. Monday' },
              { key: 'time', label: 'Time', type: 'text', placeholder: 'e.g. 8:00 PM EST' },
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'recurring', label: 'Recurring', type: 'checkbox', checkboxLabel: 'This schedule repeats weekly.' },
            ]}
            onSubmit={saveSchedule}
          />
        </>
      )}
    </div>
  );
}

