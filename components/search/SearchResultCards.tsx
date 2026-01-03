'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  MapPin,
  MoreHorizontal,
  Play,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PersonResult, PostResult, TeamResult, LiveResult } from './constants';

export function PersonResultCard({
  person,
  query,
  onPrimaryAction,
}: {
  person: PersonResult;
  query: string;
  onPrimaryAction?: () => void;
}) {
  return (
    <Card className="relative border border-border/70 shadow-sm">
      <CardContent className="flex gap-4 p-4">
        <div className="h-14 w-14 rounded-2xl overflow-hidden border border-white/10 bg-muted">
          {person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt={person.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className={`h-full w-full bg-gradient-to-br ${person.avatarColor} flex items-center justify-center text-lg font-bold text-white`}
            >
              {person.name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <HighlightedText text={person.name} query={query} />
                {person.verified && <Badge variant="primary" size="sm">Verified</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                <HighlightedText text={person.handle} query={query} />
              </p>
            </div>
            <OverflowMenu />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {typeof person.mutualCount === 'number' && person.mutualCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {person.mutualCount} mutuals
              </span>
            )}
            {person.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {person.location}
              </span>
            )}
            {person.online ? (
              <Badge variant="success" size="sm" dot dotColor="success">
                Online now
              </Badge>
            ) : (
              <Badge variant="secondary" size="sm">
                Offline
              </Badge>
            )}
          </div>
          {person.status && (
            <p className="text-sm text-foreground/90">
              {person.status}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onPrimaryAction}>
              View profile
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Connect
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PostResultCard({
  post,
  query,
}: {
  post: PostResult;
  query: string;
}) {
  return (
    <Card className="border border-border/70 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              <HighlightedText text={post.author} query={query} />
              <span className="text-muted-foreground font-normal ml-1">
                <HighlightedText text={post.authorHandle} query={query} />
              </span>
            </p>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(post.createdAt)}
            </span>
          </div>
          <OverflowMenu />
        </div>
        <p className="text-base leading-relaxed">
          <HighlightedText text={post.text} query={query} />
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="secondary" size="sm">
            {post.likeCount} likes
          </Badge>
          <Badge variant="secondary" size="sm">
            {post.commentCount} comments
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm">Open post</Button>
          <Button size="sm" variant="outline" leftIcon={<Share2 className="h-4 w-4" />}>
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamResultCard({ team, query }: { team: TeamResult; query: string }) {
  const memberCount = Number.isFinite(team.memberCount) ? team.memberCount : 0;
  return (
    <Card className="border border-border/70 shadow-sm overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold">
              <HighlightedText text={team.name} query={query} />
            </p>
            <p className="text-sm text-muted-foreground">
              {memberCount.toLocaleString()} members
            </p>
            {team.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{team.description}</p>
            )}
          </div>
          <OverflowMenu />
        </div>
        <div className="flex gap-2">
          <Button size="sm">
            Visit team
          </Button>
          <Button size="sm" variant="outline">
            View hub
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LiveResultCard({ live, query }: { live: LiveResult; query: string }) {
  return (
    <Card className="border border-border/70 shadow-sm">
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold">
                <HighlightedText text={live.displayName} query={query} />
              </p>
              <p className="text-sm text-muted-foreground">
                <HighlightedText text={`@${live.username}`} query={query} />
              </p>
            </div>
            <OverflowMenu />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Badge variant={live.isLive ? 'destructive' : 'secondary'} size="sm" dot={live.isLive} dotColor={live.isLive ? 'destructive' : 'default'}>
              {live.isLive ? 'Live now' : 'Offline'}
            </Badge>
            <span>{live.viewerCount.toLocaleString()} watching</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button size="sm" className="justify-center" leftIcon={<Play className="h-4 w-4" />}>
            {live.isLive ? 'Join live' : 'Set reminder'}
          </Button>
          <Button size="sm" variant="outline" leftIcon={<Check className="h-4 w-4" />}>
            Follow host
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'ig');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={`${part}-${index}`} className="rounded bg-primary/15 text-primary px-0.5">
            {part}
          </mark>
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

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function OverflowMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:text-foreground flex items-center justify-center"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-10 w-40 rounded-xl border border-border bg-card shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted/70"
            onClick={() => setOpen(false)}
          >
            Report
          </button>
        </div>
      )}
    </div>
  );
}
