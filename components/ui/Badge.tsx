import { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  size?: 'sm' | 'md';
}

function Badge({
  className = '',
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium transition-colors';
  
  const variantStyles = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    outline: 'border border-border text-foreground',
  };
  
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs rounded',
    md: 'px-2.5 py-0.5 text-xs rounded-full',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  );
}

export { Badge };

