export type PhotoFilterId = 'original' | 'bw' | 'sepia' | 'cool' | 'warm' | 'vivid';

export type PhotoFilterPreset = {
  id: PhotoFilterId;
  label: string;
  cssFilter: string;
};

export const PHOTO_FILTER_PRESETS: PhotoFilterPreset[] = [
  { id: 'original', label: 'Original', cssFilter: 'none' },
  { id: 'bw', label: 'B&W', cssFilter: 'grayscale(1)' },
  { id: 'sepia', label: 'Sepia', cssFilter: 'sepia(1)' },
  { id: 'cool', label: 'Cool', cssFilter: 'saturate(1.15) contrast(1.05) hue-rotate(10deg)' },
  { id: 'warm', label: 'Warm', cssFilter: 'sepia(0.25) saturate(1.25) contrast(1.05) brightness(1.03)' },
  { id: 'vivid', label: 'Vivid', cssFilter: 'contrast(1.12) saturate(1.35)' },
];

export function getPhotoFilterPreset(id: PhotoFilterId): PhotoFilterPreset {
  const found = PHOTO_FILTER_PRESETS.find((p) => p.id === id);
  return found || PHOTO_FILTER_PRESETS[0];
}
