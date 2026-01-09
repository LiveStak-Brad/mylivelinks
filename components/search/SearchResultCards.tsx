'use client';

import Link from 'next/link';
import { ArrowUpRight, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MllProBadge } from '@/components/mll/MllProBadge';
import type { PersonResult, PostResult, TeamResult, LiveResult } from '@/types/search';

export function PersonResultCard({ person, query }: { person: PersonResult; query: string }) {
  const profileHref = buildProfileHref(person);

  return (
    <Link
      href={profileHref}
      aria-label={`View profile for ${person.name}`}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="relative border border-border/70 shadow-sm transition group-hover:border-primary/40 group-hover:shadow-lg">
        <CardContent className="flex gap-4 p-4">
          <div className="h-14 w-14 rounded-2xl overflow-hidden border border-white/10 bg-muted">
            {person.avatarUrl ? (
              <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" loading="lazy" />
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
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <HighlightedText text={person.name} query={query} />
                  {person.isMllPro && (
                    <MllProBadge size="compact" clickable={false} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <HighlightedText text={person.handle} query={query} />
                </p>
              </div>
              <Badge
                variant={person.online ? 'success' : 'secondary'}
                size="sm"
                dot={person.online}
                dotColor={person.online ? 'success' : 'default'}
              >
                {person.online ? 'Online now' : 'Offline'}
              </Badge>
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
            </div>
            {person.status && <p className="text-sm text-foreground/90 line-clamp-2">{person.status}</p>}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              View profile
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function PostResultCard({ post, query }: { post: PostResult; query: string }) {
  const postHref = buildPostHref(post);
  const ctaLabel = post.source === 'team' ? 'View team activity' : 'Open post';

  return (
    <Link
      href={postHref}
      aria-label={`Open post by ${post.author}`}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="border border-border/70 shadow-sm transition group-hover:border-primary/40 group-hover:shadow-lg">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">
              <HighlightedText text={post.author} query={query} />
              <span className="text-muted-foreground font-normal ml-1">
                <HighlightedText text={post.authorHandle} query={query} />
              </span>
            </p>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-xs text-muted-foreground">{formatTimestamp(post.createdAt)}</span>
              {post.contextLabel && (
                <Badge variant="secondary" size="sm" className="whitespace-nowrap">
                  {post.contextLabel}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-base leading-relaxed">
            <HighlightedText text={post.text} query={query} />
          </p>
          {post.mediaUrl && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
              <img 
                src={post.mediaUrl} 
                alt="Post media" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary" size="sm">
              {post.likeCount} likes
            </Badge>
            <Badge variant="secondary" size="sm">
              {post.commentCount} comments
            </Badge>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            {ctaLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TeamResultCard({ team, query }: { team: TeamResult; query: string }) {
  const memberCount = Number.isFinite(team.memberCount) ? team.memberCount : 0;
  const teamHref = buildTeamHref(team);

  return (
    <Link
      href={teamHref}
      aria-label={`Visit team ${team.name}`}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="border border-border/70 shadow-sm overflow-hidden transition group-hover:border-primary/40 group-hover:shadow-lg">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="text-base font-semibold">
              <HighlightedText text={team.name} query={query} />
            </p>
            <p className="text-sm text-muted-foreground">{memberCount.toLocaleString()} members</p>
            {team.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{team.description}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Visit team
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export function LiveResultCard({ live, query }: { live: LiveResult; query: string }) {
  const liveHref = buildLiveHref(live);

  return (
    <Link
      href={liveHref}
      aria-label={`Open live room for ${live.displayName}`}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="border border-border/70 shadow-sm transition group-hover:border-primary/40 group-hover:shadow-lg">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-2">
            <div>
              <p className="text-base font-semibold">
                <HighlightedText text={live.displayName} query={query} />
              </p>
              <p className="text-sm text-muted-foreground">
                <HighlightedText text={`@${live.username}`} query={query} />
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge
                variant={live.isLive ? 'destructive' : 'secondary'}
                size="sm"
                dot={live.isLive}
                dotColor={live.isLive ? 'destructive' : 'default'}
              >
                {live.isLive ? 'Live now' : 'Offline'}
              </Badge>
              <span>{live.viewerCount.toLocaleString()} watching</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary sm:justify-end">
            {live.isLive ? 'Join live' : 'View stream'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
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

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function buildProfileHref(person: PersonResult) {
  const username = person.handle?.replace(/^@/, '');
  return username ? `/${username}` : `/profiles/${person.id}`;
}

function buildPostHref(post: PostResult) {
  if (post.contextHref) {
    return post.contextHref;
  }
  return `/feed?focusPostId=${post.id}`;
}

function buildTeamHref(team: TeamResult) {
  return `/teams/${team.slug || team.id}`;
}

function buildLiveHref(live: LiveResult) {
  return `/live/${live.username || live.id}`;
}
