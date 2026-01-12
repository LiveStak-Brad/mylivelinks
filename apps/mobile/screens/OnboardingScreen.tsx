import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to MyLiveLinks',
    description: 'Connect with creators through live streaming, battles, and interactive experiences.',
    emoji: '🎥',
  },
  {
    title: 'Go Live & Battle',
    description: 'Stream solo or challenge others in real-time battles. Earn coins and climb the leaderboards.',
    emoji: '⚔️',
  },
  {
    title: 'Send Gifts & Support',
    description: 'Show love to your favorite creators with gifts, coins, and diamonds.',
    emoji: '💎',
  },
  {
    title: 'Build Your Community',
    description: 'Follow creators, join teams, and connect with fans around the world.',
    emoji: '🌟',
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const themed = useMemo(
    () => ({
      bg: colors.bg,
      text: colors.text,
      mutedText: colors.mutedText,
      border: colors.border,
      dotInactive: colors.border,
    }),
    [colors]
  );

  const handleContinue = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    setCurrentStep(ONBOARDING_STEPS.length - 1);
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themed.bg }]}>
      <View style={styles.content}>
        <View style={styles.slideContainer}>
          <Text style={styles.emoji}>{step.emoji}</Text>
          <Text style={[styles.title, { color: themed.text }]}>{step.title}</Text>
          <Text style={[styles.description, { color: themed.mutedText }]}>{step.description}</Text>
        </View>

        <View style={styles.progressContainer}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                { backgroundColor: themed.dotInactive },
                index === currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {!isLastStep && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: themed.mutedText }]}>Skip</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={handleContinue}
            style={[styles.continueButton, isLastStep && styles.continueButtonLast]}
          >
            <Text style={styles.continueText}>
              {isLastStep ? 'Get Started' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width - 80,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: '#3b82f6',
    width: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonLast: {
    backgroundColor: '#10b981',
  },
  continueText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
