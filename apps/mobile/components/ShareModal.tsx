'use strict';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../theme/useTheme';
import { brand } from '../theme/colors';

const NO_PROFILE_PIC = require('../assets/no-profile-pic.png');

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  shareUrl: string;
  shareText: string;
  shareThumbnail?: string | null;
  shareContentType?: 'video' | 'live' | 'photo' | 'profile';
  teamId?: string | null;
  teamName?: string | null;
  teamSlug?: string | null;
}

interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live?: boolean;
  is_online?: boolean;
  last_shared_at?: string | null;
}

interface Follower {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_live?: boolean;
  is_online?: boolean;
}

export default function ShareModal({
  visible,
  onClose,
  shareUrl,
  shareText,
  shareThumbnail,
  shareContentType = 'video',
  teamId,
  teamName,
  teamSlug,
}: ShareModalProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const styles = useMemo(() => createStyles(colors, brand), [colors]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Load friends list (mutual follows)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_friends_list', {
        p_profile_id: user.id,
        p_limit: 200,
        p_offset: 0,
      });

      // Load recent share recipients for sorting
      const { data: recentShares } = await supabase
        .from('instant_messages')
        .select('recipient_id, created_at')
        .eq('sender_id', user.id)
        .like('content', '%"type":"share"%')
        .order('created_at', { ascending: false })
        .limit(100);

      const recentMap = new Map<string, string>();
      if (recentShares) {
        for (const share of recentShares) {
          if (share.recipient_id && !recentMap.has(share.recipient_id)) {
            recentMap.set(share.recipient_id, share.created_at);
          }
        }
      }

      // Process friends
      let friendIds = new Set<string>();
      let allUserIds: string[] = [];
      
      if (!rpcError) {
        const friendsRaw = (rpcData as any)?.friends ?? [];
        allUserIds = friendsRaw.map((p: any) => String(p.id));
        friendIds = new Set(allUserIds);
      }

      // Load followers (people who follow you but are NOT mutual friends)
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            is_live
          )
        `)
        .eq('followee_id', user.id)
        .limit(200);

      const followerIds: string[] = [];
      if (!followersError && followersData) {
        for (const f of followersData) {
          if (f.profiles && !friendIds.has(String(f.profiles.id))) {
            followerIds.push(String(f.profiles.id));
          }
        }
      }

      // Combine all user IDs and fetch online status
      const allIds = [...allUserIds, ...followerIds];
      const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
      const { data: onlineData } = allIds.length
        ? await supabase.from('room_presence').select('profile_id').in('profile_id', allIds).gt('last_seen_at', cutoff)
        : { data: [] };
      const onlineSet = new Set((onlineData ?? []).map((o: any) => String(o.profile_id)));

      // Now build friends list with online status
      if (!rpcError) {
        const friendsRaw = (rpcData as any)?.friends ?? [];
        const friendsList: Friend[] = (Array.isArray(friendsRaw) ? friendsRaw : []).map((p: any) => ({
          id: String(p.id),
          username: String(p.username ?? ''),
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
          is_live: Boolean(p.is_live),
          is_online: onlineSet.has(String(p.id)),
          last_shared_at: recentMap.get(String(p.id)) ?? null,
        }));

        // Sort: live first, then online, then by recent shares, then alphabetical
        friendsList.sort((a, b) => {
          if (a.is_live && !b.is_live) return -1;
          if (!a.is_live && b.is_live) return 1;
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          if (a.last_shared_at && !b.last_shared_at) return -1;
          if (!a.last_shared_at && b.last_shared_at) return 1;
          if (a.last_shared_at && b.last_shared_at) {
            return new Date(b.last_shared_at).getTime() - new Date(a.last_shared_at).getTime();
          }
          const aName = (a.display_name || a.username || '').toLowerCase();
          const bName = (b.display_name || b.username || '').toLowerCase();
          return aName.localeCompare(bName);
        });

        setFriends(friendsList);
      } else {
        console.error('[ShareModal] Error loading friends:', rpcError);
        setFriends([]);
      }

      // Build followers list with online status
      if (!followersError && followersData) {
        const followersList: Follower[] = followersData
          .filter((f: any) => f.profiles && !friendIds.has(String(f.profiles.id)))
          .map((f: any) => ({
            id: String(f.profiles.id),
            username: String(f.profiles.username ?? ''),
            display_name: f.profiles.display_name ?? null,
            avatar_url: f.profiles.avatar_url ?? null,
            is_live: Boolean(f.profiles.is_live),
            is_online: onlineSet.has(String(f.profiles.id)),
          }));

        // Sort: live first, then online, then alphabetical
        followersList.sort((a, b) => {
          if (a.is_live && !b.is_live) return -1;
          if (!a.is_live && b.is_live) return 1;
          if (a.is_online && !b.is_online) return -1;
          if (!a.is_online && b.is_online) return 1;
          const aName = (a.display_name || a.username || '').toLowerCase();
          const bName = (b.display_name || b.username || '').toLowerCase();
          return aName.localeCompare(bName);
        });

        setFollowers(followersList);
      } else {
        setFollowers([]);
      }
    } catch (err) {
      console.error('[ShareModal] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (visible) {
      loadData();
      setSelectedIds(new Set());
      setCopied(false);
    }
  }, [visible, loadData]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSendToMessenger = async () => {
    if (!user?.id || selectedIds.size === 0) return;

    setSending(true);
    try {
      let successCount = 0;

      for (const recipientId of selectedIds) {
        const messageContent = JSON.stringify({
          type: 'share',
          text: shareText,
          url: shareUrl,
          thumbnail: shareThumbnail || null,
          contentType: shareContentType,
          ...(teamId && { teamId, teamName, teamSlug }),
        });

        const { error: msgError } = await supabase
          .from('instant_messages')
          .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            content: messageContent,
          });

        if (!msgError) {
          successCount++;
        }
      }

      if (successCount > 0) {
        onClose();
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error('[ShareModal] Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[ShareModal] Copy error:', err);
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: shareText ? `${shareText}\n${shareUrl}` : shareUrl,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled
    }
  };

  const renderPerson = (item: Friend | Follower) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <Pressable
        key={item.id}
        onPress={() => toggleSelection(item.id)}
        style={styles.personItem}
      >
        <View style={[styles.personAvatarWrap, isSelected && styles.personAvatarSelected]}>
          <Image
            source={item.avatar_url ? { uri: item.avatar_url } : NO_PROFILE_PIC}
            style={styles.personAvatar}
            resizeMode="cover"
          />
          {isSelected && (
            <View style={styles.checkOverlay}>
              <Feather name="check" size={16} color="#FFFFFF" />
            </View>
          )}
          {item.is_live && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {!item.is_live && item.is_online && (
            <View style={styles.onlineDot} />
          )}
        </View>
        <Text style={styles.personName} numberOfLines={1}>
          {item.display_name?.split(' ')[0] || item.username}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Share</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.mutedText} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={brand.primary} style={{ marginVertical: 20 }} />
          ) : (
            <>
              {/* Friends - Horizontal Scroll */}
              {friends.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Friends ({friends.length})</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {friends.map(renderPerson)}
                  </ScrollView>
                </View>
              )}

              {/* Followers - Horizontal Scroll */}
              {followers.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Followers ({followers.length})</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {followers.map(renderPerson)}
                  </ScrollView>
                </View>
              )}

              {friends.length === 0 && followers.length === 0 && (
                <Text style={styles.emptyText}>No friends or followers yet</Text>
              )}

              {/* Snapchat Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Snapchat</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {/* Share to Snapchat - opens Snapchat with link sticker */}
                  <Pressable
                    onPress={() => {
                      // Snapchat Creative Kit deep link with attachment URL
                      const snapUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}`;
                      import('react-native').then(({ Linking }) => Linking.openURL(snapUrl));
                    }}
                    style={styles.snapchatItem}
                  >
                    <View style={styles.snapchatIconWrap}>
                      <View style={styles.snapchatIcon}>
                        <Text style={{ fontSize: 24 }}>👻</Text>
                      </View>
                    </View>
                    <Text style={styles.personName}>Snapchat</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </>
          )}

          {/* Send Button */}
          {selectedIds.size > 0 && (
            <View style={styles.sendSection}>
              <Pressable
                onPress={handleSendToMessenger}
                disabled={sending}
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendBtnText}>Send ({selectedIds.size})</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Share Options */}
          <View style={styles.optionsSection}>
            <View style={styles.optionsRow}>
              {/* Copy Link */}
              <Pressable onPress={handleCopyLink} style={styles.optionBtn}>
                <View style={styles.optionIcon}>
                  <Feather name={copied ? 'check' : 'copy'} size={20} color={copied ? '#22C55E' : colors.text} />
                </View>
                <Text style={styles.optionLabel}>{copied ? 'Copied' : 'Copy'}</Text>
              </Pressable>

              {/* Native Share */}
              <Pressable onPress={handleNativeShare} style={styles.optionBtn}>
                <View style={styles.optionIcon}>
                  <Feather name="share" size={20} color={colors.text} />
                </View>
                <Text style={styles.optionLabel}>Share</Text>
              </Pressable>

              {/* More options can be added here */}
            </View>

            {/* URL Display */}
            <View style={styles.urlDisplay}>
              <Feather name="link" size={14} color={colors.mutedText} />
              <Text style={styles.urlText} numberOfLines={1}>{shareUrl}</Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: any, brand: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    closeBtn: {
      padding: 4,
    },
    section: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedText,
      marginBottom: 10,
      paddingHorizontal: 16,
    },
    horizontalScroll: {
      paddingHorizontal: 16,
      gap: 12,
    },
    personItem: {
      width: 64,
      alignItems: 'center',
    },
    personAvatarWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    personAvatarSelected: {
      borderColor: brand.primary,
    },
    personAvatar: {
      width: '100%',
      height: '100%',
    },
    checkOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(99,102,241,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    liveBadge: {
      position: 'absolute',
      bottom: -2,
      left: '50%',
      transform: [{ translateX: -16 }],
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: '#EF4444',
      borderRadius: 999,
    },
    liveBadgeText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    onlineDot: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#8B5CF6',
      borderWidth: 2,
      borderColor: colors.bg,
    },
    personName: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '600',
      color: colors.mutedText,
      maxWidth: 60,
      textAlign: 'center',
    },
    snapchatItem: {
      width: 64,
      alignItems: 'center',
    },
    snapchatIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      overflow: 'hidden',
      backgroundColor: '#FFFC00',
      justifyContent: 'center',
      alignItems: 'center',
    },
    snapchatIcon: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: colors.mutedText,
      textAlign: 'center',
      paddingVertical: 20,
    },
    sendSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sendBtn: {
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: brand.primary,
      alignItems: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.5,
    },
    sendBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    optionsSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    optionsRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
    },
    optionBtn: {
      alignItems: 'center',
      gap: 6,
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.mutedText,
    },
    urlDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    urlText: {
      flex: 1,
      fontSize: 12,
      color: colors.mutedText,
    },
  });
}
