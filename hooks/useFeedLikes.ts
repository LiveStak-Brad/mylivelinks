import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

/**
 * Hook for liking a feed post
 * User can only like once per post (no unlike)
 */
export function usePostLike(postId: string | null) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Load initial like state
  useEffect(() => {
    if (!postId) return;

    const loadLikeState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has liked this post
        const { data: like } = await supabase
          .from('post_likes')
          .select('profile_id')
          .eq('post_id', postId)
          .eq('profile_id', user.id)
          .single();

        setIsLiked(!!like);

        // Get likes count
        const { data: post } = await supabase
          .from('posts')
          .select('likes_count')
          .eq('id', postId)
          .single();

        if (post) {
          setLikesCount(post.likes_count || 0);
        }
      } catch (err) {
        console.error('Failed to load like state:', err);
      }
    };

    loadLikeState();
  }, [postId, supabase]);

  const toggleLike = useCallback(async () => {
    if (!postId || isLoading || isLiked) return; // Already liked = no action

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('rpc_like_post', {
        p_post_id: postId,
        p_profile_id: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setIsLiked(result.is_liked);
        setLikesCount(result.likes_count);
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId, isLoading, isLiked, supabase]);

  return { isLiked, likesCount, toggleLike, isLoading };
}

/**
 * Hook for liking a comment
 * User can only like once per comment (no unlike)
 */
export function useCommentLike(commentId: string | null) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Load initial like state
  useEffect(() => {
    if (!commentId) return;

    const loadLikeState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has liked this comment
        const { data: like } = await supabase
          .from('post_comment_likes')
          .select('profile_id')
          .eq('comment_id', commentId)
          .eq('profile_id', user.id)
          .single();

        setIsLiked(!!like);

        // Get likes count
        const { data: comment } = await supabase
          .from('post_comments')
          .select('likes_count')
          .eq('id', commentId)
          .single();

        if (comment) {
          setLikesCount(comment.likes_count || 0);
        }
      } catch (err) {
        console.error('Failed to load comment like state:', err);
      }
    };

    loadLikeState();
  }, [commentId, supabase]);

  const toggleLike = useCallback(async () => {
    if (!commentId || isLoading || isLiked) return; // Already liked = no action

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('rpc_like_comment', {
        p_comment_id: commentId,
        p_profile_id: user.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        setIsLiked(result.is_liked);
        setLikesCount(result.likes_count);
      }
    } catch (err) {
      console.error('Failed to like comment:', err);
    } finally {
      setIsLoading(false);
    }
  }, [commentId, isLoading, isLiked, supabase]);

  return { isLiked, likesCount, toggleLike, isLoading };
}
