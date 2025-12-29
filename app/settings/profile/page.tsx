'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getPinnedPost, upsertPinnedPost, deletePinnedPost, PinnedPost } from '@/lib/pinnedPosts';
import { uploadAvatar, uploadPinnedPostMedia, deleteAvatar, deletePinnedPostMedia } from '@/lib/storage';
import Image from 'next/image';
import ProfileCustomization from '@/components/profile/ProfileCustomization';
import { ProfileTypePickerModal, ProfileType } from '@/components/ProfileTypePickerModal';
import ProfileModulePicker from '@/components/profile/ProfileModulePicker';
import ProfileTabPicker from '@/components/profile/ProfileTabPicker';
import TopFriendsSettings from '@/components/profile/TopFriendsSettings';
import { ProfileSection, ProfileTab } from '@/lib/profileTypeConfig';

interface UserLink {
  id?: number;
  title: string;
  url: string;
  display_order: number;
  is_active: boolean;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [invitedByUsername, setInvitedByUsername] = useState('');
  const [claimingReferral, setClaimingReferral] = useState(false);
  
  // Profile fields
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  
  // Social media fields
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
  
  // Links
  const [links, setLinks] = useState<UserLink[]>([]);
  
  // Customization fields
  const [customization, setCustomization] = useState({
    profile_bg_url: '',
    profile_bg_overlay: 'dark-medium',
    card_color: '#FFFFFF',
    card_opacity: 0.95,
    card_border_radius: 'medium',
    font_preset: 'modern',
    accent_color: '#3B82F6',
    button_color: '',
    content_text_color: '',
    ui_text_color: '',
    link_color: '',
    links_section_title: 'My Links'
  });
  
  // Display preferences
  const [hideStreamingStats, setHideStreamingStats] = useState(false);
  
  // Top Friends Customization
  const [showTopFriends, setShowTopFriends] = useState(true);
  const [topFriendsTitle, setTopFriendsTitle] = useState('Top Friends');
  const [topFriendsAvatarStyle, setTopFriendsAvatarStyle] = useState<'circle' | 'square'>('square');
  const [topFriendsMaxCount, setTopFriendsMaxCount] = useState(8);
  
  // Profile Type
  const [profileType, setProfileType] = useState<ProfileType>('creator');
  const [showProfileTypePicker, setShowProfileTypePicker] = useState(false);
  
  // Enabled Modules (optional modules only, no core shell)
  const [enabledModules, setEnabledModules] = useState<ProfileSection[] | null>(null);
  const [enabledTabs, setEnabledTabs] = useState<ProfileTab[] | null>(null);
  
  // Pinned post
  const [pinnedPost, setPinnedPost] = useState<PinnedPost | null>(null);
  const [pinnedPostCaption, setPinnedPostCaption] = useState('');
  const [pinnedPostMedia, setPinnedPostMedia] = useState<File | null>(null);
  const [pinnedPostMediaPreview, setPinnedPostMediaPreview] = useState<string>('');
  const [pinnedPostMediaType, setPinnedPostMediaType] = useState<'image' | 'video'>('image');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const loadReferralStatus = async (userId: string) => {
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

  const handleClaimReferralByUsername = async () => {
    if (!currentUserId) {
      alert('Error: No user ID. Please log in again.');
      return;
    }

    if (referralId) {
      alert('Referral already claimed.');
      return;
    }

    const raw = invitedByUsername.trim();
    const normalized = raw.replace(/^@/, '').trim();
    if (!normalized) {
      alert('Please enter the username of who invited you.');
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
          alert('That username was not found.');
          return;
        }
        if (msg.includes('self_referral_not_allowed')) {
          alert("You can't refer yourself.");
          return;
        }
        if (msg.includes('invalid_username')) {
          alert('Please enter a valid username.');
          return;
        }
        alert(error.message || 'Failed to claim referral.');
        return;
      }

      const id = typeof data === 'string' ? data : data ? String(data) : null;
      setReferralId(id);
      setInvitedByUsername('');
      alert('Referral saved!');
    } catch (err: any) {
      alert(err?.message || 'Failed to claim referral.');
    } finally {
      setClaimingReferral(false);
    }
  };

  const checkAuth = async () => {
    // Clear mock data
    localStorage.removeItem('mock_user');
    localStorage.removeItem('mock_profile');
    
    // Real Supabase auth
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error:', error);
      router.push('/login');
      return;
    }
    
    if (user) {
      setCurrentUserId(user.id);
      await loadProfile(user.id);
      return;
    } else {
      router.push('/login');
      return;
    }
  };

  const loadProfile = async (userId: string) => {
    try {
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        const p = profile as any;
        setAvatarUrl(p.avatar_url || '');
        setDisplayName(p.display_name || '');
        setBio(p.bio || '');
        setUsername(p.username || '');
        
        // Load social media fields (strip @ if present)
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
        
        // Load display preferences
        setHideStreamingStats(p.hide_streaming_stats || false);
        
        // Load top friends customization
        setShowTopFriends(p.show_top_friends !== false); // default true
        setTopFriendsTitle(p.top_friends_title || 'Top Friends');
        setTopFriendsAvatarStyle(p.top_friends_avatar_style || 'square');
        setTopFriendsMaxCount(p.top_friends_max_count || 8);
        
        // Load profile type
        setProfileType((p.profile_type || 'creator') as ProfileType);
        
        // Load enabled modules (optional modules only)
        if (p.enabled_modules && Array.isArray(p.enabled_modules)) {
          setEnabledModules(p.enabled_modules as ProfileSection[]);
        } else {
          setEnabledModules(null); // null = use profile_type defaults
        }
        
        // Load customization fields
        setCustomization({
          profile_bg_url: p.profile_bg_url || '',
          profile_bg_overlay: p.profile_bg_overlay || 'dark-medium',
          card_color: p.card_color || '#FFFFFF',
          card_opacity: p.card_opacity || 0.95,
          card_border_radius: p.card_border_radius || 'medium',
          font_preset: p.font_preset || 'modern',
          accent_color: p.accent_color || '#3B82F6',
          button_color: p.button_color || '',
          content_text_color: p.content_text_color || '',
          ui_text_color: p.ui_text_color || '',
          link_color: p.link_color || '',
          links_section_title: p.links_section_title || 'My Links'
        });
      }

      // Load links
      const { data: linksData } = await supabase
        .from('user_links')
        .select('*')
        .eq('profile_id', userId)
        .order('display_order');

      setLinks(linksData || []);

      // Load pinned post
      const post = await getPinnedPost(userId);
      if (post) {
        setPinnedPost(post);
        setPinnedPostCaption(post.caption || '');
        setPinnedPostMediaPreview(post.media_url);
        setPinnedPostMediaType(post.media_type);
      }

      await loadReferralStatus(userId);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setAvatarUrl(url);
      }
    }
  };

  const handlePinnedPostMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPinnedPostMedia(file);
      
      if (file.type.startsWith('image/')) {
        setPinnedPostMediaType('image');
        const url = URL.createObjectURL(file);
        setPinnedPostMediaPreview(url);
      } else if (file.type.startsWith('video/')) {
        setPinnedPostMediaType('video');
        const url = URL.createObjectURL(file);
        setPinnedPostMediaPreview(url);
      }
    }
  };

  const handleSave = async () => {
    if (!currentUserId) {
      alert('Error: No user ID. Please log in again.');
      return;
    }

    // Set saving state immediately for instant UI feedback
    setSaving(true);

    // Use setTimeout to yield to the browser and prevent UI blocking
    setTimeout(async () => {
      try {
        // Prepare update payload first (synchronous work)
        const updatePayload: any = {
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl, // Will be updated if avatar changed
          // Enabled modules (optional modules only)
          enabled_modules: enabledModules || null,
          // Enabled tabs (optional tabs only)
          enabled_tabs: enabledTabs || null,
          // Social media fields (strip @ if user included it)
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
          // Display preferences
          hide_streaming_stats: hideStreamingStats,
          // Top Friends Customization
          show_top_friends: showTopFriends,
          top_friends_title: topFriendsTitle,
          top_friends_avatar_style: topFriendsAvatarStyle,
          top_friends_max_count: topFriendsMaxCount,
          // Customization fields
          profile_bg_url: customization.profile_bg_url || null,
          profile_bg_overlay: customization.profile_bg_overlay,
          card_color: customization.card_color,
          card_opacity: customization.card_opacity,
          card_border_radius: customization.card_border_radius,
          font_preset: customization.font_preset,
          accent_color: customization.accent_color,
          button_color: customization.button_color || null,
          content_text_color: customization.content_text_color || null,
          ui_text_color: customization.ui_text_color || null,
          link_color: customization.link_color || null,
          links_section_title: customization.links_section_title,
          updated_at: new Date().toISOString(),
        };

        // Run async operations in parallel where possible
        const [avatarResult, profileTypeResult] = await Promise.allSettled([
          // Upload avatar if changed
          (async () => {
            if (avatarInputRef.current?.files?.[0]) {
              try {
                return await uploadAvatar(currentUserId, avatarInputRef.current.files[0]);
              } catch (error: any) {
                console.error('Avatar upload error:', error);
                throw new Error(`Failed to upload avatar: ${error.message}`);
              }
            }
            return null;
          })(),
          // Save profile type
          (async () => {
            try {
              const resp = await fetch('/api/profile/type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ type: profileType }),
              });
              return resp.ok;
            } catch {
              return false;
            }
          })(),
        ]);

        // Update avatar URL if upload succeeded
        if (avatarResult.status === 'fulfilled' && avatarResult.value) {
          updatePayload.avatar_url = avatarResult.value;
        }

        // Add profile_type to payload if API call failed
        const profileTypeSavedViaRpc = profileTypeResult.status === 'fulfilled' && profileTypeResult.value;
        if (!profileTypeSavedViaRpc) {
          updatePayload.profile_type = profileType;
        }

        // Update profile
        const { error: profileError } = await (supabase.from('profiles') as any)
          .update(updatePayload)
          .eq('id', currentUserId)
          .select();
        
        if (profileError) {
          console.error('Profile update error:', profileError);
          throw new Error(`Profile update failed: ${profileError.message} (${profileError.code || 'unknown'})`);
        }

        // Process links in parallel with pinned post
        const linksPromise = (async () => {
          // Delete all existing links
          await supabase
            .from('user_links')
            .delete()
            .eq('profile_id', currentUserId);

          // Insert updated links
          if (links.length > 0) {
            const linksToInsert = links
              .filter(link => link.title.trim() && link.url.trim())
              .map((link, index) => {
                let url = link.url.trim();
                
                // Clean up URL - remove our domain if it was accidentally prepended
                url = url.replace(/^https?:\/\/(www\.)?mylivelinks\.com\//gi, '');
                
                // Auto-add https:// if no protocol specified
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  url = 'https://' + url;
                }
                
                return {
                  profile_id: currentUserId,
                  title: link.title,
                  url: url,
                  display_order: index,
                  is_active: true,
                };
              });

            if (linksToInsert.length > 0) {
              const { error: linksError } = await (supabase.from('user_links') as any)
                .insert(linksToInsert);

              if (linksError) throw linksError;
            }
          }
        })();

        // Update pinned post
        const pinnedPostPromise = (async () => {
          if (pinnedPostMedia && pinnedPostMediaPreview) {
            // Upload media to storage
            let mediaUrl: string;
            try {
              mediaUrl = await uploadPinnedPostMedia(currentUserId, pinnedPostMedia);
            } catch (error: any) {
              console.error('Pinned post media upload error:', error);
              throw new Error(`Failed to upload media: ${error.message}`);
            }
            
            await upsertPinnedPost(
              currentUserId,
              pinnedPostCaption,
              mediaUrl,
              pinnedPostMediaType
            );
          } else if (pinnedPost && pinnedPostCaption) {
            // Update caption only (keep existing media URL)
            await upsertPinnedPost(
              currentUserId,
              pinnedPostCaption,
              pinnedPost.media_url,
              pinnedPost.media_type
            );
          } else if (!pinnedPostMediaPreview && pinnedPost) {
            // Delete pinned post if media removed
            // Also delete from storage
            await deletePinnedPostMedia(currentUserId);
            await deletePinnedPost(currentUserId);
          }
        })();

        // Wait for all parallel operations to complete
        await Promise.all([linksPromise, pinnedPostPromise]);

        alert('Profile saved successfully!');
        router.push(`/${username}`);
      } catch (error: any) {
        console.error('Error saving profile:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        alert(`Failed to save profile: ${errorMessage}\n\nCheck the browser console (F12) for more details.`);
      } finally {
        setSaving(false);
      }
    }, 0); // Yield to browser immediately
  };

  const addLink = () => {
    setLinks([...links, { title: '', url: '', display_order: links.length, is_active: true }]);
  };

  const updateLink = (index: number, field: keyof UserLink, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const moveLink = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === links.length - 1) return;

    const updated = [...links];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setLinks(updated);
  };

  const handleDeletePinnedPost = async () => {
    if (!currentUserId || !pinnedPost) return;
    
    if (confirm('Delete pinned post?')) {
      try {
        // Delete from storage first
        await deletePinnedPostMedia(currentUserId);
        // Then delete from database
        await deletePinnedPost(currentUserId);
        setPinnedPost(null);
        setPinnedPostCaption('');
        setPinnedPostMedia(null);
        setPinnedPostMediaPreview('');
      } catch (error: any) {
        console.error('Error deleting pinned post:', error);
        alert(`Failed to delete pinned post: ${error.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-24 h-24 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen bg-gray-50 dark:bg-gray-900 py-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <Link href={`/${username}`} className="text-blue-500 hover:text-blue-600">
              View Profile
            </Link>
          </div>
        </div>

        {/* Profile Photo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Photo</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarUrl ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden">
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {username[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Change Photo
              </button>
            </div>
          </div>
        </div>

        {/* Display Name & Bio */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Basic Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={username}
                  disabled
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                  placeholder="username"
                />
                <Link
                  href="/settings/username"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition whitespace-nowrap text-center"
                >
                  Change Username
                </Link>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your unique identifier: mylivelinks.com/{username}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Tell us about yourself"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{bio.length}/500</p>
            </div>
          </div>
        </div>

        {/* Referral */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Referral</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Who invited you? (username)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={invitedByUsername}
                  onChange={(e) => setInvitedByUsername(e.target.value)}
                  disabled={!!referralId || claimingReferral}
                  className={`flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    referralId ? 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400' : ''
                  }`}
                  placeholder="username (no @)"
                />
                <button
                  onClick={handleClaimReferralByUsername}
                  disabled={!!referralId || claimingReferral}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimingReferral ? 'Saving...' : referralId ? 'Saved' : 'Save'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You can only set this once. If you already claimed a referral, this will be locked.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Type */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Type</h2>
          <div 
            onClick={() => setShowProfileTypePicker(true)}
            className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
          >
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Type
              </div>
              <div className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                {profileType === 'musician' ? 'Musician / Artist' : 
                 profileType === 'business' ? 'Business / Brand' : 
                 profileType}
              </div>
            </div>
            <div className="text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <span>Changing profile type may hide or show different sections on your profile. Nothing is deleted.</span>
          </p>
        </div>

        {/* Optional Modules */}
        <ProfileModulePicker
          profileType={profileType}
          currentEnabledModules={enabledModules}
          onChange={setEnabledModules}
        />

        {/* Optional Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Profile Tabs</h2>
          <ProfileTabPicker
            profileType={profileType}
            currentEnabledTabs={enabledTabs}
            onChange={setEnabledTabs}
          />
        </div>

        {/* Top Friends Customization */}
        <TopFriendsSettings
          showTopFriends={showTopFriends}
          topFriendsTitle={topFriendsTitle}
          topFriendsAvatarStyle={topFriendsAvatarStyle}
          topFriendsMaxCount={topFriendsMaxCount}
          onChange={(settings) => {
            setShowTopFriends(settings.showTopFriends);
            setTopFriendsTitle(settings.topFriendsTitle);
            setTopFriendsAvatarStyle(settings.topFriendsAvatarStyle);
            setTopFriendsMaxCount(settings.topFriendsMaxCount);
          }}
        />

        {/* Save Button (Top) */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-lg p-4 mb-6 sticky top-4 z-10">
          <div className="flex gap-4 items-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {saving ? 'Saving...' : '💾 Save All Changes'}
            </button>
            <button
              onClick={() => router.push(`/${username}`)}
              className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-lg font-semibold hover:bg-white/30 transition"
            >
              Cancel
            </button>
          </div>
          <p className="text-white/90 text-sm text-center mt-2">
            Changes will be saved to your profile
          </p>
        </div>

        {/* Social Media */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Social Media</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Add your social media usernames (without @). These will appear as icons on your profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Instagram</label>
              <input
                type="text"
                value={socialInstagram}
                onChange={(e) => setSocialInstagram(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Twitter/X</label>
              <input
                type="text"
                value={socialTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">YouTube</label>
              <input
                type="text"
                value={socialYoutube}
                onChange={(e) => setSocialYoutube(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username (no @)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">TikTok</label>
              <input
                type="text"
                value={socialTiktok}
                onChange={(e) => setSocialTiktok(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Facebook</label>
              <input
                type="text"
                value={socialFacebook}
                onChange={(e) => setSocialFacebook(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Twitch</label>
              <input
                type="text"
                value={socialTwitch}
                onChange={(e) => setSocialTwitch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Discord</label>
              <input
                type="text"
                value={socialDiscord}
                onChange={(e) => setSocialDiscord(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="invite code or username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Snapchat</label>
              <input
                type="text"
                value={socialSnapchat}
                onChange={(e) => setSocialSnapchat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">LinkedIn</label>
              <input
                type="text"
                value={socialLinkedin}
                onChange={(e) => setSocialLinkedin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">GitHub</label>
              <input
                type="text"
                value={socialGithub}
                onChange={(e) => setSocialGithub(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Spotify</label>
              <input
                type="text"
                value={socialSpotify}
                onChange={(e) => setSocialSpotify(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="artist/profile ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">OnlyFans</label>
              <input
                type="text"
                value={socialOnlyfans}
                onChange={(e) => setSocialOnlyfans(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="username"
              />
            </div>
          </div>
        </div>
        
        {/* Profile Customization */}
        <ProfileCustomization
          initialSettings={customization}
          hideStreamingStats={hideStreamingStats}
          onHideStatsChange={setHideStreamingStats}
          onSave={async (settings) => {
            setCustomization(settings);
            // Auto-save will happen on main save button
          }}
        />

        {/* Pinned Post */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Pinned Post</h2>
          
          {pinnedPostMediaPreview ? (
            <div className="mb-4 max-h-96 overflow-hidden rounded-lg">
              {pinnedPostMediaType === 'image' ? (
                <div className="relative w-full max-h-96 rounded-lg overflow-hidden">
                  <Image
                    src={pinnedPostMediaPreview}
                    alt="Pinned post preview"
                    width={800}
                    height={600}
                    className="w-full h-auto max-h-96 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <video
                  src={pinnedPostMediaPreview}
                  controls
                  className="w-full max-h-96 rounded-lg bg-black"
                />
              )}
            </div>
          ) : pinnedPost ? (
            <div className="mb-4 max-h-96 overflow-hidden rounded-lg">
              {pinnedPost.media_type === 'image' ? (
                <div className="relative w-full max-h-96 rounded-lg overflow-hidden">
                  <Image
                    src={pinnedPost.media_url}
                    alt="Pinned post"
                    width={800}
                    height={600}
                    className="w-full h-auto max-h-96 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <video
                  src={pinnedPost.media_url}
                  controls
                  className="w-full max-h-96 rounded-lg bg-black"
                />
              )}
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handlePinnedPostMediaChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition text-gray-600 dark:text-gray-400"
              >
                {pinnedPostMediaPreview || pinnedPost ? 'Replace Media' : 'Upload Media (Image or Video)'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Caption</label>
              <textarea
                value={pinnedPostCaption}
                onChange={(e) => setPinnedPostCaption(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add a caption..."
                maxLength={500}
              />
            </div>

            {(pinnedPostMediaPreview || pinnedPost) && (
              <button
                onClick={handleDeletePinnedPost}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete Pinned Post
              </button>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Links</h2>
            <button
              onClick={addLink}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
            >
              Add Link
            </button>
          </div>

          <div className="space-y-4">
            {links.map((link, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink(index, 'title', e.target.value)}
                    placeholder="Link title"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveLink(index, 'up')}
                    disabled={index === 0}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs disabled:opacity-50"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveLink(index, 'down')}
                    disabled={index === links.length - 1}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs disabled:opacity-50"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeLink(index)}
                    className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/40"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}

            {links.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No links yet. Click "Add Link" to get started.
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => router.push(`/${username}`)}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Profile Type Picker Modal */}
      <ProfileTypePickerModal
        visible={showProfileTypePicker}
        onClose={() => setShowProfileTypePicker(false)}
        currentType={profileType}
        onSelect={(type) => setProfileType(type)}
        allowSkip={false}
      />
    </div>
  );
}

