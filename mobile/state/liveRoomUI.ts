/**
 * Single source of truth for LiveRoom UI state
 * Manages overlay visibility and ensures only one overlay is open at a time
 */

import { useState, useCallback } from 'react';
import type { OverlayType, LiveRoomUIState } from '../types/live';

const DEBUG = process.env.EXPO_PUBLIC_DEBUG_LIVE === '1';

const initialState: LiveRoomUIState = {
  activeOverlay: null,
  isConnected: false,
  // Gesture state (UI-only)
  isEditMode: false,
  focusedIdentity: null,
  tileSlots: [], // Will be populated with participant identities
};

/**
 * Hook for managing live room UI state
 * Ensures only ONE overlay is open at a time
 */
export function useLiveRoomUI() {
  const [state, setState] = useState<LiveRoomUIState>(initialState);

  const openOverlay = useCallback((overlay: OverlayType) => {
    setState(prev => ({
      ...prev,
      activeOverlay: overlay,
    }));
  }, []);

  const closeOverlay = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeOverlay: null,
    }));
  }, []);

  const setConnected = useCallback((connected: boolean) => {
    setState(prev => ({
      ...prev,
      isConnected: connected,
    }));
  }, []);

  // Gesture state management (UI-only)
  const enterEditMode = useCallback(() => {
    if (DEBUG) console.log('[GESTURE] Enter edit mode → user can reorder tiles');
    setState(prev => ({
      ...prev,
      isEditMode: true,
    }));
  }, []);

  const exitEditMode = useCallback(() => {
    if (DEBUG) console.log('[GESTURE] Exit edit mode → restore normal interaction');
    setState(prev => ({
      ...prev,
      isEditMode: false,
    }));
  }, []);

  const setFocusedIdentity = useCallback((identity: string | null) => {
    if (identity) {
      if (DEBUG) console.log(`[GESTURE] Double-tap → focus identity=${identity}`);
    } else {
      if (DEBUG) console.log('[GESTURE] Exit focus mode → restore grid');
    }
    setState(prev => ({
      ...prev,
      focusedIdentity: identity,
    }));
  }, []);

  const reorderTileSlots = useCallback((fromIndex: number, toIndex: number) => {
    if (DEBUG) console.log(`[GESTURE] Drag swap index ${fromIndex} ↔ ${toIndex}`);
    setState(prev => {
      const newSlots = [...prev.tileSlots];
      const [moved] = newSlots.splice(fromIndex, 1);
      newSlots.splice(toIndex, 0, moved);
      return {
        ...prev,
        tileSlots: newSlots,
      };
    });
  }, []);

  const initializeTileSlots = useCallback((identities: string[]) => {
    setState(prev => ({
      ...prev,
      tileSlots: identities,
    }));
  }, []);

  return {
    state,
    openOverlay,
    closeOverlay,
    setConnected,
    // Gesture methods
    enterEditMode,
    exitEditMode,
    setFocusedIdentity,
    reorderTileSlots,
    initializeTileSlots,
  };
}

