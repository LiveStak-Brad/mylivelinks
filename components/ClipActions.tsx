'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Bookmark, Upload, CheckCircle } from 'lucide-react';

/* =============================================================================
   CLIP ACTIONS COMPONENT
   
   UI for clip completion actions:
   - Post to Feed
   - Save (bookmark/draft)
   - Post + Save
   - Send to Composer
   
   Used wherever clip completion appears.
   Clean placeholder handlers - ready for wiring.
============================================================================= */

export interface ClipActionsProps {
  /** Clip/video ID */
  clipId?: string;
  /** Callback when action is triggered */
  onAction?: (action: 'post' | 'save' | 'post-save' | 'composer') => void;
  /** Layout variant */
  variant?: 'horizontal' | 'vertical';
  /** Show all actions or compact view */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

export default function ClipActions({
  clipId,
  onAction,
  variant = 'horizontal',
  compact = false,
  className = '',
}: ClipActionsProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'post' | 'save' | 'post-save' | 'composer') => {
    if (isProcessing) return;

    setIsProcessing(true);

    // Call parent callback if provided
    if (onAction) {
      onAction(action);
    }

    // Handle specific actions
    switch (action) {
      case 'post':
        // Placeholder: would post to feed
        await new Promise(resolve => setTimeout(resolve, 500));
        alert('Post to Feed - Not wired yet');
        break;

      case 'save':
        // Placeholder: would save as draft
        await new Promise(resolve => setTimeout(resolve, 500));
        alert('Save - Not wired yet');
        break;

      case 'post-save':
        // Placeholder: would post AND save
        await new Promise(resolve => setTimeout(resolve, 500));
        alert('Post + Save - Not wired yet');
        break;

      case 'composer':
        // Navigate to composer (this works!)
        router.push('/composer/new');
        break;
    }

    setIsProcessing(false);
  };

  const containerClass = variant === 'horizontal'
    ? 'flex flex-wrap gap-2'
    : 'flex flex-col gap-2';

  return (
    <div className={`${containerClass} ${className}`}>
      {!compact && (
        <>
          <ActionButton
            icon={Upload}
            label="Post to Feed"
            onClick={() => handleAction('post')}
            disabled={isProcessing}
            variant="primary"
          />
          <ActionButton
            icon={Bookmark}
            label="Save"
            onClick={() => handleAction('save')}
            disabled={isProcessing}
            variant="secondary"
          />
        </>
      )}
      
      {compact ? (
        <ActionButton
          icon={CheckCircle}
          label="Post + Save"
          onClick={() => handleAction('post-save')}
          disabled={isProcessing}
          variant="primary"
        />
      ) : (
        <ActionButton
          icon={CheckCircle}
          label="Post + Save"
          onClick={() => handleAction('post-save')}
          disabled={isProcessing}
          variant="accent"
        />
      )}
      
      <ActionButton
        icon={Send}
        label="Send to Composer"
        onClick={() => handleAction('composer')}
        disabled={isProcessing}
        variant="outline"
      />
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Action Button Component
----------------------------------------------------------------------------- */
interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  variant = 'primary',
}: ActionButtonProps) {
  const variantStyles = {
    primary: `
      bg-gradient-to-r from-primary to-accent text-white
      hover:opacity-90 shadow-md hover:shadow-lg
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-muted text-foreground
      hover:bg-muted/80
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    accent: `
      bg-gradient-to-r from-green-500 to-emerald-600 text-white
      hover:opacity-90 shadow-md hover:shadow-lg
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    outline: `
      border-2 border-primary text-primary
      hover:bg-primary hover:text-white
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2.5
        text-sm font-semibold rounded-xl
        transition-all duration-200
        active:scale-[0.98]
        ${variantStyles[variant]}
      `}
      aria-label={label}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

