'use client';

import { useState } from 'react';
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
  const [formData, setFormData] = useState({
    roomName: '',
    why: '',
    promotion: '',
    socialLinks: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to submit an application.');
        return;
      }

      const payload = {
        profile_id: user.id,
        display_name: formData.roomName,
        bio: `Why: ${formData.why}\n\nPromotion: ${formData.promotion}`,
        social_links: formData.socialLinks || null,
        status: 'pending',
      } as any;

      const { error: insertError } = await supabase.from('room_applications').insert(payload);

      if (insertError) {
        throw insertError;
      }

      alert('Application submitted! We will review your request and get back to you soon.');
      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <PageShell maxWidth="md" padding="md">
      <PageHeader 
        title="Apply for a Room" 
        description="Tell us about your streaming room idea and how you plan to grow your audience."
        backLink="/"
        backLabel="Back"
      />

      <PageSection card>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Name */}
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium mb-2 text-foreground">
              Room Name Idea
            </label>
            <Input
              type="text"
              id="roomName"
              name="roomName"
              value={formData.roomName}
              onChange={handleChange}
              required
              placeholder="e.g., Gaming Central, Music Live, Art Studio"
            />
          </div>

          {/* Why */}
          <div>
            <label htmlFor="why" className="block text-sm font-medium mb-2 text-foreground">
              Why do you want a room?
            </label>
            <Textarea
              id="why"
              name="why"
              value={formData.why}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Tell us about your passion and what makes your content unique..."
            />
          </div>

          {/* Promotion */}
          <div>
            <label htmlFor="promotion" className="block text-sm font-medium mb-2 text-foreground">
              How will you promote your room?
            </label>
            <Textarea
              id="promotion"
              name="promotion"
              value={formData.promotion}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Describe your marketing strategy, social media presence, audience building plans..."
            />
          </div>

          {/* Social Links */}
          <div>
            <label htmlFor="socialLinks" className="block text-sm font-medium mb-2 text-foreground">
              Social Link(s)
            </label>
            <Input
              type="text"
              id="socialLinks"
              name="socialLinks"
              value={formData.socialLinks}
              onChange={handleChange}
              placeholder="Twitter, Instagram, YouTube, TikTok, etc. (separate with commas)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Share your social media profiles to help us understand your reach
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              size="lg"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={goBack}
            >
              Cancel
            </Button>
          </div>
        </form>
      </PageSection>
    </PageShell>
  );
}


