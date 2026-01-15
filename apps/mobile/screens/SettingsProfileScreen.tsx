import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../theme/useTheme';
import type { ProfileSection, ProfileTab, ProfileType } from '../config/profileTypeConfig';

// Gender enum matching web (lib/link/dating-types.ts)
type GenderEnum = 'male' | 'female' | 'nonbinary' | 'other' | 'prefer_not_to_say';

const GENDER_OPTIONS: { value: GenderEnum; label: string }[] = [
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

// Profile type options matching web
const PROFILE_TYPE_OPTIONS: { value: ProfileType; label: string; description: string }[] = [
  { value: 'creator', label: 'Creator', description: 'Content creators, influencers' },
  { value: 'streamer', label: 'Streamer', description: 'Live streamers, broadcasters' },
  { value: 'musician', label: 'Musician / Artist', description: 'Musicians, bands, artists' },
  { value: 'comedian', label: 'Comedian', description: 'Stand-up, comedy content' },
  { value: 'business', label: 'Business / Brand', description: 'Companies, brands, services' },
];

// UserLink type matching web (app/settings/profile/page.tsx)
interface UserLink {
  id?: number;
  title: string;
  url: string;
  display_order: number;
  is_active: boolean;
}

// Location type matching web (lib/location.ts)
interface ProfileLocation {
  zip: string | null;
  city: string | null;
  region: string | null;
  country: string;
  label: string | null;
  hidden: boolean;
  showZip: boolean;
  updatedAt: string | null;
}

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
  const navigation = useNavigation<any>();

  // Track if we've initialized state from profile (prevents refresh from overwriting unsaved changes)
  const hasInitialized = useRef(false);

  // Reset hasInitialized when component unmounts so next mount initializes fresh
  useEffect(() => {
    return () => {
      hasInitialized.current = false;
    };
  }, []);

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);

  // ============================================================================
  // ALL PROFILE STATE (matching web app/settings/profile/page.tsx)
  // ============================================================================
  
  // Gender
  const [gender, setGender] = useState<GenderEnum | null>(null);
  
  // Location
  const [locationZip, setLocationZip] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [locationCountry, setLocationCountry] = useState('US');
  const [locationLabel, setLocationLabel] = useState('');
  const [locationHidden, setLocationHidden] = useState(false);
  const [locationShowZip, setLocationShowZip] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Social media (matching web exactly)
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialTwitch, setSocialTwitch] = useState('');
  const [socialDiscord, setSocialDiscord] = useState('');
  const [socialSnapchat, setSocialSnapchat] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialGithub, setSocialGithub] = useState('');
  const [socialSpotify, setSocialSpotify] = useState('');
  const [socialOnlyfans, setSocialOnlyfans] = useState('');
  
  // Profile type
  const [profileType, setProfileType] = useState<ProfileType>('creator');
  const [showProfileTypePicker, setShowProfileTypePicker] = useState(false);
  
  // Enabled modules and tabs
  const [enabledModules, setEnabledModules] = useState<ProfileSection[] | null>(null);
  const [enabledTabs, setEnabledTabs] = useState<ProfileTab[] | null>(null);
  
  // Top friends settings
  const [showTopFriends, setShowTopFriends] = useState(true);
  const [topFriendsTitle, setTopFriendsTitle] = useState('Top Friends');
  const [topFriendsAvatarStyle, setTopFriendsAvatarStyle] = useState<'circle' | 'square'>('square');
  const [topFriendsMaxCount, setTopFriendsMaxCount] = useState(8);
  
  // Display preferences
  const [hideStreamingStats, setHideStreamingStats] = useState(false);
  const [defaultPostVisibility, setDefaultPostVisibility] = useState<'public' | 'followers' | 'friends'>('public');
  
  // User links (parity with web)
  const [links, setLinks] = useState<UserLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  
  // Pinned post (parity with web lib/pinnedPosts.ts)
  const [pinnedPost, setPinnedPost] = useState<{
    id?: number;
    profile_id: string;
    caption?: string;
    media_url: string;
    media_type: 'image' | 'video';
  } | null>(null);
  const [pinnedPostCaption, setPinnedPostCaption] = useState('');
  const [pinnedPostMediaPreview, setPinnedPostMediaPreview] = useState<string | null>(null);
  const [pinnedPostMediaType, setPinnedPostMediaType] = useState<'image' | 'video' | null>(null);
  const [pinnedPostUploading, setPinnedPostUploading] = useState(false);
  const [pinnedPostDeleting, setPinnedPostDeleting] = useState(false);
  
  // Profile customization (parity with web)
  const [profileBgUrl, setProfileBgUrl] = useState<string | null>(null);
  const [profileBgOverlay, setProfileBgOverlay] = useState('dark-medium');
  const [cardColor, setCardColor] = useState('#FFFFFF');
  const [cardOpacity, setCardOpacity] = useState(0.95);
  const [cardBorderRadius, setCardBorderRadius] = useState('medium');
  const [fontPreset, setFontPreset] = useState('modern');
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [linksSectionTitle, setLinksSectionTitle] = useState('My Links');
  const [buttonColor, setButtonColor] = useState<string | null>(null);
  const [contentTextColor, setContentTextColor] = useState<string | null>(null);
  const [uiTextColor, setUiTextColor] = useState<string | null>(null);
  const [linkColor, setLinkColor] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  
  // Referral
  const [referralId, setReferralId] = useState<string | null>(null);
  const [invitedByUsername, setInvitedByUsername] = useState('');
  const [claimingReferral, setClaimingReferral] = useState(false);
  
  // Track if profile data has been loaded
  const [profileLoaded, setProfileLoaded] = useState(false);

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

  // Load all profile fields when profile data arrives (ONCE per mount)
  useEffect(() => {
    // Only initialize once per mount - prevents refresh from overwriting unsaved changes
    if (hasInitialized.current || saving || !profile) return;
    hasInitialized.current = true;
    
    const p = profile as any;
    
    // Basic info
    setDisplayName(profileDisplayName);
    setBio(profileBio);
    
    // Gender
    setGender((p.gender ?? null) as GenderEnum | null);
    
    // Location
    setLocationZip(p.location_zip || '');
    setLocationCity(p.location_city || '');
    setLocationRegion(p.location_region || '');
    setLocationCountry(p.location_country || 'US');
    setLocationLabel(p.location_label || '');
    setLocationHidden(p.location_hidden ?? false);
    setLocationShowZip(p.location_show_zip ?? false);
    
    // Social media (strip @ if present, matching web)
    setSocialInstagram((p.social_instagram || '').replace(/^@/, ''));
    setSocialTwitter((p.social_twitter || '').replace(/^@/, ''));
    setSocialYoutube((p.social_youtube || '').replace(/^@/, ''));
    setSocialTiktok((p.social_tiktok || '').replace(/^@/, ''));
    setSocialFacebook((p.social_facebook || '').replace(/^@/, ''));
    setSocialTwitch((p.social_twitch || '').replace(/^@/, ''));
    setSocialDiscord(p.social_discord || '');
    setSocialSnapchat((p.social_snapchat || '').replace(/^@/, ''));
    setSocialLinkedin((p.social_linkedin || '').replace(/^@/, ''));
    setSocialGithub((p.social_github || '').replace(/^@/, ''));
    setSocialSpotify(p.social_spotify || '');
    setSocialOnlyfans((p.social_onlyfans || '').replace(/^@/, ''));
    
    // Profile type
    setProfileType((p.profile_type || 'creator') as ProfileType);
    
    // Enabled modules (optional modules only)
    if (p.enabled_modules && Array.isArray(p.enabled_modules)) {
      setEnabledModules(p.enabled_modules as ProfileSection[]);
    } else {
      setEnabledModules(null);
    }
    
    // Enabled tabs (optional tabs only)
    if (Array.isArray(p.enabled_tabs)) {
      setEnabledTabs((p.enabled_tabs as ProfileTab[]).filter((t: ProfileTab) => t !== 'info'));
    } else {
      setEnabledTabs(null);
    }
    
    // Top friends customization
    setShowTopFriends(p.show_top_friends !== false);
    setTopFriendsTitle(p.top_friends_title || 'Top Friends');
    setTopFriendsAvatarStyle(p.top_friends_avatar_style || 'square');
    setTopFriendsMaxCount(p.top_friends_max_count || 8);
    
    // Display preferences
    setHideStreamingStats(p.hide_streaming_stats || false);
    setDefaultPostVisibility(p.default_post_visibility || 'public');
    
    // Profile customization (parity with web)
    setProfileBgUrl(p.profile_bg_url || null);
    setProfileBgOverlay(p.profile_bg_overlay || 'dark-medium');
    setCardColor(p.card_color || '#FFFFFF');
    setCardOpacity(p.card_opacity ?? 0.95);
    setCardBorderRadius(p.card_border_radius || 'medium');
    setFontPreset(p.font_preset || 'modern');
    setAccentColor(p.accent_color || '#3B82F6');
    setLinksSectionTitle(p.links_section_title || 'My Links');
    setButtonColor(p.button_color || null);
    setContentTextColor(p.content_text_color || null);
    setUiTextColor(p.ui_text_color || null);
    setLinkColor(p.link_color || null);
    
    setProfileLoaded(true);
  }, [profile, profileBio, profileDisplayName, saving]);

  // Load user links (parity with web)
  useEffect(() => {
    if (!userId) return;
    
    const loadLinks = async () => {
      setLinksLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_links')
          .select('*')
          .eq('profile_id', userId)
          .order('display_order');
        
        if (error) {
          console.error('[SettingsProfileScreen] user_links load error:', error.message);
          return;
        }
        
        setLinks(data || []);
      } catch (err) {
        console.error('[SettingsProfileScreen] user_links load exception:', err);
      } finally {
        setLinksLoading(false);
      }
    };
    
    loadLinks();
  }, [userId]);

  // Load pinned post (parity with web getPinnedPost)
  useEffect(() => {
    if (!userId) return;
    
    const loadPinnedPost = async () => {
      try {
        const { data, error } = await supabase
          .from('pinned_posts')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('[SettingsProfileScreen] pinned_posts load error:', error.message);
          return;
        }
        
        if (data) {
          setPinnedPost(data as any);
          setPinnedPostCaption(data.caption || '');
          setPinnedPostMediaPreview(data.media_url);
          setPinnedPostMediaType(data.media_type);
        }
      } catch (err) {
        console.error('[SettingsProfileScreen] pinned_posts load exception:', err);
      }
    };
    
    loadPinnedPost();
  }, [userId]);

  // Load referral status
  useEffect(() => {
    if (!userId) return;
    
    const loadReferralStatus = async () => {
      try {
        const { data, error } = await (supabase.from('referrals') as any)
          .select('id')
          .eq('referred_profile_id', userId)
          .maybeSingle();
        if (error) return;
        const id = typeof (data as any)?.id === 'string' ? (data as any).id : null;
        setReferralId(id);
      } catch {
        // Ignore
      }
    };
    
    loadReferralStatus();
  }, [userId]);

  // Calculate if any field has changed (comprehensive dirty check)
  const dirty = useMemo(() => {
    if (!profile || !profileLoaded) return false;
    const p = profile as any;
    
    // Basic info
    if (displayName.trim() !== (profileDisplayName || '').trim()) return true;
    if (bio.trim() !== (profileBio || '').trim()) return true;
    
    // Gender
    if (gender !== (p.gender ?? null)) return true;
    
    // Location
    if (locationZip !== (p.location_zip || '')) return true;
    if (locationLabel !== (p.location_label || '')) return true;
    if (locationHidden !== (p.location_hidden ?? false)) return true;
    if (locationShowZip !== (p.location_show_zip ?? false)) return true;
    
    // Social media
    if (socialInstagram !== (p.social_instagram || '').replace(/^@/, '')) return true;
    if (socialTwitter !== (p.social_twitter || '').replace(/^@/, '')) return true;
    if (socialYoutube !== (p.social_youtube || '').replace(/^@/, '')) return true;
    if (socialTiktok !== (p.social_tiktok || '').replace(/^@/, '')) return true;
    if (socialFacebook !== (p.social_facebook || '').replace(/^@/, '')) return true;
    if (socialTwitch !== (p.social_twitch || '').replace(/^@/, '')) return true;
    if (socialDiscord !== (p.social_discord || '')) return true;
    if (socialSnapchat !== (p.social_snapchat || '').replace(/^@/, '')) return true;
    if (socialLinkedin !== (p.social_linkedin || '').replace(/^@/, '')) return true;
    if (socialGithub !== (p.social_github || '').replace(/^@/, '')) return true;
    if (socialSpotify !== (p.social_spotify || '')) return true;
    if (socialOnlyfans !== (p.social_onlyfans || '').replace(/^@/, '')) return true;
    
    // Profile type
    if (profileType !== (p.profile_type || 'creator')) return true;
    
    // Top friends
    if (showTopFriends !== (p.show_top_friends !== false)) return true;
    if (topFriendsTitle !== (p.top_friends_title || 'Top Friends')) return true;
    if (topFriendsAvatarStyle !== (p.top_friends_avatar_style || 'square')) return true;
    if (topFriendsMaxCount !== (p.top_friends_max_count || 8)) return true;
    
    // Display preferences
    if (hideStreamingStats !== (p.hide_streaming_stats || false)) return true;
    
    // Enabled modules and tabs
    const currentModules = Array.isArray(enabledModules) ? enabledModules : null;
    const profileModules = Array.isArray(p.enabled_modules) ? p.enabled_modules : null;
    if (JSON.stringify(currentModules) !== JSON.stringify(profileModules)) return true;
    
    const currentTabs = Array.isArray(enabledTabs) ? enabledTabs : null;
    const profileTabs = Array.isArray(p.enabled_tabs) ? (p.enabled_tabs as ProfileTab[]).filter((t: ProfileTab) => t !== 'info') : null;
    if (JSON.stringify(currentTabs) !== JSON.stringify(profileTabs)) return true;
    
    // Profile customization - use string comparison for URLs to handle null/undefined/empty
    const currentBgUrl = profileBgUrl ?? '';
    const savedBgUrl = p.profile_bg_url ?? '';
    if (currentBgUrl !== savedBgUrl) return true;
    if (profileBgOverlay !== (p.profile_bg_overlay || 'dark-medium')) return true;
    if (cardColor !== (p.card_color || '#FFFFFF')) return true;
    if (cardOpacity !== (p.card_opacity ?? 0.95)) return true;
    if (cardBorderRadius !== (p.card_border_radius || 'medium')) return true;
    if (fontPreset !== (p.font_preset || 'modern')) return true;
    if (accentColor !== (p.accent_color || '#3B82F6')) return true;
    if (linksSectionTitle !== (p.links_section_title || 'My Links')) return true;
    if ((buttonColor ?? '') !== (p.button_color ?? '')) return true;
    if ((contentTextColor ?? '') !== (p.content_text_color ?? '')) return true;
    if ((uiTextColor ?? '') !== (p.ui_text_color ?? '')) return true;
    if ((linkColor ?? '') !== (p.link_color ?? '')) return true;
    
    return false;
  }, [
    profile, profileLoaded, displayName, profileDisplayName, bio, profileBio, gender,
    locationZip, locationLabel, locationHidden, locationShowZip,
    socialInstagram, socialTwitter, socialYoutube, socialTiktok, socialFacebook,
    socialTwitch, socialDiscord, socialSnapchat, socialLinkedin, socialGithub,
    socialSpotify, socialOnlyfans, profileType, showTopFriends, topFriendsTitle,
    topFriendsAvatarStyle, topFriendsMaxCount, hideStreamingStats,
    enabledModules, enabledTabs,
    profileBgUrl, profileBgOverlay, cardColor, cardOpacity, cardBorderRadius,
    fontPreset, accentColor, linksSectionTitle, buttonColor, contentTextColor,
    uiTextColor, linkColor
  ]);

  const canSave = Boolean(userId) && !currentUser.loading && !saving && dirty;

  const handleCancel = useCallback(() => {
    if (!profile) return;
    const p = profile as any;
    
    // Reset all fields to profile values
    setDisplayName(profileDisplayName);
    setBio(profileBio);
    setGender((p.gender ?? null) as GenderEnum | null);
    setLocationZip(p.location_zip || '');
    setLocationLabel(p.location_label || '');
    setLocationHidden(p.location_hidden ?? false);
    setLocationShowZip(p.location_show_zip ?? false);
    setSocialInstagram((p.social_instagram || '').replace(/^@/, ''));
    setSocialTwitter((p.social_twitter || '').replace(/^@/, ''));
    setSocialYoutube((p.social_youtube || '').replace(/^@/, ''));
    setSocialTiktok((p.social_tiktok || '').replace(/^@/, ''));
    setSocialFacebook((p.social_facebook || '').replace(/^@/, ''));
    setSocialTwitch((p.social_twitch || '').replace(/^@/, ''));
    setSocialDiscord(p.social_discord || '');
    setSocialSnapchat((p.social_snapchat || '').replace(/^@/, ''));
    setSocialLinkedin((p.social_linkedin || '').replace(/^@/, ''));
    setSocialGithub((p.social_github || '').replace(/^@/, ''));
    setSocialSpotify(p.social_spotify || '');
    setSocialOnlyfans((p.social_onlyfans || '').replace(/^@/, ''));
    setProfileType((p.profile_type || 'creator') as ProfileType);
    setShowTopFriends(p.show_top_friends !== false);
    setTopFriendsTitle(p.top_friends_title || 'Top Friends');
    setTopFriendsAvatarStyle(p.top_friends_avatar_style || 'square');
    setTopFriendsMaxCount(p.top_friends_max_count || 8);
    setHideStreamingStats(p.hide_streaming_stats || false);
  }, [profile, profileBio, profileDisplayName]);

  // Handle referral claim (matching web behavior)
  const handleClaimReferral = useCallback(async () => {
    if (!userId) {
      Alert.alert('Error', 'No user ID. Please log in again.');
      return;
    }

    if (referralId) {
      Alert.alert('Already claimed', 'Referral already claimed.');
      return;
    }

    const raw = invitedByUsername.trim();
    const normalized = raw.replace(/^@/, '').trim();
    if (!normalized) {
      Alert.alert('Error', 'Please enter the username of who invited you.');
      return;
    }

    setClaimingReferral(true);
    try {
      const { data, error } = await (supabase as any).rpc('claim_referral_by_inviter_username', {
        p_inviter_username: normalized,
      });

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('inviter_not_found')) {
          Alert.alert('Not found', 'That username was not found.');
          return;
        }
        if (msg.includes('self_referral_not_allowed')) {
          Alert.alert('Error', "You can't refer yourself.");
          return;
        }
        if (msg.includes('invalid_username')) {
          Alert.alert('Error', 'Please enter a valid username.');
          return;
        }
        Alert.alert('Error', error.message || 'Failed to claim referral.');
        return;
      }

      const id = typeof data === 'string' ? data : data ? String(data) : null;
      setReferralId(id);
      setInvitedByUsername('');
      Alert.alert('Success', 'Referral saved!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to claim referral.');
    } finally {
      setClaimingReferral(false);
    }
  }, [userId, referralId, invitedByUsername]);

  // Handle gender selection (toggle like web)
  const handleGenderSelect = useCallback((value: GenderEnum) => {
    setGender((prev) => (prev === value ? null : value));
  }, []);

  // Handle ZIP location resolution via RPC (parity with web LocationEditor)
  const handleSetLocation = useCallback(async () => {
    const trimmedZip = locationZip.trim();
    if (trimmedZip.length < 5) {
      Alert.alert('Invalid ZIP', 'Enter a 5-digit ZIP code.');
      return;
    }

    setLocationLoading(true);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc('rpc_update_profile_location', {
        p_zip: trimmedZip,
        p_label: locationLabel.trim() || null,
        p_hide: locationHidden,
        p_show_zip: locationShowZip,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const payload = Array.isArray(data) ? data[0] : data;
      if (!payload) {
        throw new Error('Missing response from server');
      }

      // Update local state with resolved values
      setLocationCity(payload.location_city || '');
      setLocationRegion(payload.location_region || '');
      setLocationZip(payload.location_zip || trimmedZip);
      
      Alert.alert('Location Set', `Resolved to ${payload.location_city}, ${payload.location_region}`);
      
      // Refresh profile to sync
      await currentUser.refresh();
    } catch (err: any) {
      console.error('[SettingsProfileScreen] location RPC error:', err);
      Alert.alert('Location Error', err?.message || 'Failed to resolve ZIP code');
    } finally {
      setLocationLoading(false);
    }
  }, [locationZip, locationLabel, locationHidden, locationShowZip, currentUser]);

  const handleSave = useCallback(async () => {
    if (!userId) return;

    setSaving(true);
    try {
      // Build comprehensive update payload matching web exactly
      const updates: Record<string, any> = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        gender: gender ?? null,
        
        // Location fields
        location_zip: locationZip.trim() || null,
        location_label: locationLabel.trim() || null,
        location_hidden: locationHidden,
        location_show_zip: locationShowZip,
        
        // Social media fields (strip @ if user included it, matching web)
        social_instagram: socialInstagram.trim().replace(/^@/, '') || null,
        social_twitter: socialTwitter.trim().replace(/^@/, '') || null,
        social_youtube: socialYoutube.trim().replace(/^@/, '') || null,
        social_tiktok: socialTiktok.trim().replace(/^@/, '') || null,
        social_facebook: socialFacebook.trim().replace(/^@/, '') || null,
        social_twitch: socialTwitch.trim().replace(/^@/, '') || null,
        social_discord: socialDiscord.trim() || null,
        social_snapchat: socialSnapchat.trim().replace(/^@/, '') || null,
        social_linkedin: socialLinkedin.trim().replace(/^@/, '') || null,
        social_github: socialGithub.trim().replace(/^@/, '') || null,
        social_spotify: socialSpotify.trim() || null,
        social_onlyfans: socialOnlyfans.trim().replace(/^@/, '') || null,
        
        // Profile type
        profile_type: profileType,
        
        // Enabled modules and tabs
        enabled_modules: Array.isArray(enabledModules) ? enabledModules : null,
        enabled_tabs: Array.isArray(enabledTabs) ? enabledTabs.filter((t) => t !== 'info') : null,
        
        // Top friends customization
        show_top_friends: showTopFriends,
        top_friends_title: topFriendsTitle,
        top_friends_avatar_style: topFriendsAvatarStyle,
        top_friends_max_count: topFriendsMaxCount,
        
        // Display preferences
        hide_streaming_stats: hideStreamingStats,
        default_post_visibility: defaultPostVisibility,
        
        // Profile customization (parity with web)
        profile_bg_url: profileBgUrl || null,
        profile_bg_overlay: profileBgOverlay,
        card_color: cardColor,
        card_opacity: cardOpacity,
        card_border_radius: cardBorderRadius,
        font_preset: fontPreset,
        accent_color: accentColor,
        links_section_title: linksSectionTitle,
        button_color: buttonColor || null,
        content_text_color: contentTextColor || null,
        ui_text_color: uiTextColor || null,
        link_color: linkColor || null,
        
        updated_at: new Date().toISOString(),
      };

      console.log('[SettingsProfileScreen] Saving profile with profile_bg_url:', updates.profile_bg_url);
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) {
        console.error('[SettingsProfileScreen] profiles update error:', error.message);
        Alert.alert('Save failed', error.message);
        return;
      }
      console.log('[SettingsProfileScreen] Profile saved successfully');

      // Save user_links (delete-all + insert-all pattern matching web exactly)
      // Delete all existing links for this profile
      const { error: deleteLinksError } = await supabase
        .from('user_links')
        .delete()
        .eq('profile_id', userId);
      
      if (deleteLinksError) {
        console.error('[SettingsProfileScreen] user_links delete error:', deleteLinksError.message);
        Alert.alert('Save failed', `Links delete failed: ${deleteLinksError.message}`);
        return;
      }

      // Insert updated links (matching web logic exactly)
      if (links.length > 0) {
        const linksToInsert = links
          .filter(link => link.title.trim() && link.url.trim())
          .map((link, index) => {
            let url = link.url.trim();
            
            // Clean up URL - remove our domain if accidentally prepended (matching web)
            url = url.replace(/^https?:\/\/(www\.)?mylivelinks\.com\//gi, '');
            
            // Auto-add https:// if no protocol specified
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = 'https://' + url;
            }

            return {
              profile_id: userId,
              title: link.title.trim(),
              url,
              display_order: index,
              is_active: true,
            };
          });

        if (linksToInsert.length > 0) {
          const { error: insertLinksError } = await supabase
            .from('user_links')
            .insert(linksToInsert);

          if (insertLinksError) {
            console.error('[SettingsProfileScreen] user_links insert error:', insertLinksError.message);
            Alert.alert('Save failed', `Links insert failed: ${insertLinksError.message}`);
            return;
          }
        }
      }

      await currentUser.refresh();
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e: any) {
      console.error('[SettingsProfileScreen] save exception:', e);
      Alert.alert('Save failed', e?.message || 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }, [
    bio, currentUser, displayName, userId, gender,
    locationZip, locationLabel, locationHidden, locationShowZip,
    socialInstagram, socialTwitter, socialYoutube, socialTiktok, socialFacebook,
    socialTwitch, socialDiscord, socialSnapchat, socialLinkedin, socialGithub,
    socialSpotify, socialOnlyfans, profileType, enabledModules, enabledTabs,
    showTopFriends, topFriendsTitle, topFriendsAvatarStyle, topFriendsMaxCount,
    hideStreamingStats, defaultPostVisibility, links,
    profileBgUrl, profileBgOverlay, cardColor, cardOpacity, cardBorderRadius,
    fontPreset, accentColor, linksSectionTitle, buttonColor, contentTextColor,
    uiTextColor, linkColor
  ]);

  // Link CRUD functions (matching web exactly)
  const addLink = useCallback(() => {
    setLinks(prev => [...prev, { title: '', url: '', display_order: prev.length, is_active: true }]);
  }, []);

  const updateLink = useCallback((index: number, field: keyof UserLink, value: string) => {
    setLinks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeLink = useCallback((index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  }, []);

  const moveLink = useCallback((index: number, direction: 'up' | 'down') => {
    setLinks(prev => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      
      const updated = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  }, []);

  // Pinned post upload (parity with web uploadPinnedPostMedia + upsertPinnedPost)
  const handleUploadPinnedPost = useCallback(async () => {
    if (!userId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setPinnedPostUploading(true);
    try {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
      const fileName = `pinned.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Read file as ArrayBuffer for React Native compatibility
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      // Upload to pinned-posts bucket (matching web lib/storage.ts uploadPinnedPostMedia)
      const { error: uploadError } = await supabase.storage
        .from('pinned-posts')
        .upload(filePath, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: isVideo ? 'video/mp4' : 'image/jpeg',
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pinned-posts')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get media URL');
      }

      const mediaUrl = urlData.publicUrl;

      // Upsert to pinned_posts table (matching web lib/pinnedPosts.ts upsertPinnedPost)
      const { data: upsertData, error: upsertError } = await supabase
        .from('pinned_posts')
        .upsert({
          profile_id: userId,
          caption: pinnedPostCaption,
          media_url: mediaUrl,
          media_type: mediaType,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'profile_id',
        })
        .select()
        .single();

      if (upsertError) {
        throw new Error(`Database save failed: ${upsertError.message}`);
      }

      // Update local state
      setPinnedPost(upsertData as any);
      setPinnedPostMediaPreview(mediaUrl);
      setPinnedPostMediaType(mediaType);

      Alert.alert('Success', 'Pinned post uploaded!');
      await currentUser.refresh();
    } catch (err: any) {
      console.error('[SettingsProfileScreen] pinned post upload error:', err);
      Alert.alert('Upload Failed', err?.message || 'Failed to upload pinned post');
    } finally {
      setPinnedPostUploading(false);
    }
  }, [userId, pinnedPostCaption, currentUser]);

  // Pinned post delete (parity with web deletePinnedPost + deletePinnedPostMedia)
  const handleDeletePinnedPost = useCallback(async () => {
    if (!userId) return;

    Alert.alert(
      'Delete Pinned Post',
      'Are you sure you want to delete your pinned post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setPinnedPostDeleting(true);
            try {
              // Delete from DB first (authoritative)
              const { error: deleteError } = await supabase
                .from('pinned_posts')
                .delete()
                .eq('profile_id', userId);

              if (deleteError) {
                throw new Error(`Database delete failed: ${deleteError.message}`);
              }

              // Best-effort storage cleanup (matching web lib/storage.ts deletePinnedPostMedia)
              // Don't block on failure - orphaned files are acceptable
              try {
                await supabase.storage
                  .from('pinned-posts')
                  .remove([
                    `${userId}/pinned.jpg`,
                    `${userId}/pinned.png`,
                    `${userId}/pinned.mp4`,
                    `${userId}/pinned.webm`,
                  ]);
              } catch (storageErr) {
                console.warn('[SettingsProfileScreen] pinned post storage cleanup error (non-blocking):', storageErr);
              }

              // Clear local state
              setPinnedPost(null);
              setPinnedPostCaption('');
              setPinnedPostMediaPreview(null);
              setPinnedPostMediaType(null);

              Alert.alert('Deleted', 'Pinned post removed.');
              await currentUser.refresh();
            } catch (err: any) {
              console.error('[SettingsProfileScreen] pinned post delete error:', err);
              Alert.alert('Delete Failed', err?.message || 'Failed to delete pinned post');
            } finally {
              setPinnedPostDeleting(false);
            }
          },
        },
      ]
    );
  }, [userId, currentUser]);

  // Background image upload (parity with web profile-media bucket)
  const handleUploadBackground = useCallback(async () => {
    if (!userId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload a background.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setBgUploading(true);
    try {
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      // Match web: uploads to 'avatars' bucket with {userId}_bg_{timestamp}.{ext} format
      const fileName = `${userId}_bg_${Date.now()}.${fileExt}`;

      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get background URL');
      }

      console.log('[SettingsProfileScreen] Background uploaded, URL:', urlData.publicUrl);
      setProfileBgUrl(urlData.publicUrl);
      Alert.alert('Success', 'Background uploaded! Tap Save Profile to apply.');
    } catch (err: any) {
      console.error('[SettingsProfileScreen] background upload error:', err);
      Alert.alert('Upload Failed', err?.message || 'Failed to upload background');
    } finally {
      setBgUploading(false);
    }
  }, [userId]);

  const handleRemoveBackground = useCallback(() => {
    setProfileBgUrl(null);
  }, []);

  const handleChangeAvatar = useCallback(async () => {
    if (!userId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setAvatarUploading(true);
    try {
      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/avatar.${fileExt}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      // Read file as base64 for React Native compatibility
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      // Upload to Supabase Storage using ArrayBuffer (works reliably in RN)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, { upsert: true, contentType });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrl = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;

      if (!avatarUrl) throw new Error('Failed to get avatar URL');

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      await currentUser.refresh();
      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (err: any) {
      console.error('[SettingsProfileScreen] Avatar upload error:', err);
      Alert.alert('Upload failed', err?.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  }, [currentUser, userId]);

  const [modulesModalOpen, setModulesModalOpen] = useState(false);
  const [tabsModalOpen, setTabsModalOpen] = useState(false);

  // Module definitions with toggle handlers (matching web OPTIONAL_MODULES for parity)
  const MODULE_DEFINITIONS: { id: ProfileSection; label: string; description: string }[] = [
    // Profile modules
    { id: 'social_counts', label: 'Social Counts', description: 'Follower/following/friends counts' },
    { id: 'social_media', label: 'Social Media Links', description: 'Instagram, Twitter, TikTok icons' },
    { id: 'links', label: 'Custom Links', description: 'Your Linktree-style link section' },
    { id: 'connections', label: 'Connections', description: 'Friends and followers display' },
    // Community
    { id: 'referral_network', label: 'Referral Network', description: 'Your referral connections' },
    { id: 'top_friends', label: 'Top Friends', description: 'Your favorite people' },
    // Content
    { id: 'music_showcase', label: 'Music Tracks', description: 'Your music library' },
    { id: 'upcoming_events', label: 'Events / Shows', description: 'Your event schedule' },
    // Stats
    { id: 'streaming_stats', label: 'Streaming Stats', description: 'Live hours, viewer counts' },
    { id: 'profile_stats', label: 'Profile Stats', description: 'Account age, join date' },
    { id: 'top_supporters', label: 'Top Supporters', description: 'Users who gifted you' },
    { id: 'top_streamers', label: 'Top Streamers', description: 'Streamers you support' },
    // Business
    { id: 'merchandise', label: 'Merchandise', description: 'Your merch store' },
    { id: 'portfolio', label: 'Portfolio / Products', description: 'Your work showcase' },
    { id: 'business_info', label: 'Business Info', description: 'Hours, location, contact' },
  ];

  // Tab definitions
  const TAB_DEFINITIONS: { id: ProfileTab; label: string; description: string; core?: boolean }[] = [
    { id: 'info', label: 'Info', description: 'Core tab (always on)', core: true },
    { id: 'feed', label: 'Feed', description: 'Photo/video feed grid' },
    { id: 'reels', label: 'Reels', description: 'Short-form video content' },
    { id: 'media', label: 'Media', description: 'Photos & videos gallery' },
    { id: 'music_videos', label: 'Music Videos', description: 'Music video gallery' },
    { id: 'music', label: 'Music', description: 'Music tracks & playlists' },
    { id: 'events', label: 'Events', description: 'Shows & performances' },
    { id: 'products', label: 'Products', description: 'Merchandise & portfolio' },
    { id: 'podcasts', label: 'Podcasts', description: 'Podcast episodes & shows' },
    { id: 'movies', label: 'Movies', description: 'Films & long-form content' },
    { id: 'series', label: 'Series', description: 'Episodic content & shows' },
    { id: 'education', label: 'Education', description: 'Tutorials & courses' },
  ];

  // Check if a module is enabled (uses profile type defaults if enabledModules is null)
  const isModuleEnabled = useCallback((moduleId: ProfileSection): boolean => {
    if (Array.isArray(enabledModules)) {
      return enabledModules.includes(moduleId);
    }
    // Default: use profile type config defaults (simplified - enable common ones)
    const defaultEnabled: ProfileSection[] = ['social_counts', 'social_media', 'links', 'streaming_stats', 'top_supporters', 'top_friends'];
    return defaultEnabled.includes(moduleId);
  }, [enabledModules]);

  // Toggle a module
  const toggleModule = useCallback((moduleId: ProfileSection) => {
    setEnabledModules(prev => {
      const current = Array.isArray(prev) ? prev : ['social_counts', 'social_media', 'links', 'streaming_stats', 'top_supporters', 'top_friends'];
      if (current.includes(moduleId)) {
        return current.filter(m => m !== moduleId);
      } else {
        return [...current, moduleId];
      }
    });
  }, []);

  // Check if a tab is enabled
  const isTabEnabled = useCallback((tabId: ProfileTab): boolean => {
    if (tabId === 'info') return true; // Core tab always on
    if (Array.isArray(enabledTabs)) {
      return enabledTabs.includes(tabId);
    }
    // Default: use profile type config defaults
    const defaultEnabled: ProfileTab[] = ['feed', 'media', 'music_videos'];
    return defaultEnabled.includes(tabId);
  }, [enabledTabs]);

  // Toggle a tab
  const toggleTab = useCallback((tabId: ProfileTab) => {
    if (tabId === 'info') return; // Can't toggle core tab
    setEnabledTabs(prev => {
      const current = Array.isArray(prev) ? prev : ['feed', 'media', 'music_videos'];
      if (current.includes(tabId)) {
        return current.filter(t => t !== tabId);
      } else {
        return [...current, tabId];
      }
    });
  }, []);

  return (
    <ThemedColorsContext.Provider value={themed}>
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themed.bg }]}>
      {/* Modules Picker Modal */}
      <Modal visible={modulesModalOpen} transparent animationType="fade" onRequestClose={() => setModulesModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: themed.card, borderColor: themed.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: themed.text }]}>Customize Profile Modules</Text>
                <Text style={[styles.modalSubtitle, { color: themed.muted }]}>Add or remove sections from your profile</Text>
              </View>
              <Pressable onPress={() => setModulesModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={themed.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 12 }}>
              {MODULE_DEFINITIONS.map((mod, idx) => (
                <View key={mod.id}>
                  <View style={styles.modalRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalRowTitle, { color: themed.text }]}>{mod.label}</Text>
                      <Text style={[styles.modalRowDesc, { color: themed.muted }]}>{mod.description}</Text>
                    </View>
                    <Switch
                      value={isModuleEnabled(mod.id)}
                      onValueChange={() => toggleModule(mod.id)}
                      disabled={saving}
                      trackColor={{ false: themed.muted2, true: themed.blue600 }}
                    />
                  </View>
                  {idx < MODULE_DEFINITIONS.length - 1 && <Divider />}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button label="Done" tone="primary" onPress={() => setModulesModalOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Tabs Picker Modal */}
      <Modal visible={tabsModalOpen} transparent animationType="fade" onRequestClose={() => setTabsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: themed.card, borderColor: themed.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: themed.text }]}>Manage Profile Tabs</Text>
                <Text style={[styles.modalSubtitle, { color: themed.muted }]}>Select which tabs appear on your profile</Text>
              </View>
              <Pressable onPress={() => setTabsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={themed.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 12 }}>
              {TAB_DEFINITIONS.map((tab, idx) => (
                <View key={tab.id}>
                  <View style={styles.modalRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalRowTitle, { color: themed.text }]}>{tab.label}</Text>
                      <Text style={[styles.modalRowDesc, { color: themed.muted }]}>{tab.description}</Text>
                    </View>
                    <Switch
                      value={isTabEnabled(tab.id)}
                      onValueChange={() => toggleTab(tab.id)}
                      disabled={saving || tab.core}
                      trackColor={{ false: themed.muted2, true: themed.blue600 }}
                    />
                  </View>
                  {idx < TAB_DEFINITIONS.length - 1 && <Divider />}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button label="Done" tone="primary" onPress={() => setTabsModalOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>

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
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: themed.avatarText }]}>
                  {(profileDisplayName || profileUsername || 'U').trim().slice(0, 1).toUpperCase() || 'U'}
                </Text>
              )}
              {avatarUploading && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Button label={avatarUploading ? 'Uploading...' : 'Change Photo'} iconName="image-outline" onPress={handleChangeAvatar} disabled={avatarUploading} />
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
              <Button label="Change Username" iconName="create-outline" onPress={() => navigation.navigate('SettingsUsernameScreen')} />
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
                  value={locationZip}
                  onChangeText={setLocationZip}
                  editable={!saving && !locationLoading}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
              <Pressable
                onPress={handleSetLocation}
                disabled={saving || locationLoading || locationZip.trim().length < 5}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  (saving || locationLoading || locationZip.trim().length < 5) && styles.btnDisabled,
                  pressed && styles.btnPressed,
                  { minWidth: 60 },
                ]}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={themed.white} />
                ) : (
                  <Text style={[styles.btnText, styles.btnPrimaryText]}>Set</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Field
            label="Area label (optional)"
            placeholder='e.g. "St. Louis Metro"'
            maxLength={48}
            value={locationLabel}
            onChangeText={setLocationLabel}
            disabled={saving}
          />

          <View style={[styles.noticeBox, { borderColor: themed.infoCardBorder, backgroundColor: themed.infoCardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={18} color={themed.blue600} style={{ marginRight: 8 }} />
              <Text style={[styles.noticeTitle, { color: themed.text }]}>Self-reported only</Text>
            </View>
            <Text style={[styles.noticeText, { color: themed.muted }]}>
              {locationCity ? `${locationCity}${locationRegion ? `, ${locationRegion}` : ''}` : 'No location saved yet.'}
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: themed.text }]}>Hide location from others</Text>
              <Switch
                value={locationHidden}
                onValueChange={setLocationHidden}
                disabled={saving}
                trackColor={{ false: themed.muted2, true: themed.blue600 }}
              />
            </View>
            <Divider />
            <View style={[styles.toggleRow, { opacity: locationHidden ? 0.6 : 1 }]}>
              <Text style={[styles.toggleLabel, { color: themed.text }]}>Show ZIP publicly</Text>
              <Switch
                value={locationShowZip}
                onValueChange={setLocationShowZip}
                disabled={saving || locationHidden}
                trackColor={{ false: themed.muted2, true: themed.blue600 }}
              />
            </View>
          </View>
        </Card>

        {/* About */}
        <Card title="About" icon={<Ionicons name="information-circle-outline" size={18} color={themed.blue600} />}>
          <View style={{ marginBottom: 10 }}>
            <View style={styles.aboutHeaderRow}>
              <Text style={[styles.fieldLabel, { color: themed.text }]}>Gender (Optional)</Text>
              <Text style={[styles.smallMuted, { color: themed.muted }]}>
                {gender ? GENDER_OPTIONS.find(o => o.value === gender)?.label || 'Not set' : 'Not set'}
              </Text>
            </View>
            <Text style={[styles.smallMuted, { color: themed.muted }]}>Used for Dating filters. You can leave this blank.</Text>
          </View>
          <View style={styles.chipsWrap}>
            {GENDER_OPTIONS.map((option) => (
              <Pressable key={option.value} onPress={() => handleGenderSelect(option.value)} disabled={saving}>
                <Chip label={option.label} selected={gender === option.value} disabled={saving} />
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Referral */}
        <Card title="Referral" icon={<Ionicons name="gift-outline" size={18} color={themed.blue600} />}>
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Who invited you? (username)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[
                styles.inputWrap,
                { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder },
                !!referralId && styles.inputWrapDisabled
              ]}>
                <TextInput
                  placeholder="username (no @)"
                  placeholderTextColor={themed.muted}
                  value={invitedByUsername}
                  onChangeText={setInvitedByUsername}
                  editable={!referralId && !claimingReferral}
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
              <Button
                label={claimingReferral ? 'Saving...' : referralId ? 'Saved' : 'Save'}
                tone="primary"
                disabled={!!referralId || claimingReferral || !invitedByUsername.trim()}
                onPress={handleClaimReferral}
              />
            </View>
            <Text style={[styles.fieldHelper, { color: themed.muted }]}>
              You can only set this once. If already claimed, it will be locked.
            </Text>
          </View>
        </Card>

        {/* Profile Type */}
        <Card title="Profile Type" icon={<Ionicons name="pricetag-outline" size={18} color={themed.blue600} />}>
          <Pressable onPress={() => setShowProfileTypePicker(true)} disabled={saving}>
            <Row
              label="Current Type"
              value={PROFILE_TYPE_OPTIONS.find(o => o.value === profileType)?.label || profileType}
              hint="Profile type determines default modules and tabs"
            />
          </Pressable>
          <Text style={[styles.smallMuted, { marginTop: 10, color: themed.amber600 }]}>
            ⚠️ Changing profile type may hide or show different sections on your profile. Nothing is deleted.
          </Text>
        </Card>

        {/* Profile Type Picker Modal */}
        <Modal visible={showProfileTypePicker} transparent animationType="fade" onRequestClose={() => setShowProfileTypePicker(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: themed.card, borderColor: themed.border }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: themed.text }]}>Select Profile Type</Text>
                  <Text style={[styles.modalSubtitle, { color: themed.muted }]}>Choose the type that best describes you</Text>
                </View>
                <Pressable onPress={() => setShowProfileTypePicker(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={themed.text} />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 12 }}>
                {PROFILE_TYPE_OPTIONS.map((option, idx) => (
                  <View key={option.value}>
                    <Pressable
                      onPress={() => {
                        setProfileType(option.value);
                        setShowProfileTypePicker(false);
                      }}
                      style={[
                        styles.modalRow,
                        profileType === option.value && { backgroundColor: 'rgba(37,99,235,0.12)', borderRadius: 12, marginHorizontal: -8, paddingHorizontal: 8 }
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalRowTitle, { color: themed.text }]}>{option.label}</Text>
                        <Text style={[styles.modalRowDesc, { color: themed.muted }]}>{option.description}</Text>
                      </View>
                      {profileType === option.value && (
                        <Ionicons name="checkmark-circle" size={24} color={themed.blue600} />
                      )}
                    </Pressable>
                    {idx < PROFILE_TYPE_OPTIONS.length - 1 && <Divider />}
                  </View>
                ))}
              </ScrollView>
              <View style={styles.modalFooter}>
                <Button label="Done" tone="primary" onPress={() => setShowProfileTypePicker(false)} />
              </View>
            </View>
          </View>
        </Modal>

        {/* Profile Modules */}
        <Card
          title="Profile Modules"
          subtitle="Customize which sections appear on your profile."
          icon={<Ionicons name="grid-outline" size={18} color={themed.blue600} />}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smallMuted, { color: themed.muted }]}>
                Profile type is a starting point — add or remove any module.
              </Text>
            </View>
            <Button label="Customize Modules" iconName="add-outline" tone="primary" onPress={() => setModulesModalOpen(true)} />
          </View>
          <View style={[styles.chipsWrap, { marginTop: 12 }]}>
            {MODULE_DEFINITIONS.filter(m => isModuleEnabled(m.id)).map(m => (
              <Chip key={m.id} label={m.label} selected />
            ))}
          </View>
        </Card>

        {/* Profile Tabs */}
        <Card title="Profile Tabs" icon={<Ionicons name="albums-outline" size={18} color={themed.blue600} />}>
          <Text style={[styles.smallMuted, { color: themed.muted }]}>
            Choose which tabs appear on your profile. Visitors can navigate between enabled tabs.
          </Text>
          <View style={[styles.chipsWrap, { marginTop: 12 }]}>
            {TAB_DEFINITIONS.filter(t => isTabEnabled(t.id)).map(t => (
              <Chip key={t.id} label={t.label} selected />
            ))}
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
            <Switch
              value={showTopFriends}
              onValueChange={setShowTopFriends}
              disabled={saving}
              trackColor={{ false: themed.muted2, true: themed.purple600 }}
            />
          </View>

          {showTopFriends && (
            <View style={{ marginTop: 12 }}>
              <Field
                label="Section Title"
                placeholder="Top Friends"
                helper={'Examples: "Top G\'s", "My Crew", "Best Buds", "VIPs", etc.'}
                value={topFriendsTitle}
                onChangeText={setTopFriendsTitle}
                disabled={saving}
                maxLength={50}
              />

              <Text style={[styles.fieldLabel, { color: themed.text }]}>Avatar Style</Text>
              <View style={styles.twoCol}>
                <Pressable onPress={() => setTopFriendsAvatarStyle('square')} disabled={saving}>
                  <View
                    style={[
                      styles.choiceCard,
                      { backgroundColor: themed.card2, borderColor: themed.border },
                      topFriendsAvatarStyle === 'square' && styles.choiceCardSelected,
                    ]}
                  >
                    <Ionicons name="square-outline" size={24} color={themed.text} />
                    <Text style={[styles.choiceTitle, { color: themed.text }]}>Square</Text>
                    <Text style={[styles.choiceDesc, { color: themed.muted }]}>Classic look</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => setTopFriendsAvatarStyle('circle')} disabled={saving}>
                  <View
                    style={[
                      styles.choiceCard,
                      { backgroundColor: themed.card2, borderColor: themed.border },
                      topFriendsAvatarStyle === 'circle' && styles.choiceCardSelected,
                    ]}
                  >
                    <Ionicons name="ellipse-outline" size={24} color={themed.text} />
                    <Text style={[styles.choiceTitle, { color: themed.text }]}>Circle</Text>
                    <Text style={[styles.choiceDesc, { color: themed.muted }]}>Modern style</Text>
                  </View>
                </Pressable>
              </View>

              <View style={{ marginTop: 12 }}>
                <Row
                  label="Maximum Friends to Display"
                  value={String(topFriendsMaxCount)}
                  hint="Tap to change (1-8)"
                  leftIcon={<Ionicons name="options-outline" size={18} color={themed.muted} />}
                  right={<Text style={[styles.rowHint, { color: themed.purple600, fontWeight: '900', fontSize: 18 }]}>{topFriendsMaxCount}</Text>}
                  onPress={() => {
                    // Cycle through 1-8
                    setTopFriendsMaxCount(prev => prev >= 8 ? 1 : prev + 1);
                  }}
                />
                <Text style={[styles.fieldHelper, { color: themed.muted }]}>
                  Grid will auto-center based on the number of friends you add
                </Text>
              </View>

              <View style={[styles.previewBox, { backgroundColor: themed.card2, borderColor: themed.border }]}>
                <Text style={[styles.previewTitle, { color: themed.text }]}>Preview Grid Layout</Text>
                <View style={styles.previewGrid}>
                  {Array.from({ length: topFriendsMaxCount }).map((_, i) => (
                    <View
                      key={`pf-${i}`}
                      style={[
                        styles.previewTile,
                        topFriendsAvatarStyle === 'circle' && { borderRadius: 22 }
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}
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
            {profileBgUrl ? (
              <Image source={{ uri: profileBgUrl }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
            ) : (
              <Text style={[styles.bgPreviewText, { color: themed.muted }]}>No background set</Text>
            )}
            {bgUploading && (
              <View style={[styles.avatarLoadingOverlay, { borderRadius: 12 }]}>
                <ActivityIndicator size="large" color={themed.white} />
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={handleUploadBackground}
              disabled={saving || bgUploading}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                (saving || bgUploading) && styles.btnDisabled,
                pressed && styles.btnPressed,
                { flex: 1 },
              ]}
            >
              {bgUploading ? (
                <ActivityIndicator size="small" color={themed.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={themed.white} style={{ marginRight: 6 }} />
                  <Text style={[styles.btnText, styles.btnPrimaryText]}>{profileBgUrl ? 'Replace' : 'Upload'}</Text>
                </>
              )}
            </Pressable>
            {profileBgUrl && (
              <Pressable
                onPress={handleRemoveBackground}
                disabled={saving || bgUploading}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnDanger,
                  (saving || bgUploading) && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={[styles.btnText, styles.btnDangerText]}>Remove</Text>
              </Pressable>
            )}
          </View>
          <Text style={[styles.fieldHelper, { color: themed.muted }]}>
            Recommended: 1920x1080px or larger. Max 5MB. JPG, PNG, or WebP.
          </Text>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Background Overlay</Text>
            <View style={[styles.chipsWrap, { marginTop: 6 }]}>
              {['none', 'dark-light', 'dark-medium', 'dark-heavy'].map((overlay) => (
                <Pressable
                  key={overlay}
                  onPress={() => setProfileBgOverlay(overlay)}
                  disabled={saving}
                  style={[
                    styles.chip,
                    profileBgOverlay === overlay ? styles.chipSelected : { backgroundColor: themed.card2, borderColor: themed.border },
                    saving && styles.chipDisabled,
                  ]}
                >
                  <Text style={[styles.chipText, profileBgOverlay === overlay ? styles.chipTextSelected : styles.chipTextUnselected]}>
                    {overlay === 'none' ? 'None' : overlay === 'dark-light' ? 'Light' : overlay === 'dark-medium' ? 'Medium' : 'Heavy'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        <Card title="Card Style" icon={<Ionicons name="layers-outline" size={18} color={themed.blue600} />}>
          <Text style={[styles.fieldLabel, { color: themed.text }]}>Card Color</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={[styles.colorSwatch, { backgroundColor: cardColor }]} />
            <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
              <TextInput
                placeholder="#FFFFFF"
                placeholderTextColor={themed.muted}
                value={cardColor}
                onChangeText={setCardColor}
                editable={!saving}
                autoCapitalize="characters"
                style={[styles.input, { color: themed.text }]}
              />
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Card Opacity: {Math.round(cardOpacity * 100)}%</Text>
            <View style={[styles.chipsWrap, { marginTop: 6 }]}>
              {[0.5, 0.7, 0.85, 0.95, 1].map((opacity) => (
                <Pressable
                  key={opacity}
                  onPress={() => setCardOpacity(opacity)}
                  disabled={saving}
                  style={[
                    styles.chip,
                    cardOpacity === opacity ? styles.chipSelected : { backgroundColor: themed.card2, borderColor: themed.border },
                    saving && styles.chipDisabled,
                  ]}
                >
                  <Text style={[styles.chipText, cardOpacity === opacity ? styles.chipTextSelected : styles.chipTextUnselected]}>
                    {Math.round(opacity * 100)}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Border Radius</Text>
            <View style={[styles.chipsWrap, { marginTop: 6 }]}>
              {['none', 'small', 'medium', 'large', 'xl'].map((radius) => (
                <Pressable
                  key={radius}
                  onPress={() => setCardBorderRadius(radius)}
                  disabled={saving}
                  style={[
                    styles.chip,
                    cardBorderRadius === radius ? styles.chipSelected : { backgroundColor: themed.card2, borderColor: themed.border },
                    saving && styles.chipDisabled,
                  ]}
                >
                  <Text style={[styles.chipText, cardBorderRadius === radius ? styles.chipTextSelected : styles.chipTextUnselected]}>
                    {radius.charAt(0).toUpperCase() + radius.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        <Card title="Colors & Typography" icon={<Ionicons name="text-outline" size={18} color={themed.blue600} />}>
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Font Style</Text>
            <View style={[styles.chipsWrap, { marginTop: 6 }]}>
              {['modern', 'classic', 'playful', 'elegant'].map((font) => (
                <Pressable
                  key={font}
                  onPress={() => setFontPreset(font)}
                  disabled={saving}
                  style={[
                    styles.chip,
                    fontPreset === font ? styles.chipSelected : { backgroundColor: themed.card2, borderColor: themed.border },
                    saving && styles.chipDisabled,
                  ]}
                >
                  <Text style={[styles.chipText, fontPreset === font ? styles.chipTextSelected : styles.chipTextUnselected]}>
                    {font.charAt(0).toUpperCase() + font.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Button Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: buttonColor || '#3B82F6' }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#3B82F6"
                  placeholderTextColor={themed.muted}
                  value={buttonColor || ''}
                  onChangeText={(t) => setButtonColor(t || null)}
                  editable={!saving}
                  autoCapitalize="characters"
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Content Text Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: contentTextColor || '#1F2937' }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#1F2937"
                  placeholderTextColor={themed.muted}
                  value={contentTextColor || ''}
                  onChangeText={(t) => setContentTextColor(t || null)}
                  editable={!saving}
                  autoCapitalize="characters"
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>UI Text Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: uiTextColor || '#374151' }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#374151"
                  placeholderTextColor={themed.muted}
                  value={uiTextColor || ''}
                  onChangeText={(t) => setUiTextColor(t || null)}
                  editable={!saving}
                  autoCapitalize="characters"
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Link Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: linkColor || '#3B82F6' }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#3B82F6"
                  placeholderTextColor={themed.muted}
                  value={linkColor || ''}
                  onChangeText={(t) => setLinkColor(t || null)}
                  editable={!saving}
                  autoCapitalize="characters"
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldLabel, { color: themed.text }]}>Accent Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <View style={[styles.colorSwatch, { backgroundColor: accentColor }]} />
              <View style={[styles.inputWrap, { flex: 1, backgroundColor: themed.inputBg, borderColor: themed.inputBorder }]}>
                <TextInput
                  placeholder="#3B82F6"
                  placeholderTextColor={themed.muted}
                  value={accentColor}
                  onChangeText={setAccentColor}
                  editable={!saving}
                  autoCapitalize="characters"
                  style={[styles.input, { color: themed.text }]}
                />
              </View>
            </View>
          </View>
        </Card>

        <Card title="Links Section" icon={<Ionicons name="link-outline" size={18} color={themed.blue600} />}>
          <Field
            label="Section Title"
            placeholder="My Links"
            value={linksSectionTitle}
            onChangeText={setLinksSectionTitle}
            disabled={saving}
            helper='Examples: "My Links", "Follow Me", "My Platforms"'
          />
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
            <Switch
              value={hideStreamingStats}
              onValueChange={setHideStreamingStats}
              disabled={saving}
              trackColor={{ false: themed.muted2, true: themed.blue600 }}
            />
          </View>
        </Card>

        <View style={[styles.previewNote, { backgroundColor: themed.infoCardBg, borderColor: themed.infoCardBorder }]}>
          <Text style={[styles.previewNoteText, { color: themed.text }]}>
            💡 <Text style={{ fontWeight: '800' }}>Preview your changes:</Text> Visit your profile page after saving to see how it looks!
          </Text>
        </View>

        {/* Social Media */}
        <Card
          title="Social Media"
          subtitle="Add your social media usernames (without @). These will appear as icons on your profile."
          icon={<Ionicons name="share-social-outline" size={18} color={themed.blue600} />}
        >
          <View style={styles.twoColInputs}>
            <Field label="Instagram" placeholder="username" value={socialInstagram} onChangeText={setSocialInstagram} disabled={saving} />
            <Field label="Twitter/X" placeholder="username" value={socialTwitter} onChangeText={setSocialTwitter} disabled={saving} />
            <Field label="YouTube" placeholder="username (no @)" value={socialYoutube} onChangeText={setSocialYoutube} disabled={saving} />
            <Field label="TikTok" placeholder="username" value={socialTiktok} onChangeText={setSocialTiktok} disabled={saving} />
            <Field label="Facebook" placeholder="username" value={socialFacebook} onChangeText={setSocialFacebook} disabled={saving} />
            <Field label="Twitch" placeholder="username" value={socialTwitch} onChangeText={setSocialTwitch} disabled={saving} />
            <Field label="Discord" placeholder="invite code or username" value={socialDiscord} onChangeText={setSocialDiscord} disabled={saving} />
            <Field label="Snapchat" placeholder="username" value={socialSnapchat} onChangeText={setSocialSnapchat} disabled={saving} />
            <Field label="LinkedIn" placeholder="username" value={socialLinkedin} onChangeText={setSocialLinkedin} disabled={saving} />
            <Field label="GitHub" placeholder="username" value={socialGithub} onChangeText={setSocialGithub} disabled={saving} />
            <Field label="Spotify" placeholder="artist/profile ID" value={socialSpotify} onChangeText={setSocialSpotify} disabled={saving} />
            <Field label="OnlyFans" placeholder="username" value={socialOnlyfans} onChangeText={setSocialOnlyfans} disabled={saving} />
          </View>
        </Card>

        {/* Links (parity with web) */}
        <Card title="Links" icon={<Ionicons name="link-outline" size={18} color={themed.blue600} />}>
          <View style={{ marginBottom: 12 }}>
            <Pressable
              onPress={addLink}
              disabled={saving}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                saving && styles.btnDisabled,
                pressed && styles.btnPressed,
              ]}
            >
              <Ionicons name="add" size={18} color={themed.white} style={{ marginRight: 6 }} />
              <Text style={[styles.btnText, styles.btnPrimaryText]}>Add Link</Text>
            </Pressable>
          </View>

          {linksLoading ? (
            <ActivityIndicator size="small" color={themed.blue600} />
          ) : links.length === 0 ? (
            <Text style={[styles.smallMuted, { color: themed.muted, textAlign: 'center', paddingVertical: 16 }]}>
              No links yet. Click "Add Link" to get started.
            </Text>
          ) : (
            <View style={{ gap: 16 }}>
              {links.map((link, index) => (
                <View key={index} style={[styles.linkItem, { backgroundColor: themed.card2, borderColor: themed.border }]}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <TextInput
                      placeholder="Link title"
                      placeholderTextColor={themed.muted}
                      value={link.title}
                      onChangeText={(text) => updateLink(index, 'title', text)}
                      editable={!saving}
                      style={[styles.input, { color: themed.text, backgroundColor: themed.inputBg, borderColor: themed.inputBorder, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }]}
                    />
                    <TextInput
                      placeholder="https://example.com"
                      placeholderTextColor={themed.muted}
                      value={link.url}
                      onChangeText={(text) => updateLink(index, 'url', text)}
                      editable={!saving}
                      autoCapitalize="none"
                      keyboardType="url"
                      style={[styles.input, { color: themed.text, backgroundColor: themed.inputBg, borderColor: themed.inputBorder, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }]}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <Pressable
                      onPress={() => moveLink(index, 'up')}
                      disabled={saving || index === 0}
                      style={({ pressed }) => [
                        styles.linkActionBtn,
                        { backgroundColor: themed.inputBg, borderColor: themed.border },
                        (saving || index === 0) && { opacity: 0.4 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="arrow-up" size={16} color={themed.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveLink(index, 'down')}
                      disabled={saving || index === links.length - 1}
                      style={({ pressed }) => [
                        styles.linkActionBtn,
                        { backgroundColor: themed.inputBg, borderColor: themed.border },
                        (saving || index === links.length - 1) && { opacity: 0.4 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="arrow-down" size={16} color={themed.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => removeLink(index)}
                      disabled={saving}
                      style={({ pressed }) => [
                        styles.linkActionBtn,
                        { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
                        saving && { opacity: 0.4 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Pinned Post */}
        <Card title="Pinned Post" icon={<Ionicons name="pin-outline" size={18} color={themed.blue600} />}>
          {/* Preview */}
          <View style={[styles.pinnedPreview, { backgroundColor: themed.card2, borderColor: themed.border }]}>
            {pinnedPostMediaPreview ? (
              pinnedPostMediaType === 'video' ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                  <Ionicons name="videocam" size={40} color={themed.muted} />
                  <Text style={[styles.smallMuted, { color: themed.muted, marginTop: 8 }]}>Video pinned</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: pinnedPostMediaPreview }}
                  style={{ width: '100%', height: '100%', borderRadius: 12 }}
                  resizeMode="cover"
                />
              )
            ) : (
              <Text style={[styles.smallMuted, { color: themed.muted }]}>No pinned post yet</Text>
            )}
            {(pinnedPostUploading || pinnedPostDeleting) && (
              <View style={[styles.avatarLoadingOverlay, { borderRadius: 12 }]}>
                <ActivityIndicator size="large" color={themed.white} />
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Pressable
              onPress={handleUploadPinnedPost}
              disabled={saving || pinnedPostUploading || pinnedPostDeleting}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                (saving || pinnedPostUploading || pinnedPostDeleting) && styles.btnDisabled,
                pressed && styles.btnPressed,
                { flex: 1 },
              ]}
            >
              {pinnedPostUploading ? (
                <ActivityIndicator size="small" color={themed.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={themed.white} style={{ marginRight: 6 }} />
                  <Text style={[styles.btnText, styles.btnPrimaryText]}>
                    {pinnedPostMediaPreview ? 'Replace Media' : 'Upload Photo/Video'}
                  </Text>
                </>
              )}
            </Pressable>
            {pinnedPostMediaPreview && (
              <Pressable
                onPress={handleDeletePinnedPost}
                disabled={saving || pinnedPostUploading || pinnedPostDeleting}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnDanger,
                  (saving || pinnedPostUploading || pinnedPostDeleting) && styles.btnDisabled,
                  pressed && styles.btnPressed,
                ]}
              >
                {pinnedPostDeleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={[styles.btnText, styles.btnDangerText]}>Delete</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Caption */}
          <View style={{ marginTop: 12 }}>
            <Field
              label="Caption"
              placeholder="Write a caption..."
              multiline
              maxLength={500}
              value={pinnedPostCaption}
              onChangeText={setPinnedPostCaption}
              disabled={saving || pinnedPostUploading}
            />
            {pinnedPostMediaPreview && (
              <Text style={[styles.smallMuted, { color: themed.muted, marginTop: 6 }]}>
                Caption will be saved when you upload or replace media.
              </Text>
            )}
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
  avatarImage: { width: 74, height: 74, borderRadius: 999 },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 208, alignSelf: 'center' },
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

  linkItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  linkActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
