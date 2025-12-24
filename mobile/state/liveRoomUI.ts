/**
 * Single source of truth for LiveRoom UI state
 * Manages overlay visibility and ensures only one overlay is open at a time
 */

import { useState, useCallback } from 'react';
import type { OverlayType, LiveRoomUIState } from '../types/live';

const initialState: LiveRoomUIState = {
  activeOverlay: null,
  isConnected: false,
  coinBalance: 0,
  diamondBalance: 0,
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

  const updateBalance = useCallback((coins: number, diamonds: number) => {
    setState(prev => ({
      ...prev,
      coinBalance: coins,
      diamondBalance: diamonds,
    }));
  }, []);

  // Gesture state management (UI-only)
  const enterEditMode = useCallback(() => {
    console.log('[GESTURE] Enter edit mode → user can reorder tiles');
    setState(prev => ({
      ...prev,
      isEditMode: true,
    }));
  }, []);

  const exitEditMode = useCallback(() => {
    console.log('[GESTURE] Exit edit mode → restore normal interaction');
    setState(prev => ({
      ...prev,
      isEditMode: false,
    }));
  }, []);

  const setFocusedIdentity = useCallback((identity: string | null) => {
    if (identity) {
      console.log(`[GESTURE] Double-tap → focus identity=${identity}`);
    } else {
      console.log('[GESTURE] Exit focus mode → restore grid');
    }
    setState(prev => ({
      ...prev,
      focusedIdentity: identity,
    }));
  }, []);

  const reorderTileSlots = useCallback((fromIndex: number, toIndex: number) => {
    console.log(`[GESTURE] Drag swap index ${fromIndex} ↔ ${toIndex}`);
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
    updateBalance,
    // Gesture methods
    enterEditMode,
    exitEditMode,
    setFocusedIdentity,
    reorderTileSlots,
    initializeTileSlots,
  };
}

