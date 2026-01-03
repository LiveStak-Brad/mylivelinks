'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ChevronDown,
  Filter,
  Link2,
  Lock,
  MapPin,
  RefreshCcw,
  Search as SearchIcon,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  FILTER_TOGGLES,
  MORE_TABS,
  PRIMARY_TABS,
  SearchFilterKey,
  SearchTab,
  TAB_TO_ROUTE,
  type PersonResult,
  type PostResult,
  type TeamResult,
  type LiveResult,
} from './constants';
import {
  LiveResultCard,
  PersonResultCard,
  PostResultCard,
  TeamResultCard,
} from './SearchResultCards';
import { createClient } from '@/lib/supabase';
import { LocationEditor } from '@/components/location/LocationEditor';
import { Modal } from '@/components/ui/Modal';
import { useProfileLocation } from '@/hooks/useProfileLocation';
import { getDefaultNearbyValue, formatLocationDisplay, type NearbyMode, type ProfileLocation } from '@/lib/location';
import { LOCATION_COPY } from '@/components/location/constants';

type SearchStatus = 'idle' | 'typing' | 'loading' | 'results' | 'empty' | 'error';

const NEARBY_OPTION_DEFS: { value: NearbyMode; label: string }[] = [
  { value: 'region', label: 'Region' },
  { value: 'city', label: 'City' },
  { value: 'zip', label: 'ZIP' },
];

const PERSON_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-amber-500 to-orange-500',
  'from-teal-500 to-emerald-500',
  'from-blue-500 to-cyan-500',
  'from-fuchsia-500 to-purple-500',
];

const escapeLikePattern = (value: string) => value.replace(/[%_]/g, (char) => `\\${char}`);

interface SearchPageProps {
  initialTab: SearchTab;
}

export function SearchPage({ initialTab }: SearchPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams?.get('q') ?? '';
  const urlTab = (searchParams?.get('tab') as SearchTab) || initialTab;
  const activeTab: SearchTab = urlTab || initialTab;
  const urlFilters = searchParams?.getAll('filters') ?? [];

  const [inputValue, setInputValue] = useState(urlQuery);
  const [status, setStatus] = useState<SearchStatus>(urlQuery ? 'loading' : 'idle');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [resultsVersion, setResultsVersion] = useState(0);
  const supabase = createClient();
  const nearbyEnabled = searchParams?.get('nearby') === '1';
  const urlNearbyMode = (searchParams?.get('nearbyMode') as NearbyMode) || 'region';
  const urlNearbyValue = searchParams?.get('nearbyValue') || '';
  const { location: profileLocation, loading: profileLocationLoading, refresh: refreshProfileLocation } = useProfileLocation();
  const [nearbyResults, setNearbyResults] = useState<PersonResult[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualNearbyValue, setManualNearbyValue] = useState(urlNearbyValue);
  const [peopleResults, setPeopleResults] = useState<PersonResult[]>([]);
  const [postResults, setPostResults] = useState<PostResult[]>([]);
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    setManualNearbyValue(urlNearbyValue);
  }, [urlNearbyValue]);

  const filtersSet = useMemo(() => new Set(urlFilters as SearchFilterKey[]), [urlFilters]);

  const filteredWithToggles = useMemo(() => {
    const applyFollowing = (following?: boolean) =>
      !filtersSet.has('following') || following;

    const basePeople = nearbyEnabled ? nearbyResults : peopleResults;

    const applyPeopleFilters = (people: PersonResult[]) =>
      people.filter((person) => {
        if (filtersSet.has('verified') && !person.verified) return false;
        if (filtersSet.has('online') && !person.online) return false;
        if (!applyFollowing(person.following)) return false;
        return true;
      });

    return {
      people: applyPeopleFilters(basePeople),
      posts: postResults,
      teams: teamResults,
      live: liveResults.filter((live) => {
        if (filtersSet.has('live') && !live.isLive) return false;
        return true;
      }),
    };
  }, [filtersSet, nearbyEnabled, nearbyResults, peopleResults, postResults, teamResults, liveResults]);

  const topResults = useMemo(() => {
    return {
      people: filteredWithToggles.people.slice(0, 2),
      posts: filteredWithToggles.posts.slice(0, 2),
      teams: filteredWithToggles.teams.slice(0, 2),
      live: filteredWithToggles.live.slice(0, 2),
    };
  }, [filteredWithToggles]);

  useEffect(() => {
    const trimmedQuery = urlQuery.trim();
    let cancelled = false;

    if (!trimmedQuery) {
      setPeopleResults([]);
      setPostResults([]);
      setTeamResults([]);
      setLiveResults([]);
      setSearchError(null);
      setStatus('idle');
      return;
    }

    const searchLower = trimmedQuery.toLowerCase();
    const likePattern = `%${escapeLikePattern(searchLower)}%`;
    const peopleLimit = activeTab === 'people' ? 20 : 5;
    const postsLimit = activeTab === 'posts' ? 20 : 5;
    const teamsLimit = activeTab === 'teams' ? 20 : 5;
    const liveLimit = activeTab === 'live' ? 20 : 5;

    setStatus('loading');
    setSearchError(null);

    const fetchResults = async () => {
      try {
        const [
          peopleResponse,
          postsResponse,
          teamsResponse,
          liveResponse,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, is_live, follower_count')
            .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
            .order('follower_count', { ascending: false })
            .limit(peopleLimit),
          supabase
            .from('posts')
            .select(
              `
              id,
              text_content,
              created_at,
              media_url,
              author:profiles!posts_author_id_fkey (
                id,
                username,
                display_name,
                avatar_url
              )
            `
            )
            .ilike('text_content', likePattern)
            .order('created_at', { ascending: false })
            .limit(postsLimit),
          supabase
            .from('teams')
            .select('id, name, slug, description, avatar_url, approved_member_count, member_count')
            .or(`name.ilike.${likePattern},description.ilike.${likePattern}`)
            .order('approved_member_count', { ascending: false })
            .limit(teamsLimit),
          supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, is_live')
            .eq('is_live', true)
            .or(`username.ilike.${likePattern},display_name.ilike.${likePattern}`)
            .order('username')
            .limit(liveLimit),
        ]);

        if (cancelled) return;

        if (peopleResponse.error) throw peopleResponse.error;
        if (postsResponse.error) throw postsResponse.error;
        if (teamsResponse.error) throw teamsResponse.error;
        if (liveResponse.error) throw liveResponse.error;

        const mappedPeople: PersonResult[] = (peopleResponse.data ?? []).map((row: any, index: number) => ({
          id: row.id,
          name: row.display_name || row.username || 'Unknown creator',
          handle: row.username ? `@${row.username}` : '',
          avatarUrl: row.avatar_url,
          mutualCount: Number(row.follower_count ?? 0),
          verified: false,
          location: null,
          online: Boolean(row.is_live),
          status: undefined,
          avatarColor: PERSON_GRADIENTS[index % PERSON_GRADIENTS.length],
          following: false,
        }));

        const mappedPosts: PostResult[] = (postsResponse.data ?? []).map((row: any) => ({
          id: row.id,
          text: row.text_content ?? '',
          createdAt: row.created_at ?? new Date().toISOString(),
          mediaUrl: row.media_url,
          likeCount: 0,
          commentCount: 0,
          author: row.author?.display_name || row.author?.username || 'Unknown',
          authorHandle: row.author?.username ? `@${row.author.username}` : '',
          authorAvatarUrl: row.author?.avatar_url,
        }));

        const mappedTeams: TeamResult[] = (teamsResponse.data ?? []).map((team: any) => ({
          id: team.id,
          name: team.name,
          slug: team.slug,
          description: team.description,
          avatarUrl: team.avatar_url,
          memberCount: Number(
            team.approved_member_count ?? team.member_count ?? 0
          ),
        }));

        const mappedLive: LiveResult[] = (liveResponse.data ?? []).map((row: any) => ({
          id: row.id,
          username: row.username || 'unknown',
          displayName: row.display_name || row.username || 'Live creator',
          avatarUrl: row.avatar_url,
          viewerCount: Number(row.viewer_count ?? row.current_viewer_count ?? 0),
          isLive: Boolean(row.is_live),
        }));

        setPeopleResults(mappedPeople);
        setPostResults(mappedPosts);
        setTeamResults(mappedTeams);
        setLiveResults(mappedLive);

        const totalMatches =
          mappedPeople.length + mappedPosts.length + mappedTeams.length + mappedLive.length;
        setStatus(totalMatches > 0 ? 'results' : 'empty');
      } catch (error) {
        if (cancelled) return;
        console.error('[search] fetch error:', error);
        setSearchError(error instanceof Error ? error.message : 'Unable to load search results');
        setStatus('error');
      }
    };

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [urlQuery, activeTab, supabase, resultsVersion]);

  useEffect(() => {
    if (!urlQuery.trim() || status === 'loading' || status === 'error') {
      return;
    }

    const total =
      filteredWithToggles.people.length +
      filteredWithToggles.posts.length +
      filteredWithToggles.teams.length +
      filteredWithToggles.live.length;

    if (total === 0 && status !== 'empty') {
      setStatus('empty');
    } else if (total > 0 && status === 'empty') {
      setStatus('results');
    }
  }, [filteredWithToggles, status, urlQuery]);

  useEffect(() => {
    let isCancelled = false;

    if (!nearbyEnabled) {
      setNearbyResults([]);
      setNearbyError(null);
      setNearbyLoading(false);
      return;
    }

    const resolvedValue =
      urlNearbyValue ||
      getDefaultNearbyValue(profileLocation, urlNearbyMode);

    if (!resolvedValue) {
      if (!profileLocationLoading) {
        setNearbyError(LOCATION_COPY.nearbyRequiresZip);
        setShowLocationModal(true);
      }
      return;
    }

    setNearbyLoading(true);
    setNearbyError(null);

    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc('rpc_profiles_nearby', {
          p_mode: urlNearbyMode,
          p_value: resolvedValue,
          p_limit: 100,
        });

        if (error) {
          throw error;
        }

        if (isCancelled) return;

        const mapped: PersonResult[] = (Array.isArray(data) ? data : []).map((row: any, index: number) => ({
          id: row.profile_id || `nearby-${index}`,
          name: row.display_name || row.username || 'Unknown',
          handle: row.username ? `@${row.username}` : 'unknown',
          avatarUrl: row.avatar_url,
          mutualCount: 0,
          verified: Boolean(row.is_verified ?? row.verified ?? row.adult_verified_at),
          location: buildLocationString(row),
          online: Boolean(row.is_live),
          status: row.bio ?? undefined,
          avatarColor: PERSON_GRADIENTS[index % PERSON_GRADIENTS.length],
          following: false,
        }));

        setNearbyResults(mapped);
      } catch (err) {
        if (isCancelled) return;
        setNearbyError(err instanceof Error ? err.message : 'Failed to load Nearby results');
      } finally {
        if (!isCancelled) {
          setNearbyLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    nearbyEnabled,
    urlNearbyMode,
    urlNearbyValue,
    profileLocation,
    profileLocationLoading,
    supabase,
  ]);

  const availableFilterDefs = useMemo(
    () =>
      FILTER_TOGGLES.filter(
        (toggle) => toggle.appliesTo === 'all' || toggle.appliesTo.includes(activeTab)
      ),
    [activeTab]
  );

  const updateSearchParams = useCallback(
    (updater: (params: URLSearchParams) => void, targetTab?: SearchTab, replace = false) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');

      updater(params);
      const nextTab = targetTab ?? activeTab;
      if (!params.get('tab')) {
        params.set('tab', nextTab);
      }

      const basePath = TAB_TO_ROUTE[nextTab] ?? '/search';
      const queryString = params.toString();
      const destination = queryString ? `${basePath}?${queryString}` : basePath;
      if (replace) {
        router.replace(destination, { scroll: false });
      } else {
        router.push(destination, { scroll: false });
      }
    },
    [activeTab, router, searchParams]
  );

  const handleSearchSubmit = useCallback(
    (value?: string) => {
      const term = (value ?? inputValue).trim();
      if (!term) return;

      updateSearchParams((params) => {
        params.set('q', term);
      }, activeTab);
    },
    [inputValue, activeTab, updateSearchParams]
  );

  const applyNearbyParams = useCallback(
    (mode: NearbyMode, value?: string | null, targetTab?: SearchTab) => {
      updateSearchParams((params) => {
        params.set('nearby', '1');
        params.set('nearbyMode', mode);
        if (value && value.trim()) {
          params.set('nearbyValue', value.trim());
        } else {
          params.delete('nearbyValue');
        }
      }, targetTab ?? activeTab, true);
    },
    [activeTab, updateSearchParams]
  );

  const handleToggleNearby = () => {
    if (nearbyEnabled) {
      updateSearchParams((params) => {
        params.delete('nearby');
        params.delete('nearbyMode');
        params.delete('nearbyValue');
      }, activeTab, true);
      setNearbyError(null);
      return;
    }

    const fallback = getDefaultNearbyValue(profileLocation, urlNearbyMode);
    if (!fallback) {
      setShowLocationModal(true);
      return;
    }

    applyNearbyParams(urlNearbyMode, fallback, activeTab === 'top' ? 'people' : activeTab);
  };

  const handleNearbyModeChange = (mode: NearbyMode) => {
    const fallback = getDefaultNearbyValue(profileLocation, mode) || manualNearbyValue;
    applyNearbyParams(mode, fallback);
  };

  const handleApplyManualNearbyValue = () => {
    if (!manualNearbyValue.trim()) return;
    applyNearbyParams(urlNearbyMode, manualNearbyValue);
  };

  const handleLocationSaved = (loc: ProfileLocation) => {
    refreshProfileLocation();
    setShowLocationModal(false);
    const fallback = getDefaultNearbyValue(loc, urlNearbyMode);
    if (fallback) {
      applyNearbyParams(urlNearbyMode, fallback, 'people');
    }
  };

  const handleTabChange = (tab: SearchTab) => {
    updateSearchParams(
      (params) => {
        if (inputValue.trim()) {
          params.set('q', inputValue.trim());
        }
      },
      tab
    );
    setMoreMenuOpen(false);
  };

  const toggleFilter = (filter: SearchFilterKey) => {
    updateSearchParams((params) => {
      const current = params.getAll('filters');
      const exists = current.includes(filter);
      params.delete('filters');
      const next = exists ? current.filter((f) => f !== filter) : [...current, filter];
      next.forEach((entry) => params.append('filters', entry));
    }, activeTab, true);
  };

  const resetFilters = () => {
    updateSearchParams((params) => {
      params.delete('filters');
    }, activeTab, true);
  };

  const handleRetry = () => {
    setResultsVersion((prev) => prev + 1);
    setStatus('loading');
    setSearchError(null);
  };

  const renderState = () => {
    if (nearbyEnabled && activeTab === 'people') {
      if (nearbyLoading) {
        return (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`nearby-skeleton-${index}`} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        );
      }

      if (!nearbyLoading && filteredWithToggles.people.length === 0) {
        return (
          <EmptyState
            icon={<MapPin className="h-10 w-10 text-primary" />}
            title="No nearby matches yet"
            description="Try switching modes or entering a different city or ZIP."
            action={{
              label: 'Update location',
              onClick: () => setShowLocationModal(true),
              variant: 'outline',
            }}
          />
        );
      }
    }

    if (activeTab === 'link') {
      return (
        <PlaceholderCard
          title="Link search coming soon"
          description="Use shared Link profiles and mutuals today. Dedicated Link search lands in Phase 2."
          icon={<Link2 className="h-6 w-6 text-primary" />}
        />
      );
    }

    if (activeTab === 'dating') {
      return (
        <PlaceholderCard
          title="Dating lane (opt-in)"
          description="Dating is optional. Be respectful and report harassment. Profiles unlock once you opt in."
          icon={<HeartAccent />}
          banner="Dating is optional. Be respectful. Report harassment."
        />
      );
    }

    if (activeTab === 'messages') {
      return (
        <PlaceholderCard
          title="Message search arriving Phase 2"
          description="Only your conversations will be indexed. Opt-in controls will live here."
          icon={<Lock className="h-6 w-6 text-muted-foreground" />}
          banner="Message search is private and Phase 2. Only your conversations."
        />
      );
    }

    switch (status) {
      case 'idle':
        return (
          <EmptyState
            icon={<Sparkles className="h-10 w-10 text-primary" />}
            title="Search anything"
            description="People, posts, teams, live, Link — one bar. Try “weekly live drops” or “verified in LA”."
            action={{
              label: 'Browse teams',
              onClick: () => router.push('/teams'),
              variant: 'secondary',
            }}
          />
        );
      case 'typing':
      case 'loading':
        return (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        );
      case 'error':
        return (
          <Card className="border border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col gap-3 p-6 text-sm">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{searchError ?? 'Can’t reach MyLiveLinks right now.'}</span>
              </div>
              <p className="text-muted-foreground">
                Something went wrong while searching. Check your connection or try again.
              </p>
              <Button size="sm" onClick={handleRetry} leftIcon={<RefreshCcw className="h-4 w-4" />}>
                Retry
              </Button>
            </CardContent>
          </Card>
        );
      case 'empty':
        return (
          <EmptyState
            icon={<Shield className="h-10 w-10 text-muted-foreground" />}
            title="No matches yet"
            description="Try different keywords or remove filters. Some results may be hidden due to privacy settings."
            action={{
              label: 'Reset filters',
              onClick: resetFilters,
              variant: 'outline',
            }}
          />
        );
      case 'results':
      default:
        return renderResults();
    }
  };

  const renderResults = () => {
    if (activeTab === 'top') {
      return (
        <div className="space-y-8">
          {Object.entries(topResults).map(([category, items]) => {
            if (items.length === 0) return null;

            const title = capitalize(category);
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{title}</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTabChange(category as SearchTab)}
                  >
                    View all
                  </Button>
                </div>
                <div className="space-y-3">{renderCards(category as keyof typeof topResults, items)}</div>
              </div>
            );
          })}
        </div>
      );
    }

    const collectionKey = activeTab as keyof typeof filteredWithToggles;
    const data = filteredWithToggles[collectionKey];
    return (
      <div className="space-y-3">
        {renderCards(collectionKey, data)}
      </div>
    );
  };

  const renderCards = (category: keyof typeof filteredWithToggles, data: unknown[]) => {
    switch (category) {
      case 'people':
        return (data as typeof filteredWithToggles.people).map((person) => (
          <PersonResultCard key={person.id} person={person} query={urlQuery} />
        ));
      case 'posts':
        return (data as typeof filteredWithToggles.posts).map((post) => (
          <PostResultCard key={post.id} post={post} query={urlQuery} />
        ));
      case 'teams':
        return (data as typeof filteredWithToggles.teams).map((team) => (
          <TeamResultCard key={team.id} team={team} query={urlQuery} />
        ));
      case 'live':
        return (data as typeof filteredWithToggles.live).map((live) => (
          <LiveResultCard key={live.id} live={live} query={urlQuery} />
        ));
      default:
        return null;
    }
  };

  return (
    <div className="bg-secondary/40 min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-28 space-y-4">
              <FilterPanel
                title="Filters"
                filters={availableFilterDefs}
                activeFilters={filtersSet}
                onToggle={toggleFilter}
                onReset={resetFilters}
              />
              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <h4 className="text-sm font-semibold">Safety guardrails</h4>
                  <p className="text-muted-foreground">
                    We hide minors in sensitive contexts and only show message search to you.
                  </p>
                  <div className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-xs">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    Privacy-first search
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          <section className="flex-1 space-y-5">
            <div className="rounded-3xl border border-border bg-card/70 p-4 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Input
                    value={inputValue}
                    onChange={(event) => {
                      setInputValue(event.target.value);
                      setStatus(event.target.value ? 'typing' : 'idle');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSearchSubmit(event.currentTarget.value);
                      }
                    }}
                    placeholder="Search anything..."
                    className="h-12 rounded-2xl border-transparent bg-muted/50 pl-12"
                    inputSize="lg"
                  />
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Button
                  size="lg"
                  className="md:w-44"
                  onClick={() => handleSearchSubmit()}
                  leftIcon={<SearchIcon className="h-5 w-5" />}
                >
                  Search
                </Button>
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                Tap Cmd/Ctrl+K anywhere to search instantly.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as SearchTab)}>
                <TabsList className="flex max-w-full flex-wrap gap-2 overflow-x-auto rounded-2xl bg-muted/70 p-1">
                  {PRIMARY_TABS.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="rounded-2xl px-3 py-1.5 text-sm">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMoreMenuOpen((prev) => !prev)}
                  rightIcon={<ChevronDown className="h-4 w-4" />}
                >
                  More
                </Button>
                {moreMenuOpen && (
                  <Card className="absolute right-0 z-20 mt-2 w-60 border border-border shadow-xl">
                    <CardContent className="p-2">
                      {MORE_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleTabChange(tab.id)}
                          className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-muted/60"
                        >
                          <span className="text-sm font-semibold">{tab.label}</span>
                          <span className="text-xs text-muted-foreground">{tab.description}</span>
                          {tab.id === 'messages' && (
                            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Lock className="h-3.5 w-3.5" />
                              Phase 2
                            </span>
                          )}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip
                selected={nearbyEnabled}
                onClick={handleToggleNearby}
                variant={nearbyEnabled ? 'primary' : 'outline'}
                size="md"
              >
                Nearby
              </Chip>
              {nearbyEnabled && (
                <select
                  value={urlNearbyMode}
                  onChange={(event) => handleNearbyModeChange(event.target.value as NearbyMode)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {NEARBY_OPTION_DEFS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {nearbyEnabled && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={manualNearbyValue}
                    onChange={(event) => setManualNearbyValue(event.target.value)}
                    placeholder="City, State or ZIP"
                    className="w-48"
                  />
                  <Button size="sm" variant="outline" onClick={handleApplyManualNearbyValue}>
                    Apply
                  </Button>
                </div>
              )}
              {availableFilterDefs.map((filter) => (
                <Chip
                  key={filter.id}
                  selected={filtersSet.has(filter.id)}
                  onClick={() => toggleFilter(filter.id)}
                  variant="outline"
                  size="md"
                >
                  {filter.label}
                </Chip>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto lg:hidden"
                leftIcon={<Filter className="h-4 w-4" />}
                onClick={() => setMobileFiltersOpen(true)}
              >
                Filters
              </Button>
            </div>
            {nearbyLoading && (
              <p className="text-xs text-muted-foreground">Loading Nearby matches…</p>
            )}
            {nearbyError && (
              <p className="text-xs text-destructive">
                {nearbyError}
              </p>
            )}

            {renderState()}
          </section>
        </div>
      </div>

      {mobileFiltersOpen && (
        <MobileFiltersSheet
          filters={availableFilterDefs}
          activeFilters={filtersSet}
          onClose={() => setMobileFiltersOpen(false)}
          onToggle={toggleFilter}
          onReset={resetFilters}
        />
      )}

      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="Set your ZIP to use Nearby"
        description={LOCATION_COPY.disclaimer}
        size="lg"
      >
        <LocationEditor location={profileLocation} onSaved={handleLocationSaved} />
      </Modal>
    </div>
  );
}

function buildLocationString(row: any) {
  if (!row || row.location_hidden) {
    return null;
  }

  return formatLocationDisplay(
    {
      city: row.location_city,
      region: row.location_region,
      label: row.location_label,
      zip: row.location_zip,
      country: row.location_country,
      hidden: row.location_hidden,
      showZip: row.location_show_zip,
    },
    { includeZip: false }
  );
}

function FilterPanel({
  title,
  filters,
  activeFilters,
  onToggle,
  onReset,
}: {
  title: string;
  filters: { id: SearchFilterKey; label: string }[];
  activeFilters: Set<SearchFilterKey>;
  onToggle: (filter: SearchFilterKey) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>{title}</span>
          <button type="button" className="text-xs text-primary" onClick={onReset}>
            Reset
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {filters.map((filter) => (
            <label
              key={filter.id}
              className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span>{filter.label}</span>
              <input
                type="checkbox"
                checked={activeFilters.has(filter.id)}
                onChange={() => onToggle(filter.id)}
                className="h-4 w-4 accent-primary"
              />
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MobileFiltersSheet({
  filters,
  activeFilters,
  onToggle,
  onReset,
  onClose,
}: {
  filters: { id: SearchFilterKey; label: string }[];
  activeFilters: Set<SearchFilterKey>;
  onToggle: (filter: SearchFilterKey) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1500] flex flex-col bg-black/60 backdrop-blur-sm lg:hidden">
      <div className="mt-auto rounded-t-3xl bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Filters</span>
          <button type="button" className="text-xs text-muted-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="space-y-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-border px-3 py-3 text-left"
              onClick={() => onToggle(filter.id)}
            >
              <span>{filter.label}</span>
              <span className="text-xs text-muted-foreground">
                {activeFilters.has(filter.id) ? 'On' : 'Off'}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" size="lg" onClick={onReset} className="flex-1">
            Clear all
          </Button>
          <Button size="lg" className="flex-1" onClick={onClose}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({
  title,
  description,
  icon,
  banner,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  banner?: string;
}) {
  return (
    <Card className="border border-border/80 bg-card/80">
      {banner && (
        <div className="border-b border-border bg-gradient-to-r from-primary/15 to-accent/15 px-4 py-2 text-xs font-semibold text-muted-foreground">
          {banner}
        </div>
      )}
      <CardContent className="flex items-start gap-4 p-5">
        <div className="rounded-2xl bg-muted/80 p-3 text-muted-foreground">{icon}</div>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function HeartAccent() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6 text-accent">
      <path
        d="M16 28s-10-6.27-10-14a6 6 0 0112 0 6 6 0 0112 0c0 7.73-10 14-10 14z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default SearchPage;
