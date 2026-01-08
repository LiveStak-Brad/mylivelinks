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
  const isDefault = Math.abs(value - defaultValue) < 0.001;
  
  // Calculate percentage for track fill
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
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
        <span className={`text-sm font-mono min-w-[60px] text-right ${
          isDefault 
            ? 'text-gray-500 dark:text-gray-400' 
            : 'text-cyan-500'
        }`}>
          {displayValue}
        </span>
      </div>
      {/* Custom slider with visual track */}
      <div className="relative h-6 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
        {/* Filled track */}
        <div 
          className="absolute left-0 h-2 rounded-full bg-cyan-500"
          style={{ width: `${percentage}%` }}
        />
        {/* Invisible range input on top for interaction */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
        />
        {/* Custom thumb */}
        <div 
          className="absolute w-5 h-5 bg-cyan-500 rounded-full border-2 border-white shadow-lg pointer-events-none"
          style={{ 
            left: `calc(${percentage}% - 10px)`,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      </div>
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
  const [initialSettings, setInitialSettings] = useState<VideoFilterSettings>(DEFAULT_FILTER_SETTINGS);

  // Load settings on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = currentSettings || loadFilterSettings();
      setSettings(saved);
      setInitialSettings(saved);
    }
  }, [isOpen, currentSettings]);

  // Live preview: apply changes immediately as user adjusts sliders
  const updateSetting = useCallback(<K extends keyof VideoFilterSettings>(
    key: K, 
    value: VideoFilterSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    // Apply immediately for live preview
    onApply?.(newSettings);
  }, [settings, onApply]);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_FILTER_SETTINGS);
    onApply?.(DEFAULT_FILTER_SETTINGS);
  }, [onApply]);

  const handleDone = useCallback(() => {
    // Save and apply final state, then close
    saveFilterSettings(settings);
    onApply?.(settings);
    onClose();
  }, [settings, onApply, onClose]);

  const handleCancel = useCallback(() => {
    // Revert to initial settings
    onApply?.(initialSettings);
    onClose();
  }, [initialSettings, onApply, onClose]);

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
    <>
      {/* Semi-transparent backdrop - click to close */}
      <div 
        className="fixed inset-0 z-40 bg-black/30"
        onClick={handleDone}
      />
      
      {/* Side panel - positioned on the right, half screen */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Filters</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Live Preview</p>
            </div>
          </div>
          <button
            onClick={handleDone}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Reset button */}
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              disabled={isAllDefault}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                isAllDefault
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All
            </button>
          </div>

          {/* Beauty Filters Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Beauty
            </h3>

            {/* Smoothing (Beauty Lite) */}
            <FilterSlider
              label="Smoothing"
              icon={<Sparkles className="w-3.5 h-3.5" />}
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
              icon={<Focus className="w-3.5 h-3.5" />}
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
          <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Adjustments
            </h3>

            {/* Brightness */}
            <FilterSlider
              label="Brightness"
              icon={<Sun className="w-3.5 h-3.5" />}
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
              icon={<Contrast className="w-3.5 h-3.5" />}
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
              icon={<Droplet className="w-3.5 h-3.5" />}
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
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5 mt-3">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
              ✨ More filters coming soon.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all font-medium text-sm shadow-lg shadow-cyan-500/25"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
