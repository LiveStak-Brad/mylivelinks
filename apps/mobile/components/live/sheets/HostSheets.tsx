import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { CHAT_FONT_COLORS } from '../../live/ChatOverlay';
import { DEFAULT_HOST_LIVE_OPTIONS, type HostLiveOptions } from '../../../lib/hostLiveOptions';

interface BaseSheetProps {
  visible: boolean;
  onClose: () => void;
}

function SheetContainer({ visible, onClose, title, children }: BaseSheetProps & { title: string; children: React.ReactNode }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Settings Sheet
export function SettingsSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Stream Settings">
      <View style={styles.row}>
        <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Flip Camera</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </View>
      <View style={styles.row}>
        <Ionicons name="mic-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Microphone</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </View>
      <View style={styles.row}>
        <Ionicons name="videocam-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Video Quality</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </View>
      <Text style={styles.placeholder}>Settings are UI-only placeholders</Text>
    </SheetContainer>
  );
}

// Guests Sheet
export function GuestsSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Guest Requests">
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={styles.emptyTitle}>No guest requests</Text>
        <Text style={styles.emptySubtitle}>Viewers can request to join your stream</Text>
      </View>
      <Text style={styles.placeholder}>Guest management is UI-only</Text>
    </SheetContainer>
  );
}

// Battle Sheet
export function BattleSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Battle Mode">
      <View style={styles.emptyState}>
        <Ionicons name="flash" size={48} color="#F97316" />
        <Text style={styles.emptyTitle}>Start a Battle</Text>
        <Text style={styles.emptySubtitle}>Challenge another host to a gift battle</Text>
      </View>
      <Pressable style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Find Opponent</Text>
      </Pressable>
      <Text style={styles.placeholder}>Battle mode is UI-only</Text>
    </SheetContainer>
  );
}

// CoHost Sheet
export function CoHostSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Invite Co-Host">
      <View style={styles.emptyState}>
        <Ionicons name="person-add" size={48} color="#A855F7" />
        <Text style={styles.emptyTitle}>Invite a Co-Host</Text>
        <Text style={styles.emptySubtitle}>Stream together with another creator</Text>
      </View>
      <Pressable style={[styles.actionButton, { backgroundColor: '#A855F7' }]}>
        <Text style={styles.actionButtonText}>Browse Hosts</Text>
      </Pressable>
      <Text style={styles.placeholder}>Co-host invites are UI-only</Text>
    </SheetContainer>
  );
}

// Filters Sheet
export function FiltersSheet({
  visible,
  onClose,
  filters = DEFAULT_HOST_LIVE_OPTIONS,
  onChange,
}: BaseSheetProps & {
  filters?: HostLiveOptions;
  onChange?: (next: HostLiveOptions) => void;
}) {
  const fontSizeLabel = useMemo(() => {
    switch (filters.chatFontSize) {
      case 'small':
        return 'Small';
      case 'large':
        return 'Large';
      default:
        return 'Medium';
    }
  }, [filters.chatFontSize]);

  const cycleChatFontSize = () => {
    const next =
      filters.chatFontSize === 'small'
        ? 'medium'
        : filters.chatFontSize === 'medium'
          ? 'large'
          : 'small';
    onChange?.({ ...filters, chatFontSize: next });
  };

  const cycleChatFontColor = () => {
    const idx = CHAT_FONT_COLORS.indexOf(filters.chatFontColor as any);
    const safeIdx = idx >= 0 ? idx : 0;
    const next = CHAT_FONT_COLORS[(safeIdx + 1) % CHAT_FONT_COLORS.length];
    onChange?.({ ...filters, chatFontColor: next });
  };

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Filters">
      {/* Chat visibility */}
      <View style={styles.row}>
        <Ionicons name="chatbubbles-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Chat overlay</Text>
        <Switch
          value={filters.chatVisible}
          onValueChange={(v) => onChange?.({ ...filters, chatVisible: v })}
        />
      </View>

      {/* Chat font size (tap row to cycle) */}
      <Pressable style={styles.row} onPress={cycleChatFontSize}>
        <Ionicons name="text-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Chat font size</Text>
        <View style={styles.valuePill}>
          <Text style={styles.valuePillText}>{fontSizeLabel}</Text>
          <Ionicons name="sync" size={14} color="rgba(255,255,255,0.7)" />
        </View>
      </Pressable>

      {/* Chat font color (tap row to cycle) */}
      <Pressable style={styles.row} onPress={cycleChatFontColor}>
        <Ionicons name="color-palette-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Chat font color</Text>
        <View style={styles.valuePill}>
          <View style={[styles.colorDot, { backgroundColor: filters.chatFontColor }]} />
          <Text style={styles.valuePillText}>{filters.chatFontColor}</Text>
          <Ionicons name="sync" size={14} color="rgba(255,255,255,0.7)" />
        </View>
      </Pressable>

      {/* Show/hide top gifters */}
      <View style={styles.row}>
        <Ionicons name="gift-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Top gifters</Text>
        <Switch
          value={filters.showTopGifters}
          onValueChange={(v) => onChange?.({ ...filters, showTopGifters: v })}
        />
      </View>

      {/* Show/hide viewer count badge */}
      <View style={styles.row}>
        <Ionicons name="eye-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Viewer badge</Text>
        <Switch
          value={filters.showViewerCountBadge}
          onValueChange={(v) => onChange?.({ ...filters, showViewerCountBadge: v })}
        />
      </View>

      {/* Compact mode */}
      <View style={styles.row}>
        <Ionicons name="contract-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Compact mode</Text>
        <Switch
          value={filters.compactMode}
          onValueChange={(v) => onChange?.({ ...filters, compactMode: v })}
        />
      </View>
    </SheetContainer>
  );
}

// Share Sheet
export function ShareSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Share Stream">
      <View style={styles.shareRow}>
        <Pressable style={styles.shareOption}>
          <View style={[styles.shareIcon, { backgroundColor: '#1DA1F2' }]}>
            <Ionicons name="logo-twitter" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.shareLabel}>Twitter</Text>
        </Pressable>
        <Pressable style={styles.shareOption}>
          <View style={[styles.shareIcon, { backgroundColor: '#4267B2' }]}>
            <Ionicons name="logo-facebook" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.shareLabel}>Facebook</Text>
        </Pressable>
        <Pressable style={styles.shareOption}>
          <View style={[styles.shareIcon, { backgroundColor: '#25D366' }]}>
            <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.shareLabel}>WhatsApp</Text>
        </Pressable>
        <Pressable style={styles.shareOption}>
          <View style={[styles.shareIcon, { backgroundColor: '#6366F1' }]}>
            <Ionicons name="link" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.shareLabel}>Copy Link</Text>
        </Pressable>
      </View>
      <Text style={styles.placeholder}>Share is UI-only</Text>
    </SheetContainer>
  );
}

// Viewers Sheet
export function ViewersSheet({ visible, onClose, viewerCount }: BaseSheetProps & { viewerCount: number }) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title={`${viewerCount} Watching`}>
      <View style={styles.emptyState}>
        <Ionicons name="eye-outline" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={styles.emptyTitle}>Viewer list</Text>
        <Text style={styles.emptySubtitle}>See who's watching your stream</Text>
      </View>
      <Text style={styles.placeholder}>Viewer list is UI-only</Text>
    </SheetContainer>
  );
}

// Gifters Sheet
export function GiftersSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Top Gifters">
      <View style={styles.emptyState}>
        <Ionicons name="gift" size={48} color="#FFD700" />
        <Text style={styles.emptyTitle}>Stream Gifters</Text>
        <Text style={styles.emptySubtitle}>See who's sent the most gifts</Text>
      </View>
      <Text style={styles.placeholder}>Gifter list is UI-only</Text>
    </SheetContainer>
  );
}

// Trending Sheet (flame icon - currently live streams ranked by trending score)
// NOTE: This is different from LeaderboardSheet - shows LIVE streams only, no tabs
interface TrendingEntry {
  stream_id: number;
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  trending_score: number;
  views_count: number;
  likes_count: number;
}

export function TrendingSheet({ visible, onClose }: BaseSheetProps) {
  const [entries, setEntries] = useState<TrendingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;

    const loadTrending = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('rpc_get_trending_live_streams', {
          p_limit: 50,
          p_offset: 0,
        });

        if (error) {
          console.error('[TrendingSheet] Error fetching trending:', error);
          return;
        }

        if (data) {
          setEntries(data);
        }
      } catch (err) {
        console.error('[TrendingSheet] Error loading trending:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, [visible]);

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Trending Now">
      <Text style={styles.trendingSubtitle}>{entries.length} live streams</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flame" size={48} color="#F97316" />
          <Text style={styles.emptyTitle}>No Trending Streams</Text>
          <Text style={styles.emptySubtitle}>No live streams trending right now</Text>
        </View>
      ) : (
        <ScrollView style={styles.trendingScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.trendingList}>
            {entries.map((entry, index) => {
              const rank = index + 1;
              return (
                <View 
                  key={entry.stream_id} 
                  style={[
                    styles.trendingRow,
                    rank <= 3 && styles.trendingRowTop3,
                  ]}
                >
                  {/* Rank */}
                  <Text style={[
                    styles.trendingRank,
                    rank === 1 && styles.trendingRank1,
                    rank === 2 && styles.trendingRank2,
                    rank === 3 && styles.trendingRank3,
                  ]}>
                    {rank}
                  </Text>
                  
                  {/* Avatar */}
                  {entry.avatar_url ? (
                    <Image
                      source={{ uri: entry.avatar_url }}
                      style={[
                        styles.trendingAvatarImage,
                        rank === 1 && styles.trendingAvatar1,
                        rank === 2 && styles.trendingAvatar2,
                        rank === 3 && styles.trendingAvatar3,
                      ]}
                    />
                  ) : (
                    <View style={[
                      styles.trendingAvatar,
                      rank === 1 && styles.trendingAvatar1,
                      rank === 2 && styles.trendingAvatar2,
                      rank === 3 && styles.trendingAvatar3,
                    ]}>
                      <Ionicons name="person" size={16} color="rgba(255,255,255,0.8)" />
                    </View>
                  )}
                  
                  {/* Username & stats */}
                  <View style={styles.trendingInfo}>
                    <View style={styles.trendingNameRow}>
                      <Text style={styles.trendingUsername} numberOfLines={1}>
                        {entry.display_name || entry.username}
                      </Text>
                      {rank <= 3 && (
                        <Ionicons name="flash" size={12} color="#EAB308" />
                      )}
                    </View>
                    <View style={styles.trendingStats}>
                      <Ionicons name="eye" size={10} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.trendingStat}>{entry.views_count}</Text>
                      <Text style={styles.trendingDot}>•</Text>
                      <Ionicons name="heart" size={10} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.trendingStat}>{entry.likes_count}</Text>
                    </View>
                  </View>
                  
                  {/* Score */}
                  <View style={styles.trendingScore}>
                    <Ionicons name="flame" size={12} color="#F97316" />
                    <Text style={styles.trendingScoreText}>{Math.round(entry.trending_score)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SheetContainer>
  );
}

// Leaderboard Sheet (trophy icon - streamer/gifter leaderboard)
interface LeaderboardEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  metric_value: number;
  rank: number;
}

type LeaderboardType = 'top_streamers' | 'top_gifters';
type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

export function LeaderboardSheet({ visible, onClose }: BaseSheetProps) {
  const [type, setType] = useState<LeaderboardType>('top_streamers');
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;

    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_leaderboard', {
          p_type: type,
          p_period: period,
          p_limit: 50,
          p_room_id: null,
        });

        if (error) {
          console.error('[LeaderboardSheet] Error fetching leaderboard:', error);
          return;
        }

        if (data && Array.isArray(data)) {
          const mappedEntries = data.map((row: any) => ({
            profile_id: row.profile_id,
            username: row.username,
            avatar_url: row.avatar_url,
            metric_value: Number(row.metric_value ?? 0),
            rank: Number(row.rank ?? 0),
          }));
          setEntries(mappedEntries);
        }
      } catch (err) {
        console.error('[LeaderboardSheet] Error loading leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [visible, type, period]);

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Leaderboard">
      {/* Type Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setType('top_streamers')}
          style={[styles.tab, type === 'top_streamers' && styles.tabActive]}
        >
          <Ionicons name="videocam" size={16} color={type === 'top_streamers' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
          <Text style={[styles.tabText, type === 'top_streamers' && styles.tabTextActive]}>Streamers</Text>
        </Pressable>
        <Pressable
          onPress={() => setType('top_gifters')}
          style={[styles.tab, type === 'top_gifters' && styles.tabActive]}
        >
          <Ionicons name="gift" size={16} color={type === 'top_gifters' ? '#FFFFFF' : 'rgba(255,255,255,0.5)'} />
          <Text style={[styles.tabText, type === 'top_gifters' && styles.tabTextActive]}>Gifters</Text>
        </Pressable>
      </View>
      
      {/* Timeframe Tabs */}
      <View style={styles.timeframeTabs}>
        {(['daily', 'weekly', 'monthly', 'alltime'] as const).map((tf) => (
          <Pressable
            key={tf}
            onPress={() => setPeriod(tf)}
            style={[styles.timeframeTab, period === tf && styles.timeframeTabActive]}
          >
            <Text style={[styles.timeframeText, period === tf && styles.timeframeTextActive]}>
              {tf === 'alltime' ? 'All Time' : tf.charAt(0).toUpperCase() + tf.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EAB308" />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy" size={48} color="#EAB308" />
          <Text style={styles.emptyTitle}>No Rankings Yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to earn a spot!</Text>
        </View>
      ) : (
        <ScrollView style={styles.trendingScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.trendingList}>
            {entries.map((entry) => (
              <View 
                key={entry.profile_id} 
                style={[
                  styles.trendingRow,
                  entry.rank <= 3 && styles.trendingRowTop3,
                ]}
              >
                {/* Rank */}
                <Text style={[
                  styles.trendingRank,
                  entry.rank === 1 && styles.trendingRank1,
                  entry.rank === 2 && styles.trendingRank2,
                  entry.rank === 3 && styles.trendingRank3,
                ]}>
                  {entry.rank}
                </Text>
                
                {/* Avatar */}
                {entry.avatar_url ? (
                  <Image
                    source={{ uri: entry.avatar_url }}
                    style={[
                      styles.trendingAvatarImage,
                      entry.rank === 1 && styles.trendingAvatar1,
                      entry.rank === 2 && styles.trendingAvatar2,
                      entry.rank === 3 && styles.trendingAvatar3,
                    ]}
                  />
                ) : (
                  <View style={[
                    styles.trendingAvatar,
                    entry.rank === 1 && styles.trendingAvatar1,
                    entry.rank === 2 && styles.trendingAvatar2,
                    entry.rank === 3 && styles.trendingAvatar3,
                  ]}>
                    <Ionicons name="person" size={16} color="rgba(255,255,255,0.8)" />
                  </View>
                )}
                
                {/* Username & metric */}
                <View style={styles.trendingInfo}>
                  <Text style={styles.trendingUsername} numberOfLines={1}>
                    {entry.username}
                  </Text>
                  <View style={styles.trendingStats}>
                    <Ionicons 
                      name={type === 'top_streamers' ? 'diamond' : 'gift'} 
                      size={10} 
                      color="rgba(255,255,255,0.6)" 
                    />
                    <Text style={styles.trendingStat}>
                      {entry.metric_value.toLocaleString()}
                    </Text>
                  </View>
                </View>
                
                {/* Trophy for top 3 */}
                {entry.rank <= 3 && (
                  <Ionicons 
                    name="trophy" 
                    size={16} 
                    color={entry.rank === 1 ? '#EAB308' : entry.rank === 2 ? '#9CA3AF' : '#F97316'} 
                  />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SheetContainer>
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
  sheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  slider: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  valuePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 16,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  shareOption: {
    alignItems: 'center',
    gap: 8,
  },
  shareIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  timeframeTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  timeframeTabActive: {
    backgroundColor: 'rgba(99,102,241,0.3)',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  timeframeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  
  // Trending sheet styles
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  trendingScrollView: {
    maxHeight: 350,
  },
  trendingList: {
    gap: 8,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  trendingRowTop3: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  trendingRank: {
    width: 24,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  trendingRank1: {
    fontSize: 18,
    color: '#EAB308',
  },
  trendingRank2: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  trendingRank3: {
    fontSize: 15,
    color: '#F97316',
  },
  trendingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  trendingAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  trendingAvatar1: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: '#A855F7',
  },
  trendingAvatar2: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderColor: '#EC4899',
  },
  trendingAvatar3: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderColor: '#F97316',
  },
  trendingInfo: {
    flex: 1,
  },
  trendingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trendingStat: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  trendingDot: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
  },
  trendingScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendingScoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
  },
});
