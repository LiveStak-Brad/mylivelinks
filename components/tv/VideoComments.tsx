'use client';

/**
 * VideoComments - YouTube-style comments section
 * 
 * Features:
 * - Comment list with replies
 * - Add new comment
 * - Like comments
 * - Reply to comments
 * 
 * REAL DATA: Fetches from music_video_comments table
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { type TVComment } from '@/lib/tv/mockData';
import { createClient } from '@/lib/supabase';

interface VideoCommentsProps {
  videoId: string;
  currentUserId?: string | null;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function CommentItem({ 
  comment, 
  isReply = false,
  parentCommentId,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
}: { 
  comment: TVComment; 
  isReply?: boolean;
  parentCommentId?: string;
  onReply?: (commentId: string, username: string) => void;
  onEdit?: (commentId: string, currentText: string) => void;
  onDelete?: (commentId: string) => void;
  currentUserId?: string | null;
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [dislikeCount, setDislikeCount] = useState(comment.dislikes || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = currentUserId && comment.author.id === currentUserId;

  // Check if user has liked/disliked this comment on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!currentUserId) return;
      const supabase = createClient();
      
      // Check like
      const { data: likeData } = await supabase
        .from('video_comment_likes')
        .select('id')
        .eq('comment_id', comment.id)
        .eq('user_id', currentUserId)
        .maybeSingle();
      if (likeData) setIsLiked(true);
      
      // Check dislike
      const { data: dislikeData } = await supabase
        .from('video_comment_dislikes')
        .select('id')
        .eq('comment_id', comment.id)
        .eq('user_id', currentUserId)
        .maybeSingle();
      if (dislikeData) setIsDisliked(true);
    };
    checkStatus();
  }, [comment.id, currentUserId]);

  const handleLike = async () => {
    if (!currentUserId || isLikeLoading) return;
    
    setIsLikeLoading(true);
    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    
    // Optimistic update
    setIsLiked(!wasLiked);
    if (wasDisliked) setIsDisliked(false);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    try {
      const supabase = createClient();
      if (wasLiked) {
        // Unlike
        await supabase
          .from('video_comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', currentUserId);
      } else {
        // Like - use upsert to handle duplicates gracefully
        const { error } = await supabase
          .from('video_comment_likes')
          .upsert({ comment_id: comment.id, user_id: currentUserId }, { onConflict: 'comment_id,user_id' });
        
        if (error) throw error;
        
        // Remove dislike if exists
        if (wasDisliked) {
          await supabase
            .from('video_comment_dislikes')
            .delete()
            .eq('comment_id', comment.id)
            .eq('user_id', currentUserId);
        }
      }
    } catch (e) {
      // Revert on error
      setIsLiked(wasLiked);
      setIsDisliked(wasDisliked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error('Like error:', e);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!currentUserId || isLikeLoading) return;
    
    setIsLikeLoading(true);
    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    
    // Optimistic update
    setIsDisliked(!wasDisliked);
    setDislikeCount(prev => wasDisliked ? prev - 1 : prev + 1);
    if (wasLiked) {
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    }
    
    try {
      const supabase = createClient();
      if (wasDisliked) {
        // Remove dislike
        await supabase
          .from('video_comment_dislikes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', currentUserId);
      } else {
        // Add dislike - use upsert
        await supabase
          .from('video_comment_dislikes')
          .upsert({ comment_id: comment.id, user_id: currentUserId }, { onConflict: 'comment_id,user_id' });
        
        // Remove like if exists
        if (wasLiked) {
          await supabase
            .from('video_comment_likes')
            .delete()
            .eq('comment_id', comment.id)
            .eq('user_id', currentUserId);
        }
      }
    } catch (e) {
      // Revert on error
      setIsLiked(wasLiked);
      setIsDisliked(wasDisliked);
      setDislikeCount(prev => wasDisliked ? prev + 1 : prev - 1);
      if (wasLiked && !isLiked) setLikeCount(prev => prev + 1);
      console.error('Dislike error:', e);
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-12' : ''}`}>
      <Link href={`/${comment.author.username}`}>
        <div className={`${isReply ? 'w-6 h-6' : 'w-10 h-10'} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0`}>
          <Image
            src={comment.author.avatar_url}
            alt={comment.author.display_name}
            width={isReply ? 24 : 40}
            height={isReply ? 24 : 40}
            className="object-cover"
          />
        </div>
      </Link>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link 
              href={`/${comment.author.username}`}
              className="text-sm font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
            >
              @{comment.author.username}
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-6 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[100px]">
                  <button
                    onClick={() => {
                      onEdit?.(comment.id, comment.text);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete?.(comment.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {comment.text}
        </p>
        
        <div className="flex items-center gap-4 mt-2">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-1 text-sm ${
              isLiked 
                ? 'text-purple-600 dark:text-purple-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button 
            onClick={handleDislike}
            className={`flex items-center gap-1 text-sm ${
              isDisliked 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
            {dislikeCount > 0 && <span>{dislikeCount}</span>}
          </button>
          <button 
            onClick={() => onReply?.(isReply && parentCommentId ? parentCommentId : comment.id, comment.author.username)}
            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Reply
          </button>
        </div>

        {/* Replies toggle */}
        {comment.replies && comment.replies.length > 0 && !isReply && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 mt-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
          >
            {showReplies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {/* Replies list */}
        {showReplies && comment.replies && (
          <div className="mt-3 space-y-4">
            {comment.replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                isReply
                parentCommentId={comment.id}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VideoComments({ videoId, currentUserId }: VideoCommentsProps) {
  const [comments, setComments] = useState<TVComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('top');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);

  // Fetch current user's avatar
  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (!currentUserId) return;
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', currentUserId)
        .single();
      if (profile?.avatar_url) {
        setCurrentUserAvatar(profile.avatar_url);
      }
    };
    fetchUserAvatar();
  }, [currentUserId]);

  useEffect(() => {
    const loadComments = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        // Fetch top-level comments (no parent)
        const { data: commentsData, error } = await supabase
          .from('video_comments')
          .select(`
            id,
            text_content,
            like_count,
            dislike_count,
            created_at,
            parent_comment_id,
            author:profiles!author_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('video_id', videoId)
          .is('parent_comment_id', null)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Failed to load comments:', error);
          setComments([]);
          return;
        }
        
        // Fetch all replies for this video
        const { data: repliesData } = await supabase
          .from('video_comments')
          .select(`
            id,
            text_content,
            like_count,
            dislike_count,
            created_at,
            parent_comment_id,
            author:profiles!author_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('video_id', videoId)
          .not('parent_comment_id', 'is', null)
          .order('created_at', { ascending: true });
        
        // Group replies by parent
        const repliesByParent = new Map<string, any[]>();
        (repliesData || []).forEach((r: any) => {
          const parentId = r.parent_comment_id;
          if (!repliesByParent.has(parentId)) {
            repliesByParent.set(parentId, []);
          }
          repliesByParent.get(parentId)!.push(r);
        });
        
        // Transform to TVComment format with replies
        const transformed: TVComment[] = (commentsData || []).map((c: any) => ({
          id: c.id,
          text: c.text_content,
          created_at: c.created_at,
          likes: c.like_count || 0,
          dislikes: c.dislike_count || 0,
          author: {
            id: c.author?.id || '',
            username: c.author?.username || 'unknown',
            display_name: c.author?.display_name || c.author?.username || 'Unknown',
            avatar_url: c.author?.avatar_url || '',
          },
          replies: (repliesByParent.get(c.id) || []).map((r: any) => ({
            id: r.id,
            text: r.text_content,
            created_at: r.created_at,
            likes: r.like_count || 0,
            dislikes: r.dislike_count || 0,
            author: {
              id: r.author?.id || '',
              username: r.author?.username || 'unknown',
              display_name: r.author?.display_name || r.author?.username || 'Unknown',
              avatar_url: r.author?.avatar_url || '',
            },
            replies: [],
          })),
        }));
        
        setComments(transformed);
      } catch (error) {
        console.error('Failed to load comments:', error);
        setComments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadComments();
  }, [videoId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId) return;
    
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      
      // Insert new comment (or reply)
      const { data: newCommentData, error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          author_id: currentUserId,
          text_content: newComment.trim(),
          parent_comment_id: replyingTo?.id || null,
        })
        .select(`
          id,
          text_content,
          like_count,
          created_at,
          parent_comment_id,
          author:profiles!author_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();
      
      if (error) {
        console.error('Failed to post comment:', error);
        return;
      }
      
      if (newCommentData) {
        const comment: TVComment = {
          id: newCommentData.id,
          text: newCommentData.text_content,
          created_at: newCommentData.created_at,
          likes: 0,
          dislikes: 0,
          author: {
            id: (newCommentData.author as any)?.id || currentUserId,
            username: (newCommentData.author as any)?.username || 'you',
            display_name: (newCommentData.author as any)?.display_name || 'You',
            avatar_url: (newCommentData.author as any)?.avatar_url || '',
          },
          replies: [],
        };
        
        if (replyingTo) {
          // Add reply to parent comment
          setComments(prev => prev.map(c => 
            c.id === replyingTo.id 
              ? { ...c, replies: [...(c.replies || []), comment] }
              : c
          ));
          setReplyingTo(null);
        } else {
          // Add as top-level comment
          setComments(prev => [comment, ...prev]);
        }
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit comment
  const handleEditComment = async (commentId: string, newText: string) => {
    if (!currentUserId || !newText.trim()) return;
    
    try {
      const supabase = createClient();
      await supabase
        .from('video_comments')
        .update({ text_content: newText.trim() })
        .eq('id', commentId)
        .eq('author_id', currentUserId);
      
      // Update local state
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, text: newText.trim() }
          : { ...c, replies: c.replies?.map(r => r.id === commentId ? { ...r, text: newText.trim() } : r) }
      ));
      setEditingComment(null);
    } catch (e) {
      console.error('Failed to edit comment:', e);
    }
  };
  
  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const supabase = createClient();
      await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', currentUserId);
      
      // Update local state - check both top-level and replies
      setComments(prev => {
        // First check if it's a top-level comment
        const filtered = prev.filter(c => c.id !== commentId);
        if (filtered.length !== prev.length) return filtered;
        
        // Otherwise it's a reply
        return prev.map(c => ({
          ...c,
          replies: c.replies?.filter(r => r.id !== commentId)
        }));
      });
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  };

  // Sort by net score (likes - dislikes) for "Top", newest first for "Newest"
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'top') {
      const aScore = a.likes - (a.dislikes || 0);
      const bScore = b.likes - (b.dislikes || 0);
      return bScore - aScore;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {comments.length} Comments
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy('top')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              sortBy === 'top'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setSortBy('newest')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              sortBy === 'newest'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Newest
          </button>
        </div>
      </div>

      {/* Add comment */}
      <div className="flex gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
          {currentUserAvatar ? (
            <Image
              src={currentUserAvatar}
              alt="Your avatar"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {currentUserId ? '?' : '?'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-purple-600 dark:text-purple-400">
              <span>Replying to @{replyingTo.username}</span>
              <button 
                onClick={() => setReplyingTo(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          )}
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUserId ? (replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment...") : "Sign in to comment"}
            disabled={!currentUserId}
            className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 pb-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-600 dark:focus:border-purple-400 disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
          {newComment.trim() && (
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setNewComment('');
                  setReplyingTo(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComment}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-full disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : (replyingTo ? 'Reply' : 'Comment')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedComments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment}
              onReply={(id, username) => {
                setReplyingTo({ id, username });
                setNewComment(`@${username} `);
              }}
              onEdit={(id, text) => setEditingComment({ id, text })}
              onDelete={handleDeleteComment}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
