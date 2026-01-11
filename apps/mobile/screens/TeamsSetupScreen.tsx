import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TeamsSetupScreen() {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');

  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [listInDiscover, setListInDiscover] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  const [notifAllActivity, setNotifAllActivity] = useState(true);
  const [notifLiveAlerts, setNotifLiveAlerts] = useState(true);
  const [notifMentionsOnly, setNotifMentionsOnly] = useState(false);
  const [notifChatMessages, setNotifChatMessages] = useState(true);

  const canSubmit = useMemo(() => teamName.trim().length > 0, [teamName]);

  const isDiscoverToggleEnabled = privacy === 'public';
  const isApprovalToggleEnabled = privacy === 'private';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerLabel}>TEAM SETUP</Text>
            <Text style={styles.headerTitle}>Create your team</Text>
            <Text style={styles.headerDescription}>
              Give your crew a name, a short description, and choose how people can find and join.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create your team</Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                Team name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={teamName}
                onChangeText={setTeamName}
                placeholder="e.g. The Night Owls"
                placeholderTextColor="rgba(255,255,255,0.45)"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={description}
                onChangeText={(text) => setDescription(text.substring(0, 200))}
                placeholder="What's your team about?"
                placeholderTextColor="rgba(255,255,255,0.45)"
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.textarea]}
              />
              <Text style={styles.helper}>{description.length}/200</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Privacy & access</Text>

            <Text style={styles.sectionHint}>
              Privacy mode is part of team creation. Discovery controls are separate from in-team settings.
            </Text>

            <View style={styles.segment}>
              <TouchableOpacity
                onPress={() => setPrivacy('public')}
                activeOpacity={0.85}
                style={[styles.segmentItem, privacy === 'public' && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, privacy === 'public' && styles.segmentTextActive]}>
                  Public
                </Text>
                <Text style={styles.segmentSubtext}>Anyone can find and join instantly.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPrivacy('private')}
                activeOpacity={0.85}
                style={[styles.segmentItem, privacy === 'private' && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, privacy === 'private' && styles.segmentTextActive]}>
                  Private
                </Text>
                <Text style={styles.segmentSubtext}>People need an invite or approval.</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>List in Discover</Text>
                <Text style={styles.rowSubtitle}>
                  {privacy === 'public'
                    ? 'Show your team in public discovery.'
                    : 'Private teams are not listed.'}
                </Text>
              </View>
              <Switch
                value={privacy === 'public' ? listInDiscover : false}
                onValueChange={setListInDiscover}
                disabled={!isDiscoverToggleEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(168,85,247,0.55)' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Require approval to join</Text>
                <Text style={styles.rowSubtitle}>
                  {privacy === 'private'
                    ? 'People can request access if they don’t have an invite.'
                    : 'Public teams don’t use join requests.'}
                </Text>
              </View>
              <Switch
                value={privacy === 'private' ? requireApproval : false}
                onValueChange={setRequireApproval}
                disabled={!isApprovalToggleEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(20,184,166,0.55)' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>

            <View style={[styles.row, styles.rowDisabled]}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Invite link</Text>
                <Text style={styles.rowSubtitle}>Generated after you create the team.</Text>
              </View>
              <Text style={styles.rowValue}>—</Text>
            </View>

            <View style={[styles.row, styles.rowDisabled]}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Invite code</Text>
                <Text style={styles.rowSubtitle}>Generated after you create the team.</Text>
              </View>
              <Text style={styles.rowValue}>—</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notifications</Text>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>All activity</Text>
                <Text style={styles.rowSubtitle}>Posts, threads, announcements.</Text>
              </View>
              <Switch
                value={notifAllActivity}
                onValueChange={setNotifAllActivity}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(168,85,247,0.55)' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Live alerts</Text>
                <Text style={styles.rowSubtitle}>When members go live.</Text>
              </View>
              <Switch
                value={notifLiveAlerts}
                onValueChange={setNotifLiveAlerts}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(168,85,247,0.55)' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Mentions only</Text>
                <Text style={styles.rowSubtitle}>Only notify when you’re @mentioned.</Text>
              </View>
              <Switch
                value={notifMentionsOnly}
                onValueChange={setNotifMentionsOnly}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(168,85,247,0.55)' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Chat messages</Text>
                <Text style={styles.rowSubtitle}>Team chat + live chat messages.</Text>
              </View>
              <Switch
                value={notifChatMessages}
                onValueChange={setNotifChatMessages}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(168,85,247,0.55)' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryCta, !canSubmit && styles.primaryCtaDisabled]}
            disabled={!canSubmit}
            onPress={() => {
              // UI-only
            }}
          >
            <Text style={styles.primaryCtaText}>Create team</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c16',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    paddingTop: 6,
    paddingHorizontal: 2,
    gap: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.5)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
  },
  headerDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHint: {
    marginTop: -6,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  required: {
    color: '#fb7185',
    fontWeight: '800',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  textarea: {
    minHeight: 96,
    paddingTop: 12,
  },
  helper: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
    marginTop: -2,
  },
  segment: {
    gap: 10,
    marginTop: 6,
  },
  segmentItem: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 4,
  },
  segmentItemActive: {
    borderColor: 'rgba(168,85,247,0.65)',
    backgroundColor: 'rgba(168,85,247,0.15)',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
  },
  segmentTextActive: {
    color: '#fff',
  },
  segmentSubtext: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.62)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.58)',
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  primaryCta: {
    backgroundColor: '#ec4899',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  primaryCtaDisabled: {
    opacity: 0.5,
  },
  primaryCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
