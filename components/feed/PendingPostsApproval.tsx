'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X, UserCheck, Clock } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { createClient } from '@/lib/supabase';

type PendingPost = {
  id: string;
  text_content: string | null;
  media_url: string | null;
  created_at: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
};

interface PendingPostsApprovalProps {
  cardStyle?: React.CSSProperties;
  borderRadiusClass?: string;
}

export default function PendingPostsApproval({
  cardStyle,
  borderRadiusClass = 'rounded-xl',
}: PendingPostsApprovalProps) {
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadPendingPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_pending_posts_for_approval');
      
      if (error) {
        console.warn('[pending posts] error:', error);
        setPendingPosts([]);
        return;
      }

      setPendingPosts((data || []) as PendingPost[]);
    } catch (err) {
      console.warn('[pending posts] error:', err);
      setPendingPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPendingPosts();
  }, [loadPendingPosts]);

  const handleApprove = useCallback(async (postId: string) => {
    setActionLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('approve_post', { p_post_id: postId });
      
      if (error) {
        console.error('[approve post] error:', error);
        return;
      }

      // Remove from list
      setPendingPosts((prev) => prev.filter((p) => p.id !== postId));
    } finally {
      setActionLoading((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  const handleReject = useCallback(async (postId: string) => {
    setActionLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('reject_post', { p_post_id: postId });
      
      if (error) {
        console.error('[reject post] error:', error);
        return;
      }

      // Remove from list
      setPendingPosts((prev) => prev.filter((p) => p.id !== postId));
    } finally {
      setActionLoading((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  const handleApproveAll = useCallback(async (authorId: string, postId: string) => {
    setActionLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('approve_user_forever', { p_user_id: authorId });
      
      if (error) {
        console.error('[approve all] error:', error);
        return;
      }

      // Remove all posts from this author
      setPendingPosts((prev) => prev.filter((p) => p.author_id !== authorId));
    } finally {
      setActionLoading((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  if (isLoading) {
    return null;
  }

  if (pendingPosts.length === 0) {
    return null;
  }

  return (
    <Card className={`overflow-hidden backdrop-blur-sm mb-4 ${borderRadiusClass}`} style={cardStyle}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">Pending Posts ({pendingPosts.length})</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          These posts from visitors need your approval before appearing on your page.
        </p>
      </div>

      <div className="divide-y divide-border">
        {pendingPosts.map((post) => (
          <div key={post.id} className="p-4">
            <div className="flex items-start gap-3">
              {/* Author avatar */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {post.author_avatar_url ? (
                  <img
                    src={post.author_avatar_url}
                    alt={post.author_display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {(post.author_display_name || post.author_username || '?').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Author info */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{post.author_display_name}</span>
                  <span className="text-sm text-muted-foreground">@{post.author_username}</span>
                </div>

                {/* Post content */}
                {post.text_content && (
                  <p className="text-foreground text-sm mb-2">{post.text_content}</p>
                )}

                {/* Media preview */}
                {post.media_url && (
                  <div className="mb-2 rounded-lg overflow-hidden max-w-xs">
                    {post.media_url.match(/\.(mp4|mov|webm)/i) ? (
                      <video src={post.media_url} className="w-full h-auto" controls />
                    ) : (
                      <img src={post.media_url} alt="Post media" className="w-full h-auto" />
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground mb-3">
                  {new Date(post.created_at).toLocaleString()}
                </p>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApprove(post.id)}
                    disabled={actionLoading[post.id]}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Approve
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproveAll(post.author_id, post.id)}
                    disabled={actionLoading[post.id]}
                    leftIcon={<UserCheck className="w-4 h-4" />}
                  >
                    Approve All from @{post.author_username}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReject(post.id)}
                    disabled={actionLoading[post.id]}
                    leftIcon={<X className="w-4 h-4" />}
                    className="text-destructive hover:text-destructive"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
