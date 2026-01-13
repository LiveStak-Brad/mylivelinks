import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, RefreshControl, Image, FlatList, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';
import { TeamsNavigationParams } from '../lib/teamNavigation';

type TeamTab = 'Home' | 'Feed' | 'Chat' | 'Live' | 'Members' | 'About';

type TeamData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  approved_member_count: number;
  icon_url: string | null;
  banner_url: string | null;
};

type MembershipData = {
  status: string;
  role: string;
};

type TeamMember = {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
};

type TeamPost = {
  id: string;
  text_content: string;
  media_url: string | null;
  created_at: string;
  reaction_count: number;
  comment_count: number;
  is_pinned: boolean;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  user_has_reacted?: boolean;
  poll_options?: PollOption[];
};

type PollOption = {
  id: string;
  option_text: string;
  vote_count: number;
  user_has_voted: boolean;
};

export default function TeamsDetailScreen() {
  const route = useRoute<RouteProp<TeamsNavigationParams, 'TeamsDetailScreen'>>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { teamId, slug } = route.params || {};
  
  const tabs: TeamTab[] = useMemo(() => ['Home', 'Feed', 'Chat', 'Live', 'Members', 'About'], []);
  const [activeTab, setActiveTab] = useState<TeamTab>('Home');
  
  const [team, setTeam] = useState<TeamData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [reactingPostIds, setReactingPostIds] = useState<Set<string>>(new Set());
  
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const loadTeamData = useCallback(async () => {
    if (!teamId && !slug) {
      setError('Team ID or slug is required');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('teams')
        .select('id, slug, name, description, approved_member_count, icon_url, banner_url')
        .single();
      
      if (teamId) {
        query = query.eq('id', teamId);
      } else if (slug) {
        query = query.eq('slug', slug);
      }
      
      const { data: teamData, error: teamError } = await query;
      
      if (teamError) throw teamError;
      if (!teamData) throw new Error('Team not found');
      
      setTeam(teamData);
      
      if (user?.id) {
        const { data: membershipData } = await supabase
          .from('team_memberships')
          .select('status, role')
          .eq('team_id', teamData.id)
          .eq('profile_id', user.id)
          .single();
        
        setMembership(membershipData || null);
      }
    } catch (err: any) {
      console.error('[TeamsDetailScreen] loadTeamData error:', err);
      setError(err.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [teamId, slug, user?.id]);
  
  const loadMembers = useCallback(async () => {
    if (!team?.slug) return;
    
    setMembersLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_get_team_members', {
        p_team_slug: team.slug,
        p_status: 'approved',
        p_role: null,
        p_search: null,
        p_limit: 100,
      });
      
      if (error) throw error;
      
      const mapped = ((data as any[]) || []).map((row) => ({
        profile_id: String(row.profile_id || ''),
        username: String(row.username || ''),
        display_name: (row.display_name as string | null) || null,
        avatar_url: (row.avatar_url as string | null) || null,
        role: String(row.role || ''),
      }));
      
      setMembers(mapped);
    } catch (err: any) {
      console.error('[TeamsDetailScreen] loadMembers error:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [team?.slug]);
  
  const loadPosts = useCallback(async () => {
    if (!team?.id) return;
    
    setPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_feed_posts')
        .select(`
          id,
          text_content,
          media_url,
          created_at,
          reaction_count,
          comment_count,
          is_pinned,
          author:profiles!team_feed_posts_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('team_id', team.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      const postsData = (data as any) || [];
      
      if (user?.id && postsData.length > 0) {
        const postIds = postsData.map((p: any) => p.id);
        const { data: reactions } = await supabase
          .from('team_feed_reactions')
          .select('post_id')
          .eq('profile_id', user.id)
          .in('post_id', postIds);
        
        const reactedPostIds = new Set((reactions || []).map((r: any) => r.post_id));
        
        postsData.forEach((post: any) => {
          post.user_has_reacted = reactedPostIds.has(post.id);
        });
      }
      
      setPosts(postsData);
    } catch (err: any) {
      console.error('[TeamsDetailScreen] loadPosts error:', err);
    } finally {
      setPostsLoading(false);
    }
  }, [team?.id, user?.id]);
  
  const handleReactToPost = useCallback(async (postId: string) => {
    if (!user?.id || reactingPostIds.has(postId)) return;
    
    setReactingPostIds(prev => new Set(prev).add(postId));
    
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      
      if (post.user_has_reacted) {
        await supabase
          .from('team_feed_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('profile_id', user.id);
        
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1), user_has_reacted: false }
            : p
        ));
      } else {
        await supabase
          .from('team_feed_reactions')
          .insert({ post_id: postId, profile_id: user.id, reaction_type: 'like' });
        
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, reaction_count: p.reaction_count + 1, user_has_reacted: true }
            : p
        ));
      }
    } catch (err: any) {
      console.error('[TeamsDetailScreen] handleReactToPost error:', err);
    } finally {
      setReactingPostIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, [user?.id, posts, reactingPostIds]);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTeamData();
    if (activeTab === 'Feed') {
      await loadPosts();
    } else if (activeTab === 'Members') {
      await loadMembers();
    }
    setRefreshing(false);
  }, [loadTeamData, loadMembers, loadPosts, activeTab]);
  
  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);
  
  const loadChatMessages = useCallback(async () => {
    if (!team?.id) return;
    
    setChatLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_chat_messages')
        .select(`
          id,
          content,
          created_at,
          author:profiles!team_chat_messages_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      setChatMessages((data as any)?.reverse() || []);
    } catch (err: any) {
      console.error('[TeamsDetailScreen] loadChatMessages error:', err);
    } finally {
      setChatLoading(false);
    }
  }, [team?.id]);
  
  const handleSendMessage = useCallback(async () => {
    if (!team?.id || !user?.id || !chatInput.trim() || sendingMessage) return;
    
    const messageText = chatInput.trim();
    setSendingMessage(true);
    setChatInput('');
    
    try {
      const { error } = await supabase
        .from('team_chat_messages')
        .insert({
          team_id: team.id,
          author_id: user.id,
          content: messageText,
        });
      
      if (error) throw error;
      
      await loadChatMessages();
    } catch (err: any) {
      console.error('[TeamsDetailScreen] handleSendMessage error:', err);
      setChatInput(messageText);
    } finally {
      setSendingMessage(false);
    }
  }, [team?.id, user?.id, chatInput, sendingMessage, loadChatMessages]);
  
  useEffect(() => {
    if (activeTab === 'Members' && members.length === 0 && !membersLoading) {
      loadMembers();
    } else if (activeTab === 'Feed' && posts.length === 0 && !postsLoading) {
      loadPosts();
    } else if (activeTab === 'Chat' && chatMessages.length === 0 && !chatLoading) {
      loadChatMessages();
    }
  }, [activeTab, members.length, posts.length, chatMessages.length, membersLoading, postsLoading, chatLoading, loadMembers, loadPosts, loadChatMessages]);
  
  const handleJoin = async () => {
    if (!team || !user?.id || joining) return;
    
    setJoining(true);
    try {
      const { error: joinError } = await supabase.rpc('rpc_join_team', {
        p_team_slug: team.slug,
      });
      
      if (joinError) throw joinError;
      
      await loadTeamData();
    } catch (err: any) {
      console.error('[TeamsDetailScreen] handleJoin error:', err);
      setError(err.message || 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };
  
  const handleLeave = async () => {
    if (!team || !user?.id || leaving) return;
    
    setLeaving(true);
    try {
      const { error: leaveError } = await supabase.rpc('rpc_leave_team', {
        p_team_slug: team.slug,
      });
      
      if (leaveError) throw leaveError;
      
      navigation.goBack();
    } catch (err: any) {
      console.error('[TeamsDetailScreen] handleLeave error:', err);
      setError(err.message || 'Failed to leave team');
    } finally {
      setLeaving(false);
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={styles.loadingText}>Loading team...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error || !team) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error || 'Team not found'}</Text>
          <Pressable
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  const isMember = membership?.status === 'approved';
  const isOwner = membership?.role === 'Team_Admin';
  const teamName = team.name;
  const memberCount = team.approved_member_count;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ec4899" />
        }
      >
        <View style={styles.headerCard}>
          <View style={styles.banner}>
            {team.banner_url ? (
              <Image 
                source={{ uri: team.banner_url }} 
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.bannerGradient} />
            )}
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerOverlayRow}>
                <View style={styles.bannerPill}>
                  <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.bannerPillText}>TEAM</Text>
                </View>
                {isMember && (
                  <View style={styles.bannerPill}>
                    <Ionicons name="checkmark-circle" size={14} color="rgba(94,234,212,0.9)" />
                    <Text style={styles.bannerPillText}>MEMBER</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.headerBody}>
            <View style={styles.avatar}>
              {team.icon_url ? (
                <Image 
                  source={{ uri: team.icon_url }} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{teamName.charAt(0).toUpperCase()}</Text>
              )}
            </View>

            <View style={styles.teamMeta}>
              <Text style={styles.teamName}>{teamName}</Text>
              <View style={styles.teamSubRow}>
                <Ionicons name="people" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={styles.teamSubText}>{memberCount} members</Text>
                {team.slug && (
                  <>
                    <View style={styles.dot} />
                    <Text style={styles.teamSubText}>/{team.slug}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            {!isMember && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Join team"
                onPress={handleJoin}
                disabled={joining}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed && styles.pressed,
                  joining && styles.disabled,
                ]}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={16} color="#fff" />
                    <Text style={styles.primaryActionText}>Join</Text>
                  </>
                )}
              </Pressable>
            )}

            {isMember && !isOwner && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Leave team"
                onPress={handleLeave}
                disabled={leaving}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && styles.pressed,
                  leaving && styles.disabled,
                ]}
              >
                {leaving ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.secondaryActionText}>Leave</Text>
                  </>
                )}
              </Pressable>
            )}

            {isMember && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Invite members"
                onPress={() => {}}
                style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
              >
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={styles.primaryActionText}>Invite</Text>
              </Pressable>
            )}

            {isOwner && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Team settings"
                onPress={() => setSettingsModalVisible(true)}
                style={({ pressed }) => [styles.iconOnlyButton, pressed && styles.pressed]}
              >
                <Ionicons name="settings-outline" size={26} color="rgba(255,255,255,0.9)" />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const active = tab === activeTab;
            const iconName = 
              tab === 'Home' ? 'home' :
              tab === 'Feed' ? 'newspaper' :
              tab === 'Chat' ? 'chatbubbles' :
              tab === 'Live' ? 'videocam' :
              tab === 'Members' ? 'people' : 'information-circle';
            return (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityLabel={`Open ${tab} tab`}
                onPress={() => setActiveTab(tab)}
                style={({ pressed }) => [
                  styles.tabButton,
                  active && styles.tabButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={iconName as any} size={24} color={active ? '#ec4899' : 'rgba(255,255,255,0.5)'} />
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'Home' && (
          <View style={styles.homeContainer}>
            <View style={styles.homeHero}>
              <View style={styles.homeHeroContent}>
                <Text style={styles.homeHeroLabel}>TEAM HOME</Text>
                <Text style={styles.homeHeroTitle}>Fire up the team room</Text>
                <Text style={styles.homeHeroDescription}>
                  Connect with your team through posts, chat, and live rooms
                </Text>
                <View style={styles.homeStats}>
                  <View style={styles.homeStat}>
                    <Ionicons name="people" size={16} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.homeStatText}>{memberCount} members</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.quickActions}>
              <Pressable style={styles.quickAction} onPress={() => setActiveTab('Feed')}>
                <Ionicons name="newspaper" size={20} color="#8B5CF6" />
                <Text style={styles.quickActionLabel}>Post</Text>
                <Text style={styles.quickActionHint}>Share update</Text>
              </Pressable>
              <Pressable style={styles.quickAction} onPress={() => setActiveTab('Chat')}>
                <Ionicons name="chatbubbles" size={20} color="#8B5CF6" />
                <Text style={styles.quickActionLabel}>Chat</Text>
                <Text style={styles.quickActionHint}>Quick note</Text>
              </Pressable>
              <Pressable style={styles.quickAction} onPress={() => setActiveTab('Live')}>
                <Ionicons name="videocam" size={20} color="#8B5CF6" />
                <Text style={styles.quickActionLabel}>Live</Text>
                <Text style={styles.quickActionHint}>Go live</Text>
              </Pressable>
            </View>

            {posts.length > 0 && (
              <View style={styles.homeSection}>
                <View style={styles.homeSectionHeader}>
                  <Text style={styles.homeSectionTitle}>Recent Activity</Text>
                  <Pressable onPress={() => setActiveTab('Feed')}>
                    <Text style={styles.homeSectionLink}>View all</Text>
                  </Pressable>
                </View>
                {posts.slice(0, 3).map((post) => (
                  <View key={post.id} style={styles.homePostCard}>
                    <View style={styles.postHeader}>
                      <View style={styles.postAvatar}>
                        {post.author?.avatar_url ? (
                          <Image source={{ uri: post.author.avatar_url }} style={styles.postAvatarImage} resizeMode="cover" />
                        ) : (
                          <Text style={styles.postAvatarText}>
                            {(post.author?.display_name || post.author?.username || 'U').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.postMeta}>
                        <Text style={styles.postAuthor}>
                          {post.author?.display_name || post.author?.username || 'Unknown'}
                        </Text>
                        <Text style={styles.postTime}>
                          {new Date(post.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.postContent} numberOfLines={2}>{post.text_content}</Text>
                    {(post.reaction_count > 0 || post.comment_count > 0) && (
                      <View style={styles.homePostStats}>
                        {post.reaction_count > 0 && (
                          <Text style={styles.homePostStat}>
                            <Ionicons name="heart" size={12} color="#ec4899" /> {post.reaction_count}
                          </Text>
                        )}
                        {post.comment_count > 0 && (
                          <Text style={styles.homePostStat}>
                            <Ionicons name="chatbubble" size={12} color="rgba(255,255,255,0.5)" /> {post.comment_count}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'Feed' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>FEED</Text>
              {isMember && (
                <Pressable style={styles.createPostButton}>
                  <Ionicons name="create-outline" size={14} color="#ec4899" />
                  <Text style={styles.createPostText}>New Post</Text>
                </Pressable>
              )}
            </View>

            {postsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#ec4899" />
                <Text style={styles.loadingText}>Loading posts...</Text>
              </View>
            ) : posts.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="document-text-outline" size={32} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyStateText}>No posts yet</Text>
                {isMember && (
                  <Text style={styles.emptyStateHint}>Be the first to post in this team</Text>
                )}
              </View>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  {post.is_pinned && (
                    <View style={styles.pinnedBadge}>
                      <Ionicons name="pin" size={12} color="#ec4899" />
                      <Text style={styles.pinnedText}>PINNED</Text>
                    </View>
                  )}
                  <View style={styles.postHeader}>
                    <View style={styles.postAvatar}>
                      {post.author?.avatar_url ? (
                        <Image 
                          source={{ uri: post.author.avatar_url }} 
                          style={styles.postAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.postAvatarText}>
                          {(post.author?.display_name || post.author?.username || 'U').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.postMeta}>
                      <Text style={styles.postAuthor}>
                        {post.author?.display_name || post.author?.username || 'Unknown'}
                      </Text>
                      <Text style={styles.postTime}>
                        {new Date(post.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.postContent}>{post.text_content}</Text>
                  {post.media_url && (
                    <Image 
                      source={{ uri: post.media_url }} 
                      style={styles.postMedia}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.postActions}>
                    <Pressable 
                      style={styles.postAction}
                      onPress={() => handleReactToPost(post.id)}
                      disabled={reactingPostIds.has(post.id)}
                    >
                      <Ionicons 
                        name={post.user_has_reacted ? 'heart' : 'heart-outline'} 
                        size={20} 
                        color={post.user_has_reacted ? '#ec4899' : 'rgba(255,255,255,0.6)'} 
                      />
                      {post.reaction_count > 0 && (
                        <Text style={styles.postActionText}>{post.reaction_count}</Text>
                      )}
                    </Pressable>
                    <Pressable style={styles.postAction}>
                      <Ionicons name="chatbubble-outline" size={20} color="rgba(255,255,255,0.6)" />
                      {post.comment_count > 0 && (
                        <Text style={styles.postActionText}>{post.comment_count}</Text>
                      )}
                    </Pressable>
                    <Pressable style={styles.postAction}>
                      <Ionicons name="gift-outline" size={20} color="rgba(255,255,255,0.6)" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'Chat' && (
          <View style={styles.chatContainer}>
            <ScrollView 
              style={styles.chatMessagesScroll}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
            >
              {chatLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#ec4899" />
                  <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
              ) : chatMessages.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Ionicons name="chatbubbles-outline" size={32} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.emptyStateText}>No messages yet</Text>
                  {isMember && (
                    <Text style={styles.emptyStateHint}>Start the conversation</Text>
                  )}
                </View>
              ) : (
                chatMessages.map((msg) => (
                  <View key={msg.id} style={styles.chatMessage}>
                    <View style={styles.chatAvatar}>
                      {msg.author?.avatar_url ? (
                        <Image source={{ uri: msg.author.avatar_url }} style={styles.chatAvatarImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.chatAvatarText}>
                          {(msg.author?.display_name || msg.author?.username || 'U').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.chatBubble}>
                      <Text style={styles.chatAuthor}>
                        {msg.author?.display_name || msg.author?.username || 'Unknown'}
                      </Text>
                      <Text style={styles.chatText}>{msg.content}</Text>
                      <Text style={styles.chatTime}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            {isMember && (
              <View style={styles.chatInputContainer}>
                <View style={styles.chatInput}>
                  <TextInput
                    style={styles.chatInputField}
                    placeholder="Type a message..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={chatInput}
                    onChangeText={setChatInput}
                    multiline
                    maxLength={500}
                  />
                  <Pressable
                    style={[styles.chatSendButton, (!chatInput.trim() || sendingMessage) && styles.disabled]}
                    onPress={handleSendMessage}
                    disabled={!chatInput.trim() || sendingMessage}
                  >
                    <Ionicons name="send" size={20} color="#fff" />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'Live' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>LIVE ROOMS</Text>
            </View>
            <View style={styles.emptyStateCard}>
              <Ionicons name="videocam-outline" size={32} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyStateText}>No live rooms</Text>
              {isMember && (
                <Pressable style={styles.goLiveButton}>
                  <Ionicons name="radio" size={16} color="#fff" />
                  <Text style={styles.goLiveText}>Go Live</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {activeTab === 'Members' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>MEMBERS ({members.length})</Text>
              {isOwner && (
                <Pressable style={styles.manageButton}>
                  <Ionicons name="settings-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.manageButtonText}>Manage</Text>
                </Pressable>
              )}
            </View>

            {membersLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#ec4899" />
                <Text style={styles.loadingText}>Loading members...</Text>
              </View>
            ) : members.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.4)" />
                <Text style={styles.emptyStateText}>No members yet</Text>
              </View>
            ) : (
              members.map((member) => {
                const roleLabel = member.role === 'Team_Admin' ? 'Owner' : member.role === 'Team_Moderator' ? 'Moderator' : 'Member';
                return (
                  <View key={member.profile_id} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      {member.avatar_url ? (
                        <Image 
                          source={{ uri: member.avatar_url }} 
                          style={styles.memberAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.memberAvatarText}>
                          {(member.display_name || member.username).charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.memberMeta}>
                      <Text style={styles.memberName}>{member.display_name || member.username}</Text>
                      <Text style={styles.memberRole}>@{member.username}</Text>
                    </View>
                    <View style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>{roleLabel.toUpperCase()}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'Rooms' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>LIVE ROOMS</Text>
              {isMember && (
                <Pressable style={styles.goLiveButton}>
                  <Ionicons name="radio-outline" size={14} color="#fff" />
                  <Text style={styles.goLiveText}>Go Live</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.emptyStateCard}>
              <Ionicons name="radio-outline" size={32} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyStateText}>No live rooms</Text>
              {isMember && (
                <Text style={styles.emptyStateHint}>Start a live room to connect with team members</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'About' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>ABOUT</Text>
              <View style={styles.sectionRightHint}>
                <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.65)" />
                <Text style={styles.sectionHintText}>Team info placeholder</Text>
              </View>
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>Description</Text>
              <Text style={styles.aboutBody}>
                {team.description || 'No description available for this team yet.'}
              </Text>
            </View>

            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>About {teamName}</Text>
              {team.description && (
                <Text style={styles.aboutBulletText}>{team.description}</Text>
              )}
              <View style={styles.aboutInfoRow}>
                <Ionicons name="people" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.aboutInfoText}>{memberCount} members</Text>
              </View>
              <View style={styles.aboutInfoRow}>
                <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.aboutInfoText}>
                  Created {new Date(team.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.aboutInfoRow}>
                <Ionicons name="link" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.aboutInfoText}>@{team.slug}</Text>
              </View>
              {team.rules && (
                <View style={styles.aboutSection}>
                  <Text style={styles.aboutSectionTitle}>Team Rules</Text>
                  <Text style={styles.aboutBulletText}>{team.rules}</Text>
                </View>
              )}
              {!isMember && (
                <Pressable style={styles.joinButton} onPress={handleJoin} disabled={joining}>
                  <Text style={styles.joinButtonText}>{joining ? 'Joining...' : 'Join Team'}</Text>
                </Pressable>
              )}
              {isMember && !isOwner && (
                <Pressable style={styles.leaveButton} onPress={handleLeave} disabled={leaving}>
                  <Text style={styles.leaveButtonText}>{leaving ? 'Leaving...' : 'Leave Team'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team Settings</Text>
              <Pressable onPress={() => setSettingsModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="rgba(255,255,255,0.9)" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Pressable style={styles.settingsCard}>
                <View style={styles.settingsCardLeft}>
                  <Ionicons name="image" size={20} color="#8B5CF6" />
                  <Text style={styles.settingsCardTitle}>Edit Team Photos</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </Pressable>
              <Pressable style={styles.settingsCard}>
                <View style={styles.settingsCardLeft}>
                  <Ionicons name="create" size={20} color="#8B5CF6" />
                  <Text style={styles.settingsCardTitle}>Edit Team Info</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </Pressable>
              <Pressable style={styles.settingsCard}>
                <View style={styles.settingsCardLeft}>
                  <Ionicons name="people" size={20} color="#8B5CF6" />
                  <Text style={styles.settingsCardTitle}>Member Requests</Text>
                </View>
                <View style={styles.settingsBadge}>
                  <Text style={styles.settingsBadgeText}>0</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </Pressable>
              <Pressable style={styles.settingsCard}>
                <View style={styles.settingsCardLeft}>
                  <Ionicons name="notifications" size={20} color="#8B5CF6" />
                  <Text style={styles.settingsCardTitle}>Notification Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0c0c16',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#ec4899',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },

  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  banner: {
    height: 160,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(236,72,153,0.28)',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
  },
  bannerOverlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bannerPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: 'rgba(255,255,255,0.9)',
  },
  bannerHint: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bannerHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  headerBody: {
    padding: 16,
    paddingTop: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
  },
  teamMeta: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  teamName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  teamSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  teamSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  actionsRow: {
    padding: 16,
    paddingTop: 0,
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ec4899',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },
  iconOnlyButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderColor: 'rgba(236,72,153,0.35)',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#fff',
  },

  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3.5,
    color: 'rgba(255,255,255,0.6)',
  },
  sectionRightHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  placeholderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeholderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeholderMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  placeholderLines: {
    flex: 1,
    gap: 8,
  },
  placeholderLine: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  placeholderFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  placeholderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeholderChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
  },
  memberMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  memberBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.8)',
  },

  roomCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(56,189,248,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  roomStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  aboutCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  aboutBody: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  aboutBulletText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  aboutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  aboutInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  emptyStateHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.3)',
  },
  createPostText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ec4899',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  goLiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  postCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  postAvatarImage: {
    width: '100%',
    height: '100%',
  },
  postAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },
  postMeta: {
    flex: 1,
    gap: 2,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  postTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
  },
  postMedia: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(236,72,153,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ec4899',
    letterSpacing: 1,
  },
  homeContainer: {
    gap: 16,
  },
  homeHero: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  homeHeroContent: {
    gap: 8,
  },
  homeHeroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
  },
  homeHeroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  homeHeroDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  homeStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  homeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  homeStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  quickActionHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  homeSection: {
    gap: 12,
  },
  homeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },
  homeSectionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  homePostCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  homePostStats: {
    flexDirection: 'row',
    gap: 16,
  },
  homePostStat: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  chatContainer: {
    flex: 1,
  },
  chatMessagesScroll: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 20,
  },
  chatMessage: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chatAvatarImage: {
    width: '100%',
    height: '100%',
  },
  chatAvatarText: {
    fontSize: 13,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
  },
  chatBubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  chatAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  chatText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  chatTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  chatInputContainer: {
    backgroundColor: '#0c0c16',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  chatInput: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chatInputField: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#fff',
    maxHeight: 100,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  settingsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  settingsBadge: {
    backgroundColor: '#ec4899',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  settingsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
});
