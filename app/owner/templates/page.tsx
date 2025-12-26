'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  LayoutGrid, 
  Search, 
  RefreshCw,
  ChevronLeft,
  LayoutTemplate
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import TemplateCard, { RoomTemplate } from '@/components/owner/TemplateCard';

export default function OwnerTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  
  // Create room modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplate | null>(null);
  const [newRoomKey, setNewRoomKey] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIsOwner = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setIsOwner(data.profile?.is_owner === true);
      }
    } catch (err) {
      console.error('Error checking owner status:', err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    checkIsOwner();
  }, [fetchTemplates, checkIsOwner]);

  const handleEdit = (template: RoomTemplate) => {
    router.push(`/owner/templates/${template.id}`);
  };

  const handleDuplicate = async (template: RoomTemplate) => {
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'POST', // POST to duplicate
      });
      
      if (res.ok) {
        await fetchTemplates();
      }
    } catch (err) {
      console.error('Error duplicating template:', err);
    }
  };

  const handleDelete = async (template: RoomTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"? This cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== template.id));
      }
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const handleCreateRoom = (template: RoomTemplate) => {
    setSelectedTemplate(template);
    setNewRoomKey('');
    setNewRoomName('');
    setShowCreateModal(true);
  };

  const handleCreateRoomSubmit = async () => {
    if (!selectedTemplate || !newRoomKey.trim() || !newRoomName.trim()) return;
    
    setCreating(true);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_key: newRoomKey.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          name: newRoomName,
          description: selectedTemplate.description,
          category: selectedTemplate.default_category,
          fallback_gradient: selectedTemplate.default_fallback_gradient,
          interest_threshold: selectedTemplate.default_interest_threshold,
          status: selectedTemplate.default_status,
          disclaimer_required: selectedTemplate.default_disclaimer_required,
          disclaimer_text: selectedTemplate.default_disclaimer_text,
          template_id: selectedTemplate.id,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        router.push(`/owner/rooms/${data.room.id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create room');
      }
    } catch (err) {
      console.error('Error creating room:', err);
      alert('Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return template.name.toLowerCase().includes(q) || 
           template.description?.toLowerCase().includes(q);
  });

  return (
    <PageShell maxWidth="xl" padding="md">
      <PageHeader
        title="Room Templates"
        description="Create reusable templates for quick room setup"
        backLink="/owner/rooms"
        backLabel="Rooms"
        actions={
          <Link href="/owner/templates/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </Link>
        }
      />

      {/* Tabs */}
      <PageSection>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          <Link
            href="/owner/rooms"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition"
          >
            <LayoutGrid className="w-4 h-4" />
            Rooms
          </Link>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-background text-foreground shadow-sm"
          >
            <LayoutTemplate className="w-4 h-4" />
            Templates ({templates.length})
          </button>
        </div>
      </PageSection>

      {/* Search & Actions */}
      <PageSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTemplates}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageSection>

      {/* Templates Grid */}
      <PageSection>
        {loading ? (
          <div className="card-grid">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} showImage imageAspect="video" textLines={2} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchTemplates}>Retry</Button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <LayoutTemplate className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? 'No templates found' : 'No templates yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Create your first template to streamline room creation'
              }
            </p>
            {!searchQuery && (
              <Link href="/owner/templates/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Template
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="card-grid">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onCreateRoom={handleCreateRoom}
                canDelete={isOwner}
              />
            ))}
          </div>
        )}
      </PageSection>

        {/* Create Room Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Room from Template"
          description={selectedTemplate ? `Using template: ${selectedTemplate.name}` : ''}
          size="md"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Room Key <span className="text-destructive">*</span>
              </label>
              <Input
                value={newRoomKey}
                onChange={(e) => setNewRoomKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-room-name"
              />
              <p className="text-xs text-muted-foreground">
                Used in the URL: mylivelinks.com/{newRoomKey || 'room-key'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Room Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="My Awesome Room"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRoomSubmit}
                disabled={!newRoomKey.trim() || !newRoomName.trim() || creating}
                isLoading={creating}
              >
                Create Room
              </Button>
            </div>
          </div>
        </Modal>
    </PageShell>
  );
}

