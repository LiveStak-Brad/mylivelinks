'use client';

import { useState } from 'react';
import { Pin, Trash2, Eye, Users, Lock, X, Flag, Edit3 } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface PostManagementModalProps {
  postId: string;
  postType: 'personal' | 'team';
  isAuthor: boolean;
  isModerator?: boolean;
  currentVisibility?: 'public' | 'friends' | 'private' | 'members';
  isPinned?: boolean;
  onClose: () => void;
  onPostDeleted?: () => void;
  onPostUpdated?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
}

export function PostManagementModal({
  postId,
  postType,
  isAuthor,
  isModerator = false,
  currentVisibility = 'public',
  isPinned = false,
  onClose,
  onPostDeleted,
  onPostUpdated,
  onReport,
  onEdit,
}: PostManagementModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handlePin = async () => {
    setIsLoading(true);
    try {
      const rpcFunction = postType === 'personal' ? 'rpc_pin_post' : 'rpc_pin_team_post';
      const { error } = await supabase.rpc(rpcFunction, {
        p_post_id: postId,
        p_pin: !isPinned,
      });

      if (error) throw error;

      console.log(isPinned ? 'Post unpinned' : 'Post pinned');
      onPostUpdated?.();
      onClose();
    } catch (error: any) {
      console.error('Error pinning post:', error);
      alert(error.message || 'Failed to pin post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const rpcFunction = postType === 'personal' ? 'rpc_delete_post' : 'rpc_delete_team_post';
      console.log('[PostManagementModal] Deleting post:', { postId, postType, rpcFunction });
      const { error } = await supabase.rpc(rpcFunction, {
        p_post_id: postId,
      });

      if (error) throw error;

      onPostDeleted?.();
      onClose();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      alert(error.message || 'Failed to delete post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisibilityChange = async (newVisibility: string) => {
    setIsLoading(true);
    try {
      const rpcFunction = postType === 'personal' ? 'rpc_update_post_visibility' : 'rpc_update_team_post_visibility';
      const { error } = await supabase.rpc(rpcFunction, {
        p_post_id: postId,
        p_visibility: newVisibility,
      });

      if (error) throw error;

      onPostUpdated?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating visibility:', error);
      alert(error.message || 'Failed to update visibility');
    } finally {
      setIsLoading(false);
    }
  };

  const visibilityOptions = postType === 'personal'
    ? [
        { value: 'public', label: 'Public', icon: Eye, description: 'Anyone can see this post' },
        { value: 'friends', label: 'Friends Only', icon: Users, description: 'Only your friends can see this' },
        { value: 'private', label: 'Private', icon: Lock, description: 'Only you can see this' },
      ]
    : [
        { value: 'public', label: 'Public', icon: Eye, description: 'Anyone can see this post' },
        { value: 'members', label: 'Members Only', icon: Users, description: 'Only team members can see this' },
      ];

  const canPin = isAuthor || (postType === 'team' && isModerator);
  const canDelete = isAuthor || (postType === 'team' && isModerator);
  const canChangeVisibility = isAuthor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Manage Post</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Pin/Unpin */}
          {canPin && (
            <button
              onClick={handlePin}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/60 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pin className={`w-5 h-5 ${isPinned ? 'text-primary fill-current' : 'text-muted-foreground'}`} />
              <div className="flex-1">
                <div className="font-medium text-foreground">{isPinned ? 'Unpin Post' : 'Pin Post'}</div>
                <div className="text-sm text-muted-foreground">
                  {isPinned ? 'Remove from top of feed' : 'Keep at top of feed'}
                </div>
              </div>
            </button>
          )}

          {/* Visibility Options */}
          {canChangeVisibility && (
            <div className="space-y-1">
              <div className="px-4 py-2 text-sm font-semibold text-muted-foreground">Change Visibility</div>
              {visibilityOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = currentVisibility === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleVisibilityChange(option.value)}
                    disabled={isLoading || isSelected}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/60 disabled:opacity-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {option.label}
                        {isSelected && <span className="ml-2 text-xs">(Current)</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Edit - only for authors */}
          {isAuthor && onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/60 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit3 className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium text-foreground">Edit Post</div>
                <div className="text-sm text-muted-foreground">Modify your post content</div>
              </div>
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <div className="font-medium text-destructive">Delete Post</div>
                <div className="text-sm text-muted-foreground">This action cannot be undone</div>
              </div>
            </button>
          )}

          {/* Report - only for non-authors */}
          {!isAuthor && onReport && (
            <button
              onClick={() => {
                onClose();
                onReport();
              }}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flag className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <div className="font-medium text-destructive">Report Post</div>
                <div className="text-sm text-muted-foreground">Report inappropriate content</div>
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors font-medium text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
