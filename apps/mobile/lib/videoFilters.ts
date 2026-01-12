import type { LocalVideoTrack } from 'livekit-client';
import { installVideoFilters, isVideoFiltersAvailable, setFilterParams as nativeSetFilterParams, type FilterParams } from 'mll-video-filters';

const EFFECT_NAME = 'mll_bcs';

let installed = false;

export function ensureVideoFiltersInstalled() {
  if (installed) return;
  installed = true;
  installVideoFilters();
  if (!isVideoFiltersAvailable()) {
    console.warn(
      '[videoFilters] Native module MLLVideoFilters is not linked. You must rebuild the dev client after running expo prebuild.'
    );
  }
}

export function attachFiltersToLocalVideoTrack(track: LocalVideoTrack) {
  // Ensure native processors are registered
  ensureVideoFiltersInstalled();

  // Attach our processor chain by name to the underlying RN WebRTC MediaStreamTrack.
  // livekit-client LocalTrack exposes `.mediaStreamTrack`, which is implemented by @livekit/react-native-webrtc.
  const mst: any = track.mediaStreamTrack;
  if (__DEV__) console.log('[videoFilters] attachFiltersToLocalVideoTrack', { hasMST: !!mst });
  if (mst && typeof mst._setVideoEffect === 'function') {
    mst._setVideoEffect(EFFECT_NAME);
  } else if (mst && typeof mst._setVideoEffects === 'function') {
    mst._setVideoEffects([EFFECT_NAME]);
  } else {
    console.warn('[videoFilters] Underlying MediaStreamTrack does not support _setVideoEffect(s).');
  }
}

export function setFilterParams(params: FilterParams) {
  ensureVideoFiltersInstalled();
  if (__DEV__) console.log('[videoFilters] setFilterParams', params);
  nativeSetFilterParams(params);
}

