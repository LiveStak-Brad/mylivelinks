'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Users,
  FileText,
  Video,
  X,
  ArrowLeft,
  Loader2,
  User,
  Radio,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { PageShell } from '@/components/layout';
import { Badge } from '@/components/ui';

type SearchCategory = 'all' | 'users' | 'posts' | 'teams' | 'live';

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live: boolean;
  follower_count: number;
}

interface PostResult {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  media_url: string | null;
}

interface TeamResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  member_count: number;
}

interface LiveResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  viewer_count: number;
}

const CATEGORIES: { key: SearchCategory; label: string; icon: typeof Search }[] = [
  { key: 'all', label: 'All', icon: Search },
  { key: 'users', label: 'Users', icon: User },
  { key: 'posts', label: 'Posts', icon: FileText },
  { key: 'teams', label: 'Teams', icon: Users },
  { key: 'live', label: 'Live', icon: Radio },
];

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<SearchCategory>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [liveUsers, setLiveUsers] = useState<LiveResult[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const performSearch = useCallback(
    async (searchQuery: string, searchCategory: SearchCategory) => {
      if (!searchQuery.trim()) {
        setUsers([]);
        setPosts([]);
        setTeams([]);
        setLiveUsers([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const searchLower = searchQuery.toLowerCase().trim();

        if (searchCategory === 'all' || searchCategory === 'users') {
          const { data: userResults } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, is_live, follower_count')
            .or(`username.ilike.%${searchLower}%,display_name.ilike.%${searchLower}%`)
            .order('follower_count', { ascending: false })
            .limit(searchCategory === 'all' ? 5 : 20);

          setUsers(userResults || []);
        } else {
          setUsers([]);
        }

        if (searchCategory === 'all' || searchCategory === 'posts') {
          const { data: postResults } = await supabase
            .from('posts')
            .select(`
              id,
              content,
              created_at,
              media_url,
              author:profiles!posts_author_id_fkey (
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .ilike('content', `%${searchLower}%`)
            .order('created_at', { ascending: false })
            .limit(searchCategory === 'all' ? 5 : 20);

          const formattedPosts: PostResult[] = (postResults || []).map((post: any) => ({
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            media_url: post.media_url,
            author_id: post.author?.id || '',
            author_username: post.author?.username || 'unknown',
            author_display_name: post.author?.display_name,
            author_avatar_url: post.author?.avatar_url,
          }));

          setPosts(formattedPosts);
        } else {
          setPosts([]);
        }

        if (searchCategory === 'all' || searchCategory === 'teams') {
          const { data: teamResults } = await supabase
            .from('teams')
            .select('id, name, slug, description, avatar_url, member_count')
            .or(`name.ilike.%${searchLower}%,description.ilike.%${searchLower}%`)
            .order('member_count', { ascending: false })
            .limit(searchCategory === 'all' ? 5 : 20);

          setTeams(teamResults || []);
        } else {
          setTeams([]);
        }

        if (searchCategory === 'all' || searchCategory === 'live') {
          const { data: liveResults } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('is_live', true)
            .or(`username.ilike.%${searchLower}%,display_name.ilike.%${searchLower}%`)
            .limit(searchCategory === 'all' ? 5 : 20);

          const formattedLive: LiveResult[] = (liveResults || []).map((user: any) => ({
            ...user,
            viewer_count: 0,
          }));

          setLiveUsers(formattedLive);
        } else {
          setLiveUsers([]);
        }
      } catch (error) {
        console.error('[SEARCH] Error:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query, category);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, category, performSearch]);

  const clearSearch = () => {
    setQuery('');
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const totalResults = users.length + posts.length + teams.length + liveUsers.length;

  return (
    <PageShell maxWidth="lg" padding="md">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Search</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, posts, teams, lives..."
          className="w-full pl-12 pr-12 py-4 text-lg bg-muted/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          autoFocus
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = category === cat.key;

          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {isSearching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!isSearching && hasSearched && (
        <div className="space-y-8">
          {totalResults === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-foreground">No results found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term or category</p>
            </div>
          )}

          {users.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Users
                </h2>
                {category === 'all' && users.length >= 5 && (
                  <button onClick={() => setCategory('users')} className="text-sm text-primary hover:underline">
                    See all
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/${user.username}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{user.display_name || user.username}</p>
                        {user.is_live && (
                          <Badge variant="destructive" className="animate-pulse text-xs">
                            LIVE
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">{user.follower_count?.toLocaleString() || 0} followers</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {posts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Posts
                </h2>
                {category === 'all' && posts.length >= 5 && (
                  <button onClick={() => setCategory('posts')} className="text-sm text-primary hover:underline">
                    See all
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/${post.author_username}`}
                    className="block p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {post.author_avatar_url ? (
                        <img src={post.author_avatar_url} alt={post.author_username} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                          {post.author_username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground text-sm">{post.author_display_name || post.author_username}</p>
                        <p className="text-xs text-muted-foreground">@{post.author_username}</p>
                      </div>
                    </div>
                    <p className="text-foreground line-clamp-2">{post.content}</p>
                    {post.media_url && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        Has media
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {teams.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-500" />
                  Teams
                </h2>
                {category === 'all' && teams.length >= 5 && (
                  <button onClick={() => setCategory('teams')} className="text-sm text-primary hover:underline">
                    See all
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                  >
                    {team.avatar_url ? (
                      <img src={team.avatar_url} alt={team.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white">
                        <Users className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{team.name}</p>
                      {team.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{team.description}</p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{team.member_count?.toLocaleString() || 0} members</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {liveUsers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Radio className="w-5 h-5 text-red-500" />
                  Live Now
                </h2>
                {category === 'all' && liveUsers.length >= 5 && (
                  <button onClick={() => setCategory('live')} className="text-sm text-primary hover:underline">
                    See all
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {liveUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/live/${user.username}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg ring-2 ring-red-500">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-card animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{user.display_name || user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    <Badge variant="destructive" className="animate-pulse">
                      LIVE
                    </Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!hasSearched && !query && (
        <div className="text-center py-16">
          <Search className="w-16 h-16 mx-auto mb-6 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Search MyLiveLinks</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Find users, posts, teams, and live streams across the entire platform.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setQuery('music')}
              className="px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              music
            </button>
            <button
              onClick={() => setQuery('gaming')}
              className="px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              gaming
            </button>
            <button
              onClick={() => setQuery('art')}
              className="px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              art
            </button>
            <button
              onClick={() => setQuery('fitness')}
              className="px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              fitness
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
