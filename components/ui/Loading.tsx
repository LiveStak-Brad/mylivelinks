'use client';

import { HTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

/**
 * Premium loading component with multiple variants.
 */
export function Loading({
  variant = 'spinner',
  size = 'md',
  text,
  fullScreen = false,
  className = '',
  ...props
}: LoadingProps) {
  const sizeStyles = {
    sm: { spinner: 'w-4 h-4', dots: 'w-1.5 h-1.5', text: 'text-xs' },
    md: { spinner: 'w-6 h-6', dots: 'w-2 h-2', text: 'text-sm' },
    lg: { spinner: 'w-8 h-8', dots: 'w-2.5 h-2.5', text: 'text-base' },
  };

  const wrapperClass = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50' 
    : 'flex items-center justify-center';

  const renderLoader = () => {
    switch (variant) {
      case 'spinner':
        return (
          <Loader2 
            className={`${sizeStyles[size].spinner} text-primary animate-spin`} 
          />
        );
        
      case 'dots':
        return (
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`
                  ${sizeStyles[size].dots} rounded-full bg-primary
                  animate-bounce
                `}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        );
        
      case 'pulse':
        return (
          <div className="relative">
            <div className={`${sizeStyles[size].spinner} rounded-full bg-primary/30`} />
            <div 
              className={`absolute inset-0 ${sizeStyles[size].spinner} rounded-full bg-primary animate-ping`} 
            />
          </div>
        );
        
      case 'skeleton':
        return (
          <div className="space-y-3 w-full max-w-xs">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className={`${wrapperClass} ${className}`} {...props}>
      <div className="flex flex-col items-center gap-3">
        {renderLoader()}
        {text && (
          <p className={`${sizeStyles[size].text} text-muted-foreground animate-pulse`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Full-page loading overlay with branding
 */
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo placeholder */}
        <div className="relative">
          <div className="absolute inset-0 -m-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
        
        <p className="text-muted-foreground animate-pulse">{text}</p>
      </div>
    </div>
  );
}

export default Loading;







