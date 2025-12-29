import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Share,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, Input, Modal, PageShell, BottomNav } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { useAutoHideBars } from '../hooks/useAutoHideBars';
import { getAvatarSource } from '../lib/defaultAvatar';
import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { 
  getEnabledTabs, 
  isSectionEnabled,
  type ProfileType 
} from '../config/profileTypeConfig';
import {
  FeaturedSection,
  type FeaturedItem,
  ScheduleSection,
  type ScheduleItem,
  ClipsSection,
  type ClipItem,
  MusicSection,
  type MusicItem,
  ShowsSection,
  type ShowItem,
  MerchSection,
  type MerchItem,
  PortfolioSection,
  type PortfolioItem,
  AudioPlaylistPlayer,
  type ProfileMusicTrack,
  MusicVideosSection,
  type MusicVideoItem,
  ComedySpecialsSection,
  type ComedySpecialItem,
  VlogReelsSection,
  type VlogItem,
} from '../components/profile';
import { SectionEditModal } from '../components/profile/SectionEditModal';

type BusinessRow = {
  profile_id: string;
  business_description: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location_or_service_area: string | null;
  hours: any | null;
  updated_at: string;
};

/* =============================================================================
   PROFILE SCREEN v2 - FULL VISUAL PARITY WITH WEB
   
   WEB SOURCE: app/[username]/modern-page.tsx
   
   KEY CHANGES FROM v1:
   - Full-screen background image (not banner-only)
   - ALL sections now render as proper cards with shadows/borders
   - Theme-aware text colors (light mode fix)
   - Visual styling matches web: shadows, borders, rounded corners
   - Gradient overlay on background
   
   VISUAL STRUCTURE (matches web):
   1. Full-screen background with gradient overlay
   2. Hero card (avatar, name, bio, action buttons, badges)
   3. Stats cards (social counts, top supporters, top streamers)
   4. Social media card
   5. Connections card (collapsible, tabs)
   6. Links card
   7. Profile stats card
   8. Footer card
   
   All cards use theme.surfaceCard with proper shadows/borders.
   All text uses theme tokens (textPrimary, textSecondary, textMuted).
============================================================================= */

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
    coin_balance?: number;
    earnings_balance?: number;
    hide_streaming_stats?: boolean;
    profile_type?: ProfileType; // PROFILE TYPE for conditional rendering
    enabled_modules?: string[] | null; // OPTIONAL MODULES (no core shell)
    // Customization (MATCH WEB)
    profile_bg_url?: string;
    profile_bg_overlay?: string;
    card_color?: string;
    card_opacity?: number;
    card_border_radius?: string;
    font_preset?: string;
    accent_color?: string;
    links_section_title?: string;
    // Social media
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
  };
  gifter_statuses?: Record<string, { tier_key: string; level_in_tier: number; lifetime_coins: number }>;
  links: Array<{
    id: number;
    title: string;
    url: string;
    icon?: string;
    click_count: number;
    display_order: number;
  }>;
  adult_links: Array<any>;
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

type ConnectionsTab = 'following' | 'followers' | 'friends';
type ProfileTab = 'info' | 'feed' | 'reels' | 'photos' | 'videos' | 'music' | 'events' | 'products';

type ProfileScreenProps = {
  /** The username to display */
  username: string;
  /** Whether this is the current user's own profile */
  isOwnProfile?: boolean;
  /** API base URL */
  apiBaseUrl?: string;
  /** Auth token for API calls */
  authToken?: string;
  /** Called when user taps back arrow */
  onBack?: () => void;
  /** Called when user taps Edit Profile */
  onEditProfile?: () => void;
  /** Called when user taps Message */
  onMessage?: (profileId: string) => void;
  /** Called when user taps Stats */
  onStats?: (username: string) => void;
  /** Navigation prop for bottom nav */
  navigation?: any;
};

interface ConnectionUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_live?: boolean;
}

type FeedAuthor = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type FeedPost = {
  id: string;
  text_content: string;
  media_url: string | null;
  created_at: string;
  author: FeedAuthor;
  comment_count: number;
  gift_total_coins: number;
};

type FeedCursor = { before_created_at: string; before_id: string };

export function ProfileScreen({
  username,
  isOwnProfile = false,
  apiBaseUrl = 'https://mylivelinks.com',
  authToken,
  onBack,
  onEditProfile,
  onMessage,
  onStats,
  navigation,
}: ProfileScreenProps) {
  const { session } = useAuthContext();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const currentUserId = session?.user?.id ?? null;
  const { fetchAuthed } = useFetchAuthed();
  
  // Auto-hide bars on scroll
  const { barsVisible, scrollHandlers } = useAutoHideBars({
    threshold: 5,
    showDelay: 150,
  });
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [activeConnectionsTab, setActiveConnectionsTab] = useState<ConnectionsTab>('following');
  const [connectionsExpanded, setConnectionsExpanded] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedNextCursor, setFeedNextCursor] = useState<FeedCursor | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const feedInFlightRef = React.useRef(false);
  const lastCursorKeyRef = React.useRef<string>('');

  const [composerText, setComposerText] = useState('');
  const [composerLoading, setComposerLoading] = useState(false);
  const composerInFlightRef = React.useRef(false);
  const [mediaLocalUri, setMediaLocalUri] = useState<string | null>(null);
  const [mediaMimeType, setMediaMimeType] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  // Musician: real DB-backed tracks via RPC get_music_tracks / upsert_music_track
  type DbMusicTrack = {
    id: string;
    title: string;
    artist_name?: string | null;
    audio_url: string;
    cover_art_url?: string | null;
    rights_confirmed?: boolean | null;
  };
  const [musicTracks, setMusicTracks] = useState<DbMusicTrack[]>([]);
  const [musicTracksLoading, setMusicTracksLoading] = useState(false);

  // Blocks-backed sections (profile_content_blocks via /api/profile/[username]/bundle)
  const [shows, setShows] = useState<ShowItem[]>([]);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [merch, setMerch] = useState<MerchItem[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [modulesReloadNonce, setModulesReloadNonce] = useState(0);

  // Universal section edit modals (mobile)
  const [trackModalVisible, setTrackModalVisible] = useState(false);
  const [editingTrack, setEditingTrack] = useState<DbMusicTrack | null>(null);

  const [showModalVisible, setShowModalVisible] = useState(false);
  const [editingShow, setEditingShow] = useState<ShowItem | null>(null);

  const [merchModalVisible, setMerchModalVisible] = useState(false);
  const [editingMerch, setEditingMerch] = useState<MerchItem | null>(null);

  const [portfolioModalVisible, setPortfolioModalVisible] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioItem | null>(null);

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  const [featuredModalVisible, setFeaturedModalVisible] = useState(false);
  const [editingFeatured, setEditingFeatured] = useState<FeaturedItem | null>(null);

  // Musician: music videos (real data via profile type modules)
  const [musicVideos, setMusicVideos] = useState<MusicVideoItem[]>([]);
  const [musicVideosLoading, setMusicVideosLoading] = useState(false);

  // Comedian: comedy specials (real data via profile type modules)
  const [comedySpecials, setComedySpecials] = useState<ComedySpecialItem[]>([]);
  const [comedySpecialsLoading, setComedySpecialsLoading] = useState(false);

  // Creator/Streamer: VLOG / Vlog (real data via profile type modules)
  const [vlogs, setVlogs] = useState<VlogItem[]>([]);
  const [vlogsLoading, setVlogsLoading] = useState(false);

  // Business profile module (real data, no mock)
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessModalVisible, setBusinessModalVisible] = useState(false);

  const canPost = (composerText.trim().length > 0 || !!mediaUrl) && !composerLoading && !mediaUploading;

  const navigateToProfileRoute = useCallback(
    (nextUsername: string) => {
      const cleaned = String(nextUsername || '').trim();
      if (!cleaned) return;

      // Prefer root stack `ProfileRoute` (works even if profile isn't a tab).
      try {
        const parent = navigation?.getParent?.();
        if (parent?.navigate) {
          parent.navigate('ProfileRoute', { username: cleaned });
          return;
        }
      } catch {
        // ignore
      }

      // Fallback: try direct navigation if this navigator knows ProfileRoute.
      try {
        navigation?.navigate?.('ProfileRoute', { username: cleaned });
      } catch {
        // ignore
      }
    },
    [navigation]
  );

  const hoursText = useMemo(() => {
    const h = business?.hours;
    if (!h) return '';
    if (typeof h === 'string') return h;
    if (typeof h === 'object' && typeof (h as any)?.text === 'string') return String((h as any).text);
    try {
      return JSON.stringify(h);
    } catch {
      return '';
    }
  }, [business?.hours]);

  const hasAnyBusinessInfo = useMemo(() => {
    const b = business;
    if (!b) return false;
    return Boolean(
      (b.business_description && b.business_description.trim()) ||
        (b.website_url && b.website_url.trim()) ||
        (b.contact_email && b.contact_email.trim()) ||
        (b.contact_phone && b.contact_phone.trim()) ||
        (b.location_or_service_area && b.location_or_service_area.trim()) ||
        (hoursText && hoursText.trim())
    );
  }, [business, hoursText]);

  const loadBusiness = useCallback(async (profileId: string) => {
    setBusinessLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_business', { p_profile_id: profileId });
      if (error) {
        console.log('[BusinessInfo] Failed to load business:', error.message);
        setBusiness(null);
        return;
      }
      setBusiness((data as any) ?? null);
    } finally {
      setBusinessLoading(false);
    }
  }, []);

  const loadMusicTracks = useCallback(async (profileId: string) => {
    setMusicTracksLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_profile_music_tracks', { p_profile_id: profileId });
      if (error) {
        console.log('[Music] Failed to load tracks:', error.message);
        setMusicTracks([]);
        return;
      }
      const rows = Array.isArray(data) ? (data as any[]) : [];
      setMusicTracks(
        rows.map((r) => ({
          id: String((r as any)?.id ?? ''),
          title: String((r as any)?.title ?? ''),
          artist_name: (r as any)?.artist_name ?? null,
          audio_url: String((r as any)?.audio_url ?? ''),
          cover_art_url: (r as any)?.cover_art_url ?? null,
          rights_confirmed: (r as any)?.rights_confirmed ?? null,
          sort_order: (r as any)?.sort_order ?? null,
        }))
      );
    } finally {
      setMusicTracksLoading(false);
    }
  }, []);

  const formatPrice = useCallback((priceCents: number | null, currency: string | null | undefined) => {
    if (priceCents === null || typeof priceCents !== 'number' || !Number.isFinite(priceCents)) return undefined;
    const cur = String(currency || 'USD').toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(priceCents / 100);
    } catch {
      return `${cur} ${(priceCents / 100).toFixed(2)}`;
    }
  }, []);

  const parsePriceToCents = useCallback((input: unknown): number | null => {
    const raw = typeof input === 'string' ? input.trim() : '';
    if (!raw) return null;
    const cleaned = raw.replace(/,/g, '').replace(/^\$/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
      throw new Error('Please enter a valid price like 29.99');
    }
    const [dollarsStr, centsStrRaw] = cleaned.split('.');
    const dollars = Number(dollarsStr);
    const centsStr = (centsStrRaw ?? '').padEnd(2, '0');
    const cents = centsStr ? Number(centsStr) : 0;
    return dollars * 100 + cents;
  }, []);

  const loadMerch = useCallback(
    async (profileId: string) => {
      try {
        const { data, error } = await supabase.rpc('get_profile_merch', { p_profile_id: profileId });
        if (error) {
          console.error('[Mobile] get_profile_merch failed:', error);
          setMerch([]);
          return;
        }
        const rows = Array.isArray(data) ? (data as any[]) : [];
        setMerch(
          rows.map((r: any) => ({
            id: String(r.id),
            name: String(r.name ?? ''),
            description: r.description ?? undefined,
            price: formatPrice(r.price_cents ?? null, r.currency ?? 'USD'),
            image_url: r.image_url ?? undefined,
            buy_url: r.url ?? undefined,
            is_featured: r.is_featured ?? false,
            sort_order: r.sort_order ?? 0,
          }))
        );
      } catch (e: any) {
        console.error('[Mobile] loadMerch failed:', e?.message || e);
        setMerch([]);
      }
    },
    [formatPrice]
  );

  const loadBlocksBundle = useCallback(
    async (uname: string, pid: string) => {
      setBlocksLoading(true);
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const res = await fetch(`${apiBaseUrl}/api/profile/${encodeURIComponent(uname)}/bundle`, { headers });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || json.error) {
          setShows([]);
          setPortfolioItems([]);
          setSchedule([]);
          setFeatured([]);
          setClips([]);
          return;
        }

        const blocks = (json as any)?.blocks ?? {};
        const getByType = (t: string): any[] => {
          const arr = blocks?.blocks_by_type?.[t];
          if (Array.isArray(arr)) return arr;
          const direct = blocks?.[t];
          return Array.isArray(direct) ? direct : [];
        };

        const scheduleBlocks = getByType('schedule_item');
        const featuredBlocks = getByType('featured_link');
        const clipBlocks = getByType('clip');

        // Load shows/events from dedicated profile_events table
        try {
          const { data: eventsData, error: eventsError } = await supabase.rpc('get_profile_events', {
            p_profile_id: pid,
          });
          if (eventsError) {
            console.error('[Mobile] get_profile_events failed:', eventsError);
            setShows([]);
          } else {
            const rows = Array.isArray(eventsData) ? eventsData : [];
            setShows(
              rows.map((r: any) => ({
                id: String(r.id),
                title: String(r.title ?? ''),
                venue: undefined, // not in new schema
                location: r.location ?? undefined,
                date: r.start_at ? new Date(r.start_at).toLocaleDateString() : undefined,
                time: r.start_at ? new Date(r.start_at).toLocaleTimeString() : undefined,
                poster_url: undefined, // not in new schema
                ticket_link: r.url ?? undefined,
                status: 'upcoming',
              }))
            );
          }
        } catch (e) {
          setShows([]);
        }

        // Load portfolio from dedicated profile_portfolio table
        try {
          const { data: portfolioData, error: portfolioError } = await supabase.rpc('get_profile_portfolio', {
            p_profile_id: pid,
          });
          if (portfolioError) {
            console.error('[Mobile] get_profile_portfolio failed:', portfolioError);
            setPortfolioItems([]);
          } else {
            const rows = Array.isArray(portfolioData) ? portfolioData : [];
            setPortfolioItems(
              rows.map((r: any) => ({
                id: String(r.id),
                title: r.title ?? null,
                subtitle: r.subtitle ?? null,
                description: r.description ?? null,
                media_type: (r.media_type as any) ?? 'image',
                media_url: String(r.media_url ?? ''),
                thumbnail_url: r.thumbnail_url ?? null,
              }))
            );
          }
        } catch (e) {
          setPortfolioItems([]);
        }

        setSchedule(
          scheduleBlocks.map((b) => ({
            id: String((b as any).id),
            title: String((b as any).title ?? ''),
            day_of_week: (b as any)?.metadata?.day_of_week ?? undefined,
            time: (b as any)?.metadata?.time ?? undefined,
            description: (b as any)?.metadata?.description ?? undefined,
            recurring: (b as any)?.metadata?.recurring ?? undefined,
          }))
        );

        setFeatured(
          featuredBlocks.map((b) => ({
            id: String((b as any).id),
            title: String((b as any).title ?? ''),
            description: (b as any)?.metadata?.description ?? undefined,
            thumbnail_url: (b as any)?.metadata?.thumbnail_url ?? undefined,
            type: 'link',
          }))
        );

        setClips(
          clipBlocks.map((b) => ({
            id: String((b as any).id),
            title: String((b as any).title ?? ''),
            thumbnail_url: (b as any)?.metadata?.thumbnail_url ?? undefined,
            duration: (b as any)?.metadata?.duration ?? undefined,
            views: (b as any)?.metadata?.views ?? undefined,
            created_at: (b as any)?.created_at ?? undefined,
          }))
        );
      } finally {
        setBlocksLoading(false);
      }
    },
    [apiBaseUrl, authToken]
  );

  const requireOwner = useCallback(() => {
    if (!isOwnProfile) {
      Alert.alert('Owner only', 'Only the profile owner can edit this section.');
      return false;
    }
    return true;
  }, [isOwnProfile]);

  const deleteBlock = useCallback(async (id: string) => {
    if (!requireOwner()) return;
    const { error } = await supabase.rpc('delete_profile_block', { p_id: Number(id) });
    if (error) throw error;
    setModulesReloadNonce((n) => n + 1);
  }, [requireOwner]);

  // Track CRUD
  const saveTrack = useCallback(async (values: any) => {
    if (!requireOwner()) return;
    const sortOrder = (editingTrack as any)?.sort_order ?? musicTracks.length;
    const payload = {
      title: String(values.title ?? ''),
      artist_name: String(values.artist_name ?? ''),
      audio_url: String(values.audio_url ?? ''),
      cover_art_url: String(values.cover_art_url ?? ''),
      rights_confirmed: values.rights_confirmed === true,
      sort_order: sortOrder,
      id: editingTrack?.id ?? null,
    };
    const { error } = await supabase.rpc('upsert_profile_music_track', { p_track: payload });
    if (error) throw error;
    setModulesReloadNonce((n) => n + 1);
  }, [editingTrack?.id, requireOwner, musicTracks.length]);

  const deleteTrack = useCallback(async (id: string) => {
    if (!requireOwner()) return;
    const { error } = await supabase.rpc('delete_profile_music_track', { p_track_id: id });
    if (error) throw error;
    setModulesReloadNonce((n) => n + 1);
  }, [requireOwner]);

  // Event CRUD (new dedicated profile_events table)
  const saveEvent = useCallback(async (values: any) => {
    if (!requireOwner()) return;
    const title = String(values.title ?? '').trim();
    const startAt = String(values.start_at ?? '').trim();
    const endAt = String(values.end_at ?? '').trim();
    const location = String(values.location ?? '').trim();
    const url = String(values.url ?? '').trim();
    const notes = String(values.notes ?? '').trim();

    if (!startAt) {
      Alert.alert('Error', 'Start date/time is required.');
      return;
    }

    const payload: any = {
      title: title || null,
      start_at: startAt,
      location: location || null,
      url: url || null,
      notes: notes || null,
      sort_order: shows.length,
    };

    if (endAt) {
      payload.end_at = endAt;
    }

    if (editingShow?.id) {
      payload.id = editingShow.id;
    }

    const { error } = await supabase.rpc('upsert_profile_event', { p_event: payload });
    if (error) throw error;
    setModulesReloadNonce((n) => n + 1);
  }, [editingShow?.id, requireOwner, shows.length]);

  const deleteEvent = useCallback(async (id: string) => {
    if (!requireOwner()) return;
    const { error } = await supabase.rpc('delete_profile_event', { p_event_id: id });
    if (error) throw error;
    setModulesReloadNonce((n) => n + 1);
  }, [requireOwner]);

  // Portfolio CRUD (new dedicated profile_portfolio table)
  const savePortfolioItem = useCallback(
    async (values: any) => {
      if (!requireOwner()) return;
      const title = String(values.title ?? '').trim();
      const subtitle = String(values.subtitle ?? '').trim();
      const description = String(values.description ?? '').trim();
      const mediaTypeRaw = String(values.media_type ?? '').trim().toLowerCase();
      const mediaUrl = String(values.media_url ?? '').trim();
      const thumbnailUrl = String(values.thumbnail_url ?? '').trim();

      if (!['image', 'video', 'link'].includes(mediaTypeRaw)) {
        Alert.alert('Error', 'Media Type must be one of: image, video, link.');
        return;
      }
      if (!mediaUrl) {
        Alert.alert('Error', 'Media URL is required.');
        return;
      }

      const payload: any = {
        title: title || null,
        subtitle: subtitle || null,
        description: description || null,
        media_type: mediaTypeRaw,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl || null,
        sort_order: editingPortfolio?.id ? portfolioItems.findIndex((x) => x.id === editingPortfolio.id) : portfolioItems.length,
      };

      if (editingPortfolio?.id) payload.id = editingPortfolio.id;

      const { error } = await supabase.rpc('upsert_profile_portfolio_item', { p_item: payload });
      if (error) throw error;
      setModulesReloadNonce((n) => n + 1);
    },
    [editingPortfolio?.id, portfolioItems, requireOwner]
  );

  const deletePortfolioItem = useCallback(
    async (id: string) => {
      if (!requireOwner()) return;
      const { error } = await supabase.rpc('delete_profile_portfolio_item', { p_item_id: id });
      if (error) throw error;
      setModulesReloadNonce((n) => n + 1);
    },
    [requireOwner]
  );

  // Merchandise CRUD (new dedicated profile_merch table)
  const saveMerchItem = useCallback(
    async (values: any) => {
      if (!requireOwner()) return;
      const name = String(values.name ?? '').trim();
      if (!name) {
        Alert.alert('Error', 'Product Name is required.');
        return;
      }

      const buyUrl = String(values.buy_url ?? '').trim() || null;
      const imageUrl = String(values.image_url ?? '').trim() || null;
      const description = String(values.description ?? '').trim() || null;
      const isFeatured = values.is_featured === true;

      let priceCents: number | null = null;
      try {
        priceCents = parsePriceToCents(values.price);
      } catch (e: any) {
        Alert.alert('Error', String(e?.message || 'Invalid price'));
        return;
      }

      const existingIndex = editingMerch?.id ? merch.findIndex((m) => m.id === editingMerch.id) : -1;
      const sortOrder = existingIndex >= 0 ? existingIndex : merch.length;

      const { error } = await supabase.rpc('upsert_profile_merch_item', {
        p_item: {
          id: editingMerch?.id ?? null,
          name,
          price_cents: priceCents,
          currency: 'USD',
          url: buyUrl,
          image_url: imageUrl,
          description,
          is_featured: isFeatured,
          sort_order: sortOrder,
        },
      });
      if (error) throw error;
      setModulesReloadNonce((n) => n + 1);
    },
    [editingMerch?.id, merch, parsePriceToCents, requireOwner]
  );

  const deleteMerchItem = useCallback(
    async (id: string) => {
      if (!requireOwner()) return;
      const { error } = await supabase.rpc('delete_profile_merch_item', { p_item_id: id });
      if (error) throw error;
      setModulesReloadNonce((n) => n + 1);
    },
    [requireOwner]
  );

  const moveMerchItem = useCallback(
    async (itemId: string, direction: -1 | 1, profileId: string) => {
      if (!requireOwner()) return;
      const idx = merch.findIndex((m) => m.id === itemId);
      if (idx < 0) return;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= merch.length) return;

      const next = [...merch];
      const [it] = next.splice(idx, 1);
      next.splice(nextIdx, 0, it);
      setMerch(next);

      const orderedIds = next.map((m) => m.id);
      const { error } = await supabase.rpc('reorder_profile_merch', { p_profile_id: profileId, p_ordered_ids: orderedIds });
      if (error) throw error;
    },
    [merch, requireOwner]
  );

  // Generic content block upsert
  const saveBlock = useCallback(
    async (blockType: string, id: string | null, title: string, url: string | null, metadata: any, sortOrder: number) => {
      if (!requireOwner()) return;
      if (id) {
        const { error } = await supabase.rpc('update_profile_block', {
          p_id: Number(id),
          p_title: title,
          p_url: url,
          p_metadata: metadata,
          p_sort_order: sortOrder,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('add_profile_block', {
          p_block_type: blockType,
          p_title: title,
          p_url: url,
          p_metadata: metadata,
          p_sort_order: sortOrder,
        });
        if (error) throw error;
      }
      setModulesReloadNonce((n) => n + 1);
    },
    [requireOwner]
  );

  const openBusinessModal = useCallback(() => {
    if (!requireOwner()) return;
    setBusinessModalVisible(true);
  }, [requireOwner]);

  const saveBusiness = useCallback(
    async (values: Record<string, any>) => {
      if (!requireOwner()) return;
      const payload = {
        business_description: String(values.business_description ?? '').trim(),
        website_url: String(values.website_url ?? '').trim(),
        contact_email: String(values.contact_email ?? '').trim(),
        contact_phone: String(values.contact_phone ?? '').trim(),
        location_or_service_area: String(values.location_or_service_area ?? '').trim(),
        hours: String(values.hours_text ?? '').trim()
          ? { text: String(values.hours_text ?? '').trim() }
          : null,
      };

      const { data, error } = await supabase.rpc('upsert_business', { p_payload: payload });
      if (error) throw error;
      setBusiness((data as any) ?? null);
    },
    [requireOwner]
  );

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/profile/${username}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setProfileData(data);

      // Load Music Videos module for musicians (public viewable, owner writable)
      try {
        const p = data?.profile as any;
        const pid = typeof p?.id === 'string' ? p.id : null;
        const ptype = String(p?.profile_type || 'default');
        if (pid && ptype === 'musician') {
          setMusicVideosLoading(true);
          const { data: list, error: listErr } = await supabase.rpc('get_profile_music_videos', { p_profile_id: pid });
          if (listErr) {
            console.log('[MusicVideos] load failed:', listErr.message);
            setMusicVideos([]);
          } else {
            const next = (Array.isArray(list) ? list : []).map((r: any) => ({
              id: String(r.id),
              title: String(r.title || ''),
              video_type: r.video_type as any,
              video_url: String(r.video_url || ''),
              youtube_id: r.youtube_id ?? null,
            })) as MusicVideoItem[];
            setMusicVideos(next);
          }
        } else {
          setMusicVideos([]);
        }

        if (pid && ptype === 'comedian') {
          setComedySpecialsLoading(true);
          const { data: list, error: listErr } = await supabase.rpc('get_comedy_specials', { p_profile_id: pid });
          if (listErr) {
            console.log('[ComedySpecials] load failed:', listErr.message);
            setComedySpecials([]);
          } else {
            const next = (Array.isArray(list) ? list : []).map((r: any) => ({
              id: String(r.id),
              title: String(r.title || ''),
              description: r.description ?? null,
              video_type: r.video_type as any,
              video_url: String(r.video_url || ''),
              youtube_id: r.youtube_id ?? null,
            })) as ComedySpecialItem[];
            setComedySpecials(next);
          }
        } else {
          setComedySpecials([]);
        }

        if (pid && (ptype === 'creator' || ptype === 'streamer')) {
          setVlogsLoading(true);
          const { data: list, error: listErr } = await supabase.rpc('get_vlogs', { p_profile_id: pid });
          if (listErr) {
            console.log('[Vlogs] load failed:', listErr.message);
            setVlogs([]);
          } else {
            const next = (Array.isArray(list) ? list : []).map((r: any) => ({
              id: String(r.id),
              video_url: String(r.video_url || ''),
              caption: r.caption ?? null,
              thumbnail_url: r.thumbnail_url ?? null,
              duration_seconds: Number(r.duration_seconds || 0),
              created_at: String(r.created_at || ''),
            })) as VlogItem[];
            setVlogs(next);
          }
        } else {
          setVlogs([]);
        }
      } catch (e) {
        console.log('[MusicVideos] load exception');
        setMusicVideos([]);
        setComedySpecials([]);
        setVlogs([]);
      } finally {
        setMusicVideosLoading(false);
        setComedySpecialsLoading(false);
        setVlogsLoading(false);
      }
    } catch (err: any) {
      console.error('Profile load error:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authToken, username]);

  const loadFeed = useCallback(
    async (mode: 'replace' | 'append') => {
      if (feedInFlightRef.current) return;
      feedInFlightRef.current = true;
      setFeedLoading(true);
      setFeedError(null);

      try {
        const cursor = mode === 'append' ? feedNextCursor : null;
        const cursorKey = cursor ? `${cursor.before_created_at}|${cursor.before_id}` : '';
        if (mode === 'append' && cursorKey && cursorKey === lastCursorKeyRef.current) {
          setFeedNextCursor(null);
          return;
        }
        lastCursorKeyRef.current = cursorKey;

        const params = new URLSearchParams();
        params.set('limit', '20');
        params.set('username', username);
        if (cursor?.before_created_at) params.set('before_created_at', cursor.before_created_at);
        if (cursor?.before_id) params.set('before_id', cursor.before_id);

        const base = apiBaseUrl.replace(/\/+$/, '');
        const res = await fetch(`${base}/api/feed?${params.toString()}`);
        const json = (await res.json()) as any;

        if (!res.ok) {
          setFeedError(String(json?.error || 'Failed to load feed'));
          if (mode === 'append') setFeedNextCursor(null);
          return;
        }

        const nextPosts = Array.isArray(json?.posts) ? (json.posts as FeedPost[]) : [];
        const nextCursor = (json?.nextCursor ?? null) as FeedCursor | null;

        if (mode === 'append' && nextPosts.length === 0) {
          setFeedNextCursor(null);
          return;
        }

        setFeedPosts((prev) => (mode === 'append' ? [...prev, ...nextPosts] : nextPosts));
        setFeedNextCursor(nextCursor);
      } catch (err) {
        setFeedError(err instanceof Error ? err.message : 'Failed to load feed');
        if (mode === 'append') setFeedNextCursor(null);
      } finally {
        feedInFlightRef.current = false;
        setFeedLoading(false);
      }
    },
    [apiBaseUrl, feedNextCursor, username]
  );

  const refreshFeed = useCallback(async () => {
    await loadFeed('replace');
  }, [loadFeed]);

  const loadMoreFeed = useCallback(async () => {
    if (!feedNextCursor) return;
    await loadFeed('append');
  }, [feedNextCursor, loadFeed]);

  useEffect(() => {
    void loadFeed('replace');
  }, [loadFeed]);

  const uploadPostMedia = useCallback(
    async (uri: string, mime: string | null): Promise<string> => {
      const profileId = session?.user?.id;
      if (!profileId) {
        throw new Error('Not signed in');
      }

      const extFromMime = mime?.includes('/') ? mime.split('/')[1] : null;
      const ext = String(extFromMime || 'jpg')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8);
      const filePath = `${profileId}/feed/${Date.now()}.${ext || 'jpg'}`;

      const blob = await fetch(uri).then((r) => r.blob());
      const { error: uploadError } = await supabase.storage.from('post-media').upload(filePath, blob, {
        contentType: mime || undefined,
        upsert: false,
      });
      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        throw new Error('Failed to get media URL');
      }
      return publicUrl;
    },
    [session?.user?.id]
  );

  const pickMedia = useCallback(
    async (kind: 'photo' | 'video') => {
      try {
        let ImagePicker: any = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          ImagePicker = require('expo-image-picker');
        } catch {
          Alert.alert(
            'Uploader not installed',
            "Install expo-image-picker in the mobile app to enable photo/video uploads."
          );
          return;
        }

        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm?.granted) {
          Alert.alert('Permission required', 'Please allow photo library access.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            kind === 'photo'
              ? ImagePicker.MediaTypeOptions.Images
              : ImagePicker.MediaTypeOptions.Videos,
          quality: 0.9,
          allowsEditing: false,
        });

        if (result?.canceled) return;
        const asset = Array.isArray(result?.assets) ? result.assets[0] : null;
        const uri = typeof asset?.uri === 'string' ? asset.uri : null;
        if (!uri) return;

        setMediaLocalUri(uri);
        const mime = typeof asset?.mimeType === 'string' ? asset.mimeType : null;
        setMediaMimeType(mime);

        setMediaUploading(true);
        try {
          const uploadedUrl = await uploadPostMedia(uri, mime);
          setMediaUrl(uploadedUrl);
        } finally {
          setMediaUploading(false);
        }
      } catch (e: any) {
        const message = String(e?.message || e || 'Failed to open media picker');
        console.error('[Profile] pickMedia error:', e);
        Alert.alert('Upload failed', message);
      }
    },
    [uploadPostMedia]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!navigation?.addListener) return;
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfile();
    });
    return unsubscribe;
  }, [loadProfile, navigation]);

  // Load connections when tab changes or expanded state changes
  useEffect(() => {
    if (connectionsExpanded && profileData) {
      loadConnections();
    }
  }, [activeConnectionsTab, connectionsExpanded, profileData?.profile.id]);

  const loadConnections = async () => {
    if (!profileData) return;
    
    setConnectionsLoading(true);
    try {
      // Call same RPC as web UserConnectionsList component
      const rpcFunctionMap = {
        following: 'get_user_following',
        followers: 'get_user_followers',
        friends: 'get_user_friends',
      };

      const { data, error } = await supabase.rpc(
        rpcFunctionMap[activeConnectionsTab],
        {
          target_user_id: profileData.profile.id,
          requesting_user_id: currentUserId || null, // Pass authenticated user ID for relationship context
        }
      );

      if (error) {
        console.error('Failed to load connections:', error);
        setConnections([]);
        return;
      }

      setConnections(data || []);
    } catch (err: any) {
      console.error('Connections load error:', err);
      setConnections([]);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profileData || followLoading) return;

    setFollowLoading(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/api/profile/follow`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetProfileId: profileData.profile.id }),
      });

      const data = await response.json();

      if (response.status === 401) {
        Alert.alert('Login Required', 'Please log in to follow users');
        return;
      }

      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to follow/unfollow');
        return;
      }

      if (data.success) {
        // Update relationship status locally
        const wasFollowing = profileData.relationship !== 'none';
        const isFollowingNow = data.status !== 'none';

        setProfileData((prev) => {
          if (!prev) return null;

          return {
            ...prev,
            relationship: data.status,
            follower_count: isFollowingNow
              ? wasFollowing
                ? prev.follower_count
                : prev.follower_count + 1
              : prev.follower_count - 1,
          };
        });
      }
    } catch (err: any) {
      console.error('Follow error:', err);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    if (!profileData) return;

    const url = `${apiBaseUrl}/${username}`;
    const title = `${profileData.profile.display_name || username} on MyLiveLinks`;
    const message = `Check out ${
      profileData.profile.display_name || username
    }'s profile on MyLiveLinks - Live streaming, links, and exclusive content! 🔥\n${url}`;

    try {
      await Share.share({
        title,
        message,
        url,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const openSocialLink = async (url: string) => {
    try {
      // Build proper URL if just username provided
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Determine platform from context (would need platform param in real impl)
        fullUrl = `https://${url}`;
      }
      await Linking.openURL(fullUrl);
    } catch (error) {
      console.error('Error opening social link:', error);
      Alert.alert('Error', 'Could not open link');
    }
  };

  const getFollowButtonConfig = () => {
    if (!profileData) return null;

    switch (profileData.relationship) {
      case 'friends':
        return {
          text: 'Friends',
          color: '#10B981',
        };
      case 'following':
        return {
          text: 'Following',
          color: '#6B7280',
        };
      default:
        return {
          text: 'Follow',
          color: '#5E9BFF',
        };
    }
  };

  const profileType = (profileData?.profile?.profile_type || 'default') as ProfileType; // Get profile type, default to 'default'
  const enabledTabs = useMemo(() => getEnabledTabs(profileType), [profileType]);

  // Load business module data (business profiles only)
  useEffect(() => {
    const pid = profileData?.profile?.id;
    const pt = profileData?.profile?.profile_type || 'default';
    if (!pid) return;
    if (pt !== 'business') return;
    void loadBusiness(pid);
  }, [profileData?.profile?.id, profileData?.profile?.profile_type, loadBusiness, modulesReloadNonce]);

  // Load musician tracks (musician only)
  useEffect(() => {
    const pid = profileData?.profile?.id;
    const pt = profileData?.profile?.profile_type || 'default';
    if (!pid) return;
    if (pt !== 'musician') return;
    void loadMusicTracks(pid);
  }, [profileData?.profile?.id, profileData?.profile?.profile_type, loadMusicTracks, modulesReloadNonce]);

  // Load content blocks bundle (schedule/featured/clips; events/portfolio are dedicated)
  useEffect(() => {
    const uname = profileData?.profile?.username;
    const pid = profileData?.profile?.id;
    if (!uname) return;
    if (!pid) return;
    void loadBlocksBundle(uname, pid);
  }, [profileData?.profile?.id, profileData?.profile?.username, loadBlocksBundle, modulesReloadNonce]);

  // Load merchandise (dedicated profile_merch RPC)
  useEffect(() => {
    const pid = profileData?.profile?.id;
    if (!pid) return;
    void loadMerch(pid);
  }, [profileData?.profile?.id, loadMerch, modulesReloadNonce]);

  // Loading state - show minimal UI immediately
  if (loading && !profileData) {
    return (
      <PageShell 
        contentStyle={styles.container}
        useNewHeader
        edges={['top']}
        onNavigateHome={() => navigation.navigate('Home')}
        onNavigateToProfile={(username) => navigation.push('Profile', { username })}
        onNavigateToRooms={() => navigation.getParent?.()?.navigate?.('Rooms')}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5E9BFF" />
        </View>
      </PageShell>
    );
  }

  // Error state
  if (error || !profileData) {
    return (
      <PageShell
        contentStyle={styles.container}
        useNewHeader
        edges={['top']}
        onNavigateHome={() => navigation.navigate('Home')}
        onNavigateToProfile={(username) => navigation.push('Profile', { username })}
        onNavigateToRooms={() => navigation.getParent?.()?.navigate?.('Rooms')}
      >
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorText}>
            {error || `The user @${username} doesn't exist.`}
          </Text>
        </View>
      </PageShell>
    );
  }

  const { profile } = profileData;

  const gifterStatus = profileData.gifter_statuses?.[profile.id];
  const gifterLevelDisplay =
    gifterStatus && Number(gifterStatus.lifetime_coins ?? 0) > 0
      ? Number(gifterStatus.level_in_tier ?? 0)
      : Number(profile.gifter_level ?? 0);
  const followBtnConfig = getFollowButtonConfig();

  // Apply user customization settings (matches web)
  const cardColor = profile.card_color || (theme.mode === 'light' ? '#FFFFFF' : theme.colors.surfaceCard);
  const cardOpacity = profile.card_opacity !== undefined ? profile.card_opacity : 0.95;
  const cardBorderRadius = {
    'small': 12,
    'medium': 18,
    'large': 24
  }[profile.card_border_radius || 'medium'] || 18;
  const accentColor = profile.accent_color || theme.colors.accent;

  // Card style to apply to all cards
  const customCardStyle = {
    backgroundColor: cardColor,
    opacity: cardOpacity,
    borderRadius: cardBorderRadius,
  };

  const formatDateTime = (value: string) => {
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  };

  const renderPostCard = (post: FeedPost) => {
    const avatarUri = resolveMediaUrl(post.author?.avatar_url ?? null);
    const mediaUri = resolveMediaUrl(post.media_url ?? null);
    return (
      <View key={post.id} style={[styles.postCard, customCardStyle]}>
        <View style={styles.postHeaderRow}>
          <Image source={getAvatarSource(avatarUri)} style={styles.postAvatarImage} />
          <View style={styles.postMetaCol}>
            <Text style={styles.postAuthor} numberOfLines={1}>
              {post.author?.username || 'Unknown'}
            </Text>
            <Text style={styles.postTimestamp} numberOfLines={1}>
              {formatDateTime(post.created_at)}
            </Text>
          </View>
          <View style={styles.postMetrics}>
            <Text style={styles.postMetricText}>💬 {post.comment_count ?? 0}</Text>
            <Text style={styles.postMetricText}>🎁 {post.gift_total_coins ?? 0}</Text>
          </View>
        </View>

        {!!post.text_content && (
          <Text style={styles.postContentText}>{String(post.text_content)}</Text>
        )}

        {!!mediaUri && (
          <View style={styles.postMediaWrap}>
            <Image source={{ uri: mediaUri }} style={styles.postMediaImage} resizeMode="cover" />
          </View>
        )}
      </View>
    );
  };

  const tileSize = (Dimensions.get('window').width - 16 * 2 - 2 * 2) / 3;
  const photoPosts = feedPosts.filter((p) => typeof p?.media_url === 'string' && !!p.media_url);

  return (
    <PageShell
      contentStyle={styles.container}
      useNewHeader
      edges={['top']}
      onNavigateHome={() => navigation.navigate('Home')}
      onNavigateToProfile={(username) => navigation.push('Profile', { username })}
      onNavigateToRooms={() => navigation.getParent?.()?.navigate?.('Rooms')}
    >
      {/* FULL-SCREEN BACKGROUND IMAGE (like web) */}
      <View style={styles.backgroundContainer}>
        {profile.profile_bg_url ? (
          <>
            <Image
              source={{ uri: resolveMediaUrl(profile.profile_bg_url) }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            {/* Gradient overlay (matches web overlayClass) */}
            <View style={styles.backgroundGradient} />
          </>
        ) : (
          // Fallback branded gradient (matches web default)
          <View style={[styles.backgroundImage, styles.backgroundFallback]} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        {...scrollHandlers}
      >
        {/* HERO CARD */}
        <View style={[styles.heroCard, customCardStyle]}>
          {/* Top Right Badges - Streak & Ranks */}
          <View style={styles.topBadges}>
            {!!profileData.streak_days && profileData.streak_days > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.badgeEmoji}>🔥</Text>
                <Text style={styles.badgeValue}>{profileData.streak_days}</Text>
                <Text style={styles.badgeLabel}>day streak</Text>
              </View>
            )}
            {!!profileData.gifter_rank && profileData.gifter_rank > 0 && (
              <View style={[styles.rankBadge, styles.gifterBadge]}>
                <Text style={styles.badgeEmoji}>🏆</Text>
                <Text style={styles.badgeValue}>#{profileData.gifter_rank}</Text>
                <Text style={styles.badgeLabel}>Gifter</Text>
              </View>
            )}
            {!!profileData.streamer_rank && profileData.streamer_rank > 0 && (
              <View style={[styles.rankBadge, styles.streamerBadge]}>
                <Text style={styles.badgeEmoji}>⭐</Text>
                <Text style={styles.badgeValue}>#{profileData.streamer_rank}</Text>
                <Text style={styles.badgeLabel}>Streamer</Text>
              </View>
            )}
          </View>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image 
              source={getAvatarSource(resolveMediaUrl(profile.avatar_url))} 
              style={styles.avatar} 
            />
            {profile.is_live && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Display Name & Username */}
          <Text style={styles.displayName}>
            {profile.display_name || profile.username}
          </Text>
          <Text style={styles.username}>@{profile.username}</Text>

          {/* Bio */}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {!isOwnProfile ? (
              <>
                <Button
                  title={followLoading ? 'Loading...' : followBtnConfig?.text || 'Follow'}
                  onPress={handleFollow}
                  variant="primary"
                  style={[
                    styles.actionButton,
                    { backgroundColor: followBtnConfig?.color || '#5E9BFF' },
                  ]}
                  disabled={followLoading}
                />
                <Button
                  title="Message"
                  onPress={() => onMessage?.(profile.id)}
                  variant="secondary"
                  style={styles.actionButton}
                />
              </>
            ) : (
              <Button
                title="Edit Profile"
                onPress={() => onEditProfile?.()}
                variant="secondary"
                style={styles.actionButtonFull}
              />
            )}
            <Pressable onPress={handleShare} style={styles.statsButton}>
              <Ionicons name="share-outline" size={20} color={accentColor} />
            </Pressable>
            <Pressable onPress={() => onStats?.(profile.username)} style={styles.statsButton}>
              <Ionicons name="bar-chart" size={20} color={accentColor} />
            </Pressable>
          </View>
        </View>

        {/* PROFILE TABS - Dynamically rendered based on profile type */}
        <View style={[styles.card, customCardStyle, { marginTop: 0, paddingVertical: 0 }]}>
          <View style={styles.profileTabs}>
            {enabledTabs.map((tab) => (
              <Pressable
                key={tab.id}
                style={[
                  styles.profileTab,
                  activeTab === tab.id && { borderBottomColor: accentColor, borderBottomWidth: 3 },
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons 
                  name={tab.icon as any}
                  size={20} 
                  color={activeTab === tab.id ? accentColor : theme.colors.textMuted} 
                />
                <Text
                  style={[
                    styles.profileTabText,
                    activeTab === tab.id && { color: accentColor, fontWeight: '700' },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* TAB CONTENT */}
        {activeTab === 'info' && (
          <>
            {/* BUSINESS INFO (Business profile type) */}
            {isSectionEnabled('business_info', profileType as any, profile.enabled_modules as any) && (isOwnProfile || businessLoading || hasAnyBusinessInfo) && (
              <View style={[styles.card, customCardStyle]}>
                <View style={styles.businessHeaderRow}>
                  <View style={styles.businessTitleRow}>
                    <Ionicons name="briefcase-outline" size={18} color={accentColor} />
                    <Text style={styles.cardTitle}>💼 Business Info</Text>
                  </View>
                  {isOwnProfile && (
                    <Pressable onPress={openBusinessModal}>
                      <Text style={[styles.businessEditLink, { color: accentColor }]}>Edit</Text>
                    </Pressable>
                  )}
                </View>

                {!businessLoading && !hasAnyBusinessInfo ? (
                  <View style={{ gap: 10 }}>
                    <Pressable style={styles.businessPromptRow} onPress={openBusinessModal}>
                      <Text style={styles.businessPromptText}>Add Business Description (Edit)</Text>
                    </Pressable>
                    <Pressable style={styles.businessPromptRow} onPress={openBusinessModal}>
                      <Text style={styles.businessPromptText}>Add Website / Email / Phone / Location/Service Area</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 14 }}>
                    {!!business?.business_description?.trim() && (
                      <Pressable
                        disabled={!isOwnProfile}
                        onPress={openBusinessModal}
                        style={styles.businessBlock}
                      >
                        <Text style={styles.businessBlockLabel}>Business Description</Text>
                        <Text style={styles.businessBlockValue}>{business.business_description}</Text>
                      </Pressable>
                    )}

                    {!!hoursText.trim() && (
                      <Pressable
                        disabled={!isOwnProfile}
                        onPress={openBusinessModal}
                        style={styles.businessLineRow}
                      >
                        <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.businessBlockLabel}>Hours</Text>
                          <Text style={styles.businessInlineValue}>{hoursText}</Text>
                        </View>
                      </Pressable>
                    )}

                    {!!business?.location_or_service_area?.trim() && (
                      <Pressable
                        disabled={!isOwnProfile}
                        onPress={openBusinessModal}
                        style={styles.businessLineRow}
                      >
                        <Ionicons name="location-outline" size={18} color={theme.colors.textMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.businessBlockLabel}>Location/Service Area</Text>
                          <Text style={styles.businessInlineValue}>{business.location_or_service_area}</Text>
                        </View>
                      </Pressable>
                    )}

                    <View style={styles.businessDivider} />

                    {!!business?.website_url?.trim() && (
                      <Pressable
                        onPress={() => {
                          if (isOwnProfile) {
                            openBusinessModal();
                          } else {
                            try {
                              void Linking.openURL(business.website_url!);
                            } catch (err) {
                              console.error('[ProfileScreen] Failed to open website:', err);
                              Alert.alert('Error', 'Could not open website link');
                            }
                          }
                        }}
                        style={styles.businessLineRow}
                      >
                        <Ionicons name="globe-outline" size={18} color={theme.colors.textMuted} />
                        <Text style={[styles.businessLinkText, { color: accentColor }]} numberOfLines={1}>
                          {business.website_url}
                        </Text>
                      </Pressable>
                    )}

                    {!!business?.contact_email?.trim() && (
                      <Pressable
                        onPress={() => {
                          if (isOwnProfile) {
                            openBusinessModal();
                          } else {
                            try {
                              void Linking.openURL(`mailto:${business.contact_email}`);
                            } catch (err) {
                              console.error('[ProfileScreen] Failed to open email:', err);
                              Alert.alert('Error', 'Could not open email client');
                            }
                          }
                        }}
                        style={styles.businessLineRow}
                      >
                        <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} />
                        <Text style={[styles.businessLinkText, { color: accentColor }]} numberOfLines={1}>
                          {business.contact_email}
                        </Text>
                      </Pressable>
                    )}

                    {!!business?.contact_phone?.trim() && (
                      <Pressable
                        onPress={() => {
                          if (isOwnProfile) {
                            openBusinessModal();
                          } else {
                            try {
                              void Linking.openURL(`tel:${business.contact_phone}`);
                            } catch (err) {
                              console.error('[ProfileScreen] Failed to open phone:', err);
                              Alert.alert('Error', 'Could not open phone dialer');
                            }
                          }
                        }}
                        style={styles.businessLineRow}
                      >
                        <Ionicons name="call-outline" size={18} color={theme.colors.textMuted} />
                        <Text style={[styles.businessLinkText, { color: accentColor }]} numberOfLines={1}>
                          {business.contact_phone}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
                {isOwnProfile && (
                  <SectionEditModal
                    visible={businessModalVisible}
                    title="Edit Business Info"
                    description="Visitors only see what you fill in."
                    onClose={() => setBusinessModalVisible(false)}
                    initialValues={{
                      business_description: business?.business_description ?? '',
                      website_url: business?.website_url ?? '',
                      contact_email: business?.contact_email ?? '',
                      contact_phone: business?.contact_phone ?? '',
                      location_or_service_area: business?.location_or_service_area ?? '',
                      hours_text: hoursText ?? '',
                    }}
                    fields={[
                      { key: 'business_description', label: 'Business Description', type: 'textarea' },
                      { key: 'website_url', label: 'Website', type: 'url', placeholder: 'https://yourbusiness.com' },
                      { key: 'contact_email', label: 'Email', type: 'email', placeholder: 'hello@yourbusiness.com' },
                      { key: 'contact_phone', label: 'Phone', type: 'phone', placeholder: '+1 555-123-4567' },
                      { key: 'location_or_service_area', label: 'Location / Service Area', type: 'text' },
                      { key: 'hours_text', label: 'Hours (optional)', type: 'textarea', placeholder: 'Mon–Fri 9am–6pm' },
                    ]}
                    onSubmit={saveBusiness}
                  />
                )}
              </View>
            )}

            {/* FEATURED (Creator) */}
            {profileType === 'creator' && (
              <FeaturedSection
                items={featured}
                isOwner={isOwnProfile}
                onAdd={() => {
                  if (!requireOwner()) return;
                  setEditingFeatured(null);
                  setFeaturedModalVisible(true);
                }}
                onEdit={(it) => {
                  if (!requireOwner()) return;
                  setEditingFeatured(it);
                  setFeaturedModalVisible(true);
                }}
                onDelete={(id) => {
                  if (!requireOwner()) return;
                  Alert.alert('Delete featured item?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void deleteBlock(id).catch((e) => Alert.alert('Delete failed', String(e?.message || e)));
                      },
                    },
                  ]);
                }}
                cardOpacity={cardOpacity}
              />
            )}

            {/* STREAM SCHEDULE (Streamer) */}
            {profileType === 'streamer' && (
              <ScheduleSection
                items={schedule}
                isOwner={isOwnProfile}
                onAdd={() => {
                  if (!requireOwner()) return;
                  setEditingSchedule(null);
                  setScheduleModalVisible(true);
                }}
                onEdit={(it) => {
                  if (!requireOwner()) return;
                  setEditingSchedule(it);
                  setScheduleModalVisible(true);
                }}
                onDelete={(id) => {
                  if (!requireOwner()) return;
                  Alert.alert('Delete schedule item?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void deleteBlock(id).catch((e) => Alert.alert('Delete failed', String(e?.message || e)));
                      },
                    },
                  ]);
                }}
                cardOpacity={cardOpacity}
              />
            )}

            {/* MUSIC SHOWCASE (Musician) */}
            {isSectionEnabled('music_showcase', profileType, profile.enabled_modules as any) && (
              <MusicSection
                items={musicTracks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  artist: t.artist_name ?? undefined,
                  cover_url: t.cover_art_url ?? undefined,
                }))}
                isOwner={isOwnProfile}
                onAdd={() => {
                  if (!requireOwner()) return;
                  setEditingTrack(null);
                  setTrackModalVisible(true);
                }}
                onEdit={(it) => {
                  if (!requireOwner()) return;
                  const t = musicTracks.find((x) => x.id === it.id) ?? null;
                  setEditingTrack(t);
                  setTrackModalVisible(true);
                }}
                onDelete={(id) => {
                  if (!requireOwner()) return;
                  Alert.alert('Delete track?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void deleteTrack(id).catch((e) => Alert.alert('Delete failed', String(e?.message || e)));
                      },
                    },
                  ]);
                }}
                onPlay={(it) => {
                  const t = musicTracks.find((x) => x.id === it.id);
                  const url = t?.audio_url;
                  if (url) {
                    try {
                      void Linking.openURL(url);
                    } catch (err) {
                      console.error('[ProfileScreen] Failed to open audio:', err);
                      Alert.alert('Error', 'Could not open audio link');
                    }
                  }
                }}
                cardOpacity={cardOpacity}
              />
            )}

            {/* UPCOMING EVENTS / SHOWS (Musician + Comedian) */}
            {isSectionEnabled('upcoming_events', profileType, profile.enabled_modules as any) && (
              <ShowsSection
                items={shows}
                isOwner={isOwnProfile}
                onAdd={() => {
                  if (!requireOwner()) return;
                  setEditingShow(null);
                  setShowModalVisible(true);
                }}
                onEdit={(it) => {
                  if (!requireOwner()) return;
                  setEditingShow(it);
                  setShowModalVisible(true);
                }}
                onDelete={(id) => {
                  if (!requireOwner()) return;
                  Alert.alert('Delete event?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void deleteEvent(id).catch((e) => Alert.alert('Delete failed', String(e?.message || e)));
                      },
                    },
                  ]);
                }}
                onGetTickets={(it) => {
                  if (it.ticket_link) {
                    try {
                      void Linking.openURL(it.ticket_link);
                    } catch (err) {
                      console.error('[ProfileScreen] Failed to open ticket link:', err);
                      Alert.alert('Error', 'Could not open ticket link');
                    }
                  }
                }}
                cardOpacity={cardOpacity}
              />
            )}

            {/* MERCHANDISE (Musician + Comedian) */}
            {isSectionEnabled('merchandise', profileType, profile.enabled_modules as any) && (
              <MerchSection
                items={merch}
                isOwner={isOwnProfile}
                onAdd={() => {
                  if (!requireOwner()) return;
                  setEditingMerch(null);
                  setMerchModalVisible(true);
                }}
                onEdit={(it) => {
                  if (!requireOwner()) return;
                  setEditingMerch(it);
                  setMerchModalVisible(true);
                }}
                onDelete={(id) => {
                  if (!requireOwner()) return;
                  Alert.alert('Delete merch item?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void deleteMerchItem(id).catch((e) => Alert.alert('Delete failed', String(e?.message || e)));
                      },
                    },
                  ]);
                }}
                onMove={(id, dir) => {
                  if (!requireOwner()) return;
                  void moveMerchItem(id, dir, profile.id).catch((e) => Alert.alert('Reorder failed', String(e?.message || e)));
                }}
                cardOpacity={cardOpacity}
              />
            )}

            {/* PORTFOLIO / PRODUCTS (Business + Creator) */}
            {isSectionEnabled('portfolio', profileType, profile.enabled_modules as any) && (
              <PortfolioSection
                items={portfolioItems}
                isOwner={isOwnProfile}
                onAdd={() => {
                  if (!requireOwner()) return;
                  setEditingPortfolio(null);
                  setPortfolioModalVisible(true);
                }}
                onEdit={(it) => {
                  if (!requireOwner()) return;
                  setEditingPortfolio(it);
                  setPortfolioModalVisible(true);
                }}
                onDelete={(id) => {
                  if (!requireOwner()) return;
                  Alert.alert('Delete item?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void deletePortfolioItem(id).catch((e) => Alert.alert('Delete failed', String(e?.message || e)));
                      },
                    },
                  ]);
                }}
                onOpen={(it) => {
                  const url = String(it.media_url ?? '').trim();
                  if (!url) return;
                  try {
                    void Linking.openURL(url);
                  } catch (err) {
                    console.error('[ProfileScreen] Failed to open portfolio link:', err);
                    Alert.alert('Error', 'Could not open portfolio link');
                  }
                }}
                cardOpacity={cardOpacity}
              />
            )}

            {/* UNIVERSAL EDIT MODALS (owner only) */}
            {isOwnProfile && (
              <>
                <SectionEditModal
                  visible={trackModalVisible}
                  title={editingTrack ? 'Edit Track' : 'Add Track'}
                  description="Add a public audio URL and confirm you have rights to share it."
                  onClose={() => {
                    setTrackModalVisible(false);
                    setEditingTrack(null);
                  }}
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
                    { key: 'audio_url', label: 'Audio URL', type: 'url', required: true },
                    { key: 'cover_art_url', label: 'Cover Art URL (optional)', type: 'url' },
                    {
                      key: 'rights_confirmed',
                      label: 'Rights Confirmation',
                      type: 'checkbox',
                      required: true,
                      checkboxLabel: 'I own the rights or have permission to upload/share this content.',
                    },
                  ]}
                  onSubmit={async (vals) => {
                    await saveTrack(vals);
                  }}
                />

                <SectionEditModal
                  visible={showModalVisible}
                  title={editingShow ? 'Edit Event' : 'Add Event'}
                  onClose={() => {
                    setShowModalVisible(false);
                    setEditingShow(null);
                  }}
                  initialValues={{
                    title: editingShow?.title ?? '',
                    start_at: '',
                    end_at: '',
                    location: editingShow?.location ?? '',
                    url: editingShow?.ticket_link ?? '',
                    notes: (editingShow as any)?.description ?? '',
                  }}
                  fields={[
                    { key: 'title', label: 'Event Title', type: 'text', required: true },
                    { key: 'start_at', label: 'Start Date/Time', type: 'text', required: true, placeholder: '2026-01-15 20:00:00' },
                    { key: 'end_at', label: 'End Date/Time (optional)', type: 'text', placeholder: '2026-01-15 23:00:00' },
                    { key: 'location', label: 'Location', type: 'text' },
                    { key: 'url', label: 'Ticket/Event URL', type: 'url' },
                    { key: 'notes', label: 'Notes/Description', type: 'textarea' },
                  ]}
                  onSubmit={saveEvent}
                />

                <SectionEditModal
                  visible={merchModalVisible}
                  title={editingMerch ? 'Edit Merchandise' : 'Add Merchandise'}
                  onClose={() => {
                    setMerchModalVisible(false);
                    setEditingMerch(null);
                  }}
                  initialValues={{
                    name: editingMerch?.name ?? '',
                    price: editingMerch?.price ?? '',
                    image_url: editingMerch?.image_url ?? '',
                    buy_url: editingMerch?.buy_url ?? '',
                    description: editingMerch?.description ?? '',
                    is_featured: editingMerch?.is_featured === true,
                  }}
                  fields={[
                    { key: 'name', label: 'Product Name', type: 'text', required: true },
                    { key: 'price', label: 'Price', type: 'text', placeholder: '$29.99' },
                    { key: 'image_url', label: 'Image URL', type: 'url' },
                    { key: 'buy_url', label: 'Purchase URL', type: 'url' },
                    { key: 'description', label: 'Description', type: 'textarea' },
                    { key: 'is_featured', label: 'Featured', type: 'checkbox', checkboxLabel: 'Show this item as featured.' },
                  ]}
                  onSubmit={saveMerchItem}
                />

                <SectionEditModal
                  visible={portfolioModalVisible}
                  title={editingPortfolio ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
                  onClose={() => {
                    setPortfolioModalVisible(false);
                    setEditingPortfolio(null);
                  }}
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
                    { key: 'media_type', label: 'Media Type', type: 'text', required: true, placeholder: 'image | video | link' },
                    { key: 'media_url', label: 'Media URL', type: 'url', required: true },
                    { key: 'thumbnail_url', label: 'Thumbnail URL (optional)', type: 'url' },
                    { key: 'description', label: 'Description (optional)', type: 'textarea' },
                  ]}
                  onSubmit={async (vals) => {
                    await savePortfolioItem(vals);
                    setPortfolioModalVisible(false);
                    setEditingPortfolio(null);
                  }}
                />

                <SectionEditModal
                  visible={scheduleModalVisible}
                  title={editingSchedule ? 'Edit Schedule Item' : 'Add Schedule Item'}
                  onClose={() => {
                    setScheduleModalVisible(false);
                    setEditingSchedule(null);
                  }}
                  initialValues={{
                    title: editingSchedule?.title ?? '',
                    day_of_week: editingSchedule?.day_of_week ?? '',
                    time: editingSchedule?.time ?? '',
                    description: editingSchedule?.description ?? '',
                    recurring: editingSchedule?.recurring === true,
                  }}
                  fields={[
                    { key: 'title', label: 'Title', type: 'text', required: true },
                    { key: 'day_of_week', label: 'Day of Week', type: 'text' },
                    { key: 'time', label: 'Time', type: 'text' },
                    { key: 'description', label: 'Description', type: 'textarea' },
                    { key: 'recurring', label: 'Recurring', type: 'checkbox', checkboxLabel: 'This schedule repeats weekly.' },
                  ]}
                  onSubmit={async (vals) => {
                    const title = String(vals.title ?? '').trim();
                    const metadata = {
                      day_of_week: String(vals.day_of_week ?? '').trim() || null,
                      time: String(vals.time ?? '').trim() || null,
                      description: String(vals.description ?? '').trim() || null,
                      recurring: vals.recurring === true,
                    };
                    await saveBlock('schedule_item', editingSchedule?.id ?? null, title, null, metadata, schedule.length);
                  }}
                />

                <SectionEditModal
                  visible={featuredModalVisible}
                  title={editingFeatured ? 'Edit Featured Link' : 'Add Featured Link'}
                  onClose={() => {
                    setFeaturedModalVisible(false);
                    setEditingFeatured(null);
                  }}
                  initialValues={{
                    title: editingFeatured?.title ?? '',
                    url: (editingFeatured as any)?.url ?? '',
                    description: editingFeatured?.description ?? '',
                    thumbnail_url: editingFeatured?.thumbnail_url ?? '',
                  }}
                  fields={[
                    { key: 'title', label: 'Title', type: 'text', required: true },
                    { key: 'url', label: 'URL', type: 'url', required: true },
                    { key: 'thumbnail_url', label: 'Thumbnail URL (optional)', type: 'url' },
                    { key: 'description', label: 'Description', type: 'textarea' },
                  ]}
                  onSubmit={async (vals) => {
                    const title = String(vals.title ?? '').trim();
                    const url = String(vals.url ?? '').trim() || null;
                    const metadata = {
                      description: String(vals.description ?? '').trim() || null,
                      thumbnail_url: String(vals.thumbnail_url ?? '').trim() || null,
                    };
                    await saveBlock('featured_link', editingFeatured?.id ?? null, title, url, metadata, featured.length);
                  }}
                />
              </>
            )}

            {/* STATS CARDS SECTION (Social Counts, Top Supporters, Top Streamers) */}
        {!profile.hide_streaming_stats && isSectionEnabled('social_counts', profileType, profile.enabled_modules as any) && (
          <View style={styles.statsCardsContainer}>
            {/* Social Counts Card */}
            <View style={[styles.card, customCardStyle]}>
              <Text style={styles.cardTitle}>Social</Text>
              <View style={styles.socialCountsRow}>
                <View style={styles.socialCountItem}>
                  <Text style={styles.socialCountValue}>
                    {formatNumber(profileData.follower_count)}
                  </Text>
                  <Text style={styles.socialCountLabel}>Followers</Text>
                </View>
                <View style={styles.socialCountDivider} />
                <View style={styles.socialCountItem}>
                  <Text style={styles.socialCountValue}>
                    {formatNumber(profileData.following_count)}
                  </Text>
                  <Text style={styles.socialCountLabel}>Following</Text>
                </View>
                <View style={styles.socialCountDivider} />
                <View style={styles.socialCountItem}>
                  <Text style={styles.socialCountValue}>
                    {formatNumber(profileData.friends_count)}
                  </Text>
                  <Text style={styles.socialCountLabel}>Friends</Text>
                </View>
              </View>
            </View>

            {/* Top Supporters Card */}
            {isSectionEnabled('top_supporters', profileType, profile.enabled_modules as any) && profileData.top_supporters.length > 0 && (
              <View style={[styles.card, customCardStyle]}>
                <Text style={styles.cardTitle}>🎁 Top Supporters</Text>
                {profileData.top_supporters.slice(0, 3).map((supporter, idx) => (
                  <View key={supporter.id} style={styles.listItem}>
                    <View style={styles.listItemAvatar}>
                      {resolveMediaUrl(supporter.avatar_url) ? (
                        <Image
                          source={{ uri: resolveMediaUrl(supporter.avatar_url) }}
                          style={styles.listItemAvatarImage}
                        />
                      ) : (
                        <Text style={styles.listItemAvatarText}>
                          {supporter.username[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemName}>
                        {supporter.display_name || supporter.username}
                      </Text>
                      <Text style={styles.listItemMeta}>
                        {formatNumber(supporter.total_gifted)} coins gifted
                      </Text>
                    </View>
                    <Text style={[styles.listItemRank, { color: accentColor }]}>#{idx + 1}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Top Streamers Card */}
            {isSectionEnabled('top_streamers', profileType, profile.enabled_modules as any) && profileData.top_streamers.length > 0 && (
              <View style={[styles.card, customCardStyle]}>
                <Text style={styles.cardTitle}>🌟 Top Streamers</Text>
                {profileData.top_streamers.slice(0, 3).map((streamer, idx) => (
                  <View key={streamer.id} style={styles.listItem}>
                    <View style={styles.listItemAvatar}>
                      {resolveMediaUrl(streamer.avatar_url) ? (
                        <Image
                          source={{ uri: resolveMediaUrl(streamer.avatar_url) }}
                          style={styles.listItemAvatarImage}
                        />
                      ) : (
                        <Text style={styles.listItemAvatarText}>
                          {streamer.username[0].toUpperCase()}
                        </Text>
                      )}
                      {streamer.is_live && <View style={styles.listItemLiveDot} />}
                    </View>
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemName}>
                        {streamer.display_name || streamer.username}
                      </Text>
                      <Text style={styles.listItemMeta}>
                        {formatNumber(streamer.diamonds_earned_lifetime)} 💎 earned
                      </Text>
                    </View>
                    <Text style={[styles.listItemRank, { color: accentColor }]}>#{idx + 1}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* SOCIAL MEDIA CARD */}
        {isSectionEnabled('social_media', profileType, profile.enabled_modules as any) && (profile.social_instagram ||
          profile.social_twitter ||
          profile.social_youtube ||
          profile.social_tiktok ||
          profile.social_facebook ||
          profile.social_twitch ||
          profile.social_discord ||
          profile.social_snapchat ||
          profile.social_linkedin ||
          profile.social_github ||
          profile.social_spotify ||
          profile.social_onlyfans) && (
          <View style={[styles.card, customCardStyle]}>
            <Text style={styles.cardTitle}>Social Media</Text>
            <View style={styles.socialRow}>
              {profile.social_instagram && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_instagram!)}>
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                </Pressable>
              )}
              {profile.social_twitter && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_twitter!)}>
                  <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                </Pressable>
              )}
              {profile.social_youtube && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_youtube!)}>
                  <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                </Pressable>
              )}
              {profile.social_tiktok && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_tiktok!)}>
                  <Ionicons name="logo-tiktok" size={24} color={theme.colors.textPrimary} />
                </Pressable>
              )}
              {profile.social_facebook && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_facebook!)}>
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                </Pressable>
              )}
              {profile.social_twitch && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_twitch!)}>
                  <Ionicons name="logo-twitch" size={24} color="#9146FF" />
                </Pressable>
              )}
              {profile.social_discord && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_discord!)}>
                  <Ionicons name="logo-discord" size={24} color="#5865F2" />
                </Pressable>
              )}
              {profile.social_spotify && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_spotify!)}>
                  <Ionicons name="musical-notes" size={24} color="#1DB954" />
                </Pressable>
              )}
              {profile.social_github && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_github!)}>
                  <Ionicons name="logo-github" size={24} color={theme.colors.textPrimary} />
                </Pressable>
              )}
              {profile.social_linkedin && (
                <Pressable style={styles.socialIcon} onPress={() => openSocialLink(profile.social_linkedin!)}>
                  <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* CONNECTIONS CARD */}
        {isSectionEnabled('connections', profileType, profile.enabled_modules as any) && (
        <View style={[styles.card, customCardStyle]}>
          <Pressable
            onPress={() => setConnectionsExpanded(!connectionsExpanded)}
            style={styles.sectionHeader}
          >
            <Text style={styles.cardTitle}>Connections</Text>
            <Ionicons 
              name={connectionsExpanded ? 'chevron-down' : 'chevron-forward'} 
              size={20} 
              color={theme.colors.textMuted} 
            />
          </Pressable>

          {connectionsExpanded && (
            <>
              {/* Tab Headers */}
              <View style={styles.connectionsTabs}>
                <Pressable
                  style={[
                    styles.connectionsTab,
                    activeConnectionsTab === 'following' && { borderBottomColor: accentColor },
                  ]}
                  onPress={() => setActiveConnectionsTab('following')}
                >
                  <Text
                    style={[
                      styles.connectionsTabText,
                      activeConnectionsTab === 'following' && { color: accentColor, fontWeight: '700' },
                    ]}
                  >
                    Following ({profileData.following_count})
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.connectionsTab,
                    activeConnectionsTab === 'followers' && { borderBottomColor: accentColor },
                  ]}
                  onPress={() => setActiveConnectionsTab('followers')}
                >
                  <Text
                    style={[
                      styles.connectionsTabText,
                      activeConnectionsTab === 'followers' && { color: accentColor, fontWeight: '700' },
                    ]}
                  >
                    Followers ({profileData.follower_count})
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.connectionsTab,
                    activeConnectionsTab === 'friends' && { borderBottomColor: accentColor },
                  ]}
                  onPress={() => setActiveConnectionsTab('friends')}
                >
                  <Text
                    style={[
                      styles.connectionsTabText,
                      activeConnectionsTab === 'friends' && { color: accentColor, fontWeight: '700' },
                    ]}
                  >
                    Friends ({profileData.friends_count})
                  </Text>
                </Pressable>
              </View>

              {/* Tab Content */}
              <View style={styles.connectionsContent}>
                {connectionsLoading ? (
                  <ActivityIndicator color={theme.colors.accentSecondary} style={styles.connectionsLoader} />
                ) : connections.length > 0 ? (
                  connections.map((user) => (
                    <Pressable
                      key={user.id}
                      style={styles.connectionItem}
                      onPress={() => {
                        navigateToProfileRoute(user.username);
                      }}
                    >
                      <View style={styles.connectionAvatar}>
                        {resolveMediaUrl(user.avatar_url) ? (
                          <Image
                            source={{ uri: resolveMediaUrl(user.avatar_url) }}
                            style={styles.connectionAvatarImage}
                          />
                        ) : (
                          <Text style={styles.connectionAvatarText}>
                            {(user.username || '?').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.connectionInfo}>
                        <Text style={styles.connectionName}>
                          {user.display_name || user.username}
                        </Text>
                        <Text style={styles.connectionUsername}>@{user.username}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    {activeConnectionsTab === 'following' && 'Not following anyone yet'}
                    {activeConnectionsTab === 'followers' && 'No followers yet'}
                    {activeConnectionsTab === 'friends' && 'No friends yet'}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>
        )}

        {/* LINKS CARD */}
        {isSectionEnabled('links', profileType, profile.enabled_modules as any) && profileData.links.length > 0 && (
          <View style={[styles.card, customCardStyle]}>
            <Text style={styles.cardTitle}>My Links</Text>
            {profileData.links.map((link) => (
              <Pressable 
                key={link.id} 
                style={styles.linkItem}
                onPress={() => {
                  try {
                    void Linking.openURL(link.url);
                  } catch (err) {
                    console.error('[ProfileScreen] Failed to open link:', err);
                    Alert.alert('Error', 'Could not open link');
                  }
                }}
              >
              <View style={styles.linkIcon}>
                <Ionicons name="link" size={20} color={accentColor} />
              </View>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* PROFILE STATS CARD */}
        {isSectionEnabled('profile_stats', profileType, profile.enabled_modules as any) && !profile.hide_streaming_stats && (
          <View style={[styles.card, customCardStyle]}>
            <Text style={styles.cardTitle}>Profile Stats</Text>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>Streams</Text>
              <Text style={styles.statsDetailValue}>
                {profileData.stream_stats.total_streams}
              </Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>Peak Viewers</Text>
              <Text style={styles.statsDetailValue}>
                {formatNumber(profileData.stream_stats.peak_viewers)}
              </Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>💎 Diamonds Earned</Text>
              <Text style={styles.statsDetailValue}>
                {formatNumber(profileData.stream_stats.diamonds_earned_lifetime)}
              </Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>Gifter Level</Text>
              <Text style={styles.statsDetailValue}>{gifterLevelDisplay}</Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>🪙 Gifts Sent</Text>
              <Text style={styles.statsDetailValue}>
                {formatNumber(profile.total_gifts_sent)}
              </Text>
            </View>
            <View style={styles.statsDetailRow}>
              <Text style={styles.statsDetailLabel}>🎁 Gifts Received</Text>
              <Text style={styles.statsDetailValue}>
                {formatNumber(profile.total_gifts_received)}
              </Text>
            </View>
          </View>
        )}

        {/* FOOTER CARD */}
        {isSectionEnabled('footer', profileType, profile.enabled_modules as any) && (
        <View style={[styles.card, customCardStyle]}>
          <View style={styles.footerContent}>
            <Text style={[styles.footerBrand, { color: accentColor }]}>MyLiveLinks</Text>
            <Text style={styles.footerText}>
              Create your own stunning profile, go live, and connect with your audience.
            </Text>
            <Button
              title="Create Your Free Profile"
              variant="primary"
              style={styles.footerButton}
              onPress={() => {
                try {
                  if (!session?.user?.id) {
                    navigation?.getParent?.()?.navigate?.('Auth');
                    return;
                  }
                } catch {
                  // ignore
                }
                try {
                  void Linking.openURL('https://mylivelinks.com/signup');
                } catch {
                  // ignore
                }
              }}
            />
            <Text style={styles.footerSubtext}>
              All-in-one platform: Live streaming • Links • Social • Monetization
            </Text>
          </View>
        </View>
        )}
          </>
        )}

        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <>
            {isOwnProfile && (
              <View style={[styles.card, customCardStyle]}>
                <Input
                  placeholder="What's happening?"
                  value={composerText}
                  onChangeText={setComposerText}
                  multiline
                  style={styles.composerInput}
                />

                <View style={styles.mediaActionsRow}>
                  <Pressable
                    onPress={() => void pickMedia('photo')}
                    disabled={composerLoading || mediaUploading}
                    style={({ pressed }) => [
                      styles.mediaActionButton,
                      pressed && !(composerLoading || mediaUploading) ? styles.mediaActionButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.mediaActionIcon}>📷</Text>
                    <Text style={styles.mediaActionText}>Photo</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void pickMedia('video')}
                    disabled={composerLoading || mediaUploading}
                    style={({ pressed }) => [
                      styles.mediaActionButton,
                      pressed && !(composerLoading || mediaUploading) ? styles.mediaActionButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.mediaActionIcon}>🎥</Text>
                    <Text style={styles.mediaActionText}>Video</Text>
                  </Pressable>

                  {(mediaUploading || mediaUrl) && (
                    <View style={styles.mediaStatusPill}>
                      <Text style={styles.mediaStatusText}>{mediaUploading ? 'Uploading…' : 'Attached'}</Text>
                    </View>
                  )}
                </View>

                {!!mediaLocalUri && !mediaMimeType?.startsWith('video/') && (
                  <View style={styles.composerPreviewWrap}>
                    <Image source={{ uri: mediaLocalUri }} style={styles.composerPreviewImage} resizeMode="cover" />
                    <Pressable
                      onPress={() => {
                        setMediaLocalUri(null);
                        setMediaMimeType(null);
                        setMediaUrl(null);
                      }}
                      style={({ pressed }) => [styles.removeMediaButton, pressed ? styles.removeMediaButtonPressed : null]}
                    >
                      <Text style={styles.removeMediaText}>Remove</Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.composerActionsRow}>
                  <Button
                    title={composerLoading ? 'Posting…' : 'Post'}
                    onPress={() => {
                      void (async () => {
                        const text = composerText.trim();
                        if ((!text && !mediaUrl) || composerLoading || mediaUploading) return;
                        if (composerInFlightRef.current) return;
                        composerInFlightRef.current = true;
                        setComposerLoading(true);
                        try {
                          const safeTextContent = text.length ? text : ' ';
                          const res = await fetchAuthed('/api/posts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text_content: safeTextContent, media_url: mediaUrl }),
                          });
                          if (!res.ok) {
                            console.error('[Profile] create post failed:', res.message);
                            return;
                          }
                          setComposerText('');
                          setMediaLocalUri(null);
                          setMediaMimeType(null);
                          setMediaUrl(null);
                          await refreshFeed();
                        } finally {
                          setComposerLoading(false);
                          composerInFlightRef.current = false;
                        }
                      })();
                    }}
                    disabled={!canPost}
                    loading={composerLoading}
                    style={styles.postButton}
                  />
                </View>
              </View>
            )}

            {feedError && (
              <View style={[styles.card, customCardStyle]}>
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateTitle}>Something went wrong</Text>
                  <Text style={styles.emptyStateText}>{feedError}</Text>
                  <Button title="Retry" onPress={() => void refreshFeed()} style={styles.stateButton} />
                </View>
              </View>
            )}

            {!feedError && feedPosts.length === 0 && !feedLoading && (
              <View style={[styles.card, customCardStyle]}>
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="albums-outline" size={64} color={theme.colors.textMuted} />
                  <Text style={styles.emptyStateTitle}>No Posts Yet</Text>
                  <Text style={styles.emptyStateText}>Posts and updates will appear here</Text>
                </View>
              </View>
            )}

            {feedPosts.map(renderPostCard)}

            <View style={styles.feedActionsRow}>
              <Button title="Refresh" onPress={() => void refreshFeed()} variant="secondary" style={styles.stateButton} />
              {feedNextCursor && (
                <Button title="Load more" onPress={() => void loadMoreFeed()} variant="secondary" style={styles.stateButton} />
              )}
            </View>
          </>
        )}

        {/* MUSIC TAB (Musician/Artist) - REAL audio player + playlist UI */}
        {activeTab === 'music' && (
          <>
            <AudioPlaylistPlayer
              profileId={profile.id}
              tracks={musicTracks}
              isOwner={isOwnProfile}
              onTracksChange={setMusicTracks}
              accentColor={accentColor}
              cardOpacity={cardOpacity}
            />
          </>
        )}

        {/* EVENTS TAB (Musician/Comedian) - empty state until backend wiring */}
        {activeTab === 'events' && (
          <View style={[styles.card, customCardStyle]}>
            <View style={styles.emptyStateContainer}>
              <Ionicons name="calendar-outline" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No Upcoming Events</Text>
              <Text style={styles.emptyStateText}>Check back later for show dates and tickets</Text>
            </View>
          </View>
        )}

        {/* PRODUCTS TAB (Business) - empty state until backend wiring */}
        {activeTab === 'products' && (
          <View style={[styles.card, customCardStyle]}>
            <View style={styles.emptyStateContainer}>
              <Ionicons name="briefcase-outline" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No Portfolio Items</Text>
              <Text style={styles.emptyStateText}>Work samples and projects will appear here</Text>
            </View>
          </View>
        )}

        {/* VIDEOS TAB (Musician/Artist) - Music Videos (upload or YouTube) */}
        {activeTab === 'videos' && (
          <>
            {profileType === 'musician' ? (
              musicVideosLoading ? (
                <View style={[styles.card, customCardStyle]}>
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                  </View>
                </View>
              ) : (
                <MusicVideosSection
                  profileId={profile.id}
                  isOwner={isOwnProfile}
                  items={musicVideos}
                  onItemsChange={setMusicVideos}
                  cardOpacity={cardOpacity}
                  accentColor={accentColor}
                />
              )
            ) : profileType === 'comedian' ? (
              comedySpecialsLoading ? (
                <View style={[styles.card, customCardStyle]}>
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                  </View>
                </View>
              ) : (
                <ComedySpecialsSection
                  profileId={profile.id}
                  isOwner={isOwnProfile}
                  items={comedySpecials}
                  onItemsChange={setComedySpecials}
                  cardOpacity={cardOpacity}
                  accentColor={accentColor}
                />
              )
            ) : profileType === 'creator' || profileType === 'streamer' ? (
              vlogsLoading ? (
                <View style={[styles.card, customCardStyle]}>
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={accentColor} />
                  </View>
                </View>
              ) : (
                <VlogReelsSection
                  profileId={profile.id}
                  isOwner={false}
                  items={vlogs}
                  onItemsChange={setVlogs}
                  cardOpacity={cardOpacity}
                  accentColor={accentColor}
                  title="🎬 Videos"
                  contentLabel="videos"
                />
              )
            ) : (
              <View style={[styles.card, customCardStyle]}>
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="videocam-outline" size={64} color={theme.colors.textMuted} />
                  <Text style={styles.emptyStateTitle}>No Videos Yet</Text>
                  <Text style={styles.emptyStateText}>Video content will appear here</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* VLOG TAB (Creator/Streamer) - VLOG / Vlog */}
        {activeTab === 'reels' && (
          <>
            {vlogsLoading ? (
              <View style={[styles.card, customCardStyle]}>
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={accentColor} />
                </View>
              </View>
            ) : (
              <VlogReelsSection
                profileId={profile.id}
                isOwner={isOwnProfile}
                items={vlogs}
                onItemsChange={setVlogs}
                cardOpacity={cardOpacity}
                accentColor={accentColor}
                title="Vlog"
                contentLabel="vlog"
              />
            )}
          </>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <>
            {isOwnProfile && (
              <View style={[styles.card, customCardStyle]}>
                <View style={styles.mediaActionsRow}>
                  <Pressable
                    onPress={() => void pickMedia('photo')}
                    disabled={composerLoading || mediaUploading}
                    style={({ pressed }) => [
                      styles.mediaActionButton,
                      pressed && !(composerLoading || mediaUploading) ? styles.mediaActionButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.mediaActionIcon}>📷</Text>
                    <Text style={styles.mediaActionText}>Upload</Text>
                  </Pressable>

                  {(mediaUploading || mediaUrl) && (
                    <View style={styles.mediaStatusPill}>
                      <Text style={styles.mediaStatusText}>{mediaUploading ? 'Uploading…' : 'Ready to post'}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.composerActionsRow}>
                  <Button
                    title={composerLoading ? 'Posting…' : 'Post'}
                    onPress={() => {
                      void (async () => {
                        const text = composerText.trim();
                        if ((!text && !mediaUrl) || composerLoading || mediaUploading) return;
                        if (composerInFlightRef.current) return;
                        composerInFlightRef.current = true;
                        setComposerLoading(true);
                        try {
                          const safeTextContent = text.length ? text : ' ';
                          const res = await fetchAuthed('/api/posts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text_content: safeTextContent, media_url: mediaUrl }),
                          });
                          if (!res.ok) {
                            console.error('[Profile] create post failed:', res.message);
                            return;
                          }
                          setComposerText('');
                          setMediaLocalUri(null);
                          setMediaMimeType(null);
                          setMediaUrl(null);
                          await refreshFeed();
                        } finally {
                          setComposerLoading(false);
                          composerInFlightRef.current = false;
                        }
                      })();
                    }}
                    disabled={!canPost}
                    loading={composerLoading}
                    style={styles.postButton}
                  />
                </View>
              </View>
            )}

            {photoPosts.length === 0 && !feedLoading ? (
              <View style={[styles.card, customCardStyle]}>
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="images-outline" size={64} color={theme.colors.textMuted} />
                  <Text style={styles.emptyStateTitle}>No Photos Yet</Text>
                  <Text style={styles.emptyStateText}>Photos and media will appear here</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.card, customCardStyle, { padding: 8 }]}>
                <View style={styles.photoGridWrap}>
                  {photoPosts.map((p) => {
                    const uri = resolveMediaUrl(p.media_url ?? null);
                    return (
                      <View
                        key={p.id}
                        style={{
                          width: tileSize,
                          height: tileSize,
                          margin: 2,
                          borderRadius: 8,
                          overflow: 'hidden',
                          backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {uri ? (
                          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: theme.colors.textMuted }}>—</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </PageShell>
  );
}

// Helper function to format numbers (matches WEB behavior via toLocaleString)
function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-US');
}

// Create theme-aware styles (NEW: Fully dynamic based on theme)
function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundPrimary,
    },
    // Full-screen background (like web)
    backgroundContainer: {
      position: 'absolute',
      top: 0, // No page header, starts right below global header
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    backgroundImage: {
      width: '100%',
      height: '100%',
    },
    backgroundGradient: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    backgroundFallback: {
      backgroundColor: '#3B82F6',
    },
    
    // Scroll container
    scroll: {
      flex: 1,
      zIndex: 1,
    },
    scrollContent: {
      paddingBottom: 100, // Space for bottom nav (68px + padding)
      paddingTop: 16,
    },

    // Bottom nav container
    bottomNavContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },

    // Loading/Error states
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      marginTop: 16,
    },
    errorTitle: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 8,
    },
    errorText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      textAlign: 'center',
    },

    postCard: {
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 18,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.elevations.card.color,
      shadowOffset: theme.elevations.card.offset,
      shadowOpacity: theme.elevations.card.opacity,
      shadowRadius: 10,
      elevation: 4,
    },
    postHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    postAvatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    postMetaCol: {
      flex: 1,
      marginLeft: 12,
    },
    postAuthor: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    postTimestamp: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    postMetrics: {
      alignItems: 'flex-end',
      gap: 2,
    },
    postMetricText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    postContentText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 10,
    },
    postMediaWrap: {
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.06)',
    },
    postMediaImage: {
      width: '100%',
      height: 220,
    },

    composerInput: {
      minHeight: 72,
      textAlignVertical: 'top',
      paddingTop: 12,
    },
    mediaActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      flexWrap: 'wrap',
    },
    mediaActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mediaActionButtonPressed: {
      opacity: 0.85,
    },
    mediaActionIcon: {
      fontSize: 16,
    },
    mediaActionText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    mediaStatusPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.mode === 'light' ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.18)',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mediaStatusText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    composerPreviewWrap: {
      marginTop: 12,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    composerPreviewImage: {
      width: '100%',
      height: 180,
    },
    removeMediaButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    removeMediaButtonPressed: {
      opacity: 0.85,
    },
    removeMediaText: {
      color: theme.mode === 'light' ? theme.colors.textPrimary : '#fff',
      fontSize: 12,
      fontWeight: '800',
    },
    composerActionsRow: {
      marginTop: 12,
      alignItems: 'flex-end',
    },
    postButton: {
      minWidth: 120,
      height: 40,
    },

    feedActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginHorizontal: 16,
      marginBottom: 20,
    },
    stateButton: {
      flex: 1,
      minHeight: 44,
    },
    photoGridWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    
    // Header buttons
    shareButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },

    // HERO CARD - Floating over background
    heroCard: {
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 18,
      marginHorizontal: 16,
      marginBottom: 24, // Match web spacing
      padding: 24,
      alignItems: 'center',
      position: 'relative',
      // Shadow
      shadowColor: theme.elevations.card.color,
      shadowOffset: theme.elevations.card.offset,
      shadowOpacity: theme.elevations.card.opacity,
      shadowRadius: theme.elevations.card.radius,
      elevation: theme.elevations.card.elevation,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    
    // Top Badges (Streak, Ranks)
    topBadges: {
      position: 'absolute',
      top: 12,
      right: 12,
      gap: 8,
      zIndex: 10,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EF4444',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    rankBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    gifterBadge: {
      backgroundColor: '#F59E0B',
    },
    streamerBadge: {
      backgroundColor: '#A855F7',
    },
    badgeEmoji: {
      fontSize: 12,
    },
    badgeValue: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },
    badgeLabel: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
      opacity: 0.9,
    },
    
    // Avatar
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 3,
      borderColor: theme.mode === 'light' ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.3)',
    },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.accentSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.mode === 'light' ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.3)',
    },
    avatarLetter: {
      color: '#fff',
      fontSize: 36,
      fontWeight: '800',
    },
    liveBadge: {
      position: 'absolute',
      bottom: -4,
      right: -8,
      backgroundColor: '#EF4444',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#fff',
    },
    liveText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    
    // Profile info
    displayName: {
      color: theme.colors.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 4,
      textAlign: 'center',
    },
    username: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    bio: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    
    // Action buttons
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    actionButton: {
      minWidth: 100,
      minHeight: 44,
    },
    actionButtonFull: {
      minWidth: 200,
      minHeight: 44,
    },
    statsButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.mode === 'light' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(94, 155, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // PROFILE TABS (Info | Feed | Photos)
    profileTabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    profileTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    profileTabText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },

    // Empty States
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyStateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },

    // CARDS - All sections use this base style
    card: {
      backgroundColor: theme.colors.surfaceCard,
      borderRadius: 18,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 24, // Match web mb-6 (24px)
      borderWidth: 1,
      borderColor: theme.colors.border,
      // Shadow
      shadowColor: theme.elevations.card.color,
      shadowOffset: theme.elevations.card.offset,
      shadowOpacity: theme.elevations.card.opacity,
      shadowRadius: 10,
      elevation: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 12,
    },

    // Business Info (Business profile type)
    businessHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    businessTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    businessEditLink: {
      fontSize: 14,
      fontWeight: '800',
    },
    businessPromptRow: {
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    businessPromptText: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    businessEmptyTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    businessPlaceholderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    businessPlaceholderLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    businessPlaceholderValue: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.textMuted,
    },
    businessBlock: {
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    businessBlockLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    businessBlockValue: {
      fontSize: 14,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    businessLineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
    },
    businessInlineValue: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    businessDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      opacity: 0.8,
    },
    businessLinkText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.colors.textPrimary,
    },

    // Stats Cards Container
    statsCardsContainer: {
      gap: 24, // Match web spacing
    },
    
    // Social Counts (in card)
    socialCountsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    socialCountItem: {
      flex: 1,
      alignItems: 'center',
    },
    socialCountValue: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    socialCountLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    socialCountDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.border,
    },

    // List Items (supporters/streamers)
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      gap: 12,
    },
    listItemAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accentSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    listItemAvatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    listItemAvatarText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
    listItemLiveDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#EF4444',
      borderWidth: 2,
      borderColor: theme.colors.surfaceCard,
    },
    listItemInfo: {
      flex: 1,
    },
    listItemName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    listItemMeta: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    listItemRank: {
      color: theme.colors.accentSecondary,
      fontSize: 16,
      fontWeight: '800',
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
    },

    // Social Media Icons
    socialRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    socialIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    // Connections
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    connectionsTabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginTop: 12,
    },
    connectionsTab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    connectionsTabActive: {
      borderBottomColor: theme.colors.accentSecondary,
    },
    connectionsTabText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    connectionsTabTextActive: {
      color: theme.colors.accentSecondary,
      fontWeight: '700',
    },
    connectionsContent: {
      paddingVertical: 16,
    },
    connectionsLoader: {
      paddingVertical: 20,
    },
    connectionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      marginBottom: 8,
      gap: 12,
    },
    connectionAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accentSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    connectionAvatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    connectionAvatarText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    connectionInfo: {
      flex: 1,
    },
    connectionName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    connectionUsername: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },

    // Links
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      gap: 12,
    },
    linkIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.mode === 'light' ? 'rgba(139,92,246,0.15)' : 'rgba(94, 155, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkInfo: {
      flex: 1,
    },
    linkTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    linkUrl: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },

    // Stats Detail Rows
    statsDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statsDetailLabel: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    statsDetailValue: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },

    // Footer
    footerContent: {
      alignItems: 'center',
    },
    footerBrand: {
      color: theme.colors.accentPrimary,
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 8,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    footerButton: {
      minWidth: 200,
      marginBottom: 12,
    },
    footerSubtext: {
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
    },
  });
}

export default ProfileScreen;
