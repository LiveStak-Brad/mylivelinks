'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Palette, Megaphone, FileText, Sparkles, MessageSquare } from 'lucide-react';
import type { TeamCustomization, TeamIdentity, TeamRole } from '@/lib/teamAdmin/types';
import { getTeamAdminCapabilities } from '@/lib/teamAdmin/permissions';
import { DashboardSection } from '@/components/layout';
import { Badge, Button, Input, Textarea, useToast } from '@/components/ui';

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
  const iconInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState<TeamCustomization>(value);

  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!iconFile) {
      setIconPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(bannerFile);
    setBannerPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const isDirty =
    draft.theme.primary !== value.theme.primary ||
    draft.theme.accent !== value.theme.accent ||
    draft.theme.background !== value.theme.background ||
    draft.rules !== value.rules ||
    draft.pinnedAnnouncement !== value.pinnedAnnouncement ||
    !!iconFile ||
    !!bannerFile;

  const previewBannerStyle = useMemo<React.CSSProperties>(() => {
    return {
      backgroundImage: bannerPreviewUrl
        ? `url(${bannerPreviewUrl})`
        : team.bannerUrl
          ? `url(${team.bannerUrl})`
          : `linear-gradient(135deg, ${draft.theme.primary} 0%, ${draft.theme.accent} 50%, ${draft.theme.primary} 100%)`,
    };
  }, [bannerPreviewUrl, team.bannerUrl, draft.theme.primary, draft.theme.accent]);

  const previewIconUrl = iconPreviewUrl ?? team.iconUrl;

  const apply = () => {
    onChange(draft);
    setIconFile(null);
    setBannerFile(null);
    toast({ title: 'Customization saved', description: 'Changes saved (UI only).', variant: 'success' });
  };

  const reset = () => {
    setDraft(value);
    setIconFile(null);
    setBannerFile(null);
    toast({ title: 'Reset', description: 'Reverted changes (UI only).', variant: 'info' });
  };

  return (
    <div className="space-y-4 pb-28">
      <DashboardSection title="Team customization" description="Branding, theme, rules, and announcements (UI only)">
        <div className="space-y-6">
          <div
            className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden transition-[background-color,border-color,box-shadow] duration-300"
            style={{ backgroundColor: draft.theme.background }}
          >
            <div className="relative">
              <div
                className="h-40 sm:h-52 bg-cover bg-center transition-all duration-300"
                style={previewBannerStyle}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              <div className="absolute left-4 bottom-3 flex items-end gap-3">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/20 bg-background/80 backdrop-blur shadow-xl overflow-hidden">
                    {previewIconUrl ? (
                      <img src={previewIconUrl} alt={team.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-foreground">
                        {team.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl border border-white/15 bg-background/80 backdrop-blur flex items-center justify-center shadow"
                    aria-hidden
                  >
                    <div className="w-4 h-4 rounded-md" style={{ background: draft.theme.primary }} />
                  </div>
                </div>

                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      {team.name}
                    </p>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Live preview
                    </span>
                  </div>
                  <p className="text-xs text-white/75">Your theme updates instantly (UI only).</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: draft.theme.primary }} />
                <p className="text-sm font-semibold text-foreground">Mock chat preview</p>
              </div>

              <div
                className="mt-3 rounded-2xl border border-border/60 p-4 transition-[background-color,border-color] duration-300"
                style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-background border border-border/60 flex items-center justify-center text-xs font-bold">
                      A
                    </div>
                    <div
                      className="max-w-[75%] rounded-2xl px-3 py-2 text-sm text-foreground shadow-sm transition-[background-color] duration-300"
                      style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
                    >
                      Yo this team header looks premium.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 justify-end">
                    <div
                      className="max-w-[75%] rounded-2xl px-3 py-2 text-sm text-white shadow-sm transition-[background-color] duration-300"
                      style={{ backgroundColor: draft.theme.primary }}
                    >
                      Good. Now make the vibe match the brand.
                    </div>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: draft.theme.accent }}
                    >
                      Y
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: draft.theme.primary }}
                    >
                      M
                    </div>
                    <div
                      className="max-w-[75%] rounded-2xl px-3 py-2 text-sm text-white shadow-sm transition-[background-color] duration-300"
                      style={{ backgroundColor: draft.theme.accent }}
                    >
                      Oh damn, that looks good.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Branding</p>
                  {!canEdit && <Badge variant="secondary" size="sm">Admin-only</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Uploads update instantly in the preview above (UI only).</p>
              </div>
              {isDirty && (
                <Badge variant="warning" size="sm">Unsaved</Badge>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
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
                      if (f) {
                        toast({ title: 'Icon updated', description: 'Preview updated instantly (UI only).', variant: 'info' });
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => iconInputRef.current?.click()}>
                    Upload
                  </Button>
                  <span className="text-xs text-muted-foreground truncate">{iconFile?.name ?? 'No file selected'}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
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
                      if (f) {
                        toast({ title: 'Banner updated', description: 'Preview updated instantly (UI only).', variant: 'info' });
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => bannerInputRef.current?.click()}>
                    Upload
                  </Button>
                  <span className="text-xs text-muted-foreground truncate">{bannerFile?.name ?? 'No file selected'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Theme colors</p>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
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
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
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
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4 sm:col-span-2">
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

          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
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

          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-4">
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

          {!canEdit && (
            <div className="text-sm text-muted-foreground">
              Only Team Admins can edit customization.
            </div>
          )}
        </div>
      </DashboardSection>

      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-7xl px-4 md:px-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="rounded-2xl border border-border bg-card/85 backdrop-blur-xl shadow-lg p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Customization</div>
                <div className="text-xs text-muted-foreground">
                  {isDirty ? 'Unsaved changes' : 'All changes saved'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={reset} disabled={!canEdit || !isDirty}>
                  Reset
                </Button>
                <Button variant="primary" onClick={apply} disabled={!canEdit || !isDirty}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
