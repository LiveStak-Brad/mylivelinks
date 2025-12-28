declare module 'react-native-image-filter-kit' {
  import type { ComponentType, ReactElement } from 'react';
  import type { ViewProps } from 'react-native';

  type FilterEvent<T> = { nativeEvent: T };

  export type ImageFilterProps = ViewProps & {
    image: ReactElement;
    extractImageEnabled?: boolean;
    onExtractImage?: (event: FilterEvent<{ uri: string }>) => void;
    onFilteringError?: (event: FilterEvent<{ message: string }>) => void;
  };

  export const Grayscale: ComponentType<ImageFilterProps & { amount?: number }>;
  export const Sepia: ComponentType<ImageFilterProps & { amount?: number }>;
  export const Cool: ComponentType<ImageFilterProps>;
  export const Warm: ComponentType<ImageFilterProps>;
  export const Contrast: ComponentType<ImageFilterProps & { amount?: number }>;

  export function cleanExtractedImagesCache(): void;
}
