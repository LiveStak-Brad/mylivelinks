'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Shield, Calendar, AlertTriangle } from 'lucide-react';

/**
 * Age Verification Modal
 * 
 * Required for all users to set their date of birth.
 * Critical for adult content compliance.
 * Cannot be dismissed without setting DOB.
 */
export default function AgeVerificationModal() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();
  
  useEffect(() => {
    checkAgeVerification();
  }, []);
  
  const checkAgeVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Check if user has date_of_birth set
      const { data: profile } = await supabase
        .from('profiles')
        .select('date_of_birth')
        .eq('id', user.id)
        .single();
      
      if (!profile?.date_of_birth) {
        setShow(true);
      }
    } catch (error) {
      console.error('Age verification check error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!dateOfBirth) {
      setError('Please enter your date of birth');
      return;
    }
    
    // Validate date format
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      setError('Invalid date format');
      return;
    }
    
    // Check if date is in the future
    if (dobDate > new Date()) {
      setError('Date of birth cannot be in the future');
      return;
    }
    
    // Check if user is too young (< 13, minimum age for most platforms)
    const age = Math.floor((new Date().getTime() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 13) {
      setError('You must be at least 13 years old to use this platform');
      return;
    }
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Not authenticated');
        return;
      }
      
      // Update date_of_birth
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          date_of_birth: dateOfBirth,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('DOB update error:', updateError);
        setError('Failed to save date of birth');
        return;
      }
      
      // Success - close modal
      setShow(false);
    } catch (error) {
      console.error('Submit error:', error);
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading || !show) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Age Verification Required</h2>
              <p className="text-blue-100 text-sm">Help us keep our community safe</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertTriangle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="font-semibold mb-1">Why do we need this?</p>
              <p>
                To comply with safety regulations and protect minors, we require all users to verify their age.
                Your date of birth is stored securely and used only for age verification.
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">
              <Calendar size={16} className="inline mr-2" />
              Date of Birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              You must be at least 13 years old to use this platform.
            </p>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              type="submit"
              disabled={saving || !dateOfBirth}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Verifying...' : 'Verify Age'}
            </button>
            
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              By continuing, you confirm that the information provided is accurate.
            </p>
          </div>
        </form>
        
        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              🔒 Your date of birth is stored securely and never shared publicly.
              It's used only for age verification and compliance purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

