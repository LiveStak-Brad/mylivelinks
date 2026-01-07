'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Wand2, RotateCcw, Sparkles, Sun, Contrast, Droplet, Focus } from 'lucide-react';
import { 
  VideoFilterSettings, 
  DEFAULT_FILTER_SETTINGS, 
  loadFilterSettings, 
  saveFilterSettings 
} from '@/hooks/useVideoFilterPipeline';

interface StreamFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (settings: VideoFilterSettings) => void;
  currentSettings?: VideoFilterSettings;
}

interface FilterSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  defaultValue: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

function FilterSlider({ 
  label, 
  icon, 
  value, 
  min, 
  max, 
  step, 
  unit = '', 
  defaultValue,
  onChange,
  formatValue 
}: FilterSliderProps) {
  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;
  const isDefault = value === defaultValue;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDefault 
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' 
              : 'bg-cyan-500/20 text-cyan-500'
          }`}>
            {icon}
          </div>
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {label}
          </span>
        </div>
        <span className={`text-sm font-mono ${
          isDefault 
            ? 'text-gray-500 dark:text-gray-400' 
            : 'text-cyan-500'
        }`}>
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
    </div>
  );
}

export default function StreamFiltersModal({ 
  isOpen, 
  onClose, 
  onApply,
  currentSettings 
}: StreamFiltersModalProps) {
  const [settings, setSettings] = useState<VideoFilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = currentSettings || loadFilterSettings();
      setSettings(saved);
      setHasChanges(false);
    }
  }, [isOpen, currentSettings]);

  const updateSetting = useCallback(<K extends keyof VideoFilterSettings>(
    key: K, 
    value: VideoFilterSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_FILTER_SETTINGS);
    setHasChanges(true);
  }, []);

  const handleApply = useCallback(() => {
    saveFilterSettings(settings);
    onApply?.(settings);
    onClose();
  }, [settings, onApply, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Check if current settings are all default
  const isAllDefault = (
    settings.blur === DEFAULT_FILTER_SETTINGS.blur &&
    settings.smoothing === DEFAULT_FILTER_SETTINGS.smoothing &&
    settings.brightness === DEFAULT_FILTER_SETTINGS.brightness &&
    settings.contrast === DEFAULT_FILTER_SETTINGS.contrast &&
    settings.saturation === DEFAULT_FILTER_SETTINGS.saturation
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Stream Filters</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Beauty Lite</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Beauty Filters Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Beauty Lite
              </h3>
              <button
                onClick={handleReset}
                disabled={isAllDefault}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isAllDefault
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All
              </button>
            </div>

            {/* Smoothing (Beauty Lite) */}
            <FilterSlider
              label="Smoothing"
              icon={<Sparkles className="w-4 h-4" />}
              value={settings.smoothing}
              min={0}
              max={3}
              step={1}
              defaultValue={DEFAULT_FILTER_SETTINGS.smoothing}
              onChange={(v) => updateSetting('smoothing', v)}
              formatValue={(v) => v === 0 ? 'Off' : `Level ${v}`}
            />

            {/* Blur */}
            <FilterSlider
              label="Blur"
              icon={<Focus className="w-4 h-4" />}
              value={settings.blur}
              min={0}
              max={4}
              step={0.5}
              unit="px"
              defaultValue={DEFAULT_FILTER_SETTINGS.blur}
              onChange={(v) => updateSetting('blur', v)}
            />
          </div>

          {/* Adjustments Section */}
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Adjustments
            </h3>

            {/* Brightness */}
            <FilterSlider
              label="Brightness"
              icon={<Sun className="w-4 h-4" />}
              value={settings.brightness}
              min={0.5}
              max={1.5}
              step={0.05}
              defaultValue={DEFAULT_FILTER_SETTINGS.brightness}
              onChange={(v) => updateSetting('brightness', v)}
              formatValue={(v) => {
                const percent = Math.round((v - 1) * 100);
                return percent === 0 ? 'Normal' : `${percent > 0 ? '+' : ''}${percent}%`;
              }}
            />

            {/* Contrast */}
            <FilterSlider
              label="Contrast"
              icon={<Contrast className="w-4 h-4" />}
              value={settings.contrast}
              min={0.5}
              max={1.5}
              step={0.05}
              defaultValue={DEFAULT_FILTER_SETTINGS.contrast}
              onChange={(v) => updateSetting('contrast', v)}
              formatValue={(v) => {
                const percent = Math.round((v - 1) * 100);
                return percent === 0 ? 'Normal' : `${percent > 0 ? '+' : ''}${percent}%`;
              }}
            />

            {/* Saturation */}
            <FilterSlider
              label="Saturation"
              icon={<Droplet className="w-4 h-4" />}
              value={settings.saturation}
              min={0}
              max={2}
              step={0.1}
              defaultValue={DEFAULT_FILTER_SETTINGS.saturation}
              onChange={(v) => updateSetting('saturation', v)}
              formatValue={(v) => {
                if (v === 0) return 'B&W';
                const percent = Math.round((v - 1) * 100);
                return percent === 0 ? 'Normal' : `${percent > 0 ? '+' : ''}${percent}%`;
              }}
            />
          </div>

          {/* Info Note */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              ✨ More filters coming soon.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 mobile-safe-bottom">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
              hasChanges
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-600 hover:to-purple-600 shadow-lg shadow-cyan-500/25'
                : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white opacity-80'
            }`}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
