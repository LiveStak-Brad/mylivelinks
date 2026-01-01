import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export type ReactionType = 'love' | 'haha' | 'wow' | 'sad' | 'fire';

/**
 * Hook for reacting to a feed post with multiple reaction types.
 * Toggle behavior: clicking the same reaction removes it, selecting another swaps it.
 */
export function usePostLike(postId: string | null) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Load initial like state
  useEffect(() => {
    if (!postId) return;

    const loadLikeState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has reacted to this post
        const { data: like } = await supabase
          .from('post_likes')
          .select('profile_id, reaction_type')
          .eq('post_id', postId)
          .eq('profile_id', user.id)
          .single();

        if (like) {
          setIsLiked(true);
          setUserReaction(like.reaction_type as ReactionType);
        }

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

  const toggleLike = useCallback(
    async (reactionType: ReactionType = 'love') => {
      if (!postId || isLoading) return;

      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.warn('User must be logged in to react to posts');
          return;
        }

        // Optimistic update
        const wasLiked = isLiked;
        const previousReaction = userReaction;
        const isSameReaction = userReaction === reactionType;

        if (isSameReaction) {
          // Removing reaction
          setIsLiked(false);
          setUserReaction(null);
          setLikesCount(Math.max(0, likesCount - 1));
        } else if (wasLiked) {
          // Changing reaction (count stays the same)
          setUserReaction(reactionType);
        } else {
          // Adding new reaction
          setIsLiked(true);
          setUserReaction(reactionType);
          setLikesCount(likesCount + 1);
        }

        const { data, error } = await supabase.rpc('rpc_post_like_toggle', {
          p_post_id: postId,
          p_profile_id: user.id,
          p_reaction_type: reactionType,
        });

        if (error) {
          console.error('❌ Post reaction RPC failed:', {
            error: error.message,
            details: error,
            postId,
            userId: user.id,
            reactionType,
            hint: error.hint,
            code: error.code,
          });
          setIsLiked(wasLiked);
          setUserReaction(previousReaction ?? null);
          setLikesCount(likesCount);
          throw error;
        }

        if (data && data.length > 0) {
          const result = data[0];
          setIsLiked(result.is_liked);
          setLikesCount(result.likes_count);
          setUserReaction((result.user_reaction as ReactionType | null) ?? null);
        }
      } catch (err) {
        console.error('❌ Failed to toggle post reaction:', err);
        alert('Failed to react to post. Check console for details.');
      } finally {
        setIsLoading(false);
      }
    },
    [postId, isLoading, isLiked, userReaction, likesCount, supabase]
  );

  return { isLiked, likesCount, userReaction, toggleLike, isLoading };
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
