'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Film, 
  Save, 
  Upload, 
  X, 
  User, 
  UserPlus, 
  Scissors, 
  Sliders, 
  Music,
  Type,
  Sparkles,
  ArrowLeft,
  Info,
  Smartphone,
  TrendingUp,
  Hash,
  Wand2,
  ImageIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

/* =============================================================================
   COMPOSER EDITOR PAGE - Creator-Grade Canvas
   
   Layout Philosophy:
   - Canvas is THE STAR (center, elevated)
   - Tool rail (left) = immediate reach
   - Inspector (right) = contextual details
   - Visual hierarchy enforced through contrast and space
============================================================================= */

export default function ComposerEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  
  const isNewProject = projectId === 'new';

  // Project state (placeholder)
  const [projectTitle, setProjectTitle] = useState('');
  const [producer, setProducer] = useState<{ id: string; username: string } | null>(null);
  const [actors, setActors] = useState<{ id: string; username: string }[]>([]);
  
  // Inspector panel states (compact by default)
  const [expandedPanels, setExpandedPanels] = useState<{
    clipInfo: boolean;
    captions: boolean;
    engagement: boolean;
    export: boolean;
  }>({
    clipInfo: false,
    captions: false,
    engagement: false,
    export: true,
  });

  const togglePanel = (panel: keyof typeof expandedPanels) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Load current user as producer on mount
  useEffect(() => {
    // Placeholder: would load from auth
    setProducer({ id: 'current-user-id', username: 'YourUsername' });
  }, []);

  const handleAddActor = () => {
    // Placeholder: would open actor search modal
    alert('Actor search UI not implemented yet');
  };

  const handleRemoveActor = (actorId: string) => {
    setActors(actors.filter(a => a.id !== actorId));
  };

  const handleSave = () => {
    alert('Save functionality not wired yet');
  };

  const handlePublish = () => {
    alert('Publish functionality not wired yet');
  };

  return (
    <main 
      id="main"
      className="min-h-screen bg-background"
    >
      {/* TOP BANNER - Web Coins Cheaper Message */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
          <Info className="w-4 h-4 flex-shrink-0" />
          <p className="text-center">
            <strong>Save more!</strong> Coins are cheaper on the Web app than mobile
          </p>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-6">
        
        {/* Top Bar - Title + Actions */}
        <header className="mb-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/composer"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Back to projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Untitled Project"
                className="
                  text-2xl font-bold bg-transparent border-none outline-none
                  text-foreground placeholder:text-muted-foreground
                  w-full focus:ring-2 focus:ring-primary/20 rounded-lg px-2 py-1
                "
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="
                  inline-flex items-center gap-2 px-4 py-2.5
                  bg-muted text-foreground
                  text-sm font-semibold rounded-xl
                  hover:bg-muted/80 active:scale-[0.98]
                  transition-all duration-200
                "
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
              <button
                onClick={handlePublish}
                className="
                  inline-flex items-center gap-2 px-4 py-2.5
                  bg-gradient-to-r from-primary to-accent text-white
                  text-sm font-semibold rounded-xl
                  hover:opacity-90 active:scale-[0.98]
                  transition-all duration-200
                  shadow-lg shadow-primary/30
                "
              >
                <Upload className="w-4 h-4" />
                Publish
              </button>
            </div>
          </div>

          {/* Producer + Actors - Compact Row */}
          <div className="flex items-center gap-4 px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Producer</span>
              {producer && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <User className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-medium text-foreground">@{producer.username}</span>
                </div>
              )}
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actors</span>
              {actors.map((actor) => (
                <div
                  key={actor.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 group"
                >
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-foreground">@{actor.username}</span>
                  <button
                    onClick={() => handleRemoveActor(actor.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddActor}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Add</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN EDITOR LAYOUT */}
        <div className="flex gap-4">
          
          {/* 🎨 LEFT: TOOL RAIL (CapCut/Canva style) */}
          <aside className="w-16 flex-shrink-0">
            <div className="sticky top-20 space-y-2">
              <ToolRailButton icon={Scissors} label="Trim" disabled />
              <ToolRailButton icon={Type} label="Text" disabled />
              <ToolRailButton icon={Music} label="Audio" disabled />
              <ToolRailButton icon={Sliders} label="Filters" disabled />
              <ToolRailButton icon={Sparkles} label="Effects" disabled />
              <ToolRailButton icon={ImageIcon} label="Stickers" disabled />
            </div>
          </aside>

          {/* 🌟 CENTER: CANVAS (THE STAR) */}
          <div className="flex-1 space-y-4 min-w-0">
            
            {/* Canvas Container with Glow */}
            <div className="relative">
              {/* Ambient Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-2xl blur-2xl opacity-50" />
              
              {/* Canvas */}
              <Card className="relative overflow-hidden shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-card via-card to-muted/20">
                <CardContent className="p-0">
                  <div className="relative aspect-video flex items-center justify-center bg-gradient-to-br from-muted/20 via-background/50 to-muted/20">
                    {/* Empty State */}
                    <div className="text-center space-y-5 px-6 py-8">
                      <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-4 ring-primary/10">
                        <Film className="w-12 h-12 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">
                          Drop a clip here
                        </h2>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          Upload a video or add from your live streams to start creating
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/30">
                          <Upload className="w-5 h-5" />
                          Upload Video
                        </button>
                        <button className="inline-flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors">
                          <Film className="w-5 h-5" />
                          From Streams
                        </button>
                      </div>
                    </div>
                    
                    {/* Floating Indicators */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <span className="px-3 py-1.5 rounded-lg bg-card/95 backdrop-blur-sm border border-border text-xs font-bold text-foreground shadow-sm">
                        16:9
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-card/95 backdrop-blur-sm border border-border text-xs font-medium text-muted-foreground shadow-sm">
                        0:00
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeline - Full Width, Anchored */}
            <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-background to-accent/5 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">Timeline</h3>
                    <p className="text-xs text-muted-foreground">Your edits will take shape here</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
                    Coming Soon
                  </span>
                </div>
                <div className="h-28 rounded-xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground font-medium">
                    Trim · Text Timing · Effects
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* 📋 RIGHT: INSPECTOR (Contextual) */}
          <aside className="w-72 flex-shrink-0">
            <div className="sticky top-20 space-y-3">
              
              <InspectorPanel
                icon={Smartphone}
                title="Clip Info"
                isExpanded={expandedPanels.clipInfo}
                onToggle={() => togglePanel('clipInfo')}
              >
                <div className="space-y-2.5 text-xs">
                  <InfoRow label="Aspect Ratio" value="Auto" />
                  <InfoRow label="Source" value="—" />
                  <InfoRow label="Length" value="Auto-detect" />
                  <div className="pt-2 border-t border-border">
                    <label className="text-muted-foreground font-medium mb-1.5 block">Platforms</label>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge>TikTok</Badge>
                      <Badge>Reels</Badge>
                      <Badge>Shorts</Badge>
                    </div>
                  </div>
                </div>
              </InspectorPanel>

              <InspectorPanel
                icon={Hash}
                title="Captions"
                badge="Soon"
                isExpanded={expandedPanels.captions}
                onToggle={() => togglePanel('captions')}
              >
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-foreground mb-1">
                      🔥 Best moment from last night&apos;s stream
                    </p>
                    <p className="text-[10px] text-primary font-medium">
                      #LiveStreams #Gaming #Clips
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    AI-generated captions and hashtags
                  </p>
                </div>
              </InspectorPanel>

              <InspectorPanel
                icon={TrendingUp}
                title="Engagement"
                badge="Soon"
                isExpanded={expandedPanels.engagement}
                onToggle={() => togglePanel('engagement')}
              >
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border-2 border-dashed border-border">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold">—</span>
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-semibold text-foreground">Estimate</div>
                    <div className="text-[10px] text-muted-foreground truncate">Length · Pacing · Format</div>
                  </div>
                </div>
              </InspectorPanel>

              <InspectorPanel
                icon={Upload}
                title="Export"
                isExpanded={expandedPanels.export}
                onToggle={() => togglePanel('export')}
              >
                <div className="space-y-3">
                  <div className="space-y-1.5 text-xs">
                    <InfoRow label="Quality" value="1080p" />
                    <InfoRow label="Format" value="MP4" />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                      Presets
                    </label>
                    <div className="space-y-1.5">
                      <PresetRow icon={Smartphone} label="TikTok" details="9:16 · 60s" disabled />
                      <PresetRow icon={ImageIcon} label="Reels" details="9:16 · 90s" disabled />
                      <PresetRow icon={Film} label="Shorts" details="9:16 · 60s" disabled />
                    </div>
                  </div>
                </div>
              </InspectorPanel>

            </div>
          </aside>

        </div>

      </div>
    </main>
  );
}

/* -----------------------------------------------------------------------------
   Tool Rail Button (Vertical, Icon-First)
----------------------------------------------------------------------------- */
function ToolRailButton({
  icon: Icon,
  label,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative group">
      <button
        disabled={disabled}
        className="
          w-14 h-14 rounded-xl flex items-center justify-center
          bg-muted/50 border-2 border-border
          hover:bg-muted hover:border-primary/50 hover:shadow-md
          transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-muted/50
        "
      >
        <Icon className="w-6 h-6 text-foreground" />
        {disabled && (
          <span className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-md bg-card border border-border text-muted-foreground font-medium shadow-sm">
            Soon
          </span>
        )}
      </button>
      {/* Hover Label */}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="px-3 py-1.5 rounded-lg bg-card border border-border shadow-lg text-xs font-medium text-foreground whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Inspector Panel (Compact, Contextual)
----------------------------------------------------------------------------- */
function InspectorPanel({
  icon: Icon,
  title,
  badge,
  isExpanded,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden bg-card/50 backdrop-blur-sm">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">{title}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <CardContent className="px-3 pb-3 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/* -----------------------------------------------------------------------------
   Info Row (Compact)
----------------------------------------------------------------------------- */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Badge (Platform)
----------------------------------------------------------------------------- */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] text-foreground font-semibold">
      {children}
    </span>
  );
}

/* -----------------------------------------------------------------------------
   Preset Row (Compact)
----------------------------------------------------------------------------- */
function PresetRow({
  icon: Icon,
  label,
  details,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  details: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className="
        w-full flex items-center gap-2 px-2.5 py-2 rounded-lg
        bg-muted/30 border border-border
        hover:bg-muted/50 hover:border-primary/30
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted/30 disabled:hover:border-border
      "
    >
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-xs font-semibold text-foreground truncate">{label}</div>
        <div className="text-[10px] text-muted-foreground">{details}</div>
      </div>
      {disabled && (
        <span className="text-[10px] text-muted-foreground font-medium">Soon</span>
      )}
    </button>
  );
}
