'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Users, Gift, MessageCircle, ChevronDown, ChevronUp, Reply } from 'lucide-react';
import { REACTIONS } from '@/components/feed/ReactionPicker';
import type { ReactionType } from '@/hooks/useFeedLikes';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MllProBadge } from '@/components/mll/MllProBadge';
import GiftModal from '@/components/GiftModal';
import { createClient } from '@/lib/supabase';
import type { PersonResult, PostResult, TeamResult, LiveResult, CommentResult } from '@/types/search';

export function PersonResultCard({ person, query }: { person: PersonResult; query: string }) {
  const profileHref = buildProfileHref(person);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const canGift = currentUserId && currentUserId !== person.id;
  const personUsername = person.handle?.replace('@', '') || 'user';

  const handleGiftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowGiftModal(true);
  };

  return (
    <>
      <Link
        href={profileHref}
        aria-label={`View profile for ${person.name}`}
        className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Card className="relative border border-border/70 shadow-sm transition group-hover:border-primary/40 group-hover:shadow-lg">
          <CardContent className="flex gap-4 px-5 pb-5 pt-8">
          <div className="relative h-14 w-14 mt-1 rounded-full overflow-hidden border border-white/10 bg-muted flex-shrink-0">
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
                <div className="flex items-center gap-0.5 text-base font-semibold">
                  <HighlightedText text={person.name} query={query} />
                  {person.isMllPro && (
                    <MllProBadge size="compact" clickable={false} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <HighlightedText text={person.handle} query={query} />
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {typeof person.followerCount === 'number' && person.followerCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {person.followerCount.toLocaleString()} followers
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
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                View profile
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
              {canGift && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={handleGiftClick}
                >
                  <Gift className="h-3.5 w-3.5 mr-1" />
                  Gift
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>

    {showGiftModal && (
      <GiftModal
        recipientId={person.id}
        recipientUsername={personUsername}
        onGiftSent={() => setShowGiftModal(false)}
        onClose={() => setShowGiftModal(false)}
      />
    )}
  </>
  );
}

interface PostComment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_username: string;
  author_display_name?: string;
  author_avatar_url?: string;
}

export function PostResultCard({ post, query }: { post: PostResult; query: string }) {
  const postHref = buildPostHref(post);
  const ctaLabel = post.source === 'team' ? 'View team activity' : 'Open post';
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [giftingCommentAuthor, setGiftingCommentAuthor] = useState<{ id: string; username: string } | null>(null);
  const [commentReactions, setCommentReactions] = useState<Map<string, ReactionType>>(new Map());
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [postReaction, setPostReaction] = useState<ReactionType | null>(null);
  const [showPostReactionPicker, setShowPostReactionPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // Load existing post reaction on mount
  useEffect(() => {
    if (!currentUserId || !post.id) return;
    
    const loadPostReaction = async () => {
      try {
        const supabase = createClient();
        
        if (post.source === 'team') {
          // Load from team_feed_reactions
          const { data } = await supabase
            .from('team_feed_reactions')
            .select('reaction_type')
            .eq('post_id', post.id)
            .eq('profile_id', currentUserId)
            .maybeSingle();
          
          if (data?.reaction_type) {
            setPostReaction(data.reaction_type as ReactionType);
          }
        } else {
          // Load from post_likes
          const { data } = await supabase
            .from('post_likes')
            .select('reaction_type')
            .eq('post_id', post.id)
            .eq('profile_id', currentUserId)
            .maybeSingle();
          
          if (data?.reaction_type) {
            setPostReaction(data.reaction_type as ReactionType);
          }
        }
      } catch (err) {
        // Silently fail - user just hasn't reacted yet
      }
    };
    
    loadPostReaction();
  }, [currentUserId, post.id, post.source]);

  const canGift = currentUserId && post.authorId && currentUserId !== post.authorId;
  const authorUsername = post.authorHandle?.replace('@', '') || 'user';

  const handleGiftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowGiftModal(true);
  };

  const handleCommentsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (showComments) {
      setShowComments(false);
      return;
    }

    if (comments.length === 0) {
      setLoadingComments(true);
      try {
        const supabase = createClient();
        const isTeamPost = post.source === 'team';
        
        let data: any[] | null = null;
        let error: any = null;

        if (isTeamPost) {
          const result = await supabase
            .from('team_feed_comments')
            .select('id, text_content, created_at, author_id')
            .eq('post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(5);
          data = result.data;
          error = result.error;
        } else {
          const result = await supabase
            .from('post_comments')
            .select('id, text_content, created_at, author_id')
            .eq('post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(5);
          data = result.data;
          error = result.error;
        }

        if (error) {
          console.error('Failed to load comments:', error);
        } else if (data && data.length > 0) {
          // Fetch author profiles for comments
          const authorIds = [...new Set(data.map((c: any) => c.author_id))];
          const commentIds = data.map((c: any) => String(c.id));
          
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', authorIds);
          
          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          
          // Load existing reactions for current user (same table as feed)
          if (currentUserId) {
            const { data: existingReactions } = await supabase
              .from('post_comment_likes')
              .select('comment_id')
              .eq('profile_id', currentUserId)
              .in('comment_id', commentIds);
            
            if (existingReactions && existingReactions.length > 0) {
              const reactionsMap = new Map<string, ReactionType>();
              existingReactions.forEach((r: any) => {
                // Default to 'love' since the table doesn't store reaction type
                reactionsMap.set(String(r.comment_id), 'love');
              });
              setCommentReactions(prev => new Map([...prev, ...reactionsMap]));
            }
          }
          
          setComments(data.map((c: any) => {
            const author = profileMap.get(c.author_id);
            return {
              id: String(c.id),
              content: c.text_content,
              created_at: c.created_at,
              author_id: c.author_id,
              author_username: author?.username || 'unknown',
              author_display_name: author?.display_name,
              author_avatar_url: author?.avatar_url,
            };
          }));
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(true);
  };

  const handleGiftCommentAuthor = (e: React.MouseEvent, authorId: string, username: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentUserId && currentUserId !== authorId) {
      setGiftingCommentAuthor({ id: authorId, username });
    }
  };

  const handleReactComment = async (e: React.MouseEvent, commentId: string, reactionType: ReactionType) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUserId) return;
    
    // Optimistically set reaction
    setCommentReactions(prev => new Map(prev).set(commentId, reactionType));
    setShowReactionPicker(null);
    
    try {
      const supabase = createClient();
      // Use same table as feed - post_comment_likes
      await supabase
        .from('post_comment_likes')
        .upsert({
          comment_id: commentId,
          profile_id: currentUserId
        }, { onConflict: 'comment_id,profile_id' });
    } catch (err) {
      console.error('Failed to react to comment:', err);
    }
  };

  const toggleReactionPicker = (e: React.MouseEvent, commentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReactionPicker(showReactionPicker === commentId ? null : commentId);
  };

  const handleReactPost = async (e: React.MouseEvent, reactionType: ReactionType) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUserId) return;
    
    setPostReaction(reactionType);
    setShowPostReactionPicker(false);
    
    try {
      const supabase = createClient();
      
      if (post.source === 'team') {
        // Use RPC for team posts - now supports all reaction types
        const { data, error } = await supabase.rpc('rpc_react_team_post', {
          p_post_id: post.id,
          p_reaction_type: reactionType
        });
        if (error) {
          console.error('Failed to save team post reaction:', error.message);
        }
      } else {
        // Delete existing reaction first (if any), then insert new one
        console.log('Global post reaction - deleting existing:', { postId: post.id });
        const { error: deleteError } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', currentUserId);
        
        if (deleteError) {
          console.error('Delete failed:', deleteError.message);
        }
        
        console.log('Global post reaction - inserting new:', { postId: post.id, reactionType });
        const { data, error } = await supabase
          .from('post_likes')
          .insert({
            post_id: post.id,
            profile_id: currentUserId,
            reaction_type: reactionType
          })
          .select();
        
        console.log('Insert result:', { data, error });
        
        if (error) {
          console.error('Failed to save post reaction:', error.code, error.message);
        }
      }
    } catch (err) {
      console.error('Failed to react to post:', err);
    }
  };

  const togglePostReactionPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPostReactionPicker(!showPostReactionPicker);
  };

  const handleReplyClick = (e: React.MouseEvent, commentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyText('');
  };

  const handleSubmitReply = async (e: React.MouseEvent, parentCommentId: string, replyToUsername: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId || !replyText.trim() || submitting) return;
    
    // Prepend @username to the reply
    const replyContent = `@${replyToUsername} ${replyText.trim()}`;
    
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          author_id: currentUserId,
          text_content: replyContent,
          parent_comment_id: parentCommentId
        })
        .select('id, text_content, created_at, author_id')
        .single();

      if (error) throw error;
      
      // Add the new reply to comments list
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', currentUserId)
        .single();
      
      if (data) {
        setComments(prev => [{
          id: String(data.id),
          content: data.text_content,
          created_at: data.created_at,
          author_id: data.author_id,
          author_username: profile?.username || 'you',
          author_display_name: profile?.display_name,
          author_avatar_url: profile?.avatar_url,
        }, ...prev]);
      }
      
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      console.error('Failed to submit reply:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitNewComment = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId || !newCommentText.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          author_id: currentUserId,
          text_content: newCommentText.trim()
        })
        .select('id, text_content, created_at, author_id')
        .single();

      if (error) throw error;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', currentUserId)
        .single();
      
      if (data) {
        setComments(prev => [{
          id: String(data.id),
          content: data.text_content,
          created_at: data.created_at,
          author_id: data.author_id,
          author_username: profile?.username || 'you',
          author_display_name: profile?.display_name,
          author_avatar_url: profile?.avatar_url,
        }, ...prev]);
      }
      
      setNewCommentText('');
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToPost = () => {
    window.location.href = postHref;
  };

  return (
    <>
      <div className="group block rounded-3xl">
        <Card className="border border-border/70 shadow-sm transition group-hover:border-primary/40 group-hover:shadow-lg">
          <CardContent className="flex flex-col gap-3 px-5 pb-5 pt-8">
          {/* Clickable header area */}
          <div 
            className="cursor-pointer"
            onClick={navigateToPost}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold flex items-center gap-0.5">
                <HighlightedText text={post.author} query={query} />
                {post.authorIsMllPro && (
                  <MllProBadge size="compact" clickable={false} />
                )}
                <span className="text-muted-foreground font-normal">
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
            <p className="text-base leading-relaxed mt-3">
              <HighlightedText text={post.text} query={query} />
            </p>
          </div>
          {post.mediaUrl && (
            <div className="relative w-full rounded-xl overflow-hidden bg-muted">
              {isVideoUrl(post.mediaUrl) ? (
                <video 
                  src={post.mediaUrl} 
                  className="w-full max-h-[500px] object-contain mx-auto"
                  controls
                  preload="metadata"
                  playsInline
                />
              ) : (
                <img 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  className="w-full max-h-[500px] object-contain mx-auto"
                  loading="lazy"
                />
              )}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {/* Post Reaction Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={togglePostReactionPicker}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors text-xs ${
                  postReaction ? 'bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span className="text-sm">
                  {postReaction 
                    ? REACTIONS.find(r => r.type === postReaction)?.emoji || '❤️'
                    : '😊'}
                </span>
                {post.likeCount} {postReaction ? '' : 'likes'}
              </button>
              {showPostReactionPicker && (
                <div className="absolute bottom-full left-0 mb-1 flex gap-1 p-1.5 rounded-full bg-background shadow-lg border border-border z-20">
                  {REACTIONS.map((r) => (
                    <button
                      key={r.type}
                      type="button"
                      onClick={(e) => handleReactPost(e, r.type)}
                      className={`w-8 h-8 rounded-full text-lg flex items-center justify-center hover:scale-110 transition-transform ${
                        postReaction === r.type ? 'bg-primary/20' : 'hover:bg-muted'
                      }`}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleCommentsClick}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors text-xs"
            >
              <MessageCircle className="h-3 w-3" />
              {post.commentCount} comments
              {post.commentCount > 0 && (
                showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>

          {/* Expandable Comments Section */}
          {showComments && (
            <div className="border-t border-border/50 pt-3 mt-1 space-y-2">
              {loadingComments ? (
                <p className="text-xs text-muted-foreground">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/30">
                    <div className="flex items-start gap-2">
                      {comment.author_avatar_url ? (
                        <img src={comment.author_avatar_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {comment.author_username?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {comment.author_display_name || comment.author_username}
                        </p>
                        <p className="text-xs text-foreground/80">{comment.content}</p>
                      </div>
                    </div>
                    {/* Comment Actions */}
                    <div className="flex items-center gap-3 ml-8">
                      <button
                        type="button"
                        onClick={(e) => handleReplyClick(e, comment.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        title="Reply"
                      >
                        <Reply className="h-3 w-3" />
                        <span>Reply</span>
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => toggleReactionPicker(e, comment.id)}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            commentReactions.has(comment.id) 
                              ? 'text-primary' 
                              : 'text-muted-foreground hover:text-primary'
                          }`}
                          title="React"
                        >
                          <span className="text-sm">
                            {commentReactions.get(comment.id) 
                              ? REACTIONS.find(r => r.type === commentReactions.get(comment.id))?.emoji || '❤️'
                              : '😊'}
                          </span>
                          <span>React</span>
                        </button>
                        {showReactionPicker === comment.id && (
                          <div className="absolute bottom-full left-0 mb-1 flex gap-1 p-1 rounded-full bg-background shadow-lg border border-border z-10">
                            {REACTIONS.map((r) => (
                              <button
                                key={r.type}
                                type="button"
                                onClick={(e) => handleReactComment(e, comment.id, r.type)}
                                className={`w-7 h-7 rounded-full text-base flex items-center justify-center hover:scale-110 transition-transform ${
                                  commentReactions.get(comment.id) === r.type ? 'bg-primary/20' : 'hover:bg-muted'
                                }`}
                              >
                                {r.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleGiftCommentAuthor(e, comment.author_id, comment.author_username)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        title={`Gift ${comment.author_username}`}
                      >
                        <Gift className="h-3 w-3" />
                        <span>Gift</span>
                      </button>
                    </div>
                    {/* Inline Reply Input */}
                    {replyingTo === comment.id && (
                      <div className="ml-8 mt-2 flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              handleSubmitReply(e as any, comment.id, comment.author_username);
                            }
                          }}
                          placeholder={`Reply to ${comment.author_username}...`}
                          className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSubmitReply(e, comment.id, comment.author_username)}
                          disabled={!replyText.trim() || submitting}
                          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                        >
                          {submitting ? '...' : 'Send'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {post.commentCount > 5 && comments.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {post.commentCount - 5} more comments
                </p>
              )}
              {/* Add New Comment Input */}
              {currentUserId && (
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        handleSubmitNewComment(e as any);
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 text-xs px-2 py-1.5 rounded border border-border bg-background"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitNewComment}
                    disabled={!newCommentText.trim() || submitting}
                    className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {submitting ? '...' : 'Post'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {ctaLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
            {canGift && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={handleGiftClick}
              >
                <Gift className="h-3.5 w-3.5 mr-1" />
                Gift
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>

    {showGiftModal && (
      <GiftModal
        recipientId={post.authorId}
        recipientUsername={authorUsername}
        postId={post.id}
        onGiftSent={() => setShowGiftModal(false)}
        onClose={() => setShowGiftModal(false)}
      />
    )}

    {giftingCommentAuthor && (
      <GiftModal
        recipientId={giftingCommentAuthor.id}
        recipientUsername={giftingCommentAuthor.username}
        onGiftSent={() => setGiftingCommentAuthor(null)}
        onClose={() => setGiftingCommentAuthor(null)}
      />
    )}
  </>
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
        <CardContent className="space-y-3 px-5 pb-5 pt-8">
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
        <CardContent className="grid gap-4 px-5 pb-5 pt-8 sm:grid-cols-[1fr_auto] sm:items-center">
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

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  // Check common video extensions
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.ogv'];
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) return true;
  // Check for video content type indicators in URL
  if (lowerUrl.includes('video') || lowerUrl.includes('/v/')) return true;
  return false;
}

export function CommentResultCard({ comment, query }: { comment: CommentResult; query: string }) {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const postHref = `/feed?focusPostId=${comment.postId}`;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const canGift = currentUserId && comment.authorId && currentUserId !== comment.authorId;

  const handleGiftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowGiftModal(true);
  };

  return (
    <>
      <Link
        href={postHref}
        aria-label={`View comment by ${comment.authorUsername}`}
        className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Card className="border border-border/70 shadow-sm transition group-hover:border-primary/40 group-hover:shadow-lg">
          <CardContent className="px-5 pb-5 pt-8 space-y-2">
            <div className="flex items-start gap-3">
              {comment.authorAvatarUrl ? (
                <img src={comment.authorAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {comment.authorUsername?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {comment.authorDisplayName || comment.authorUsername}
                  <span className="text-muted-foreground font-normal ml-1">@{comment.authorUsername}</span>
                </p>
                <p className="text-sm text-foreground mt-1">
                  <HighlightedText text={comment.content} query={query} />
                </p>
                {comment.postText && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
                    on post: "{comment.postText}..."
                  </p>
                )}
              </div>
              {canGift && (
                <button
                  type="button"
                  onClick={handleGiftClick}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
                  title={`Gift ${comment.authorUsername}`}
                >
                  <Gift className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{formatTimestamp(comment.createdAt)}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                View post
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>

      {showGiftModal && (
        <GiftModal
          recipientId={comment.authorId}
          recipientUsername={comment.authorUsername}
          onGiftSent={() => setShowGiftModal(false)}
          onClose={() => setShowGiftModal(false)}
        />
      )}
    </>
  );
}
