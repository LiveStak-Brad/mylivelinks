'use client';

import { useRef, useState } from 'react';
import { Image, Palette, Megaphone, FileText } from 'lucide-react';
import type { TeamCustomization, TeamIdentity, TeamRole } from '@/lib/teamAdmin/types';
import { getTeamAdminCapabilities } from '@/lib/teamAdmin/permissions';
import { DashboardSection } from '@/components/layout';
import { Badge, Button, Input, Modal, Textarea, useToast } from '@/components/ui';

export interface CustomizationTabProps {
  team: TeamIdentity;
  value: TeamCustomization;
  viewerRole: TeamRole;
  onChange: (v: TeamCustomization) => void;
}

export default function CustomizationTab({ team, value, viewerRole, onChange }: CustomizationTabProps) {
  const { toast } = useToast();
  const caps = getTeamAdminCapabilities(viewerRole);
  const canEdit = caps.canEditCustomization;

  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState<TeamCustomization>(value);

  const apply = () => {
    onChange(draft);
    toast({ title: 'Customization saved', description: 'Changes saved (UI only).', variant: 'success' });
  };

  return (
    <div className="space-y-4">
      <DashboardSection title="Team customization" description="Branding, theme, rules, and announcements (UI only)">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Branding</p>
                  {!canEdit && <Badge variant="secondary" size="sm">Admin-only</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Upload banner and icon (preview only).</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                Preview
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">Team icon</p>
                <p className="text-xs text-muted-foreground mt-1">Square image recommended.</p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setIconFile(f);
                    }}
                  />
                  <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => iconInputRef.current?.click()}>
                    Choose file
                  </Button>
                  <span className="text-xs text-muted-foreground truncate">{iconFile?.name ?? 'No file selected'}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">Team banner</p>
                <p className="text-xs text-muted-foreground mt-1">Wide image recommended.</p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setBannerFile(f);
                    }}
                  />
                  <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => bannerInputRef.current?.click()}>
                    Choose file
                  </Button>
                  <span className="text-xs text-muted-foreground truncate">{bannerFile?.name ?? 'No file selected'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Theme colors</p>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">Primary</p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.theme.primary}
                    onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, primary: e.target.value } }))}
                    disabled={!canEdit}
                    className="h-10 w-16"
                  />
                  <Input
                    value={draft.theme.primary}
                    onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, primary: e.target.value } }))}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">Accent</p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.theme.accent}
                    onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, accent: e.target.value } }))}
                    disabled={!canEdit}
                    className="h-10 w-16"
                  />
                  <Input
                    value={draft.theme.accent}
                    onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, accent: e.target.value } }))}
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-border p-4 sm:col-span-2">
                <p className="text-sm font-medium text-foreground">Background</p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.theme.background}
                    onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, background: e.target.value } }))}
                    disabled={!canEdit}
                    className="h-10 w-16"
                  />
                  <Input
                    value={draft.theme.background}
                    onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, background: e.target.value } }))}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Team rules</p>
            </div>
            <div className="mt-3">
              <Textarea
                value={draft.rules}
                onChange={(e) => setDraft((d) => ({ ...d, rules: e.target.value }))}
                rows={8}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Pinned announcement</p>
            </div>
            <div className="mt-3">
              <Textarea
                value={draft.pinnedAnnouncement}
                onChange={(e) => setDraft((d) => ({ ...d, pinnedAnnouncement: e.target.value }))}
                rows={5}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDraft(value)}
              disabled={!canEdit}
            >
              Reset
            </Button>
            <Button variant="primary" onClick={apply} disabled={!canEdit}>
              Save changes
            </Button>
          </div>

          {!canEdit && (
            <div className="text-sm text-muted-foreground">
              Only Team Admins can edit customization.
            </div>
          )}
        </div>
      </DashboardSection>

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Preview"
        description="Preview your branding changes (UI only)."
        size="lg"
        footer={<Button variant="primary" onClick={() => setPreviewOpen(false)}>Done</Button>}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20" />
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <Image className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{team.name}</div>
                <div className="text-xs text-muted-foreground">Theme: {draft.theme.primary} / {draft.theme.accent}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Pinned announcement</p>
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{draft.pinnedAnnouncement}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
