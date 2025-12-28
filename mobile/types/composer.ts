/**
 * Composer Types - Mobile
 * Base composer for video/clip editing
 */

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
}

export interface ComposerDraft {
  id: string;
  title: string;
  caption: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  textOverlays: TextOverlay[];
  producer: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  actors: Array<{
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ComposerEditorState {
  caption: string;
  textOverlays: TextOverlay[];
  actors: Array<{
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  }>;
  isSaving: boolean;
  isPosting: boolean;
}

export type ComposerAction =
  | 'save'
  | 'post'
  | 'postAndSave'
  | 'sendToComposer';

