'use client';

import { useState } from 'react';
import { Palette, Layout, Type, Link2, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';

interface ProfileCustomizationProps {
  initialSettings: {
    profile_bg_url?: string;
    profile_bg_overlay?: string;
    card_color?: string;
    card_opacity?: number;
    card_border_radius?: string;
    font_preset?: string;
    accent_color?: string;
    links_section_title?: string;
  };
  onSave: (settings: any) => Promise<void>;
}

export default function ProfileCustomization({
  initialSettings,
  onSave
}: ProfileCustomizationProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();
  
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }
    
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Create filename with user ID prefix for RLS
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_bg_${Date.now()}.${fileExt}`;
      
      console.log('Uploading file:', fileName);
      
      // Upload to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });
      
      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(uploadError.message || 'Upload failed');
      }
      
      console.log('Upload successful:', uploadData);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      console.log('Public URL:', publicUrl);
      
      setSettings({ ...settings, profile_bg_url: publicUrl });
      alert('Background image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload background image';
      alert(`Upload failed: ${errorMessage}\n\nMake sure you've run the storage policies SQL migration.`);
    } finally {
      setUploading(false);
    }
  };
  
  const handleRemoveBackground = () => {
    setSettings({ ...settings, profile_bg_url: '' });
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(settings);
      alert('Profile customization saved!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save customization');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Profile Customization</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize how your profile looks to visitors
        </p>
      </div>
      
      {/* Background Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Palette size={20} />
          Background
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Background Image
            </label>
            
            {/* Preview */}
            {settings.profile_bg_url && (
              <div className="relative w-full h-48 mb-3 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                <Image
                  src={settings.profile_bg_url}
                  alt="Background preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveBackground}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition"
                  title="Remove background"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg cursor-pointer transition disabled:opacity-50">
              <Upload size={20} />
              {uploading ? 'Uploading...' : settings.profile_bg_url ? 'Change Background' : 'Upload Background'}
              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            
            <p className="text-xs text-gray-500 mt-2">
              Recommended: 1920x1080px or larger. Max 5MB. JPG, PNG, or WebP.
            </p>
            <p className="text-xs text-gray-500">
              Leave empty for default gradient background
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">
              Background Overlay
            </label>
            <select
              value={settings.profile_bg_overlay || 'dark-medium'}
              onChange={(e) => setSettings({ ...settings, profile_bg_overlay: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value="none">None</option>
              <option value="dark-light">Dark (Light)</option>
              <option value="dark-medium">Dark (Medium)</option>
              <option value="dark-heavy">Dark (Heavy)</option>
              <option value="blur">Blur</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Helps text remain readable over background images
            </p>
          </div>
        </div>
      </div>
      
      {/* Card Styling */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Layout size={20} />
          Card Style
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Card Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.card_color || '#FFFFFF'}
                onChange={(e) => setSettings({ ...settings, card_color: e.target.value })}
                className="w-16 h-10 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.card_color || '#FFFFFF'}
                onChange={(e) => setSettings({ ...settings, card_color: e.target.value })}
                placeholder="#FFFFFF"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">
              Card Opacity: {((settings.card_opacity || 0.95) * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={settings.card_opacity || 0.95}
              onChange={(e) => setSettings({ ...settings, card_opacity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">
              Border Radius
            </label>
            <select
              value={settings.card_border_radius || 'medium'}
              onChange={(e) => setSettings({ ...settings, card_border_radius: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value="small">Small (Subtle)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="large">Large (Rounded)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Typography */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Type size={20} />
          Typography
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Font Preset
            </label>
            <select
              value={settings.font_preset || 'modern'}
              onChange={(e) => setSettings({ ...settings, font_preset: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value="modern">Modern (Sans-serif)</option>
              <option value="classic">Classic (Serif)</option>
              <option value="bold">Bold (Heavy)</option>
              <option value="minimal">Minimal (Light)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.accent_color || '#3B82F6'}
                onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                className="w-16 h-10 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.accent_color || '#3B82F6'}
                onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Used for buttons, links, and highlights
            </p>
          </div>
        </div>
      </div>
      
      {/* Links Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Link2 size={20} />
          Links Section
        </h3>
        
        <div>
          <label className="block text-sm font-semibold mb-2">
            Section Title
          </label>
          <input
            type="text"
            value={settings.links_section_title || 'My Links'}
            onChange={(e) => setSettings({ ...settings, links_section_title: e.target.value })}
            placeholder="My Links"
            maxLength={100}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          />
          <p className="text-xs text-gray-500 mt-1">
            Examples: "My Links", "Follow Me", "My Platforms", "Sponsors"
          </p>
        </div>
      </div>
      
      {/* Preview Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Preview your changes:</strong> Visit your profile page after saving to see how it looks!
        </p>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Customization'}
        </button>
      </div>
    </div>
  );
}

