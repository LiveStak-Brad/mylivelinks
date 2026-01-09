'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowLeft, CheckCircle, Loader2, Plus, X } from 'lucide-react';

const PLATFORMS = ['TikTok', 'MeetMe', 'Favorited', 'Kick', 'Twitch', 'YouTube', 'Facebook', 'Instagram', 'Other'];
const CATEGORIES = ['Just chatting', 'IRL', 'Music', 'Gaming', 'Comedy', 'Education', 'Other'];
const PROMOTION_METHODS = ['Discord', 'IG posts', 'TikTok posts', 'TikTok live', 'FB groups', 'YouTube', 'Snapchat', 'Text list', 'Email list', 'Other'];

export default function MllProApplyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [mllUsername, setMllUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  
  const [currentlyStreaming, setCurrentlyStreaming] = useState<boolean | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformUsernames, setPlatformUsernames] = useState<Array<{ platform: string; username: string }>>([]);
  const [streamingDuration, setStreamingDuration] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [schedule, setSchedule] = useState('');
  const [avgStreamLength, setAvgStreamLength] = useState('');
  const [avgViewers, setAvgViewers] = useState('');
  const [strengths, setStrengths] = useState('');
  
  const [growthPlan, setGrowthPlan] = useState('');
  const [selectedPromotionMethods, setSelectedPromotionMethods] = useState<string[]>([]);
  const [willShareLink, setWillShareLink] = useState<boolean | null>(null);
  const [communityGoal, setCommunityGoal] = useState('');
  
  const [invitedAlready, setInvitedAlready] = useState<boolean | null>(null);
  const [invitedCount, setInvitedCount] = useState('');
  
  const [fitReason, setFitReason] = useState('');
  const [vodLinks, setVodLinks] = useState<string[]>(['']);
  const [agreesToStandards, setAgreesToStandards] = useState(false);
  
  const [consentTransactional, setConsentTransactional] = useState(false);
  const [consentUpdates, setConsentUpdates] = useState(false);
  const [optOutMarketing, setOptOutMarketing] = useState(false);

  const handlePlatformToggle = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
      setPlatformUsernames(platformUsernames.filter(pu => pu.platform !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
      setPlatformUsernames([...platformUsernames, { platform, username: '' }]);
    }
  };

  const handlePlatformUsernameChange = (platform: string, username: string) => {
    setPlatformUsernames(platformUsernames.map(pu => 
      pu.platform === platform ? { ...pu, username } : pu
    ));
  };

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handlePromotionToggle = (method: string) => {
    if (selectedPromotionMethods.includes(method)) {
      setSelectedPromotionMethods(selectedPromotionMethods.filter(m => m !== method));
    } else {
      setSelectedPromotionMethods([...selectedPromotionMethods, method]);
    }
  };

  const addVodLink = () => {
    setVodLinks([...vodLinks, '']);
  };

  const removeVodLink = (index: number) => {
    setVodLinks(vodLinks.filter((_, i) => i !== index));
  };

  const updateVodLink = (index: number, value: string) => {
    setVodLinks(vodLinks.map((link, i) => i === index ? value : link));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!displayName || !mllUsername || !email || currentlyStreaming === null || !agreesToStandards || !consentTransactional) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/mll-pro/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          mll_username: mllUsername,
          email,
          phone,
          country,
          timezone,
          currently_streaming: currentlyStreaming,
          platforms: platformUsernames.filter(pu => pu.username.trim()),
          streaming_duration: streamingDuration,
          categories: selectedCategories,
          schedule,
          avg_stream_length: avgStreamLength,
          avg_viewers: avgViewers,
          strengths,
          growth_plan: growthPlan,
          promotion_methods: selectedPromotionMethods,
          will_share_link: willShareLink,
          community_goal: communityGoal,
          invited_already: invitedAlready,
          invited_count: invitedCount ? parseInt(invitedCount) : null,
          fit_reason: fitReason,
          vod_links: vodLinks.filter(link => link.trim()),
          agrees_to_standards: agreesToStandards,
          consent_transactional: consentTransactional,
          consent_updates: consentUpdates,
          opt_out_marketing: optOutMarketing,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Application Received!</h1>
          <p className="text-gray-200 text-lg mb-8">
            We'll review your application and reach out by email. Thank you for your interest in MLL PRO!
          </p>
          <Button
            onClick={() => router.push('/')}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <button
          onClick={() => router.push('/mll-pro')}
          className="flex items-center gap-2 text-gray-300 hover:text-white mb-8 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to MLL PRO Info
        </button>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
          <h1 className="text-4xl font-bold text-white mb-2">Apply for MLL PRO</h1>
          <p className="text-gray-300 mb-8">
            Tell us about yourself and your streaming journey. All fields marked with * are required.
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Identity / Contact */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Display Name *
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    MyLiveLinks Username *
                  </label>
                  <Input
                    value={mllUsername}
                    onChange={(e) => setMllUsername(e.target.value)}
                    required
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Phone (optional)
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Country/Region
                    </label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Timezone
                    </label>
                    <Input
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="e.g., EST, PST, GMT+1"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Streaming Background */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Streaming Background</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Do you currently stream? *
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setCurrentlyStreaming(true)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                        currentlyStreaming === true
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentlyStreaming(false)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                        currentlyStreaming === false
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Platforms you stream on
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {PLATFORMS.map(platform => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => handlePlatformToggle(platform)}
                        className={`py-2 px-3 rounded-lg border transition text-sm ${
                          selectedPlatforms.includes(platform)
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>

                  {platformUsernames.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-300 mb-2">Your usernames on these platforms:</p>
                      {platformUsernames.map((pu, index) => (
                        <div key={index} className="flex gap-2">
                          <span className="py-2 px-3 bg-white/5 rounded-lg text-gray-200 text-sm min-w-[100px]">
                            {pu.platform}
                          </span>
                          <Input
                            value={pu.username}
                            onChange={(e) => handlePlatformUsernameChange(pu.platform, e.target.value)}
                            placeholder="Username or link"
                            className="bg-white/5 border-white/20 text-white flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    How long have you been streaming?
                  </label>
                  <select
                    value={streamingDuration}
                    onChange={(e) => setStreamingDuration(e.target.value)}
                    className="w-full py-2 px-3 bg-white/5 border border-white/20 rounded-lg text-white"
                  >
                    <option value="">Select duration</option>
                    <option value="<3mo">Less than 3 months</option>
                    <option value="3-6mo">3-6 months</option>
                    <option value="6-12mo">6-12 months</option>
                    <option value="1-2y">1-2 years</option>
                    <option value="2y+">2+ years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Typical stream categories
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CATEGORIES.map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategoryToggle(category)}
                        className={`py-2 px-3 rounded-lg border transition text-sm ${
                          selectedCategories.includes(category)
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Typical schedule (days + time range)
                  </label>
                  <Input
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="e.g., Mon-Fri 7-10pm EST"
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Average stream length
                    </label>
                    <select
                      value={avgStreamLength}
                      onChange={(e) => setAvgStreamLength(e.target.value)}
                      className="w-full py-2 px-3 bg-white/5 border border-white/20 rounded-lg text-white"
                    >
                      <option value="">Select length</option>
                      <option value="<1h">Less than 1 hour</option>
                      <option value="1-2h">1-2 hours</option>
                      <option value="2-4h">2-4 hours</option>
                      <option value="4h+">4+ hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Average viewers
                    </label>
                    <select
                      value={avgViewers}
                      onChange={(e) => setAvgViewers(e.target.value)}
                      className="w-full py-2 px-3 bg-white/5 border border-white/20 rounded-lg text-white"
                    >
                      <option value="">Select range</option>
                      <option value="<10">Less than 10</option>
                      <option value="10-50">10-50</option>
                      <option value="50-100">50-100</option>
                      <option value="100-500">100-500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Biggest strengths as a streamer
                  </label>
                  <Textarea
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    rows={3}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>
            </section>

            {/* Growth Intent */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Growth Intent</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    How will you bring your community to MyLiveLinks?
                  </label>
                  <Textarea
                    value={growthPlan}
                    onChange={(e) => setGrowthPlan(e.target.value)}
                    rows={4}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    How do you promote your live streams today?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {PROMOTION_METHODS.map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => handlePromotionToggle(method)}
                        className={`py-2 px-3 rounded-lg border transition text-sm ${
                          selectedPromotionMethods.includes(method)
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Are you willing to post/share a MyLiveLinks link when you go live?
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setWillShareLink(true)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                        willShareLink === true
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setWillShareLink(false)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                        willShareLink === false
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    What kind of community do you want to build here?
                  </label>
                  <Textarea
                    value={communityGoal}
                    onChange={(e) => setCommunityGoal(e.target.value)}
                    rows={4}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>
            </section>

            {/* Referral + Participation */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Referral & Participation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Have you invited others to MyLiveLinks already?
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setInvitedAlready(true)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                        invitedAlready === true
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvitedAlready(false)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                        invitedAlready === false
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'bg-white/5 border-white/20 text-gray-300 hover:border-white/40'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {invitedAlready && (
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Approximately how many?
                    </label>
                    <Input
                      type="number"
                      value={invitedCount}
                      onChange={(e) => setInvitedCount(e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Quality / Standards */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Quality & Standards</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Why do you think you're a good fit for MLL PRO?
                  </label>
                  <Textarea
                    value={fitReason}
                    onChange={(e) => setFitReason(e.target.value)}
                    rows={4}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    Any links to clips/VODs we should review? (optional)
                  </label>
                  <div className="space-y-2">
                    {vodLinks.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="url"
                          value={link}
                          onChange={(e) => updateVodLink(index, e.target.value)}
                          placeholder="https://..."
                          className="bg-white/5 border-white/20 text-white flex-1"
                        />
                        {vodLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVodLink(index)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition"
                          >
                            <X className="w-5 h-5 text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addVodLink}
                      className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add another link
                    </button>
                  </div>
                </div>

                <div className="bg-purple-500/20 border border-purple-400/30 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreesToStandards}
                      onChange={(e) => setAgreesToStandards(e.target.checked)}
                      required
                      className="mt-1 w-5 h-5"
                    />
                    <span className="text-white">
                      I agree to uphold community standards *
                    </span>
                  </label>
                </div>
              </div>
            </section>

            {/* Email Consent */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Email Consent</h2>
              <div className="space-y-4 bg-white/5 rounded-lg p-6">
                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentTransactional}
                      onChange={(e) => setConsentTransactional(e.target.checked)}
                      required
                      className="mt-1 w-5 h-5"
                    />
                    <span className="text-white">
                      I agree MyLiveLinks may email me about my MLL PRO application and related updates. *
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentUpdates}
                      onChange={(e) => setConsentUpdates(e.target.checked)}
                      className="mt-1 w-5 h-5"
                    />
                    <span className="text-gray-200">
                      Send me occasional MLL PRO program updates.
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optOutMarketing}
                      onChange={(e) => setOptOutMarketing(e.target.checked)}
                      className="mt-1 w-5 h-5"
                    />
                    <span className="text-gray-200">
                      I want to opt out of MLL PRO emails beyond this application decision.
                    </span>
                  </label>
                </div>

                <p className="text-sm text-gray-400 mt-4">
                  Unsubscribe/opt-out options will be included in every email.
                </p>
              </div>
            </section>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={() => router.push('/mll-pro')}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
