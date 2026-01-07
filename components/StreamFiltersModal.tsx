'use client';

import { useState } from 'react';
import { X, Sparkles, Check, Wand2, Sun, Contrast, Focus } from 'lucide-react';

interface StreamFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FilterOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
  comingSoon?: boolean;
}

export default function StreamFiltersModal({ isOpen, onClose }: StreamFiltersModalProps) {
  const [filters, setFilters] = useState<FilterOption[]>([
    {
      id: 'beauty',
      name: 'Beauty Mode',
      icon: <Sparkles className="w-5 h-5" />,
      description: 'Smooth skin and enhance features',
      enabled: false,
      comingSoon: true,
    },
    {
      id: 'background_blur',
      name: 'Background Blur',
      icon: <Focus className="w-5 h-5" />,
      description: 'Blur your background for privacy',
      enabled: false,
      comingSoon: true,
    },
    {
      id: 'brightness',
      name: 'Auto Brightness',
      icon: <Sun className="w-5 h-5" />,
      description: 'Automatically adjust lighting',
      enabled: false,
      comingSoon: true,
    },
    {
      id: 'contrast',
      name: 'Enhanced Contrast',
      icon: <Contrast className="w-5 h-5" />,
      description: 'Boost colors and contrast',
      enabled: false,
      comingSoon: true,
    },
  ]);

  const toggleFilter = (filterId: string) => {
    setFilters(prev => prev.map(f => 
      f.id === filterId ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const handleSave = () => {
    // Save filter settings (placeholder - filters not yet implemented)
    console.log('[StreamFilters] Saving filters:', filters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-cyan-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stream Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mobile-touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enhance your stream with real-time video filters and effects.
          </p>

          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => !filter.comingSoon && toggleFilter(filter.id)}
              disabled={filter.comingSoon}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                filter.comingSoon
                  ? 'border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                  : filter.enabled
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700'
              }`}
            >
              {filter.comingSoon && (
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full">
                  Coming Soon
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  filter.enabled 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {filter.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {filter.name}
                    </span>
                    {filter.enabled && !filter.comingSoon && (
                      <Check className="w-4 h-4 text-cyan-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {filter.description}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {/* Info Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Video filters require additional processing and may impact performance on older devices.
            </p>
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
            className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
