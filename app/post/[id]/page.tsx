'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, Play, Gift, Repeat2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CommentModal } from '@/components/CommentModal';
import { ShareModal } from '@/components/ShareModal';
import GiftModal from '@/components/GiftModal';

interface PostData {
  id: string;
  title: string | null;
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  likes_count: number;
  comment_count: number;
  views_count: number;
  favorite_count: number;
  repost_count: number;
  created_at: string;
  author_id: string;
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  is_liked: boolean;
  is_favorited: boolean;
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      try {
        // Get current user for checking like/favorite state
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            text_content,
            media_url,
            thumbnail_url,
            media_type,
            likes_count,
            like_count,
            comment_count,
            views_count,
            favorite_count,
            repost_count,
            created_at,
            author_id,
            profiles!posts_author_id_fkey (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('id', postId)
          .single();

        if (fetchError) {
          console.error('Error loading post:', fetchError);
          setError('Post not found');
        } else if (data) {
          const profile = data.profiles as any;
          
          // Check if user has liked/favorited this post
          let isLiked = false;
          let isFavorited = false;
          
          if (user) {
            const [likeResult, favResult] = await Promise.all([
              supabase.from('post_likes').select('post_id').eq('post_id', postId).eq('profile_id', user.id).maybeSingle(),
              supabase.from('post_favorites').select('post_id').eq('post_id', postId).eq('profile_id', user.id).maybeSingle(),
            ]);
            isLiked = !!likeResult.data;
            isFavorited = !!favResult.data;
          }
          
          setPost({
            id: data.id,
            title: data.title,
            text_content: data.text_content,
            media_url: data.media_url,
            thumbnail_url: data.thumbnail_url,
            media_type: data.media_type,
            likes_count: data.likes_count || data.like_count || 0,
            comment_count: data.comment_count || 0,
            views_count: data.views_count || 0,
            favorite_count: data.favorite_count || 0,
            repost_count: data.repost_count || 0,
            created_at: data.created_at,
            author_id: data.author_id,
            author_username: profile?.username || 'unknown',
            author_display_name: profile?.display_name,
            author_avatar_url: profile?.avatar_url,
            is_liked: isLiked,
            is_favorited: isFavorited,
          });
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId, supabase]);

  const isVideo = post?.media_url && /(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(post.media_url);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle like action with optimistic update
  const handleLike = useCallback(async () => {
    if (!post) return;
    
    // Optimistic update
    const wasLiked = post.is_liked;
    setPost(prev => prev ? {
      ...prev,
      is_liked: !wasLiked,
      likes_count: wasLiked ? Math.max(0, prev.likes_count - 1) : prev.likes_count + 1,
    } : null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      if (wasLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('profile_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, profile_id: user.id });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert on error
      setPost(prev => prev ? {
        ...prev,
        is_liked: wasLiked,
        likes_count: wasLiked ? prev.likes_count + 1 : Math.max(0, prev.likes_count - 1),
      } : null);
    }
  }, [post, postId, supabase, router]);

  // Handle favorite action with optimistic update
  const handleFavorite = useCallback(async () => {
    if (!post) return;
    
    // Optimistic update
    const wasFavorited = post.is_favorited;
    setPost(prev => prev ? {
      ...prev,
      is_favorited: !wasFavorited,
      favorite_count: wasFavorited ? Math.max(0, prev.favorite_count - 1) : prev.favorite_count + 1,
    } : null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      await supabase.rpc('rpc_toggle_favorite', { p_post_id: postId });
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert on error
      setPost(prev => prev ? {
        ...prev,
        is_favorited: wasFavorited,
        favorite_count: wasFavorited ? prev.favorite_count + 1 : Math.max(0, prev.favorite_count - 1),
      } : null);
    }
  }, [post, postId, supabase, router]);

  // Handle repost action with optimistic update
  const handleRepost = useCallback(async () => {
    if (!post) return;
    
    // Optimistic update
    setPost(prev => prev ? {
      ...prev,
      repost_count: prev.repost_count + 1,
    } : null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      await supabase.rpc('rpc_toggle_repost', { p_post_id: postId });
    } catch (err) {
      console.error('Error reposting:', err);
    }
  }, [post, postId, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="text-xl mb-4">{error || 'Post not found'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-white font-semibold">Post</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="pt-16 pb-20">
        {/* Media */}
        <div className="relative w-full aspect-[9/16] max-h-[70vh] bg-gray-900">
          {isVideo ? (
            <video
              src={post.media_url || ''}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
            />
          ) : post.media_url ? (
            <Image
              src={post.media_url}
              alt={post.title || 'Post'}
              fill
              className="object-contain"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Play className="w-16 h-16 text-white/50" />
            </div>
          )}
        </div>

        {/* Author Info */}
        <div className="px-4 py-4">
          <Link
            href={`/${post.author_username}`}
            className="flex items-center gap-3"
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700">
              {post.author_avatar_url ? (
                <Image
                  src={post.author_avatar_url}
                  alt={post.author_username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600" />
              )}
            </div>
            <div>
              <p className="text-white font-semibold">
                {post.author_display_name || post.author_username}
              </p>
              <p className="text-gray-400 text-sm">@{post.author_username}</p>
            </div>
          </Link>
        </div>

        {/* Caption */}
        {(post.title || post.text_content) && (
          <div className="px-4 pb-4">
            {post.title && (
              <h2 className="text-white font-semibold text-lg mb-1">{post.title}</h2>
            )}
            {post.text_content && (
              <p className="text-gray-300">{post.text_content}</p>
            )}
          </div>
        )}

        {/* Interactive Action Buttons */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center justify-around">
            {/* Like */}
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Heart 
                className={`w-6 h-6 ${post.is_liked ? 'text-red-500 fill-red-500' : 'text-white'}`}
              />
              <span className={`text-xs ${post.is_liked ? 'text-red-500' : 'text-gray-400'}`}>
                {formatCount(post.likes_count)}
              </span>
            </button>

            {/* Comment */}
            <button
              onClick={() => setCommentModalOpen(true)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition"
            >
              <MessageCircle className="w-6 h-6 text-white" />
              <span className="text-xs text-gray-400">{formatCount(post.comment_count)}</span>
            </button>

            {/* Gift */}
            <button
              onClick={() => setGiftModalOpen(true)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Gift className="w-6 h-6 text-yellow-400" />
              <span className="text-xs text-gray-400">Gift</span>
            </button>

            {/* Favorite/Highlight */}
            <button
              onClick={handleFavorite}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Bookmark 
                className={`w-6 h-6 ${post.is_favorited ? 'text-yellow-500 fill-yellow-500' : 'text-white'}`}
              />
              <span className={`text-xs ${post.is_favorited ? 'text-yellow-500' : 'text-gray-400'}`}>
                {formatCount(post.favorite_count)}
              </span>
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Repeat2 className="w-6 h-6 text-white" />
              <span className="text-xs text-gray-400">{formatCount(post.repost_count)}</span>
            </button>

            {/* Share */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Share2 className="w-6 h-6 text-white" />
              <span className="text-xs text-gray-400">Share</span>
            </button>
          </div>
          
          {/* Views and Date */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <Play className="w-4 h-4" />
              {formatCount(post.views_count)} views
            </span>
            <span className="text-gray-500 text-sm">{formatDate(post.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        postId={postId}
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        onGift={() => setGiftModalOpen(true)}
      />

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          title={post.title || 'Check out this post'}
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/post/${postId}`}
          thumbnailUrl={post.thumbnail_url || post.media_url || undefined}
        />
      )}

      {/* Gift Modal */}
      {giftModalOpen && (
        <GiftModal
          onClose={() => setGiftModalOpen(false)}
          onGiftSent={() => setGiftModalOpen(false)}
          recipientId={post.author_id}
          recipientUsername={post.author_username}
          postId={post.id}
        />
      )}
    </div>
  );
}
