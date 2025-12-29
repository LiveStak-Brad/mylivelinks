import { useState, ReactNode, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface RowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface RowActionsProps {
  actions: RowAction[];
  className?: string;
}

export default function RowActions({ actions, className = '' }: RowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleActionClick = (action: RowAction) => {
    if (!action.disabled) {
      action.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-accent rounded-md transition-colors"
        aria-label="More actions"
      >
        <MoreVertical className="w-5 h-5 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-dropdown animate-scale-in">
          <div className="py-1">
            {actions.map((action, index) => {
              const Icon = action.icon;
              const textColor =
                action.variant === 'destructive' ? 'text-destructive' : 'text-foreground';
              
              return (
                <button
                  key={index}
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-sm
                    ${action.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-accent cursor-pointer'
                    }
                    ${textColor}
                    transition-colors
                  `}
                >
                  {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ActionMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  position?: 'left' | 'right';
  className?: string;
}

export function ActionMenu({ 
  trigger, 
  children, 
  position = 'right',
  className = '' 
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const positionClasses = position === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div className={`absolute ${positionClasses} mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-dropdown animate-scale-in`}>
          {children}
        </div>
      )}
    </div>
  );
}

