import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ReferralsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="people" size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Referral Program</Text>
            <Text style={styles.subtitle}>Invite friends and earn rewards</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="share-social" size={20} color="#8b5cf6" />
            <Text style={styles.cardTitle}>Your Referral Link</Text>
          </View>
          
          <View style={styles.linkBox}>
            <Text style={styles.linkText}>https://www.mylivelinks.com/invite/username</Text>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]}>
              <Ionicons name="copy-outline" size={16} color="#fff" />
              <Text style={styles.buttonText}>Copy Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonPrimary]}>
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Link Clicks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueSuccess]}>0</Text>
            <Text style={styles.statLabel}>Signups</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueWarning]}>0</Text>
            <Text style={styles.statLabel}>Coins Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValuePrimary]}>—</Text>
            <Text style={styles.statLabel}>Your Rank</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color="#8b5cf6" />
            <Text style={styles.cardTitle}>How It Works</Text>
          </View>
          
          <View style={styles.stepsList}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share Your Link</Text>
                <Text style={styles.stepDescription}>
                  Share your unique referral link with friends on social media, messages, or anywhere you like.
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Friends Sign Up</Text>
                <Text style={styles.stepDescription}>
                  When someone signs up using your link, they become your referral and you both get rewarded.
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Earn Rewards</Text>
                <Text style={styles.stepDescription}>
                  Get coins for each successful referral and climb the leaderboard for bonus rewards!
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.ctaCard}>
          <View style={styles.ctaIcon}>
            <Ionicons name="trophy" size={32} color="#fff" />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Compete on the Leaderboard</Text>
            <Text style={styles.ctaDescription}>
              See how you rank against other top referrers and compete for exclusive prizes.
            </Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Ionicons name="ribbon" size={16} color="#fff" />
              <Text style={styles.ctaButtonText}>View Leaderboard</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  linkBox: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#374151',
  },
  buttonPrimary: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statValueSuccess: {
    color: '#10b981',
  },
  statValueWarning: {
    color: '#f59e0b',
  },
  statValuePrimary: {
    color: '#8b5cf6',
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  stepsList: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  ctaCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
  },
  ctaIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ctaContent: {
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
