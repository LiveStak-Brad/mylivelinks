'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button } from '@/components/ui';
import { Input, Textarea } from '@/components/ui';
import { createClient } from '@/lib/supabase';

export default function ApplyPage() {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState({
    name: '',
    category: 'entertainment',
    subtitle: '',
    description: '',
    why: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReqId, setLastReqId] = useState<string | null>(null);
  const [myIdeas, setMyIdeas] = useState<
    Array<{ id: string; room_key: string; name: string; category: string; status: string; image_url: string | null; created_at: string }>
  >([]);

  useEffect(() => {
    console.info('[room-idea] form_opened');
    let cancelled = false;

    const loadMyIdeas = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error: qErr } = await supabase
          .from('rooms')
          .select('id, room_key, name, category, status, image_url, created_at')
          .eq('admin_profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (qErr) {
          console.warn('[room-idea] load_my_ideas_error', qErr);
          return;
        }
        if (!cancelled) setMyIdeas((data as any[]) ?? []);
      } catch (e) {
        console.warn('[room-idea] load_my_ideas_exception', e);
      }
    };

    loadMyIdeas();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!imageFile) {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const categories = ['gaming', 'music', 'entertainment', 'sports', 'lifestyle', 'education'];

  const validate = () => {
    const name = formData.name.trim();
    const category = formData.category.trim();
    const description = formData.description.trim();
    if (!name) return 'Room name is required.';
    if (!category) return 'Category is required.';
    if (!description) return 'Short description is required.';
    if (!imageFile) return 'Image is required.';
    if (!imageFile.type.startsWith('image/')) return 'Please select an image file.';
    if (imageFile.size > 5 * 1024 * 1024) return 'Image must be less than 5MB.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitOk(false);
    setLastReqId(null);

    try {
      setError(null);

      const validationError = validate();
      if (validationError) {
        console.info('[room-idea] validation_error', validationError);
        setError(validationError);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to submit a room idea.');
        return;
      }

      console.info('[room-idea] submit_clicked');
      const fd = new FormData();
      fd.set('name', formData.name.trim());
      fd.set('category', formData.category.trim());
      if (formData.subtitle.trim()) fd.set('subtitle', formData.subtitle.trim());
      fd.set('description', formData.description.trim());
      if (formData.why.trim()) fd.set('why', formData.why.trim());
      if (imageFile) fd.set('image', imageFile);

      console.info('[room-idea] upload_started');
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        body: fd,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json?.error as string) || 'Failed to submit room idea.';
        console.info('[room-idea] submit_error', msg);
        setError(msg);
        setLastReqId(json?.reqId ?? null);
        return;
      }

      setLastReqId(json?.reqId ?? null);
      console.info('[room-idea] submission_created', { reqId: json?.reqId, roomId: json?.room?.id });
      setSubmitOk(true);

      setFormData({ name: '', category: 'entertainment', subtitle: '', description: '', why: '' });
      setImageFile(null);

      const { data } = await supabase
        .from('rooms')
        .select('id, room_key, name, category, status, image_url, created_at')
        .eq('admin_profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setMyIdeas((data as any[]) ?? []);
      console.info('[room-idea] success_shown');
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit room idea.';
      console.info('[room-idea] submit_exception', msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSelectFile = (file: File | null) => {
    setError(null);
    setSubmitOk(false);
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.');
      return;
    }
    setImageFile(file);
    console.info('[room-idea] image_selected', { size: file.size, type: file.type });
  };

  return (
    <PageShell maxWidth="md" padding="md" className="pb-20 md:pb-8">
      <PageHeader 
        title="Submit a Room Idea" 
        description="Propose a themed room concept. Add an image and we’ll track interest."
        backLink="/"
        backLabel="Back"
      />

      <PageSection card>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
            {error}
            {lastReqId ? <div className="mt-1 text-xs opacity-80">Request: {lastReqId}</div> : null}
          </div>
        )}

        {submitOk && (
          <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm">
            Room idea submitted successfully.
            {lastReqId ? <div className="mt-1 text-xs opacity-80">Request: {lastReqId}</div> : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-foreground">
              Room name
            </label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Horror Stories, Live Cooking Battles, Indie Artist Spotlight"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2 text-foreground">
              Category/type
            </label>
            <div className="relative">
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label htmlFor="subtitle" className="block text-sm font-medium mb-2 text-foreground">
              Tagline (optional)
            </label>
            <Input
              type="text"
              id="subtitle"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleChange}
              placeholder="Short, catchy one-liner"
            />
          </div>

          {/* Short description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2 text-foreground">
              Short description
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              placeholder="What is the room? What would people do there?"
            />
          </div>

          <div>
            <label htmlFor="why" className="block text-sm font-medium mb-2 text-foreground">
              Why this room matters (optional)
            </label>
            <Textarea
              id="why"
              name="why"
              value={formData.why}
              onChange={handleChange}
              rows={4}
              placeholder="Why is it fun / unique? What’s the format? Who is it for?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Image
            </label>
            <div className="space-y-3">
              {imagePreviewUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-border">
                  <img src={imagePreviewUrl} alt="Selected room cover" className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setImageFile(null)}
                      disabled={submitting}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground">Choose an image (PNG/JPG/WebP, max 5MB)</p>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              size="lg"
            >
              {submitting ? 'Submitting…' : submitOk ? 'Submitted' : 'Submit'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={goBack}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Verification list */}
        {myIdeas.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground mb-2">Your submitted ideas</h3>
            <div className="space-y-3">
              {myIdeas.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border p-3 bg-card">
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.category} · {r.status}
                    </div>
                  </div>
                  <div className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}
