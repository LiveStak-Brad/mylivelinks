'use client';

import React from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { Stream } from './StreamCard';

interface LiveTVFindResultRowProps {
  stream: Stream;
  onPress?: (stream: Stream) => void;
}

export function LiveTVFindResultRow({ stream, onPress }: LiveTVFindResultRowProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onPress) {
      e.preventDefault();
      onPress(stream);
    }
  };

  const content = (
    <>
      {/* Avatar with gradient */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-primary/20 group-hover:scale-110 group-hover:shadow-xl group-hover:ring-primary/40 transition-all">
        <span className="text-white text-xl font-black">
          {stream.streamer_display_name.slice(0, 1).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
          {stream.streamer_display_name}
        </h3>
        {stream.category && (
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-primary" />
            {stream.category}
          </p>
        )}
      </div>

      {/* Viewer Count with gradient background */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold bg-muted/50 px-3 py-2 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-all">
        <Eye className="w-4 h-4" />
        <span className="font-black">
          {stream.viewer_count >= 1000
            ? `${(stream.viewer_count / 1000).toFixed(1)}K`
            : stream.viewer_count}
        </span>
      </div>
    </>
  );

  if (onPress) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors border-b border-border w-full text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/live/${stream.slug}`}
      className="flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent transition-all border-b border-border/50 last:border-b-0 group"
    >
      {content}
    </Link>
  );
}

