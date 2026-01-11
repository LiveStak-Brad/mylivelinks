import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type PoliciesScreenProps = {
  navigation: {
    navigate: (screen: string, params?: unknown) => void;
  };
};

type PolicyRow = {
  key: string;
  title: string;
  routeName: string;
};

const POLICY_ROWS: PolicyRow[] = [
  { key: 'terms', title: 'Terms of Service', routeName: 'TermsScreen' },
  { key: 'privacy', title: 'Privacy Policy', routeName: 'PrivacyScreen' },
  { key: 'data-deletion', title: 'Data Deletion', routeName: 'PoliciesDataDeletionScreen' },
];

function PolicyListRow({
  title,
  onPress,
  isLast,
}: {
  title: string;
  onPress: () => void;
  isLast: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, !isLast && styles.rowDivider]}
    >
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowChevron} accessibilityElementsHidden>
        {'\u203A'}
      </Text>
    </Pressable>
  );
}

export default function PoliciesScreen({ navigation }: PoliciesScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Policies</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.listCard}>
          {POLICY_ROWS.map((row, idx) => (
            <PolicyListRow
              key={row.key}
              title={row.title}
              isLast={idx === POLICY_ROWS.length - 1}
              onPress={() => navigation.navigate(row.routeName)}
            />
          ))}
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  listCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    backgroundColor: '#F9FAFB',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  rowChevron: {
    fontSize: 22,
    lineHeight: 22,
    color: '#9CA3AF',
    marginLeft: 12,
  },
});
