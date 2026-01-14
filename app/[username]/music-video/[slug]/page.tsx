import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import LongFormPlayer, { type LongFormContentItem } from '@/components/player/LongFormPlayer';
import { Metadata } from 'next';

interface PageProps {
  params: { username: string; slug: string };
}

async function getContent(username: string, slug: string) {
  const supabase = createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single();

  if (!profile) return null;

  const { data: item } = await supabase
    .from('creator_studio_items')
    .select('*')
    .eq('owner_profile_id', profile.id)
    .eq('item_type', 'music_video')
    .or(`id.eq.${slug},title.ilike.${slug.replace(/-/g, ' ')}`)
    .eq('status', 'ready')
    .eq('visibility', 'public')
    .single();

  if (!item) return null;

  return { profile, item };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getContent(params.username, params.slug);
  if (!data) return { title: 'Not Found' };

  return {
    title: `${data.item.title} - ${data.profile.display_name || data.profile.username}`,
    description: data.item.description || `Watch ${data.item.title}`,
  };
}

export default async function MusicVideoPage({ params }: PageProps) {
  const data = await getContent(params.username, params.slug);

  if (!data) {
    notFound();
  }

  const { profile, item } = data;

  const contentItem: LongFormContentItem = {
    id: item.id,
    title: item.title,
    description: item.description,
    content_type: 'music_video',
    media_type: item.media_url?.includes('youtube') ? 'youtube' : 'upload',
    media_url: item.media_url || '',
    artwork_url: item.artwork_url,
    thumb_url: item.thumb_url,
    duration_seconds: item.duration_seconds,
  };

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <LongFormPlayer
        item={contentItem}
        artistProfileId={profile.id}
        artistUsername={profile.username}
        artistDisplayName={profile.display_name}
        artistAvatarUrl={profile.avatar_url}
      />
    </main>
  );
}
