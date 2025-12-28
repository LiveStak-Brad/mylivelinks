'use client';

import { LayoutGrid, LayoutTemplate, Users, MessageSquare, Gift, AlertTriangle, MoreVertical, Copy, Edit, Trash2, Plus } from 'lucide-react';

export interface RoomTemplate {
  id: string;
  name: string;
  description: string | null;
  layout_type: 'grid' | 'versus' | 'panel';
  default_max_participants: number;
  default_status: string;
  default_interest_threshold: number;
  default_category: string;
  default_disclaimer_required: boolean;
  default_disclaimer_text: string | null;
  gifts_enabled: boolean;
  chat_enabled: boolean;
  default_fallback_gradient: string;
  default_theme_color: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateCardProps {
  template: RoomTemplate;
  onEdit: (template: RoomTemplate) => void;
  onDuplicate: (template: RoomTemplate) => void;
  onDelete: (template: RoomTemplate) => void;
  onCreateRoom: (template: RoomTemplate) => void;
  canDelete?: boolean;
}

const layoutIcons = {
  grid: LayoutGrid,
  versus: LayoutTemplate,
  panel: LayoutTemplate,
};

const layoutLabels = {
  grid: 'Grid Layout',
  versus: 'Versus Layout',
  panel: 'Panel Layout',
};

export default function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onCreateRoom,
  canDelete = false,
}: TemplateCardProps) {
  const LayoutIcon = layoutIcons[template.layout_type] || LayoutGrid;

  return (
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
      {/* Gradient header */}
      <div className={`h-20 bg-gradient-to-r ${template.default_fallback_gradient || 'from-purple-600 to-pink-600'}`}>
        <div className="absolute top-3 right-3">
          <div className="relative group/menu">
            <button className="p-2 bg-black/30 backdrop-blur-sm rounded-lg text-white/80 hover:text-white hover:bg-black/50 transition opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 py-1 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 min-w-[140px]">
              <button
                onClick={() => onEdit(template)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => onDuplicate(template)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              {canDelete && (
                <button
                  onClick={() => onDelete(template)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-foreground truncate">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {template.description}
            </p>
          )}
        </div>

        {/* Layout & Settings */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
            <LayoutIcon className="w-3.5 h-3.5" />
            {layoutLabels[template.layout_type]}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            Max {template.default_max_participants}
          </div>
          {template.default_disclaimer_required && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-md text-xs text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5" />
              Disclaimer
            </div>
          )}
        </div>

        {/* Feature Flags */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <div className={`flex items-center gap-1 ${template.gifts_enabled ? 'text-green-500' : 'text-muted-foreground/50'}`}>
            <Gift className="w-3.5 h-3.5" />
            Gifts {template.gifts_enabled ? 'On' : 'Off'}
          </div>
          <div className={`flex items-center gap-1 ${template.chat_enabled ? 'text-green-500' : 'text-muted-foreground/50'}`}>
            <MessageSquare className="w-3.5 h-3.5" />
            Chat {template.chat_enabled ? 'On' : 'Off'}
          </div>
        </div>

        {/* Create Room Button */}
        <button
          onClick={() => onCreateRoom(template)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" />
          Create Room
        </button>
      </div>
    </div>
  );
}





