import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { DEFAULT_HOST_CAMERA_FILTERS, type HostCameraFilters } from '../../../lib/hostCameraFilters';
import { DEFAULT_HOST_LIVE_OPTIONS, type ChatSize, type HostLiveOptions } from '../../../lib/hostLiveOptions';

interface BaseSheetProps {
  visible: boolean;
  onClose: () => void;
}

function SheetContainer({ visible, onClose, title, children }: BaseSheetProps & { title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
export function SettingsSheet({
  visible,
  onClose,
  options = DEFAULT_HOST_LIVE_OPTIONS,
  onOptionsChange,
  micMuted = false,
  onSetMicMuted,
  cameraDisabled = false,
  onSetCameraDisabled,
  onFlipCamera,
}: BaseSheetProps & {
  options?: HostLiveOptions;
  onOptionsChange?: (next: HostLiveOptions) => void;
  micMuted?: boolean;
  onSetMicMuted?: (next: boolean) => void;
  cameraDisabled?: boolean;
  onSetCameraDisabled?: (next: boolean) => void;
  onFlipCamera?: () => void;
}) {
  const [newMutedWord, setNewMutedWord] = useState('');
  const [newModerator, setNewModerator] = useState('');

  const updateOptions = (patch: Partial<HostLiveOptions>) => {
    onOptionsChange?.({ ...options, ...patch });
  };

  const cycleChatSize = () => {
    const next: ChatSize = options.chatSize === 'small' ? 'medium' : options.chatSize === 'medium' ? 'large' : 'small';
    updateOptions({ chatSize: next });
  };

  const addMutedWord = () => {
    const w = newMutedWord.trim();
    if (!w) return;
    const next = Array.from(new Set([...(options.mutedWords || []), w]));
    updateOptions({ mutedWords: next });
    setNewMutedWord('');
  };

  const removeMutedWord = (w: string) => {
    updateOptions({ mutedWords: (options.mutedWords || []).filter((x) => x !== w) });
  };

  const addModerator = () => {
    const u = newModerator.trim().replace(/^@+/, '');
    if (!u) return;
    const next = Array.from(new Set([...(options.moderators || []), u]));
    updateOptions({ moderators: next });
    setNewModerator('');
  };

  const removeModerator = (u: string) => {
    updateOptions({ moderators: (options.moderators || []).filter((x) => x !== u) });
  };

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Stream Settings">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* Mute mic */}
        <View style={styles.row}>
          <Ionicons name="mic-outline" size={22} color="#FFFFFF" />
          <Text style={styles.rowText}>Mute mic</Text>
          <Switch value={micMuted} onValueChange={(v) => onSetMicMuted?.(v)} />
        </View>

        {/* Disable cam */}
        <View style={styles.row}>
          <Ionicons name="videocam-outline" size={22} color="#FFFFFF" />
          <Text style={styles.rowText}>Disable cam</Text>
          <Switch value={cameraDisabled} onValueChange={(v) => onSetCameraDisabled?.(v)} />
        </View>

        {/* Switch camera */}
        <Pressable style={styles.row} onPress={onFlipCamera}>
          <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
          <Text style={styles.rowText}>Switch camera</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>

        {/* Mirror camera */}
        <View style={styles.row}>
          <Ionicons name="swap-horizontal-outline" size={22} color="#FFFFFF" />
          <Text style={styles.rowText}>Mirror camera</Text>
          <Switch value={!!options.mirrorCamera} onValueChange={(v) => updateOptions({ mirrorCamera: v })} />
        </View>

        {/* Allow guest requests */}
        <View style={styles.row}>
          <Ionicons name="people-outline" size={22} color="#FFFFFF" />
          <Text style={styles.rowText}>Allow guest requests</Text>
          <Switch value={!!options.allowGuestRequests} onValueChange={(v) => updateOptions({ allowGuestRequests: v })} />
        </View>

        {/* Muted words */}
        <Text style={styles.sectionLabel}>Muted words</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={newMutedWord}
            onChangeText={setNewMutedWord}
            placeholder="Add word"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={addMutedWord}
          />
          <Pressable style={styles.addButton} onPress={addMutedWord}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.chipWrap}>
          {(options.mutedWords || []).map((w) => (
            <Pressable key={w} onPress={() => removeMutedWord(w)} style={styles.chip}>
              <Text style={styles.chipText}>{w}</Text>
              <Ionicons name="close" size={14} color="rgba(255,255,255,0.8)" />
            </Pressable>
          ))}
        </View>

        {/* Moderators */}
        <Text style={styles.sectionLabel}>Moderators</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={newModerator}
            onChangeText={setNewModerator}
            placeholder="Add @username"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={addModerator}
          />
          <Pressable style={styles.addButton} onPress={addModerator}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.chipWrap}>
          {(options.moderators || []).map((u) => (
            <Pressable key={u} onPress={() => removeModerator(u)} style={styles.chip}>
              <Text style={styles.chipText}>@{u}</Text>
              <Ionicons name="close" size={14} color="rgba(255,255,255,0.8)" />
            </Pressable>
          ))}
        </View>

        {/* Merge chat */}
        <View style={[styles.row, { opacity: 0.6 }]}>
          <Ionicons name="git-merge-outline" size={22} color="#FFFFFF" />
          <Text style={styles.rowText}>Merge chat</Text>
          <View style={styles.valuePill}>
            <Text style={styles.valuePillText}>Coming soon</Text>
          </View>
        </View>

        {/* Chat size */}
        <Pressable style={styles.row} onPress={cycleChatSize}>
          <Ionicons name="text-outline" size={22} color="#FFFFFF" />
          <Text style={styles.rowText}>Chat size</Text>
          <View style={styles.valuePill}>
            <Text style={styles.valuePillText}>
              {options.chatSize === 'small' ? 'Small' : options.chatSize === 'large' ? 'Large' : 'Medium'}
            </Text>
            <Ionicons name="sync" size={14} color="rgba(255,255,255,0.7)" />
          </View>
        </Pressable>
      </ScrollView>
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
      <Text style={styles.placeholder}>Coming soon</Text>
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
      <Text style={styles.placeholder}>Coming soon</Text>
    </SheetContainer>
  );
}

// Filters Sheet
export function FiltersSheet({
  visible,
  onClose,
  filters = DEFAULT_HOST_CAMERA_FILTERS,
  onChange,
}: BaseSheetProps & {
  filters?: HostCameraFilters;
  onChange?: (patch: Partial<HostCameraFilters>) => void;
}) {
  const update = (patch: Partial<HostCameraFilters>) => onChange?.(patch);

  const softSkin = (filters.softSkinLevel ?? 0) as 0 | 1 | 2;

  const presets: Array<{
    id: string;
    label: string;
    apply: Partial<HostCameraFilters>;
  }> = [
    { id: 'normal', label: 'Normal', apply: DEFAULT_HOST_CAMERA_FILTERS },
    { id: 'bright', label: 'Bright', apply: { brightness: 1.2, contrast: 1.05, saturation: 1.05 } },
    { id: 'contrast', label: 'High Contrast', apply: { brightness: 1.0, contrast: 1.25, saturation: 1.0 } },
    { id: 'vibrant', label: 'Vibrant', apply: { brightness: 1.05, contrast: 1.1, saturation: 1.45 } },
    { id: 'muted', label: 'Muted', apply: { brightness: 0.95, contrast: 0.95, saturation: 0.75 } },
    { id: 'warm', label: 'Warm Pop', apply: { brightness: 1.05, contrast: 1.1, saturation: 1.25 } },
  ];

  const isActive = (p: Partial<HostCameraFilters>) => {
    // Only compare the Phase 1 params we actually apply to the stream today (BCS)
    return (
      typeof p.brightness === 'number' &&
      typeof p.contrast === 'number' &&
      typeof p.saturation === 'number' &&
      Math.abs(filters.brightness - p.brightness) < 0.001 &&
      Math.abs(filters.contrast - p.contrast) < 0.001 &&
      Math.abs(filters.saturation - p.saturation) < 0.001
    );
  };

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Video Filters">
      <Text style={styles.sectionLabel}>Presets</Text>
      <View style={styles.presetWrap}>
        {presets.map((p) => {
          const active = isActive(p.apply);
          return (
            <Pressable
              key={p.id}
              onPress={() => update(p.apply)}
              style={({ pressed }) => [
                styles.presetPill,
                active && styles.presetPillActive,
                pressed && styles.presetPillPressed,
              ]}
            >
              <Text style={[styles.presetPillText, active && styles.presetPillTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Current</Text>
      <View style={styles.currentRow}>
        <Text style={styles.currentText}>
          B {filters.brightness.toFixed(2)} • C {filters.contrast.toFixed(2)} • S {filters.saturation.toFixed(2)} • SS{' '}
          {(filters.softSkinLevel ?? 0).toFixed(0)}
        </Text>
        <Pressable onPress={() => update(DEFAULT_HOST_CAMERA_FILTERS)} style={styles.resetButton}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Soft Skin</Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Ionicons name="sparkles-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Soft Skin</Text>
        <View style={styles.segmented}>
          <Pressable
            onPress={() => update({ softSkinLevel: 0 })}
            style={({ pressed }) => [
              styles.segment,
              softSkin === 0 && styles.segmentActive,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.segmentText, softSkin === 0 && styles.segmentTextActive]}>Off</Text>
          </Pressable>
          <Pressable
            onPress={() => update({ softSkinLevel: 1 })}
            style={({ pressed }) => [
              styles.segment,
              softSkin === 1 && styles.segmentActive,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.segmentText, softSkin === 1 && styles.segmentTextActive]}>Low</Text>
          </Pressable>
          <Pressable
            onPress={() => update({ softSkinLevel: 2 })}
            style={({ pressed }) => [
              styles.segment,
              softSkin === 2 && styles.segmentActive,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.segmentText, softSkin === 2 && styles.segmentTextActive]}>Medium</Text>
          </Pressable>
        </View>
      </View>
    </SheetContainer>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function quantize(n: number, step: number) {
  if (!step || step <= 0) return n;
  return Math.round(n / step) * step;
}

function MiniSlider({
  value,
  min,
  max,
  step,
  onValueChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (next: number) => void;
}) {
  const trackW = useRef(100);

  const setFromX = (x: number) => {
    const w = trackW.current || 100;
    const pct = clamp(x / w, 0, 1);
    const raw = min + pct * (max - min);
    onValueChange(clamp(quantize(raw, step), min, max));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        setFromX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        setFromX(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const pct = clamp((value - min) / (max - min), 0, 1);

  return (
    <View
      style={styles.sliderHit}
      onLayout={(e) => {
        trackW.current = e.nativeEvent.layout.width || 100;
      }}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      {...panResponder.panHandlers}
    >
      <View style={styles.slider}>
        <View style={[styles.sliderFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
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
    </SheetContainer>
  );
}

// Viewers Sheet
interface ViewerEntry {
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  joined_at: string;
  is_active?: boolean;
}

export function ViewersSheet({ 
  visible, 
  onClose, 
  viewerCount,
  liveStreamId,
}: BaseSheetProps & { viewerCount: number; liveStreamId?: number }) {
  const [viewers, setViewers] = useState<ViewerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com';
  const activeViewers = viewers.filter(viewer => viewer.is_active);
  const inactiveViewers = viewers.filter(viewer => !viewer.is_active);
  const titleCount = viewers.length > 0 ? viewers.length : viewerCount;

  useEffect(() => {
    if (!visible || !liveStreamId) return;

    const loadViewers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/active-viewers/list?live_stream_id=${liveStreamId}`);
        if (!res.ok) {
          console.error('[ViewersSheet] list fetch failed:', res.status);
          setViewers([]);
          return;
        }
        const data = await res.json();
        if (!data || !Array.isArray(data.viewers)) {
          setViewers([]);
          return;
        }

        const mapped = (data.viewers as any[]).map((viewer) => ({
          profile_id: viewer.profile_id,
          username: viewer.username || 'Unknown',
          display_name: viewer.username || 'Unknown',
          avatar_url: viewer.avatar_url,
          joined_at: viewer.last_seen,
          is_active: Boolean(viewer.is_active),
        }));
        setViewers(mapped);
      } catch (err) {
        console.error('[ViewersSheet] Error loading viewers:', err);
        setViewers([]);
      } finally {
        setLoading(false);
      }
    };

    loadViewers();
  }, [visible, liveStreamId]);

  return (
    <SheetContainer visible={visible} onClose={onClose} title={`${titleCount} Watching`}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : viewers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="eye-outline" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>No viewers yet</Text>
          <Text style={styles.emptySubtitle}>Viewers will appear here when they join</Text>
        </View>
      ) : (
        <ScrollView style={styles.trendingScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.trendingList}>
            {activeViewers.length > 0 && (
              <View style={styles.viewerSection}>
                <Text style={styles.viewerSectionTitle}>
                  Active ({activeViewers.length})
                </Text>
                {activeViewers.map((viewer) => (
                  <View key={viewer.profile_id} style={styles.trendingRow}>
                    {viewer.avatar_url ? (
                      <Image
                        source={{ uri: viewer.avatar_url }}
                        style={styles.trendingAvatarImage}
                      />
                    ) : (
                      <View style={styles.trendingAvatar}>
                        <Ionicons name="person" size={16} color="rgba(255,255,255,0.8)" />
                      </View>
                    )}
                    <View style={styles.trendingInfo}>
                      <Text style={styles.trendingUsername} numberOfLines={1}>
                        {viewer.display_name || viewer.username}
                      </Text>
                      <Text style={styles.trendingStat}>@{viewer.username}</Text>
                    </View>
                    <View style={styles.viewerStatus}>
                      <View style={styles.viewerActiveDot} />
                      <Text style={styles.viewerStatusText}>Watching</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {inactiveViewers.length > 0 && (
              <View style={styles.viewerSection}>
                <Text style={styles.viewerSectionTitle}>
                  Left ({inactiveViewers.length})
                </Text>
                {inactiveViewers.map((viewer) => (
                  <View key={viewer.profile_id} style={[styles.trendingRow, styles.viewerRowInactive]}>
                    {viewer.avatar_url ? (
                      <Image
                        source={{ uri: viewer.avatar_url }}
                        style={styles.trendingAvatarImage}
                      />
                    ) : (
                      <View style={styles.trendingAvatar}>
                        <Ionicons name="person" size={16} color="rgba(255,255,255,0.8)" />
                      </View>
                    )}
                    <View style={styles.trendingInfo}>
                      <Text style={styles.trendingUsername} numberOfLines={1}>
                        {viewer.display_name || viewer.username}
                      </Text>
                      <Text style={styles.trendingStat}>@{viewer.username}</Text>
                    </View>
                    <View style={styles.viewerStatus}>
                      <View style={styles.viewerInactiveDot} />
                      <Text style={styles.viewerStatusText}>Left</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SheetContainer>
  );
}

// Gifters Sheet
interface GifterEntry {
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  total_coins: number;
}

export function GiftersSheet({ 
  visible, 
  onClose,
  liveStreamId,
}: BaseSheetProps & { liveStreamId?: number }) {
  const [gifters, setGifters] = useState<GifterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !liveStreamId) return;

    const loadGifters = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_stream_top_gifters', {
          p_live_stream_id: liveStreamId,
          p_limit: 50,
        });

        if (error) {
          console.error('[GiftersSheet] Error fetching gifters:', error);
          return;
        }

        const mapped = (data || []).map((row: any) => ({
          profile_id: row.profile_id,
          username: row.username || 'Unknown',
          display_name: row.display_name,
          avatar_url: row.avatar_url,
          total_coins: row.total_coins ?? 0,
        }));
        setGifters(mapped);
      } catch (err) {
        console.error('[GiftersSheet] Error loading gifters:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGifters();
  }, [visible, liveStreamId]);

  return (
    <SheetContainer visible={visible} onClose={onClose} title="Top Gifters">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : gifters.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="gift" size={48} color="#FFD700" />
          <Text style={styles.emptyTitle}>No gifts yet</Text>
          <Text style={styles.emptySubtitle}>Gifters will appear here when they send gifts</Text>
        </View>
      ) : (
        <ScrollView style={styles.trendingScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.trendingList}>
            {gifters.map((gifter, index) => {
              const rank = index + 1;
              return (
                <View 
                  key={gifter.profile_id} 
                  style={[
                    styles.trendingRow,
                    rank <= 3 && styles.trendingRowTop3,
                  ]}
                >
                  <Text style={[
                    styles.trendingRank,
                    rank === 1 && styles.trendingRank1,
                    rank === 2 && styles.trendingRank2,
                    rank === 3 && styles.trendingRank3,
                  ]}>
                    {rank}
                  </Text>
                  {gifter.avatar_url ? (
                    <Image
                      source={{ uri: gifter.avatar_url }}
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
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingUsername} numberOfLines={1}>
                      {gifter.display_name || gifter.username}
                    </Text>
                    <View style={styles.trendingStats}>
                      <Ionicons name="gift" size={10} color="#FFD700" />
                      <Text style={styles.trendingStat}>
                        {gifter.total_coins.toLocaleString()} coins
                      </Text>
                    </View>
                  </View>
                  {rank <= 3 && (
                    <Ionicons 
                      name="trophy" 
                      size={16} 
                      color={rank === 1 ? '#EAB308' : rank === 2 ? '#9CA3AF' : '#F97316'} 
                    />
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
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
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  presetPillActive: {
    backgroundColor: 'rgba(99,102,241,0.35)',
    borderColor: 'rgba(99,102,241,0.65)',
  },
  presetPillPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  presetPillText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  presetPillTextActive: {
    color: '#FFFFFF',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  currentText: {
    flex: 1,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  resetText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: 'rgba(99,102,241,0.45)',
  },
  segmentPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  segmentText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
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
    overflow: 'hidden',
  },
  sliderHit: {
    width: 100,
    height: 24,
    justifyContent: 'center',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.85)',
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
  sectionLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#FFFFFF',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99,102,241,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipText: {
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
  viewerSection: {
    gap: 8,
  },
  viewerSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  viewerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerStatusText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  viewerActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A855F7',
  },
  viewerInactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  viewerRowInactive: {
    opacity: 0.7,
  },
});
