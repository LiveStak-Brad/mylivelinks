import { Children, cloneElement, isValidElement, ReactNode, ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<{ className?: string }>;
  label: string; // For accessibility
  variant?: 'default' | 'primary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function IconButton({
  icon: Icon,
  label,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const variantClasses = {
    default: 'bg-accent hover:bg-accent-hover text-foreground',
    primary: 'bg-primary hover:bg-primary-hover text-primary-foreground',
    destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
    ghost: 'bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground',
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={`
        inline-flex items-center justify-center rounded-lg
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </button>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  className?: string;
}

export function Button({
  children,
  variant = 'default',
  size = 'md',
  asChild = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantClasses = {
    default: 'bg-accent hover:bg-accent-hover text-foreground',
    primary: 'bg-primary hover:bg-primary-hover text-primary-foreground',
    secondary: 'bg-transparent border border-input hover:bg-accent text-foreground',
    destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
    ghost: 'bg-transparent hover:bg-accent text-foreground',
    outline: 'bg-transparent border border-input hover:bg-accent text-foreground',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const computedClassName = `
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `;

  if (asChild) {
    const onlyChild = Children.only(children);
    if (!isValidElement(onlyChild)) {
      return null;
    }

    const childProps: any = (onlyChild as any).props ?? {};
    const isDisabled = disabled || loading;

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
    <button type="button" disabled={disabled || loading} className={computedClassName} {...props}>
      {loading ? (
        <svg
          className={`animate-spin ${iconSizes[size]}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        LeftIcon && <LeftIcon className={iconSizes[size]} />
      )}
      {children}
      {RightIcon && !loading && <RightIcon className={iconSizes[size]} />}
    </button>
  );
}


