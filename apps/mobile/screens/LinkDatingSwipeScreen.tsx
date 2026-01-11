import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LinkDatingSwipeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [candidates] = useState([
    {
      id: '1',
      displayName: 'Sample Profile',
      username: 'sample',
      bio: 'Looking for meaningful connections and someone who loves adventure. I enjoy hiking, trying new restaurants, and cozy movie nights.',
      photos: [],
      location: 'New York, NY',
      interests: ['Travel', 'Music', 'Fitness', 'Cooking'],
      orientation: 'Straight',
    },
  ]);

  const currentCandidate = candidates[currentIndex];
  const hasMore = currentIndex < candidates.length;

  const handleSwipe = (direction: 'left' | 'right') => {
    if (currentIndex < candidates.length) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentPhotoIndex(0);
    }
  };

  const handlePhotoNav = (direction: 'prev' | 'next') => {
    if (!currentCandidate?.photos?.length) return;
    
    if (direction === 'prev') {
      setCurrentPhotoIndex((prev) => Math.max(0, prev - 1));
    } else {
      setCurrentPhotoIndex((prev) => Math.min(currentCandidate.photos.length - 1, prev + 1));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>💗 Dating</Text>
          <Text style={styles.headerSubtitle}>Find your match</Text>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="person-circle-outline" size={28} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContainer}>
        {!hasMore ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>💕</Text>
            </View>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for more profiles.{'\n'}
              New matches appear daily!
            </Text>
            <TouchableOpacity style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.refreshIcon} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardStack}>
            {candidates.slice(currentIndex, currentIndex + 3).map((candidate, idx) => {
              const offset = idx * 10;
              const scale = 1 - idx * 0.04;
              const opacity = 1 - idx * 0.25;
              const isTopCard = idx === 0;

              return (
                <View
                  key={candidate.id}
                  style={[
                    styles.card,
                    {
                      transform: [{ translateY: offset }, { scale }],
                      opacity,
                      zIndex: 10 - idx,
                    },
                  ]}
                >
                  <View style={styles.cardPhoto}>
                    {candidate.photos && candidate.photos.length > 0 ? (
                      <>
                        <Image
                          source={{ uri: candidate.photos[currentPhotoIndex] }}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                        {isTopCard && candidate.photos.length > 1 && (
                          <>
                            <View style={styles.photoIndicators}>
                              {candidate.photos.map((_, photoIdx) => (
                                <View
                                  key={photoIdx}
                                  style={[
                                    styles.photoIndicator,
                                    photoIdx === currentPhotoIndex && styles.photoIndicatorActive,
                                  ]}
                                />
                              ))}
                            </View>
                            <View style={styles.photoNavOverlay}>
                              <TouchableOpacity
                                style={styles.photoNavLeft}
                                onPress={() => handlePhotoNav('prev')}
                                activeOpacity={0.7}
                              />
                              <TouchableOpacity
                                style={styles.photoNavRight}
                                onPress={() => handlePhotoNav('next')}
                                activeOpacity={0.7}
                              />
                            </View>
                          </>
                        )}
                      </>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons name="camera-outline" size={80} color="#D1D5DB" />
                      </View>
                    )}
                  </View>

                  <ScrollView style={styles.cardInfo} showsVerticalScrollIndicator={false}>
                    <View style={styles.cardInfoContent}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.cardName}>{candidate.displayName}</Text>
                          <Text style={styles.cardUsername}>@{candidate.username}</Text>
                        </View>
                      </View>

                      {candidate.location && (
                        <View style={styles.cardLocationRow}>
                          <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                          <Text style={styles.cardLocation}>{candidate.location}</Text>
                        </View>
                      )}

                      {candidate.orientation && (
                        <View style={styles.orientationBadge}>
                          <Text style={styles.orientationText}>{candidate.orientation}</Text>
                        </View>
                      )}

                      <Text style={styles.cardBio}>{candidate.bio}</Text>

                      {candidate.interests && candidate.interests.length > 0 && (
                        <View style={styles.interestsSection}>
                          <Text style={styles.interestsTitle}>Interests</Text>
                          <View style={styles.interestsContainer}>
                            {candidate.interests.map((interest, interestIdx) => (
                              <View key={interestIdx} style={styles.interestTag}>
                                <Text style={styles.interestTagText}>{interest}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {hasMore && (
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentIndex + 1} of {candidates.length}
          </Text>
        </View>
      )}

      {hasMore && currentCandidate && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={() => handleSwipe('left')}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={36} color="#DC2626" />
            <Text style={styles.actionButtonLabel}>Nah</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoButton} activeOpacity={0.8}>
            <Ionicons name="information-circle-outline" size={24} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => handleSwipe('right')}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={36} color="#EC4899" />
            <Text style={styles.actionButtonLabel}>Like</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#EC4899',
    marginTop: 2,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  cardStack: {
    flex: 1,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  cardPhoto: {
    height: '52%',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  photoIndicators: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  photoIndicator: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },
  photoIndicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  photoNavOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  photoNavLeft: {
    flex: 1,
  },
  photoNavRight: {
    flex: 1,
  },
  cardInfo: {
    flex: 1,
  },
  cardInfoContent: {
    padding: 20,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardUsername: {
    fontSize: 16,
    color: '#6B7280',
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  cardLocation: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  orientationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  orientationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EC4899',
  },
  cardBio: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  interestsSection: {
    marginTop: 4,
  },
  interestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  interestTagText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  counterContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EC4899',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  passButton: {
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: '#FECDD3',
  },
  actionButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    color: '#6B7280',
  },
  infoButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#EC4899',
    borderRadius: 16,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshIcon: {
    marginRight: 4,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
