'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Compass,
  Globe2,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
  Undo2,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Textarea,
  Tooltip,
  ToastProvider,
  useToast,
} from '@/components/ui';
import {
  loadDiscoverTeamsMock,
  lookupInviteCodeMock,
  type DiscoverMembershipState,
  type DiscoverTeamTemplate,
} from '@/lib/teams/discoveryMock';

type FilterOption = 'all' | 'public' | 'pending';
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface DiscoverTeamsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeamViewModel extends DiscoverTeamTemplate {
  joinState: DiscoverMembershipState | 'joining' | 'joined';
  pendingSince?: number;
  approvedSince?: number;
  undoAvailable?: boolean;
  requestNote?: string | null;
  highlight?: boolean;
}

const FOCUSABLE_SELECTORS =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const STATUS_PRIORITY: Record<TeamViewModel['joinState'], number> = {
  approved: 0,
  pending: 1,
  joined: 2,
  already_member: 3,
  joining: 4,
  eligible: 5,
};

function DiscoverTeamsOverlayContent({ isOpen, onClose }: DiscoverTeamsOverlayProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [teams, setTeams] = useState<TeamViewModel[]>([]);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [search, setSearch] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [requestModalTeam, setRequestModalTeam] = useState<TeamViewModel | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevFocusedRef = useRef<HTMLElement | null>(null);
  const undoTimersRef = useRef<Record<string, number>>({});
  const approvalTimersRef = useRef<Record<string, number>>({});
  const joinTimersRef = useRef<Record<string, number>>({});
  const highlightTimerRef = useRef<number | null>(null);
  const [highlightedTeamId, setHighlightedTeamId] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const actionHistoryRef = useRef<number[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      Object.values(undoTimersRef.current).forEach((id) => window.clearTimeout(id));
      Object.values(approvalTimersRef.current).forEach((id) => window.clearTimeout(id));
      Object.values(joinTimersRef.current).forEach((id) => window.clearTimeout(id));
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const sortedTeams = useCallback((list: TeamViewModel[]) => {
    return [...list].sort((a, b) => {
      const aPriority = STATUS_PRIORITY[a.joinState] ?? 10;
      const bPriority = STATUS_PRIORITY[b.joinState] ?? 10;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return a.order - b.order;
    });
  }, []);

  const hydrateTeam = useCallback((record: DiscoverTeamTemplate): TeamViewModel => {
    const now = Date.now();
    return {
      ...record,
      tags: [...record.tags],
      theme: { ...record.theme },
      joinState: record.initialState,
      pendingSince:
        record.initialState === 'pending' && record.pendingSinceMinutes
          ? now - record.pendingSinceMinutes * 60_000
          : undefined,
      approvedSince:
        record.initialState === 'approved' && record.approvedSinceMinutes
          ? now - record.approvedSinceMinutes * 60_000
          : undefined,
      requestNote: null,
      undoAvailable: false,
      highlight: false,
    };
  }, []);

  const fetchTeams = useCallback(async () => {
    setLoadState('loading');
    try {
      const result = await loadDiscoverTeamsMock();
      setTeams(sortedTeams(result.map((team) => hydrateTeam(team))));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [hydrateTeam, sortedTeams]);

  useEffect(() => {
    if (isOpen) {
      setFilter('all');
      setSearch('');
      setInviteFeedback(null);
      void fetchTeams();
    }
  }, [isOpen, fetchTeams]);

  useEffect(() => {
    if (!mounted || !isOpen) return;
    prevFocusedRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (inviteModalOpen || requestModalTeam) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (!focusable || focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const toFocus = overlayRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
    toFocus?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      prevFocusedRef.current?.focus();
    };
  }, [inviteModalOpen, isOpen, mounted, onClose, requestModalTeam]);

  useEffect(() => {
    const syncConnectivity = () => {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setIsOffline(offline);
    };
    syncConnectivity();
    window.addEventListener('online', syncConnectivity);
    window.addEventListener('offline', syncConnectivity);
    return () => {
      window.removeEventListener('online', syncConnectivity);
      window.removeEventListener('offline', syncConnectivity);
    };
  }, []);

  useEffect(() => {
    if (!rateLimitedUntil) return;
    const remaining = Math.max(0, rateLimitedUntil - Date.now());
    if (remaining <= 0) {
      setRateLimitedUntil(null);
      return;
    }
    const timer = window.setTimeout(() => setRateLimitedUntil(null), remaining);
    return () => window.clearTimeout(timer);
  }, [rateLimitedUntil]);

  const registerAction = useCallback(() => {
    const now = Date.now();
    if (rateLimitedUntil && now < rateLimitedUntil) {
      toast({
        title: 'Temporarily throttled',
        description: 'Try again in a few moments.',
        variant: 'warning',
      });
      return true;
    }
    actionHistoryRef.current = actionHistoryRef.current.filter((ts) => now - ts < 5000);
    actionHistoryRef.current.push(now);
    if (actionHistoryRef.current.length > 3) {
      setRateLimitedUntil(now + 8000);
      toast({
        title: 'Too many requests',
        description: 'Try again in a few minutes.',
        variant: 'warning',
      });
      return true;
    }
    return false;
  }, [rateLimitedUntil, toast]);

  const triggerHighlight = useCallback((teamId: string) => {
    setHighlightedTeamId(teamId);
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedTeamId(null);
    }, 6000);
  }, []);

  const handleJoin = useCallback(
    (teamId: string) => {
      if (registerAction()) return;
      setTeams((prev) =>
        prev.map((team) =>
          team.id === teamId
            ? {
                ...team,
                joinState: 'joining',
                undoAvailable: false,
              }
            : team
        )
      );
      if (joinTimersRef.current[teamId]) {
        window.clearTimeout(joinTimersRef.current[teamId]);
      }
      joinTimersRef.current[teamId] = window.setTimeout(() => {
        setTeams((prev) =>
          sortedTeams(
            prev.map((team) =>
              team.id === teamId
                ? {
                    ...team,
                    joinState: 'joined',
                    undoAvailable: true,
                  }
                : team
            )
          )
        );

        if (undoTimersRef.current[teamId]) {
          window.clearTimeout(undoTimersRef.current[teamId]);
        }
        undoTimersRef.current[teamId] = window.setTimeout(() => {
          setTeams((prev) =>
            prev.map((team) =>
              team.id === teamId
                ? {
                    ...team,
                    undoAvailable: false,
                  }
                : team
            )
          );
          delete undoTimersRef.current[teamId];
        }, 6000);
      }, 800 + Math.random() * 600);
    },
    [registerAction, sortedTeams]
  );

  const handleUndoJoin = useCallback((teamId: string) => {
    if (undoTimersRef.current[teamId]) {
      window.clearTimeout(undoTimersRef.current[teamId]);
      delete undoTimersRef.current[teamId];
    }
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? {
              ...team,
              joinState: 'eligible',
              undoAvailable: false,
            }
          : team
      )
    );
  }, []);

  const scheduleApproval = useCallback(
    (teamId: string) => {
      if (approvalTimersRef.current[teamId]) {
        window.clearTimeout(approvalTimersRef.current[teamId]);
      }
      approvalTimersRef.current[teamId] = window.setTimeout(() => {
        setTeams((prev) =>
          sortedTeams(
            prev.map((team) =>
              team.id === teamId && team.joinState === 'pending'
                ? {
                    ...team,
                    joinState: 'approved',
                    approvedSince: Date.now(),
                  }
                : team
            )
          )
        );
        delete approvalTimersRef.current[teamId];
      }, 6000);
    },
    [sortedTeams]
  );

  const handleRequestAccess = useCallback(
    (team: TeamViewModel, note: string) => {
      if (registerAction()) return;
      setTeams((prev) =>
        sortedTeams(
          prev.map((item) =>
            item.id === team.id
              ? {
                  ...item,
                  joinState: 'pending',
                  pendingSince: Date.now(),
                  requestNote: note || null,
                }
              : item
          )
        )
      );
      scheduleApproval(team.id);
    },
    [registerAction, scheduleApproval, sortedTeams]
  );

  const handleCancelRequest = useCallback((teamId: string) => {
    if (approvalTimersRef.current[teamId]) {
      window.clearTimeout(approvalTimersRef.current[teamId]);
      delete approvalTimersRef.current[teamId];
    }
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? {
              ...team,
              joinState: 'eligible',
              pendingSince: undefined,
              requestNote: null,
            }
          : team
      )
    );
  }, []);

  const handleInviteSubmit = async () => {
    const code = inviteCode.trim();
    if (!code) {
      setInviteFeedback({ type: 'error', message: 'Enter a code first.' });
      return;
    }
    setInviteLoading(true);
    try {
      const match = await lookupInviteCodeMock(code);
      if (!match) {
        setInviteFeedback({ type: 'error', message: 'Code not found.' });
        return;
      }
      setInviteModalOpen(false);
      setInviteCode('');
      setInviteFeedback({ type: 'success', message: `${match.name} unlocked below.` });
      setTeams((prev) => {
        const exists = prev.some((team) => team.id === match.id);
        if (exists) {
          return prev.map((team) =>
            team.id === match.id
              ? {
                  ...team,
                  visibilitySource: 'invite_code',
                }
              : team
          );
        }
        const hydrated = hydrateTeam(match);
        hydrated.joinState = 'eligible';
        hydrated.visibilitySource = 'invite_code';
        return sortedTeams([...prev, hydrated]);
      });
      triggerHighlight(match.id);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRetryLoad = () => {
    void fetchTeams();
  };

  const filteredTeams = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    let visible = teams.filter(
      (team) => team.privacy === 'public' || team.visibilitySource !== 'public_listing'
    );

    if (filter === 'public') {
      visible = visible.filter((team) => team.privacy === 'public');
    } else if (filter === 'pending') {
      visible = visible.filter(
        (team) => team.joinState === 'pending' || team.joinState === 'approved'
      );
    }

    if (normalizedQuery) {
      visible = visible.filter((team) => {
        const haystack = `${team.name} ${team.tagline} ${team.safeSummary} ${team.tags.join(' ')}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }

    return visible;
  }, [filter, search, teams]);

  const actionsDisabledReason = isOffline
    ? 'Offline. Retry when you reconnect.'
    : rateLimitedUntil
      ? 'Temporarily rate-limited. Try again shortly.'
      : undefined;

  if (!mounted || !isOpen) {
    return null;
  }

  const overlayContent = (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto flex h-full max-w-6xl flex-col px-0 py-4 sm:py-6">
        <div
          ref={overlayRef}
          className="relative flex h-full flex-col overflow-hidden rounded-none bg-card shadow-2xl ring-1 ring-border/80 lg:rounded-3xl"
          role="dialog"
          aria-modal="true"
          aria-label="Discover teams overlay"
          tabIndex={-1}
        >
          <header className="border-b border-border bg-card/80 p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                  <Compass className="h-4 w-4" />
                  Discover Teams
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Discover Teams</h2>
                <p className="text-sm text-muted-foreground">
                  Browse teams you can join. Private teams stay hidden until you have access.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setInviteModalOpen(true)} leftIcon={<KeyRound className="h-4 w-4" />}>
                  Have an invite code?
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Close discover teams overlay"
                  className="rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-wrap gap-2">
                {(['all', 'public', 'pending'] as FilterOption[]).map((option) => (
                  <Chip
                    key={option}
                    selected={filter === option}
                    onClick={() => setFilter(option)}
                    variant="outline"
                    size="sm"
                    aria-pressed={filter === option}
                  >
                    {option === 'all' && 'All teams'}
                    {option === 'public' && 'Public only'}
                    {option === 'pending' && 'Pending invites'}
                  </Chip>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Keyword search (private teams require an invite)"
                  className="pl-10"
                />
              </div>
            </div>

            {inviteFeedback && (
              <div
                className={clsx(
                  'mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm',
                  inviteFeedback.type === 'success'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{inviteFeedback.message}</span>
              </div>
            )}

            {isOffline && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                <WifiOff className="h-4 w-4" />
                <span>Offline mode — showing cached results only.</span>
              </div>
            )}

            {rateLimitedUntil && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                <Clock3 className="h-4 w-4" />
                <span>Too many requests. Try again soon.</span>
              </div>
            )}

            {loadState === 'error' && (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>We couldn’t load discovery results.</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleRetryLoad}>
                  Retry
                </Button>
              </div>
            )}
          </header>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <section className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadState === 'loading' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="animate-pulse rounded-2xl border border-border/60 bg-muted/40 p-5">
                      <div className="h-32 rounded-2xl bg-muted" />
                      <div className="mt-4 h-4 w-1/2 rounded-full bg-muted" />
                      <div className="mt-2 h-3 w-2/3 rounded-full bg-muted" />
                      <div className="mt-6 h-10 rounded-xl bg-muted" />
                    </div>
                  ))}
                </div>
              )}

              {loadState === 'error' && (
                <ErrorState
                  title="Discovery temporarily unavailable"
                  description="This UI-only mock treats failures as soft errors. Retry whenever you’re ready."
                  onRetry={handleRetryLoad}
                />
              )}

              {loadState === 'ready' && filteredTeams.length === 0 && filter === 'pending' && (
                <EmptyState
                  title="No pending requests yet"
                  description="Private teams stay invisible until you send a request or enter an invite code."
                  action={{
                    label: 'Browse public teams',
                    onClick: () => setFilter('all'),
                    variant: 'primary',
                  }}
                />
              )}

              {loadState === 'ready' && filteredTeams.length === 0 && filter !== 'pending' && (
                <EmptyState
                  title="No teams match your filters"
                  description="Adjust your filters or request an invite. Private teams never appear unless you already have access."
                  action={{
                    label: 'Reset filters',
                    onClick: () => {
                      setFilter('all');
                      setSearch('');
                    },
                    variant: 'outline',
                  }}
                />
              )}

              {loadState === 'ready' && filteredTeams.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTeams.map((team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      highlighted={highlightedTeamId === team.id}
                      actionsDisabled={Boolean(actionsDisabledReason)}
                      actionsDisabledReason={actionsDisabledReason}
                      onJoin={handleJoin}
                      onRequest={(selected) => setRequestModalTeam(selected)}
                      onCancelRequest={handleCancelRequest}
                      onSwitchTeam={() => {
                        window.dispatchEvent(new Event('mll:teams:focus'));
                        onClose();
                      }}
                      onUndo={handleUndoJoin}
                    />
                  ))}
                </div>
              )}
            </section>

            <aside className="hidden w-full max-w-sm border-t border-border bg-muted/30 p-6 lg:block lg:border-l lg:border-t-0">
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">How it works</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Public teams</strong> show a green open badge. Join instantly without leaving this screen.
                  </li>
                  <li>
                    <strong className="text-foreground">Private teams</strong> stay hidden until you have a direct invite or pending request. We only show safe summaries—never member lists.
                  </li>
                  <li>
                    <strong className="text-foreground">Requests</strong> collect an optional note, display “Awaiting approval,” and can be cancelled anytime.
                  </li>
                  <li>
                    <strong className="text-foreground">Privacy guardrails</strong> ensure invalid searches simply say “No matches”—not “no private teams found.”
                  </li>
                  <li>
                    Invite codes unlock specific private teams without revealing anything else.
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <>
      {overlayContent}
      {requestModalTeam && (
        <Modal
          isOpen
          onClose={() => {
            setRequestModalTeam(null);
            setRequestNote('');
          }}
          title={`Request access to ${requestModalTeam.name}`}
          description="Share context for admins (optional)."
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              Private teams stay invisible to everyone else. Only safe text is displayed, and you can revoke this request anytime.
            </div>
            <Textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Add an optional note (only admins for this team will see it)"
              rows={4}
            />
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setRequestModalTeam(null);
                  setRequestNote('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (requestModalTeam) {
                    handleRequestAccess(requestModalTeam, requestNote.trim());
                  }
                  setRequestModalTeam(null);
                  setRequestNote('');
                }}
              >
                Send request
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {inviteModalOpen && (
        <Modal
          isOpen
          onClose={() => setInviteModalOpen(false)}
          title="Enter invite code"
          description="Unlock a private team without revealing it to anyone else."
          size="sm"
        >
          <div className="space-y-4">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Example: ATLAS-CREW"
              autoFocus
            />
            <div className="text-xs text-muted-foreground">
              Codes are case-insensitive. Invalid codes simply show “Code not found” (no hints about private teams).
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>
                Close
              </Button>
              <Button onClick={handleInviteSubmit} isLoading={inviteLoading}>
                Unlock team
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>,
    document.body
  );
}

export default function DiscoverTeamsOverlay(props: DiscoverTeamsOverlayProps) {
  return (
    <ToastProvider>
      <DiscoverTeamsOverlayContent {...props} />
    </ToastProvider>
  );
}

interface TeamCardProps {
  team: TeamViewModel;
  highlighted: boolean;
  actionsDisabled: boolean;
  actionsDisabledReason?: string;
  onJoin: (teamId: string) => void;
  onRequest: (team: TeamViewModel) => void;
  onCancelRequest: (teamId: string) => void;
  onSwitchTeam: () => void;
  onUndo: (teamId: string) => void;
}

function TeamCard({
  team,
  highlighted,
  actionsDisabled,
  actionsDisabledReason,
  onJoin,
  onRequest,
  onCancelRequest,
  onSwitchTeam,
  onUndo,
}: TeamCardProps) {
  const memberLabel = `${formatMemberCount(team.memberCount)} members`;
  const pendingLabel = team.pendingSince ? formatRelativeTime(team.pendingSince) : null;
  const approvedLabel = team.approvedSince ? formatRelativeTime(team.approvedSince) : null;
  const disableReason = actionsDisabled ? actionsDisabledReason : undefined;

  const coverStyle = {
    backgroundImage: `linear-gradient(135deg, ${team.theme.accent}, ${team.theme.accentMuted})`,
  };

  const privacyBadge =
    team.privacy === 'public' ? (
      <Tooltip content="Anyone can join.">
        <Badge variant="success" size="sm" icon={<Globe2 className="h-3 w-3" />}>
          Public
        </Badge>
      </Tooltip>
    ) : (
      <Tooltip content="Only visible because you already have a link or invite.">
        <Badge variant="outline" size="sm" icon={<Lock className="h-3 w-3" />}>
          Private
        </Badge>
      </Tooltip>
    );

  const renderCta = () => {
    if (team.joinState === 'joining') {
      return (
        <Button fullWidth isLoading disabled>
          Joining...
        </Button>
      );
    }

    if (team.joinState === 'joined') {
      return (
        <div className="space-y-2 rounded-2xl border border-success/30 bg-success/5 p-3 text-sm text-success">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            You&apos;re in! Switch to this team.
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="primary" onClick={onSwitchTeam}>
              Switch to team
            </Button>
            {team.undoAvailable && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs font-semibold"
                onClick={() => onUndo(team.id)}
              >
                Undo
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (team.joinState === 'already_member') {
      return (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3">
          <div className="text-sm font-semibold text-muted-foreground">Already joined</div>
          <Button size="sm" variant="secondary" onClick={onSwitchTeam}>
            Switch to team
          </Button>
        </div>
      );
    }

    if (team.joinState === 'pending') {
      return (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-warning/30 bg-warning/5 p-3 text-warning">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 className="h-4 w-4" />
              Request pending
            </div>
            <div className="text-xs text-warning/80">
              {pendingLabel ? `Requested ${pendingLabel}` : 'Awaiting approval'}
            </div>
            {team.requestNote && (
              <div className="rounded-xl bg-white/10 p-2 text-xs text-white/90">
                Note shared: {team.requestNote}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCancelRequest(team.id)}
            disabled={actionsDisabled}
            title={disableReason}
          >
            Cancel request
          </Button>
        </div>
      );
    }

    if (team.joinState === 'approved') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            Request approved {approvedLabel && <span className="text-xs text-success/70">· {approvedLabel}</span>}
          </div>
          <Button
            fullWidth
            onClick={() => onJoin(team.id)}
            disabled={actionsDisabled}
            title={disableReason}
          >
            Join now
          </Button>
        </div>
      );
    }

    if (team.privacy === 'public') {
      return (
        <Button
          fullWidth
          onClick={() => onJoin(team.id)}
          disabled={actionsDisabled}
          title={disableReason}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Join instantly
        </Button>
      );
    }

    return (
      <Button
        fullWidth
        variant="outline"
        onClick={() => onRequest(team)}
        disabled={actionsDisabled}
        title={disableReason}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Request access
      </Button>
    );
  };

  const visibilityCopy = getVisibilityCopy(team);

  return (
    <article
      className={clsx(
        'flex h-full flex-col rounded-3xl border border-border/80 bg-card p-5 shadow-sm transition',
        highlighted && 'ring-2 ring-primary/60'
      )}
    >
      <div
        className={clsx(
          'relative h-32 w-full overflow-hidden rounded-2xl',
          team.privacy === 'private' && 'ring-1 ring-white/10'
        )}
        style={coverStyle}
      >
        <div
          className={clsx(
            'absolute inset-0 opacity-30',
            team.theme.pattern === 'grid' && 'bg-[linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:20px_20px]',
            team.theme.pattern === 'beam' && 'bg-[radial-gradient(circle,rgba(255,255,255,0.2),transparent_55%)]',
            team.theme.pattern === 'wave' && 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_60%)]'
          )}
        />
        {team.privacy === 'private' && <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]" />}
        <div className="absolute bottom-4 left-4 right-4 text-sm font-semibold text-white drop-shadow">
          {team.tagline}
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{team.name}</h3>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {memberLabel}
          </p>
        </div>
        {privacyBadge}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{team.safeSummary}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {team.tags.map((tag) => (
          <Chip key={tag} variant="outline" size="sm">
            {tag}
          </Chip>
        ))}
      </div>

      {team.privacy === 'private' && visibilityCopy && (
        <p className="mt-3 text-xs text-muted-foreground">{visibilityCopy}</p>
      )}

      <div className="mt-4">{renderCta()}</div>
    </article>
  );
}

function formatMemberCount(count: number) {
  if (count >= 1000) {
    const value = count / 1000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}K`;
  }
  return count.toString();
}

function formatRelativeTime(timestamp: number) {
  const now = Date.now();
  const diffMs = timestamp - now;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
    ['second', 1000],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, value] of units) {
    if (Math.abs(diffMs) > value || unit === 'second') {
      return rtf.format(Math.round(diffMs / value), unit);
    }
  }
  return rtf.format(0, 'second');
}

function getVisibilityCopy(team: TeamViewModel) {
  switch (team.visibilitySource) {
    case 'pending_request':
      return 'Visible only because you already requested access.';
    case 'share_link':
      return 'Visible because someone with permission shared a link.';
    case 'invite_code':
      return 'Visible because you entered a private invite code.';
    case 'existing_membership':
      return 'Visible because you are already on the roster.';
    default:
      return null;
  }
}
