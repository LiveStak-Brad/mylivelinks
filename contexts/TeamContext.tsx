'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase';
import type { RealtimeChannel, User } from '@supabase/supabase-js';

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

export type Surface = 'home' | 'feed' | 'chat' | 'live' | 'members' | 'settings';
export type TeamRole = 'Team_Admin' | 'Team_Moderator' | 'Team_Member';
export type UIRole = 'leader' | 'core' | 'member' | 'guest';
export type MembershipStatus = 'requested' | 'pending' | 'approved' | 'rejected' | 'banned' | 'left';

export interface TeamData {
  id: string;
  name: string;
  slug: string;
  teamTag: string;
  description?: string;
  rules?: string;
  iconUrl?: string;
  bannerUrl?: string;
  themeColor?: string;
  approvedMemberCount: number;
  pendingRequestCount: number;
  createdBy: string;
  createdAt: string;
}

export interface Membership {
  teamId: string;
  profileId: string;
  status: MembershipStatus;
  role: TeamRole;
  requestedAt: string;
  approvedAt?: string;
}

export interface PresenceSummary {
  onlineCount: number;
  liveCount: number;
  sources: Record<string, number>;
}

export interface TeamPermissions {
  canPost: boolean;
  canComment: boolean;
  canReact: boolean;
  canStartLive: boolean;
  canModerate: boolean;
  canAccessSettings: boolean;
  isMuted: boolean;
  isBanned: boolean;
}

export interface TeamContextValue {
  // Core identifiers
  teamId: string | null;
  teamSlug: string | null;
  
  // Data (cached)
  team: TeamData | null;
  membership: Membership | null;
  permissions: TeamPermissions;
  presence: PresenceSummary;
  
  // UI State
  currentSurface: Surface;
  setSurface: (surface: Surface) => void;
  
  // Derived state
  uiRole: UIRole;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  
  // Actions
  refreshTeam: () => Promise<void>;
  refreshMembership: () => Promise<void>;
  refreshPresence: () => Promise<void>;
  
  // Navigation helpers
  navigateToPanel: (surface: Surface) => void;
  navigateToLiveRoom: (roomId: string) => void;
  navigateToProfile: (profileId: string) => void;
}

const DEFAULT_PERMISSIONS: TeamPermissions = {
  canPost: false,
  canComment: false,
  canReact: false,
  canStartLive: false,
  canModerate: false,
  canAccessSettings: false,
  isMuted: false,
  isBanned: false,
};

const DEFAULT_PRESENCE: PresenceSummary = {
  onlineCount: 0,
  liveCount: 0,
  sources: {},
};

/* ════════════════════════════════════════════════════════════════════════════
   ROLE MAPPING
   ════════════════════════════════════════════════════════════════════════════ */

function dbRoleToUIRole(role: TeamRole | null, status: MembershipStatus | null): UIRole {
  if (!status || status !== 'approved') return 'guest';
  switch (role) {
    case 'Team_Admin':
      return 'leader';
    case 'Team_Moderator':
      return 'core';
    case 'Team_Member':
      return 'member';
    default:
      return 'guest';
  }
}

function derivePermissions(
  membership: Membership | null,
  isMuted: boolean,
  isBanned: boolean
): TeamPermissions {
  if (!membership || membership.status !== 'approved' || isBanned) {
    return { ...DEFAULT_PERMISSIONS, isBanned };
  }
  
  const isAdmin = membership.role === 'Team_Admin';
  const isMod = membership.role === 'Team_Moderator' || isAdmin;
  
  return {
    canPost: !isMuted,
    canComment: !isMuted,
    canReact: !isMuted,
    canStartLive: true,
    canModerate: isMod,
    canAccessSettings: isMod,
    isMuted,
    isBanned: false,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
   CONTEXT
   ════════════════════════════════════════════════════════════════════════════ */

const TeamContext = createContext<TeamContextValue | null>(null);

export function useTeamContext(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return ctx;
}

/* ════════════════════════════════════════════════════════════════════════════
   PROVIDER
   ════════════════════════════════════════════════════════════════════════════ */

interface TeamProviderProps {
  teamSlug: string;
  children: ReactNode;
}

export function TeamProvider({ teamSlug, children }: TeamProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  
  // Core state
  const [team, setTeam] = useState<TeamData | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [presence, setPresence] = useState<PresenceSummary>(DEFAULT_PRESENCE);
  const [isMuted, setIsMuted] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  
  // UI state
  const [currentSurface, setCurrentSurface] = useState<Surface>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const supabase = useMemo(() => createClient(), []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Get current user
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();
    
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Fetch team data
  // ─────────────────────────────────────────────────────────────────────────
  const fetchTeam = useCallback(async () => {
    if (!teamSlug) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', teamSlug)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Team not found');
      
      setTeam({
        id: data.id,
        name: data.name,
        slug: data.slug,
        teamTag: data.team_tag,
        description: data.description,
        rules: data.rules,
        iconUrl: data.icon_url,
        bannerUrl: data.banner_url,
        themeColor: data.theme_color,
        approvedMemberCount: data.approved_member_count,
        pendingRequestCount: data.pending_request_count,
        createdBy: data.created_by,
        createdAt: data.created_at,
      });
      setIsError(false);
      setErrorMessage(null);
    } catch (err) {
      console.error('[TeamContext] fetchTeam error:', err);
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load team');
    }
  }, [supabase, teamSlug]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Fetch membership data (loaded once, reused across panels)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchMembership = useCallback(async () => {
    if (!team?.id || !userId) {
      setMembership(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('team_memberships')
        .select('*')
        .eq('team_id', team.id)
        .eq('profile_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setMembership({
          teamId: data.team_id,
          profileId: data.profile_id,
          status: data.status,
          role: data.role,
          requestedAt: data.requested_at,
          approvedAt: data.approved_at,
        });
      } else {
        setMembership(null);
      }
    } catch (err) {
      console.error('[TeamContext] fetchMembership error:', err);
    }
  }, [supabase, team?.id, userId]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Fetch ban/mute status
  // ─────────────────────────────────────────────────────────────────────────
  const fetchModerationStatus = useCallback(async () => {
    if (!team?.id || !userId) {
      setIsBanned(false);
      setIsMuted(false);
      return;
    }
    
    try {
      // Check ban status
      const { data: banData } = await supabase
        .from('team_bans')
        .select('id')
        .eq('team_id', team.id)
        .eq('profile_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()')
        .maybeSingle();
      
      setIsBanned(!!banData);
      
      // Check mute status
      const { data: muteData } = await supabase
        .from('team_mutes')
        .select('id')
        .eq('team_id', team.id)
        .eq('profile_id', userId)
        .or('expires_at.is.null,expires_at.gt.now()')
        .maybeSingle();
      
      setIsMuted(!!muteData);
    } catch (err) {
      console.error('[TeamContext] fetchModerationStatus error:', err);
    }
  }, [supabase, team?.id, userId]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Fetch presence summary
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPresence = useCallback(async () => {
    if (!team?.id || !userId) return;
    
    try {
      const { data, error } = await supabase.rpc('rpc_get_presence_summary', {
        p_team_id: team.id,
      });
      
      if (error) throw error;
      
      if (data) {
        setPresence({
          onlineCount: data.present_total ?? 0,
          liveCount: data.sources?.live_session ?? 0,
          sources: data.sources ?? {},
        });
      }
    } catch (err) {
      // Presence is non-critical, log but don't error
      console.warn('[TeamContext] fetchPresence error:', err);
    }
  }, [supabase, team?.id, userId]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Initial data load
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    
    const loadAll = async () => {
      setIsLoading(true);
      await fetchTeam();
      if (mounted) setIsLoading(false);
    };
    
    loadAll();
    return () => { mounted = false; };
  }, [fetchTeam]);
  
  // Load membership after team is fetched
  useEffect(() => {
    if (team?.id && userId) {
      fetchMembership();
      fetchModerationStatus();
      fetchPresence();
    }
  }, [team?.id, userId, fetchMembership, fetchModerationStatus, fetchPresence]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Presence heartbeat (every 30s when viewing team)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!team?.id || !userId) return;
    
    const sendHeartbeat = async () => {
      try {
        await supabase.rpc('rpc_upsert_team_presence', {
          p_team_id: team.id,
          p_member_id: userId,
          p_source: 'web',
        });
      } catch (err) {
        console.warn('[TeamContext] heartbeat error:', err);
      }
    };
    
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    
    return () => clearInterval(interval);
  }, [supabase, team?.id, userId]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Realtime subscriptions
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!team?.id) return;
    
    const channels: RealtimeChannel[] = [];
    
    // Subscribe to team updates
    const teamChannel = supabase
      .channel(`team:${team.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${team.id}` },
        () => fetchTeam()
      )
      .subscribe();
    channels.push(teamChannel);
    
    // Subscribe to presence changes (poll every 30s instead of realtime for efficiency)
    const presenceInterval = setInterval(fetchPresence, 30000);
    
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      clearInterval(presenceInterval);
    };
  }, [supabase, team?.id, fetchTeam, fetchPresence]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────
  const uiRole = useMemo(
    () => dbRoleToUIRole(membership?.role ?? null, membership?.status ?? null),
    [membership]
  );
  
  const permissions = useMemo(
    () => derivePermissions(membership, isMuted, isBanned),
    [membership, isMuted, isBanned]
  );
  
  // ─────────────────────────────────────────────────────────────────────────
  // Navigation helpers
  // ─────────────────────────────────────────────────────────────────────────
  const setSurface = useCallback((surface: Surface) => {
    // Don't allow settings access without permission
    if (surface === 'settings' && !permissions.canAccessSettings) {
      console.warn('[TeamContext] Blocked navigation to settings: no permission');
      return;
    }
    setCurrentSurface(surface);
  }, [permissions.canAccessSettings]);
  
  const navigateToPanel = useCallback((surface: Surface) => {
    setSurface(surface);
  }, [setSurface]);
  
  const navigateToLiveRoom = useCallback((roomId: string) => {
    // Preserve team context, navigate to live room
    window.location.href = `/live/${roomId}?team=${teamSlug}`;
  }, [teamSlug]);
  
  const navigateToProfile = useCallback((profileId: string) => {
    // Open profile while preserving team context
    window.location.href = `/p/${profileId}`;
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────────────────────
  const value = useMemo<TeamContextValue>(() => ({
    teamId: team?.id ?? null,
    teamSlug,
    team,
    membership,
    permissions,
    presence,
    currentSurface,
    setSurface,
    uiRole,
    isLoading,
    isError,
    errorMessage,
    refreshTeam: fetchTeam,
    refreshMembership: fetchMembership,
    refreshPresence: fetchPresence,
    navigateToPanel,
    navigateToLiveRoom,
    navigateToProfile,
  }), [
    team,
    teamSlug,
    membership,
    permissions,
    presence,
    currentSurface,
    setSurface,
    uiRole,
    isLoading,
    isError,
    errorMessage,
    fetchTeam,
    fetchMembership,
    fetchPresence,
    navigateToPanel,
    navigateToLiveRoom,
    navigateToProfile,
  ]);
  
  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export default TeamContext;
