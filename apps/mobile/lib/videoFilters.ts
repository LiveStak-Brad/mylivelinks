import type { LocalVideoTrack } from 'livekit-client';
import { installVideoFilters, isVideoFiltersAvailable, setFilterParams as nativeSetFilterParams, type FilterParams } from 'mll-video-filters';
import { NativeModules } from 'react-native';

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
  if (!isVideoFiltersAvailable()) {
    console.warn('[videoFilters] MLLVideoFilters not available at runtime. Video effects will not apply.');
    return;
  }

  // Attach our processor chain by name to the underlying RN WebRTC MediaStreamTrack.
  // livekit-client LocalTrack exposes `.mediaStreamTrack`, which is implemented by @livekit/react-native-webrtc.
  const mst: any = track.mediaStreamTrack;
  if (__DEV__) console.log('[videoFilters] attachFiltersToLocalVideoTrack', { hasMST: !!mst });

  // Preferred path: the track class should expose these helpers, which call into WebRTCModule internally.
  let attached = false;
  if (mst && typeof mst._setVideoEffect === 'function') {
    try {
      mst._setVideoEffect(EFFECT_NAME);
      attached = true;
      if (__DEV__) console.log('[videoFilters] attached effect via _setVideoEffect', EFFECT_NAME);
    } catch (e) {
      console.warn('[videoFilters] Failed to attach effect via _setVideoEffect', e);
    }
  } else if (mst && typeof mst._setVideoEffects === 'function') {
    try {
      mst._setVideoEffects([EFFECT_NAME]);
      attached = true;
      if (__DEV__) console.log('[videoFilters] attached effect via _setVideoEffects', [EFFECT_NAME]);
    } catch (e) {
      console.warn('[videoFilters] Failed to attach effect via _setVideoEffects', e);
    }
  }

  // Fallback path (more direct): call the native WebRTCModule method explicitly.
  // This helps if the underlying MediaStreamTrack instance isn't the expected class at runtime.
  if (!attached) {
    try {
      const webRTCModule: any = (NativeModules as any).WebRTCModule;
      const trackId = mst?.id ?? track.mediaStreamTrack?.id;
      if (webRTCModule?.mediaStreamTrackSetVideoEffects && typeof trackId === 'string') {
        webRTCModule.mediaStreamTrackSetVideoEffects(trackId, [EFFECT_NAME]);
        attached = true;
        if (__DEV__) console.log('[videoFilters] attached effect via WebRTCModule.mediaStreamTrackSetVideoEffects', trackId);
      }
    } catch (e) {
      console.warn('[videoFilters] Failed to attach effect via WebRTCModule.mediaStreamTrackSetVideoEffects', e);
    }
  }

  if (!attached) {
    console.warn('[videoFilters] Failed to attach video effect; filters will not be applied.');
  }
}

export function setFilterParams(params: FilterParams) {
  ensureVideoFiltersInstalled();
  if (__DEV__) console.log('[videoFilters] setFilterParams', params);
  nativeSetFilterParams(params);
}

