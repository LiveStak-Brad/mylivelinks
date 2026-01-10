'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, Eye } from 'lucide-react';

import { createClient } from '@/lib/supabase';

import { REACTIONS, type ReactionType } from './ReactionPicker';

export interface ReactorInfo {
  profileId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  reaction: ReactionType;
  reactedAt: string;
}

type ReactionFilter = ReactionType | 'all';

const FILTER_ORDER: ReactionFilter[] = ['all', 'love', 'haha', 'wow', 'sad', 'fire'];

function createEmptyCounts(): Map<ReactionType, number> {
  const counts = new Map<ReactionType, number>();
  REACTIONS.forEach(({ type }) => counts.set(type, 0));
  return counts;
}

interface PostReactionsProps {
  postId: string;
  totalCount: number;
  viewsCount?: number;
  className?: string;
}

export function PostReactions({ postId, totalCount, viewsCount, className = '' }: PostReactionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ReactionFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [countsFetched, setCountsFetched] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<Map<ReactionType, number>>(() => createEmptyCounts());
  const [summaryTotal, setSummaryTotal] = useState<number | null>(null);
  const [reactorCache, setReactorCache] = useState<Map<ReactionFilter, ReactorInfo[]>>(() => new Map());

  const totalReactions = summaryTotal ?? totalCount;

  const reactorsForActiveFilter = useMemo(() => reactorCache.get(activeFilter) ?? [], [activeFilter, reactorCache]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
    }
  }, []);

  useEffect(() => {
    setActiveFilter('all');
    setIsModalOpen(false);
    setCountsFetched(false);
    setReactionCounts(createEmptyCounts());
    setSummaryTotal(null);
    setReactorCache(new Map());
  }, [postId]);

  useEffect(() => {
    if (!isModalOpen || countsFetched) return;

    let isActive = true;

    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('rpc_get_post_reactions', { p_post_id: postId });

        if (error) {
          console.error('Failed to fetch reaction summary', error);
          return;
        }

        if (!Array.isArray(data)) return;

        const nextCounts = createEmptyCounts();
        let total = 0;

        for (const row of data) {
          const type = row.reaction_type as ReactionType;
          const count = Number(row.count ?? 0);
          if (REACTIONS.some((reaction) => reaction.type === type)) {
            nextCounts.set(type, count);
            total += count;
          }
        }

        if (isActive) {
          setReactionCounts(nextCounts);
          setSummaryTotal(total);
        }
      } catch (err) {
        console.error('Error fetching reaction summary', err);
      } finally {
        if (isActive) {
          setCountsFetched(true);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [countsFetched, isModalOpen, postId]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (reactorCache.has(activeFilter)) return;

    let isActive = true;

    (async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('rpc_get_post_reactors', {
          p_post_id: postId,
          p_reaction_filter: activeFilter === 'all' ? null : activeFilter,
        });

        if (error) {
          console.error('Failed to fetch reactors', error);
          return;
        }

        if (!Array.isArray(data)) return;

        const formatted: ReactorInfo[] = data.map((row: any) => ({
          profileId: row.profile_id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
          reaction: row.reaction_type as ReactionType,
          reactedAt: row.reacted_at,
        }));

        if (isActive) {
          setReactorCache((prev) => {
            const next = new Map(prev);
            next.set(activeFilter, formatted);
            return next;
          });
        }
      } catch (err) {
        console.error('Error fetching reactors', err);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [activeFilter, isModalOpen, postId, reactorCache]);

  const topReactionTypes = useMemo(() => {
    return Array.from(reactionCounts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([type]) => type);
  }, [reactionCounts]);

  if (totalCount === 0) return null;

  return (
    <>
      <button
        type="button"
        className={`
          flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-muted-foreground
          transition-colors hover:bg-muted/60
          ${className}
        `}
        aria-label={`See ${totalReactions} reactions`}
        onClick={() => setIsModalOpen(true)}
      >
        {topReactionTypes.length > 0 && (
          <div className="flex items-center -space-x-1">
            {topReactionTypes.map((type) => {
              const config = REACTIONS.find((reaction) => reaction.type === type);
              return (
                <span
                  key={type}
                  title={config?.label}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-xs"
                >
                  {config?.emoji}
                </span>
              );
            })}
          </div>
        )}
        <span className="font-medium">{totalReactions} reactions</span>
        {viewsCount !== undefined && (
          <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span>{viewsCount.toLocaleString()} views</span>
          </div>
        )}
      </button>

      {isModalOpen && portalTarget
        ? createPortal(
            <ReactionsModal
              reactors={reactorsForActiveFilter}
              reactionCounts={reactionCounts}
              totalCount={totalReactions}
              activeFilter={activeFilter}
              isLoading={isLoading}
              onFilterChange={setActiveFilter}
              onClose={() => {
                setIsModalOpen(false);
                setActiveFilter('all');
              }}
            />,
            portalTarget
          )
        : null}
    </>
  );
}

interface ReactionsModalProps {
  reactors: ReactorInfo[];
  reactionCounts: Map<ReactionType, number>;
  totalCount: number;
  activeFilter: ReactionFilter;
  isLoading: boolean;
  onFilterChange: (filter: ReactionFilter) => void;
  onClose: () => void;
}

function ReactionsModal({
  reactors,
  reactionCounts,
  totalCount,
  activeFilter,
  isLoading,
  onFilterChange,
  onClose,
}: ReactionsModalProps) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [onClose]);

  const selectedCount = activeFilter === 'all' ? totalCount : reactionCounts.get(activeFilter) ?? 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative m-4 flex w-full max-w-md max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold">Reactions</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-muted"
            aria-label="Close reactions modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="flex items-stretch gap-1 overflow-hidden rounded-lg border border-border">
            {FILTER_ORDER.map((filterKey) => {
              const isAll = filterKey === 'all';
              const config = REACTIONS.find((reaction) => reaction.type === filterKey);
              const count = isAll ? totalCount : reactionCounts.get(filterKey) ?? 0;
              const isActive = activeFilter === filterKey;

              return (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => onFilterChange(filterKey)}
                  className={`
                    flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-2 py-3 text-sm font-medium
                    transition-colors
                    ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/40'}
                  `}
                >
                  <span className="text-xl leading-none">{isAll ? 'All' : config?.emoji}</span>
                  <span className="text-xs font-semibold opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Loading reactions…</div>
          ) : reactors.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              {selectedCount > 0 ? 'Unable to load reactions' : 'No reactions yet'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reactors.map((reactor) => {
                const config = REACTIONS.find((reaction) => reaction.type === reactor.reaction);
                const fallbackInitial = (reactor.displayName || reactor.username || '?').trim().charAt(0).toUpperCase();

                return (
                  <Link
                    key={reactor.profileId}
                    href={`/${reactor.username}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                    onClick={onClose}
                  >
                    {reactor.avatarUrl ? (
                      <img
                        src={reactor.avatarUrl}
                        alt={reactor.username}
                        className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold uppercase text-muted-foreground">
                        {fallbackInitial || '•'}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold text-foreground">{reactor.displayName || reactor.username}</div>
                      <div className="truncate text-sm text-muted-foreground">@{reactor.username}</div>
                    </div>

                    <span className="text-2xl" aria-hidden="true">
                      {config?.emoji}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

