'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'icon' | 'full' | 'menu-item';
  className?: string;
}

export default function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder to avoid layout shift
    return (
      <div 
        className={`w-10 h-10 rounded-xl bg-muted animate-pulse ${className}`} 
        aria-hidden="true"
      />
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-5 h-5" />;
    }
    return resolvedTheme === 'dark' ? (
      <Moon className="w-5 h-5" />
    ) : (
      <Sun className="w-5 h-5" />
    );
  };

  const getLabel = () => {
    if (theme === 'system') return 'System';
    if (theme === 'dark') return 'Dark';
    return 'Light';
  };

  // Icon-only button for header
  if (variant === 'icon') {
    return (
      <button
        onClick={cycleTheme}
        className={`
          relative p-2.5 rounded-xl 
          bg-muted/60 hover:bg-muted 
          text-muted-foreground hover:text-foreground
          transition-all duration-200 
          hover:scale-105 active:scale-95 
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          group ${className}
        `}
        title={`Theme: ${getLabel()} (click to change)`}
        aria-label={`Current theme: ${getLabel()}. Click to cycle through themes.`}
        role="button"
      >
        <div className="relative w-5 h-5">
          {/* Sun icon */}
          <Sun 
            className={`w-5 h-5 transition-all duration-300 absolute inset-0 ${
              resolvedTheme === 'light' && theme !== 'system'
                ? 'opacity-100 rotate-0 scale-100' 
                : 'opacity-0 -rotate-90 scale-50'
            }`}
            aria-hidden="true"
          />
          {/* Moon icon */}
          <Moon 
            className={`w-5 h-5 transition-all duration-300 absolute inset-0 ${
              resolvedTheme === 'dark' && theme !== 'system'
                ? 'opacity-100 rotate-0 scale-100' 
                : 'opacity-0 rotate-90 scale-50'
            }`}
            aria-hidden="true"
          />
          {/* Monitor icon for system */}
          <Monitor 
            className={`w-5 h-5 transition-all duration-300 ${
              theme === 'system'
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-50'
            }`}
            aria-hidden="true"
          />
        </div>
        
        {/* Subtle glow effect */}
        <div 
          className={`absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none ${
            resolvedTheme === 'dark' 
              ? 'bg-primary/10 opacity-0 group-hover:opacity-100' 
              : 'bg-warning/10 opacity-0 group-hover:opacity-100'
          }`} 
          aria-hidden="true"
        />
      </button>
    );
  }

  // Menu item style for dropdowns
  if (variant === 'menu-item') {
    return (
      <div className={`px-1 py-1 ${className}`}>
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Theme
        </p>
        <div className="space-y-0.5">
          {(['light', 'dark', 'system'] as const).map((themeOption) => {
            const isActive = theme === themeOption;
            const Icon = themeOption === 'light' ? Sun : themeOption === 'dark' ? Moon : Monitor;
            const label = themeOption.charAt(0).toUpperCase() + themeOption.slice(1);
            
            return (
              <button
                key={themeOption}
                onClick={() => setTheme(themeOption)}
                className={`
                  w-full flex items-center gap-3 px-2 py-2 text-sm rounded-lg
                  transition-all duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
                  ${isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-foreground hover:bg-muted'
                  }
                `}
                role="menuitemradio"
                aria-checked={isActive}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                <span className="flex-1 text-left">{label}</span>
                {isActive && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Full button with label
  return (
    <button
      onClick={cycleTheme}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl
        bg-muted/60 hover:bg-muted 
        text-foreground
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${className}
      `}
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
    >
      {getIcon()}
      <span className="text-sm font-medium">{getLabel()}</span>
    </button>
  );
}
