'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
}

export default function ChatSettingsModal({ isOpen, onClose, currentUserId }: ChatSettingsModalProps) {
  const [selectedColor, setSelectedColor] = useState('#a855f7'); // Default purple
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [saving, setSaving] = useState(false);

  const fonts = [
    { name: 'Inter', label: 'Inter (Default)', className: 'font-sans' },
    { name: 'Poppins', label: 'Poppins', className: 'font-["Poppins"]' },
    { name: 'Roboto', label: 'Roboto', className: 'font-["Roboto"]' },
    { name: 'Montserrat', label: 'Montserrat', className: 'font-["Montserrat"]' },
    { name: 'Open Sans', label: 'Open Sans', className: 'font-["Open_Sans"]' },
  ];

  // Load saved settings
  useEffect(() => {
    if (!currentUserId || !isOpen) return;

    const loadSettings = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('chat_settings')
        .select('chat_bubble_color, chat_font')
        .eq('profile_id', currentUserId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return;

      if (data) {
        if (data.chat_bubble_color) setSelectedColor(data.chat_bubble_color);
        if (data.chat_font) setSelectedFont(data.chat_font);
      } else {
        await supabase
          .from('chat_settings')
          .upsert(
            {
              profile_id: currentUserId,
              chat_bubble_color: '#a855f7',
              chat_font: 'Inter',
            },
            {
              onConflict: 'profile_id',
            }
          );
      }
    };

    loadSettings();
  }, [currentUserId, isOpen]);

  const handleSave = async () => {
    if (!currentUserId) return;

    setSaving(true);
    const supabase = createClient();
    
    console.log('[ChatSettings] 💾 Saving settings:', {
      profile_id: currentUserId,
      chat_bubble_color: selectedColor,
      chat_font: selectedFont,
    });
    
    const { error, data } = await supabase
      .from('chat_settings')
      .upsert({
        profile_id: currentUserId,
        chat_bubble_color: selectedColor,
        chat_font: selectedFont,
      }, {
        onConflict: 'profile_id',
      })
      .select();

    if (error) {
      console.error('[ChatSettings] ❌ Error saving:', error);
      alert('Failed to save settings: ' + error.message);
    } else {
      console.log('[ChatSettings] ✅ Saved to chat_settings table:', data);
      
      // BROADCAST to all open tabs/windows to reload settings
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('chat-settings-updates');
        channel.postMessage({
          type: 'settings-updated',
          profile_id: currentUserId,
          chat_bubble_color: selectedColor,
          chat_font: selectedFont,
        });
        channel.close();
        console.log('[ChatSettings] 📻 Broadcasted settings update');
      }
    }

    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-top">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chat Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mobile-touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body p-6 space-y-6">
          {/* Color Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Chat Bubble Color
            </label>
            <div className="space-y-3">
              {/* HTML5 Color Picker */}
              <div className="relative">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full h-32 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600"
                />
              </div>
              
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                <div
                  className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: selectedColor }}
                />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Preview</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">{selectedColor}</p>
                </div>
              </div>

              {/* Quick Color Presets */}
              <div className="grid grid-cols-5 gap-2">
                {['#a855f7', '#ec4899', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#06b6d4', '#7c3aed', '#db2777'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-full aspect-square rounded-lg border-2 transition-all ${
                      selectedColor === color
                        ? 'border-white ring-2 ring-purple-500 scale-110'
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {selectedColor === color && (
                      <Check className="w-4 h-4 text-white mx-auto drop-shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Font Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Chat Font
            </label>
            <div className="space-y-2">
              {fonts.map((font) => (
                <button
                  key={font.name}
                  onClick={() => setSelectedFont(font.name)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedFont === font.name
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-base ${font.className}`}>{font.label}</span>
                    {selectedFont === font.name && (
                      <Check className="w-5 h-5 text-purple-500" />
                    )}
                  </div>
                  <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${font.className}`}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-bottom">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

