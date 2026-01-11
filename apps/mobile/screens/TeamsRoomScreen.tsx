import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TeamsRoomScreen() {
  const roomName = 'Team Room';
  const teamName = 'Creator Labs';

  const participants = useMemo(
    () => [
      { id: 'p-1', name: 'Nova', role: 'Host' as const },
      { id: 'p-2', name: 'Kai', role: 'Team' as const },
      { id: 'p-3', name: 'Ava', role: 'Team' as const },
      { id: 'p-4', name: 'Miles', role: 'Viewer' as const },
      { id: 'p-5', name: 'Luna', role: 'Viewer' as const },
      { id: 'p-6', name: 'Sage', role: 'Viewer' as const },
    ],
    []
  );

  const tiles = useMemo(
    () =>
      participants.map((p, index) => ({
        ...p,
        slot: index + 1,
      })),
    [participants]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleWrap}>
              <Text numberOfLines={1} style={styles.roomName}>
                {roomName}
              </Text>
              <View style={styles.teamRow}>
                <View style={styles.teamDot} />
                <Text numberOfLines={1} style={styles.teamName}>
                  {teamName}
                </Text>
              </View>
            </View>

            <View style={styles.participantsWrap} accessibilityLabel="Participants">
              <View style={styles.participantsPill}>
                <Ionicons name="people" size={14} color={COLORS.textSecondary} />
                <Text style={styles.participantsCount}>{participants.length}</Text>
              </View>

              <View style={styles.avatarStack} accessibilityLabel="Participant avatars">
                {participants.slice(0, 3).map((p, idx) => (
                  <View
                    key={p.id}
                    style={[
                      styles.avatarCircle,
                      idx === 0 ? styles.avatar1 : idx === 1 ? styles.avatar2 : styles.avatar3,
                      idx > 0 && { marginLeft: -10 },
                    ]}
                  >
                    <Text style={styles.avatarText}>{p.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                ))}
                {participants.length > 3 ? (
                  <View style={[styles.avatarCircle, styles.avatarMore, { marginLeft: -10 }]}>
                    <Text style={styles.avatarMoreText}>+{participants.length - 3}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.headerSubRow}>
            <View style={styles.intentPill}>
              <Ionicons name="eye" size={14} color={COLORS.textSecondary} />
              <Text style={styles.intentPillText}>Viewer</Text>
            </View>
            <View style={styles.intentPill}>
              <Ionicons name="chatbubbles" size={14} color={COLORS.textSecondary} />
              <Text style={styles.intentPillText}>Team chat</Text>
            </View>
            <View style={styles.intentPill}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.textSecondary} />
              <Text style={styles.intentPillText}>Room rules</Text>
            </View>
          </View>
        </View>

        {/* Participant tiles/grid placeholders */}
        <FlatList
          data={tiles}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <View style={styles.tileOuter}>
              <View style={styles.tile}>
                <View style={styles.tileTopRow}>
                  <View style={styles.slotPill}>
                    <Ionicons name="grid" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.slotText}>Slot {item.slot}</Text>
                  </View>
                  <View style={[styles.rolePill, item.role === 'Host' ? styles.roleHost : item.role === 'Team' ? styles.roleTeam : styles.roleViewer]}>
                    <Text style={styles.roleText}>{item.role}</Text>
                  </View>
                </View>

                <View style={styles.tileCenter}>
                  <View style={styles.tileIconCircle}>
                    <Ionicons name="videocam" size={20} color={COLORS.textSecondary} />
                  </View>
                  <Text numberOfLines={1} style={styles.tileName}>
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.tileSubtitle}>
                    Participant tile placeholder
                  </Text>
                </View>

                <View style={styles.tileBottomRow}>
                  <View style={styles.micPill}>
                    <Ionicons name="mic-off" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.micText}>Muted</Text>
                  </View>
                  <View style={styles.signalPill}>
                    <Ionicons name="cellular" size={14} color={COLORS.textSecondary} />
                  </View>
                </View>
              </View>
            </View>
          )}
        />

        {/* Bottom control bar (placeholders) */}
        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Join room"
            onPress={() => {}}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
          >
            <Ionicons name="log-in" size={18} color={COLORS.text} />
            <Text style={styles.primaryActionText}>Join</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chat"
            onPress={() => {}}
            style={({ pressed }) => [styles.chatAction, pressed && styles.pressed]}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.textSecondary} />
            <Text style={styles.chatActionText}>Chat…</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave room"
            onPress={() => {}}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
          >
            <Ionicons name="log-out" size={18} color={COLORS.red} />
            <Text style={styles.secondaryActionText}>Leave</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: '#0B0B0F',
  card: '#12121A',
  border: 'rgba(255,255,255,0.10)',
  text: '#F5F6FA',
  textSecondary: 'rgba(245,246,250,0.65)',
  primary: '#7C3AED',
  red: '#EF4444',
};

const GRID_GUTTER = 12;
const GRID_SIDE_PADDING = 16;
const CARD_SIDE_PADDING = GRID_GUTTER / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    paddingHorizontal: GRID_SIDE_PADDING,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  roomName: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: -0.2,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  teamName: {
    flexShrink: 1,
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
  participantsWrap: {
    alignItems: 'flex-end',
    gap: 8,
  },
  participantsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  participantsCount: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatar1: {
    backgroundColor: 'rgba(124,58,237,0.32)',
    borderColor: 'rgba(124,58,237,0.42)',
  },
  avatar2: {
    backgroundColor: 'rgba(59,130,246,0.28)',
    borderColor: 'rgba(59,130,246,0.38)',
  },
  avatar3: {
    backgroundColor: 'rgba(245,158,11,0.22)',
    borderColor: 'rgba(245,158,11,0.32)',
  },
  avatarText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
  },
  avatarMore: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: COLORS.border,
  },
  avatarMoreText: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 11,
  },
  headerSubRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  intentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intentPillText: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 12,
  },

  gridContent: {
    paddingHorizontal: GRID_SIDE_PADDING - CARD_SIDE_PADDING,
    paddingTop: 12,
    paddingBottom: 14,
  },
  gridRow: {
    paddingHorizontal: CARD_SIDE_PADDING,
  },
  tileOuter: {
    flex: 1,
    paddingHorizontal: CARD_SIDE_PADDING,
    paddingBottom: GRID_GUTTER,
  },
  tile: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: 12,
    minHeight: 190,
  },
  tileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slotText: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 11,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleHost: {
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderColor: 'rgba(239,68,68,0.22)',
  },
  roleTeam: {
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: 'rgba(124,58,237,0.24)',
  },
  roleViewer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border,
  },
  roleText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 11,
  },
  tileCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  tileIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  tileSubtitle: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  tileBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  micPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  micText: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 11,
  },
  signalPill: {
    width: 34,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomBar: {
    paddingHorizontal: GRID_SIDE_PADDING,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryActionText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 14,
  },
  chatAction: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatActionText: {
    color: COLORS.textSecondary,
    fontWeight: '900',
    fontSize: 14,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryActionText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 14,
  },
});
