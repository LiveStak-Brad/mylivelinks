'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  /** Size of the button */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show loading spinner */
  isLoading?: boolean;
  /** Accessible label for screen readers */
  'aria-label': string;
  /** The icon to render */
  children: ReactNode;
}

/**
 * IconButton - A button component for icon-only interactions
 * 
 * @example
 * <IconButton aria-label="Close" onClick={onClose}>
 *   <X className="w-4 h-4" />
 * </IconButton>
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className = '',
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center rounded-lg 
      transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
      disabled:pointer-events-none disabled:opacity-50
      active:scale-95
    `;

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-primary',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
      ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-border bg-transparent text-foreground hover:bg-muted hover:border-border-hover',
    };

    const sizeStyles = {
      xs: 'h-7 w-7',
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    };

    const iconSizes = {
      xs: 'w-3.5 h-3.5',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={`animate-spin ${iconSizes[size]}`} />
        ) : (
          <span className={iconSizes[size]}>{children}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton };
