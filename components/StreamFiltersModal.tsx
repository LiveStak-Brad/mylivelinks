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
  onPreview?: (settings: VideoFilterSettings) => void; // For live preview without track replacement
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
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
        <span className={`text-xs font-mono min-w-[50px] text-right ${
          isDefault 
            ? 'text-gray-500 dark:text-gray-400' 
            : 'text-cyan-500'
        }`}>
          {displayValue}
        </span>
      </div>
      {/* Custom slider with visual track */}
      <div className="relative h-5 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
        {/* Filled track */}
        <div 
          className="absolute left-0 h-1.5 rounded-full bg-cyan-500"
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
          className="absolute w-4 h-4 bg-cyan-500 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{ 
            left: `calc(${percentage}% - 8px)`,
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
  onPreview,
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

  // Live preview: update settings immediately (lightweight, no track replacement)
  const updateSetting = useCallback(<K extends keyof VideoFilterSettings>(
    key: K, 
    value: VideoFilterSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    // Use preview callback for live updates (no track replacement)
    if (onPreview) {
      onPreview(newSettings);
    } else {
      // Fallback to onApply if no preview callback
      onApply?.(newSettings);
    }
  }, [settings, onApply, onPreview]);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_FILTER_SETTINGS);
    if (onPreview) {
      onPreview(DEFAULT_FILTER_SETTINGS);
    } else {
      onApply?.(DEFAULT_FILTER_SETTINGS);
    }
  }, [onApply, onPreview]);

  const handleDone = useCallback(() => {
    // Save and do full apply (with track replacement if needed)
    saveFilterSettings(settings);
    onApply?.(settings);
    onClose();
  }, [settings, onApply, onClose]);

  const handleCancel = useCallback(() => {
    // Revert to initial settings
    if (onPreview) {
      onPreview(initialSettings);
    }
    onApply?.(initialSettings);
    onClose();
  }, [initialSettings, onApply, onPreview, onClose]);

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
      {/* Semi-transparent backdrop on top half only - click to close */}
      <div 
        className="fixed inset-x-0 top-0 bottom-1/2 z-40"
        onClick={handleDone}
      />
      
      {/* Bottom sheet - covers bottom half */}
      <div className="fixed inset-x-0 bottom-0 z-50 h-1/2 bg-white dark:bg-gray-800 shadow-2xl rounded-t-2xl flex flex-col overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Filters</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={isAllDefault}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                isAllDefault
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={handleDone}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="px-4 py-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Left column - Beauty */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Beauty
              </h3>
              <FilterSlider
                label="Smoothing"
                icon={<Sparkles className="w-3 h-3" />}
                value={settings.smoothing}
                min={0}
                max={3}
                step={1}
                defaultValue={DEFAULT_FILTER_SETTINGS.smoothing}
                onChange={(v) => updateSetting('smoothing', v)}
                formatValue={(v) => v === 0 ? 'Off' : `${v}`}
              />
              <FilterSlider
                label="Blur"
                icon={<Focus className="w-3 h-3" />}
                value={settings.blur}
                min={0}
                max={4}
                step={0.5}
                unit="px"
                defaultValue={DEFAULT_FILTER_SETTINGS.blur}
                onChange={(v) => updateSetting('blur', v)}
              />
            </div>

            {/* Right column - Adjustments */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Adjust
              </h3>
              <FilterSlider
                label="Brightness"
                icon={<Sun className="w-3 h-3" />}
                value={settings.brightness}
                min={0.5}
                max={1.5}
                step={0.05}
                defaultValue={DEFAULT_FILTER_SETTINGS.brightness}
                onChange={(v) => updateSetting('brightness', v)}
                formatValue={(v) => {
                  const p = Math.round((v - 1) * 100);
                  return p === 0 ? '0' : `${p > 0 ? '+' : ''}${p}`;
                }}
              />
              <FilterSlider
                label="Contrast"
                icon={<Contrast className="w-3 h-3" />}
                value={settings.contrast}
                min={0.5}
                max={1.5}
                step={0.05}
                defaultValue={DEFAULT_FILTER_SETTINGS.contrast}
                onChange={(v) => updateSetting('contrast', v)}
                formatValue={(v) => {
                  const p = Math.round((v - 1) * 100);
                  return p === 0 ? '0' : `${p > 0 ? '+' : ''}${p}`;
                }}
              />
              <FilterSlider
                label="Saturation"
                icon={<Droplet className="w-3 h-3" />}
                value={settings.saturation}
                min={0}
                max={2}
                step={0.1}
                defaultValue={DEFAULT_FILTER_SETTINGS.saturation}
                onChange={(v) => updateSetting('saturation', v)}
                formatValue={(v) => {
                  if (v === 0) return 'B&W';
                  const p = Math.round((v - 1) * 100);
                  return p === 0 ? '0' : `${p > 0 ? '+' : ''}${p}`;
                }}
              />
            </div>
          </div>
          
          {/* Info Note */}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-4">
            ✨ More filters coming soon
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all font-medium text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
