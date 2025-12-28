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
  Flame,
  Zap,
  Moon,
  Wand2,
  ImageIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

/* =============================================================================
   COMPOSER EDITOR PAGE - Canva × CapCut Vibe
   
   Creator-first canvas with visual hierarchy:
   - Hero Preview as primary canvas
   - Timeline as "the stage"
   - Tool groups in Canva-style accordion
   - Visual affordances over flat forms
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
  
  // Tool panel states (accordion)
  const [expandedPanels, setExpandedPanels] = useState<{
    clipInfo: boolean;
    captions: boolean;
    engagement: boolean;
    tools: boolean;
    export: boolean;
  }>({
    clipInfo: true,
    captions: false,
    engagement: false,
    tools: true,
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Header with Back Button */}
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
                  shadow-md hover:shadow-lg
                "
              >
                <Upload className="w-4 h-4" />
                Publish
              </button>
            </div>
          </div>

          {/* Producer + Actors Section */}
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Producer */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Producer
                  </label>
                  {producer && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-foreground">@{producer.username}</span>
                    </div>
                  )}
                </div>

                {/* Actors */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Actors
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {actors.map((actor) => (
                      <div
                        key={actor.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 group"
                      >
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-foreground">@{actor.username}</span>
                        <button
                          onClick={() => handleRemoveActor(actor.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove ${actor.username}`}
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add Actor Button */}
                    <button
                      onClick={handleAddActor}
                      className="
                        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
                        border-2 border-dashed border-border
                        text-muted-foreground hover:text-foreground hover:border-primary/50
                        transition-all duration-200
                      "
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add Actor</span>
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </header>

        {/* Editor Layout - Creator Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Canvas Area - HERO */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* 1️⃣ HERO PREVIEW - CANVAS */}
            <Card className="overflow-hidden shadow-lg border-2">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30 flex items-center justify-center group">
                  {/* Empty State CTA Overlay */}
                  <div className="text-center space-y-4 px-6">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Film className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        Drop a clip here
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Upload a video or add from your live streams
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Video
                    </button>
                  </div>
                  
                  {/* Canvas Indicators */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                    <div className="px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border text-xs font-medium text-foreground">
                      16:9
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border text-xs font-medium text-muted-foreground">
                      0:00
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3️⃣ TIMELINE - THE STAGE */}
            <Card className="overflow-hidden shadow-md border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Scissors className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Timeline</h3>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                    Coming Soon
                  </span>
                </div>
                <div className="h-24 rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    <strong className="text-foreground">Timeline editing unlocks here</strong>
                    <br />
                    Trim, text timing, and effects
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* 2️⃣ RIGHT SIDEBAR - TOOL GROUPS (CANVA-STYLE ACCORDION) */}
          <div className="space-y-3">
            
            {/* CLIP INFO GROUP */}
            <ToolGroup
              icon={Smartphone}
              iconColor="text-blue-500"
              title="Clip Info"
              isExpanded={expandedPanels.clipInfo}
              onToggle={() => togglePanel('clipInfo')}
            >
              <div className="space-y-3 text-sm">
                <InfoRow label="Aspect Ratio" value="Auto" />
                <InfoRow label="Source" value="—" />
                <InfoRow label="Length" value="Auto-detect" />
                <div>
                  <label className="text-muted-foreground block mb-2 text-xs font-medium">Suggested Platforms</label>
                  <div className="flex flex-wrap gap-1.5">
                    <PlatformBadge>TikTok</PlatformBadge>
                    <PlatformBadge>Reels</PlatformBadge>
                    <PlatformBadge>Shorts</PlatformBadge>
                  </div>
                </div>
              </div>
            </ToolGroup>

            {/* CAPTION & HASHTAGS GROUP */}
            <ToolGroup
              icon={Hash}
              iconColor="text-purple-500"
              title="Caption & Hashtags"
              badge="Coming Soon"
              isExpanded={expandedPanels.captions}
              onToggle={() => togglePanel('captions')}
            >
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-foreground mb-2">
                    🔥 Best moment from last night&apos;s stream
                  </p>
                  <p className="text-xs text-primary">
                    #LiveStreams #Gaming #Clips #Trending
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI will generate captions and hashtags based on your content
                </p>
              </div>
            </ToolGroup>

            {/* ENGAGEMENT INSIGHT GROUP */}
            <ToolGroup
              icon={TrendingUp}
              iconColor="text-green-500"
              title="Engagement Insight"
              badge="Coming Soon"
              isExpanded={expandedPanels.engagement}
              onToggle={() => togglePanel('engagement')}
            >
              <div className="py-2 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-muted/30 border-2 border-dashed border-border">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xl">—</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground">Estimate</div>
                    <div className="text-xs text-muted-foreground">Length · Pacing · Format</div>
                  </div>
                </div>
              </div>
            </ToolGroup>

            {/* TOOLS GROUP */}
            <ToolGroup
              icon={Wand2}
              iconColor="text-pink-500"
              title="Tools"
              isExpanded={expandedPanels.tools}
              onToggle={() => togglePanel('tools')}
            >
              <div className="grid grid-cols-2 gap-2">
                <ToolTile icon={Scissors} label="Trim" disabled />
                <ToolTile icon={Music} label="Audio" disabled />
                <ToolTile icon={Type} label="Text" disabled />
                <ToolTile icon={Sliders} label="Filters" disabled />
                <ToolTile icon={Sparkles} label="Effects" disabled />
                <ToolTile icon={ImageIcon} label="Stickers" disabled />
              </div>
            </ToolGroup>

            {/* EXPORT & BRANDING GROUP */}
            <ToolGroup
              icon={Upload}
              iconColor="text-orange-500"
              title="Export & Branding"
              isExpanded={expandedPanels.export}
              onToggle={() => togglePanel('export')}
            >
              <div className="space-y-4">
                {/* Current Settings */}
                <div className="space-y-2 text-sm">
                  <InfoRow label="Quality" value="1080p" />
                  <InfoRow label="Format" value="MP4" />
                  <InfoRow label="Duration" value="0:00" />
                </div>

                {/* Platform Presets */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Platform Presets
                  </label>
                  <div className="space-y-2">
                    <PlatformPresetCard
                      icon={Smartphone}
                      label="TikTok"
                      details="9:16 · 60s"
                      disabled
                    />
                    <PlatformPresetCard
                      icon={ImageIcon}
                      label="Reels"
                      details="9:16 · 90s"
                      disabled
                    />
                    <PlatformPresetCard
                      icon={Film}
                      label="Shorts"
                      details="9:16 · 60s"
                      disabled
                    />
                  </div>
                </div>

                {/* Branding */}
                <div className="pt-3 border-t border-border">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    Branding
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-normal normal-case tracking-normal">
                      Soon
                    </span>
                  </label>
                  <div className="space-y-2 opacity-50">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-not-allowed">
                      <input type="checkbox" disabled className="rounded border-border" />
                      Watermark
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-not-allowed">
                      <input type="checkbox" disabled className="rounded border-border" />
                      Username
                    </label>
                  </div>
                </div>
              </div>
            </ToolGroup>

          </div>
        </div>

      </div>
    </main>
  );
}

/* -----------------------------------------------------------------------------
   Tool Group Component (Canva-style Accordion)
----------------------------------------------------------------------------- */
function ToolGroup({
  icon: Icon,
  iconColor,
  title,
  badge,
  isExpanded,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  badge?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="font-semibold text-sm">{title}</span>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/* -----------------------------------------------------------------------------
   Info Row Component
----------------------------------------------------------------------------- */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Platform Badge Component
----------------------------------------------------------------------------- */
function PlatformBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs text-foreground font-medium">
      {children}
    </span>
  );
}

/* -----------------------------------------------------------------------------
   Tool Tile Component (Grid Layout)
----------------------------------------------------------------------------- */
function ToolTile({
  icon: Icon,
  label,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className="
        relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl
        bg-muted/30 border-2 border-border
        hover:bg-muted/50 hover:border-primary/30
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted/30 disabled:hover:border-border
      "
    >
      <Icon className="w-5 h-5 text-foreground" />
      <span className="text-xs font-medium text-foreground">{label}</span>
      {disabled && (
        <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
          Soon
        </span>
      )}
    </button>
  );
}

/* -----------------------------------------------------------------------------
   Platform Preset Card Component
----------------------------------------------------------------------------- */
function PlatformPresetCard({
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
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        bg-muted/30 border border-border
        hover:bg-muted/50 hover:border-primary/30
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted/30 disabled:hover:border-border
      "
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{details}</div>
      </div>
      {disabled && (
        <span className="text-xs text-muted-foreground">Soon</span>
      )}
    </button>
  );
}
