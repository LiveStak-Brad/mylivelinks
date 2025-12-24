'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Check, X, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/settings/profile" className="text-blue-500 hover:text-blue-600 mb-4 inline-block">
            ← Back to Profile Settings
          </Link>
          <h1 className="text-3xl font-bold mb-2">Change Username</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a new username for your profile
          </p>
        </div>
        
        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Username */}
            <div>
              <label className="block text-sm font-medium mb-2">Current Username</label>
              <input
                type="text"
                value={currentUsername}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500"
              />
            </div>
            
            {/* New Username */}
            <div>
              <label className="block text-sm font-medium mb-2">New Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pr-10"
                  placeholder="new_username"
                  pattern="[a-zA-Z0-9_-]+"
                  minLength={3}
                  maxLength={50}
                  required
                />
                
                {/* Status Icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking && (
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  )}
                  {!checking && available === true && newUsername !== currentUsername && (
                    <Check className="text-green-500" size={20} />
                  )}
                  {!checking && available === false && (
                    <X className="text-red-500" size={20} />
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Only letters, numbers, underscores, and hyphens. 3-50 characters.
              </p>
              
              {/* Availability Status */}
              {!checking && available === true && newUsername !== currentUsername && (
                <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <Check size={16} />
                  <span>Username is available!</span>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="mt-3 flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Try these instead:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleUsernameChange(suggestion)}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/40 transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* URL Preview */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your new profile URL will be:</p>
              <p className="font-mono text-blue-600 dark:text-blue-400">
                mylivelinks.com/{newUsername || '...'}
              </p>
            </div>
            
            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={changing || !available || newUsername === currentUsername}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changing ? 'Changing...' : 'Change Username'}
              </button>
              <Link
                href="/settings/profile"
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
        
        {/* Warning */}
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Important</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Changing your username will update your profile URL. Old links may no longer work. Share your new profile link after changing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

