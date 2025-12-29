'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';

/* =============================================================================
   CHIP COMPONENT
   
   A compact, dismissible element for tags, filters, and selections.
   
   @example
   // Basic chip
   <Chip>Tag Name</Chip>
   
   // Dismissible chip
   <Chip onDismiss={() => handleRemove()}>Removable Tag</Chip>
   
   // Selectable chip
   <Chip selected onClick={handleSelect}>Option</Chip>
============================================================================= */

export interface ChipProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  /** Size of the chip */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the chip is selected */
  selected?: boolean;
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Icon to show before the label */
  icon?: ReactNode;
  /** Whether the chip is disabled */
  disabled?: boolean;
  children: ReactNode;
}

const Chip = forwardRef<HTMLDivElement, ChipProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'md',
      selected = false,
      onDismiss,
      icon,
      disabled = false,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const isInteractive = !!onClick || !!onDismiss;

    const baseStyles = `
      inline-flex items-center gap-1.5 font-medium rounded-full 
      transition-all duration-200 select-none
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${isInteractive && !disabled ? 'cursor-pointer' : ''}
    `;

    const variantStyles = {
      default: selected
        ? 'bg-primary text-primary-foreground'
        : 'bg-secondary text-secondary-foreground hover:bg-muted',
      primary: selected
        ? 'bg-primary text-primary-foreground'
        : 'bg-primary/10 text-primary hover:bg-primary/20',
      secondary: selected
        ? 'bg-secondary-foreground text-secondary'
        : 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
      outline: selected
        ? 'border-2 border-primary bg-primary/10 text-primary'
        : 'border border-border bg-transparent text-foreground hover:bg-muted hover:border-border-hover',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-sm',
    };

    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4',
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        onDismiss?.();
      }
    };

    return (
      <div
        ref={ref}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive && !disabled ? 0 : undefined}
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        aria-pressed={onClick ? selected : undefined}
        aria-disabled={disabled}
        {...props}
      >
        {icon && <span className={iconSizes[size]}>{icon}</span>}
        <span>{children}</span>
        {onDismiss && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className={`
              -mr-0.5 ml-0.5 rounded-full p-0.5
              hover:bg-black/10 dark:hover:bg-white/10
              focus:outline-none focus:ring-1 focus:ring-ring
              transition-colors
            `}
            aria-label="Remove"
          >
            <X className={iconSizes[size]} />
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = 'Chip';

export { Chip };






