export type PhotoFilterId = 'original' | 'bw' | 'sepia' | 'cool' | 'warm' | 'vivid';

export type PhotoFilterPreset = {
  id: PhotoFilterId;
  label: string;
};

export const PHOTO_FILTER_PRESETS: PhotoFilterPreset[] = [
  { id: 'original', label: 'Original' },
  { id: 'bw', label: 'B&W' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'cool', label: 'Cool' },
  { id: 'warm', label: 'Warm' },
  { id: 'vivid', label: 'Vivid' },
];
