'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Upload,
  Film,
  Music,
  Music2,
  Mic,
  Clapperboard,
  Camera,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  X,
  FileVideo,
  FileAudio,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Input, Textarea, Badge } from '@/components/ui';
import { createClient } from '@/lib/supabase';

type ItemType = 'music' | 'music_video' | 'movie' | 'podcast' | 'series_episode' | 'education' | 'vlog' | 'comedy_special' | 'other';

interface TypeOption {
  id: ItemType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ITEM_TYPES: TypeOption[] = [
  { id: 'music', label: 'Music (Audio)', description: 'Audio tracks, singles, albums', icon: Music2, color: 'text-violet-500' },
  { id: 'music_video', label: 'Music Video', description: 'Music performances and videos', icon: Music, color: 'text-pink-500' },
  { id: 'movie', label: 'Movie / Film', description: 'Long-form narrative content', icon: Clapperboard, color: 'text-purple-500' },
  { id: 'podcast', label: 'Podcast', description: 'Audio-first or talk content', icon: Mic, color: 'text-green-500' },
  { id: 'series_episode', label: 'Series Episode', description: 'Part of a series', icon: Film, color: 'text-blue-500' },
  { id: 'vlog', label: 'Vlog', description: 'Personal or lifestyle content', icon: Camera, color: 'text-amber-500' },
  { id: 'education', label: 'Education', description: 'Tutorials and learning', icon: BookOpen, color: 'text-cyan-500' },
  { id: 'comedy_special', label: 'Comedy', description: 'Stand-up and sketches', icon: Mic, color: 'text-orange-500' },
  { id: 'other', label: 'Other', description: 'Other content types', icon: Film, color: 'text-gray-500' },
];

const AUDIO_TYPES: ItemType[] = ['music', 'podcast'];

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>}>
      <UploadPageContent />
    </Suspense>
  );
}

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'rights' | 'details' | 'upload'>('rights');
  const [rightsAttested, setRightsAttested] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);

  // Auto-select content type from URL query parameter
  useEffect(() => {
    const typeParam = searchParams?.get('type');
    if (typeParam && ITEM_TYPES.some(t => t.id === typeParam)) {
      setSelectedType(typeParam as ItemType);
    }
  }, [searchParams]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRightsConfirm = () => {
    if (!rightsAttested) {
      setError('You must confirm you have rights to this content');
      return;
    }
    setError(null);
    setStep('details');
  };

  const handleDetailsConfirm = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!selectedType) {
      setError('Please select a content type');
      return;
    }
    setError(null);
    setStep('upload');
  };

  const isAudioType = selectedType && AUDIO_TYPES.includes(selectedType);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isAudioType) {
        if (!file.type.startsWith('audio/')) {
          setError('Please select an audio file');
          return;
        }
      } else {
        if (!file.type.startsWith('video/')) {
          setError('Please select a video file');
          return;
        }
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim() || !selectedType || !rightsAttested) {
      setError('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: itemId, error: createError } = await supabase.rpc('create_creator_studio_item', {
        p_title: title.trim(),
        p_item_type: selectedType,
        p_rights_attested: true,
        p_description: description.trim() || null,
        p_visibility: 'private',
      });

      if (createError) {
        throw new Error(createError.message);
      }

      const storagePath = `creator-studio/${itemId}/${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
      }

      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(storagePath);

      // Update media URL and publish the item (set status='ready' and visibility='public')
      await supabase.rpc('update_creator_studio_item', {
        p_item_id: itemId,
        p_media_url: publicUrlData?.publicUrl || null,
        p_status: 'ready',
        p_visibility: 'public',
      });

      router.push('/creator-studio/content');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Upload Content</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add new content to your Creator Studio
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        <StepIndicator step={1} label="Rights" active={step === 'rights'} completed={step !== 'rights'} />
        <div className="flex-1 h-0.5 bg-muted" />
        <StepIndicator step={2} label="Details" active={step === 'details'} completed={step === 'upload'} />
        <div className="flex-1 h-0.5 bg-muted" />
        <StepIndicator step={3} label="Upload" active={step === 'upload'} completed={false} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: Rights Attestation */}
      {step === 'rights' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Content Rights Confirmation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Before uploading, you must confirm that you have the legal rights to publish 
                  and monetize this content. This includes all audio, video, images, and any 
                  other copyrighted material.
                </p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-xl mb-6">
              <h4 className="font-medium text-foreground mb-3">By checking this box, you confirm:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  You own or have licensed all audio content (music, sound effects, voiceovers)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  You own or have licensed all video footage and images
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  You have permission from any individuals appearing in the content
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  You understand that violating these terms may result in content removal and account suspension
                </li>
              </ul>
            </div>

            <label className="flex items-start gap-3 p-4 border-2 border-primary/30 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors">
              <input
                type="checkbox"
                checked={rightsAttested}
                onChange={(e) => setRightsAttested(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">
                I confirm I own or have legal rights to publish and monetize this content.
              </span>
            </label>

            <div className="flex justify-end mt-6">
              <Button
                variant="primary"
                onClick={handleRightsConfirm}
                disabled={!rightsAttested}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Content Details */}
      {step === 'details' && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your content"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Content Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ITEM_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`
                        p-3 rounded-xl border-2 text-left transition-all
                        ${isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${type.color} mb-1`} />
                      <p className="text-xs font-medium text-foreground">{type.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep('rights')}>
                Back
              </Button>
              <Button variant="primary" onClick={handleDetailsConfirm}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: File Upload */}
      {step === 'upload' && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
              <Badge variant="default">{ITEM_TYPES.find(t => t.id === selectedType)?.label}</Badge>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={isAudioType ? 'audio/*' : 'video/*'}
              onChange={handleFileSelect}
              className="hidden"
            />

            {!selectedFile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Click to select {isAudioType ? 'an audio' : 'a video'} file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAudioType ? 'MP3, WAV, AAC, FLAC supported' : 'MP4, MOV, WebM supported'}
                  </p>
                </div>
              </button>
            ) : (
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  {isAudioType ? (
                    <FileAudio className="w-8 h-8 text-primary" />
                  ) : (
                    <FileVideo className="w-8 h-8 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep('details')}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!selectedFile || isSubmitting}
                isLoading={isSubmitting}
              >
                {isSubmitting ? 'Uploading...' : 'Upload Content'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({
  step,
  label,
  active,
  completed,
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
          ${completed ? 'bg-green-500 text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
        `}
      >
        {completed ? <CheckCircle className="w-4 h-4" /> : step}
      </div>
      <span className={`text-sm ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
