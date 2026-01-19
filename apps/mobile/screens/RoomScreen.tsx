import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, useWindowDimensions, Pressable, Modal, TouchableOpacity, Alert, Platform, StatusBar as RNStatusBar, Animated, PanResponder, Dimensions, ScrollView, TextInput, NativeModules, Image, StyleProp, ViewStyle } from 'react-native';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, Track, RemoteTrack } from 'livekit-client';
import { VideoView } from '@livekit/react-native';
import { supabase } from '../lib/supabase';
import { fetchMobileToken, connectAndPublish, disconnectAndCleanup, startLiveStreamRecord, endLiveStreamRecord } from '../lib/livekit';
import { useAuth } from '../state/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { LocalVideoTrack, LocalAudioTrack } from 'livekit-client';
import { ChatContent, StatsContent, LeaderboardContent, OptionsContent, GiftContent } from '../components/RoomModalContents';

// ============================================================================
// TYPES
// ============================================================================

type RoomScreenParams = {
  slug?: string;
  roomKey?: string;
};

type RoomScreenRouteProp = RouteProp<{ RoomScreen: RoomScreenParams }, 'RoomScreen'>;

interface RoomConfig {
  id: string;
  room_key: string;
  slug: string;
  name: string;
  description: string | null;
  room_type: string;
  visibility: string;
  status: string;
  grid_size: number;
  permissions: {
    can_view: boolean;
    can_publish: boolean;
    can_moderate: boolean;
  };
}

interface Participant {
  id: string;
  identity: string;
  videoTrack: RemoteTrack | LocalVideoTrack | null;
}

interface GridConfig {
  rows: number;
  cols: number;
}

// Drawer panel types
type DrawerPanel = 'none' | 'chat' | 'gifts' | 'leaderboard' | 'stats' | 'options';

// Mini profile modal state
interface MiniProfileData {
  participantId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  isLocal: boolean;
  slotIndex: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

// Replace streamer modal state
interface ActiveStreamer {
  identity: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
}

interface ReplaceStreamerModalProps {
  visible: boolean;
  targetUsername: string;
  targetSlotIndex: number;
  targetParticipantId: string;
  activeStreamers: ActiveStreamer[];
  currentUserIsLive: boolean;
  onClose: () => void;
  onReplaceAndGoLive: () => void;
  onReplaceWithStreamer: (streamer: ActiveStreamer) => void;
  bottomInset: number;
}

// Volume map for per-participant volume control
interface VolumeMap {
  [identity: string]: number; // 0-100
}

// ============================================================================
// MINI PROFILE MODAL COMPONENT
// ============================================================================

interface MiniProfileModalProps {
  visible: boolean;
  profileData: MiniProfileData | null;
  onClose: () => void;
  onFollow: () => void;
  onViewProfile: () => void;
  onMessage: () => void;
  onReport: () => void;
  onBlock: () => void;
  onReplace: () => void;
  bottomInset: number;
}

function ReplaceStreamerModal({
  visible,
  targetUsername,
  targetSlotIndex,
  targetParticipantId,
  activeStreamers,
  currentUserIsLive,
  onClose,
  onReplaceAndGoLive,
  onReplaceWithStreamer,
  bottomInset,
}: ReplaceStreamerModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.replaceModalOverlay} onPress={onClose}>
        <Pressable 
          style={[styles.replaceModalContainer, { paddingBottom: Math.max(bottomInset, 16) }]} 
          onPress={e => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.replaceModalHeader}>
            <Text style={styles.replaceModalTitle}>Switch Participant</Text>
            <Text style={styles.replaceModalSubtitle}>
              Replace {targetUsername} in your grid view
            </Text>
          </View>

          {/* Options */}
          <View style={styles.replaceModalOptions}>
            {/* Show "Replace & Go Live" only if user is NOT already live */}
            {!currentUserIsLive && (
              <>
                <TouchableOpacity 
                  style={styles.replaceOptionButton}
                  onPress={onReplaceAndGoLive}
                >
                  <Ionicons name="videocam" size={24} color="#4a90d9" />
                  <View style={styles.replaceOptionText}>
                    <Text style={styles.replaceOptionTitle}>Replace & Go Live</Text>
                    <Text style={styles.replaceOptionSubtitle}>Start your camera and take this slot</Text>
                  </View>
                </TouchableOpacity>

                {/* Divider if there are also streamers to show */}
                {activeStreamers.length > 0 && (
                  <View style={styles.replaceModalDivider} />
                )}
              </>
            )}

            {/* Active Streamers List - always show if there are any */}
            {activeStreamers.length > 0 ? (
              <>
                <Text style={styles.replaceModalSectionTitle}>
                  {currentUserIsLive ? 'Available Streamers:' : 'Switch with Another Streamer:'}
                </Text>
                <ScrollView style={styles.replaceStreamerList} showsVerticalScrollIndicator={false}>
                  {activeStreamers.map((streamer) => (
                    <TouchableOpacity
                      key={streamer.identity}
                      style={styles.replaceStreamerItem}
                      onPress={() => onReplaceWithStreamer(streamer)}
                    >
                      {streamer.avatarUrl ? (
                        <Image 
                          source={{ uri: streamer.avatarUrl }} 
                          style={styles.replaceStreamerAvatar}
                        />
                      ) : (
                        <View style={[styles.replaceStreamerAvatar, styles.replaceStreamerAvatarPlaceholder]}>
                          <Ionicons name="person" size={20} color="#666" />
                        </View>
                      )}
                      <View style={styles.replaceStreamerInfo}>
                        <Text style={styles.replaceStreamerName}>{streamer.username}</Text>
                        <View style={styles.replaceStreamerLiveIndicator}>
                          <View style={styles.replaceStreamerLiveDot} />
                          <Text style={styles.replaceStreamerLiveText}>Live</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              !currentUserIsLive && (
                <View style={styles.replaceModalEmpty}>
                  <Ionicons name="videocam-off" size={48} color="#666" />
                  <Text style={styles.replaceModalEmptyText}>No other active streamers</Text>
                </View>
              )
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.replaceModalCloseButton}
            onPress={onClose}
          >
            <Text style={styles.replaceModalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MiniProfileModal({
  visible,
  profileData,
  onClose,
  onFollow,
  onViewProfile,
  onMessage,
  onReport,
  onBlock,
  onReplace,
  bottomInset,
}: MiniProfileModalProps) {
  if (!visible || !profileData) return null;

  const displayName = profileData.isLocal ? 'You' : profileData.username;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.miniProfileOverlay} onPress={onClose}>
        <Pressable 
          style={[styles.miniProfileContainer, { paddingBottom: Math.max(bottomInset, 16) }]} 
          onPress={e => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.miniProfileHeader}>
            <View style={styles.miniProfileAvatar}>
              {profileData.avatarUrl ? (
                <Image 
                  source={{ uri: profileData.avatarUrl }} 
                  style={{ width: 60, height: 60, borderRadius: 30 }}
                />
              ) : (
                <Ionicons name="person-circle" size={60} color="#4a90d9" />
              )}
            </View>
            <View style={styles.miniProfileInfo}>
              <Text style={styles.miniProfileName}>{displayName}</Text>
              <Text style={styles.miniProfileSlot}>Slot {profileData.slotIndex + 1}</Text>
              
              {/* Stats */}
              <View style={styles.miniProfileStats}>
                <View style={styles.miniProfileStat}>
                  <Text style={styles.miniProfileStatNumber}>{profileData.followerCount}</Text>
                  <Text style={styles.miniProfileStatLabel}>Followers</Text>
                </View>
                <View style={styles.miniProfileStat}>
                  <Text style={styles.miniProfileStatNumber}>{profileData.followingCount}</Text>
                  <Text style={styles.miniProfileStatLabel}>Following</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          {!profileData.isLocal && (
            <View style={styles.miniProfileActions}>
              {/* Follow Button */}
              <TouchableOpacity 
                style={[styles.miniProfileButton, profileData.isFollowing ? styles.miniProfileButtonSecondary : styles.miniProfileButtonPrimary]}
                onPress={onFollow}
              >
                <Ionicons name={profileData.isFollowing ? "checkmark-circle" : "person-add"} size={20} color="#fff" />
                <Text style={styles.miniProfileButtonText}>
                  {profileData.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

              {/* View Profile */}
              <TouchableOpacity 
                style={styles.miniProfileButton}
                onPress={onViewProfile}
              >
                <Ionicons name="person" size={20} color="#fff" />
                <Text style={styles.miniProfileButtonText}>View Profile</Text>
              </TouchableOpacity>

              {/* Message */}
              <TouchableOpacity 
                style={styles.miniProfileButton}
                onPress={onMessage}
              >
                <Ionicons name="chatbubble" size={20} color="#fff" />
                <Text style={styles.miniProfileButtonText}>Message</Text>
              </TouchableOpacity>

              {/* Replace */}
              <TouchableOpacity 
                style={styles.miniProfileButton}
                onPress={onReplace}
              >
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
                <Text style={styles.miniProfileButtonText}>Replace</Text>
              </TouchableOpacity>

              {/* Report */}
              <TouchableOpacity 
                style={[styles.miniProfileButton, styles.miniProfileButtonDanger]}
                onPress={onReport}
              >
                <Ionicons name="flag" size={20} color="#ff6b6b" />
                <Text style={[styles.miniProfileButtonText, { color: '#ff6b6b' }]}>Report</Text>
              </TouchableOpacity>

              {/* Block */}
              <TouchableOpacity 
                style={[styles.miniProfileButton, styles.miniProfileButtonDanger]}
                onPress={onBlock}
              >
                <Ionicons name="ban" size={20} color="#ff6b6b" />
                <Text style={[styles.miniProfileButtonText, { color: '#ff6b6b' }]}>Block</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.miniProfileCloseButton}
            onPress={onClose}
          >
            <Text style={styles.miniProfileCloseText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// CONTROL BAR COMPONENT (P1)
// ============================================================================

interface ControlBarProps {
  isLandscape: boolean;
  onExitPress: () => void;
  onChatPress: () => void;
  onGiftsPress: () => void;
  onLeaderboardPress: () => void;
  onStatsPress: () => void;
  onOptionsPress: () => void;
  bottomInset: number;
  rightInset: number;
}

function ControlBar({ 
  isLandscape, 
  onExitPress, 
  onChatPress, 
  onGiftsPress, 
  onLeaderboardPress, 
  onStatsPress, 
  onOptionsPress,
  bottomInset,
  rightInset 
}: ControlBarProps) {
  const buttons = [
    { icon: 'arrow-back', label: 'Exit', onPress: onExitPress, active: false },
    { icon: 'chatbubble-ellipses', label: 'Chat', onPress: onChatPress },
    { icon: 'gift', label: 'Gifts', onPress: onGiftsPress },
    { icon: 'trophy', label: 'Board', onPress: onLeaderboardPress },
    { icon: 'stats-chart', label: 'Stats', onPress: onStatsPress },
    { icon: 'settings', label: 'Options', onPress: onOptionsPress },
  ];

  return (
    <View style={[
      styles.controlBar, 
      isLandscape ? styles.controlBarLandscape : styles.controlBarPortrait,
      { 
        paddingBottom: isLandscape ? 0 : Math.max(bottomInset, 8),
        paddingRight: isLandscape ? rightInset : 0
      }
    ]}>
      {buttons.map((btn, idx) => (
        <TouchableOpacity 
          key={idx} 
          style={[
            styles.controlButton, 
            isLandscape && styles.controlButtonLandscape,
            btn.active && styles.controlButtonActive
          ]}
          onPress={btn.onPress}
        >
          <Ionicons 
            name={btn.icon as any} 
            size={22} 
            color={btn.active ? '#4a90d9' : '#fff'} 
          />
          <Text style={[
            styles.controlButtonText, 
            isLandscape && styles.controlButtonTextLandscape,
            btn.active && styles.controlButtonTextActive
          ]}>
            {btn.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// BOTTOM DRAWER COMPONENT (P1)
// ============================================================================

interface BottomDrawerProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  bottomInset: number;
  isLandscape: boolean;
  scrollable?: boolean;
  hideHeader?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

function BottomDrawer({ visible, title, onClose, children, bottomInset, isLandscape, scrollable = true, hideHeader = false, contentStyle, containerStyle }: BottomDrawerProps) {
  const slideAnim = useRef(new Animated.Value(isLandscape ? 400 : 0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: isLandscape ? 400 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isLandscape, slideAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={styles.drawerOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          style={[
            isLandscape ? styles.drawerContainerLandscape : styles.drawerContainer,
            containerStyle,
            {
              paddingBottom: isLandscape ? 0 : Math.max(bottomInset, 16),
              transform: isLandscape 
                ? [{ translateX: slideAnim }]
                : [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.drawerBody}>
            {!hideHeader && (
              <View style={[
                styles.drawerHeader,
                isLandscape && styles.drawerHeaderLandscape
              ]}>
                <Text style={[
                  styles.drawerTitle,
                  isLandscape && styles.drawerTitleLandscape
                ]}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={isLandscape ? 28 : 24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {scrollable ? (
              <ScrollView 
                style={[
                  styles.drawerContent,
                  isLandscape && styles.drawerContentLandscape,
                  contentStyle
                ]} 
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.drawerContent,
                  styles.drawerContentFixed,
                  isLandscape && styles.drawerContentLandscape,
                  contentStyle
                ]}
              >
                {children}
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}


// ============================================================================
// TILE ACTION SHEET COMPONENT (P2)
// ============================================================================

interface TileActionSheetProps {
  visible: boolean;
  participant: Participant | null;
  slotIndex: number;
  isLocal: boolean;
  isMuted: boolean;
  volume: number;
  canModerate: boolean;
  onClose: () => void;
  onMuteToggle: () => void;
  onVolumeChange: (value: number) => void;
  onReplace: () => void;
  onKick: () => void;
  onViewProfile: () => void;
  bottomInset: number;
}

function TileActionSheet({
  visible,
  participant,
  slotIndex,
  isLocal,
  isMuted,
  volume,
  canModerate,
  onClose,
  onMuteToggle,
  onVolumeChange,
  onReplace,
  onKick,
  onViewProfile,
  bottomInset,
}: TileActionSheetProps) {
  if (!visible) return null;

  const displayName = isLocal ? 'You' : (participant?.identity?.replace(/^u_/, '').split(':')[0] || 'Unknown');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <Pressable style={[styles.actionSheetContainer, { paddingBottom: Math.max(bottomInset, 16) }]} onPress={e => e.stopPropagation()}>
          <View style={styles.actionSheetHeader}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle}>{displayName}</Text>
            <Text style={styles.actionSheetSubtitle}>Slot {slotIndex + 1}</Text>
          </View>

          {/* Mute toggle */}
          {!isLocal && (
            <TouchableOpacity style={styles.actionSheetRow} onPress={onMuteToggle}>
              <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
              <Text style={styles.actionSheetRowText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
          )}

          {/* Volume slider */}
          {!isLocal && (
            <View style={styles.actionSheetVolumeRow}>
              <Ionicons name="volume-low" size={18} color="#888" />
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={100}
                value={volume}
                onValueChange={onVolumeChange}
                minimumTrackTintColor="#4a90d9"
                maximumTrackTintColor="#444"
                thumbTintColor="#fff"
              />
              <Ionicons name="volume-high" size={18} color="#888" />
            </View>
          )}

          {/* Replace */}
          <TouchableOpacity style={styles.actionSheetRow} onPress={onReplace}>
            <Ionicons name="swap-horizontal" size={22} color="#fff" />
            <Text style={styles.actionSheetRowText}>Replace</Text>
          </TouchableOpacity>

          {/* Kick (moderator only) */}
          {canModerate && !isLocal && (
            <TouchableOpacity style={styles.actionSheetRow} onPress={onKick}>
              <Ionicons name="remove-circle" size={22} color="#ff6b6b" />
              <Text style={[styles.actionSheetRowText, { color: '#ff6b6b' }]}>Kick</Text>
            </TouchableOpacity>
          )}

          {/* View Profile */}
          {!isLocal && (
            <TouchableOpacity style={styles.actionSheetRow} onPress={onViewProfile}>
              <Ionicons name="person" size={22} color="#fff" />
              <Text style={styles.actionSheetRowText}>View Profile</Text>
            </TouchableOpacity>
          )}

          {/* Close */}
          <TouchableOpacity style={[styles.actionSheetRow, styles.actionSheetCloseRow]} onPress={onClose}>
            <Text style={styles.actionSheetCloseText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// GRID LAYOUT CALCULATOR
// ============================================================================

function getGridConfig(isLandscape: boolean): GridConfig {
  // Fixed 12-slot grid: 4x3 portrait, 3x4 landscape
  return isLandscape ? { rows: 3, cols: 4 } : { rows: 4, cols: 3 };
}

// ============================================================================
// VIDEO TILE COMPONENT
// ============================================================================

interface VideoTileProps {
  participant: Participant | null;
  localVideoTrack?: LocalVideoTrack | null;
  isLocalTile?: boolean | undefined;
  width: number;
  height: number;
  slotIndex: number;
  onTilePress: (slotIndex: number, participant: Participant | null) => void;
  // 🎛️ Volume control props
  volumeMap: VolumeMap;
  mutedParticipants: Set<string>;
  activeVolumeSliderTileId: string | null;
  onDoubleTap: (participantId: string) => void;
  onSpeakerIconPress: (participantId: string, event: any) => void;
  onVolumeChange: (participantId: string, volume: number) => void;
  // 📺 Fullscreen props
  onToggleFullscreen: (tileId: string, participant: Participant | null, isLocal: boolean) => void;
  // 👁️ Hide participant
  onHideParticipant: (identity: string) => void;
}

// FIX #2: Memoize VideoTile to prevent re-renders when other tiles change
const VideoTile = React.memo(({ 
  participant, 
  localVideoTrack, 
  isLocalTile, 
  width, 
  height, 
  slotIndex, 
  onTilePress,
  volumeMap,
  mutedParticipants,
  activeVolumeSliderTileId,
  onDoubleTap,
  onSpeakerIconPress,
  onVolumeChange,
  onToggleFullscreen,
  onHideParticipant,
}: VideoTileProps) => {
  const hasVideo = participant?.videoTrack || (isLocalTile && localVideoTrack);
  const videoTrack = participant?.videoTrack || localVideoTrack;
  const participantId = participant?.identity || '';
  const tileId = `tile-${slotIndex}`;
  
  // Volume state for this tile
  const volume = volumeMap[participantId] ?? 100;
  const isMuted = mutedParticipants.has(participantId) || volume === 0;
  const showVolumeSlider = activeVolumeSliderTileId === tileId;
  
  // 📺 Fullscreen double-tap detection (separate from mute double-tap)
  // Priority: speaker icon > slider > fullscreen double-tap
  const lastTapRef = useRef(0);
  const ignoreNextDoubleTapRef = useRef(false);
  
  const handleTilePress = () => {
    // If tapping empty slot, use old behavior
    if (!hasVideo) {
      onTilePress(slotIndex, null);
      return;
    }
    
    // Check if we should ignore (speaker icon was pressed)
    if (ignoreNextDoubleTapRef.current) {
      console.log('[TILE_PRESS] Ignoring - speaker was pressed');
      ignoreNextDoubleTapRef.current = false;
      return;
    }
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    console.log('[TILE_PRESS] tileId:', tileId, 'timeSinceLastTap:', timeSinceLastTap);
    
    if (timeSinceLastTap < 400) {
      // Double tap detected → FULLSCREEN
      console.log('[TILE_DOUBLE_TAP] Triggering fullscreen for tile:', tileId);
      onToggleFullscreen(tileId, participant, isLocalTile || false);
      lastTapRef.current = 0; // Reset
    } else {
      // Single tap → Show mini profile
      lastTapRef.current = now;
      // Delay to allow double-tap to cancel this (must be longer than double-tap window)
      setTimeout(() => {
        if (lastTapRef.current === now) {
          // Still a single tap after delay
          console.log('[TILE_SINGLE_TAP] Show mini profile for:', participantId);
          onTilePress(slotIndex, participant);
        }
      }, 450);
    }
  };
  
  const handleSpeakerPress = (e: any) => {
    // Prevent tile double-tap when tapping speaker
    ignoreNextDoubleTapRef.current = true;
    // Pass participantId as second param for mute/unmute detection
    onSpeakerIconPress(tileId, participantId);
  };
  
  return (
    <View style={[styles.tile, { width, height }]}>
      <Pressable 
        style={StyleSheet.absoluteFillObject}
        onPress={handleTilePress}
      >
        {hasVideo && videoTrack ? (
          <>
            <VideoView
              style={styles.videoView}
              videoTrack={videoTrack as any}
              objectFit="cover"
              mirror={isLocalTile}
            />
            
            {/* Local indicator */}
            {isLocalTile && (
              <View style={styles.localIndicator}>
                <Text style={styles.localIndicatorText}>YOU</Text>
              </View>
            )}
            
            {/* ❌ CLOSE ICON (stop your own stream) - LOCAL TILE ONLY */}
            {isLocalTile && (
              <Pressable
                style={styles.closeIcon}
                onPress={() => {
                  console.log('[STOP_MY_STREAM]');
                  Alert.alert(
                    'Stop Streaming',
                    'Are you sure you want to stop streaming?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Stop', 
                        style: 'destructive',
                        onPress: () => {
                          // Call stopPublishing from parent via callback
                          onTilePress(-1, null); // Special signal to stop publishing
                        }
                      }
                    ]
                  );
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#ffffff"
                />
              </Pressable>
            )}
            
          {/* 🔊 SPEAKER ICON (always visible for remote participants) - LEFT SIDE */}
          {!isLocalTile && participant && (
            <Pressable
              style={styles.speakerIcon}
              onPress={handleSpeakerPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={24}
                color="#ffffff"
              />
            </Pressable>
          )}
          
          {/* ❌ CLOSE/HIDE ICON for remote participants - RIGHT SIDE */}
          {!isLocalTile && participant && (
            <Pressable
              style={styles.closeIcon}
              onPress={() => {
                console.log('[HIDE_PARTICIPANT]', { participantId, identity: participant.identity });
                Alert.alert(
                  'Remove from Grid',
                  'Hide this participant from your view?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Hide',
                      onPress: () => {
                        // Add to hidden list (client-side only)
                        const identity = participant.identity;
                        onHideParticipant(identity);
                      }
                    }
                  ]
                );
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={28}
                color="#ffffff"
              />
            </Pressable>
          )}
          </>
        ) : (
          <View style={styles.tilePlaceholder}>
            <Ionicons name="add-circle-outline" size={32} color="#666" />
          </View>
        )}
      </Pressable>
      
      {/* 🎚️ VOLUME SLIDER (sibling, not child - iOS requirement) - LEFT SIDE */}
      {showVolumeSlider && !isLocalTile && participant && (
        <View 
          style={[styles.volumeSliderContainer, { 
            zIndex: 20, 
            elevation: 20, 
            top: 50,
            bottom: 50,
            left: 4,
            width: 50
          }]}
          pointerEvents="auto"
        >
          {(() => {
            console.log('[VOLUME_UI] RENDER slider for tile', tileId, {
              showVolumeSlider,
              isLocalTile,
              hasParticipant: !!participant,
              participantId,
              volume,
            });
            return null;
          })()}
          <Slider
            style={[styles.volumeSliderFloating, { width: 90 }]}
            minimumValue={0}
            maximumValue={100}
            value={volume}
            step={1}
            onSlidingStart={() => {
              console.log('[SLIDER_START]', { participantId, currentVolume: volume });
            }}
            onValueChange={(val) => {
              console.log('[SLIDER_DRAG]', { participantId, val });
              onVolumeChange(participantId, val);
            }}
            onSlidingComplete={(val) => {
              console.log('[SLIDER_COMPLETE]', { participantId, val });
              onVolumeChange(participantId, val);
            }}
            minimumTrackTintColor="#ffffff"
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            thumbTintColor="#ffffff"
          />
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: re-render if any relevant prop changed
  return (
    prevProps.participant?.id === nextProps.participant?.id &&
    prevProps.participant?.videoTrack === nextProps.participant?.videoTrack &&
    prevProps.localVideoTrack === nextProps.localVideoTrack &&
    prevProps.isLocalTile === nextProps.isLocalTile &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.slotIndex === nextProps.slotIndex &&
    prevProps.volumeMap === nextProps.volumeMap &&
    prevProps.mutedParticipants === nextProps.mutedParticipants &&
    prevProps.activeVolumeSliderTileId === nextProps.activeVolumeSliderTileId
  );
});

// ============================================================================
// GRID CONTAINER COMPONENT
// ============================================================================

interface GridContainerProps {
  participants: Participant[];
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  onTilePress: (slotIndex: number, participant: Participant | null) => void;
  localVideoTrack?: LocalVideoTrack | null;
  localAudioTrack?: LocalAudioTrack | null;
  // 🎛️ Volume control props
  volumeMap: VolumeMap;
  mutedParticipants: Set<string>;
  activeVolumeSliderTileId: string | null;
  onDoubleTap: (participantId: string) => void;
  onSpeakerIconPress: (tileId: string, event: any) => void;
  onVolumeChange: (participantId: string, volume: number) => void;
  // 📺 Fullscreen props
  onToggleFullscreen: (tileId: string, participant: Participant | null, isLocal: boolean) => void;
  // 👁️ Hide participant
  onHideParticipant: (identity: string) => void;
  hiddenParticipants: Set<string>;
  slotAssignments: Map<number, string>;
}

function GridContainer({ 
  participants, 
  screenWidth, 
  screenHeight, 
  isLandscape, 
  onTilePress, 
  localVideoTrack, 
  localAudioTrack,
  volumeMap,
  mutedParticipants,
  activeVolumeSliderTileId,
  onDoubleTap,
  onSpeakerIconPress,
  onVolumeChange,
  onToggleFullscreen,
  onHideParticipant,
  hiddenParticipants,
  slotAssignments,
}: GridContainerProps) {
  const { rows, cols } = getGridConfig(isLandscape);
  const tileWidth = screenWidth / cols;
  const tileHeight = screenHeight / rows;

  // Create local participant object if publishing
  const localParticipant = localVideoTrack ? {
    id: 'local',
    identity: 'You',
    videoTrack: localVideoTrack,
  } : null;

  // Filter out hidden participants
  const visibleParticipants = participants.filter(p => !hiddenParticipants.has(p.identity));

  // Create a map of identity to participant for quick lookup
  const participantMap = new Map<string, Participant>();
  visibleParticipants.forEach(p => {
    participantMap.set(p.identity, p);
  });

  // Build list of participants that don't have explicit slot assignments
  const unassignedParticipants = visibleParticipants.filter(p => {
    // Check if this participant is already assigned to a slot
    for (const [_, identity] of slotAssignments.entries()) {
      if (identity === p.identity) return false;
    }
    return true;
  });
  
  let unassignedIndex = 0;

  // Build fixed 12-slot grid using slot assignments
  const gridRows: React.ReactNode[] = [];
  let slotIndex = 0;

  for (let row = 0; row < rows; row++) {
    const rowTiles: React.ReactNode[] = [];
    for (let col = 0; col < cols; col++) {
      const currentSlotIndex = slotIndex;
      
      // Determine which participant should be in this slot
      let participant: Participant | null = null;
      let isLocalTile: boolean | undefined = undefined;
      
      if (currentSlotIndex === 0 && localParticipant) {
        // Slot 0 is always local participant if they're streaming
        isLocalTile = true;
        participant = null;
      } else if (slotAssignments.has(currentSlotIndex)) {
        // This slot has a specific assignment
        const assignedIdentity = slotAssignments.get(currentSlotIndex)!;
        participant = participantMap.get(assignedIdentity) || null;
      } else {
        // No assignment - fill with next unassigned participant
        if (unassignedIndex < unassignedParticipants.length) {
          participant = unassignedParticipants[unassignedIndex];
          unassignedIndex++;
        }
      }

      rowTiles.push(
        <VideoTile
          key={`slot-${currentSlotIndex}`}
          participant={isLocalTile ? null : participant}
          localVideoTrack={isLocalTile ? localVideoTrack : null}
          isLocalTile={isLocalTile}
          width={tileWidth}
          height={tileHeight}
          slotIndex={currentSlotIndex}
          onTilePress={onTilePress}
          volumeMap={volumeMap}
          mutedParticipants={mutedParticipants}
          activeVolumeSliderTileId={activeVolumeSliderTileId}
          onDoubleTap={onDoubleTap}
          onSpeakerIconPress={onSpeakerIconPress}
          onVolumeChange={onVolumeChange}
          onToggleFullscreen={onToggleFullscreen}
          onHideParticipant={onHideParticipant}
        />
      );
      slotIndex++;
    }
    gridRows.push(
      <View key={`row-${row}`} style={styles.gridRow}>
        {rowTiles}
      </View>
    );
  }

  return <View style={styles.gridContainer}>{gridRows}</View>;
}

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================

export default function RoomScreen() {
  const route = useRoute<RoomScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<any>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // 🔍 DEV-ONLY DIAGNOSTICS (Remove after testing)
  useEffect(() => {
    if (__DEV__) {
      const webrtc = NativeModules.WebRTCModule;
      console.log('[LK_NATIVE] Platform', Platform.OS);
      console.log('[LK_NATIVE] WebRTCModule exists?', !!webrtc);
      console.log('[LK_NATIVE] mediaStreamTrackSetVolume exists?', !!webrtc?.mediaStreamTrackSetVolume);
      console.log('[LK_NATIVE] mediaStreamTrackSetEnabled exists?', !!webrtc?.mediaStreamTrackSetEnabled);
      
      console.log('[APP] appOwnership:', Constants.appOwnership);
      console.log('[APP] executionEnvironment:', Constants.executionEnvironment);
      
      // Global error handler for uncaught exceptions
      const ErrorUtils = (global as any).ErrorUtils;
      if (ErrorUtils) {
        const originalHandler = ErrorUtils.getGlobalHandler();
        
        ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
          console.log('[GLOBAL_ERROR_HANDLER] Uncaught exception:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            isFatal,
          });
          
          if (error.message?.includes?.('unimplemented') || error.message?.includes?.('Unimplemented')) {
            console.log('[GLOBAL_ERROR_HANDLER] 🔴 FOUND "unimplemented" ERROR');
            console.log('[GLOBAL_ERROR_HANDLER] Call stack:', error.stack);
          }
          
          // Call original handler
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
        });
      }
      
      // Console interceptors
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      console.error = (...args: any[]) => {
        const msg = String(args[0] || '');
        if (msg.includes('unimplemented') || msg.includes('Unimplemented')) {
          console.log('[CONSOLE_ERROR_INTERCEPT] 🔴 Caught "unimplemented"');
          console.log('[CONSOLE_ERROR_INTERCEPT] Args:', args);
          console.log('[CONSOLE_ERROR_INTERCEPT] Call stack:', new Error().stack);
        }
        originalConsoleError.apply(console, args);
      };
      
      console.warn = (...args: any[]) => {
        const msg = String(args[0] || '');
        if (msg.includes('unimplemented') || msg.includes('Unimplemented')) {
          console.log('[CONSOLE_WARN_INTERCEPT] 🔴 Caught "unimplemented"');
          console.log('[CONSOLE_WARN_INTERCEPT] Args:', args);
          console.log('[CONSOLE_WARN_INTERCEPT] Call stack:', new Error().stack);
        }
        originalConsoleWarn.apply(console, args);
      };
      
      return () => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      };
    }
  }, []);
  
  // Room slug from navigation params (same identifier as web)
  const slug = route.params?.slug || route.params?.roomKey || 'live-central';

  // Track screen dimensions for orientation detection using hook (auto-updates on rotation)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;

  // FIX #2: Status bar visibility - mount only, no orientation triggers
  useEffect(() => {
    RNStatusBar.setHidden(false, 'none');
    return () => RNStatusBar.setHidden(false, 'none');
  }, []);

  // Unlock orientation when RoomScreen is focused, lock back to portrait when leaving
  useFocusEffect(
    useCallback(() => {
      const unlockOrientation = async () => {
        try {
          await ScreenOrientation.unlockAsync();

          if (Platform.OS === 'ios') {
            RNStatusBar.setHidden(false, 'fade');
          }
        } catch (error) {
          // Silently fail
        }
      };

      unlockOrientation();

      return () => {
        const lockOrientation = async () => {
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          } catch (error) {
            // Silently fail
          }
        };

        lockOrientation();
      };
    }, [])
  );

  // Room state
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // LiveKit state
  const [liveKitRoom, setLiveKitRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const roomRef = useRef<Room | null>(null);
  
  // PHASE 2: Batched participant updates to prevent event burst jank
  const participantsMapRef = useRef<Map<string, Participant>>(new Map());
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Schedule a batched commit of participants from the ref map to React state
  const scheduleCommitParticipants = useCallback(() => {
    // If a commit is already scheduled, don't schedule another
    if (commitTimerRef.current) return;
    
    // Schedule commit in 50ms (batches rapid LiveKit events)
    commitTimerRef.current = setTimeout(() => {
      setParticipants(Array.from(participantsMapRef.current.values()));
      commitTimerRef.current = null;
    }, 50);
  }, []);
  
  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const isPublishingRef = useRef(false); // Ref for heartbeat closure
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  
  // Room presence state with heartbeat to keep presence alive
  const presenceActiveRef = useRef(false);
  const roomPresenceTableAvailableRef = useRef<boolean | null>(null);
  const hasRoomIdColumnRef = useRef<boolean | null>(null);
  // CRITICAL: Refs to capture current values for cleanup (empty deps useEffect has stale closures)
  const userRef = useRef(user);
  const roomConfigRef = useRef<RoomConfig | null>(null);

  // Keep refs in sync with current values for cleanup
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    roomConfigRef.current = roomConfig;
  }, [roomConfig]);

  // Group live stream state
  const groupLiveStreamIdRef = useRef<number | null>(null);

  // P1: Control bar and drawer state
  const [activeDrawer, setActiveDrawer] = useState<DrawerPanel>('none');
  
  // Hidden participants (viewer's personal preference)
  const [hiddenParticipants, setHiddenParticipants] = useState<Set<string>>(new Set());
  
  // Slot assignments (which participant is in which slot) - viewer controlled
  const [slotAssignments, setSlotAssignments] = useState<Map<number, string>>(new Map());

  // Mini profile modal state
  const [miniProfileVisible, setMiniProfileVisible] = useState(false);
  const [miniProfileData, setMiniProfileData] = useState<MiniProfileData | null>(null);

  // Replace streamer modal state
  const [replaceModalVisible, setReplaceModalVisible] = useState(false);
  const [replaceModalData, setReplaceModalData] = useState<{
    targetUsername: string;
    targetSlotIndex: number;
    targetParticipantId: string;
    activeStreamers: ActiveStreamer[];
  } | null>(null);
  
  // P2: Tile action sheet state
  const [tileActionTarget, setTileActionTarget] = useState<{
    slotIndex: number;
    participant: Participant | null;
    isLocal: boolean;
  } | null>(null);
  const [volumeMap, setVolumeMap] = useState<VolumeMap>({});
  const [mutedParticipants, setMutedParticipants] = useState<Set<string>>(new Set());
  
  // 🎛️ VOLUME CONTROL STATE (gesture-first)
  const [activeVolumeSliderTileId, setActiveVolumeSliderTileId] = useState<string | null>(null);
  const lastTapTimeRef = useRef<{ [key: string]: number }>({});
  const previousVolumeRef = useRef<Record<string, number>>({});
  const lastSliderOpenAtRef = useRef<number>(0);
  
  // 📺 FULLSCREEN STATE (double-tap to maximize)
  const [fullscreenTileId, setFullscreenTileId] = useState<string | null>(null);
  const [fullscreenParticipant, setFullscreenParticipant] = useState<Participant | null>(null);
  const [fullscreenIsLocal, setFullscreenIsLocal] = useState(false);

  // P1: Swipe gesture handling
  const swipeThreshold = 50;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture swipes if gesture is significant
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 20 || Math.abs(dy) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Determine swipe direction
        if (Math.abs(dy) > Math.abs(dx)) {
          // Vertical swipe
          if (dy < -swipeThreshold) {
            // Swipe up from anywhere -> Chat
            setActiveDrawer('chat');
          } else if (dy > swipeThreshold) {
            // Swipe down from anywhere -> Leaderboard
            setActiveDrawer('leaderboard');
          }
        } else {
          // Horizontal swipe
          if (dx < -swipeThreshold) {
            // Swipe R->L -> Stats
            setActiveDrawer('stats');
          } else if (dx > swipeThreshold) {
            // Swipe L->R -> Options
            setActiveDrawer('options');
          }
        }
      },
    })
  ).current;

  // Normalize room ID to match web (live-central -> live_central)
  const normalizedRoomId = useCallback((roomKey: string | undefined) => {
    const raw = roomKey || 'live_central';
    if (raw === 'live-central') return 'live_central';
    return raw;
  }, []);

  // Chat room ID MUST match room presence scope (no fallback when missing)
  const chatRoomId = roomConfig?.room_key ? normalizedRoomId(roomConfig.room_key) : undefined;

  useEffect(() => {
    if (!roomConfig) return;
    console.log('[ROOM_CHAT] chatRoomId:', chatRoomId);
    if (!chatRoomId) {
      console.error('[ROOM_CHAT] Missing chatRoomId - chat UI disabled');
    }
  }, [chatRoomId, roomConfig]);

  // Update room presence (event-driven only: call on explicit user actions)
  // - On join: updateRoomPresence(true, false)
  // - On start publishing: updateRoomPresence(true, true)
  // - On stop publishing: updateRoomPresence(true, false)
  // - On leave: updateRoomPresence(false)
  const updateRoomPresence = useCallback(async (isPresent: boolean, isLiveAvailable: boolean = false) => {
    if (!user) return;
    if (roomPresenceTableAvailableRef.current === false) return;

    const username = user.email?.split('@')[0] || user.id;
    const roomId = normalizedRoomId(roomConfig?.room_key);

    try {
      if (isPresent) {
        const baseRow: Record<string, any> = {
          profile_id: user.id,
          username,
          is_live_available: isLiveAvailable,
          last_seen_at: new Date().toISOString(),
        };

        if (hasRoomIdColumnRef.current !== false) {
          baseRow.room_id = roomId;
        }

        const { error } = await supabase.from('room_presence').upsert(baseRow);
        
        if (error) {
          if (error.code === '42703' || String(error.message || '').includes('room_id')) {
            hasRoomIdColumnRef.current = false;
            const fallbackRow = { ...baseRow };
            delete fallbackRow.room_id;
            const { error: fallbackError } = await supabase.from('room_presence').upsert(fallbackRow);
            if (fallbackError) {
              if (fallbackError.code === '42P01') {
                roomPresenceTableAvailableRef.current = false;
              }
              return;
            }
          } else if (error.code === '42P01') {
            roomPresenceTableAvailableRef.current = false;
            return;
          } else {
            return;
          }
        }

        presenceActiveRef.current = true;
        roomPresenceTableAvailableRef.current = true;
      } else {
        const { error } = await supabase
          .from('room_presence')
          .delete()
          .eq('profile_id', user.id)
          .eq('room_id', roomId);
        if (error && error.code !== '42P01') {
          // Silently fail
        }
        presenceActiveRef.current = false;
      }
    } catch (err) {
      // Silently fail
    }
  }, [user, roomConfig?.room_key, normalizedRoomId]);

  // Start publishing to the room (publish to existing connected session)
  const startPublishing = useCallback(async () => {
    const room = roomRef.current;
    
    if (!user || isPublishing || !room) {
      return;
    }

    try {
      setIsPublishing(true);
      isPublishingRef.current = true;

      // FIX #3: Lower video encoding - 540p @ 24fps
      const { createLocalTracks, VideoPresets } = await import('livekit-client');

      const tracks = await createLocalTracks({
        audio: true,
        video: {
          facingMode: 'user',
          resolution: VideoPresets.h540.resolution,
        },
      });

      for (const track of tracks) {
        // Publish with reduced bitrate and framerate
        if (track.kind === 'video') {
          await room.localParticipant.publishTrack(track, {
            videoEncoding: {
              maxBitrate: 800_000,
              maxFramerate: 24,
            },
          });
          setLocalVideoTrack(track as LocalVideoTrack);
        } else if (track.kind === 'audio') {
          await room.localParticipant.publishTrack(track);
          setLocalAudioTrack(track as LocalAudioTrack);
        }
      }

      await room.localParticipant.setMetadata(JSON.stringify({
        videoAspect: 'portrait',
        focus: 'top',
      }));

      const { liveStreamId, error: streamError } = await startLiveStreamRecord(user.id, 'group');
      if (!streamError && liveStreamId) {
        groupLiveStreamIdRef.current = liveStreamId;
      }

      updateRoomPresence(true, true);

      Alert.alert('Live!', 'You are now streaming in the room!');
    } catch (error: any) {
      setIsPublishing(false);
      isPublishingRef.current = false;
      Alert.alert('Publishing Error', error?.message || 'Failed to start streaming');
    }
  }, [user, isPublishing, updateRoomPresence]);

  // Stop publishing and unpublish tracks
  const stopPublishing = useCallback(async () => {
    const room = roomRef.current;
    
    if (!room || !isPublishing) {
      return;
    }

    try {
      // Unpublish all local tracks
      const localParticipant = room.localParticipant;
      
      // Unpublish and stop video track
      if (localVideoTrack) {
        await localParticipant.unpublishTrack(localVideoTrack);
        localVideoTrack.stop();
        setLocalVideoTrack(null);
      }

      // Unpublish and stop audio track
      if (localAudioTrack) {
        await localParticipant.unpublishTrack(localAudioTrack);
        localAudioTrack.stop();
        setLocalAudioTrack(null);
      }

      // End live stream record
      if (user && groupLiveStreamIdRef.current) {
        await endLiveStreamRecord(user.id);
        groupLiveStreamIdRef.current = null;
      }

      // Update room presence
      updateRoomPresence(true, false);

      setIsPublishing(false);
      isPublishingRef.current = false;
    } catch (error: any) {
      console.error('[STOP_PUBLISHING] Error:', error);
      Alert.alert('Error', 'Failed to stop streaming');
    }
  }, [isPublishing, localVideoTrack, localAudioTrack, user, updateRoomPresence]);

  // Handle tile press - empty slot = join (with confirmation), occupied = show mini profile
  const handleTilePress = useCallback(async (slotIndex: number, participant: Participant | null) => {
    // Special signal from local tile close button (-1) to stop publishing
    if (slotIndex === -1) {
      stopPublishing();
      return;
    }

    const isLocalTile = slotIndex === 0 && localVideoTrack;

    if (isLocalTile) {
      // Fetch current user's profile data
      if (!user) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, follower_count')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Get following count
        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id);

        setMiniProfileData({
          participantId: 'local',
          userId: user.id,
          username: profile?.username || user.email?.split('@')[0] || 'You',
          avatarUrl: profile?.avatar_url || null,
          isLocal: true,
          slotIndex,
          followerCount: profile?.follower_count || 0,
          followingCount: followingCount || 0,
          isFollowing: false,
        });
        setMiniProfileVisible(true);
      } catch (error) {
        console.error('[MINI_PROFILE] Error fetching local profile:', error);
      }
      return;
    }

    if (!participant) {
      console.log('[EMPTY_SLOT] Clicked empty slot:', { slotIndex, isPublishing, hasLocalVideo: !!localVideoTrack, user: !!user });
      
      if (!user) {
        Alert.alert('Sign In Required', 'Please sign in to join the room.');
        return;
      }

      // Clicking empty slot - show options to fill it
      // Check if user is publishing by looking at localVideoTrack (more reliable than isPublishing state)
      const userIsLive = !!localVideoTrack || isPublishing;
      
      if (userIsLive) {
        console.log('[EMPTY_SLOT] User is live, showing available streamers');
        // Already live - show list of available streamers to put in this slot
        const room = roomRef.current;
        if (!room) return;

        const allParticipants = Array.from(room.remoteParticipants.values());
        const availableStreamers: ActiveStreamer[] = [];
        
        // Get list of identities that are already visible in the grid
        const visibleIdentities = new Set<string>();
        
        // Add all assigned participants
        for (const [_, identity] of slotAssignments.entries()) {
          visibleIdentities.add(identity);
        }
        
        // Add unassigned but visible participants (those filling remaining slots)
        const visibleParticipants = participants.filter(p => !hiddenParticipants.has(p.identity));
        const unassignedVisible = visibleParticipants.filter(p => {
          for (const [_, identity] of slotAssignments.entries()) {
            if (identity === p.identity) return false;
          }
          return true;
        });
        
        // Calculate how many unassigned participants are currently visible
        // (they fill slots that don't have assignments, starting after slot 0)
        const totalSlots = 12;
        const assignedSlots = slotAssignments.size;
        const availableUnassignedSlots = totalSlots - assignedSlots - 1; // -1 for local slot 0
        
        for (let i = 0; i < Math.min(availableUnassignedSlots, unassignedVisible.length); i++) {
          visibleIdentities.add(unassignedVisible[i].identity);
        }
        
        console.log('[EMPTY_SLOT] Currently visible:', Array.from(visibleIdentities));
        
        for (const remoteParticipant of allParticipants) {
          // Skip if already visible in grid
          if (visibleIdentities.has(remoteParticipant.identity)) {
            console.log('[EMPTY_SLOT] Skipping (already visible):', remoteParticipant.identity);
            continue;
          }

          // Check if they have video
          let hasVideo = false;
          remoteParticipant.trackPublications.forEach((pub: any) => {
            if (pub.kind === 'video' && pub.track) {
              hasVideo = true;
            }
          });

          if (!hasVideo) continue;

          const userIdPart = remoteParticipant.identity.split(':')[0].replace(/^u_/, '');
          
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', userIdPart)
              .single();

            availableStreamers.push({
              identity: remoteParticipant.identity,
              userId: userIdPart,
              username: profile?.username || userIdPart.substring(0, 8),
              avatarUrl: profile?.avatar_url || null,
            });
          } catch (error) {
            availableStreamers.push({
              identity: remoteParticipant.identity,
              userId: userIdPart,
              username: userIdPart.substring(0, 8),
              avatarUrl: null,
            });
          }
        }

        console.log('[EMPTY_SLOT] Available streamers:', availableStreamers.map(s => s.username));

        if (availableStreamers.length === 0) {
          Alert.alert('No Available Streamers', 'All streamers with cameras are already in your grid. You can hide someone first to make room.');
          return;
        }

        // Show modal to pick someone for this slot
        setReplaceModalData({
          targetUsername: 'Empty Slot',
          targetSlotIndex: slotIndex,
          targetParticipantId: '',
          activeStreamers: availableStreamers,
        });
        setReplaceModalVisible(true);
        return;
      }

      // Not live yet - show confirmation dialog before going live
      Alert.alert(
        'Go Live',
        'Are you sure you want to start streaming?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Go Live',
            onPress: () => startPublishing(),
          },
        ],
        { cancelable: true }
      );
      return;
    } else {
      // Extract user ID from participant identity (format: u_<uuid>:platform:...)
      const identityParts = participant.identity.split(':');
      const userIdPart = identityParts[0]; // u_<uuid>
      const userId = userIdPart.replace(/^u_/, ''); // remove u_ prefix

      console.log('[MINI_PROFILE] Fetching profile for:', { participantIdentity: participant.identity, userId });

      try {
        // Fetch profile data with cached follower count
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, avatar_url, follower_count')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('[MINI_PROFILE] Profile fetch error:', profileError);
          // Fall back to identity-based username
          const fallbackUsername = identityParts[0].replace(/^u_/, '').substring(0, 8);
          setMiniProfileData({
            participantId: participant.identity,
            userId,
            username: fallbackUsername,
            avatarUrl: null,
            isLocal: false,
            slotIndex,
            followerCount: 0,
            followingCount: 0,
            isFollowing: false,
          });
          setMiniProfileVisible(true);
          return;
        }

        // Get following count
        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId);

        // Check if current user is following this person
        let isFollowing = false;
        if (user) {
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('followee_id', userId)
            .maybeSingle();
          isFollowing = !!followData;
        }

        setMiniProfileData({
          participantId: participant.identity,
          userId,
          username: profile?.username || 'Unknown',
          avatarUrl: profile?.avatar_url || null,
          isLocal: false,
          slotIndex,
          followerCount: profile?.follower_count || 0,
          followingCount: followingCount || 0,
          isFollowing,
        });
        setMiniProfileVisible(true);
      } catch (error) {
        console.error('[MINI_PROFILE] Error fetching profile:', error);
        Alert.alert('Error', 'Failed to load profile');
      }
    }
  }, [user, isPublishing, startPublishing, stopPublishing, localVideoTrack]);

  // P2: Tile action handlers
  const handleMuteToggle = useCallback(() => {
    if (!tileActionTarget?.participant) return;
    const identity = tileActionTarget.participant.identity;
    setMutedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(identity)) {
        next.delete(identity);
      } else {
        next.add(identity);
      }
      return next;
    });
  }, [tileActionTarget]);

  const handleVolumeChange = useCallback((value: number) => {
    if (!tileActionTarget?.participant) return;
    const identity = tileActionTarget.participant.identity;
    setVolumeMap(prev => ({ ...prev, [identity]: value }));
  }, [tileActionTarget]);

  const handleReplace = useCallback(() => {
    setTileActionTarget(null);
  }, [tileActionTarget]);

  const handleKick = useCallback(() => {
    setTileActionTarget(null);
  }, [tileActionTarget]);

  const handleViewProfile = useCallback(() => {
    setTileActionTarget(null);
  }, [tileActionTarget]);

  // 🎛️ VOLUME CONTROL HANDLERS (gesture-first, zero UI chrome)
  
  // Double-tap on tile → toggle mute/unmute
  const handleDoubleTap = useCallback((participantId: string) => {
    if (!participantId) return;
    
    setMutedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  }, []);
  
  // Drag volume slider → update volume
  const handleVolumeChangeGesture = useCallback((participantId: string, volume: number) => {
    console.log('[VOLUME_DIAG] ENTER', { participantId, volume });
    
    if (!participantId) {
      console.warn('[VOLUME_DIAG] No participantId');
      return;
    }
    
    // Update volume map for UI
    setVolumeMap(prev => ({ ...prev, [participantId]: volume }));
    
    // Apply volume using LiveKit's RemoteAudioTrack.setVolume()
    if (roomRef.current) {
      const remoteParticipant = Array.from(roomRef.current.remoteParticipants.values()).find(
        (p) => p.identity === participantId
      );
      
      console.log('[VOLUME_DIAG] Found participant?', !!remoteParticipant);
      
      if (!remoteParticipant) {
        console.warn('[VOLUME_DIAG] Participant not found for identity:', participantId);
        return;
      }
      
      remoteParticipant.audioTrackPublications.forEach((pub) => {
        console.log('[VOLUME_DIAG] Publication:', {
          trackSid: pub.trackSid,
          kind: pub.kind,
          isSubscribed: pub.isSubscribed,
          hasAudioTrack: !!pub.audioTrack,
        });
        
        // STRICT GUARDS: Check subscription + track + method
        if (pub.isSubscribed && pub.audioTrack && typeof (pub.audioTrack as any).setVolume === 'function') {
          const volumeValue = volume / 100; // 0-1 range
          
          try {
            console.log('[VOLUME_DIAG] Calling setVolume with', volumeValue);
            (pub.audioTrack as any).setVolume(volumeValue);
            console.log('[VOLUME_DIAG] ✅ SUCCESS');
          } catch (err) {
            console.error('[VOLUME_DIAG] ❌ EXCEPTION:', {
              message: (err as Error).message,
              name: (err as Error).name,
              stack: (err as Error).stack,
            });
            // Don't rethrow - error already logged
          }
        } else {
          console.warn('[VOLUME_DIAG] Skipped - not ready:', {
            isSubscribed: pub.isSubscribed,
            hasAudioTrack: !!pub.audioTrack,
            hasSetVolume: pub.audioTrack ? typeof (pub.audioTrack as any).setVolume : 'N/A',
          });
        }
      });
    }
    
    // Update mute state based on volume for UI consistency
    if (volume === 0) {
      setMutedParticipants(prev => {
        const next = new Set(prev);
        next.add(participantId);
        return next;
      });
    } else {
      setMutedParticipants(prev => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
    }
  }, []);
  
  // Tap speaker icon → toggle volume slider for that tile
  const speakerLastTapRef = useRef<Record<string, number>>({});
  
  const handleSpeakerIconPress = useCallback((tileId: string, participantId: string) => {
    const now = Date.now();
    const last = speakerLastTapRef.current[tileId] ?? 0;
    const delta = now - last;
    
    console.log('[SPEAKER_TAP]', { tileId, participantId, last, now, delta });
    
    if (delta > 0 && delta < 400) {
      // Double tap on speaker → MUTE/UNMUTE via volume control
      speakerLastTapRef.current[tileId] = 0; // Reset after double tap
      console.log('[SPEAKER_DOUBLE_TAP] mute toggle', { tileId, participantId });
      console.log('[MUTE_DIAG] ENTER', { participantId });
      
      if (!participantId) {
        console.warn('[MUTE_DIAG] No participantId');
        return;
      }
      
      const isMuted = mutedParticipants.has(participantId);
      const newMuted = !isMuted;
      
      console.log('[MUTE_DIAG] Current muted:', isMuted, '→ New:', newMuted);
      
      if (newMuted) {
        // MUTE: Store current volume, then set to 0
        const currentVolume = volumeMap[participantId] ?? 100;
        if (currentVolume > 0) {
          previousVolumeRef.current[participantId] = currentVolume;
        }
        console.log('[MUTE_DIAG] Muting - stored previous volume:', previousVolumeRef.current[participantId]);
        handleVolumeChangeGesture(participantId, 0);
      } else {
        // UNMUTE: Restore previous volume (or default to 100)
        const restoreVolume = previousVolumeRef.current[participantId] ?? 100;
        console.log('[MUTE_DIAG] Unmuting - restoring volume:', restoreVolume);
        handleVolumeChangeGesture(participantId, restoreVolume);
      }
      
      // Update mute state
      setMutedParticipants(prev => {
        const next = new Set(prev);
        if (newMuted) {
          next.add(participantId);
        } else {
          next.delete(participantId);
        }
        return next;
      });
      
      // Close slider if it's open
      if (activeVolumeSliderTileId === tileId) {
        setActiveVolumeSliderTileId(null);
      }
      
      return; // Exit after double tap (prevent fullscreen trigger)
    } else {
      // Single tap on speaker → TOGGLE SLIDER (only if not a potential double-tap)
      speakerLastTapRef.current[tileId] = now; // CRITICAL: Set timestamp for next tap
      
      // Wait briefly to see if this is actually a double-tap
      setTimeout(() => {
        const currentLast = speakerLastTapRef.current[tileId];
        // If timestamp hasn't changed, this was a true single tap
        if (currentLast === now) {
          const nextValue = activeVolumeSliderTileId === tileId ? null : tileId;
          console.log('[SPEAKER_SINGLE_TAP] toggle slider', { tileId });
          console.log('[VOLUME_UI] activeVolumeSliderTileId =>', nextValue);
          
          // Record when slider was opened to prevent immediate overlay close
          if (nextValue !== null) {
            lastSliderOpenAtRef.current = Date.now();
          }
          
          setActiveVolumeSliderTileId(prev => prev === tileId ? null : tileId);
        }
      }, 250);
    }
  }, [mutedParticipants, volumeMap, handleVolumeChangeGesture, activeVolumeSliderTileId]);
  
  // Close volume slider when tapping elsewhere (handled by grid wrapper)
  
  // 📺 FULLSCREEN HANDLERS
  
  // Toggle fullscreen mode for a tile
  const handleToggleFullscreen = useCallback(async (tileId: string, participant: Participant | null, isLocal: boolean) => {
    if (fullscreenTileId === tileId) {
      // Exit fullscreen - unlock orientation to allow auto-rotation
      setFullscreenTileId(null);
      setFullscreenParticipant(null);
      setFullscreenIsLocal(false);
      
      try {
        await ScreenOrientation.unlockAsync();
      } catch (error) {
        // Silently fail
      }
    } else {
      // Enter fullscreen - lock orientation to match video
      setFullscreenTileId(tileId);
      setFullscreenParticipant(participant);
      setFullscreenIsLocal(isLocal);
      
      // Determine video orientation from track dimensions
      try {
        const videoTrack = isLocal ? localVideoTrack : participant?.videoTrack;
        
        if (videoTrack) {
          // Try to get dimensions from MediaStreamTrack
          const mediaStreamTrack = (videoTrack as any).mediaStreamTrack || (videoTrack as any)._mediaStreamTrack;
          
          let isVideoPortrait = true; // Default to portrait
          
          if (mediaStreamTrack && mediaStreamTrack.getSettings) {
            const settings = mediaStreamTrack.getSettings();
            if (settings.width && settings.height) {
              // FLIPPED: Check if video is landscape (width > height) or portrait (height > width)
              // Some tracks might report dimensions differently
              isVideoPortrait = settings.width < settings.height;
            }
          }
          
          // Lock to matching orientation - FORCE viewer to rotate device
          if (isVideoPortrait) {
            // Video is PORTRAIT (tall) → force viewer to LANDSCAPE (this is the fix)
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          } else {
            // Video is LANDSCAPE (wide) → force viewer to PORTRAIT (this is the fix)
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }
        }
      } catch (error) {
        // Silently fail - worst case user can rotate manually
      }
    }
  }, [fullscreenTileId, localVideoTrack]);
  
  // Close fullscreen when exiting (also unlock orientation)
  useEffect(() => {
    return () => {
      if (fullscreenTileId) {
        ScreenOrientation.unlockAsync().catch(() => {});
      }
    };
  }, [fullscreenTileId]);

  // Fetch room config from same RPC as web
  const fetchRoomConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_get_room_config', {
        p_slug: slug,
      });

      if (rpcError) {
        if (slug === 'live-central' || slug === 'live_central') {
          setRoomConfig({
            id: 'live-central-default',
            room_key: 'live_central',
            slug: 'live-central',
            name: 'Live Central',
            description: 'The main live streaming room',
            room_type: 'official',
            visibility: 'public',
            status: 'live',
            grid_size: 12,
            permissions: {
              can_view: true,
              can_publish: true, // Allow publishing in fallback mode
              can_moderate: false,
            },
          });
        } else {
          setError('Room not found');
        }
        return;
      }

      setRoomConfig(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchRoomConfig();
  }, [fetchRoomConfig]);

  // Subscribe to room status changes (realtime)
  useEffect(() => {
    if (!roomConfig?.id || roomConfig.id === 'live-central-default') return;

    const channel = supabase
      .channel(`room-status-${roomConfig.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomConfig.id}`,
        },
        (payload) => {
          fetchRoomConfig();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomConfig?.id, fetchRoomConfig]);

  // Update participants list from LiveKit room (PHASE 2: Batched via map)
  const updateParticipants = useCallback((room: Room) => {
    // Clear map and rebuild from current room state
    participantsMapRef.current.clear();
    
    room.remoteParticipants.forEach((participant: RemoteParticipant) => {
      let videoTrack: RemoteTrack | null = null;
      
      participant.trackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.kind === Track.Kind.Video && pub.track) {
          videoTrack = pub.track as RemoteTrack;
        }
      });

      // Only add participants with video tracks
      if (videoTrack) {
        participantsMapRef.current.set(participant.sid, {
          id: participant.sid,
          identity: participant.identity,
          videoTrack,
        });
      }
    });

    // Schedule a batched commit to React state
    scheduleCommitParticipants();
  }, [scheduleCommitParticipants]);

  // Connect to LiveKit room (same room name as web)
  const connectToLiveKit = useCallback(async () => {
    if (!roomConfig) {
      return;
    }

    const canView = typeof roomConfig.permissions?.can_view === 'boolean'
      ? roomConfig.permissions.can_view
      : true;

    if (!canView) {
      return;
    }

    // Check if user can publish (like web does)
    // For Live Central and similar rooms, allow publishing by default for authenticated users
    const canPublish = !!user && (roomConfig.room_key === 'live_central' ||
                                   roomConfig.slug === 'live-central' ||
                                   roomConfig.permissions?.can_publish === true);

    // Use room_key as LiveKit room name (matches web: roomConfig.roomId)
    // Web uses 'live_central' (underscore) for LiveKit room name
    // Handle both slug format (live-central) and room_key format (live_central)
    let liveKitRoomName = roomConfig.room_key;

    // Special case: Live Central uses underscore format for LiveKit
    if (liveKitRoomName === 'live-central' || roomConfig.slug === 'live-central') {
      liveKitRoomName = 'live_central';
    }

    try {
      const identity = user ? `u_${user.id}` : `anon-${Date.now()}`;
      const displayName = user?.email?.split('@')[0] || user?.id || 'Viewer';

      const { token, url } = await fetchMobileToken(
        liveKitRoomName,
        identity,
        displayName,
        canPublish
      );

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // FIX #5: Silent event handlers - no logging
      room.on(RoomEvent.Connected, () => {
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.Camera || pub.source === Track.Source.Microphone) {
              if (!pub.isSubscribed) {
                try {
                  pub.setSubscribed(true);
                } catch (err) {
                  // Silently fail
                }
              }
            }
          });
        });
        
        setLiveKitRoom(room);
        setIsConnected(true);
        updateParticipants(room);
        updateRoomPresence(true, false);
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        setIsConnected(false);
        participantsMapRef.current.clear(); // Clear map
        setParticipants([]); // Immediate commit on disconnect
        updateRoomPresence(false);
        
        const currentUser = userRef.current;
        if (groupLiveStreamIdRef.current && currentUser) {
          endLiveStreamRecord(currentUser.id);
          groupLiveStreamIdRef.current = null;
        }
        
        setIsPublishing(false);
        isPublishingRef.current = false;
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        // Auto-subscribe to camera/mic tracks
        participant.trackPublications.forEach((pub) => {
          if (pub.source === Track.Source.Camera || pub.source === Track.Source.Microphone) {
            if (!pub.isSubscribed) {
              try {
                pub.setSubscribed(true);
              } catch (err) {
                // Silently fail
              }
            }
          }
        });
        
        // PHASE 2: Update map instead of state directly
        // Note: We might not have video track yet, will be added on TrackSubscribed
        let videoTrack: RemoteTrack | null = null;
        participant.trackPublications.forEach((pub: RemoteTrackPublication) => {
          if (pub.kind === Track.Kind.Video && pub.track) {
            videoTrack = pub.track as RemoteTrack;
          }
        });
        
        // Only add to map if video track exists
        if (videoTrack) {
          participantsMapRef.current.set(participant.sid, {
            id: participant.sid,
            identity: participant.identity,
            videoTrack,
          });
          scheduleCommitParticipants();
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        // PHASE 2: Remove from map and schedule commit
        participantsMapRef.current.delete(participant.sid);
        scheduleCommitParticipants();
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        if (track.kind === 'video') {
          // PHASE 2: Update map and schedule commit
          participantsMapRef.current.set(participant.sid, {
            id: participant.sid,
            identity: participant.identity,
            videoTrack: track,
          });
          scheduleCommitParticipants();
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        if (track.kind === 'video') {
          // PHASE 2: Remove from map and schedule commit
          participantsMapRef.current.delete(participant.sid);
          scheduleCommitParticipants();
        }
      });

      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        if (publication.source === Track.Source.Camera || publication.source === Track.Source.Microphone) {
          if (!publication.isSubscribed) {
            try {
              publication.setSubscribed(true);
            } catch (err) {
              // Silently fail
            }
          }
        }
      });

      await room.connect(url, token);
      
      roomRef.current = room;
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to live room');
    }
  }, [roomConfig, user, updateParticipants, updateRoomPresence]);

  // Connect to LiveKit when room config is loaded
  useEffect(() => {
    const roomStateValid = liveKitRoom && roomRef.current === liveKitRoom;
    
    if (roomConfig && !roomStateValid) {
      connectToLiveKit();
    }
  }, [roomConfig, liveKitRoom, connectToLiveKit]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      const currentUser = userRef.current;
      const currentRoomConfig = roomConfigRef.current;
      
      if (groupLiveStreamIdRef.current && currentUser) {
        endLiveStreamRecord(currentUser.id);
        groupLiveStreamIdRef.current = null;
      }
      
      if (currentUser && presenceActiveRef.current && currentRoomConfig?.room_key) {
        const roomId = currentRoomConfig.room_key === 'live-central' ? 'live_central' : currentRoomConfig.room_key;
        supabase
          .from('room_presence')
          .delete()
          .eq('profile_id', currentUser.id)
          .eq('room_id', roomId)
          .then(({ error }) => {
            // Silently complete
          });
      }
      
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  // Calculate safe dimensions that respect all safe area insets
  // Control bar: 60px height at bottom (portrait) OR 40px width at right (landscape)
  const CONTROL_BAR_SIZE = isLandscape ? 40 : 60;
  
  // Grid wrapper padding: ONLY safe area insets (NOT control bar space)
  const gridPaddingTop = insets.top;
  const gridPaddingBottom = insets.bottom;
  const gridPaddingLeft = insets.left;
  const gridPaddingRight = insets.right;
  
  // Grid dimensions: subtract BOTH safe area padding AND control bar space
  const safeGridHeight = screenHeight - gridPaddingTop - gridPaddingBottom - (isLandscape ? 0 : CONTROL_BAR_SIZE);
  const safeGridWidth = screenWidth - gridPaddingLeft - gridPaddingRight - (isLandscape ? CONTROL_BAR_SIZE : 0);

  // Always render the grid - overlay loading/error states on top
  // Grid MUST respect all safe area insets (notch, home bar, left/right in landscape)
  const shouldEnableSwipes = !activeVolumeSliderTileId && activeDrawer === 'none';

  return (
    <View style={styles.container} {...(shouldEnableSwipes ? panResponder.panHandlers : {})}>
      <StatusBar
        style="light"
        backgroundColor="#000000"
        hidden={false}
        translucent={true}
      />
      {/* Full-screen overlay to close slider when tapping outside (only when slider is open) */}
      {/* MUST be rendered BEFORE grid so slider (which is inside grid) can be above it */}
      {activeVolumeSliderTileId && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 5, backgroundColor: 'rgba(0,0,0,0.3)' }]}
          pointerEvents="box-none"
          onPress={() => {
            // Guard against instant close from the same tap that opened slider
            const now = Date.now();
            const timeSinceOpen = now - lastSliderOpenAtRef.current;
            if (timeSinceOpen < 250) {
              console.log('[OVERLAY_TAP] Ignoring (just opened)', timeSinceOpen, 'ms ago');
              return;
            }
            console.log('[OVERLAY_TAP] Closing slider');
            setActiveVolumeSliderTileId(null);
          }}
        >
          <View style={StyleSheet.absoluteFillObject} pointerEvents="auto" onTouchEnd={() => {
            const now = Date.now();
            const timeSinceOpen = now - lastSliderOpenAtRef.current;
            if (timeSinceOpen < 250) {
              console.log('[OVERLAY_TOUCH] Ignoring (just opened)');
              return;
            }
            console.log('[OVERLAY_TOUCH] Closing slider');
            setActiveVolumeSliderTileId(null);
          }} />
        </Pressable>
      )}
      
      {/* Grid wrapper with safe area padding for notch + home bar + control bar */}
      <View 
        style={[styles.gridWrapper, {
          paddingTop: gridPaddingTop,
          paddingBottom: gridPaddingBottom,
          paddingLeft: gridPaddingLeft,
          paddingRight: gridPaddingRight
        }]}
        pointerEvents={activeVolumeSliderTileId ? "box-none" : "auto"}
      >
        <GridContainer
          participants={participants}
          screenWidth={safeGridWidth}
          screenHeight={safeGridHeight}
          isLandscape={isLandscape}
          onTilePress={handleTilePress}
          localVideoTrack={localVideoTrack}
          localAudioTrack={localAudioTrack}
          volumeMap={volumeMap}
          mutedParticipants={mutedParticipants}
          activeVolumeSliderTileId={activeVolumeSliderTileId}
          onDoubleTap={handleDoubleTap}
          onSpeakerIconPress={handleSpeakerIconPress}
          onVolumeChange={handleVolumeChangeGesture}
          onToggleFullscreen={handleToggleFullscreen}
          onHideParticipant={(identity) => {
            setHiddenParticipants(prev => new Set([...prev, identity]));
          }}
          hiddenParticipants={hiddenParticipants}
          slotAssignments={slotAssignments}
        />
      </View>
      
      {/* 📺 FULLSCREEN OVERLAY (when double-tapped) */}
      {fullscreenTileId && (
        <Pressable
          style={styles.fullscreenOverlay}
          onPress={() => handleToggleFullscreen(fullscreenTileId, fullscreenParticipant, fullscreenIsLocal)}
        >
          <VideoView
            style={StyleSheet.absoluteFillObject}
            videoTrack={fullscreenIsLocal ? localVideoTrack as any : fullscreenParticipant?.videoTrack as any}
            objectFit="cover"
            mirror={fullscreenIsLocal}
          />
          
          {/* Fullscreen indicator */}
          <View style={styles.fullscreenIndicator}>
            <Text style={styles.fullscreenIndicatorText}>
              {fullscreenIsLocal ? 'YOU' : 'Viewing'}
            </Text>
            <Text style={styles.fullscreenHint}>Double-tap to exit</Text>
          </View>
          
          {/* Speaker icon in fullscreen (for remote participants) */}
          {!fullscreenIsLocal && fullscreenParticipant && (
            <Pressable
              style={styles.speakerIconFullscreen}
              onPress={() => {
                handleSpeakerIconPress(`fullscreen-${fullscreenTileId}`, fullscreenParticipant.identity);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={mutedParticipants.has(fullscreenParticipant.identity) ? 'volume-mute' : 'volume-high'}
                size={32}
                color="#ffffff"
              />
            </Pressable>
          )}
          
          {/* Volume slider in fullscreen */}
          {activeVolumeSliderTileId === fullscreenTileId && !fullscreenIsLocal && fullscreenParticipant && (
            <View style={styles.volumeSliderContainerFullscreen}>
              <Slider
                style={styles.volumeSliderFloating}
                minimumValue={0}
                maximumValue={100}
                value={volumeMap[fullscreenParticipant.identity] ?? 100}
                onValueChange={(val) => handleVolumeChangeGesture(fullscreenParticipant.identity, val)}
                minimumTrackTintColor="#ffffff"
                maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                thumbTintColor="#ffffff"
              />
            </View>
          )}
        </Pressable>
      )}
      
      {/* Loading overlay */}
      {loading && (
        <View style={styles.overlayContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading room...</Text>
        </View>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <View style={styles.overlayContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* No access overlay */}
      {roomConfig && roomConfig.permissions?.can_view === false && !loading && !error && (
        <View style={styles.overlayContainer}>
          <Text style={styles.errorText}>You do not have access to this room</Text>
        </View>
      )}

      {/* P1: Control Bar (hidden in fullscreen mode) */}
      {!fullscreenTileId && (
        <ControlBar
          isLandscape={isLandscape}
          onExitPress={() => navigation.goBack()}
          onChatPress={() => setActiveDrawer('chat')}
          onGiftsPress={() => setActiveDrawer('gifts')}
          onLeaderboardPress={() => setActiveDrawer('leaderboard')}
          onStatsPress={() => setActiveDrawer('stats')}
          onOptionsPress={() => setActiveDrawer('options')}
          bottomInset={insets.bottom}
          rightInset={insets.right}
        />
      )}

      {/* P1: Bottom Drawer Panels */}
      <BottomDrawer
        visible={activeDrawer === 'chat'}
        title="Chat"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
        scrollable={false}
        hideHeader={true}
        contentStyle={styles.chatDrawerContent}
        containerStyle={styles.chatDrawerContainer}
      >
        <ChatContent roomSlug={chatRoomId} />
      </BottomDrawer>

      <BottomDrawer
        visible={activeDrawer === 'gifts'}
        title="Send Gift"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <GiftContent />
      </BottomDrawer>

      <BottomDrawer
        visible={activeDrawer === 'leaderboard'}
        title="Leaderboard"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <LeaderboardContent />
      </BottomDrawer>

      <BottomDrawer
        visible={activeDrawer === 'stats'}
        title="Stats"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <StatsContent />
      </BottomDrawer>

      <BottomDrawer
        visible={activeDrawer === 'options'}
        title="Options"
        onClose={() => setActiveDrawer('none')}
        bottomInset={insets.bottom}
        isLandscape={isLandscape}
      >
        <OptionsContent />
      </BottomDrawer>

      {/* Mini Profile Modal */}
      <MiniProfileModal
        visible={miniProfileVisible}
        profileData={miniProfileData}
        onClose={() => setMiniProfileVisible(false)}
        onFollow={async () => {
          if (!user || !miniProfileData) return;

          try {
            if (miniProfileData.isFollowing) {
              // Unfollow
              const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('followee_id', miniProfileData.userId);

              if (error) throw error;

              setMiniProfileData(prev => prev ? { ...prev, isFollowing: false, followerCount: Math.max(0, prev.followerCount - 1) } : null);
            } else {
              // Follow
              const { error } = await supabase
                .from('follows')
                .insert({
                  follower_id: user.id,
                  followee_id: miniProfileData.userId,
                });

              if (error) throw error;

              setMiniProfileData(prev => prev ? { ...prev, isFollowing: true, followerCount: prev.followerCount + 1 } : null);
            }
          } catch (error) {
            console.error('[FOLLOW] Error:', error);
            Alert.alert('Error', 'Failed to update follow status');
          }
        }}
        onViewProfile={() => {
          if (!miniProfileData) return;
          setMiniProfileVisible(false);
          navigation.navigate('ProfileViewScreen', { profileId: miniProfileData.userId });
        }}
        onMessage={() => {
          if (!miniProfileData) return;
          setMiniProfileVisible(false);
          navigation.navigate('IMThreadScreen', { 
            otherProfileId: miniProfileData.userId, 
            otherDisplayName: miniProfileData.username,
            otherAvatarUrl: miniProfileData.avatarUrl 
          });
        }}
        onReport={() => {
          if (!miniProfileData) return;
          Alert.alert(
            'Report User',
            'Are you sure you want to report this user?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Report',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const { error } = await supabase
                      .from('user_reports')
                      .insert({
                        reporter_id: user?.id,
                        reported_id: miniProfileData.userId,
                        reason: 'inappropriate_behavior',
                        report_type: 'user',
                        status: 'pending',
                      });

                    if (error) throw error;

                    setMiniProfileVisible(false);
                    Alert.alert('Reported', 'Thank you for your report');
                  } catch (error) {
                    console.error('[REPORT] Error:', error);
                    Alert.alert('Error', 'Failed to report user');
                  }
                },
              },
            ]
          );
        }}
        onBlock={() => {
          if (!miniProfileData) return;
          Alert.alert(
            'Block User',
            'Are you sure you want to block this user?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const { error } = await supabase.rpc('block_user', {
                      p_blocker_id: user?.id,
                      p_blocked_id: miniProfileData.userId,
                    });

                    if (error) throw error;

                    setMiniProfileVisible(false);
                    Alert.alert('Blocked', 'User has been blocked');
                  } catch (error) {
                    console.error('[BLOCK] Error:', error);
                    Alert.alert('Error', 'Failed to block user');
                  }
                },
              },
            ]
          );
        }}
        onReplace={async () => {
          if (!miniProfileData || !user) return;

          // Get list of ALL participants (including hidden ones) with active cameras
          const allActiveStreamers: ActiveStreamer[] = [];
          
          // Get the full participants list from room, not filtered
          const room = roomRef.current;
          if (!room) return;

          const allParticipants = Array.from(room.remoteParticipants.values());
          
          for (const remoteParticipant of allParticipants) {
            // Skip if this is the target user
            if (remoteParticipant.identity === miniProfileData.participantId) {
              continue;
            }

            // Check if they have video
            let hasVideo = false;
            remoteParticipant.trackPublications.forEach((pub: any) => {
              if (pub.kind === 'video' && pub.track) {
                hasVideo = true;
              }
            });

            if (!hasVideo) continue;

            // Extract user ID from participant identity
            const userIdPart = remoteParticipant.identity.split(':')[0].replace(/^u_/, '');
            
            // Try to fetch username and avatar
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', userIdPart)
                .single();

              allActiveStreamers.push({
                identity: remoteParticipant.identity,
                userId: userIdPart,
                username: profile?.username || userIdPart.substring(0, 8),
                avatarUrl: profile?.avatar_url || null,
              });
            } catch (error) {
              // Fallback if profile fetch fails
              allActiveStreamers.push({
                identity: remoteParticipant.identity,
                userId: userIdPart,
                username: userIdPart.substring(0, 8),
                avatarUrl: null,
              });
            }
          }

          // Close mini profile and open replace modal
          setMiniProfileVisible(false);
          setReplaceModalData({
            targetUsername: miniProfileData.username,
            targetSlotIndex: miniProfileData.slotIndex,
            targetParticipantId: miniProfileData.participantId,
            activeStreamers: allActiveStreamers,
          });
          setReplaceModalVisible(true);
        }}
        bottomInset={insets.bottom}
      />

      {/* Replace Streamer Modal */}
      <ReplaceStreamerModal
        visible={replaceModalVisible}
        targetUsername={replaceModalData?.targetUsername || ''}
        targetSlotIndex={replaceModalData?.targetSlotIndex || 0}
        targetParticipantId={replaceModalData?.targetParticipantId || ''}
        activeStreamers={replaceModalData?.activeStreamers || []}
        currentUserIsLive={isPublishing}
        onClose={() => setReplaceModalVisible(false)}
        onReplaceAndGoLive={() => {
          setReplaceModalVisible(false);
          startPublishing();
        }}
        onReplaceWithStreamer={(streamer) => {
          if (!replaceModalData) return;
          
          console.log('[REPLACE] Target:', replaceModalData.targetParticipantId, 'Replacement:', streamer.identity);
          
          // If target is empty slot, just assign the streamer to that slot
          if (!replaceModalData.targetParticipantId) {
            setReplaceModalVisible(false);
            console.log('[FILL_SLOT] Assigning to slot:', replaceModalData.targetSlotIndex);
            
            // Assign to slot
            setSlotAssignments(prev => {
              const next = new Map(prev);
              next.set(replaceModalData.targetSlotIndex, streamer.identity);
              console.log('[FILL_SLOT] New assignments:', Array.from(next.entries()));
              return next;
            });
            
            // Unhide the streamer if they were hidden
            setHiddenParticipants(prev => {
              const next = new Set(prev);
              next.delete(streamer.identity);
              console.log('[FILL_SLOT] Unhiding:', streamer.identity);
              return next;
            });
            
            return;
          }
          
          Alert.alert(
            'Switch Participants',
            `Swap ${replaceModalData.targetUsername} with ${streamer.username}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Switch',
                onPress: () => {
                  setReplaceModalVisible(false);
                  
                  console.log('[SWITCH] Current assignments:', Array.from(slotAssignments.entries()));
                  
                  // Find which slot the replacement streamer is currently in
                  let replacementCurrentSlot = -1;
                  for (const [slot, identity] of slotAssignments.entries()) {
                    if (identity === streamer.identity) {
                      replacementCurrentSlot = slot;
                      break;
                    }
                  }
                  
                  // If replacement isn't in a slot yet, find them in the natural order
                  if (replacementCurrentSlot === -1) {
                    const visibleParticipants = participants.filter(p => !hiddenParticipants.has(p.identity));
                    for (let i = 0; i < visibleParticipants.length; i++) {
                      if (visibleParticipants[i].identity === streamer.identity) {
                        // This participant is at natural index i, which corresponds to slot i+1 (after local at slot 0)
                        replacementCurrentSlot = i + (localVideoTrack ? 1 : 0);
                        break;
                      }
                    }
                  }
                  
                  console.log('[SWITCH] Swapping:', {
                    targetSlot: replaceModalData.targetSlotIndex,
                    targetIdentity: replaceModalData.targetParticipantId,
                    replacementSlot: replacementCurrentSlot,
                    replacementIdentity: streamer.identity,
                  });
                  
                  // Swap their slot assignments
                  setSlotAssignments(prev => {
                    const next = new Map(prev);
                    // Put replacement in target's slot
                    next.set(replaceModalData.targetSlotIndex, streamer.identity);
                    // Put target in replacement's slot (if they had one)
                    if (replacementCurrentSlot >= 0) {
                      next.set(replacementCurrentSlot, replaceModalData.targetParticipantId);
                    }
                    console.log('[SWITCH] New assignments:', Array.from(next.entries()));
                    return next;
                  });
                },
              },
            ]
          );
        }}
        bottomInset={insets.bottom}
      />

      {/* P2: Tile Action Sheet */}
      <TileActionSheet
        visible={tileActionTarget !== null}
        participant={tileActionTarget?.participant || null}
        slotIndex={tileActionTarget?.slotIndex || 0}
        isLocal={tileActionTarget?.isLocal || false}
        isMuted={tileActionTarget?.participant ? mutedParticipants.has(tileActionTarget.participant.identity) : false}
        volume={tileActionTarget?.participant ? (volumeMap[tileActionTarget.participant.identity] ?? 100) : 100}
        canModerate={roomConfig?.permissions?.can_moderate || false}
        onClose={() => setTileActionTarget(null)}
        onMuteToggle={handleMuteToggle}
        onVolumeChange={handleVolumeChange}
        onReplace={handleReplace}
        onKick={handleKick}
        onViewProfile={handleViewProfile}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gridWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gridContainer: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
  },
  emptyGrid: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tile: {
    // overflow: 'hidden', // REMOVED - was clipping absolutely positioned slider
    // Remove borders for seamless full-screen video grid
  },
  tilePlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
  },
  publishingIndicator: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishingText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '600',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCard: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 20,
    width: 280,
    alignItems: 'center',
  },
  playerCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  playerAvatar: {
    marginBottom: 8,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playerSlot: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  playerCardActions: {
    width: '100%',
    gap: 10,
  },
  playerCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a90d9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  playerCardButtonSecondary: {
    backgroundColor: '#333',
  },
  playerCardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playerCardButtonTextSecondary: {
    color: '#999',
  },
  // P1: Control Bar styles
  controlBar: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  controlBarPortrait: {
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  controlBarLandscape: {
    top: 0,
    bottom: 0,
    right: 0,  // Container stays at right edge
    width: 40,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 50,
  },
  controlButtonLandscape: {
    minWidth: 0,
    width: 36,
    paddingVertical: 4,
    paddingHorizontal: 1,  // Reduce horizontal padding to prevent text wrapping
  },
  controlButtonActive: {
    backgroundColor: 'rgba(74, 144, 217, 0.2)',
    borderRadius: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  controlButtonTextLandscape: {
    fontSize: 8,  // Smaller font in landscape to prevent wrapping
    marginTop: 1,
  },
  controlButtonTextActive: {
    color: '#4a90d9',
  },
  // P1: Bottom Drawer styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 200,
  },
  drawerContainerLandscape: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    maxWidth: 400,
  },
  chatDrawerContainer: {
    maxHeight: '80%',
    minHeight: '60%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  drawerHeaderLandscape: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  drawerTitleLandscape: {
    fontSize: 22,
  },
  drawerBody: {
    flex: 1,
  },
  drawerContent: {
    padding: 20,
  },
  drawerContentFixed: {
    flex: 1,
  },
  drawerContentLandscape: {
    padding: 24,
    paddingTop: 16,
  },
  chatDrawerContent: {
    padding: 0,
    flex: 1,
  },
  drawerPlaceholder: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  // Chat styles
  chatContainer: {
    flex: 1,
    minHeight: 300,
  },
  chatLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 12,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  chatUsername: {
    color: '#4a90d9',
    fontWeight: '600',
    marginRight: 6,
  },
  chatMessageText: {
    color: '#fff',
    flex: 1,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chatSendButton: {
    padding: 8,
  },
  // Gift styles
  giftContainer: {
    flex: 1,
    minHeight: 400,
  },
  giftLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftBalanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    margin: 12,
    marginBottom: 0,
  },
  giftBalanceLabel: {
    color: '#888',
    fontSize: 14,
  },
  giftBalanceAmount: {
    color: '#4a90d9',
    fontSize: 16,
    fontWeight: '600',
  },
  giftList: {
    flex: 1,
  },
  giftListContent: {
    padding: 12,
  },
  giftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  giftItemSelected: {
    borderColor: '#4a90d9',
  },
  giftEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  giftInfo: {
    flex: 1,
  },
  giftName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  giftCost: {
    color: '#888',
    fontSize: 14,
  },
  giftSendBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  giftSendText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  giftSendButton: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  giftSendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Leaderboard styles
  leaderboardContainer: {
    flex: 1,
    minHeight: 400,
  },
  leaderboardTabs: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 0,
  },
  leaderboardTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  leaderboardTabActive: {
    borderBottomColor: '#4a90d9',
  },
  leaderboardTabText: {
    color: '#888',
    fontWeight: '600',
  },
  leaderboardTabTextActive: {
    color: '#4a90d9',
  },
  leaderboardPeriodTabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  leaderboardPeriodTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  leaderboardPeriodTabActive: {
    backgroundColor: '#4a90d9',
  },
  leaderboardPeriodTabText: {
    color: '#888',
    fontSize: 12,
  },
  leaderboardPeriodTabTextActive: {
    color: '#fff',
  },
  leaderboardLoading: {
    padding: 40,
    alignItems: 'center',
  },
  leaderboardList: {
    flex: 1,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  leaderboardRank: {
    color: '#4a90d9',
    fontWeight: '600',
    width: 40,
  },
  leaderboardUsername: {
    color: '#fff',
    flex: 1,
  },
  leaderboardValue: {
    color: '#888',
  },
  // Stats styles
  statsContainer: {
    padding: 20,
    gap: 16,
  },
  statItem: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    color: '#4a90d9',
    fontSize: 32,
    fontWeight: '600',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  // Options styles
  optionsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  optionsText: {
    color: '#888',
    fontSize: 14,
  },
  // P2: Tile Action Sheet styles
  // Mini Profile Modal styles
  miniProfileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniProfileContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  miniProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  miniProfileAvatar: {
    marginRight: 16,
  },
  miniProfileInfo: {
    flex: 1,
  },
  miniProfileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  miniProfileSlot: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  miniProfileStats: {
    flexDirection: 'row',
    gap: 20,
  },
  miniProfileStat: {
    alignItems: 'center',
  },
  miniProfileStatNumber: {
    color: '#4a90d9',
    fontSize: 18,
    fontWeight: '600',
  },
  miniProfileStatLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  miniProfileActions: {
    gap: 10,
  },
  miniProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  miniProfileButtonPrimary: {
    backgroundColor: '#4a90d9',
  },
  miniProfileButtonSecondary: {
    backgroundColor: '#666',
  },
  miniProfileButtonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  miniProfileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  miniProfileCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  miniProfileCloseText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  // Replace Streamer Modal
  replaceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  replaceModalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  replaceModalHeader: {
    marginBottom: 20,
  },
  replaceModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  replaceModalSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  replaceModalOptions: {
    marginBottom: 16,
  },
  replaceOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  replaceOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  replaceOptionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  replaceOptionSubtitle: {
    color: '#888',
    fontSize: 13,
  },
  replaceModalDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 12,
  },
  replaceModalSectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  replaceStreamerList: {
    maxHeight: 300,
  },
  replaceStreamerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  replaceStreamerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  replaceStreamerAvatarPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replaceStreamerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  replaceStreamerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  replaceStreamerLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replaceStreamerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4444',
    marginRight: 6,
  },
  replaceStreamerLiveText: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: '600',
  },
  replaceModalEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  replaceModalEmptyText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
  replaceModalCloseButton: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  replaceModalCloseText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  actionSheetContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    marginBottom: 12,
  },
  actionSheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  actionSheetSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionSheetRowText: {
    color: '#fff',
    fontSize: 16,
  },
  actionSheetVolumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 8,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  actionSheetCloseRow: {
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 8,
  },
  actionSheetCloseText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  // Local indicator styles
  localIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  localIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  // 🎛️ VOLUME CONTROL STYLES (invisible UI, no chrome)
  speakerIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 4,
    zIndex: 10,
  },
  closeIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
  volumeSliderContainer: {
    position: 'absolute',
    left: 8,
    // top/bottom set inline based on speaker icon position (50px from top/bottom)
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    width: 40,
  },
  volumeSliderFloating: {
    width: 150, // Height when vertical (rotated 90deg)
    height: 40,
    transform: [{ rotate: '-90deg' }],
  },
  // 📺 FULLSCREEN STYLES
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  fullscreenIndicator: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  fullscreenIndicatorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  fullscreenHint: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  speakerIconFullscreen: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    zIndex: 10,
  },
  volumeSliderContainerFullscreen: {
    position: 'absolute',
    right: 20,
    top: 120,
    bottom: 120,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    width: 40,
  },
});
