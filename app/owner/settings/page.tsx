'use client';

import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Shield,
  DollarSign,
  Zap,
  Bell,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
} from '@/components/owner/ui-kit';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  settings: Setting[];
}

interface Setting {
  id: string;
  label: string;
  description: string;
  type: 'toggle' | 'input' | 'select' | 'number';
  value: any;
  options?: { label: string; value: string }[];
  disabled?: boolean;
}

export default function SettingsPage() {
  const [hasChanges, setHasChanges] = useState(false);

  // UI-only settings structure (wire-ready)
  const settingSections: SettingSection[] = [
    {
      id: 'platform',
      title: 'Platform Settings',
      description: 'Core platform configuration',
      icon: Globe,
      settings: [
        {
          id: 'platform.name',
          label: 'Platform Name',
          description: 'Display name shown to users',
          type: 'input',
          value: 'MyLiveLinks',
        },
        {
          id: 'platform.maintenanceMode',
          label: 'Maintenance Mode',
          description: 'Disable access for non-admin users',
          type: 'toggle',
          value: false,
        },
        {
          id: 'platform.registrationEnabled',
          label: 'Registration Enabled',
          description: 'Allow new user signups',
          type: 'toggle',
          value: true,
        },
        {
          id: 'platform.adultContentEnabled',
          label: 'Adult Content Allowed',
          description: 'Allow age-gated adult streams',
          type: 'toggle',
          value: true,
        },
      ],
    },
    {
      id: 'moderation',
      title: 'Moderation & Safety',
      description: 'Content moderation controls',
      icon: Shield,
      settings: [
        {
          id: 'moderation.automod',
          label: 'Auto-Moderation',
          description: 'Enable AI-based content filtering',
          type: 'toggle',
          value: false,
          disabled: true,
        },
        {
          id: 'moderation.reportThreshold',
          label: 'Report Threshold',
          description: 'Auto-ban after N reports',
          type: 'number',
          value: 5,
        },
        {
          id: 'moderation.chatFiltering',
          label: 'Chat Filtering',
          description: 'Filter profanity in chat messages',
          type: 'toggle',
          value: true,
        },
      ],
    },
    {
      id: 'monetization',
      title: 'Monetization Settings',
      description: 'Economy and payment configuration',
      icon: DollarSign,
      settings: [
        {
          id: 'monetization.giftingEnabled',
          label: 'Gifting Enabled',
          description: 'Allow users to send gifts',
          type: 'toggle',
          value: true,
        },
        {
          id: 'monetization.payoutsEnabled',
          label: 'Payouts Enabled',
          description: 'Allow creators to cash out diamonds',
          type: 'toggle',
          value: true,
        },
        {
          id: 'monetization.platformTake',
          label: 'Platform Take (%)',
          description: 'Platform revenue share percentage',
          type: 'number',
          value: 30,
        },
        {
          id: 'monetization.minPayoutUsd',
          label: 'Minimum Payout (USD)',
          description: 'Minimum balance to request payout',
          type: 'number',
          value: 50,
        },
      ],
    },
    {
      id: 'live',
      title: 'Live Streaming Limits',
      description: 'Broadcast quality and capacity',
      icon: Zap,
      settings: [
        {
          id: 'live.maxConcurrentStreams',
          label: 'Max Concurrent Streams',
          description: 'Maximum simultaneous live streams',
          type: 'number',
          value: 100,
        },
        {
          id: 'live.maxViewersPerStream',
          label: 'Max Viewers Per Stream',
          description: 'Maximum viewers in a single stream',
          type: 'number',
          value: 1000,
        },
        {
          id: 'live.demandBasedPublishing',
          label: 'Demand-Based Publishing',
          description: 'Only publish when viewers are watching',
          type: 'toggle',
          value: true,
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Admin notification preferences',
      icon: Bell,
      settings: [
        {
          id: 'notifications.newReports',
          label: 'New Reports',
          description: 'Notify on new content reports',
          type: 'toggle',
          value: true,
        },
        {
          id: 'notifications.systemAlerts',
          label: 'System Alerts',
          description: 'Notify on system health issues',
          type: 'toggle',
          value: true,
        },
        {
          id: 'notifications.revenueThreshold',
          label: 'Revenue Milestones',
          description: 'Notify on revenue milestones',
          type: 'toggle',
          value: false,
        },
      ],
    },
  ];

  const renderSetting = (setting: Setting) => {
    switch (setting.type) {
      case 'toggle':
        return (
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex-1">
              <p className="font-medium text-foreground">{setting.label}</p>
              <p className="text-sm text-muted-foreground">{setting.description}</p>
              {setting.disabled && (
                <Badge variant="secondary" className="mt-1">Coming Soon</Badge>
              )}
            </div>
            <input
              type="checkbox"
              checked={setting.value}
              disabled={setting.disabled}
              onChange={() => setHasChanges(true)}
              className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </label>
        );

      case 'input':
        return (
          <div>
            <label className="block mb-1">
              <span className="font-medium text-foreground">{setting.label}</span>
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            </label>
            <input
              type="text"
              value={setting.value}
              disabled={setting.disabled}
              onChange={() => setHasChanges(true)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
            />
          </div>
        );

      case 'number':
        return (
          <div>
            <label className="block mb-1">
              <span className="font-medium text-foreground">{setting.label}</span>
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            </label>
            <input
              type="number"
              value={setting.value}
              disabled={setting.disabled}
              onChange={() => setHasChanges(true)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
            />
          </div>
        );

      case 'select':
        return (
          <div>
            <label className="block mb-1">
              <span className="font-medium text-foreground">{setting.label}</span>
              <p className="text-sm text-muted-foreground">{setting.description}</p>
            </label>
            <select
              value={setting.value}
              disabled={setting.disabled}
              onChange={() => setHasChanges(true)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
            >
              {setting.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure platform settings and preferences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button variant="secondary" onClick={() => setHasChanges(false)} disabled>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
          <Button variant="primary" disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Sections */}
      {settingSections.map((section) => {
        const Icon = section.icon;
        
        return (
          <Card key={section.id}>
            <CardHeader
              title={
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              }
            />
            <CardBody>
              <div className="space-y-6">
                {section.settings.map((setting) => (
                  <div key={setting.id} className="pb-6 border-b border-border last:border-0 last:pb-0">
                    {renderSetting(setting)}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        );
      })}

      {/* Wire Notice */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">Wire-Ready Placeholder</p>
              <p className="text-sm text-muted-foreground">
                All settings are UI-only placeholders. Connect to backend settings table or environment variables to make functional. Consider using a <code className="px-1 py-0.5 bg-muted rounded text-xs">platform_settings</code> table with key-value pairs.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

