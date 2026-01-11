import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  category: string;
  icon: keyof typeof MaterialIcons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
  iconSet: 'MaterialIcons' | 'MaterialCommunityIcons';
  color: string;
  questions: FAQItem[];
}

interface PolicyItem {
  id: string;
  title: string;
  summary: string;
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    category: 'Getting Started',
    icon: 'account-circle',
    iconSet: 'MaterialIcons',
    color: '#3B82F6',
    questions: [
      {
        q: 'How do I create an account?',
        a: "Click \"Sign Up\" on the login page. You can register with email, Google, or Apple. You'll need to verify your email to access all features.",
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
    icon: 'monetization-on',
    iconSet: 'MaterialIcons',
    color: '#EAB308',
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
        a: "Go to Wallet → Cash Out. You'll need to set up Stripe Connect first. Minimum cashout is 10,000 diamonds ($100).",
      },
    ],
  },
  {
    category: 'Sending Gifts',
    icon: 'card-giftcard',
    iconSet: 'MaterialIcons',
    color: '#EC4899',
    questions: [
      {
        q: 'How do I send a gift?',
        a: "Click on a streamer's tile in the grid, then click the gift icon. Select a gift and click Send. The streamer will see an animation!",
      },
      {
        q: 'Can I get a refund on gifts?',
        a: "Gifts are final once sent and cannot be refunded. Make sure you're sending to the right streamer!",
      },
    ],
  },
  {
    category: 'Streaming',
    icon: 'videocam',
    iconSet: 'MaterialIcons',
    color: '#EF4444',
    questions: [
      {
        q: 'What equipment do I need to stream?',
        a: 'A webcam and microphone are required. Most laptops have these built in. For best quality, use a dedicated webcam and good lighting.',
      },
      {
        q: 'Why is my video not showing?',
        a: "Check that you've granted camera permissions in your browser. Try refreshing the page or using a different browser. Make sure no other app is using your camera.",
      },
      {
        q: 'How do I apply for a room?',
        a: 'Go to Options → Apply for a Room. Fill out the application with your details. Our team will review and approve verified streamers.',
      },
    ],
  },
  {
    category: 'Safety & Privacy',
    icon: 'shield',
    iconSet: 'MaterialCommunityIcons',
    color: '#10B981',
    questions: [
      {
        q: 'How do I block someone?',
        a: "Click on their profile and select \"Block User\". You won't see their chat messages or streams, and they won't see yours.",
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

const REQUIRED_POLICIES: PolicyItem[] = [
  {
    id: 'terms-of-service',
    title: 'Terms of Service (MyLiveLinks)',
    summary: 'Rules for using MyLiveLinks, including user responsibilities and prohibited conduct.',
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy (MyLiveLinks)',
    summary: 'How we collect, use, share, and protect information.',
  },
  {
    id: 'community-guidelines',
    title: 'Community Guidelines (MyLiveLinks)',
    summary: 'Standards for safe and respectful use of MyLiveLinks.',
  },
  {
    id: 'payments-virtual-currency',
    title: 'Payments & Virtual Currency Policy (MyLiveLinks)',
    summary: 'Payments and virtual currency rules, including final-sale policy and teen payment restrictions.',
  },
  {
    id: 'fraud-chargeback',
    title: 'Fraud & Chargeback Policy (MyLiveLinks)',
    summary: 'Strict rules for fraud, disputes, reversals, and related enforcement consequences.',
  },
  {
    id: 'creator-earnings-payout',
    title: 'Creator Earnings & Payout Policy (MyLiveLinks)',
    summary: 'Creator payout eligibility, holds, and enforcement related to fraud and disputes.',
  },
  {
    id: 'dispute-arbitration',
    title: 'Dispute Resolution & Arbitration (MyLiveLinks)',
    summary: 'Dispute resolution requirements, including binding arbitration and class action waiver.',
  },
  {
    id: 'account-enforcement-termination',
    title: 'Account Enforcement & Termination Policy (MyLiveLinks)',
    summary: 'How we enforce rules and terminate accounts; includes strict no-appeals posture and teen-linked enforcement.',
  },
];

const RECOMMENDED_POLICIES: PolicyItem[] = [
  {
    id: 'aml-summary',
    title: '(Recommended) Anti-Money Laundering (AML) Summary (MyLiveLinks)',
    summary: 'Summary of AML-oriented risk controls for monetization features.',
  },
  {
    id: 'law-enforcement-cooperation',
    title: '(Recommended) Law Enforcement Cooperation Statement (MyLiveLinks)',
    summary: 'How we respond to lawful requests and preserve records.',
  },
  {
    id: 'transparency-enforcement-overview',
    title: '(Recommended) Transparency & Enforcement Overview (MyLiveLinks)',
    summary: 'High-level overview of enforcement and reporting posture.',
  },
];

export default function HelpSafetyScreen() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Getting Started');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const toggleQuestion = (key: string) => {
    setExpandedQuestion(expandedQuestion === key ? null : key);
  };

  const renderIcon = (section: FAQSection) => {
    if (section.iconSet === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={section.icon as any} size={20} color={section.color} />;
    }
    return <MaterialIcons name={section.icon as any} size={20} color={section.color} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <MaterialIcons name="help-outline" size={28} color="#10B981" />
          <Text style={styles.headerTitle}>Help & Safety</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ_SECTIONS.map((section) => {
            const isExpanded = expandedCategory === section.category;
            return (
              <View key={section.category} style={styles.faqCategory}>
                <TouchableOpacity
                  style={styles.categoryButton}
                  onPress={() => toggleCategory(section.category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryLeft}>
                      {renderIcon(section)}
                      <Text style={styles.categoryTitle}>{section.category}</Text>
                      <Text style={styles.questionCount}>{section.questions.length} questions</Text>
                    </View>
                    <MaterialIcons
                      name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={24}
                      color="#9CA3AF"
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.questionsContainer}>
                    {section.questions.map((qa, index) => {
                      const key = `${section.category}-${index}`;
                      const isQExpanded = expandedQuestion === key;
                      return (
                        <View key={key} style={styles.questionItem}>
                          <TouchableOpacity
                            onPress={() => toggleQuestion(key)}
                            activeOpacity={0.7}
                            style={styles.questionButton}
                          >
                            <Text style={styles.questionText}>{qa.q}</Text>
                            <MaterialIcons
                              name={isQExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                              size={20}
                              color="#9CA3AF"
                            />
                          </TouchableOpacity>
                          {isQExpanded && <Text style={styles.answerText}>{qa.a}</Text>}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Policies</Text>
          {REQUIRED_POLICIES.map((policy) => (
            <View key={policy.id} style={styles.policyCard}>
              <Text style={styles.policyTitle}>{policy.title}</Text>
              <Text style={styles.policySummary}>{policy.summary}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Policies</Text>
          {RECOMMENDED_POLICIES.map((policy) => (
            <View key={policy.id} style={styles.policyCard}>
              <Text style={styles.policyTitle}>{policy.title}</Text>
              <Text style={styles.policySummary}>{policy.summary}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Still need help? Contact us at{' '}
            <Text style={styles.footerLink}>brad@mylivelinks.com</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  faqCategory: {
    marginBottom: 12,
  },
  categoryButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  questionCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  questionsContainer: {
    marginTop: 8,
    paddingLeft: 16,
  },
  questionItem: {
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 16,
    marginBottom: 8,
  },
  questionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    paddingRight: 8,
  },
  answerText: {
    fontSize: 14,
    color: '#6B7280',
    paddingBottom: 12,
    lineHeight: 20,
  },
  policyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  policySummary: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerLink: {
    color: '#3B82F6',
  },
});

