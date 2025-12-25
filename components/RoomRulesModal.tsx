'use client';

import { X, Shield, AlertCircle, Heart, MessageSquare, Users, Camera } from 'lucide-react';

interface RoomRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RULES = [
  {
    icon: Shield,
    title: 'Be Respectful',
    description: 'Treat everyone with respect. Harassment, hate speech, and bullying are not tolerated.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: Users,
    title: 'Age Requirement',
    description: 'All users and streamers must be 18+ years old. No exceptions.',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    icon: Camera,
    title: 'Content Guidelines',
    description: 'Follow content guidelines for your room type. Adult content only in 18+ verified rooms.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: MessageSquare,
    title: 'Chat Etiquette',
    description: 'No spam, excessive caps, or disruptive behavior in chat. Keep it positive!',
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    icon: Heart,
    title: 'Support Streamers',
    description: 'Tipping is appreciated but never required. Be generous when you can!',
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  {
    icon: AlertCircle,
    title: 'Report Issues',
    description: 'Report any violations using the Report button. Our moderators are here to help.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
];

export default function RoomRulesModal({ isOpen, onClose }: RoomRulesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Room Rules
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            To keep MyLiveLinks fun and safe for everyone, please follow these community guidelines:
          </p>

          {RULES.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div className={`w-10 h-10 rounded-full ${rule.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${rule.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {rule.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {rule.description}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ <strong>Violations may result in:</strong> Chat mute, temporary timeout, or permanent ban from the platform.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

