'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

export interface VideoFilterSettings {
  blur: number;        // 0-4 (px)
  smoothing: number;   // 0-3 (strength levels)
  brightness: number;  // 0.5-1.5 (1 = normal)
  contrast: number;    // 0.5-1.5 (1 = normal)  
  saturation: number;  // 0-2 (1 = normal)
}

export const DEFAULT_FILTER_SETTINGS: VideoFilterSettings = {
  blur: 0,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  smoothing: 0,
};

const STORAGE_KEY = 'mylivelinks_stream_filters';

// Check if filters are at default (no processing needed)
export function areFiltersDefault(settings: VideoFilterSettings): boolean {
  return (
    settings.blur === 0 &&
    settings.smoothing === 0 &&
    settings.brightness === 1 &&
    settings.contrast === 1 &&
    settings.saturation === 1
  );
}

// Load saved filter settings from localStorage
export function loadFilterSettings(): VideoFilterSettings {
  if (typeof window === 'undefined') return DEFAULT_FILTER_SETTINGS;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        blur: parsed.blur ?? DEFAULT_FILTER_SETTINGS.blur,
        smoothing: parsed.smoothing ?? DEFAULT_FILTER_SETTINGS.smoothing,
        brightness: parsed.brightness ?? DEFAULT_FILTER_SETTINGS.brightness,
        contrast: parsed.contrast ?? DEFAULT_FILTER_SETTINGS.contrast,
        saturation: parsed.saturation ?? DEFAULT_FILTER_SETTINGS.saturation,
      };
    }
  } catch (e) {
    console.warn('[useVideoFilterPipeline] Error loading saved filters:', e);
  }
  return DEFAULT_FILTER_SETTINGS;
}

// Save filter settings to localStorage
export function saveFilterSettings(settings: VideoFilterSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[useVideoFilterPipeline] Error saving filters:', e);
  }
}

interface UseVideoFilterPipelineOptions {
  maxWidth?: number;
  maxHeight?: number;
  frameRate?: number;
}

interface UseVideoFilterPipelineReturn {
  // The processed track (or null if pipeline not active)
  processedTrack: MediaStreamTrack | null;
  // Whether pipeline is currently active
  isProcessing: boolean;
  // Start processing a source track with given filters - returns Promise with processed track
  startPipeline: (sourceTrack: MediaStreamTrack, settings: VideoFilterSettings) => Promise<MediaStreamTrack | null>;
  // Update filter settings without restarting pipeline
  updateFilters: (settings: VideoFilterSettings) => void;
  // Stop the pipeline and cleanup
  stopPipeline: () => void;
  // Current filter settings
  currentSettings: VideoFilterSettings;
}

export function useVideoFilterPipeline(
  options: UseVideoFilterPipelineOptions = {}
): UseVideoFilterPipelineReturn {
  const { maxWidth = 1280, maxHeight = 720, frameRate = 30 } = options;

  // Refs for canvas pipeline
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceTrackRef = useRef<MediaStreamTrack | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  
  // Current filter settings (ref for animation loop access)
  const settingsRef = useRef<VideoFilterSettings>(DEFAULT_FILTER_SETTINGS);
  
  // State for external consumers
  const [processedTrack, setProcessedTrack] = useState<MediaStreamTrack | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<VideoFilterSettings>(DEFAULT_FILTER_SETTINGS);

  // Build CSS filter string from settings
  const buildFilterString = useCallback((settings: VideoFilterSettings): string => {
    const filters: string[] = [];
    
    // Combine blur + smoothing for total blur effect
    const totalBlur = settings.blur + (settings.smoothing * 0.35);
    if (totalBlur > 0) {
      filters.push(`blur(${totalBlur}px)`);
    }
    
    if (settings.brightness !== 1) {
      filters.push(`brightness(${settings.brightness})`);
    }
    
    if (settings.contrast !== 1) {
      filters.push(`contrast(${settings.contrast})`);
    }
    
    if (settings.saturation !== 1) {
      filters.push(`saturate(${settings.saturation})`);
    }
    
    return filters.length > 0 ? filters.join(' ') : 'none';
  }, []);

  // The render loop that applies filters
  const renderFrame = useCallback(() => {
    const video = sourceVideoRef.current;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    
    if (!video || !canvas || !ctx || video.paused || video.ended) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }
    
    // Calculate scaled dimensions maintaining aspect ratio
    let drawWidth = video.videoWidth;
    let drawHeight = video.videoHeight;
    
    if (drawWidth > maxWidth || drawHeight > maxHeight) {
      const scale = Math.min(maxWidth / drawWidth, maxHeight / drawHeight);
      drawWidth = Math.floor(drawWidth * scale);
      drawHeight = Math.floor(drawHeight * scale);
    }
    
    // Ensure minimum dimensions
    if (drawWidth < 1) drawWidth = maxWidth;
    if (drawHeight < 1) drawHeight = maxHeight;
    
    // Resize canvas if needed
    if (canvas.width !== drawWidth || canvas.height !== drawHeight) {
      canvas.width = drawWidth;
      canvas.height = drawHeight;
      console.log('[useVideoFilterPipeline] Canvas resized to:', drawWidth, 'x', drawHeight);
    }
    
    // Apply CSS filters to canvas context
    const filterString = buildFilterString(settingsRef.current);
    ctx.filter = filterString;
    
    // Draw the video frame
    ctx.drawImage(video, 0, 0, drawWidth, drawHeight);
    
    // Continue loop
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [maxWidth, maxHeight, buildFilterString]);

  // Start the processing pipeline - returns Promise that resolves with the processed track
  const startPipeline = useCallback(async (
    sourceTrack: MediaStreamTrack,
    settings: VideoFilterSettings
  ): Promise<MediaStreamTrack | null> => {
    console.log('[useVideoFilterPipeline] Starting pipeline with settings:', settings);
    
    // If filters are default, don't process - return null to signal use raw track
    if (areFiltersDefault(settings)) {
      console.log('[useVideoFilterPipeline] Filters at default, skipping pipeline');
      return null;
    }
    
    // Store settings
    settingsRef.current = settings;
    setCurrentSettings(settings);
    
    // Create hidden video element to receive source
    if (!sourceVideoRef.current) {
      sourceVideoRef.current = document.createElement('video');
      sourceVideoRef.current.muted = true;
      sourceVideoRef.current.playsInline = true;
      sourceVideoRef.current.autoplay = true;
    }
    
    // Create canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = maxWidth;
      canvasRef.current.height = maxHeight;
      ctxRef.current = canvasRef.current.getContext('2d', { 
        willReadFrequently: false,
        alpha: false 
      });
    }
    
    // Stop any existing pipeline
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Set up source video from track
    const sourceStream = new MediaStream([sourceTrack]);
    sourceVideoRef.current.srcObject = sourceStream;
    sourceTrackRef.current = sourceTrack;
    
    // Return promise that resolves when video is ready and capturing
    return new Promise((resolve, reject) => {
      const video = sourceVideoRef.current!;
      const timeout = setTimeout(() => {
        reject(new Error('Video load timeout'));
      }, 5000);
      
      const handleReady = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', handleReady);
        video.removeEventListener('loadeddata', handleReady);
        
        console.log('[useVideoFilterPipeline] Source video ready:', 
          video.videoWidth, 'x', video.videoHeight);
        
        // Start render loop
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        
        // Capture stream from canvas
        try {
          processedStreamRef.current = canvasRef.current!.captureStream(frameRate);
          const videoTracks = processedStreamRef.current.getVideoTracks();
          
          if (videoTracks.length > 0) {
            const outputTrack = videoTracks[0];
            setProcessedTrack(outputTrack);
            setIsProcessing(true);
            console.log('[useVideoFilterPipeline] Pipeline started, output track ready');
            resolve(outputTrack);
          } else {
            reject(new Error('No video tracks from canvas capture'));
          }
        } catch (e) {
          console.error('[useVideoFilterPipeline] Error capturing stream:', e);
          reject(e);
        }
      };
      
      // Listen for video ready
      video.addEventListener('loadedmetadata', handleReady);
      video.addEventListener('loadeddata', handleReady);
      
      // If video is already loaded, trigger immediately
      if (video.readyState >= 2) {
        handleReady();
      }
      
      // Start playback
      video.play().catch(e => {
        console.warn('[useVideoFilterPipeline] Video play error:', e);
        // Don't reject - loadedmetadata may still fire
      });
    });
  }, [maxWidth, maxHeight, frameRate, renderFrame]);

  // Update filters without restarting pipeline
  const updateFilters = useCallback((settings: VideoFilterSettings) => {
    console.log('[useVideoFilterPipeline] Updating filters:', settings);
    settingsRef.current = settings;
    setCurrentSettings(settings);
    saveFilterSettings(settings);
  }, []);

  // Stop the pipeline and cleanup
  const stopPipeline = useCallback(() => {
    console.log('[useVideoFilterPipeline] Stopping pipeline');
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach(track => track.stop());
      processedStreamRef.current = null;
    }
    
    if (sourceVideoRef.current) {
      sourceVideoRef.current.pause();
      sourceVideoRef.current.srcObject = null;
    }
    
    sourceTrackRef.current = null;
    setProcessedTrack(null);
    setIsProcessing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPipeline();
    };
  }, [stopPipeline]);

  return {
    processedTrack,
    isProcessing,
    startPipeline,
    updateFilters,
    stopPipeline,
    currentSettings,
  };
}
