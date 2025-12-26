# Room Templates System

## Overview

The Room Templates system allows owners to create reusable room templates for quick room setup. This provides a streamlined workflow for creating new rooms with consistent settings.

## Concepts

### Room Template
A template defines the default structure and settings for rooms:
- Layout type (grid, versus, panel)
- Max participants
- Default status
- Interest threshold
- Disclaimer settings
- Feature flags (gifts, chat enabled)
- Default appearance (gradient, theme color)

### Room Instance
A room created from a template (or from scratch). The actual room users will see and interact with.

## Pages

### Owner Panel → Rooms
**URL:** `/owner/rooms`

Lists all room instances with:
- Room banner + name
- Status (draft/interest/opening_soon/live/paused)
- Interest count / threshold
- Category
- Quick actions: Edit, Manage Roles, Duplicate, Status toggle

### Owner Panel → Templates
**URL:** `/owner/templates`

Grid of template cards showing:
- Template name
- Layout type
- Default max participants
- Disclaimer flag
- Feature flags
- "Create Room" button

### Create Room
**URL:** `/owner/rooms/new`

1. Select a template (or start from scratch)
2. Fill in room details
3. Upload banner image
4. Configure settings
5. Save

### Edit Room
**URL:** `/owner/rooms/[roomId]`

Tabbed interface:
- **Settings**: Status, category, layout, participants, thresholds, features
- **Appearance**: Banner upload, gradient, background, theme color
- **Roles**: Manage admins and moderators
- **Preview**: See how the room card looks in the carousel

### Edit Template
**URL:** `/owner/templates/[templateId]`

Configure all template defaults:
- Template name & description
- Layout type selection
- Default settings
- Feature flags
- Disclaimer configuration

## API Endpoints

### Templates
- `GET /api/admin/templates` - List all templates
- `POST /api/admin/templates` - Create template
- `GET /api/admin/templates/[id]` - Get template
- `PUT /api/admin/templates/[id]` - Update template
- `DELETE /api/admin/templates/[id]` - Soft delete template (owner only)
- `POST /api/admin/templates/[id]` - Duplicate template

### Rooms (existing)
- `GET /api/admin/rooms` - List all rooms
- `POST /api/admin/rooms` - Create room
- `GET /api/admin/rooms/[id]` - Get room
- `PUT /api/admin/rooms/[id]` - Update room
- `DELETE /api/admin/rooms/[id]` - Delete room

## Components

### BannerUploader
Drag-and-drop image uploader with:
- Preview
- Progress indicator
- Error handling
- Clear button

### TemplateCard
Card displaying template info with:
- Gradient header
- Layout/settings badges
- Feature flags
- Create Room button
- Actions menu (edit, duplicate, delete)

### RoomRow
Table row for room instances with:
- Thumbnail
- Status badge
- Interest progress bar
- Quick action buttons

### RoomForm
Complete form for creating/editing rooms with:
- Banner upload
- Basic info fields
- Settings configuration
- Feature toggles
- Disclaimer section
- Validation

## Database Schema

Run `sql/room_templates_schema.sql` to create:

```sql
-- room_templates table
CREATE TABLE room_templates (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    layout_type TEXT DEFAULT 'grid',
    default_max_participants INTEGER DEFAULT 12,
    default_status TEXT DEFAULT 'interest',
    default_interest_threshold INTEGER DEFAULT 5000,
    default_category TEXT DEFAULT 'entertainment',
    default_disclaimer_required BOOLEAN DEFAULT FALSE,
    default_disclaimer_text TEXT,
    gifts_enabled BOOLEAN DEFAULT TRUE,
    chat_enabled BOOLEAN DEFAULT TRUE,
    default_fallback_gradient TEXT,
    default_theme_color TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- New columns on coming_soon_rooms
ALTER TABLE coming_soon_rooms ADD COLUMN template_id UUID;
ALTER TABLE coming_soon_rooms ADD COLUMN layout_type TEXT;
ALTER TABLE coming_soon_rooms ADD COLUMN max_participants INTEGER;
ALTER TABLE coming_soon_rooms ADD COLUMN theme_color TEXT;
ALTER TABLE coming_soon_rooms ADD COLUMN background_image TEXT;
ALTER TABLE coming_soon_rooms ADD COLUMN subtitle TEXT;
ALTER TABLE coming_soon_rooms ADD COLUMN gifts_enabled BOOLEAN;
ALTER TABLE coming_soon_rooms ADD COLUMN chat_enabled BOOLEAN;
```

## Access Control

- Only app admins and owners can view/manage templates
- Only owners can delete templates
- Room admins can manage their assigned rooms
- Moderators have limited room management abilities

## Future Enhancements

- Template versioning
- Template categories/tags
- Moderation settings in templates
- Scheduled room launches
- A/B testing for room appearances

