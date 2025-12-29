'use client';

import { HTMLAttributes } from 'react';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant: 'live' | 'coming-soon' | 'offline' | 'new' | 'verified' | 'premium';
  size?: 'xs' | 'sm' | 'md';
  pulse?: boolean;
}

/**
 * Premium status badge component for LIVE, COMING SOON, and other states.
 * Includes animated pulse effects for live states.
 */
export function StatusBadge({
  variant,
  size = 'sm',
  pulse = true,
  className = '',
  ...props
}: StatusBadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 font-bold uppercase tracking-wider';
  
  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[9px] rounded',
    sm: 'px-2 py-0.5 text-[10px] rounded-md',
    md: 'px-2.5 py-1 text-xs rounded-lg',
  };

  const variantConfig = {
    live: {
      bg: 'bg-red-500',
      text: 'text-white',
      glow: 'shadow-lg shadow-red-500/30',
      dot: 'bg-white',
      label: 'LIVE',
      animate: pulse,
    },
    'coming-soon': {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      text: 'text-white',
      glow: 'shadow-md shadow-amber-500/20',
      dot: null,
      label: 'COMING SOON',
      animate: false,
    },
    offline: {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      glow: '',
      dot: 'bg-muted-foreground',
      label: 'OFFLINE',
      animate: false,
    },
    new: {
      bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
      text: 'text-white',
      glow: 'shadow-md shadow-emerald-500/20',
      dot: null,
      label: 'NEW',
      animate: true,
    },
    verified: {
      bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      text: 'text-white',
      glow: 'shadow-md shadow-blue-500/20',
      dot: null,
      label: '✓ VERIFIED',
      animate: false,
    },
    premium: {
      bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
      text: 'text-white',
      glow: 'shadow-md shadow-purple-500/20',
      dot: null,
      label: '★ PREMIUM',
      animate: true,
    },
  };

  const config = variantConfig[variant];

  return (
    <span
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${config.bg}
        ${config.text}
        ${config.glow}
        ${config.animate ? 'animate-pulse' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Pulsing dot for live state */}
      {config.dot && (
        <span className="relative flex h-2 w-2">
          {config.animate && (
            <span className={`absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75 animate-ping`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
        </span>
      )}
      
      {config.label}
    </span>
  );
}

/**
 * Compact live indicator (just the pulsing dot)
 */
export function LiveDot({ className = '' }: { className?: string }) {
  return (
    <span className={`relative flex h-2.5 w-2.5 ${className}`}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  );
}

export default StatusBadge;






