import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, PageShell } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpFAQ'>;

type QA = { q: string; a: string };

type Section = {
  category: string;
  icon: string;
  questions: QA[];
};

const FAQ_SECTIONS: Section[] = [
  {
    category: 'Getting Started',
    icon: '👤',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" on the login page. You can register with email, Google, or Apple. You\'ll need to verify your email to access all features.',
      },
      {
        q: 'How do I set up my profile?',
        a: 'Go to Options → Edit Profile. Add your display name, bio, avatar, and social media links. A complete profile helps you connect with others!',
      },
      {
        q: 'How do I go live?',
        a: 'Click the "Go Live" button in the top navigation. Make sure to allow camera and microphone access when prompted. Your stream will appear in the grid!',
      },
    ],
  },
  {
    category: 'Coins & Diamonds',
    icon: '🪙',
    questions: [
      {
        q: 'What are Coins?',
        a: 'Coins are the currency you use to send gifts to streamers. Purchase coins in the wallet section using real money.',
      },
      {
        q: 'What are Diamonds?',
        a: 'Diamonds are what streamers earn when they receive gifts. 100 diamonds = $1 USD. You can cash out diamonds once you reach the minimum threshold.',
      },
      {
        q: 'How do gift conversions work?',
        a: 'When you send a gift, the streamer receives diamonds 1:1 with the coins you spent.',
      },
      {
        q: 'How do I cash out my diamonds?',
        a: 'Go to Wallet → Cash Out. You\'ll need to set up Stripe Connect first. Minimum cashout is 10,000 diamonds ($100).',
      },
    ],
  },
  {
    category: 'Sending Gifts',
    icon: '🎁',
    questions: [
      {
        q: 'How do I send a gift?',
        a: 'Click on a streamer\'s tile in the grid, then click the gift icon. Select a gift and click Send. The streamer will see an animation!',
      },
      {
        q: 'Can I get a refund on gifts?',
        a: 'Gifts are final once sent and cannot be refunded. Make sure you\'re sending to the right streamer!',
      },
    ],
  },
  {
    category: 'Streaming',
    icon: '📺',
    questions: [
      {
        q: 'What equipment do I need to stream?',
        a: 'A webcam and microphone are required. Most laptops have these built in. For best quality, use a dedicated webcam and good lighting.',
      },
      {
        q: 'Why is my video not showing?',
        a: 'Check that you\'ve granted camera permissions in your browser. Try refreshing the page or using a different browser. Make sure no other app is using your camera.',
      },
      {
        q: 'How do I apply for a room?',
        a: 'Go to Options → Apply for a Room. Fill out the application with your details. Our team will review and approve verified streamers.',
      },
    ],
  },
  {
    category: 'Safety & Privacy',
    icon: '🛡️',
    questions: [
      {
        q: 'How do I block someone?',
        a: 'Click on their profile and select "Block User". You won\'t see their chat messages or streams, and they won\'t see yours.',
      },
      {
        q: 'How do I report a user?',
        a: 'Go to Options → Report a User, or click Report on their profile. Our moderation team reviews all reports.',
      },
      {
        q: 'Is my data safe?',
        a: 'We use industry-standard encryption and never share your personal data. Payment processing is handled securely by Stripe.',
      },
    ],
  },
];

export function HelpFAQScreen({ navigation }: Props) {
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expandedCategory, setExpandedCategory] = useState<string>('Getting Started');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const sections = useMemo(() => FAQ_SECTIONS, []);

  return (
    <PageShell
      title="Help & FAQ"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sections.map((section) => {
          const isExpanded = expandedCategory === section.category;
          return (
            <View key={section.category} style={styles.section}>
              <Pressable
                style={({ pressed }) => [styles.sectionHeader, pressed ? styles.pressed : null]}
                onPress={() => setExpandedCategory(isExpanded ? '' : section.category)}
              >
                <Text style={styles.sectionHeaderText}>
                  {section.icon} {section.category}
                </Text>
                <Text style={styles.sectionCount}>{section.questions.length} questions</Text>
              </Pressable>

              {isExpanded ? (
                <View style={styles.sectionBody}>
                  {section.questions.map((qa, idx) => {
                    const key = `${section.category}:${idx}`;
                    const isQExpanded = expandedQuestion === key;
                    return (
                      <View key={key} style={styles.qaItem}>
                        <Pressable
                          style={({ pressed }) => [styles.qaHeader, pressed ? styles.pressed : null]}
                          onPress={() => setExpandedQuestion(isQExpanded ? null : key)}
                        >
                          <Text style={styles.qaQ}>{qa.q}</Text>
                          <Text style={styles.qaChevron}>{isQExpanded ? '▲' : '▼'}</Text>
                        </Pressable>
                        {isQExpanded ? <Text style={styles.qaA}>{qa.a}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Still need help? Contact support@mylivelinks.com</Text>
        </View>
      </ScrollView>
    </PageShell>
  );
}

function createStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    headerButton: {
      height: 36,
      paddingHorizontal: 12,
    },
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    scroll: {
      paddingBottom: 24,
      gap: 12,
    },
    pressed: {
      opacity: 0.9,
    },
    section: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    sectionHeader: {
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    sectionHeaderText: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    sectionCount: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    sectionBody: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      padding: 10,
      gap: 8,
    },
    qaItem: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 10,
      backgroundColor: theme.colors.cardAlt,
    },
    qaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    qaQ: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    qaChevron: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '800',
    },
    qaA: {
      marginTop: 8,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    footer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    footerText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
  });
}

