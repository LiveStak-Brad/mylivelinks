'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
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
import {
  MOCK_SUGGESTED_QUERIES,
  PRIMARY_TABS,
  QUICK_JUMP_TARGETS,
  SearchTab,
  SEARCH_RECENTS_STORAGE_KEY,
  TAB_TO_ROUTE,
} from './constants';

interface GlobalSearchTriggerProps {
  className?: string;
  mobileVariant?: 'pill' | 'none';
  overlayOpen?: boolean;
  onOverlayOpenChange?: (open: boolean) => void;
}

const RECENT_LIMIT = 10;

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

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const urlQuery = searchParams?.get('q') ?? '';

  const [query, setQuery] = useState(urlQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [internalOverlayOpen, setInternalOverlayOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>(() => getStoredRecents());
  const [isMounted, setIsMounted] = useState(false);

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

  const suggestions = useMemo(() => {
    if (!query) return MOCK_SUGGESTED_QUERIES;
    const lower = query.toLowerCase();
    return MOCK_SUGGESTED_QUERIES.filter((s) => s.toLowerCase().includes(lower));
  }, [query]);

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

  const handleSubmit = (value: string, targetTab: SearchTab = 'top') => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    persistRecents(trimmed, recents, setRecents);

    const params = new URLSearchParams();
    params.set('q', trimmed);
    params.set('tab', targetTab);

    const nextPath = TAB_TO_ROUTE[targetTab] ?? '/search';
    router.push(`${nextPath}?${params.toString()}`);
    setDropdownOpen(false);
    setOverlayOpen(false);

    if (pathname?.startsWith('/search')) {
      desktopInputRef.current?.blur();
    }
  };

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
      <div className="hidden md:flex w-full items-center">
        <div className="relative w-full max-w-xl">
          <Input
            ref={desktopInputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setDropdownOpen(false), 150);
            }}
            placeholder="Search MyLiveLinks"
            className="h-11 rounded-full pl-11 pr-16 bg-muted/60 border-transparent backdrop-blur"
            inputSize="lg"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <Command className="w-4 h-4" />
            K
          </div>

          {dropdownOpen && (
            <DesktopDropdown
              recents={recents}
              suggestions={suggestions}
              query={query}
              quickJumps={quickJumpRows}
              onSelect={(value, tab) => handleSubmit(value, tab)}
              onRemoveRecent={handleRecentRemove}
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
              suggestions={suggestions}
              onChange={setQuery}
              onClose={() => setOverlayOpen(false)}
              onSubmit={(value) => handleSubmit(value, 'top')}
              onRecentSelect={(value) => handleSubmit(value, 'top')}
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
  suggestions,
  quickJumps,
  query,
  onSelect,
  onRemoveRecent,
}: {
  recents: string[];
  suggestions: string[];
  quickJumps: Array<{ tab: SearchTab; label: string }>;
  query: string;
  onSelect: (value: string, tab?: SearchTab) => void;
  onRemoveRecent: (value: string) => void;
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

        <DropdownSection title="Suggested">
          {suggestions.map((suggestion) => (
            <DropdownRow
              key={suggestion}
              label={suggestion}
              icon={<Sparkles className="h-4 w-4 text-primary" />}
              onClick={() => onSelect(suggestion)}
            />
          ))}
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

function MobileOverlay({
  inputRef,
  value,
  recents,
  suggestions,
  onChange,
  onSubmit,
  onClose,
  onRecentSelect,
  onClearRecents,
  onRemoveRecent,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  recents: string[];
  suggestions: string[];
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
  onRecentSelect: (value: string) => void;
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Suggested
              </span>
            </div>
            <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => onSubmit(suggestion)}
                >
                  <span className="text-sm">{suggestion}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
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
