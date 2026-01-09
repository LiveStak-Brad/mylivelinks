'use client';

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  AlertCircle,
  Clock,
  Command,
  CornerDownLeft,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useIsMobileWeb } from '@/hooks/useIsMobileWeb';
import { createClient } from '@/lib/supabase';
import { fetchSearchResults } from '@/lib/search';
import type {
  LiveResult,
  PersonResult,
  PostResult,
  SearchResultCategory,
  SearchResultsBundle,
  TeamResult,
} from '@/types/search';
import { PRIMARY_TABS, QUICK_JUMP_TARGETS, SearchTab, SEARCH_RECENTS_STORAGE_KEY, TAB_TO_ROUTE } from './constants';

interface GlobalSearchTriggerProps {
  className?: string;
  mobileVariant?: 'pill' | 'none';
  overlayOpen?: boolean;
  onOverlayOpenChange?: (open: boolean) => void;
}

const RECENT_LIMIT = 10;

type TypeaheadStatus = 'idle' | 'loading' | 'ready' | 'error';

const EMPTY_RESULTS: SearchResultsBundle = {
  people: [],
  posts: [],
  teams: [],
  live: [],
};

export function GlobalSearchTrigger({
  className,
  mobileVariant = 'pill',
  overlayOpen,
  onOverlayOpenChange,
}: GlobalSearchTriggerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobileWeb = useIsMobileWeb();
  const supabase = useMemo(() => createClient(), []);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeaheadRef = useRef(0);
  const isRoutingRef = useRef(false);

  const urlQuery = searchParams?.get('q') ?? '';

  const [query, setQuery] = useState(urlQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [internalOverlayOpen, setInternalOverlayOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>(() => getStoredRecents());
  const [isMounted, setIsMounted] = useState(false);
  const [typeaheadResults, setTypeaheadResults] = useState<SearchResultsBundle>(EMPTY_RESULTS);
  const [typeaheadStatus, setTypeaheadStatus] = useState<TypeaheadStatus>('idle');
  const [typeaheadError, setTypeaheadError] = useState<string | null>(null);

  const effectiveOverlayOpen = overlayOpen ?? internalOverlayOpen;
  const setOverlayOpen = onOverlayOpenChange ?? setInternalOverlayOpen;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (!effectiveOverlayOpen) return;
    const timeout = window.setTimeout(() => {
      overlayInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timeout);
  }, [effectiveOverlayOpen]);

  useEffect(() => {
    if (effectiveOverlayOpen) {
      document.body.classList.add('overflow-hidden');
      return () => document.body.classList.remove('overflow-hidden');
    }
    return undefined;
  }, [effectiveOverlayOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (isMobileWeb) {
          setOverlayOpen(true);
        } else {
          desktopInputRef.current?.focus();
          setDropdownOpen(true);
        }
      }
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setOverlayOpen(false);
      }
      if (event.key === '/' && !isTypingInField(event) && !isMobileWeb) {
        event.preventDefault();
        desktopInputRef.current?.focus();
        setDropdownOpen(true);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobileWeb]);

  const quickJumpRows = useMemo(() => {
    if (!query) return [];
    return QUICK_JUMP_TARGETS.map((tab) => {
      const tabMeta = [...PRIMARY_TABS].find((t) => t.id === tab);
      return {
        tab,
        label: `${tabMeta?.label ?? 'Search'} • ${query}`,
      };
    });
  }, [query]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      pendingTypeaheadRef.current += 1;
      setTypeaheadResults(EMPTY_RESULTS);
      setTypeaheadStatus('idle');
      setTypeaheadError(null);
      return;
    }

    const requestId = ++pendingTypeaheadRef.current;
    setTypeaheadStatus('loading');
    setTypeaheadError(null);
    const timeout = window.setTimeout(async () => {
      try {
        const results = await fetchSearchResults({
          term: trimmed,
          client: supabase,
          limits: { people: 4, posts: 3, teams: 3, live: 3 },
        });

        if (pendingTypeaheadRef.current !== requestId) {
          return;
        }

        setTypeaheadResults(results);
        setTypeaheadStatus('ready');
        setTypeaheadError(null);
      } catch (error) {
        if (pendingTypeaheadRef.current !== requestId) {
          return;
        }
        setTypeaheadStatus('error');
        setTypeaheadError(error instanceof Error ? error.message : 'Unable to load suggestions');
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query, supabase]);

  const handleSubmit = useCallback(
    (value: string, targetTab: SearchTab = 'top') => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      persistRecents(trimmed, recents, setRecents);

      const params = new URLSearchParams();
      params.set('q', trimmed);
      params.set('tab', targetTab);

      const nextPath = TAB_TO_ROUTE[targetTab] ?? '/search';
      const destination = `${nextPath}?${params.toString()}`;

      isRoutingRef.current = true;
      router.push(destination);
      window.requestAnimationFrame(() => {
        isRoutingRef.current = false;
        setDropdownOpen(false);
        setOverlayOpen(false);
      });

      if (pathname?.startsWith('/search')) {
        desktopInputRef.current?.blur();
      }
    },
    [pathname, recents, router, setOverlayOpen]
  );

  const handleResultNavigate = useCallback(
    (href: string) => {
      if (!href) return;
      const trimmed = query.trim();
      if (trimmed) {
        persistRecents(trimmed, recents, setRecents);
      }

      isRoutingRef.current = true;
      router.push(href);
      window.requestAnimationFrame(() => {
        isRoutingRef.current = false;
        setDropdownOpen(false);
        setOverlayOpen(false);
      });
    },
    [query, recents, router, setOverlayOpen]
  );

  const handleRecentRemove = (value: string) => {
    const next = recents.filter((item) => item !== value);
    setRecents(next);
    try {
      window.localStorage.setItem(SEARCH_RECENTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  };

  const handleClearRecents = () => {
    setRecents([]);
    try {
      window.localStorage.removeItem(SEARCH_RECENTS_STORAGE_KEY);
    } catch {
      //
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <div className="flex w-full items-center">
        <div className="relative w-full">
          <Input
            ref={desktopInputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => {
              window.setTimeout(() => {
                if (!isRoutingRef.current) {
                  setDropdownOpen(false);
                }
              }, 150);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSubmit(query, 'top');
              }
            }}
            placeholder="Search MyLiveLinks"
            className="h-9 md:h-11 rounded-full pl-9 md:pl-11 pr-4 md:pr-16 bg-muted/60 border-transparent backdrop-blur text-sm md:text-base"
            inputSize="lg"
          />
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
          <div className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <Command className="w-4 h-4" />
            K
          </div>

          {dropdownOpen && (
            <DesktopDropdown
              recents={recents}
              query={query}
              quickJumps={quickJumpRows}
              results={typeaheadResults}
              status={typeaheadStatus}
              error={typeaheadError}
              onSelect={(value, tab) => handleSubmit(value, tab)}
              onRemoveRecent={handleRecentRemove}
              onNavigateResult={handleResultNavigate}
            />
          )}
        </div>
      </div>

      {mobileVariant !== 'none' && (
        <button
          type="button"
          className="md:hidden flex items-center justify-between w-full rounded-full bg-white/10 border border-white/15 px-4 py-2.5 text-left text-white shadow-lg shadow-primary/20 active:scale-[0.99]"
          onClick={() => setOverlayOpen(true)}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-white">
              <Search className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">
              {query ? query : 'Search MyLiveLinks'}
            </span>
          </div>
          <span className="text-xs font-semibold text-white/70">Tap to search</span>
        </button>
      )}

      {isMounted && effectiveOverlayOpen
        ? createPortal(
            <MobileOverlay
              inputRef={overlayInputRef}
              value={query}
              recents={recents}
              quickJumps={quickJumpRows}
              results={typeaheadResults}
              status={typeaheadStatus}
              error={typeaheadError}
              onChange={setQuery}
              onClose={() => setOverlayOpen(false)}
              onSubmit={(value) => handleSubmit(value, 'top')}
              onRecentSelect={(value) => handleSubmit(value, 'top')}
              onQuickJump={(tab) => handleSubmit(query, tab)}
              onNavigateResult={handleResultNavigate}
              onClearRecents={handleClearRecents}
              onRemoveRecent={handleRecentRemove}
            />,
            document.body
          )
        : null}
    </div>
  );
}

function DesktopDropdown({
  recents,
  quickJumps,
  query,
  results,
  status,
  error,
  onSelect,
  onRemoveRecent,
  onNavigateResult,
}: {
  recents: string[];
  quickJumps: Array<{ tab: SearchTab; label: string }>;
  query: string;
  results: SearchResultsBundle;
  status: TypeaheadStatus;
  error: string | null;
  onSelect: (value: string, tab?: SearchTab) => void;
  onRemoveRecent: (value: string) => void;
  onNavigateResult: (href: string) => void;
}) {
  return (
    <Card className="absolute left-0 right-0 top-12 z-[120] border border-border/80 bg-card shadow-xl">
      <div className="flex flex-col gap-4 p-4">
        <DropdownSection title="Recent">
          {recents.length === 0 ? (
            <DropdownRow disabled label="No recent searches yet" icon={<Clock className="h-4 w-4" />} />
          ) : (
            recents.map((recent) => (
              <DropdownRow
                key={recent}
                label={recent}
                icon={<Clock className="h-4 w-4" />}
                onClick={() => onSelect(recent)}
                onRemove={() => onRemoveRecent(recent)}
              />
            ))
          )}
        </DropdownSection>

        {quickJumps.length > 0 && (
          <DropdownSection title="Quick jump">
            {quickJumps.map((jump) => (
              <DropdownRow
                key={jump.tab}
                label={`Search ${capitalize(jump.tab)} for “${query}”`}
                icon={<ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                onClick={() => onSelect(query, jump.tab)}
              />
            ))}
          </DropdownSection>
        )}

        {query ? (
          <TypeaheadResultsList
            variant="desktop"
            query={query}
            results={results}
            status={status}
            error={error}
            onNavigate={onNavigateResult}
          />
        ) : (
          <DropdownSection title="Live search">
            <DropdownRow
              disabled
              label="Start typing to see live results"
              icon={<Sparkles className="h-4 w-4 text-primary" />}
            />
          </DropdownSection>
        )}
      </div>
    </Card>
  );
}

function DropdownSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function DropdownRow({
  label,
  onClick,
  icon,
  onRemove,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
        disabled
          ? 'text-muted-foreground'
          : 'hover:bg-muted/80 text-foreground'
      )}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {onRemove && (
        <X
          className="h-4 w-4 text-muted-foreground hover:text-foreground"
          role="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        />
      )}
    </button>
  );
}

const CATEGORY_LABELS: Record<SearchResultCategory, string> = {
  people: 'People',
  posts: 'Posts',
  teams: 'Teams',
  live: 'Live',
};

const CATEGORY_ORDER: SearchResultCategory[] = ['people', 'posts', 'teams', 'live'];

function TypeaheadResultsList({
  query,
  results,
  status,
  error,
  onNavigate,
  variant = 'desktop',
}: {
  query: string;
  results: SearchResultsBundle;
  status: TypeaheadStatus;
  error: string | null;
  onNavigate: (href: string) => void;
  variant?: 'desktop' | 'mobile';
}) {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <DropdownSection title="Searching">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`loading-${variant}-${index}`}
            className="h-11 w-full animate-pulse rounded-xl bg-muted/50"
          />
        ))}
      </DropdownSection>
    );
  }

  if (status === 'error') {
    return (
      <DropdownSection title="Suggestions">
        <DropdownRow
          disabled
          label={error ?? 'Unable to load suggestions'}
          icon={<AlertCircle className="h-4 w-4 text-destructive" />}
        />
      </DropdownSection>
    );
  }

  const hasResults = CATEGORY_ORDER.some((category) => results[category].length > 0);

  if (!hasResults) {
    return (
      <DropdownSection title="Live results">
        <DropdownRow
          disabled
          label={`No matches for “${trimmed}” yet`}
          icon={<Search className="h-4 w-4 text-muted-foreground" />}
        />
      </DropdownSection>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {CATEGORY_ORDER.map((category) => {
        const items = results[category];
        if (!items.length) return null;
        return (
          <DropdownSection key={category} title={CATEGORY_LABELS[category]}>
            {items.map((item) => (
              <TypeaheadResultRow
                key={`${category}-${item.id}`}
                category={category}
                item={item}
                query={trimmed}
                variant={variant}
                onNavigate={onNavigate}
              />
            ))}
          </DropdownSection>
        );
      })}
    </div>
  );
}

function TypeaheadResultRow({
  category,
  item,
  query,
  onNavigate,
  variant,
}: {
  category: SearchResultCategory;
  item: PersonResult | PostResult | TeamResult | LiveResult;
  query: string;
  onNavigate: (href: string) => void;
  variant: 'desktop' | 'mobile';
}) {
  const href = buildResultHref(category, item);
  if (!href) {
    return null;
  }

  const { title, subtitle, meta, avatar } = getResultPresentation(category, item);

  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onNavigate(href)}
      className={cn(
        'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/80',
        variant === 'mobile' && 'px-4 py-3'
      )}
    >
      <span className="flex items-center gap-3">
        {avatar}
        <span className="flex flex-col text-sm">
          <span className="font-semibold">{highlightMatches(title, query)}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground line-clamp-1">
              {highlightMatches(subtitle, query)}
            </span>
          )}
        </span>
      </span>
      {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
    </button>
  );
}

function getResultPresentation(
  category: SearchResultCategory,
  item: PersonResult | PostResult | TeamResult | LiveResult
) {
  switch (category) {
    case 'people': {
      const person = item as PersonResult;
      return {
        title: person.name,
        subtitle: person.handle,
        meta: person.online ? 'Live now' : undefined,
        avatar: (
          <ResultAvatar
            src={person.avatarUrl}
            fallbackText={person.name.slice(0, 2).toUpperCase()}
          />
        ),
      };
    }
    case 'posts': {
      const post = item as PostResult;
      return {
        title: post.author,
        subtitle: buildPostSnippet(post.text),
        meta: post.contextLabel || 'Post',
        avatar: (
          <ResultAvatar
            src={post.authorAvatarUrl}
            fallbackText={post.author.slice(0, 2).toUpperCase()}
          />
        ),
      };
    }
    case 'teams': {
      const team = item as TeamResult;
      return {
        title: team.name,
        subtitle: team.description ?? `${team.memberCount.toLocaleString()} members`,
        meta: 'Team',
        avatar: (
          <ResultAvatar
            src={team.avatarUrl}
            fallbackText={team.name.slice(0, 2).toUpperCase()}
          />
        ),
      };
    }
    case 'live':
    default: {
      const live = item as LiveResult;
      return {
        title: live.displayName,
        subtitle: `@${live.username}`,
        meta: live.isLive ? `${live.viewerCount.toLocaleString()} watching` : undefined,
        avatar: (
          <ResultAvatar
            src={live.avatarUrl}
            fallbackText={live.displayName.slice(0, 2).toUpperCase()}
          />
        ),
      };
    }
  }
}

function ResultAvatar({ src, fallbackText }: { src?: string | null; fallbackText: string }) {
  const label = fallbackText?.trim() || '??';
  return (
    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-sm font-semibold">
      {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /> : label}
    </span>
  );
}

function highlightMatches(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'ig');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={`${part}-${index}`} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPostSnippet(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= 80) return trimmed || 'Post details';
  return `${trimmed.slice(0, 77)}…`;
}

function buildResultHref(
  category: SearchResultCategory,
  item: PersonResult | PostResult | TeamResult | LiveResult
) {
  switch (category) {
    case 'people': {
      const person = item as PersonResult;
      const username = person.handle.replace(/^@/, '');
      if (username) {
        return `/${username}`;
      }
      return `/profiles/${person.id}`;
    }
    case 'posts': {
      const post = item as PostResult;
      if (post.contextHref) {
        return post.contextHref;
      }
      return `/feed?focusPostId=${post.id}`;
    }
    case 'teams': {
      const team = item as TeamResult;
      return `/teams/${team.slug || team.id}`;
    }
    case 'live':
    default: {
      const live = item as LiveResult;
      const slug = live.username || live.id;
      return `/live/${slug}`;
    }
  }
}

function MobileOverlay({
  inputRef,
  value,
  recents,
  quickJumps,
  results,
  status,
  error,
  onChange,
  onSubmit,
  onClose,
  onRecentSelect,
  onQuickJump,
  onNavigateResult,
  onClearRecents,
  onRemoveRecent,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  recents: string[];
  quickJumps: Array<{ tab: SearchTab; label: string }>;
  results: SearchResultsBundle;
  status: TypeaheadStatus;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
  onRecentSelect: (value: string) => void;
  onQuickJump: (tab: SearchTab) => void;
  onNavigateResult: (href: string) => void;
  onClearRecents: () => void;
  onRemoveRecent: (value: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[1300] flex flex-col bg-black/60 backdrop-blur-sm md:hidden">
      <div className="relative flex-1 overflow-hidden rounded-t-3xl bg-background pt-5">
        <div className="px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
              onClick={onClose}
              aria-label="Close search"
            >
              <CornerDownLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Search MyLiveLinks"
                className="h-12 rounded-2xl border-muted"
                inputSize="lg"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onSubmit(value);
                  }
                }}
              />
            </div>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-6 px-4 pb-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recents
            </span>
            {recents.length > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-primary"
                onClick={onClearRecents}
              >
                Clear all
              </button>
            )}
          </div>
          {recents.length === 0 ? (
            <span className="text-sm text-muted-foreground">No recent searches yet</span>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {recents.map((recent) => (
                <div key={recent} className="flex items-stretch">
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 text-left text-sm"
                    onClick={() => onRecentSelect(recent)}
                  >
                    {recent}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-3 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${recent} from recents`}
                    onClick={() => onRemoveRecent(recent)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {value && quickJumps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick jump
                </span>
              </div>
              <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                {quickJumps.map((jump) => (
                  <button
                    key={jump.tab}
                    type="button"
                    className="flex items-center justify-between px-4 py-3 text-left"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onQuickJump(jump.tab)}
                  >
                    <span className="text-sm font-medium">{jump.label}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <TypeaheadResultsList
            variant="mobile"
            query={value}
            results={results}
            status={status}
            error={error}
            onNavigate={onNavigateResult}
          />
        </div>
      </div>
    </div>
  );
}

function getStoredRecents(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(SEARCH_RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function persistRecents(
  value: string,
  current: string[],
  setState: (items: string[]) => void
) {
  const next = [value, ...current.filter((item) => item !== value)].slice(0, RECENT_LIMIT);
  setState(next);
  try {
    window.localStorage.setItem(SEARCH_RECENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isTypingInField(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.getAttribute('contenteditable') === 'true';
}

export default GlobalSearchTrigger;
