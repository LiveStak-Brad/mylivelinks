import { HTMLAttributes, forwardRef, CSSProperties } from 'react';

/**
 * Card Component
 * 
 * Uses CSS tokens for consistent rhythm:
 * - --card-padding: Default padding
 * - --card-radius: Border radius
 * - --card-shadow: Box shadow
 * - --card-header-padding: Header padding
 * - --card-footer-padding: Footer padding
 * - --card-content-gap: Gap between content elements
 */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'ghost' | 'outline';
  /** Use compact padding */
  compact?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', compact = false, style, ...props }, ref) => {
    const variantStyles = {
      default: 'border border-border bg-card',
      ghost: 'bg-muted/50',
      outline: 'border-2 border-border bg-transparent',
    };

    const cardStyle: CSSProperties = {
      borderRadius: 'var(--card-radius)',
      boxShadow: variant === 'default' ? 'var(--card-shadow)' : undefined,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={`text-card-foreground ${variantStyles[variant]} ${className}`}
        style={cardStyle}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col ${className}`}
      style={{
        padding: 'var(--card-header-padding)',
        gap: 'var(--space-1)',
        ...style,
      }}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', style, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-muted-foreground ${className}`}
      style={{ marginTop: 'var(--space-1)', ...style }}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { noPadding?: boolean }>(
  ({ className = '', noPadding = false, style, ...props }, ref) => (
    <div 
      ref={ref} 
      className={className}
      style={{
        padding: noPadding ? 0 : undefined,
        ...style,
      }}
      {...props} 
    />
  )
);

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center ${className}`}
      style={{
        padding: 'var(--card-footer-padding)',
        gap: 'var(--space-3)',
        borderTop: '1px solid hsl(var(--border))',
        ...style,
      }}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
