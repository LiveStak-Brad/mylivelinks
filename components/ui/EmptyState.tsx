'use client';

import { ReactNode } from 'react';
import { Button } from './Button';

/* =============================================================================
   EMPTY STATE COMPONENT
   
   Premium empty state for lists, searches, and other empty content areas.
   
   @example
   <EmptyState
     icon={<Inbox className="w-12 h-12" />}
     title="No messages yet"
     description="Start a conversation with someone"
     action={{ label: "New Message", onClick: () => {} }}
   />
============================================================================= */

export interface EmptyStateProps {
  /** Icon to display */
  icon?: ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  /** Secondary action button */
  secondaryAction?: {
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
    title: 'text-sm font-medium',
    description: 'text-xs',
  },
  md: {
    container: 'py-12 px-6',
    iconWrapper: 'w-16 h-16 mb-4',
    title: 'text-base font-semibold',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    iconWrapper: 'w-20 h-20 mb-6',
    title: 'text-lg font-bold',
    description: 'text-base',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${styles.container} ${className}`}>
      {icon && (
        <div className={`${styles.iconWrapper} rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground`}>
          {icon}
        </div>
      )}
      
      <h3 className={`${styles.title} text-foreground mb-1`}>
        {title}
      </h3>
      
      {description && (
        <p className={`${styles.description} text-muted-foreground max-w-xs`}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-4">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'primary'}
              size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size={size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
