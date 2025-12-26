'use client';

import { memo, useState } from 'react';
import { Image as ImageIcon, Video, Smile, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/* =============================================================================
   COMPOSER CARD COMPONENT
   
   Facebook-style post composer with avatar, input area, and quick actions.
   Opens a modal composer when clicked (UI only).
   
   @example
   <ComposerCard
     avatar={<AvatarPlaceholder />}
     displayName="User Name"
   />
============================================================================= */

export interface ComposerCardProps {
  /** Avatar element or placeholder */
  avatar?: React.ReactNode;
  /** User's display name for the modal */
  displayName?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Additional className */
  className?: string;
}

/** Avatar placeholder for composer */
function ComposerAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
      <span className="text-white font-semibold">?</span>
    </div>
  );
}

/** Quick action button */
function QuickAction({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        font-medium text-sm transition-all duration-200
        hover:bg-muted active:scale-[0.98]
      `}
    >
      <Icon className={`w-5 h-5 ${color}`} />
      <span className="hidden sm:inline text-muted-foreground">{label}</span>
    </button>
  );
}

const ComposerCard = memo(function ComposerCard({
  avatar,
  displayName = 'User',
  placeholder = "What's on your mind?",
  className = '',
}: ComposerCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');

  return (
    <>
      <Card className={`overflow-hidden ${className}`}>
        {/* Main composer trigger */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {avatar || <ComposerAvatar />}
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="
                flex-1 text-left px-4 py-2.5 rounded-full
                bg-muted hover:bg-muted/80
                text-muted-foreground text-sm sm:text-base
                transition-colors duration-200
              "
            >
              {placeholder}
            </button>
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-border mx-4" />
        
        {/* Quick actions row */}
        <div className="flex items-center justify-around px-2 py-1">
          <QuickAction
            icon={ImageIcon}
            label="Photo"
            color="text-green-500"
            onClick={() => setIsModalOpen(true)}
          />
          <QuickAction
            icon={Video}
            label="Video"
            color="text-red-500"
            onClick={() => setIsModalOpen(true)}
          />
          <QuickAction
            icon={Smile}
            label="Feeling"
            color="text-amber-500"
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </Card>

      {/* Composer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create post"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <ImageIcon className="w-5 h-5 text-green-500" />
              </button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Video className="w-5 h-5 text-red-500" />
              </button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Smile className="w-5 h-5 text-amber-500" />
              </button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <MapPin className="w-5 h-5 text-primary" />
              </button>
            </div>
            
            <Button
              variant="primary"
              size="md"
              disabled
              title="Coming soon"
            >
              Post
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3">
            {avatar || <ComposerAvatar />}
            <div>
              <p className="font-semibold text-foreground">{displayName}</p>
              <button className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md hover:bg-muted/80 transition-colors">
                🌐 Public
              </button>
            </div>
          </div>
          
          {/* Text area */}
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder={placeholder}
            className="
              w-full min-h-[150px] resize-none
              bg-transparent border-none outline-none
              text-foreground text-lg
              placeholder:text-muted-foreground
            "
            autoFocus
          />
          
          {/* Add to post section */}
          <div className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Add to your post</span>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-full hover:bg-muted transition-colors">
                  <ImageIcon className="w-6 h-6 text-green-500" />
                </button>
                <button className="p-2 rounded-full hover:bg-muted transition-colors">
                  <Video className="w-6 h-6 text-red-500" />
                </button>
                <button className="p-2 rounded-full hover:bg-muted transition-colors">
                  <Smile className="w-6 h-6 text-amber-500" />
                </button>
                <button className="p-2 rounded-full hover:bg-muted transition-colors">
                  <MapPin className="w-6 h-6 text-primary" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
});

ComposerCard.displayName = 'ComposerCard';

export { ComposerCard };

