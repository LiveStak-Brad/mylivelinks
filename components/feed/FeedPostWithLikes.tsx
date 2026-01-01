'use client';

import { FeedPostCard, type FeedPostCardProps } from './FeedPostCard';
import { usePostLike, type ReactionType } from '@/hooks/useFeedLikes';

type FeedPostWithLikesProps = Omit<FeedPostCardProps, 'isLiked' | 'likesCount' | 'onLike' | 'userReaction'> & {
  postId: string;
  initialLikesCount?: number;
};

/**
 * Wrapper around FeedPostCard that handles like/reaction logic
 */
export function FeedPostWithLikes({ postId, initialLikesCount = 0, ...props }: FeedPostWithLikesProps) {
  const { isLiked, likesCount, userReaction, toggleLike } = usePostLike(postId);

  return (
    <FeedPostCard
      {...props}
      postId={postId}
      isLiked={isLiked}
      likesCount={likesCount || initialLikesCount}
      userReaction={userReaction}
      onLike={(reactionType?: ReactionType) => toggleLike(reactionType)}
    />
  );
}
