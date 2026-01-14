import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../state/AuthContext';
import MllProBadge from '../shared/MllProBadge';

type CommentAuthor = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_mll_pro?: boolean;
};

type FeedComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  text_content: string;
  created_at: string;
  like_count: number;
  reply_count: number;
  is_liked_by_current_user: boolean;
  author: CommentAuthor;
  replies?: FeedComment[];
};

interface FeedCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postAuthorUsername: string;
  onCommentCountChange?: (delta: number) => void;
  onOpenGift?: (recipientId: string, recipientUsername: string) => void;
}

function formatCommentTime(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

function resolveAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl.replace(/^\/+/, ''));
  return data?.publicUrl || null;
}

export default function FeedCommentsModal({
  visible,
  onClose,
  postId,
  postAuthorUsername,
  onCommentCountChange,
  onOpenGift,
}: FeedCommentsModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const inputRef = useRef<TextInput>(null);

  const loadComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com';
      const res = await fetch(`${baseUrl}/api/posts/${encodeURIComponent(postId)}/comments?limit=50`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        console.warn('[FeedCommentsModal] Failed to load comments:', res.status);
        return;
      }

      const json = await res.json();
      setComments(json.comments || []);
    } catch (err) {
      console.error('[FeedCommentsModal] Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
      setCommentText('');
      setReplyingTo(null);
    }
  }, [visible, postId, loadComments]);

  const submitComment = useCallback(async () => {
    if (!user || !commentText.trim()) return;

    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        Alert.alert('Error', 'You must be logged in to comment.');
        return;
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com';
      const body: any = { text_content: commentText.trim() };
      if (replyingTo) {
        body.parent_comment_id = replyingTo.id;
      }

      const res = await fetch(`${baseUrl}/api/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        Alert.alert('Error', errJson.error || 'Failed to post comment');
        return;
      }

      const json = await res.json();
      const created = json.comment;

      if (created) {
        if (replyingTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyingTo.id
                ? {
                    ...c,
                    reply_count: (c.reply_count || 0) + 1,
                    replies: [
                      ...(c.replies || []),
                      {
                        id: String(created.id),
                        post_id: String(created.post_id),
                        parent_comment_id: String(created.parent_comment_id),
                        text_content: String(created.text_content),
                        created_at: String(created.created_at),
                        like_count: 0,
                        reply_count: 0,
                        is_liked_by_current_user: false,
                        author: { id: user.id, username: 'You', avatar_url: null },
                      },
                    ],
                  }
                : c
            )
          );
          setExpandedReplies((prev) => ({ ...prev, [replyingTo.id]: true }));
        } else {
          setComments((prev) => [
            ...prev,
            {
              id: String(created.id),
              post_id: String(created.post_id),
              parent_comment_id: null,
              text_content: String(created.text_content),
              created_at: String(created.created_at),
              like_count: 0,
              reply_count: 0,
              is_liked_by_current_user: false,
              author: { id: user.id, username: 'You', avatar_url: null },
              replies: [],
            },
          ]);
          onCommentCountChange?.(1);
        }
      }

      setCommentText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('[FeedCommentsModal] Error submitting comment:', err);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }, [user, commentText, replyingTo, postId, onCommentCountChange]);

  const toggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!user) return;

      const comment = comments.find((c) => c.id === commentId) ||
        comments.flatMap((c) => c.replies || []).find((r) => r.id === commentId);
      if (!comment) return;

      const wasLiked = comment.is_liked_by_current_user;
      const newLikedState = !wasLiked;

      // Optimistic update
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              is_liked_by_current_user: newLikedState,
              like_count: newLikedState ? c.like_count + 1 : Math.max(0, c.like_count - 1),
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      is_liked_by_current_user: newLikedState,
                      like_count: newLikedState ? r.like_count + 1 : Math.max(0, r.like_count - 1),
                    }
                  : r
              ),
            };
          }
          return c;
        })
      );

      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) return;

        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com';
        const method = newLikedState ? 'POST' : 'DELETE';
        await fetch(`${baseUrl}/api/comments/${encodeURIComponent(commentId)}/like`, {
          method,
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('[FeedCommentsModal] Error toggling like:', err);
      }
    },
    [user, comments]
  );

  const renderComment = useCallback(
    ({ item, isReply = false }: { item: FeedComment; isReply?: boolean }) => {
      const avatarUrl = resolveAvatarUrl(item.author.avatar_url);
      const initial = (item.author.username || '?').slice(0, 1).toUpperCase();
      const showReplies = expandedReplies[item.id];

      return (
        <View style={[styles.commentRow, isReply && styles.replyRow]}>
          <View style={styles.commentAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.commentAvatarImage} />
            ) : (
              <Text style={styles.commentAvatarText}>{initial}</Text>
            )}
          </View>

          <View style={styles.commentContent}>
            <View style={styles.commentBubble}>
              <View style={styles.commentAuthorRow}>
                <Text style={styles.commentAuthor}>{item.author.username}</Text>
                {item.author.is_mll_pro && <MllProBadge size="sm" />}
              </View>
              <Text style={styles.commentText}>{item.text_content}</Text>
            </View>

            <View style={styles.commentActions}>
              <Text style={styles.commentTime}>{formatCommentTime(item.created_at)}</Text>
              <Pressable onPress={() => toggleCommentLike(item.id)}>
                <Text
                  style={[
                    styles.commentActionText,
                    item.is_liked_by_current_user && styles.commentActionActive,
                  ]}
                >
                  {item.like_count > 0 ? `Like (${item.like_count})` : 'Like'}
                </Text>
              </Pressable>
              {!isReply && (
                <Pressable
                  onPress={() => {
                    setReplyingTo({ id: item.id, username: item.author.username });
                    inputRef.current?.focus();
                  }}
                >
                  <Text style={styles.commentActionText}>Reply</Text>
                </Pressable>
              )}
              {onOpenGift && (
                <Pressable onPress={() => onOpenGift(item.author.id, item.author.username)}>
                  <Text style={[styles.commentActionText, styles.commentGiftAction]}>Gift</Text>
                </Pressable>
              )}
            </View>

            {!isReply && item.replies && item.replies.length > 0 && (
              <View style={styles.repliesSection}>
                {!showReplies ? (
                  <Pressable
                    onPress={() => setExpandedReplies((prev) => ({ ...prev, [item.id]: true }))}
                  >
                    <Text style={styles.viewRepliesText}>
                      View {item.replies.length} {item.replies.length === 1 ? 'reply' : 'replies'}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => setExpandedReplies((prev) => ({ ...prev, [item.id]: false }))}
                    >
                      <Text style={styles.hideRepliesText}>Hide replies</Text>
                    </Pressable>
                    {item.replies.map((reply) => (
                      <View key={reply.id}>{renderComment({ item: reply, isReply: true })}</View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      );
    },
    [expandedReplies, toggleCommentLike, onOpenGift]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Comments</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* Comments List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#EC4899" />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={48} color="#6B7280" />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderComment({ item })}
              contentContainerStyle={styles.commentsList}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Reply indicator */}
          {replyingTo && (
            <View style={styles.replyingToBar}>
              <Text style={styles.replyingToText}>Replying to @{replyingTo.username}</Text>
              <Pressable onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : 'Write a comment...'}
              placeholderTextColor="#6B7280"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={1000}
              editable={!submitting}
            />
            <Pressable
              style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={submitComment}
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
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
    maxHeight: '85%',
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
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
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
  commentsList: {
    padding: 16,
    paddingBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  replyRow: {
    marginLeft: 0,
    marginTop: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#374151',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  commentText: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    paddingLeft: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  commentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  commentActionActive: {
    color: '#EC4899',
  },
  commentGiftAction: {
    color: '#A855F7',
  },
  repliesSection: {
    marginTop: 8,
    marginLeft: 8,
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EC4899',
  },
  hideRepliesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
  },
  replyingToText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 10,
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
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
