import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { showComingSoon } from '../lib/showComingSoon';

export default function PoliciesDataDeletionScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>User Data Deletion</Text>

        <View style={styles.card}>
          <Text style={styles.paragraph}>
            If you would like to request deletion of your MyLiveLinks account data, you can contact our support team to start the process.
          </Text>
          <Text style={styles.paragraph}>
            This request is commonly used for accounts created using Facebook Login, but you may submit a request for any account.
          </Text>
          <Text style={styles.paragraph}>
            Please include the email address associated with your MyLiveLinks account so we can locate and verify the correct account.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How to request deletion</Text>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Email us at <Text style={styles.mono}>brad@mylivelinks.com</Text> with the subject “Data Deletion Request”.
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              In your message, include the email address associated with your MyLiveLinks account (and any username/ID if available).
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              We will process the deletion within a reasonable timeframe in accordance with applicable laws.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Request data deletion"
          onPress={() => showComingSoon('Data deletion request')}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>Request Data Deletion</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          Note: This screen provides instructions only. Your request must be submitted by email.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#131320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  paragraph: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 20,
  },
  mono: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cta: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#5B5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerNote: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
  },
});
