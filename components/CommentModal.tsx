'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Gift } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import SafeRichText from '@/components/SafeRichText';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';

interface Comment {
  id: string;
  text_content: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
    display_name?: string;
  };
  like_count: number;
  reply_count: number;
  replies?: Comment[];
}

interface CommentModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onGift?: (comment: Comment) => void;
}

export function CommentModal({ postId, isOpen, onClose, onGift }: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeReplyTo, setActiveReplyTo] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  const loadComments = useCallback(async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          text_content,
          created_at,
          like_count,
          reply_count,
          author:profiles!post_comments_author_id_fkey(
            id,
            username,
            avatar_url,
            display_name
          ),
          replies:post_comments!parent_comment_id(
            id,
            text_content,
            created_at,
            like_count,
            author:profiles!post_comments_author_id_fkey(
              id,
              username,
              avatar_url,
              display_name
            )
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      // Map the data to handle Supabase returning author as array
      const mappedComments = (data || []).map((c: any) => ({
        ...c,
        author: Array.isArray(c.author) ? c.author[0] : c.author,
        replies: (c.replies || []).map((r: any) => ({
          ...r,
          author: Array.isArray(r.author) ? r.author[0] : r.author,
        })),
      }));
      setComments(mappedComments);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId, supabase]);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          text_content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      await loadComments();
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (commentId: string) => {
    const replyText = replyDrafts[commentId]?.trim();
    if (!replyText || replySubmitting[commentId]) return;

    setReplySubmitting(prev => ({ ...prev, [commentId]: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          parent_comment_id: commentId,
          author_id: user.id,
          text_content: replyText,
        });

      if (error) throw error;

      setReplyDrafts(prev => ({ ...prev, [commentId]: '' }));
      setActiveReplyTo(null);
      await loadComments();
    } catch (err) {
      console.error('Error posting reply:', err);
    } finally {
      setReplySubmitting(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already liked
      const { data: existing } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (existing) {
        // Unlike
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('profile_id', user.id);
      } else {
        // Like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            profile_id: user.id
          });
      }

      await loadComments();
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-2xl max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold">Comments</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Main Comment */}
                <div className="flex items-start gap-2.5">
                  <Link href={`/${comment.author.username}`} className="flex-shrink-0 mt-0.5">
                    <img
                      src={comment.author.avatar_url || '/no-profile-pic.png'}
                      alt={comment.author.username}
                      className="w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity ring-1 ring-gray-200 dark:ring-gray-700"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    {/* Facebook-style comment bubble */}
                    <div className="inline-block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors rounded-2xl px-3 py-2 max-w-[85%]">
                      <UserNameWithBadges
                        profileId={comment.author.id}
                        name={comment.author.username}
                        textSize="text-xs"
                        nameClassName="font-semibold"
                        clickable
                        showGifterBadge={false}
                      />
                      <div className="text-sm leading-[1.4] mt-0.5 break-words">
                        <SafeRichText text={comment.text_content} className="whitespace-pre-wrap" />
                      </div>
                    </div>

                    {/* Comment Actions */}
                    <div className="flex items-center gap-3 px-3 mt-0.5 text-xs font-semibold">
                      <button
                        className="text-gray-500 hover:underline transition"
                        onClick={() => toggleCommentLike(comment.id)}
                      >
                        {comment.like_count > 0 ? `Like (${comment.like_count})` : 'Like'}
                      </button>
                      <span className="text-gray-400">·</span>
                      <button
                        className="text-gray-500 hover:underline transition"
                        onClick={() => setActiveReplyTo(activeReplyTo === comment.id ? null : comment.id)}
                      >
                        Reply
                      </button>
                      {onGift && (
                        <>
                          <span className="text-gray-400">·</span>
                          <button
                            className="text-purple-500 hover:underline transition flex items-center gap-1"
                            onClick={() => onGift(comment)}
                          >
                            <Gift size={12} />
                            Gift
                          </button>
                        </>
                      )}
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-400 text-[11px]">
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>

                    {/* Reply Input */}
                    {activeReplyTo === comment.id && (
                      <div className="mt-2 flex items-start gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder={`Reply to ${comment.author.username}...`}
                            value={replyDrafts[comment.id] || ''}
                            onChange={(e) => setReplyDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReplySubmit(comment.id);
                              }
                            }}
                            disabled={replySubmitting[comment.id]}
                            className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-2 space-y-2 pl-2">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <Link href={`/${reply.author.username}`} className="flex-shrink-0">
                              <img
                                src={reply.author.avatar_url || '/no-profile-pic.png'}
                                alt={reply.author.username}
                                className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                              />
                            </Link>
                            <div className="flex-1 min-w-0">
                              <div className="inline-block bg-gray-100 dark:bg-gray-800 rounded-2xl px-3 py-1.5 max-w-[85%]">
                                <UserNameWithBadges
                                  profileId={reply.author.id}
                                  name={reply.author.username}
                                  textSize="text-xs"
                                  nameClassName="font-semibold"
                                  clickable
                                  showGifterBadge={false}
                                />
                                <div className="text-xs leading-[1.4] mt-0.5 break-words">
                                  <SafeRichText text={reply.text_content} className="whitespace-pre-wrap" />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 px-3 mt-0.5 text-[11px] font-semibold">
                                <button
                                  className="text-gray-500 hover:underline transition"
                                  onClick={() => toggleCommentLike(reply.id)}
                                >
                                  {reply.like_count > 0 ? `Like (${reply.like_count})` : 'Like'}
                                </button>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-400">
                                  {formatDateTime(reply.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-5 py-2 text-sm bg-blue-500 text-white rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
