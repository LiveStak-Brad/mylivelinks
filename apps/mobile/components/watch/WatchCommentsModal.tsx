import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Comment {
  id: string;
  text_content: string;
  created_at: string;
  like_count: number;
  reply_count?: number;
  is_liked?: boolean;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
    display_name?: string;
  } | null;
}

interface WatchCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string | null;
  authorUsername: string;
  commentCount: number;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}

/**
 * Comments modal for Watch feed items.
 * Fetches and displays comments from post_comments table.
 */
export default function WatchCommentsModal({
  visible,
  onClose,
  postId,
  authorUsername,
  commentCount,
}: WatchCommentsModalProps) {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actualCount, setActualCount] = useState(commentCount);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
          author:profiles!post_comments_author_id_fkey(
            id,
            username,
            avatar_url,
            display_name
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[WatchCommentsModal] Error loading comments:', error);
        return;
      }

      // Map the data to handle Supabase returning author as array
      const mappedComments = (data || []).map((c: any) => ({
        ...c,
        author: Array.isArray(c.author) ? c.author[0] : c.author,
      }));
      setComments(mappedComments);
      setActualCount(mappedComments.length);
    } catch (err) {
      console.error('[WatchCommentsModal] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
      // Get current user ID for like tracking
      supabase.auth.getUser().then(({ data: { user } }) => {
        setCurrentUserId(user?.id || null);
      });
    }
  }, [visible, postId, loadComments]);

  useEffect(() => {
    setActualCount(commentCount);
  }, [commentCount]);

  const handleLikeComment = async (comment: Comment) => {
    if (!currentUserId) return;

    try {
      // Check if already liked
      const { data: existing } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', comment.id)
        .eq('profile_id', currentUserId)
        .maybeSingle();

      if (existing) {
        // Unlike
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('profile_id', currentUserId);
      } else {
        // Like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: comment.id,
            profile_id: currentUserId,
          });
      }

      await loadComments();
    } catch (err) {
      console.error('[WatchCommentsModal] Error toggling like:', err);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setCommentText(`@${comment.author?.username || 'user'} `);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText('');
  };

  const handleSend = async () => {
    if (!commentText.trim() || submitting || !postId) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[WatchCommentsModal] User not logged in');
        return;
      }

      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          text_content: commentText.trim(),
        });

      if (error) {
        console.error('[WatchCommentsModal] Error posting comment:', error);
        return;
      }

      setCommentText('');
      await loadComments();
    } catch (err) {
      console.error('[WatchCommentsModal] Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: item.author?.avatar_url || 'https://via.placeholder.com/40' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>
            @{item.author?.username || 'unknown'}
          </Text>
          <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text_content}</Text>
        {/* Action buttons */}
        <View style={styles.commentActions}>
          <Pressable
            style={styles.commentActionButton}
            onPress={() => handleLikeComment(item)}
          >
            <Ionicons
              name={item.is_liked ? "heart" : "heart-outline"}
              size={16}
              color={item.is_liked ? "#EF4444" : "#9CA3AF"}
            />
            {item.like_count > 0 && (
              <Text style={[styles.commentActionText, item.is_liked && styles.commentActionTextActive]}>
                {item.like_count}
              </Text>
            )}
          </Pressable>
          <Pressable
            style={styles.commentActionButton}
            onPress={() => handleReply(item)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" />
            <Text style={styles.commentActionText}>Reply</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>{actualCount} Comments</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close comments"
            >
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* Comments List */}
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#EC4899" />
                <Text style={styles.emptyText}>Loading comments...</Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-outline" size={48} color="#4B5563" />
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={renderComment}
                contentContainerStyle={styles.commentsList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Reply indicator */}
          {replyingTo && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText}>
                Replying to @{replyingTo.author?.username}
              </Text>
              <Pressable onPress={cancelReply}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={replyingTo ? `Reply to @${replyingTo.author?.username}...` : `Comment on @${authorUsername}'s post...`}
              placeholderTextColor="#6B7280"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              editable={!submitting}
            />
            <Pressable
              style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#EC4899" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={commentText.trim() ? '#EC4899' : '#4B5563'}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 300,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#4B5563',
    borderRadius: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  listContainer: {
    flex: 1,
    minHeight: 150,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  commentText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 4,
    lineHeight: 20,
  },
  commentLikes: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentActionTextActive: {
    color: '#EF4444',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
  },
  replyIndicatorText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
