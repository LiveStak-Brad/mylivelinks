'use client';

import { useState } from 'react';
import { Film, Plus, Inbox, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

/* =============================================================================
   COMPOSER PROJECTS LIST PAGE
   
   Route: /composer
   
   Shows user's composer projects in two tabs:
   - Drafts: Unfinished/unpublished projects
   - Posted: Published projects
   
   UI ONLY - No backend wiring yet. Shows clear placeholders.
   Entry point from top-right user menu → Composer
============================================================================= */

type TabView = 'drafts' | 'posted';

export default function ComposerPage() {
  const [activeTab, setActiveTab] = useState<TabView>('drafts');

  // Placeholder: No data yet
  const drafts: any[] = [];
  const posted: any[] = [];

  const currentProjects = activeTab === 'drafts' ? drafts : posted;

  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Page Header */}
        <header className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
                <Film className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Composer
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create and manage your video projects
                </p>
              </div>
            </div>
            
            {/* New Project Button */}
            <Link
              href="/composer/new"
              className="
                inline-flex items-center gap-2 px-4 py-2.5
                bg-gradient-to-r from-primary to-accent text-white
                text-sm font-semibold rounded-xl
                hover:opacity-90 active:scale-[0.98]
                transition-all duration-200
                shadow-md hover:shadow-lg
              "
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-muted rounded-xl w-fit animate-slide-up">
          <button
            onClick={() => setActiveTab('drafts')}
            className={`
              px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${activeTab === 'drafts'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveTab('posted')}
            className={`
              px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
              ${activeTab === 'posted'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            Posted
          </button>
        </div>

        {/* Content Area */}
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          {currentProjects.length === 0 ? (
            <EmptyState type={activeTab} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* -----------------------------------------------------------------------------
   Empty State
----------------------------------------------------------------------------- */
function EmptyState({ type }: { type: TabView }) {
  const config = {
    drafts: {
      icon: Inbox,
      title: 'No drafts yet',
      description: 'Your draft projects will appear here',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    posted: {
      icon: Check,
      title: 'No posted projects',
      description: 'Your published projects will appear here',
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  };

  const { icon: Icon, title, description, iconColor, bgColor } = config[type];

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className={`p-4 rounded-2xl ${bgColor} mb-4`}>
          <Icon className={`w-8 h-8 ${iconColor}`} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

/* -----------------------------------------------------------------------------
   Project Card (Placeholder for when projects exist)
----------------------------------------------------------------------------- */
function ProjectCard({ project }: { project: any }) {
  return (
    <Link href={`/composer/${project.id}`}>
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <div className="aspect-video bg-muted relative overflow-hidden">
          {/* Thumbnail placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-12 h-12 text-muted-foreground/30" />
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground mb-1 truncate">
            {project.title || 'Untitled Project'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'Just now'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

