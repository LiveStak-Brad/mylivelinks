import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import LongFormPlayer, { type LongFormContentItem } from '@/components/player/LongFormPlayer';
import { Metadata } from 'next';

interface PageProps {
  params: { username: string; seriesSlug: string; episodeSlug: string };
}

async function getContent(username: string, seriesSlug: string, episodeSlug: string) {
  const supabase = createServerSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', username)
    .single();

  if (!profile) return null;

  const { data: series } = await supabase
    .from('creator_studio_series')
    .select('id, title')
    .eq('owner_profile_id', profile.id)
    .or(`id.eq.${seriesSlug},title.ilike.${seriesSlug.replace(/-/g, ' ')}`)
    .single();

  if (!series) return null;

  const { data: item } = await supabase
    .from('creator_studio_items')
    .select('*')
    .eq('owner_profile_id', profile.id)
    .eq('series_id', series.id)
    .eq('item_type', 'series_episode')
    .or(`id.eq.${episodeSlug},title.ilike.${episodeSlug.replace(/-/g, ' ')}`)
    .eq('status', 'ready')
    .eq('visibility', 'public')
    .single();

  if (!item) return null;

  const { data: allEpisodes } = await supabase
    .from('creator_studio_items')
    .select('*')
    .eq('series_id', series.id)
    .eq('status', 'ready')
    .eq('visibility', 'public')
    .order('created_at', { ascending: true });

  return { profile, series, item, allEpisodes: allEpisodes || [] };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getContent(params.username, params.seriesSlug, params.episodeSlug);
  if (!data) return { title: 'Not Found' };

  return {
    title: `${data.item.title} - ${data.series.title} - ${data.profile.display_name || data.profile.username}`,
    description: data.item.description || `Watch ${data.item.title} from ${data.series.title}`,
  };
}

export default async function SeriesEpisodePage({ params }: PageProps) {
  const data = await getContent(params.username, params.seriesSlug, params.episodeSlug);

  if (!data) {
    notFound();
  }

  const { profile, series, item, allEpisodes } = data;

  const contentItem: LongFormContentItem = {
    id: item.id,
    title: item.title,
    description: item.description,
    content_type: 'series_episode',
    media_type: item.media_url?.includes('youtube') ? 'youtube' : 'upload',
    media_url: item.media_url || '',
    artwork_url: item.artwork_url,
    thumb_url: item.thumb_url,
    duration_seconds: item.duration_seconds,
  };

  const playlist: LongFormContentItem[] = allEpisodes.map((ep: any) => ({
    id: ep.id,
    title: ep.title,
    description: ep.description,
    content_type: 'series_episode' as const,
    media_type: ep.media_url?.includes('youtube') ? 'youtube' : 'upload',
    media_url: ep.media_url || '',
    artwork_url: ep.artwork_url,
    thumb_url: ep.thumb_url,
    duration_seconds: ep.duration_seconds,
  }));

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto mb-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{series.title}</span>
        </p>
      </div>
      <LongFormPlayer
        item={contentItem}
        artistProfileId={profile.id}
        artistUsername={profile.username}
        artistDisplayName={profile.display_name}
        artistAvatarUrl={profile.avatar_url}
        playlist={playlist}
      />
    </main>
  );
}
