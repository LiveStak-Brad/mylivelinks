'use client';

import { RotateCw, Smartphone, Play, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui';

interface RotatePhoneOverlayProps {
  onContinue: () => void;
  onWatchAnyway?: () => void;
  showWatchAnyway?: boolean;
}

/**
 * Premium full-screen overlay shown on mobile web when device is in portrait mode.
 * Instructs the user to rotate their phone to landscape for the best live viewing experience.
 * Features beautiful animations and premium visual design.
 */
export default function RotatePhoneOverlay({ 
  onContinue, 
  onWatchAnyway,
  showWatchAnyway = false 
}: RotatePhoneOverlayProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-background via-background to-muted overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8 text-center">
        {/* Animated phone illustration */}
        <div className="relative mb-10">
          {/* Outer glow ring */}
          <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl animate-pulse" />
          
          {/* Phone container with rotation animation */}
          <div className="relative">
            {/* Phone in portrait (current state) */}
            <div className="relative w-24 h-36 rounded-2xl bg-gradient-to-b from-muted to-muted/80 border-2 border-border shadow-2xl overflow-hidden">
              {/* Screen */}
              <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <MonitorPlay className="w-8 h-8 text-primary/50" />
              </div>
              
              {/* Notch */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-border rounded-full" />
              
              {/* Home indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-border rounded-full" />
            </div>
            
            {/* Rotation indicator */}
            <div className="absolute -right-6 top-1/2 -translate-y-1/2">
              <div className="relative">
                <RotateCw 
                  className="w-8 h-8 text-primary animate-spin-slow" 
                  strokeWidth={2}
                />
                {/* Arrow glow */}
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Title with gradient */}
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
          Rotate Your Phone
        </h1>

        {/* Description */}
        <p className="text-muted-foreground text-base mb-8 max-w-xs leading-relaxed">
          Turn your phone to <span className="text-primary font-medium">landscape mode</span> for the best live viewing experience
        </p>

        {/* Visual transformation diagram */}
        <div className="flex items-center justify-center gap-6 mb-10 p-6 rounded-2xl bg-muted/30 border border-border/50">
          {/* Portrait (current) */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative w-10 h-16 rounded-lg bg-muted border-2 border-border/50 flex items-center justify-center overflow-hidden">
              <div className="w-6 h-3 bg-primary/30 rounded-sm" />
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/5" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Portrait</span>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center">
            <svg 
              className="w-8 h-8 text-primary" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* Landscape (target) */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative w-16 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/50 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20">
              <Play className="w-5 h-5 text-primary fill-primary/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
            </div>
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Landscape</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 w-full max-w-xs">
          <Button
            onClick={onContinue}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30 text-base font-semibold"
          >
            <RotateCw className="w-5 h-5 mr-2" />
            I've Rotated — Continue
          </Button>
          
          {showWatchAnyway && onWatchAnyway && (
            <Button
              onClick={onWatchAnyway}
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Watch in Portrait Anyway
            </Button>
          )}
        </div>

        {/* Help text */}
        <p className="text-muted-foreground/70 text-xs mt-8 max-w-xs">
          Tap the button after rotating to landscape orientation. Make sure your device's rotation lock is disabled.
        </p>
      </div>

      {/* Decorative corner elements */}
      <div className="absolute top-6 left-6 w-20 h-20 border-l-2 border-t-2 border-primary/20 rounded-tl-3xl" />
      <div className="absolute bottom-6 right-6 w-20 h-20 border-r-2 border-b-2 border-accent/20 rounded-br-3xl" />
      
      {/* Floating particles (decorative) */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-accent/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}
