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
   COMPOSER EDITOR PAGE
   
   Route: /composer/[projectId] or /composer/new
   
   Full composer editor with:
   - Top banner: "Coins are cheaper on the Web app"
   - Producer + Actors UI (chips/badges)
   - Editor layout with placeholder advanced tools
   - All UI only - no complex backend wiring yet
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
  const [showCaptions, setShowCaptions] = useState(false);

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

        {/* Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Editor Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Video Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Film className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No video uploaded</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline (Placeholder) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                  <p className="text-sm text-muted-foreground">Timeline tools coming soon</p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Tools Sidebar */}
          <div className="space-y-4">
            
            {/* 1️⃣ SMART CLIP METADATA PANEL */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  Clip Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Aspect Ratio:</span>
                  <span className="text-foreground font-medium">Auto</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Source:</span>
                  <span className="text-foreground font-medium">—</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Length:</span>
                  <span className="text-foreground font-medium">Auto-detect</span>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-2">Suggested Platforms:</label>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs text-foreground">
                      TikTok
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs text-foreground">
                      Reels
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs text-foreground">
                      Shorts
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2️⃣ AUTO CAPTION / HASHTAG PREVIEW */}
            <Card>
              <CardHeader>
                <button
                  onClick={() => setShowCaptions(!showCaptions)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hash className="w-4 h-4 text-purple-500" />
                    Auto Caption & Hashtags
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-normal">
                      Coming Soon
                    </span>
                  </CardTitle>
                  {showCaptions ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              {showCaptions && (
                <CardContent>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-foreground mb-2">
                      🔥 Best moment from last night&apos;s stream
                    </p>
                    <p className="text-xs text-primary">
                      #LiveStreams #Gaming #Clips #Trending
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    AI will generate captions and hashtags based on your content
                  </p>
                </CardContent>
              )}
            </Card>

            {/* 3️⃣ ENGAGEMENT SCORE INDICATOR */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Engagement Estimate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border">
                      <span className="text-2xl">—</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Based on clip length, pacing, and format
                    </p>
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Advanced Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Advanced Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ToolButton icon={Scissors} label="Trim & Cut" disabled />
                <ToolButton icon={Music} label="Audio" disabled />
                <ToolButton icon={Type} label="Text & Titles" disabled />
                <ToolButton icon={Sliders} label="Filters" disabled />
                <ToolButton icon={Sparkles} label="Effects" disabled />
              </CardContent>
            </Card>

            {/* Export Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Settings */}
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Quality:</span>
                    <span className="text-foreground font-medium">1080p</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="text-foreground font-medium">MP4</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-foreground font-medium">0:00</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  {/* 4️⃣ ONE-CLICK PLATFORM PRESETS */}
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
                    Platform Presets
                  </label>
                  <div className="space-y-2">
                    <PresetButton
                      icon={Smartphone}
                      label="TikTok"
                      details="9:16 · 60s"
                      disabled
                    />
                    <PresetButton
                      icon={ImageIcon}
                      label="Instagram Reels"
                      details="9:16 · 90s"
                      disabled
                    />
                    <PresetButton
                      icon={Film}
                      label="YouTube Shorts"
                      details="9:16 · 60s"
                      disabled
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  {/* 5️⃣ WATERMARK / BRANDING PREVIEW */}
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block flex items-center gap-2">
                    Branding
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-normal normal-case tracking-normal">
                      Coming Soon
                    </span>
                  </label>
                  <div className="space-y-2 opacity-60">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-not-allowed">
                      <input
                        type="checkbox"
                        disabled
                        className="rounded border-border cursor-not-allowed"
                      />
                      Show watermark
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-not-allowed">
                      <input
                        type="checkbox"
                        disabled
                        className="rounded border-border cursor-not-allowed"
                      />
                      Auto-add username
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Branding options will help promote your content
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </main>
  );
}

/* -----------------------------------------------------------------------------
   Preset Button Component
----------------------------------------------------------------------------- */
function PresetButton({
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
        bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60
        border border-border
      "
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 text-left">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{details}</div>
      </div>
      <span className="text-xs">Soon</span>
    </button>
  );
}

/* -----------------------------------------------------------------------------
   Tool Button Component
----------------------------------------------------------------------------- */
function ToolButton({ 
  icon: Icon, 
  label, 
  disabled = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        transition-all duration-200
        ${disabled
          ? 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60'
          : 'bg-muted hover:bg-muted/80 text-foreground hover:shadow-sm active:scale-[0.98]'
        }
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
      {disabled && (
        <span className="ml-auto text-xs text-muted-foreground">Soon</span>
      )}
    </button>
  );
}

