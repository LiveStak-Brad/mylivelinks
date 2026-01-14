'use client';

import { useState } from 'react';
import { Settings, Save, Globe, Lock, Bell, Palette } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Input, Textarea } from '@/components/ui';

export default function SettingsPage() {
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [defaultVisibility, setDefaultVisibility] = useState<'public' | 'private'>('private');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your Creator Studio preferences
        </p>
      </div>

      {/* Channel Settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Channel Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Channel Name
              </label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Your channel name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Channel Description
              </label>
              <Textarea
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                placeholder="Describe your channel..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Upload Settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Default Upload Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Default Visibility
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setDefaultVisibility('public')}
                  className={`
                    flex-1 p-4 rounded-xl border-2 transition-all
                    ${defaultVisibility === 'public'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <Globe className="w-5 h-5 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-foreground">Public</p>
                  <p className="text-xs text-muted-foreground">Anyone can view</p>
                </button>
                <button
                  onClick={() => setDefaultVisibility('private')}
                  className={`
                    flex-1 p-4 rounded-xl border-2 transition-all
                    ${defaultVisibility === 'private'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <Lock className="w-5 h-5 text-amber-500 mb-2" />
                  <p className="text-sm font-medium text-foreground">Private</p>
                  <p className="text-xs text-muted-foreground">Only you can view</p>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-foreground">Upload complete notifications</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
            <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-foreground">New comment notifications</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
            <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-foreground">Weekly analytics summary</span>
              <input type="checkbox" className="rounded" />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={!isSaving ? <Save className="w-4 h-4" /> : undefined}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
