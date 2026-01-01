'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, LayoutTemplate, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui';
import RoomForm, { RoomFormData } from '@/components/owner/RoomForm';
import { RoomTemplate } from '@/components/owner/TemplateCard';

export default function CreateRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams ?? new URLSearchParams();
  const { toast } = useToast();
  const templateId = query.get('template');
  
  const [templates, setTemplates] = useState<RoomTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<RoomTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'select' | 'form'>('select');

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        
        // If template ID provided in URL, auto-select it
        if (templateId) {
          const template = data.templates?.find((t: RoomTemplate) => t.id === templateId);
          if (template) {
            setSelectedTemplate(template);
            setStep('form');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = (template: RoomTemplate | null) => {
    setSelectedTemplate(template);
    setStep('form');
  };

  const handleSubmit = async (data: RoomFormData) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          template_id: selectedTemplate?.id || null,
        }),
      });
      
      if (res.ok) {
        const result = await res.json();
        router.push(`/owner/rooms/${result.room.id}`);
      } else {
        const err = await res.json();
        toast({
          title: 'Create failed',
          description: err?.error || 'Failed to create room',
          variant: 'error',
        });
      }
    } catch (err) {
      console.error('Error creating room:', err);
      toast({
        title: 'Create failed',
        description: 'Failed to create room',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (step === 'form' && templates.length > 0) {
      setStep('select');
      setSelectedTemplate(null);
    } else {
      router.push('/owner/rooms');
    }
  };

  // Get template defaults for the form
  const templateDefaults = selectedTemplate ? {
    category: selectedTemplate.default_category,
    fallback_gradient: selectedTemplate.default_fallback_gradient,
    interest_threshold: selectedTemplate.default_interest_threshold,
    status: selectedTemplate.default_status,
    disclaimer_required: selectedTemplate.default_disclaimer_required,
    disclaimer_text: selectedTemplate.default_disclaimer_text || '',
    layout_type: selectedTemplate.layout_type,
    max_participants: selectedTemplate.default_max_participants,
    theme_color: selectedTemplate.default_theme_color || '',
    gifts_enabled: selectedTemplate.gifts_enabled,
    chat_enabled: selectedTemplate.chat_enabled,
  } : {};

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleCancel}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New Room</h1>
            <p className="text-muted-foreground">
              {step === 'select' 
                ? 'Choose a template or start from scratch' 
                : selectedTemplate 
                  ? `Using template: ${selectedTemplate.name}`
                  : 'Creating from scratch'
              }
            </p>
          </div>
        </div>

        {/* Template Selection Step */}
        {step === 'select' && templates.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start from scratch option */}
              <button
                onClick={() => handleSelectTemplate(null)}
                className="group flex flex-col items-center justify-center p-8 bg-card border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-muted/30 transition-all"
              >
                <div className="p-4 bg-muted rounded-full mb-4 group-hover:bg-primary/10 transition">
                  <Sparkles className="w-8 h-8 text-muted-foreground group-hover:text-primary transition" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Start from Scratch</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Create a room with custom settings
                </p>
              </button>

              {/* Template options */}
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="group flex flex-col p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all text-left"
                >
                  <div className={`h-16 w-full rounded-lg bg-gradient-to-r ${template.default_fallback_gradient} mb-4`} />
                  <div className="flex items-center gap-2 mb-2">
                    <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Template</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground capitalize">
                      {template.layout_type}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                      Max {template.default_max_participants}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form Step */}
        {(step === 'form' || templates.length === 0) && (
          <div className="bg-card border border-border rounded-xl p-6">
            <RoomForm
              templateDefaults={templateDefaults}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={saving}
              mode="create"
            />
          </div>
        )}
      </div>
    </div>
  );
}

