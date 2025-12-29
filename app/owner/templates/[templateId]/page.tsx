'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Save,
  Loader2,
  LayoutGrid,
  LayoutTemplate,
  Users,
  MessageSquare,
  Gift,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui';

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  layout_type: string;
  default_max_participants: number;
  default_status: string;
  default_interest_threshold: number;
  default_category: string;
  default_disclaimer_required: boolean;
  default_disclaimer_text: string | null;
  gifts_enabled: boolean;
  chat_enabled: boolean;
  default_fallback_gradient: string;
  default_theme_color: string | null;
  created_at: string;
  updated_at: string;
}

const categories = ['gaming', 'music', 'entertainment', 'sports', 'lifestyle', 'education'];
const statuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'interest', label: 'Gauging Interest' },
  { value: 'opening_soon', label: 'Opening Soon' },
  { value: 'live', label: 'Live' },
  { value: 'paused', label: 'Paused' },
];
const layoutTypes = [
  { value: 'grid', label: 'Grid Layout', icon: LayoutGrid, description: 'Standard grid of participants' },
  { value: 'versus', label: 'Versus Layout', icon: LayoutTemplate, description: 'Two-side competitive layout' },
  { value: 'panel', label: 'Panel Layout', icon: LayoutTemplate, description: 'Featured host with guests' },
];
const gradients = [
  'from-purple-600 to-pink-600',
  'from-blue-600 to-cyan-500',
  'from-green-600 to-emerald-500',
  'from-orange-500 to-red-600',
  'from-violet-600 to-indigo-600',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-yellow-400',
  'from-teal-500 to-cyan-400',
];

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;
  const isNew = templateId === 'new';
  const { toast } = useToast();
  
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [formData, setFormData] = useState<Partial<TemplateData>>({
    name: '',
    description: '',
    layout_type: 'grid',
    default_max_participants: 12,
    default_status: 'interest',
    default_interest_threshold: 5000,
    default_category: 'entertainment',
    default_disclaimer_required: false,
    default_disclaimer_text: '',
    gifts_enabled: true,
    chat_enabled: true,
    default_fallback_gradient: 'from-purple-600 to-pink-600',
    default_theme_color: '',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchTemplate = useCallback(async () => {
    if (isNew) return;
    
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`);
      if (!res.ok) throw new Error('Template not found');
      const data = await res.json();
      setTemplate(data.template);
      setFormData(data.template);
    } catch (err) {
      console.error('Error fetching template:', err);
      router.push('/owner/templates');
    } finally {
      setLoading(false);
    }
  }, [templateId, isNew, router]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleChange = (field: keyof TemplateData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if ((formData.default_max_participants || 12) < 1 || (formData.default_max_participants || 12) > 100) {
      newErrors.default_max_participants = 'Must be between 1 and 100';
    }

    if (formData.default_disclaimer_required && !formData.default_disclaimer_text?.trim()) {
      newErrors.default_disclaimer_text = 'Disclaimer text is required when enabled';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      const url = isNew ? '/api/admin/templates' : `/api/admin/templates/${templateId}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (isNew) {
          router.push(`/owner/templates/${data.template.id}`);
        } else {
          setTemplate(data.template);
          setFormData(data.template);
          setHasChanges(false);
        }
      } else {
        const err = await res.json();
        toast({
          title: 'Save failed',
          description: err?.error || 'Failed to save template',
          variant: 'error',
        });
      }
    } catch (err) {
      console.error('Error saving template:', err);
      toast({
        title: 'Save failed',
        description: 'Failed to save template',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/owner/templates" 
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isNew ? 'Create Template' : 'Edit Template'}
              </h1>
              {!isNew && template && (
                <p className="text-muted-foreground text-sm">{template.name}</p>
              )}
            </div>
          </div>
          
          <Button
            onClick={handleSave}
            isLoading={saving}
            disabled={!isNew && !hasChanges}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isNew ? 'Create Template' : 'Save Changes'}
          </Button>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Template Information</h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Template Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Gaming Room Template"
                error={!!errors.name}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
              />
            </div>
          </div>

          {/* Layout Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Layout Type</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {layoutTypes.map((lt) => {
                const Icon = lt.icon;
                const isSelected = formData.layout_type === lt.value;
                return (
                  <button
                    key={lt.value}
                    type="button"
                    onClick={() => handleChange('layout_type', lt.value)}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`p-3 rounded-lg mb-3 ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {lt.label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      {lt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Default Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Default Status</label>
                <div className="relative">
                  <select
                    value={formData.default_status || 'interest'}
                    onChange={(e) => handleChange('default_status', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer"
                  >
                    {statuses.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Default Category</label>
                <div className="relative">
                  <select
                    value={formData.default_category || 'entertainment'}
                    onChange={(e) => handleChange('default_category', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer capitalize"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Max Participants
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.default_max_participants || 12}
                  onChange={(e) => handleChange('default_max_participants', parseInt(e.target.value) || 12)}
                  error={!!errors.default_max_participants}
                />
                {errors.default_max_participants && (
                  <p className="text-sm text-destructive">{errors.default_max_participants}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Interest Threshold
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formData.default_interest_threshold || 5000}
                  onChange={(e) => handleChange('default_interest_threshold', parseInt(e.target.value) || 5000)}
                />
              </div>
            </div>
          </div>

          {/* Appearance Defaults */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Default Appearance</h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Default Gradient
              </label>
              <div className="flex flex-wrap gap-2">
                {gradients.map((gradient) => (
                  <button
                    key={gradient}
                    type="button"
                    onClick={() => handleChange('default_fallback_gradient', gradient)}
                    className={`w-12 h-8 rounded-lg bg-gradient-to-r ${gradient} transition-all ${
                      formData.default_fallback_gradient === gradient 
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                        : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Default Theme Color (optional)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.default_theme_color || '#8b5cf6'}
                  onChange={(e) => handleChange('default_theme_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-input cursor-pointer"
                />
                <Input
                  value={formData.default_theme_color || ''}
                  onChange={(e) => handleChange('default_theme_color', e.target.value)}
                  placeholder="#8b5cf6"
                  className="w-32"
                />
                {formData.default_theme_color && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleChange('default_theme_color', null)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Default Features</h3>
            
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition">
                <input
                  type="checkbox"
                  checked={formData.gifts_enabled ?? true}
                  onChange={(e) => handleChange('gifts_enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                />
                <Gift className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Gifts Enabled</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition">
                <input
                  type="checkbox"
                  checked={formData.chat_enabled ?? true}
                  onChange={(e) => handleChange('chat_enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                />
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Chat Enabled</span>
              </label>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Disclaimer Settings</h3>
            
            <label className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg cursor-pointer hover:bg-amber-500/15 transition">
              <input
                type="checkbox"
                checked={formData.default_disclaimer_required ?? false}
                onChange={(e) => handleChange('default_disclaimer_required', e.target.checked)}
                className="w-4 h-4 rounded border-amber-500/50 text-amber-500 focus:ring-amber-500"
              />
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-200">
                Require consent disclaimer by default
              </span>
            </label>
            
            {formData.default_disclaimer_required && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Default Disclaimer Text <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={formData.default_disclaimer_text || ''}
                  onChange={(e) => handleChange('default_disclaimer_text', e.target.value)}
                  placeholder="Enter default disclaimer text..."
                  rows={4}
                  error={!!errors.default_disclaimer_text}
                />
                {errors.default_disclaimer_text && (
                  <p className="text-sm text-destructive">{errors.default_disclaimer_text}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

