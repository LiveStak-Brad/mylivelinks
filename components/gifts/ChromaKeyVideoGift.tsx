'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface ChromaKeyVideoGiftProps {
  src: string;
  maxSize?: number;
  minGreen?: number;
  greenDelta?: number;
  onEnded?: () => void;
  onError?: () => void;
}

const DEFAULT_MIN_GREEN = 140;
const DEFAULT_GREEN_DELTA = 40;

export default function ChromaKeyVideoGift({
  src,
  maxSize = 280,
  minGreen = DEFAULT_MIN_GREEN,
  greenDelta = DEFAULT_GREEN_DELTA,
  onEnded,
  onError,
}: ChromaKeyVideoGiftProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

  const threshold = useMemo(
    () => ({
      minGreen,
      greenDelta,
    }),
    [minGreen, greenDelta]
  );

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    let isActive = true;

    const updateCanvasSize = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const aspect = video.videoWidth / video.videoHeight;
      let width = maxSize;
      let height = Math.max(1, Math.round(maxSize / aspect));
      if (height > maxSize) {
        height = maxSize;
        width = Math.max(1, Math.round(maxSize * aspect));
      }
      setDisplaySize({ width, height });
    };

    const drawFrame = () => {
      if (!isActive || video.paused || video.ended) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = frame;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (g >= threshold.minGreen && g >= r + threshold.greenDelta && g >= b + threshold.greenDelta) {
          data[i + 3] = 0;
        }
      }

      context.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(drawFrame);
    };

    const handleLoaded = () => {
      updateCanvasSize();
      void video.play().catch(() => {
        onError?.();
      });
    };

    const handlePlay = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawFrame);
    };

    const handleEnded = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      onEnded?.();
    };

    const handleError = () => {
      onError?.();
    };

    video.addEventListener('loadeddata', handleLoaded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      isActive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.removeEventListener('loadeddata', handleLoaded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [src, maxSize, threshold, onEnded, onError]);

  return (
    <div className="flex items-center justify-center">
      <video ref={videoRef} src={src} className="hidden" playsInline muted preload="auto" />
      <canvas
        ref={canvasRef}
        style={{
          width: displaySize?.width ?? maxSize,
          height: displaySize?.height ?? maxSize,
        }}
      />
    </div>
  );
}
