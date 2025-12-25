'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SmartBrandLogo from '@/components/SmartBrandLogo';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Mock submit - just show success message
    setTimeout(() => {
      alert('Application submitted! We will review your request and get back to you soon.');
      router.push('/');
      setSubmitting(false);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/">
            {typeof SmartBrandLogo !== 'undefined' ? (
              <SmartBrandLogo size={120} className="h-12 sm:h-14 md:h-16 w-auto" iconOnly={false} />
            ) : (
              <div className="h-12 sm:h-14 md:h-16 w-40 bg-gray-300 dark:bg-gray-600 rounded" />
            )}
          </a>
          <button
            type="button"
            onClick={goBack}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
          >
            Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 md:p-8">
          <h1 className="text-3xl font-bold mb-2">Apply for a Room</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Tell us about your streaming room idea and how you plan to grow your audience.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room Name */}
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium mb-2">
                Room Name Idea
              </label>
              <input
                type="text"
                id="roomName"
                name="roomName"
                value={formData.roomName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Gaming Central, Music Live, Art Studio"
              />
            </div>

            {/* Why */}
            <div>
              <label htmlFor="why" className="block text-sm font-medium mb-2">
                Why do you want a room?
              </label>
              <textarea
                id="why"
                name="why"
                value={formData.why}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Tell us about your passion and what makes your content unique..."
              />
            </div>

            {/* Promotion */}
            <div>
              <label htmlFor="promotion" className="block text-sm font-medium mb-2">
                How will you promote your room?
              </label>
              <textarea
                id="promotion"
                name="promotion"
                value={formData.promotion}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe your marketing strategy, social media presence, audience building plans..."
              />
            </div>

            {/* Social Links */}
            <div>
              <label htmlFor="socialLinks" className="block text-sm font-medium mb-2">
                Social Link(s)
              </label>
              <input
                type="text"
                id="socialLinks"
                name="socialLinks"
                value={formData.socialLinks}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Twitter, Instagram, YouTube, TikTok, etc. (separate with commas)"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Optional: Share your social media profiles to help us understand your reach
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <button
                type="button"
                onClick={goBack}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


