'use client';

import { HTMLAttributes, forwardRef, ReactNode } from 'react';

/* =============================================================================
   BADGE COMPONENT
   
   Small label for status, counts, or categories.
   
   @example
   <Badge variant="success">Active</Badge>
   <Badge variant="destructive" size="sm">3</Badge>
============================================================================= */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Visual variant */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Optional icon to show before text */
  icon?: ReactNode;
  /** Add a subtle pulsing dot indicator */
  dot?: boolean;
  /** Dot color (if dot is true) */
  dotColor?: 'default' | 'success' | 'warning' | 'destructive';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'md',
      icon,
      dot = false,
      dotColor = 'default',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center font-medium transition-colors rounded-full';

    const variantStyles = {
      default: 'bg-secondary text-secondary-foreground',
      primary: 'bg-primary/15 text-primary',
      secondary: 'bg-secondary text-secondary-foreground',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      destructive: 'bg-destructive/15 text-destructive',
      info: 'bg-info/15 text-info',
      outline: 'border border-border bg-transparent text-foreground',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-[10px] gap-1',
      md: 'px-2.5 py-0.5 text-xs gap-1.5',
      lg: 'px-3 py-1 text-sm gap-1.5',
    };

    const dotColors = {
      default: 'bg-current',
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
    };

    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4',
    };

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${dotColors[dotColor]} animate-pulse`}
          />
        )}
        {icon && <span className={iconSizes[size]}>{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
