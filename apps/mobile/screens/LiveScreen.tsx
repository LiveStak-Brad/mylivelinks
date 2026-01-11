import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function LiveScreen() {
  const MOCK_CHAT = [
    { id: 'm1', user: 'Nova', msg: 'W stream 🔥' },
    { id: 'm2', user: 'Kai', msg: 'Drop a gift train?' },
    { id: 'm3', user: 'Ava', msg: 'Where are you streaming from?' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {/* Video area (placeholder only) */}
        <View style={styles.videoStage}>
          <View style={styles.videoInner}>
            <View style={styles.videoPlaceholderIcon}>
              <Feather name="video" size={22} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.videoTitle}>Live video</Text>
            <Text style={styles.videoSubtitle}>Viewer UI placeholder (no streaming)</Text>
          </View>
        </View>

        {/* Overlays (static UI only) */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Top overlay */}
          <View style={styles.topOverlay}>
            <View style={styles.topRow}>
              <View style={styles.hostCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>H</Text>
                </View>
                <View style={styles.hostMeta}>
                  <View style={styles.hostNameRow}>
                    <Text numberOfLines={1} style={styles.hostName}>
                      HostName
                    </Text>
                    <View style={styles.livePill}>
                      <View style={styles.liveDot} />
                      <Text style={styles.livePillText}>LIVE</Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.hostSubtitle}>
                    @host • Just chatting
                  </Text>
                </View>
              </View>

              <View style={styles.topActions}>
                <View style={styles.viewerPill}>
                  <Feather name="eye" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.viewerPillText}>1.2K</Text>
                </View>
                <View style={styles.iconPill}>
                  <Feather name="share-2" size={16} color={COLORS.text} />
                </View>
                <View style={styles.iconPill}>
                  <Feather name="more-horizontal" size={18} color={COLORS.text} />
                </View>
              </View>
            </View>
          </View>

          {/* Right rail actions */}
          <View style={styles.rightRail}>
            <View style={styles.railButton}>
              <Feather name="heart" size={20} color={COLORS.text} />
              <Text style={styles.railCount}>28K</Text>
            </View>
            <View style={styles.railButton}>
              <Feather name="message-circle" size={20} color={COLORS.text} />
              <Text style={styles.railCount}>1.4K</Text>
            </View>
            <View style={styles.railButton}>
              <Feather name="gift" size={20} color={COLORS.text} />
              <Text style={styles.railCount}>Gift</Text>
            </View>
          </View>

          {/* Bottom overlay: chat preview + action bar */}
          <View style={styles.bottomOverlay}>
            <View style={styles.chatPreview}>
              {MOCK_CHAT.map((m) => (
                <View key={m.id} style={styles.chatRow}>
                  <Text style={styles.chatUser}>{m.user}</Text>
                  <Text numberOfLines={1} style={styles.chatMsg}>
                    {m.msg}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.bottomBar}>
              <View style={styles.chatInputPill}>
                <Feather name="message-square" size={16} color={COLORS.textSecondary} />
                <Text style={styles.chatInputText}>Say something…</Text>
              </View>
              <View style={styles.bottomIconButton}>
                <Feather name="smile" size={18} color={COLORS.text} />
              </View>
              <View style={styles.bottomIconButton}>
                <Feather name="send" size={18} color={COLORS.text} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: '#0B0B0F',
  text: '#F5F6FA',
  textSecondary: 'rgba(245,246,250,0.65)',
  border: 'rgba(255,255,255,0.10)',
  card: 'rgba(18,18,26,0.72)',
  cardSolid: '#12121A',
  red: '#EF4444',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  videoStage: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  videoInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  videoPlaceholderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: -0.2,
  },
  videoSubtitle: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },

  topOverlay: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hostCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.35)',
    borderColor: 'rgba(124,58,237,0.45)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 14,
  },
  hostMeta: {
    flex: 1,
    gap: 2,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostName: {
    flexShrink: 1,
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 14,
  },
  hostSubtitle: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderColor: 'rgba(239,68,68,0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.red,
  },
  livePillText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },

  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  viewerPillText: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 12,
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightRail: {
    position: 'absolute',
    right: 12,
    top: '35%',
    gap: 10,
  },
  railButton: {
    width: 52,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  railCount: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 11,
  },

  bottomOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    gap: 10,
  },
  chatPreview: {
    alignSelf: 'flex-start',
    maxWidth: '78%',
    gap: 6,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatUser: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
  },
  chatMsg: {
    flexShrink: 1,
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatInputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.cardSolid,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chatInputText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  bottomIconButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: COLORS.cardSolid,
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
