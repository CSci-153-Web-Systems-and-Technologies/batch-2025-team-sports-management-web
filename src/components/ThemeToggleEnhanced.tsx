// components/ThemeToggleEnhanced.tsx
'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { UserProfile, Team, Announcement, Schedule } from '@/types';

interface ThemeToggleEnhancedProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function ThemeToggleEnhanced({ 
  className, 
  size = 'md',
  showLabel = false 
}: ThemeToggleEnhancedProps) {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "rounded-lg transition-all duration-200 hover:scale-105 active:scale-95",
        "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
        "flex items-center justify-center gap-2",
        "font-medium text-gray-700 dark:text-gray-300",
        sizeClasses[size],
        showLabel && 'px-4',
        className
      )}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
          {showLabel && 'Dark'}
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          {showLabel && 'Light'}
        </>
      )}
    </button>
  );
}