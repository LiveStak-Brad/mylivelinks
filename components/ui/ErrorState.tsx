'use client';

import { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

/* =============================================================================
   ERROR STATE COMPONENT
   
   Premium error state for fetch failures and other errors.
   
   @example
   <ErrorState
     title="Failed to load"
     description="Something went wrong. Please try again."
     onRetry={() => refetch()}
   />
============================================================================= */

export interface ErrorStateProps {
  /** Icon to display (defaults to AlertCircle) */
  icon?: ReactNode;
  /** Title text */
  title?: string;
  /** Description/error message */
  description?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Custom action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional className for styling */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    container: 'py-8 px-4',
    iconWrapper: 'w-12 h-12 mb-3',
    iconSize: 'w-6 h-6',
    title: 'text-sm font-medium',
    description: 'text-xs',
  },
  md: {
    container: 'py-12 px-6',
    iconWrapper: 'w-16 h-16 mb-4',
    iconSize: 'w-8 h-8',
    title: 'text-base font-semibold',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    iconWrapper: 'w-20 h-20 mb-6',
    iconSize: 'w-10 h-10',
    title: 'text-lg font-bold',
    description: 'text-base',
  },
};

export function ErrorState({
  icon,
  title = 'Something went wrong',
  description = 'We encountered an error. Please try again.',
  onRetry,
  action,
  className = '',
  size = 'md',
}: ErrorStateProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${styles.container} ${className}`}>
      <div className={`${styles.iconWrapper} rounded-2xl bg-destructive/10 flex items-center justify-center`}>
        {icon || <AlertCircle className={`${styles.iconSize} text-destructive`} />}
      </div>
      
      <h3 className={`${styles.title} text-foreground mb-1`}>
        {title}
      </h3>
      
      {description && (
        <p className={`${styles.description} text-muted-foreground max-w-xs`}>
          {description}
        </p>
      )}
      
      <div className="flex items-center gap-3 mt-4">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        )}
        {action && (
          <Button
            onClick={action.onClick}
            variant="primary"
            size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}






