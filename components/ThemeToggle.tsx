'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

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
      <div className={`w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`} />
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
        className={`relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:scale-105 active:scale-95 group ${className}`}
        title={`Theme: ${getLabel()} (click to change)`}
        aria-label={`Current theme: ${getLabel()}. Click to change.`}
      >
        <div className="relative">
          {/* Sun icon */}
          <Sun 
            className={`w-5 h-5 transition-all duration-300 absolute inset-0 ${
              resolvedTheme === 'light' && theme !== 'system'
                ? 'opacity-100 rotate-0 scale-100' 
                : 'opacity-0 -rotate-90 scale-50'
            }`}
          />
          {/* Moon icon */}
          <Moon 
            className={`w-5 h-5 transition-all duration-300 absolute inset-0 ${
              resolvedTheme === 'dark' && theme !== 'system'
                ? 'opacity-100 rotate-0 scale-100' 
                : 'opacity-0 rotate-90 scale-50'
            }`}
          />
          {/* Monitor icon for system */}
          <Monitor 
            className={`w-5 h-5 transition-all duration-300 ${
              theme === 'system'
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-50'
            }`}
          />
        </div>
        
        {/* Subtle glow effect */}
        <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
          resolvedTheme === 'dark' 
            ? 'bg-blue-500/10 opacity-0 group-hover:opacity-100' 
            : 'bg-amber-500/10 opacity-0 group-hover:opacity-100'
        }`} />
      </button>
    );
  }

  // Menu item style for dropdowns
  if (variant === 'menu-item') {
    return (
      <button
        onClick={cycleTheme}
        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${className}`}
      >
        {getIcon()}
        <span>Theme: {getLabel()}</span>
      </button>
    );
  }

  // Full button with label
  return (
    <button
      onClick={cycleTheme}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200 ${className}`}
    >
      {getIcon()}
      <span className="text-sm font-medium">{getLabel()}</span>
    </button>
  );
}


