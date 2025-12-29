'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  Film, 
  ArrowLeft, 
  Save, 
  Upload, 
  Play, 
  Settings, 
  Trash2, 
  Eye,
  Clock,
  FileVideo,
  Scissors,
  Palette,
  Music,
  Type,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, Button, Input, Textarea, Badge, Skeleton } from '@/components/ui';
import { PageShell } from '@/components/layout';

/* =============================================================================
   COMPOSER - PROJECT EDITOR PAGE
   
   Route: /composer/[projectId]
   
   Purpose: Edit an existing video project
   
   UI ONLY - No backend integration yet. Shows realistic editor interface
   with clear placeholders for features not yet implemented.
============================================================================= */

interface Project {
  id: string;
  title: string;
  type: string;
  description: string;
  status: 'draft' | 'published' | 'processing';
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  duration?: number;
  videoUrl?: string;
}

export default function ProjectEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Simulate loading project data
    const loadProject = async () => {
      setLoading(true);

      // Check if this is a new project from /composer/new
      const isNew = searchParams?.get('new') === 'true';
      const titleParam = searchParams?.get('title');

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock project data
      const mockProject: Project = {
        id: projectId,
        title: isNew && titleParam ? decodeURIComponent(titleParam) : `Project ${projectId.substring(0, 8)}`,
        type: 'comedy_special',
        description: isNew ? '' : 'This is a placeholder project description.',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setProject(mockProject);
      setLoading(false);
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId, searchParams]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    alert('Project saved! (UI only - no backend yet)');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    // Simulate delete
    await new Promise(resolve => setTimeout(resolve, 300));
    router.push('/composer');
  };

  const handleBack = () => {
    router.push('/composer');
  };

  if (loading) {
    return (
      <PageShell maxWidth="full" padding="none">
        <div className="min-h-screen bg-background">
          {/* Header Skeleton */}
          <div className="border-b border-border bg-card px-4 sm:px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Skeleton className="h-96 w-full rounded-xl" />
              </div>
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!project) {
    return (
      <PageShell maxWidth="lg" padding="lg">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PageShell maxWidth="full" padding="none">
      <div className="min-h-screen bg-background">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Back + Project Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                  className="flex-shrink-0"
                >
                  <span className="hidden sm:inline">Projects</span>
                </Button>

                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                    {project.title}
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="default" size="sm">{project.status}</Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <span className="hidden sm:inline">Delete</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled
                  leftIcon={<Eye className="w-4 h-4" />}
                  title="Preview coming soon"
                >
                  <span className="hidden sm:inline">Preview</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  isLoading={isSaving}
                  leftIcon={!isSaving ? <Save className="w-4 h-4" /> : undefined}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Coming Soon Notice */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="p-4 bg-info/10 border border-info/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Editor Under Construction</h3>
              <p className="text-sm text-muted-foreground">
                The full video editor with timeline, effects, and publishing is coming soon. 
                For now, you can update project details and settings.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Editor Area (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video Preview / Upload Area */}
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted rounded-t-xl relative overflow-hidden">
                    {/* Placeholder Video Area */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                      <FileVideo className="w-16 h-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Video Uploaded
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        Video upload and editing features are coming soon. Stay tuned!
                      </p>
                      <Button variant="secondary" disabled leftIcon={<Upload className="w-4 h-4" />}>
                        Upload Video (Coming Soon)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline / Editor Tools (Placeholder) */}
              <Card>
                <CardContent className="py-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Editor Timeline
                  </h3>
                  <div className="space-y-3">
                    {/* Timeline placeholder */}
                    <div className="h-24 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Timeline • Coming Soon</p>
                    </div>
                    
                    {/* Editor tools */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button variant="ghost" size="sm" disabled leftIcon={<Scissors className="w-4 h-4" />}>
                        Trim
                      </Button>
                      <Button variant="ghost" size="sm" disabled leftIcon={<Palette className="w-4 h-4" />}>
                        Effects
                      </Button>
                      <Button variant="ghost" size="sm" disabled leftIcon={<Music className="w-4 h-4" />}>
                        Audio
                      </Button>
                      <Button variant="ghost" size="sm" disabled leftIcon={<Type className="w-4 h-4" />}>
                        Text
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Project Details (1/3 width) */}
            <div className="space-y-6">
              {/* Project Details */}
              <Card>
                <CardContent className="py-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Project Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Title
                      </label>
                      <Input
                        value={project.title}
                        onChange={(e) => setProject({ ...project, title: e.target.value })}
                        placeholder="Project title"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Description
                      </label>
                      <Textarea
                        value={project.description}
                        onChange={(e) => setProject({ ...project, description: e.target.value })}
                        placeholder="Add a description..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Project Type
                      </label>
                      <Input
                        value={project.type.replace('_', ' ')}
                        disabled
                        className="capitalize"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Publish Settings */}
              <Card>
                <CardContent className="py-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Publish Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Visibility</p>
                      <Badge variant="default">Draft</Badge>
                    </div>

                    <div className="space-y-2">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-full"
                        disabled
                        leftIcon={<Play className="w-4 h-4" />}
                      >
                        Publish (Coming Soon)
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Publishing features will be available soon
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Stats */}
              <Card>
                <CardContent className="py-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Stats</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-foreground font-medium">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Edited</span>
                      <span className="text-foreground font-medium">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="text-foreground font-medium">
                        {project.duration ? `${project.duration}s` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Views</span>
                      <span className="text-foreground font-medium">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
