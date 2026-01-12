import React, { useMemo } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import MediaViewer, { type MediaViewerKind } from '../components/MediaViewer';

type RouteParams = {
  url: string;
  kind?: MediaViewerKind;
};

function inferKindFromUrl(url: string): MediaViewerKind {
  const clean = (url || '').split('?')[0] ?? url;
  if (/\.(mp4|mov|m4v|webm|m3u8)$/i.test(clean)) return 'video';
  return 'image';
}

export default function MediaViewerScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<any>();
  const { url, kind } = (params ?? {}) as RouteParams;

  const resolvedKind = useMemo(() => {
    if (kind === 'image' || kind === 'video') return kind;
    return inferKindFromUrl(url);
  }, [kind, url]);

  return (
    <MediaViewer
      kind={resolvedKind}
      url={String(url ?? '')}
      onRequestClose={() => navigation.goBack()}
    />
  );
}

