'use client';

import { Children, cloneElement, forwardRef, isValidElement, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/* =============================================================================
   BUTTON COMPONENT
   
   Primary action button with multiple variants and sizes.
   
   @example
   <Button variant="primary" size="md" onClick={handleClick}>
     Click Me
   </Button>
   
   <Button variant="outline" isLoading>
     Saving...
   </Button>
============================================================================= */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'link' | 'gradient';
  /** Size of the button */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  asChild?: boolean;
  /** Show loading spinner and disable interactions */
  isLoading?: boolean;
  /** Icon to show before the label */
  leftIcon?: ReactNode;
  /** Icon to show after the label */
  rightIcon?: ReactNode;
  /** Make button take full width */
  fullWidth?: boolean;
  children?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg 
      font-medium transition-all duration-200 
      focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
      disabled:pointer-events-none disabled:opacity-50
      active:scale-[0.98]
    `;

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-primary active:bg-primary-active',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
      ghost: 'bg-transparent text-foreground hover:bg-muted',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-border bg-transparent text-foreground hover:bg-muted hover:border-border-hover',
      link: 'bg-transparent text-primary underline-offset-4 hover:underline h-auto p-0',
      gradient: 'bg-gradient-to-r from-primary to-accent text-white shadow-sm hover:opacity-90 hover:shadow-primary',
    };

    const sizeStyles = {
      xs: 'h-7 px-2.5 text-xs rounded-md',
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 text-base',
      xl: 'h-14 px-8 text-lg',
    };

    const iconSizes = {
      xs: 'w-3 h-3',
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6',
    };

    const computedClassName = `
          ${baseStyles} 
          ${variantStyles[variant]} 
          ${sizeStyles[size]} 
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `;

    if (asChild) {
      const onlyChild = Children.only(children);
      if (!isValidElement(onlyChild)) {
        return null;
      }

      const childProps: any = (onlyChild as any).props ?? {};
      const isDisabled = disabled || isLoading;

      return cloneElement(onlyChild as any, {
        className: `${computedClassName} ${childProps.className ?? ''}`.trim(),
        'aria-disabled': isDisabled ? true : undefined,
        tabIndex: isDisabled ? -1 : childProps.tabIndex,
        onClick: (event: any) => {
          if (isDisabled) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            return;
          }
          childProps.onClick?.(event);
          (props as any).onClick?.(event);
        },
      });
    }

    return (
      <button
        ref={ref}
        className={computedClassName}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={`animate-spin ${iconSizes[size]}`} />
        ) : (
          leftIcon && <span className={iconSizes[size]}>{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className={iconSizes[size]}>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
