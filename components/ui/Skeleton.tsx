'use client';

import { HTMLAttributes, forwardRef } from 'react';

/* =============================================================================
   SKELETON COMPONENT
   
   Loading placeholder that mimics content structure.
   
   @example
   // Basic skeleton
   <Skeleton className="h-4 w-32" />
   
   // Circle skeleton (avatar)
   <Skeleton variant="circle" className="w-12 h-12" />
   
   // Text block skeleton
   <Skeleton variant="text" lines={3} />
============================================================================= */

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Shape variant */
  variant?: 'default' | 'circle' | 'text';
  /** Number of text lines (only for text variant) */
  lines?: number;
  /** Animation style */
  animation?: 'pulse' | 'shimmer' | 'none';
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className = '',
      variant = 'default',
      lines = 1,
      animation = 'pulse',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-muted';

    const animationStyles = {
      pulse: 'animate-pulse',
      shimmer: 'animate-shimmer bg-gradient-to-r from-muted via-muted-foreground/5 to-muted bg-[length:200%_100%]',
      none: '',
    };

    const variantStyles = {
      default: 'rounded-md',
      circle: 'rounded-full',
      text: 'rounded',
    };

    // For text variant, render multiple lines
    if (variant === 'text') {
      return (
        <div ref={ref} className={`space-y-2 ${className}`} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={`
                h-4 ${baseStyles} ${animationStyles[animation]} ${variantStyles.text}
                ${index === lines - 1 ? 'w-3/4' : 'w-full'}
              `}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${animationStyles[animation]} ${variantStyles[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/* -----------------------------------------------------------------------------
   Preset Skeleton Components for common use cases
----------------------------------------------------------------------------- */

/** Skeleton for user avatar */
function SkeletonAvatar({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-24 h-24',
  };

  return <Skeleton variant="circle" className={`${sizeStyles[size]} ${className}`} />;
}

SkeletonAvatar.displayName = 'SkeletonAvatar';

/** Skeleton for text lines with width variation */
function SkeletonText({
  lines = 1,
  widthVariation = true,
  className = '',
  animation = 'pulse',
}: {
  lines?: 1 | 2 | 3 | 4 | 5;
  widthVariation?: boolean;
  className?: string;
  animation?: 'pulse' | 'shimmer' | 'none';
}) {
  const lineWidths = widthVariation 
    ? ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12']
    : ['w-full', 'w-full', 'w-full', 'w-full', 'w-full'];

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${lineWidths[i]}`} 
          animation={animation}
        />
      ))}
    </div>
  );
}

SkeletonText.displayName = 'SkeletonText';

/** Skeleton for a card */
function SkeletonCard({
  showImage = true,
  imageAspect = 'video',
  showAvatar = false,
  textLines = 2,
  showActions = false,
  className = '',
}: {
  showImage?: boolean;
  imageAspect?: 'square' | 'video' | 'wide';
  showAvatar?: boolean;
  textLines?: 1 | 2 | 3;
  showActions?: boolean;
  className?: string;
}) {
  const aspectMap = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
  };

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      {/* Image area */}
      {showImage && (
        <Skeleton className={`w-full ${aspectMap[imageAspect]} rounded-none`} />
      )}
      
      {/* Content area */}
      <div className="p-4 space-y-3">
        {/* Avatar + title row */}
        {showAvatar ? (
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ) : (
          <Skeleton className="h-5 w-3/4" />
        )}
        
        {/* Text content */}
        <SkeletonText lines={textLines} />
        
        {/* Action buttons */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <SkeletonButton size="sm" />
            <SkeletonButton size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}

SkeletonCard.displayName = 'SkeletonCard';

/** Skeleton for a table row */
function SkeletonTableRow({
  columns = 4,
  className = '',
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 py-3 ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === 0 ? 'w-24' : 'flex-1'}`}
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
}

SkeletonTableRow.displayName = 'SkeletonTableRow';

/** Skeleton for a button */
function SkeletonButton({
  size = 'md',
  fullWidth = false,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}) {
  const sizeStyles = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-28',
  };

  return (
    <Skeleton 
      className={`rounded-lg ${fullWidth ? 'w-full' : sizeStyles[size]} ${className}`} 
    />
  );
}

SkeletonButton.displayName = 'SkeletonButton';

/** Skeleton for profile card layout */
function SkeletonProfileCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-6 ${className}`}>
      <div className="flex flex-col items-center text-center space-y-4">
        <SkeletonAvatar size="xl" />
        <div className="space-y-2 w-full">
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-1/3 mx-auto" />
        </div>
        <SkeletonText lines={2} className="w-full max-w-xs" />
        <div className="flex gap-3 justify-center w-full">
          <SkeletonButton size="md" />
          <SkeletonButton size="md" />
        </div>
      </div>
    </div>
  );
}

SkeletonProfileCard.displayName = 'SkeletonProfileCard';

/** Skeleton for list item layout */
function SkeletonListItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 border-b border-border last:border-0 ${className}`}>
      <SkeletonAvatar size="md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  );
}

SkeletonListItem.displayName = 'SkeletonListItem';

/** Skeleton for table layout */
function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`border border-border rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/50 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex gap-4 p-4 border-b border-border last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={`h-4 flex-1 ${colIndex === 0 ? 'w-1/4' : ''}`}
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

SkeletonTable.displayName = 'SkeletonTable';

export { 
  Skeleton, 
  SkeletonAvatar, 
  SkeletonText,
  SkeletonCard, 
  SkeletonTableRow, 
  SkeletonButton,
  SkeletonProfileCard,
  SkeletonListItem,
  SkeletonTable,
};
