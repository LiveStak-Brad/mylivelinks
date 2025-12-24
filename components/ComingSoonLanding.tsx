'use client';

import { useEffect, useState } from 'react';
import LiveRoom from '@/components/LiveRoom';
import { createClient } from '@/lib/supabase';

export default function ComingSoonLanding() {
  const [mounted, setMounted] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    try {
      const supabase = createClient();
      
      // Save email to waitlist
      const { error } = await supabase
        .from('waitlist_emails')
        .insert({
          email: email.toLowerCase().trim(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          referrer: typeof document !== 'undefined' ? document.referrer : null,
        });
      
      if (error) {
        // Check if it's a duplicate email error
        if (error.code === '23505') {
          alert('This email is already on the waitlist! We\'ll notify you when we launch.');
        } else {
          console.error('Error saving email:', error);
          alert('Oops! Something went wrong. Please try again.');
          return;
        }
      }
      
      console.log('Email successfully saved:', email);
      setEmailSubmitted(true);
      
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSubmitted(false);
        setEmail('');
      }, 2000);
    } catch (err) {
      console.error('Error submitting email:', err);
      alert('Oops! Something went wrong. Please try again.');
    }
  };

  const features = [
    {
      icon: '📺',
      title: 'Dynamic Grid Layout',
      description: 'Live streams appear in an interactive grid. Drag and drop to rearrange boxes, or click to add your favorite streamers.'
    },
    {
      icon: '🎯',
      title: 'Smart Auto-Fill',
      description: 'Empty boxes automatically fill with top streamers when they go live. Never miss the action!'
    },
    {
      icon: '🔊',
      title: 'Individual Audio Control',
      description: 'Control the volume for each streamer independently. Mute, unmute, or listen to multiple streams at once.'
    },
    {
      icon: '🎁',
      title: 'Gift & Support Creators',
      description: 'Send animated gifts to your favorite streamers. Watch gift animations appear in real-time for everyone viewing!'
    },
    {
      icon: '💬',
      title: 'Global Live Chat',
      description: 'Chat with everyone in the room. See gift notifications, reactions, and connect with the community.'
    },
    {
      icon: '🏆',
      title: 'Leaderboards & Rankings',
      description: 'Track top streamers and top gifters. Daily, weekly, and all-time rankings keep the competition exciting.'
    },
    {
      icon: '👥',
      title: 'See Who\'s Watching',
      description: 'View everyone in the live room. Follow your favorite creators and build your community.'
    },
    {
      icon: '🎨',
      title: 'Personalized Experience',
      description: 'Close boxes, randomize the grid, or manually select who you want to watch. Your room, your rules.'
    }
  ];

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-auto">
      {/* Blurred Live Room Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 blur-md scale-105 opacity-40">
          <LiveRoom />
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo/Brand */}
            <div className="mb-8">
              <h1 className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
                MyLiveLinks
              </h1>
              <div className="flex items-center justify-center gap-3 text-2xl md:text-3xl font-semibold text-white/90">
                <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
                <span>Coming Soon</span>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
              The next generation of <span className="text-blue-400 font-semibold">live streaming</span>.
              <br />
              Watch multiple creators at once in a dynamic, interactive grid.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button 
                onClick={() => setShowEmailModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50"
              >
                Notify Me at Launch
              </button>
              <button 
                onClick={scrollToFeatures}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                Learn More
              </button>
            </div>

            {/* Scroll Indicator */}
            <button 
              onClick={scrollToFeatures}
              className="animate-bounce mt-16 cursor-pointer hover:text-white/80 transition"
            >
              <svg className="w-6 h-6 mx-auto text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <p className="text-white/60 text-sm mt-2">Scroll to explore features</p>
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div id="features-section" className="bg-gradient-to-b from-black/90 to-black py-20 px-4 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
              Revolutionary Features
            </h2>
            <p className="text-xl text-white/70 text-center mb-16 max-w-3xl mx-auto">
              Experience live streaming like never before with our innovative platform designed for creators and viewers.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all hover:transform hover:scale-105"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-20">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/30 rounded-xl p-8">
                <div className="text-5xl font-bold text-blue-400 mb-2">12</div>
                <div className="text-white/80 text-lg">Streams at Once</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8">
                <div className="text-5xl font-bold text-purple-400 mb-2">Real-Time</div>
                <div className="text-white/80 text-lg">Gift Animations</div>
              </div>
              <div className="bg-gradient-to-br from-pink-500/20 to-orange-500/20 backdrop-blur-sm border border-pink-500/30 rounded-xl p-8">
                <div className="text-5xl font-bold text-pink-400 mb-2">∞</div>
                <div className="text-white/80 text-lg">Possibilities</div>
              </div>
            </div>

            {/* Final CTA */}
            <div className="text-center">
              <h3 className="text-3xl font-bold text-white mb-4">
                Be Part of the Revolution
              </h3>
              <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
                Join the waitlist and be among the first to experience the future of live streaming.
              </p>
              <button 
                onClick={() => setShowEmailModal(true)}
                className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-2xl shadow-purple-500/50"
              >
                Get Early Access
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black py-8 px-4 border-t border-white/10">
          <div className="max-w-7xl mx-auto text-center text-white/50">
            <p>© 2024 MyLiveLinks. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* Email Collection Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            {!emailSubmitted ? (
              <>
                <h3 className="text-3xl font-bold text-white mb-2">Join the Waitlist</h3>
                <p className="text-white/70 mb-6">
                  Be the first to know when we launch! We'll send you an email with exclusive early access.
                </p>
                <form onSubmit={handleEmailSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 mb-4 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                    required
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                    >
                      Notify Me
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(false)}
                      className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                <p className="text-white/70">
                  We'll email you when we launch. Get ready for something amazing!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

