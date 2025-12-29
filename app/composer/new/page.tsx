'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Film, ArrowLeft, Plus, AlertCircle, Video, Music, Mic, Camera } from 'lucide-react';
import { Card, CardContent, Button, Input, Textarea, Badge } from '@/components/ui';
import { PageShell, PageHeader } from '@/components/layout';

/* =============================================================================
   COMPOSER - NEW PROJECT PAGE
   
   Route: /composer/new
   
   Purpose: Create a new video project
   
   UI ONLY - No backend integration yet. Shows realistic form with clear
   "Coming Soon" indicators for features not yet implemented.
============================================================================= */

type ProjectType = 'comedy_special' | 'music_video' | 'vlog' | 'podcast' | 'short_film' | 'other';

interface ProjectTypeOption {
  id: ProjectType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  comingSoon?: boolean;
}

const PROJECT_TYPES: ProjectTypeOption[] = [
  {
    id: 'comedy_special',
    label: 'Comedy Special',
    description: 'Stand-up comedy, sketches, or comedy content',
    icon: Mic,
    color: 'text-amber-500',
  },
  {
    id: 'music_video',
    label: 'Music Video',
    description: 'Music performances, lyric videos, or music content',
    icon: Music,
    color: 'text-purple-500',
  },
  {
    id: 'vlog',
    label: 'Vlog',
    description: 'Daily vlogs, lifestyle, travel, or personal content',
    icon: Camera,
    color: 'text-pink-500',
  },
  {
    id: 'podcast',
    label: 'Podcast/Talk',
    description: 'Interview, discussion, or audio-first content',
    icon: Mic,
    color: 'text-blue-500',
  },
  {
    id: 'short_film',
    label: 'Short Film',
    description: 'Narrative storytelling, documentaries, or cinematic content',
    icon: Video,
    color: 'text-green-500',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Educational, tutorial, or other video content',
    icon: Film,
    color: 'text-gray-500',
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!projectTitle.trim() || !selectedType) {
      alert('Please enter a project title and select a type');
      return;
    }

    setIsCreating(true);

    // Simulate project creation
    setTimeout(() => {
      // In a real implementation, this would:
      // 1. Call POST /api/composer/projects
      // 2. Receive new project ID
      // 3. Navigate to /composer/[projectId]
      
      // For now, generate a mock ID and navigate
      const mockProjectId = `proj_${Date.now()}`;
      router.push(`/composer/${mockProjectId}?new=true&title=${encodeURIComponent(projectTitle)}`);
    }, 500);
  };

  const handleCancel = () => {
    router.push('/composer');
  };

  return (
    <PageShell maxWidth="lg" padding="lg">
      <PageHeader
        title="Create New Project"
        description="Choose a project type and give it a name to get started"
        backLink="/composer"
        backLabel="Back to Projects"
        icon={<Film className="w-8 h-8 text-primary" />}
      />

      {/* Coming Soon Notice */}
      <div className="mb-6 p-4 bg-info/10 border border-info/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">Composer Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            The full video composer with editing, publishing, and distribution is currently in development. 
            You can create projects now, but editing features will be available soon.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Title */}
        <Card>
          <CardContent className="pt-6">
            <label className="block mb-2">
              <span className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                Project Title
                <span className="text-destructive">*</span>
              </span>
              <Input
                placeholder="My Amazing Video Project"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                inputSize="lg"
                maxLength={100}
              />
              <span className="text-xs text-muted-foreground mt-1">
                {projectTitle.length}/100 characters
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Project Type Selection */}
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                Project Type
                <span className="text-destructive">*</span>
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Select the type that best describes your content
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROJECT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;

                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-200 text-left
                      hover:border-primary/50 hover:bg-primary/5
                      ${isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card'
                      }
                      ${type.comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    disabled={type.comingSoon}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <Icon className={`w-6 h-6 ${type.color} flex-shrink-0`} />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          {type.label}
                          {type.comingSoon && (
                            <Badge variant="default" size="sm">Soon</Badge>
                          )}
                        </h3>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Project Description (Optional) */}
        <Card>
          <CardContent className="pt-6">
            <label className="block">
              <span className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                Description
                <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </span>
              <Textarea
                placeholder="Describe your project, add notes, or outline your vision..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <span className="text-xs text-muted-foreground mt-1">
                {projectDescription.length}/500 characters
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleCancel}
            variant="secondary"
            size="lg"
            className="flex-1 sm:flex-initial"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!projectTitle.trim() || !selectedType || isCreating}
            isLoading={isCreating}
            leftIcon={!isCreating ? <Plus className="w-4 h-4" /> : undefined}
          >
            {isCreating ? 'Creating Project...' : 'Create Project'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
