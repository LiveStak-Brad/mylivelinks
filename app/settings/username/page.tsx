'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Check, X, AlertCircle } from 'lucide-react';
import { PageShell, PageHeader, PageSection } from '@/components/layout';
import { Button, Input, Chip } from '@/components/ui';

export default function ChangeUsernamePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [changing, setChanging] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    setUserId(user.id);
    
    // Get current username
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setCurrentUsername(profile.username);
      setNewUsername(profile.username);
    }
  };
  
  const checkAvailability = async (username: string) => {
    if (!username || username === currentUsername) {
      setAvailable(null);
      setError(null);
      setSuggestions([]);
      return;
    }
    
    setChecking(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/profile/change-username?username=${encodeURIComponent(username)}&currentUserId=${userId}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (data.available) {
        setAvailable(true);
        setError(null);
        setSuggestions([]);
      } else {
        setAvailable(false);
        setError(data.error || 'Username not available');
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      setError('Failed to check availability');
      setAvailable(false);
    } finally {
      setChecking(false);
    }
  };
  
  const handleUsernameChange = (value: string) => {
    setNewUsername(value);
    // Debounce check
    const timer = setTimeout(() => checkAvailability(value), 500);
    return () => clearTimeout(timer);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!available || newUsername === currentUsername) return;
    
    setChanging(true);
    setError(null);
    
    try {
      const response = await fetch('/api/profile/change-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to change username');
        return;
      }
      
      alert('Username changed successfully!');
      router.push(`/${data.newUsername}`);
    } catch (err) {
      setError('An error occurred');
    } finally {
      setChanging(false);
    }
  };
  
  return (
    <PageShell maxWidth="md" padding="md">
      <PageHeader 
        title="Change Username"
        description="Choose a new username for your profile"
        backLink="/settings/profile"
        backLabel="Back to Profile Settings"
      />

      <PageSection card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Username */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Current Username</label>
              <Input
                type="text"
                value={currentUsername}
                disabled
              />
            </div>
            
            {/* New Username */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">New Username</label>
              <div className="relative">
                <Input
                  type="text"
                  value={newUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="new_username"
                  pattern="[a-zA-Z0-9_-]+"
                  minLength={3}
                  maxLength={15}
                  required
                  className="pr-10"
                />
                
                {/* Status Icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking && (
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                  {!checking && available === true && newUsername !== currentUsername && (
                    <Check className="text-success" size={20} />
                  )}
                  {!checking && available === false && (
                    <X className="text-destructive" size={20} />
                  )}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Only letters, numbers, underscores, and hyphens. 3-15 characters.
              </p>
              
              {/* Availability Status */}
              {!checking && available === true && newUsername !== currentUsername && (
                <div className="mt-3 flex items-center gap-2 text-success text-sm">
                  <Check size={16} />
                  <span>Username is available!</span>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="mt-3 flex items-start gap-2 text-destructive text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-2">Try these instead:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <Chip
                        key={suggestion}
                        variant="outline"
                        onClick={() => handleUsernameChange(suggestion)}
                      >
                        {suggestion}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* URL Preview */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Your new profile URL will be:</p>
              <p className="font-mono text-primary">
                mylivelinks.com/{newUsername || '...'}
              </p>
            </div>
            
            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={changing || !available || newUsername === currentUsername}
                className="flex-1"
                size="lg"
              >
                {changing ? 'Changing...' : 'Change Username'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/settings/profile')}
              >
                Cancel
              </Button>
            </div>
          </form>
      </PageSection>
        
      {/* Warning */}
      <div className="mt-6 bg-warning/10 border border-warning/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-warning flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Important</h3>
            <p className="text-sm text-muted-foreground">
              Changing your username will update your profile URL. Old links may no longer work. Share your new profile link after changing.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

