'use client';

import { useMemo, useRef, useState } from 'react';
import { SmilePlus, Upload, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import type { TeamEmote, TeamRole } from '@/lib/teamAdmin/types';
import { getTeamAdminCapabilities } from '@/lib/teamAdmin/permissions';
import { DashboardSection } from '@/components/layout';
import { Badge, Button, EmptyState, Input, Modal, useToast } from '@/components/ui';

export interface EmotesTabProps {
  emotes: TeamEmote[];
  viewerRole: TeamRole;
  onToggle: (emoteId: string, enabled: boolean) => void;
  onUpload: (name: string, file: File) => void;
}

export default function EmotesTab({ emotes, viewerRole, onToggle, onUpload }: EmotesTabProps) {
  const { toast } = useToast();
  const caps = getTeamAdminCapabilities(viewerRole);
  const canManage = caps.canManageEmotes;

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return emotes;
    return emotes.filter((e) => e.name.toLowerCase().includes(query));
  }, [emotes, q]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const close = () => {
    setOpen(false);
    setName('');
    setFile(null);
  };

  return (
    <div className="space-y-4">
      <DashboardSection title="Team emotes" description="Manage emotes (UI only)">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search emotes"
              leftIcon={<Search className="w-4 h-4" />}
              inputSize="lg"
            />
            <Button
              variant="primary"
              className="gap-2"
              disabled={!canManage}
              onClick={() => setOpen(true)}
            >
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>

          {!canManage && (
            <div className="text-sm text-muted-foreground">Only Team Admins can manage emotes.</div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<SmilePlus className="w-10 h-10" />}
              title={emotes.length === 0 ? 'No emotes yet' : 'No results'}
              description={emotes.length === 0 ? 'Upload emotes to enable them in chat.' : 'Try another search.'}
              size="sm"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((e) => (
                <div key={e.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <div className="text-sm font-semibold text-muted-foreground">:{e.name}:</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">:{e.name}:</div>
                      <div className="text-xs text-muted-foreground truncate">by @{e.createdBy.username}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => {
                        onToggle(e.id, !e.enabled);
                        toast({
                          title: e.enabled ? 'Emote disabled' : 'Emote enabled',
                          description: 'Updated emote state (UI only).',
                          variant: 'success',
                        });
                      }}
                      className={`rounded-lg border px-2.5 py-2 transition ${
                        e.enabled ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-background text-muted-foreground'
                      } ${!canManage ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/50'}`}
                      aria-label={e.enabled ? 'Disable emote' : 'Enable emote'}
                    >
                      {e.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="mt-2">
                    <Badge variant={e.enabled ? 'success' : 'secondary'} size="sm">{e.enabled ? 'Enabled' : 'Disabled'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardSection>

      <Modal
        isOpen={open}
        onClose={close}
        title="Upload emote"
        description="Add a new emote to this team (UI only)."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!file) return;
                const n = name.trim();
                if (!n) return;
                onUpload(n, file);
                toast({ title: 'Emote uploaded', description: 'New emote added (UI only).', variant: 'success' });
                close();
              }}
              disabled={!canManage || !file || !name.trim()}
            >
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. hype" disabled={!canManage} />
            <p className="text-xs text-muted-foreground">Use lowercase letters, numbers, and underscores.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Image</label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
              }}
            />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={!canManage} className="gap-2">
              <Upload className="w-4 h-4" />
              Choose file
            </Button>
            <div className="text-xs text-muted-foreground">{file?.name ?? 'No file selected'}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
