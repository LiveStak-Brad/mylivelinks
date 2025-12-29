#!/usr/bin/env node
/**
 * VERIFY MIGRATIONS APPLIED
 * Check if follower_count fix and posts table exist
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const BRAD_USER_ID = '2b4a1178-3c39-4179-94ea-314dd824a818';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('🔍 VERIFYING MIGRATIONS APPLIED\n');
  console.log('=' .repeat(80));
  console.log(`Database: ${supabaseUrl}`);
  console.log('=' .repeat(80));
  console.log();

  // 1. Check if posts table exists
  console.log('✓ CHECK 1: Posts Table Exists');
  console.log('-'.repeat(80));
  const { data: tables, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'posts')
    .single();
  
  if (tableError) {
    console.log('❌ Posts table NOT found:', tableError.message);
  } else if (tables) {
    console.log('✅ Posts table EXISTS');
  }
  console.log();

  // 2. Check follower_count for Brad
  console.log('✓ CHECK 2: Follower Count Data-Truth');
  console.log('-'.repeat(80));
  
  // Get cached count
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, follower_count')
    .eq('id', BRAD_USER_ID)
    .single();
  
  // Get actual count
  const { count: actualCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('followee_id', BRAD_USER_ID);
  
  const cachedCount = profile?.follower_count || 0;
  
  console.log(`Username: ${profile?.username || 'unknown'}`);
  console.log(`Cached (profiles.follower_count): ${cachedCount}`);
  console.log(`Actual (COUNT from follows):       ${actualCount || 0}`);
  
  if (cachedCount === actualCount) {
    console.log('✅ CACHE IN SYNC - Data-truth verified!');
  } else {
    console.log(`❌ CACHE MISMATCH - Difference: ${(actualCount || 0) - cachedCount}`);
    console.log('⚠️  Migration may not have been applied or trigger not working');
  }
  console.log();

  // 3. Check if trigger exists
  console.log('✓ CHECK 3: Follower Count Trigger');
  console.log('-'.repeat(80));
  const { data: triggers } = await supabase
    .from('information_schema.triggers')
    .select('trigger_name')
    .eq('trigger_schema', 'public')
    .eq('event_object_table', 'follows')
    .eq('trigger_name', 'sync_follower_count');
  
  if (triggers && triggers.length > 0) {
    console.log('✅ Trigger "sync_follower_count" EXISTS on follows table');
  } else {
    console.log('❌ Trigger "sync_follower_count" NOT FOUND');
  }
  console.log();

  // 4. Check if posts trigger exists
  console.log('✓ CHECK 4: Referral Activation Trigger');
  console.log('-'.repeat(80));
  const { data: postsTriggers } = await supabase
    .from('information_schema.triggers')
    .select('trigger_name')
    .eq('trigger_schema', 'public')
    .eq('event_object_table', 'posts')
    .eq('trigger_name', 'trg_posts_first_post_activity');
  
  if (postsTriggers && postsTriggers.length > 0) {
    console.log('✅ Trigger "trg_posts_first_post_activity" EXISTS on posts table');
  } else {
    console.log('❌ Trigger "trg_posts_first_post_activity" NOT FOUND');
  }
  console.log();

  // 5. Check post count
  console.log('✓ CHECK 5: Posts Count');
  console.log('-'.repeat(80));
  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total posts in database: ${postCount || 0}`);
  console.log();

  // Summary
  console.log('=' .repeat(80));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('=' .repeat(80));
  console.log(`✓ Posts table:           ${tables ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`✓ Follower count sync:   ${cachedCount === actualCount ? '✅ IN SYNC' : '❌ OUT OF SYNC'}`);
  console.log(`✓ Follower trigger:      ${triggers?.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`✓ Referral trigger:      ${postsTriggers?.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`✓ Posts count:           ${postCount || 0}`);
  console.log('=' .repeat(80));
  
  if (cachedCount !== actualCount) {
    console.log('\n⚠️  ACTION REQUIRED: Run follower count migration manually');
  }
}

verify().catch(console.error);

