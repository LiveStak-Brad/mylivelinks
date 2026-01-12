import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../theme/useTheme';

type PickerItem = {
  id: string;
  label: string;
  description?: string;
  right?: React.ReactNode;
};

// Theme context for helper components
type ThemedColors = {
  bg: string;
  card: string;
  card2: string;
  border: string;
  text: string;
  muted: string;
  muted2: string;
  inputBg: string;
  inputBorder: string;
  blue600: string;
  purple600: string;
  pink600: string;
  green600: string;
  amber600: string;
  red600: string;
  white: string;
  infoCardBg: string;
  infoCardBorder: string;
  infoCardNeutralBg: string;
  avatarBg: string;
  avatarText: string;
};

const ThemedColorsContext = createContext<ThemedColors | null>(null);

function useThemedColors(): ThemedColors {
  const ctx = useContext(ThemedColorsContext);
  // Fallback to dark colors if context not available
  if (!ctx) {
    return {
      bg: COLORS.bg,
      card: COLORS.card,
      card2: COLORS.card2,
      border: COLORS.border,
      text: COLORS.text,
      muted: COLORS.muted,
      muted2: COLORS.muted2,
      inputBg: 'rgba(255,255,255,0.04)',
      inputBorder: 'rgba(255,255,255,0.08)',
      blue600: COLORS.blue600,
      purple600: COLORS.purple600,
      pink600: COLORS.pink600,
      green600: COLORS.green600,
      amber600: COLORS.amber600,
      red600: COLORS.red600,
      white: COLORS.white,
      infoCardBg: 'rgba(37,99,235,0.16)',
      infoCardBorder: 'rgba(37,99,235,0.28)',
      infoCardNeutralBg: COLORS.card,
      avatarBg: '#7C3AED',
      avatarText: '#FFFFFF',
    };
  }
  return ctx;
}

function Divider() {
  const themed = useThemedColors();
  return <View style={[styles.divider, { backgroundColor: themed.border }]} />;
}

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const themed = useThemedColors();
  return (
    <View style={[styles.card, { backgroundColor: themed.card, borderColor: themed.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {icon ? (
            <View style={[styles.cardIconWrap, { backgroundColor: themed.card2, borderColor: themed.border }]}>
              {icon}
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: themed.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.cardSubtitle, { color: themed.muted }]}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  hint,
  leftIcon,
  right,
  disabled,
  onPress,
}: {
  label: string;
  value?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  right?: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const themed = useThemedColors();
  const content = (
    <View style={[styles.row, { backgroundColor: themed.card2, borderColor: themed.border }, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        {leftIcon ? <View style={[styles.rowIcon, { backgroundColor: themed.card, borderColor: themed.border }]}>{leftIcon}</View> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: themed.text }]}>{label}</Text>
          {value ? <Text style={[styles.rowValue, { color: themed.muted }]}>{value}</Text> : null}
          {hint ? <Text style={[styles.rowHint, { color: themed.muted2 }]}>{hint}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {right ?? <Ionicons name="chevron-forward" size={18} color={themed.muted} />}
      </View>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ borderRadius: 12 }}>
      {content}
    </Pressable>
  );
}

function Button({
  label,
  iconName,
  tone = 'secondary',
  disabled,
  onPress,
}: {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onPress?: () => void;
}) {
  const themed = useThemedColors();
  const toneStyle =
    tone === 'primary'
      ? styles.btnPrimary
      : tone === 'danger'
        ? styles.btnDanger
        : styles.btnSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.btn,
        toneStyle,
        tone === 'secondary' && { backgroundColor: themed.card, borderColor: themed.border },
        (disabled || !onPress) && styles.btnDisabled,
        pressed && !(disabled || !onPress) && styles.btnPressed,
      ]}
    >
      {iconName ? (
        <Ionicons
          name={iconName}
          size={18}
          color={tone === 'primary' ? themed.white : tone === 'danger' ? themed.red600 : themed.text}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text style={[styles.btnText, tone === 'primary' ? styles.btnPrimaryText : tone === 'danger' ? styles.btnDangerText : { color: themed.text }]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  disabled,
  multiline,
  right,
  keyboardType,
  maxLength,
}: {
  label: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  helper?: string;
  disabled?: boolean;
  multiline?: boolean;
  right?: React.ReactNode;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'url';
  maxLength?: number;
}) {
  const themed = useThemedColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: themed.text }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: themed.inputBg, borderColor: themed.inputBorder }, disabled && styles.inputWrapDisabled]}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={themed.muted}
          editable={!disabled}
          multiline={multiline}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          style={[styles.input, { color: themed.text }, multiline && styles.inputMultiline]}
        />
        {right ? <View style={styles.inputRight}>{right}</View> : null}
      </View>
      {helper ? <Text style={[styles.fieldHelper, { color: themed.muted2 }]}>{helper}</Text> : null}
    </View>
  );
}

function Chip({ label, selected, disabled }: { label: string; selected?: boolean; disabled?: boolean }) {
  const themed = useThemedColors();
  return (
    <View
      style={[
        styles.chip,
        selected ? styles.chipSelected : { backgroundColor: themed.card2, borderColor: themed.border },
        disabled && styles.chipDisabled,
      ]}
    >
      <Text style={[styles.chipText, { color: disabled ? themed.muted : themed.text }]}>
        {label}
      </Text>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  subtitle,
  items,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  items: PickerItem[];
  onClose: () => void;
}) {
  const themed = useThemedColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: themed.card, borderColor: themed.border }]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: themed.text }]}>{title}</Text>
              {subtitle ? <Text style={[styles.modalSubtitle, { color: themed.muted }]}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={themed.text} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 12 }}>
            {items.map((it, idx) => (
              <View key={it.id}>
                <View style={styles.modalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalRowTitle, { color: themed.text }]}>{it.label}</Text>
                    {it.description ? <Text style={[styles.modalRowDesc, { color: themed.muted }]}>{it.description}</Text> : null}
                  </View>
                  {it.right}
                </View>
                {idx < items.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button label="Done" tone="primary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const COLORS = {
  bg: '#0B1220',
  card: '#0F1A2E',
  card2: '#0E1930',
  border: 'rgba(255,255,255,0.08)',
  text: '#EAF0FF',
  muted: 'rgba(234,240,255,0.62)',
  muted2: 'rgba(234,240,255,0.45)',
  blue600: '#2563EB',
  purple600: '#7C3AED',
  pink600: '#DB2777',
  green600: '#16A34A',
  amber600: '#D97706',
  red600: '#DC2626',
  white: '#FFFFFF',
};

export default function SettingsProfileScreen() {
  const { mode, colors } = useTheme();
  const currentUser = useCurrentUser();

  // Theme-driven colors that override the static COLORS object
  const themed = useMemo(
    () => ({
      bg: colors.bg,
      card: mode === 'dark' ? '#0F1A2E' : colors.surface,
      card2: mode === 'dark' ? '#0E1930' : colors.surface,
      border: mode === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
      text: colors.text,
      muted: colors.mutedText,
      muted2: (colors as any).subtleText ?? colors.mutedText,
      inputBg: mode === 'dark' ? 'rgba(255,255,255,0.04)' : colors.surface,
      inputBorder: mode === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border,
      // Accent colors (same in both modes)
      blue600: '#2563EB',
      purple600: '#7C3AED',
      pink600: '#DB2777',
      green600: '#16A34A',
      amber600: '#D97706',
      red600: '#DC2626',
      white: '#FFFFFF',
      // Info card styling
      infoCardBg: mode === 'dark' ? 'rgba(37,99,235,0.16)' : 'rgba(37,99,235,0.08)',
      infoCardBorder: mode === 'dark' ? 'rgba(37,99,235,0.28)' : 'rgba(37,99,235,0.2)',
      infoCardNeutralBg: mode === 'dark' ? '#0F1A2E' : colors.surface,
      // Avatar
      avatarBg: mode === 'dark' ? '#7C3AED' : 'rgba(124, 58, 237, 0.15)',
      avatarText: mode === 'dark' ? '#FFFFFF' : '#7C3AED',
    }),
    [mode, colors]
  );

  const userId = currentUser.userId;
  const profile = currentUser.profile;

  const profileUsername = profile?.username != null ? String(profile.username) : '';
  const profileDisplayName = profile?.display_name != null ? String(profile.display_name) : '';
  const profileBio = profile && Object.prototype.hasOwnProperty.call(profile, 'bio') ? String((profile as any).bio ?? '') : '';

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize (and re-sync when profile refreshes) as long as the user isn't actively editing/saving.
    if (saving) return;
    setDisplayName(profileDisplayName);
    setBio(profileBio);
  }, [profileBio, profileDisplayName, saving]);

  const dirty = useMemo(() => {
    const nextDisplay = displayName.trim();
    const nextBio = bio.trim();
    return nextDisplay !== profileDisplayName.trim() || nextBio !== profileBio.trim();
  }, [bio, displayName, profileBio, profileDisplayName]);

  const canSave = Boolean(userId) && !currentUser.loading && !saving && dirty;

  const handleCancel = useCallback(() => {
    setDisplayName(profileDisplayName);
    setBio(profileBio);
  }, [profileBio, profileDisplayName]);

  const handleSave = useCallback(async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const updates: Record<string, any> = {
        display_name: displayName.trim() || null,
      };

      // Only attempt columns that exist on the loaded row (avoids schema mismatch surprises).
      if (profile && Object.prototype.hasOwnProperty.call(profile, 'bio')) {
        updates.bio = bio.trim() || null;
      }

      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) {
        console.error('[SettingsProfileScreen] profiles update error:', error.message);
        Alert.alert('Save failed', error.message);
        return;
      }

      await currentUser.refresh();
    } catch (e: any) {
      console.error('[SettingsProfileScreen] save exception:', e);
      Alert.alert('Save failed', e?.message || 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }, [bio, currentUser, displayName, profile, userId]);

  const [modulesModalOpen, setModulesModalOpen] = useState(false);
  const [tabsModalOpen, setTabsModalOpen] = useState(false);

  const modules = useMemo<PickerItem[]>(
    () => [
      {
        id: 'social_counts',
        label: 'Social Counts',
        description: 'Follower/following/friends counts',
        right: <Switch value={true} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />,
      },
      {
        id: 'social_media',
        label: 'Social Media Links',
        description: 'Instagram, Twitter, TikTok icons',
        right: <Switch value={true} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />,
      },
      {
        id: 'links',
        label: 'Custom Links',
        description: 'Your Linktree-style link section',
        right: <Switch value={true} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />,
      },
      {
        id: 'connections',
        label: 'Connections',
        description: 'Friends and followers display',
        right: <Switch value={false} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />,
      },
      {
        id: 'streaming_stats',
        label: 'Streaming Stats',
        description: 'Live hours, viewer counts',
        right: <Switch value={true} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />,
      },
      {
        id: 'top_supporters',
        label: 'Top Supporters',
        description: 'Users who gifted you',
        right: <Switch value={true} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />,
      },
      {
        id: 'portfolio',
        label: 'Portfolio / Products',
        description: 'Your work showcase',
        right: <Switch value={false} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />,
      },
    ],
    [themed]
  );

  const tabs = useMemo<PickerItem[]>(
    () => [
      { id: 'info', label: 'Info', description: 'Core tab (always on)', right: <Switch value={true} disabled /> },
      { id: 'feed', label: 'Feed', description: 'Photo/video feed grid', right: <Switch value={true} disabled /> },
      { id: 'reels', label: 'Reels', description: 'Short-form video content', right: <Switch value={false} disabled /> },
      { id: 'photos', label: 'Photos', description: 'Photo gallery', right: <Switch value={false} disabled /> },
      { id: 'videos', label: 'Videos', description: 'Video gallery', right: <Switch value={true} disabled /> },
      { id: 'music', label: 'Music', description: 'Music tracks & playlists', right: <Switch value={false} disabled /> },
      { id: 'events', label: 'Events', description: 'Shows & performances', right: <Switch value={false} disabled /> },
      { id: 'products', label: 'Products', description: 'Merchandise & portfolio', right: <Switch value={false} disabled /> },
    ],
    []
  );

  return (
    <ThemedColorsContext.Provider value={themed}>
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themed.bg }]}>
      <PickerModal
        visible={modulesModalOpen}
        title="Customize Profile Modules"
        subtitle="Add or remove modules (UI only)"
        items={modules}
        onClose={() => setModulesModalOpen(false)}
      />
      <PickerModal
        visible={tabsModalOpen}
        title="Manage Profile Tabs"
        subtitle="Select which tabs appear on your profile (UI only)"
        items={tabs}
        onClose={() => setTabsModalOpen(false)}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.screenTitle, { color: themed.text }]}>Edit Profile</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.linkPill}>
              <Ionicons name="person-circle-outline" size={16} color={themed.blue600} style={{ marginRight: 6 }} />
              <Text style={[styles.linkPillText, { color: themed.blue600 }]}>View Profile</Text>
            </View>
            <View style={styles.linkPill}>
              <Ionicons name="key-outline" size={16} color={themed.blue600} style={{ marginRight: 6 }} />
              <Text style={[styles.linkPillText, { color: themed.blue600 }]}>Change password</Text>
            </View>
          </View>
        </View>

        {/* Account & Security quick link */}
        <View style={[styles.infoCard, { backgroundColor: themed.infoCardBg, borderColor: themed.infoCardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoCardTitle, { color: themed.text }]}>Need to change your email or password?</Text>
            <Text style={[styles.infoCardSubtitle, { color: themed.muted }]}>Go to Account & Security to update login details.</Text>
          </View>
          <View style={styles.infoCardBtn}>
            <Text style={styles.infoCardBtnText}>Account & Security</Text>
            <Ionicons name="chevron-forward" size={18} color={themed.white} />
          </View>
        </View>

        {/* Download app */}
        <View style={[styles.infoCardNeutral, { backgroundColor: themed.infoCardNeutralBg, borderColor: themed.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoCardTitle, { color: themed.text }]}>Download the app</Text>
            <Text style={[styles.infoCardSubtitle, { color: themed.muted }]}>Install Live Links on your home screen for faster access.</Text>
          </View>
          <View style={[styles.infoCardBtn, { backgroundColor: themed.purple600, opacity: 0.6 }]}>
            <Ionicons name="download-outline" size={18} color={themed.white} style={{ marginRight: 6 }} />
            <Text style={styles.infoCardBtnText}>Install</Text>
          </View>
        </View>

        {/* Profile Photo */}
        <Card
          title="Profile Photo"
          icon={<Ionicons name="camera-outline" size={18} color={themed.blue600} />}
        >
          <View style={styles.photoRow}>
            <View style={[styles.avatar, { backgroundColor: themed.avatarBg, borderColor: themed.infoCardBorder }]}>
              <Text style={[styles.avatarText, { color: themed.avatarText }]}>
                {(profileDisplayName || profileUsername || 'U').trim().slice(0, 1).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Button label="Change Photo" iconName="image-outline" />
                <Button
                  label={saving ? 'Saving…' : 'Save Profile'}
                  iconName="save-outline"
                  tone="primary"
                  disabled={!canSave}
                  onPress={handleSave}
                />
              </View>
              {dirty ? <Text style={[styles.mutedNote, { color: themed.muted2 }]}>You have unsaved changes.</Text> : null}
            </View>
          </View>
        </Card>

        {/* Basic Info */}
        <Card title="Basic Info" icon={<Ionicons name="id-card-outline" size={18} color={themed.blue600} />}>
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Username</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={[
                  styles.inputWrap,
                  { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder },
                  styles.inputWrapDisabled,
                ]}
              >
                <TextInput
                  placeholder="username"
                  placeholderTextColor={themed.muted}
                  editable={false}
                  value={currentUser.loading ? '' : profileUsername}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
              <Button label="Change Username" iconName="create-outline" disabled />
            </View>
            <Text style={[styles.fieldHelper, { color: themed.muted }]}>Your unique identifier: mylivelinks.com/username</Text>
          </View>

          <Field
            label="Display Name"
            placeholder="Your display name"
            value={displayName}
            onChangeText={setDisplayName}
            disabled={currentUser.loading || saving}
          />
          <Field
            label="Bio"
            placeholder="Tell us about yourself"
            multiline
            maxLength={500}
            helper={`${bio.length}/500`}
            value={bio}
            onChangeText={setBio}
            disabled={currentUser.loading || saving}
          />
        </Card>

        {/* Location (web LocationEditor) */}
        <Card
          title="Location (Optional)"
          subtitle="Set a ZIP code to show city/region. Self-reported only."
          icon={<Ionicons name="location-outline" size={18} color={themed.blue600} />}
        >
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.smallMuted, { color: themed.muted }]}>
              This helps with local discovery. You can hide it anytime.
            </Text>
          </View>

          <View style={{ marginBottom: 10 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>ZIP Code</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="e.g. 90012"
                  placeholderTextColor={themed.muted}
                  keyboardType="numeric"
                  maxLength={5}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
              <Button label="Set" tone="primary" disabled />
            </View>
          </View>

          <Field label="Area label (optional)" placeholder='e.g. "St. Louis Metro"' maxLength={48} />

          <View style={[styles.noticeBox, { borderColor: themed.infoCardBorder, backgroundColor: themed.infoCardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={18} color={themed.blue600} style={{ marginRight: 8 }} />
              <Text style={[styles.noticeTitle, { color: themed.text }]}>Self-reported only</Text>
            </View>
            <Text style={[styles.noticeText, { color: themed.muted }]}>No location saved yet.</Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: themed.text }]}>Hide location from others</Text>
              <Switch value={false} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />
            </View>
            <Divider />
            <View style={[styles.toggleRow, { opacity: 0.6 }]}>
              <Text style={[styles.toggleLabel, { color: themed.text }]}>Show ZIP publicly</Text>
              <Switch value={false} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />
            </View>
          </View>
        </Card>

        {/* About */}
        <Card title="About" icon={<Ionicons name="information-circle-outline" size={18} color={themed.blue600} />}>
          <View style={{ marginBottom: 10 }}>
            <View style={styles.aboutHeaderRow}>
              <Text style={[styles.fieldLabel, { color: themed.text }]}>Gender (Optional)</Text>
              <Text style={[styles.smallMuted, { color: themed.muted }]}>Not set</Text>
            </View>
            <Text style={[styles.smallMuted, { color: themed.muted }]}>Used for Dating filters. You can leave this blank.</Text>
          </View>
          <View style={styles.chipsWrap}>
            <Chip label="Man" />
            <Chip label="Woman" />
            <Chip label="Non-binary" />
            <Chip label="Other" />
            <Chip label="Prefer not to say" />
          </View>
        </Card>

        {/* Referral */}
        <Card title="Referral" icon={<Ionicons name="gift-outline" size={18} color={themed.blue600} />}>
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Who invited you? (username)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="username (no @)"
                  placeholderTextColor={themed.muted}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
              <Button label="Save" tone="primary" disabled />
            </View>
            <Text style={[styles.fieldHelper, { color: themed.muted }]}>
              You can only set this once. If already claimed, it will be locked.
            </Text>
          </View>
        </Card>

        {/* Profile Type */}
        <Card title="Profile Type" icon={<Ionicons name="pricetag-outline" size={18} color={themed.blue600} />}>
          <Row
            label="Current Type"
            value="creator"
            hint="Tap to change (UI only)"
            onPress={() => {}}
          />
          <Text style={[styles.smallMuted, { marginTop: 10, color: themed.amber600 }]}>
            ⚠️ Changing profile type may hide or show different sections on your profile. Nothing is deleted.
          </Text>
        </Card>

        {/* Profile Modules */}
        <Card
          title="Profile Modules"
          subtitle="Customize which sections appear on your profile."
          icon={<Ionicons name="grid-outline" size={18} color={themed.blue600} />}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smallMuted, { color: themed.muted }]}>
                Profile type is a starting point — add or remove any module (UI only).
              </Text>
            </View>
            <Button label="Customize Modules" iconName="add-outline" tone="primary" onPress={() => setModulesModalOpen(true)} />
          </View>
          <View style={[styles.chipsWrap, { marginTop: 12 }]}>
            <Chip label="Social Counts" selected />
            <Chip label="Social Media Links" selected />
            <Chip label="Custom Links" selected />
            <Chip label="Streaming Stats" selected />
          </View>
        </Card>

        {/* Profile Tabs */}
        <Card title="Profile Tabs" icon={<Ionicons name="albums-outline" size={18} color={themed.blue600} />}>
          <Text style={[styles.smallMuted, { color: themed.muted }]}>
            Choose which tabs appear on your profile. Visitors can navigate between enabled tabs.
          </Text>
          <View style={[styles.chipsWrap, { marginTop: 12 }]}>
            <Chip label="Info" selected />
            <Chip label="Feed" selected />
            <Chip label="Videos" selected />
          </View>
          <View style={{ marginTop: 12 }}>
            <Button label="Add / Manage Tabs" iconName="add-outline" onPress={() => setTabsModalOpen(true)} />
          </View>
        </Card>

        {/* Top Friends Settings */}
        <Card
          title="Top Friends Section"
          subtitle="Customize your Top Friends display (MySpace style!)"
          icon={<Ionicons name="people-outline" size={18} color={themed.purple600} />}
        >
          <View style={styles.topFriendsToggle}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: themed.text }]}>Show Top Friends Section</Text>
              <Text style={[styles.rowHint, { color: themed.muted }]}>Display your favorite people on your profile</Text>
            </View>
            <Switch value={true} disabled trackColor={{ false: themed.muted2, true: themed.purple600 }} />
          </View>

          <View style={{ marginTop: 12, opacity: 0.9 }}>
            <Field
              label="Section Title"
              placeholder="Top Friends"
              helper={'Examples: "Top G\'s", "My Crew", "Best Buds", "VIPs", etc.'}
            />

            <Text style={[styles.fieldLabel, { color: themed.text }]}>Avatar Style</Text>
            <View style={styles.twoCol}>
              <View
                style={[
                  styles.choiceCard,
                  { backgroundColor: themed.card2, borderColor: themed.border },
                  styles.choiceCardSelected,
                  { opacity: 0.7 },
                ]}
              >
                <Ionicons name="square-outline" size={24} color={themed.text} />
                <Text style={[styles.choiceTitle, { color: themed.text }]}>Square</Text>
                <Text style={[styles.choiceDesc, { color: themed.muted }]}>Classic look</Text>
              </View>
              <View style={[styles.choiceCard, { backgroundColor: themed.card2, borderColor: themed.border, opacity: 0.7 }]}>
                <Ionicons name="ellipse-outline" size={24} color={themed.text} />
                <Text style={[styles.choiceTitle, { color: themed.text }]}>Circle</Text>
                <Text style={[styles.choiceDesc, { color: themed.muted }]}>Modern style</Text>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Row
                label="Maximum Friends to Display"
                value="4"
                hint="Slider on web (UI only)"
                leftIcon={<Ionicons name="options-outline" size={18} color={themed.muted} />}
                right={<Text style={[styles.rowHint, { color: themed.muted }]}>4</Text>}
              />
              <Text style={[styles.fieldHelper, { color: themed.muted }]}>
                Grid will auto-center based on the number of friends you add
              </Text>
            </View>

            <View style={[styles.previewBox, { backgroundColor: themed.card2, borderColor: themed.border }]}>
              <Text style={[styles.previewTitle, { color: themed.text }]}>Preview Grid Layout</Text>
              <View style={styles.previewGrid}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={`pf-${i}`} style={styles.previewTile} />
                ))}
              </View>
            </View>
          </View>
        </Card>

        {/* Profile Customization */}
        <View style={{ marginTop: 6 }}>
          <Text style={[styles.customizationTitle, { color: themed.text }]}>Profile Customization</Text>
          <Text style={[styles.customizationSubtitle, { color: themed.muted }]}>
            Customize how your profile looks to visitors
          </Text>
        </View>

        <Card
          title="Background"
          icon={<Ionicons name="color-palette-outline" size={18} color={themed.blue600} />}
        >
          <Text style={[styles.fieldLabel, { color: themed.text }]}>Background Image</Text>
          <View style={[styles.bgPreview, { backgroundColor: themed.card2, borderColor: themed.border }]}>
            <Text style={[styles.bgPreviewText, { color: themed.muted }]}>Background preview</Text>
          </View>
          <Button label="Upload Background" iconName="cloud-upload-outline" tone="primary" disabled />
          <Text style={[styles.fieldHelper, { color: themed.muted }]}>
            Recommended: 1920x1080px or larger. Max 5MB. JPG, PNG, or WebP. Leave empty for default gradient background.
          </Text>

          <Row
            label="Background Overlay"
            value="Dark (Medium)"
            hint="Helps text remain readable over background images"
            onPress={() => {}}
          />
        </Card>

        <Card title="Card Style" icon={<Ionicons name="layers-outline" size={18} color={themed.blue600} />}>
          <Text style={[styles.fieldLabel, { color: themed.text }]}>Card Color</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={[styles.colorSwatch, { backgroundColor: '#FFFFFF' }]} />
            <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
              <TextInput
                placeholder="#FFFFFF"
                placeholderTextColor={themed.muted}
                style={[styles.input, { color: themed.text }]}
              />
            </View>
          </View>

          <Row
            label="Card Opacity"
            value="95%"
            hint="Lower opacity lets your background show through the cards (slider on web)"
            onPress={() => {}}
          />

          <Row label="Border Radius" value="Medium (Balanced)" onPress={() => {}} />
        </Card>

        <Card title="Colors & Typography" icon={<Ionicons name="text-outline" size={18} color={themed.blue600} />}>
          <Row label="Font Style" value="Modern (Sans-serif)" onPress={() => {}} />

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>🎯 Button Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: themed.blue600 }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#3B82F6"
                  placeholderTextColor={themed.muted}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
            <Text style={[styles.fieldHelper, { color: themed.muted }]}>Color for buttons, CTAs, and primary actions</Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>✍️ Content Text Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: '#1F2937' }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#1F2937"
                  placeholderTextColor={themed.muted}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
            <Text style={[styles.fieldHelper, { color: themed.muted }]}>
              Color for your bio, post captions, and user-written content
            </Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>🏷️ UI Text Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: '#374151' }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#374151"
                  placeholderTextColor={themed.muted}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
            <Text style={[styles.fieldHelper, { color: themed.muted }]}>
              Color for labels, headings, stats, and UI elements
            </Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>🔗 Link Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: themed.blue600 }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#3B82F6"
                  placeholderTextColor={themed.muted}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
            <Text style={[styles.fieldHelper, { color: themed.muted }]}>Color for clickable links in your profile</Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>✨ Accent Color (Highlights)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: themed.blue600 }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#3B82F6"
                  placeholderTextColor={themed.muted}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
            <Text style={[styles.fieldHelper, { color: themed.muted }]}>
              Used for highlights, badges, and special elements
            </Text>
          </View>

          <View style={[styles.noticeBox, { marginTop: 14 }]}>
            <Text style={[styles.noticeTitle, { color: themed.text }]}>🎨 Quick Color Presets</Text>
            <View style={styles.presetGrid}>
              <Button label="💙 Classic Blue" disabled />
              <Button label="💜 Purple Dream" disabled />
              <Button label="💗 Hot Pink" disabled />
              <Button label="💚 Fresh Green" disabled />
              <Button label="🧡 Warm Amber" disabled />
              <Button label="🖤 Dark Mode" disabled />
            </View>
          </View>
        </Card>

        <Card title="Links Section" icon={<Ionicons name="link-outline" size={18} color={themed.blue600} />}>
          <Field label="Section Title" placeholder="My Links" helper='Examples: "My Links", "Follow Me", "My Platforms", "Sponsors"' />
        </Card>

        <Card
          title="Display Preferences"
          icon={<Ionicons name="eye-outline" size={18} color={themed.blue600} />}
        >
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: themed.text }]}>Links-Only Profile (Hide Streaming Stats)</Text>
              <Text style={[styles.fieldHelper, { color: themed.muted }]}>
                Hide streaming stats, top supporters, and top streamers widgets. Your profile will only show your links, social media, and bio.
              </Text>
            </View>
            <Switch value={false} disabled trackColor={{ false: themed.muted2, true: themed.blue600 }} />
          </View>
        </Card>

        <View style={[styles.previewNote, { backgroundColor: themed.infoCardBg, borderColor: themed.infoCardBorder }]}>
          <Text style={[styles.previewNoteText, { color: themed.text }]}>
            💡 <Text style={{ fontWeight: '800' }}>Preview your changes:</Text> Visit your profile page after saving to see how it looks!
          </Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button label="Save Customization" tone="primary" disabled />
        </View>

        {/* Social Media */}
        <Card
          title="Social Media"
          subtitle="Add your social media usernames (without @). These will appear as icons on your profile."
          icon={<Ionicons name="share-social-outline" size={18} color={themed.blue600} />}
        >
          <View style={styles.twoColInputs}>
            <Field label="Instagram" placeholder="username" />
            <Field label="Twitter/X" placeholder="username" />
            <Field label="YouTube" placeholder="username (no @)" />
            <Field label="TikTok" placeholder="username" />
            <Field label="Facebook" placeholder="username" />
            <Field label="Twitch" placeholder="username" />
            <Field label="Discord" placeholder="invite code or username" />
            <Field label="Snapchat" placeholder="username" />
            <Field label="LinkedIn" placeholder="username" />
            <Field label="GitHub" placeholder="username" />
            <Field label="Spotify" placeholder="artist/profile ID" />
            <Field label="OnlyFans" placeholder="username" />
          </View>
        </Card>

        {/* Pinned Post */}
        <Card title="Pinned Post" icon={<Ionicons name="pin-outline" size={18} color={themed.blue600} />}>
          <View style={[styles.pinnedPreview, { backgroundColor: themed.card2, borderColor: themed.border }]}>
            <Text style={[styles.smallMuted, { color: themed.muted }]}>Pinned post preview (image/video)</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Button label="Upload Photo/Video" iconName="cloud-upload-outline" tone="primary" disabled />
            <Button label="Delete Pinned Post" iconName="trash-outline" tone="danger" disabled />
          </View>
          <View style={{ marginTop: 12 }}>
            <Row label="Filter" value="None" hint="Filters available for images on web (UI only)" onPress={() => {}} />
            <View style={[styles.chipsWrap, { marginTop: 10 }]}>
              <Chip label="None" selected />
              <Chip label="Warm" disabled />
              <Chip label="Cool" disabled />
              <Chip label="B&W" disabled />
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Field label="Caption" placeholder="Write a caption..." multiline maxLength={500} />
          </View>
        </Card>

        {/* Bottom Save Bar (web sticky) */}
        <View style={[styles.saveBar, { backgroundColor: themed.infoCardBg, borderColor: themed.infoCardBorder }]}>
          <Button
            label={saving ? 'Saving…' : 'Save All Changes'}
            tone="primary"
            iconName="save-outline"
            disabled={!canSave}
            onPress={handleSave}
          />
          <View style={{ width: 10 }} />
          <Button label="Cancel" tone="secondary" disabled={saving || currentUser.loading || !dirty} onPress={handleCancel} />
        </View>
      </ScrollView>
    </SafeAreaView>
    </ThemedColorsContext.Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 16, paddingBottom: 28 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenTitle: { color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.2 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
  },
  linkPillText: { color: COLORS.blue600, fontWeight: '800' },

  infoCard: {
    backgroundColor: 'rgba(37,99,235,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.28)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoCardNeutral: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoCardTitle: { color: COLORS.text, fontWeight: '900', fontSize: 14 },
  infoCardSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  infoCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue600,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  infoCardBtnText: { color: COLORS.white, fontWeight: '900', fontSize: 12 },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  cardSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },

  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowDisabled: { opacity: 0.6 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowIcon: { width: 22, alignItems: 'center' },
  rowRight: { alignItems: 'flex-end', justifyContent: 'center' },
  rowLabel: { color: COLORS.text, fontWeight: '900', fontSize: 13 },
  rowValue: { color: COLORS.text, fontWeight: '900', fontSize: 15, marginTop: 2 },
  rowHint: { color: COLORS.muted, fontSize: 12, marginTop: 2 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },

  btn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.9 },
  btnDisabled: { opacity: 0.55 },
  btnText: { fontWeight: '900', fontSize: 13 },
  btnPrimary: { backgroundColor: COLORS.blue600, borderColor: 'rgba(255,255,255,0.12)' },
  btnPrimaryText: { color: COLORS.white },
  btnSecondary: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: COLORS.border },
  btnSecondaryText: { color: COLORS.text },
  btnDanger: { backgroundColor: 'rgba(220,38,38,0.14)', borderColor: 'rgba(220,38,38,0.25)' },
  btnDangerText: { color: COLORS.red600 },

  fieldLabel: { color: COLORS.text, fontWeight: '900', fontSize: 12, marginBottom: 6 },
  fieldHelper: { color: COLORS.muted, fontSize: 11, marginTop: 6, lineHeight: 16 },
  inputWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  inputWrapDisabled: { opacity: 0.65 },
  input: { color: COLORS.text, fontSize: 14, padding: 0, flex: 1 },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },
  inputRight: { marginLeft: 10 },

  smallMuted: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  mutedNote: { color: COLORS.muted2, marginTop: 10, fontSize: 12 },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 26, fontWeight: '900' },

  noticeBox: {
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.28)',
    backgroundColor: 'rgba(37,99,235,0.10)',
    borderRadius: 14,
    padding: 12,
  },
  noticeTitle: { color: COLORS.text, fontWeight: '900', fontSize: 13 },
  noticeText: { color: COLORS.muted, marginTop: 4, fontSize: 12 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  toggleLabel: { color: COLORS.text, fontWeight: '900', fontSize: 13 },

  aboutHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipSelected: { backgroundColor: 'rgba(37,99,235,0.18)', borderColor: 'rgba(37,99,235,0.35)' },
  chipUnselected: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: COLORS.border },
  chipDisabled: { opacity: 0.6 },
  chipText: { fontSize: 12, fontWeight: '900' },
  chipTextSelected: { color: COLORS.text },
  chipTextUnselected: { color: COLORS.text },

  twoCol: { flexDirection: 'row', gap: 10, marginTop: 8 },
  choiceCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  choiceCardSelected: { borderColor: 'rgba(124,58,237,0.5)', backgroundColor: 'rgba(124,58,237,0.10)' },
  choiceTitle: { color: COLORS.text, fontWeight: '900', marginTop: 8 },
  choiceDesc: { color: COLORS.muted, fontSize: 12, marginTop: 2 },

  previewBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  previewTitle: { color: COLORS.text, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  previewTile: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.30)' },

  customizationTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 10 },
  customizationSubtitle: { color: COLORS.muted, marginTop: 4, marginBottom: 10 },
  bgPreview: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bgPreviewText: { color: COLORS.muted, fontWeight: '800' },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  previewNote: {
    borderRadius: 16,
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.22)',
    padding: 12,
    marginBottom: 10,
  },
  previewNoteText: { color: 'rgba(234,240,255,0.85)', fontSize: 12, lineHeight: 16 },

  twoColInputs: { gap: 0 },

  pinnedPreview: {
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  saveBar: {
    marginTop: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(37,99,235,0.18)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: 16,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: COLORS.card2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  modalTitle: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  modalSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  modalRowTitle: { color: COLORS.text, fontWeight: '900' },
  modalRowDesc: { color: COLORS.muted, marginTop: 3, fontSize: 12, lineHeight: 16 },
  modalFooter: { padding: 14, borderTopWidth: 1, borderTopColor: COLORS.border },

  topFriendsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
