'use client';

/**
 * /dev/grids - Grid Layout Preview Tool
 * 
 * Test and preview the MultiHostGrid component with different
 * participant counts and modes.
 * 
 * Features:
 * - Grid layout preview (2, 4, 9 slots)
 * - Host emphasis for partial fills
 * - Per-tile volume controls
 * - Mobile and desktop previews
 */

import { useState, useMemo, useCallback } from 'react';
import MultiHostGrid from '@/components/battle/MultiHostGrid';
import type { GridTileParticipant } from '@/components/battle/GridTile';
import type { GridMode, ParticipantVolume } from '@/components/battle/MultiHostGrid';
import BattleTileOverlay, { 
  generateMockBattleStates, 
  type BattleMode as BattleOverlayMode,
  type BattleParticipantState 
} from '@/components/battle/BattleTileOverlay';
import BattleScoreSlider from '@/components/battle/BattleScoreSlider';
import { Users, Swords, LayoutGrid, Crown, RotateCcw, Boxes, X, Eye, Settings, Volume2, Maximize2, Flame } from 'lucide-react';

// Generate mock participants
function generateParticipants(count: number, hostIndex: number): GridTileParticipant[] {
  const names = [
    'StreamerPro', 'GamerGirl', 'TechWizard', 'MusicMaven',
    'ArtistX', 'ComedyKing', 'FitnessGuru', 'ChefMaster', 'TravelDude'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `participant-${i + 1}`,
    name: names[i] || `User${i + 1}`,
    isHost: i === hostIndex,
    avatarUrl: undefined, // Using placeholder avatars
  }));
}

// Generate initial volume states for all participants
function generateInitialVolumes(count: number): ParticipantVolume[] {
  return Array.from({ length: count }, (_, i) => ({
    participantId: `participant-${i + 1}`,
    volume: 0.7,
    isMuted: false,
  }));
}

export default function GridsPreviewPage() {
  // Controls
  const [participantCount, setParticipantCount] = useState(4);
  const [maxSlots, setMaxSlots] = useState<2 | 4 | 9>(4);
  const [hostIndex, setHostIndex] = useState(0);
  const [showBattleOverlay, setShowBattleOverlay] = useState(false);
  const [mode, setMode] = useState<GridMode>('squad');
  
  // Battle mode state
  const [battleMode, setBattleMode] = useState<BattleOverlayMode>('ffa');
  
  // Volume state for all participants
  const [volumes, setVolumes] = useState<ParticipantVolume[]>(() => generateInitialVolumes(9));
  
  // Maximized participant state
  const [maximizedParticipantId, setMaximizedParticipantId] = useState<string | null>(null);
  
  // Hidden video state (participants whose video the user has hidden)
  const [hiddenVideoIds, setHiddenVideoIds] = useState<Set<string>>(new Set());
  
  // Show all grids at once toggle
  const [showAllGrids, setShowAllGrids] = useState(false);
  
  // Generate participants based on settings
  const participants = useMemo(() => 
    generateParticipants(participantCount, hostIndex),
    [participantCount, hostIndex]
  );
  
  // Generate mock battle states for overlay
  const battleStates = useMemo(() => {
    if (!showBattleOverlay) return new Map<string, BattleParticipantState>();
    return generateMockBattleStates(
      participants.map(p => p.id),
      battleMode
    );
  }, [participants, showBattleOverlay, battleMode]);
  
  // Battle overlay renderer
  const renderBattleOverlay = useCallback((p: GridTileParticipant) => {
    const state = battleStates.get(p.id);
    if (!state) return null;
    return (
      <BattleTileOverlay
        participantId={p.id}
        battleState={state}
        battleMode={battleMode}
        compact={participantCount > 4}
      />
    );
  }, [battleStates, battleMode, participantCount]);
  
  // Current user ID (simulating the viewer/host perspective)
  // participant-1 = first participant (host position 0)
  const currentUserId = `participant-${hostIndex + 1}`;
  
  // Volume control callbacks
  const handleVolumeChange = useCallback((participantId: string, volume: number) => {
    setVolumes(prev => prev.map(v => 
      v.participantId === participantId 
        ? { ...v, volume, isMuted: volume === 0 } 
        : v
    ));
  }, []);
  
  const handleMuteToggle = useCallback((participantId: string) => {
    setVolumes(prev => prev.map(v => 
      v.participantId === participantId 
        ? { ...v, isMuted: !v.isMuted } 
        : v
    ));
  }, []);
  
  // Maximize toggle callback
  const handleMaximizeToggle = useCallback((participantId: string) => {
    setMaximizedParticipantId(prev => 
      prev === participantId ? null : participantId
    );
  }, []);
  
  // Video hidden toggle callback
  const handleVideoHiddenToggle = useCallback((participantId: string) => {
    setHiddenVideoIds(prev => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  }, []);
  
  // Sync mode with maxSlots
  const handleModeChange = (newMode: GridMode) => {
    setMode(newMode);
    switch (newMode) {
      case 'duo':
        setMaxSlots(2);
        if (participantCount > 2) setParticipantCount(2);
        break;
      case 'squad':
        setMaxSlots(4);
        if (participantCount > 4) setParticipantCount(4);
        break;
      case 'ffa':
        setMaxSlots(9);
        break;
    }
  };
  
  // Quick presets
  const presets = [
    { label: '1v1', count: 2, slots: 2 as const, mode: 'duo' as GridMode },
    { label: '2v2', count: 4, slots: 4 as const, mode: 'squad' as GridMode },
    { label: '3v3v3', count: 9, slots: 9 as const, mode: 'ffa' as GridMode },
    { label: '5 FFA', count: 5, slots: 9 as const, mode: 'ffa' as GridMode },
    { label: '3 Partial', count: 3, slots: 4 as const, mode: 'squad' as GridMode },
  ];
  
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Grid Layout Preview</h1>
                <p className="text-sm text-white/50">/dev/grids</p>
              </div>
            </div>
            
            {/* Quick presets */}
            <div className="flex items-center gap-2">
              {presets.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setParticipantCount(preset.count);
                    setMaxSlots(preset.slots);
                    setMode(preset.mode);
                    setHostIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    participantCount === preset.count && maxSlots === preset.slots
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Mode Selector */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Mode
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(['duo', 'squad', 'ffa'] as GridMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      mode === m
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {m === 'duo' ? '1v1' : m === 'squad' ? '2v2' : 'FFA'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Participant Count */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participants: {participantCount}
              </h3>
              <input
                type="range"
                min={1}
                max={maxSlots}
                value={participantCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setParticipantCount(val);
                  if (hostIndex >= val) setHostIndex(0);
                }}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>1</span>
                <span>{maxSlots}</span>
              </div>
            </div>
            
            {/* Max Slots */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                <Boxes className="w-4 h-4" />
                Max Slots
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {([2, 4, 9] as const).map(slots => (
                  <button
                    key={slots}
                    onClick={() => {
                      setMaxSlots(slots);
                      if (participantCount > slots) setParticipantCount(slots);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      maxSlots === slots
                        ? 'bg-cyan-500 text-black'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {slots}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Host Selector */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Host Position
              </h3>
              <div className="flex flex-wrap gap-2">
                {participants.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHostIndex(i)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                      hostIndex === i
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Battle Overlay Toggle */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-4 h-4" />
                Battle Mode
              </h3>
              <button
                onClick={() => setShowBattleOverlay(!showBattleOverlay)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                  showBattleOverlay
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {showBattleOverlay ? 'Battle ON' : 'Battle OFF'}
              </button>
              
              {/* Battle Mode Selector */}
              {showBattleOverlay && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="text-xs text-white/50">Battle Type:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {(['duel', 'team', 'ffa', '1vAll'] as BattleOverlayMode[]).map(bm => (
                      <button
                        key={bm}
                        onClick={() => setBattleMode(bm)}
                        className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                          battleMode === bm
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white/70'
                        }`}
                      >
                        {bm === 'duel' ? '1v1' : bm === 'team' ? 'Team' : bm === '1vAll' ? '1 v All' : 'FFA'}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {battleMode === 'duel' && '2 players, head-to-head'}
                    {battleMode === 'team' && '2-3 teams, shared colors'}
                    {battleMode === '1vAll' && 'Host vs everyone else'}
                    {battleMode === 'ffa' && 'Free-for-all, unique colors'}
                  </div>
                </div>
              )}
            </div>
            
            {/* Reset Button */}
            <button
              onClick={() => {
                setParticipantCount(4);
                setMaxSlots(4);
                setHostIndex(0);
                setMode('squad');
                setShowBattleOverlay(false);
              }}
              className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            
            {/* Show All Grids Toggle */}
            <button
              onClick={() => setShowAllGrids(!showAllGrids)}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                showAllGrids
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              {showAllGrids ? 'Hide All Grids' : 'Show All Grids (2-9)'}
            </button>
            
            {/* Current State Debug */}
            <div className="bg-black/50 rounded-xl p-4 space-y-2 font-mono text-xs">
              <div className="text-white/40">Current State:</div>
              <div className="text-green-400">mode: "{mode}"</div>
              <div className="text-cyan-400">maxSlots: {maxSlots}</div>
              <div className="text-purple-400">participants: {participantCount}</div>
              <div className="text-amber-400">hostIndex: {hostIndex}</div>
              <div className="text-pink-400">isFull: {participantCount === maxSlots ? 'true' : 'false'}</div>
              <div className="text-blue-400">currentUserId: {currentUserId}</div>
              <div className="text-orange-400">maximized: {maximizedParticipantId || 'none'}</div>
            </div>
            
            {/* Volume Controls Info */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Per-Tile Volume
              </h3>
              <p className="text-xs text-white/50">
                Click the 🔊 button on any tile (except your own) to show volume slider. 
                Click again to mute/unmute.
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {participants.map(p => {
                  const vol = volumes.find(v => v.participantId === p.id);
                  const isSelf = p.id === currentUserId;
                  return (
                    <div 
                      key={p.id} 
                      className={`flex items-center justify-between text-xs ${isSelf ? 'opacity-50' : ''}`}
                    >
                      <span className="text-white/70">
                        {p.name} {isSelf && '(you)'}
                      </span>
                      <span className={vol?.isMuted ? 'text-red-400' : 'text-green-400'}>
                        {vol?.isMuted ? 'MUTED' : `${Math.round((vol?.volume || 0.7) * 100)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Grid Preview Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Show All Grids View */}
            {showAllGrids ? (
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
                  📊 All Grid Layouts (2-9 Participants) - Battle Mode: {battleMode === '1vAll' ? '1 v All' : battleMode.toUpperCase()}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[2, 3, 4, 5, 6, 7, 8, 9].map(count => {
                    const gridParticipants = generateParticipants(count, 0);
                    const gridBattleStates = showBattleOverlay 
                      ? generateMockBattleStates(gridParticipants.map(p => p.id), battleMode)
                      : new Map<string, BattleParticipantState>();
                    
                    const gridRenderOverlay = showBattleOverlay 
                      ? (p: GridTileParticipant) => {
                          const state = gridBattleStates.get(p.id);
                          if (!state) return null;
                          return (
                            <BattleTileOverlay
                              participantId={p.id}
                              battleState={state}
                              battleMode={battleMode}
                              compact={count > 4}
                            />
                          );
                        }
                      : undefined;
                    
                    return (
                      <div key={count} className="bg-black rounded-lg overflow-hidden border border-white/10">
                        <div className="text-xs font-bold text-white/70 px-2 py-1 bg-white/5 flex justify-between">
                          <span>{count} Participant{count > 1 ? 's' : ''}</span>
                          <span className="text-white/40">
                            {count <= 2 ? 'duo' : count <= 4 ? 'squad' : 'ffa'}
                          </span>
                        </div>
                        {showBattleOverlay && gridBattleStates.size > 0 && (
                          <div className="py-0.5">
                            <BattleScoreSlider 
                              battleStates={gridBattleStates}
                              battleMode={battleMode}
                              height={14}
                            />
                          </div>
                        )}
                        <div className="aspect-[4/3]">
                          <MultiHostGrid
                            participants={gridParticipants}
                            mode={count <= 2 ? 'duo' : count <= 4 ? 'squad' : 'ffa'}
                            maxSlots={count <= 2 ? 2 : count <= 4 ? 4 : 9}
                            renderOverlay={gridRenderOverlay}
                            currentUserId="participant-1"
                            volumes={volumes}
                            onVolumeChange={() => {}}
                            onMuteToggle={() => {}}
                            maximizedParticipantId={null}
                            onMaximizeToggle={() => {}}
                            hiddenVideoIds={new Set()}
                            onVideoHiddenToggle={() => {}}
                            isBattleMode={showBattleOverlay}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
            <>
            {/* Desktop Preview - With Top Bar */}
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
                🖥️ Desktop Preview - With Top Bar
              </h3>
              <div className="bg-black rounded-2xl overflow-hidden border border-white/10">
                {/* Top Bar - Host Info (like SoloHostStream/SoloStreamViewer) */}
                <div className="h-14 px-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                  {/* Left: Streamer info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    <div>
                      <div className="text-sm font-bold text-white">StreamerPro</div>
                      <div className="text-xs text-white/50">Battle Mode</div>
                    </div>
                  </div>
                  
                  {/* Center: Viewer count */}
                  <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
                    <Eye className="w-4 h-4 text-white/70" />
                    <span className="text-sm font-medium text-white">1,234 viewers</span>
                  </div>
                  
                  {/* Right: Controls */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-white/70" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <X className="w-4 h-4 text-white/70" />
                    </div>
                  </div>
                </div>
                
                {/* Battle Score Slider - shows when battle is active */}
                {showBattleOverlay && battleStates.size > 0 && (
                  <div className="py-1">
                    <BattleScoreSlider 
                      battleStates={battleStates}
                      battleMode={battleMode}
                      height={20}
                    />
                  </div>
                )}
                
                {/* Grid Area */}
                <div className="aspect-[4/3]">
                  <MultiHostGrid
                    participants={participants}
                    mode={mode}
                    maxSlots={maxSlots}
                    renderOverlay={showBattleOverlay ? renderBattleOverlay : undefined}
                    currentUserId={currentUserId}
                    volumes={volumes}
                    onVolumeChange={handleVolumeChange}
                    onMuteToggle={handleMuteToggle}
                    maximizedParticipantId={maximizedParticipantId}
                    onMaximizeToggle={handleMaximizeToggle}
                    hiddenVideoIds={hiddenVideoIds}
                    onVideoHiddenToggle={handleVideoHiddenToggle}
                    isBattleMode={showBattleOverlay}
                  />
                </div>
                
                {/* Fake Chat Panel (to verify positioning) */}
                <div className="border-t border-white/10 bg-gray-900/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      💬
                    </div>
                    <span className="text-sm font-semibold text-white/70">Live Chat</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { user: 'Viewer1', msg: 'This grid looks great!' },
                      { user: 'Viewer2', msg: 'Love the host emphasis layout' },
                      { user: 'Viewer3', msg: '🔥🔥🔥' },
                    ].map((chat, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-purple-400 font-medium">{chat.user}:</span>
                        <span className="text-white/80 ml-2">{chat.msg}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Send a message..."
                      className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-purple-500/50"
                      disabled
                    />
                    <button className="px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium" disabled>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile Preview - Matches actual host/viewer layout */}
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
                📱 Mobile Preview (375px width) - With Top Bar + Safe Zone
              </h3>
              <div className="mx-auto" style={{ maxWidth: '375px' }}>
                <div className="bg-black rounded-2xl overflow-hidden border border-white/10">
                  <div className="aspect-[9/16] flex flex-col relative">
                    {/* Safe Area - Top (simulates notch/status bar) */}
                    <div className={`h-8 bg-black/80 flex items-center justify-center z-30 ${maximizedParticipantId ? 'absolute top-0 left-0 right-0' : ''}`}>
                      <div className="w-20 h-4 bg-gray-800 rounded-full" />
                    </div>
                    
                    {/* Top Bar - Host Info (like SoloHostStream/SoloStreamViewer) */}
                    <div className={`h-14 px-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-30 ${maximizedParticipantId ? 'absolute top-8 left-0 right-0' : ''}`}>
                      {/* Left: Back/Close button placeholder */}
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <X className="w-4 h-4 text-white/70" />
                      </div>
                      
                      {/* Center: Viewer count */}
                      <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-full">
                        <Eye className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-xs font-medium text-white">1.2K</span>
                      </div>
                      
                      {/* Right: Settings/Options placeholder */}
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-white/70" />
                      </div>
                    </div>
                    
                    {/* Battle Score Slider - mobile */}
                    {showBattleOverlay && battleStates.size > 0 && !maximizedParticipantId && (
                      <div className="py-0.5 z-20">
                        <BattleScoreSlider 
                          battleStates={battleStates}
                          battleMode={battleMode}
                          height={16}
                        />
                      </div>
                    )}
                    
                    {/* Grid Area - Full screen when maximized */}
                    <div className={`${maximizedParticipantId ? 'absolute inset-0' : 'flex-1'}`}>
                      <MultiHostGrid
                        participants={participants}
                        mode={mode}
                        maxSlots={maxSlots}
                        renderOverlay={showBattleOverlay ? renderBattleOverlay : undefined}
                        currentUserId={currentUserId}
                        volumes={volumes}
                        onVolumeChange={handleVolumeChange}
                        onMuteToggle={handleMuteToggle}
                        maximizedParticipantId={maximizedParticipantId}
                        onMaximizeToggle={handleMaximizeToggle}
                        hiddenVideoIds={hiddenVideoIds}
                        onVideoHiddenToggle={handleVideoHiddenToggle}
                        isBattleMode={showBattleOverlay}
                      />
                    </div>
                    
                    {/* Chat Area - Overlay when maximized, normal when not */}
                    <div className={`${
                      maximizedParticipantId 
                        ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 z-20' 
                        : 'h-[35%] border-t border-white/10 bg-gray-900/50 p-3'
                    }`}>
                      <div className={`${maximizedParticipantId ? '' : 'h-full'} flex flex-col`}>
                        <div className={`${maximizedParticipantId ? 'max-h-24' : 'flex-1'} overflow-hidden space-y-1.5`}>
                          {[
                            { user: 'Fan1', msg: '🔥🔥🔥' },
                            { user: 'Viewer2', msg: 'Go team!' },
                            { user: 'SuperFan', msg: 'Amazing battle!' },
                          ].map((chat, i) => (
                            <div key={i} className="text-xs">
                              <span className="text-purple-400 font-medium">{chat.user}:</span>
                              <span className="text-white/70 ml-1">{chat.msg}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            placeholder="Say something..."
                            className="flex-1 px-2 py-1.5 bg-white/10 rounded-lg text-xs text-white placeholder-white/40"
                            disabled
                          />
                          <button className="px-3 py-1.5 bg-purple-500 rounded-lg text-xs font-medium" disabled>
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
