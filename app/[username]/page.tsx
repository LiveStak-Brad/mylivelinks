'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getPinnedPost, PinnedPost } from '@/lib/pinnedPosts';
import Link from 'next/link';
import Image from 'next/image';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  display_name?: string;
  follower_count: number;
  is_live: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pinnedPost, setPinnedPost] = useState<PinnedPost | null>(null);
  const [userLinks, setUserLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, display_name, follower_count, is_live')
        .ilike('username', username)
        .single() as { data: Profile | null; error: any };

      if (profileError) {
        // Try exact match as fallback
        const { data: fallbackData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, display_name, follower_count, is_live')
          .eq('username', username)
          .single() as { data: Profile | null };
        
        if (!fallbackData) {
          setLoading(false);
          return;
        }
        
        const fallbackProfile = fallbackData as Profile;
        setProfile(fallbackProfile);
        setIsOwnProfile(user?.id === fallbackProfile.id);
      } else if (profileData) {
        const profile = profileData as Profile;
        setProfile(profile);
        setIsOwnProfile(user?.id === profile.id);
      } else {
        setLoading(false);
        return;
      }

      // Load pinned post
      if (profileData || profile) {
        const post = await getPinnedPost((profileData || profile)!.id);
        setPinnedPost(post);
      }

      // Load user links
      const { data: links } = await supabase
        .from('user_links')
        .select('*')
        .eq('profile_id', (profileData || profile)!.id)
        .eq('is_active', true)
        .order('display_order');

      setUserLinks(links || []);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchLive = () => {
    router.push('/live');
  };

  const handleGoLive = () => {
    router.push('/live?goLive=1');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-24 h-24 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-48 mx-auto mb-2" />
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">
            The user @{username} doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-8">
      <div className="max-w-md mx-auto px-4 pt-8">
        {/* Profile Header */}
        <div className="text-center mb-6">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            {profile.avatar_url ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-gray-800 shadow-lg">
                {profile.username[0].toUpperCase()}
              </div>
            )}
            {profile.is_live && (
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-red-500 border-4 border-white dark:border-gray-800 rounded-full">
                <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
              </div>
            )}
          </div>

          {/* Name & Username */}
          <h1 className="text-2xl font-bold mb-1">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            @{profile.username}
          </p>

          {/* Bio */}
          {profile.bio && (
            <p className="text-gray-700 dark:text-gray-300 mb-4 max-w-sm mx-auto">
              {profile.bio}
            </p>
          )}

          {/* Edit Profile Link (Owner Only) */}
          {isOwnProfile && (
            <Link
              href="/settings/profile"
              className="inline-block text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
            >
              Edit Profile
            </Link>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            {profile.is_live ? (
              <button
                onClick={handleWatchLive}
                className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Watch Live
              </button>
            ) : (
              <button
                onClick={handleWatchLive}
                className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold cursor-not-allowed"
                disabled
              >
                Not Live
              </button>
            )}

            <button
              onClick={handleGoLive}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition shadow-lg"
            >
              Go Live
            </button>
          </div>
        </div>

        {/* Pinned Post */}
        {pinnedPost ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
            {pinnedPost.media_type === 'image' ? (
              <div className="relative w-full aspect-square">
                <Image
                  src={pinnedPost.media_url}
                  alt={pinnedPost.caption || 'Pinned post'}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <video
                src={pinnedPost.media_url}
                controls
                className="w-full aspect-video bg-black"
              />
            )}
            {pinnedPost.caption && (
              <div className="p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {pinnedPost.caption}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No post yet</p>
          </div>
        )}

        {/* Links List (Linktree Style) */}
        {userLinks.length > 0 && (
          <div className="space-y-3">
            {userLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 px-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition text-center font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {link.title}
              </a>
            ))}
          </div>
        )}

        {/* Empty State for Links */}
        {userLinks.length === 0 && !pinnedPost && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No links yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
