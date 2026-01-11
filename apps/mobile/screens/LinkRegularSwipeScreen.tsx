import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LinkRegularSwipeScreen() {
  const profiles = useMemo(
    () => [
      {
        id: 'p1',
        displayName: 'Alex Rivers',
        username: 'alexr',
        locationText: 'Los Angeles',
        bio: 'Building products, filming behind-the-scenes, and meeting intentional people.\n\nLet’s link if you’re into startups, creator economy, or clean design.',
        tags: ['startups', 'creator', 'design', 'coffee'],
        photos: [0, 1, 2],
      },
      {
        id: 'p2',
        displayName: 'Maya Chen',
        username: 'mayac',
        locationText: 'Seattle',
        bio: 'Product + community. I host small meetups and love connecting people who actually build things.',
        tags: ['community', 'product', 'hiking'],
        photos: [0, 1],
      },
      {
        id: 'p3',
        displayName: 'Jordan King',
        username: 'jordank',
        locationText: 'New York',
        bio: 'Founder. Minimalist. Big on mutual respect.\n\nLink or nah — either way, keep it kind.',
        tags: ['founder', 'minimal', 'music'],
        photos: [0],
      },
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [forceEmpty, setForceEmpty] = useState(false);

  const totalCards = profiles.length;
  const hasMore = !forceEmpty && currentIndex < totalCards;
  const currentProfile = hasMore ? profiles[currentIndex] : null;

  const advance = () => {
    if (!hasMore) return;
    setCurrentIndex((prev) => prev + 1);
    setCurrentPhotoIndex(0);
  };

  const handleLink = () => advance();
  const handlePass = () => advance();

  const handleRefresh = () => {
    setForceEmpty(false);
    setCurrentIndex(0);
    setCurrentPhotoIndex(0);
  };

  const handleInfo = () => {
    // UI-only
    console.log('[LinkRegularSwipe] Info pressed');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => console.log('[LinkRegularSwipe] Back pressed')}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.title}>Link or Nah</Text>
            <Text style={styles.subtitle}>Build your network</Text>
          </View>

          <Pressable
            onPress={() => console.log('[LinkRegularSwipe] Settings pressed')}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.demoRow}>
          <Pressable
            onPress={() => setForceEmpty((prev) => !prev)}
            style={({ pressed }) => [styles.demoPill, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Toggle empty state"
          >
            <Ionicons name="toggle-outline" size={16} color="#2563EB" />
            <Text style={styles.demoPillText}>{forceEmpty ? 'Empty: On' : 'Empty: Off'}</Text>
          </Pressable>
        </View>

        <View style={styles.deck}>
          {!hasMore ? (
            <CaughtUpEmptyState onRefresh={handleRefresh} />
          ) : (
            <>
              {profiles.slice(currentIndex, currentIndex + 3).map((p, idx) => (
                <MockSwipeCard
                  key={p.id}
                  profile={p}
                  cardIndex={idx}
                  isTop={idx === 0}
                  currentPhotoIndex={currentPhotoIndex}
                  onTapLeft={() => {
                    if (!currentProfile) return;
                    setCurrentPhotoIndex((prev) => Math.max(0, prev - 1));
                  }}
                  onTapRight={() => {
                    if (!currentProfile) return;
                    setCurrentPhotoIndex((prev) => Math.min((currentProfile.photos.length || 1) - 1, prev + 1));
                  }}
                />
              ))}
            </>
          )}
        </View>

        {hasMore && (
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              {currentIndex + 1} of {totalCards}
            </Text>
          </View>
        )}

        {hasMore && (
          <SwipeActionBar
            primaryLabel="Link"
            secondaryLabel="Pass"
            onPrimary={handleLink}
            onSecondary={handlePass}
            onInfo={handleInfo}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SwipeActionBar({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onInfo,
}: {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onInfo?: () => void;
}) {
  const showInfo = Boolean(onInfo);

  return (
    <View style={styles.actionWrap}>
      <View style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <Text style={styles.actionHeaderLeft}>Actions</Text>
          <Text style={styles.actionHeaderRight}>Always available</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={onSecondary}
            style={({ pressed }) => [styles.roundBtn, styles.passBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>

          {showInfo && (
            <Pressable
              onPress={onInfo}
              style={({ pressed }) => [styles.roundBtnSm, styles.infoBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Profile info"
            >
              <Ionicons name="information-circle-outline" size={22} color="#111827" />
            </Pressable>
          )}

          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Ionicons name="link-outline" size={22} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function CaughtUpEmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name="sparkles-outline" size={22} color="#2563EB" />
      </View>

      <Text style={styles.emptyTitle}>No more profiles</Text>
      <Text style={styles.emptySubtitle}>You’re all caught up. Check back later for more Links.</Text>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Tip</Text>
        <Text style={styles.tipBody}>Turn on Auto-Link to link back instantly when someone follows you.</Text>
      </View>

      <View style={styles.emptyBtnRow}>
        <Pressable
          onPress={onRefresh}
          style={({ pressed }) => [styles.emptyPrimary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
          <Text style={styles.emptyPrimaryText}>Refresh</Text>
        </Pressable>

        <Pressable
          onPress={() => console.log('[LinkRegularSwipe] Edit Link Profile pressed')}
          style={({ pressed }) => [styles.emptySecondary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Edit Link Profile"
        >
          <Text style={styles.emptySecondaryText}>Edit Link Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MockSwipeCard({
  profile,
  cardIndex,
  isTop,
  currentPhotoIndex,
  onTapLeft,
  onTapRight,
}: {
  profile: {
    id: string;
    displayName: string;
    username: string;
    locationText: string;
    bio: string;
    tags: string[];
    photos: number[];
  };
  cardIndex: number;
  isTop: boolean;
  currentPhotoIndex: number;
  onTapLeft: () => void;
  onTapRight: () => void;
}) {
  const offset = cardIndex * 12;
  const scale = 1 - cardIndex * 0.05;
  const opacity = 1 - cardIndex * 0.28;

  const photosCount = Math.max(1, profile.photos.length || 1);
  const safePhotoIndex = Math.min(Math.max(0, currentPhotoIndex), photosCount - 1);

  return (
    <View
      pointerEvents={isTop ? 'auto' : 'none'}
      style={[
        styles.swipeCard,
        {
          transform: [{ translateY: offset }, { scale }],
          opacity,
          zIndex: 10 - cardIndex,
        },
      ]}
    >
      <View style={styles.photo}>
        <View style={styles.photoTopBars}>
          {Array.from({ length: photosCount }).map((_, idx) => (
            <View key={`${profile.id}-bar-${idx}`} style={[styles.photoBar, idx === safePhotoIndex && styles.photoBarActive]} />
          ))}
        </View>

        <View style={styles.photoPlaceholder}>
          <Ionicons name="image-outline" size={34} color="#64748B" />
          <Text style={styles.photoLabel}>
            Photo {safePhotoIndex + 1}/{photosCount}
          </Text>
        </View>

        {isTop && photosCount > 1 && (
          <View style={styles.photoTapZones}>
            <Pressable
              onPress={onTapLeft}
              style={styles.photoTapZone}
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
            />
            <Pressable
              onPress={onTapRight}
              style={styles.photoTapZone}
              accessibilityRole="button"
              accessibilityLabel="Next photo"
            />
          </View>
        )}
      </View>

      <ScrollView style={styles.info} contentContainerStyle={styles.infoContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderLeft}>
            <Text style={styles.profileName}>{profile.displayName}</Text>
            <Text style={styles.profileHandle}>@{profile.username}</Text>
          </View>
          <View style={styles.locationPill}>
            <Ionicons name="location-outline" size={14} color="#2563EB" />
            <Text style={styles.locationText}>{profile.locationText}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Bio</Text>
          <Text style={styles.blockBody}>{profile.bio}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Tags</Text>
          <View style={styles.tagRow}>
            {profile.tags.map((tag) => (
              <View key={`${profile.id}-${tag}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EEF2FF' },
  container: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
  },
  topBar: {
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#2563EB' },

  demoRow: { alignItems: 'center', paddingBottom: 10 },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  demoPillText: { fontSize: 12, fontWeight: '800', color: '#2563EB' },

  deck: {
    flex: 1,
    minHeight: 360,
    position: 'relative',
    paddingBottom: 12,
  },

  swipeCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 8,
  },
  photo: { height: '55%', minHeight: 240, backgroundColor: '#E5E7EB' },
  photoTopBars: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
    zIndex: 2,
  },
  photoBar: { flex: 1, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.45)' },
  photoBarActive: { backgroundColor: 'rgba(255,255,255,0.95)' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { marginTop: 10, fontSize: 12, fontWeight: '800', color: '#475569' },
  photoTapZones: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  photoTapZone: { flex: 1 },

  info: { flex: 1 },
  infoContent: { padding: 16, paddingBottom: 18, gap: 14 },
  profileHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  profileHeaderLeft: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: -0.2 },
  profileHandle: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#6B7280' },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  locationText: { fontSize: 12, fontWeight: '800', color: '#1F2937' },

  block: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  blockTitle: { fontSize: 12, fontWeight: '900', color: '#111827', marginBottom: 6, letterSpacing: 0.2 },
  blockBody: { fontSize: 13, fontWeight: '600', color: '#374151', lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: '800', color: '#3730A3' },

  statusRow: { alignItems: 'center', paddingVertical: 10 },
  statusText: { fontSize: 13, fontWeight: '800', color: '#2563EB' },

  actionWrap: { paddingBottom: 10 },
  actionCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 14,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  actionHeaderLeft: { fontSize: 11, fontWeight: '900', color: '#6B7280', letterSpacing: 0.8, textTransform: 'uppercase' },
  actionHeaderRight: { fontSize: 11, fontWeight: '900', color: '#2563EB', letterSpacing: 0.4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  roundBtn: { width: 64, height: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  passBtn: { backgroundColor: '#EF4444' },
  roundBtnSm: { width: 52, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  infoBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },

  primaryBtn: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },

  emptyCard: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center' },
  emptySubtitle: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  tipCard: {
    marginTop: 14,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  tipTitle: { fontSize: 12, fontWeight: '900', color: '#111827' },
  tipBody: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#6B7280', lineHeight: 16 },
  emptyBtnRow: { marginTop: 14, width: '100%', flexDirection: 'row', gap: 10 },
  emptyPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  emptyPrimaryText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  emptySecondary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySecondaryText: { fontSize: 13, fontWeight: '900', color: '#111827' },

  pressed: { opacity: 0.86 },
});
