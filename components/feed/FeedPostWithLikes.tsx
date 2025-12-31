'use client';

import { FeedPostCard, type FeedPostCardProps } from './FeedPostCard';
import { usePostLike } from '@/hooks/useFeedLikes';

type FeedPostWithLikesProps = Omit<FeedPostCardProps, 'isLiked' | 'likesCount' | 'onLike'> & {
  postId: string;
  initialLikesCount?: number;
};

/**
 * Wrapper around FeedPostCard that handles like logic
 */
export function FeedPostWithLikes({ postId, initialLikesCount = 0, ...props }: FeedPostWithLikesProps) {
  const { isLiked, likesCount, toggleLike } = usePostLike(postId);

  return (
    <FeedPostCard
      {...props}
      isLiked={isLiked}
      likesCount={likesCount || initialLikesCount}
      onLike={toggleLike}
    />
  );
}
