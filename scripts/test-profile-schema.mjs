// Test script to check which profile columns exist in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfileSchema() {
  console.log('🔍 Testing Profile Schema Columns...\n');

  // Get a test user's profile
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error fetching profile:', error);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No profiles found in database');
    return;
  }

  const profile = profiles[0];
  console.log('✅ Profile columns found:\n');
  
  // Check for key columns
  const expectedColumns = [
    'id',
    'username',
    'display_name',
    'bio',
    'avatar_url',
    'profile_type',
    'enabled_modules',
    'enabled_tabs',
    // Customization
    'profile_bg_url',
    'profile_bg_overlay',
    'card_color',
    'card_opacity',
    'card_border_radius',
    'font_preset',
    'accent_color',
    'links_section_title',
    // Social media
    'social_instagram',
    'social_twitter',
    'social_youtube',
    'social_tiktok',
    'social_facebook',
    'social_twitch',
    'social_discord',
    'social_snapchat',
    'social_linkedin',
    'social_github',
    'social_spotify',
    'social_onlyfans',
    // Display preferences
    'hide_streaming_stats',
    // Top Friends
    'show_top_friends',
    'top_friends_title',
    'top_friends_avatar_style',
    'top_friends_max_count',
  ];

  const actualColumns = Object.keys(profile);
  
  expectedColumns.forEach(col => {
    const exists = col in profile;
    const status = exists ? '✅' : '❌';
    const value = exists ? (profile[col] === null ? 'NULL' : typeof profile[col]) : 'MISSING';
    console.log(`${status} ${col.padEnd(30)} ${value}`);
  });

  console.log('\n📋 All actual columns in profiles table:');
  console.log(actualColumns.join(', '));
}

testProfileSchema().catch(console.error);

