'use client';

import { useState } from 'react';
import { X, HelpCircle, ChevronDown, ChevronUp, Coins, Gem, Video, Gift, Shield, User } from 'lucide-react';

interface HelpFAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQ_SECTIONS = [
  {
    category: 'Getting Started',
    icon: User,
    color: 'text-blue-500',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" on the login page. You can register with email, Google, or Apple. You\'ll need to verify your email to access all features.',
      },
      {
        q: 'How do I set up my profile?',
        a: 'Go to Options → Edit Profile. Add your display name, bio, avatar, and social media links. A complete profile helps you connect with others!',
      },
      {
        q: 'How do I go live?',
        a: 'Click the "Go Live" button in the top navigation. Make sure to allow camera and microphone access when prompted. Your stream will appear in the grid!',
      },
    ],
  },
  {
    category: 'Coins & Diamonds',
    icon: Coins,
    color: 'text-yellow-500',
    questions: [
      {
        q: 'What are Coins?',
        a: 'Coins are the currency you use to send gifts to streamers. Purchase coins in the wallet section using real money.',
      },
      {
        q: 'What are Diamonds?',
        a: 'Diamonds are what streamers earn when they receive gifts. 100 diamonds = $1 USD. You can cash out diamonds once you reach the minimum threshold.',
      },
      {
        q: 'How do gift conversions work?',
        a: 'When you send a gift, the streamer receives diamonds 1:1 with the coins you spent.',
      },
      {
        q: 'How do I cash out my diamonds?',
        a: 'Go to Wallet → Cash Out. You\'ll need to set up Stripe Connect first. Minimum cashout is 10,000 diamonds ($100).',
      },
    ],
  },
  {
    category: 'Sending Gifts',
    icon: Gift,
    color: 'text-pink-500',
    questions: [
      {
        q: 'How do I send a gift?',
        a: 'Click on a streamer\'s tile in the grid, then click the gift icon. Select a gift and click Send. The streamer will see an animation!',
      },
      {
        q: 'Can I get a refund on gifts?',
        a: 'Gifts are final once sent and cannot be refunded. Make sure you\'re sending to the right streamer!',
      },
    ],
  },
  {
    category: 'Streaming',
    icon: Video,
    color: 'text-red-500',
    questions: [
      {
        q: 'What equipment do I need to stream?',
        a: 'A webcam and microphone are required. Most laptops have these built in. For best quality, use a dedicated webcam and good lighting.',
      },
      {
        q: 'Why is my video not showing?',
        a: 'Check that you\'ve granted camera permissions in your browser. Try refreshing the page or using a different browser. Make sure no other app is using your camera.',
      },
      {
        q: 'How do I apply for a room?',
        a: 'Go to Options → Apply for a Room. Fill out the application with your details. Our team will review and approve verified streamers.',
      },
    ],
  },
  {
    category: 'Safety & Privacy',
    icon: Shield,
    color: 'text-green-500',
    questions: [
      {
        q: 'How do I block someone?',
        a: 'Click on their profile and select "Block User". You won\'t see their chat messages or streams, and they won\'t see yours.',
      },
      {
        q: 'How do I report a user?',
        a: 'Go to Options → Report a User, or click Report on their profile. Our moderation team reviews all reports.',
      },
      {
        q: 'Is my data safe?',
        a: 'We use industry-standard encryption and never share your personal data. Payment processing is handled securely by Stripe.',
      },
    ],
  },
];

export default function HelpFAQModal({ isOpen, onClose }: HelpFAQModalProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Getting Started');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-green-500" />
            Help & FAQ
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {FAQ_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedCategory === section.category;

            return (
              <div key={section.category} className="mb-3">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : section.category)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${section.color}`} />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {section.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {section.questions.length} questions
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-2 pl-4">
                    {section.questions.map((qa, index) => {
                      const key = `${section.category}-${index}`;
                      const isQExpanded = expandedQuestion === key;

                      return (
                        <div
                          key={key}
                          className="border-l-2 border-gray-200 dark:border-gray-600 pl-4"
                        >
                          <button
                            onClick={() => setExpandedQuestion(isQExpanded ? null : key)}
                            className="w-full flex items-center justify-between py-2 text-left"
                          >
                            <span className="font-medium text-gray-800 dark:text-gray-200 pr-4">
                              {qa.q}
                            </span>
                            {isQExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                          </button>
                          {isQExpanded && (
                            <p className="pb-3 text-sm text-gray-600 dark:text-gray-400">
                              {qa.a}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Still need help? Contact us at{' '}
            <a href="mailto:support@mylivelinks.com" className="text-blue-500 hover:underline">
              support@mylivelinks.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

