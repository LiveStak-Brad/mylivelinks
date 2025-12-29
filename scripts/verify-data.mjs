#!/usr/bin/env node
/**
 * Data Truth Verification Script
 * Connects to Supabase and verifies referrals + stats match reality
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const BRAD_USER_ID = '2b4a1178-3c39-4179-94ea-314dd824a818';
const BRAD_EMAIL = 'wcba.mo@gmail.com';

async function main() {
  console.log('🔍 DATA-TRUTH VERIFICATION STARTING...\n');
  console.log('=' .repeat(80));
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('✅ Connected to Supabase\n');
  console.log('Target User: Brad (wcba.mo@gmail.com)');
  console.log('User ID:', BRAD_USER_ID);
  console.log('=' .repeat(80));
  console.log();
  
  // 1. VERIFY BRAD'S PROFILE EXISTS
  console.log('📊 QUERY 1: Brad\'s Profile\n');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', BRAD_USER_ID)
    .single();
  
  if (profileError) {
    console.error('❌ Error fetching profile:', profileError);
  } else if (profile) {
    console.log('✅ Profile Found:');
    console.log(JSON.stringify(profile, null, 2));
  } else {
    console.log('⚠️  No profile found');
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // 2. CHECK REFERRALS (new schema)
  console.log('📊 QUERY 2: Referrals (attributed to Brad)\n');
  const { data: referrals, error: referralsError, count: referralCount } = await supabase
    .from('referrals')
    .select('*, profiles!referred_profile_id(username, email)', { count: 'exact' })
    .eq('referrer_profile_id', BRAD_USER_ID)
    .order('claimed_at', { ascending: false });
  
  if (referralsError) {
    console.error('❌ Error fetching referrals:', referralsError);
  } else {
    console.log(`✅ Total Referrals: ${referralCount || 0}`);
    const activatedCount = referrals?.filter(r => r.activated_at).length || 0;
    console.log(`   Activated: ${activatedCount}`);
    if (referrals && referrals.length > 0) {
      console.log('Recent Referrals:');
      referrals.slice(0, 5).forEach(r => {
        console.log(`  - ${r.profiles?.username || 'unknown'} (${r.activated_at ? '✅ activated' : '⏳ pending'})`);
      });
    } else {
      console.log('⚠️  No referrals found');
    }
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // 3. CHECK POSTS
  console.log('📊 QUERY 3: Posts by Brad\n');
  const { data: posts, error: postsError, count: postCount } = await supabase
    .from('posts')
    .select('id, text_content, media_url, visibility, created_at', { count: 'exact' })
    .eq('author_id', BRAD_USER_ID)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (postsError) {
    console.error('❌ Error fetching posts:', postsError);
    console.log('Note: posts table may not exist yet');
  } else {
    console.log(`✅ Total Posts: ${postCount || 0}`);
    if (posts && posts.length > 0) {
      console.log('Recent Posts:');
      posts.forEach(p => {
        const preview = p.text_content?.substring(0, 50) || '[media only]';
        console.log(`  - ${p.created_at}: ${preview}`);
      });
    } else {
      console.log('⚠️  No posts found');
    }
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // 4. CHECK GIFTS SENT
  console.log('📊 QUERY 4: Gifts Sent by Brad\n');
  const { data: giftsSent, error: giftsSentError } = await supabase
    .from('gifts')
    .select('id, recipient_id, coin_amount, sent_at, profiles!recipient_id(username)')
    .eq('sender_id', BRAD_USER_ID)
    .order('sent_at', { ascending: false })
    .limit(10);
  
  if (giftsSentError) {
    console.error('❌ Error fetching gifts sent:', giftsSentError);
  } else {
    console.log(`✅ Recent Gifts Sent: ${giftsSent?.length || 0}`);
    if (giftsSent && giftsSent.length > 0) {
      const totalCoins = giftsSent.reduce((sum, g) => sum + (g.coin_amount || 0), 0);
      console.log(`Total Coins Spent: ${totalCoins}`);
      console.log('Gifts:');
      console.log(JSON.stringify(giftsSent, null, 2));
    } else {
      console.log('⚠️  No gifts sent');
    }
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // 5. CHECK GIFTS RECEIVED
  console.log('📊 QUERY 5: Gifts Received by Brad\n');
  const { data: giftsReceived, error: giftsReceivedError } = await supabase
    .from('gifts')
    .select('id, sender_id, coin_amount, sent_at, profiles!sender_id(username)')
    .eq('recipient_id', BRAD_USER_ID)
    .order('sent_at', { ascending: false })
    .limit(10);
  
  if (giftsReceivedError) {
    console.error('❌ Error fetching gifts received:', giftsReceivedError);
  } else {
    console.log(`✅ Recent Gifts Received: ${giftsReceived?.length || 0}`);
    if (giftsReceived && giftsReceived.length > 0) {
      const totalDiamonds = giftsReceived.reduce((sum, g) => sum + (g.coin_amount || 0), 0);
      console.log(`Total Diamonds Earned: ${totalDiamonds}`);
      console.log('Gifts:');
      console.log(JSON.stringify(giftsReceived, null, 2));
    } else {
      console.log('⚠️  No gifts received');
    }
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // 6. CHECK FOLLOWERS (CRITICAL DATA-TRUTH CHECK)
  console.log('📊 QUERY 6: Followers - Cache vs Actual\n');
  const { count: followerCount, error: followersError } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('followee_id', BRAD_USER_ID);
  
  if (followersError) {
    console.error('❌ Error counting followers:', followersError);
  } else {
    const cachedCount = profile?.follower_count || 0;
    const actualCount = followerCount || 0;
    console.log(`Cached (profiles.follower_count): ${cachedCount}`);
    console.log(`Actual (COUNT from follows):       ${actualCount}`);
    if (cachedCount === actualCount) {
      console.log('✅ CACHE IN SYNC');
    } else {
      console.log(`❌ CACHE MISMATCH! Difference: ${actualCount - cachedCount}`);
    }
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // 7. CHECK FOLLOWING
  console.log('📊 QUERY 7: Following\n');
  const { count: followingCount, error: followingError } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', BRAD_USER_ID);
  
  if (followingError) {
    console.error('❌ Error counting following:', followingError);
  } else {
    console.log(`✅ Total Following: ${followingCount || 0}`);
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // 8. CALL ANALYTICS API
  console.log('📊 QUERY 8: Analytics API Response\n');
  try {
    const apiUrl = `${supabaseUrl.replace('.supabase.co', '')}/api/user-analytics?profileId=${BRAD_USER_ID}&range=all`;
    console.log('Note: Cannot call Next.js API from this script.');
    console.log('API would be called at: /api/user-analytics?profileId=' + BRAD_USER_ID);
    console.log('This requires the Next.js server to be running.');
  } catch (e) {
    console.error('Cannot test API from this script');
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // 9. LIST ALL TABLES
  console.log('📊 QUERY 9: Available Tables\n');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');
  
  if (tablesError) {
    console.error('❌ Error listing tables:', tablesError);
  } else if (tables) {
    console.log('✅ Available Tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
  }
  console.log('\n' + '=' .repeat(80) + '\n');
  
  // SUMMARY
  console.log('📋 SUMMARY\n');
  console.log('Database Queries Executed:');
  console.log(`  ✓ Profile: ${profile ? 'Found' : 'Not found'}`);
  console.log(`  ✓ Referrals: ${referralCount !== undefined ? `${referralCount} found` : 'Table missing'}`);
  console.log(`  ✓ Posts: ${postCount !== undefined ? `${postCount} found` : 'Table missing'}`);
  console.log(`  ✓ Gifts Sent: ${giftsSent ? `${giftsSent.length} records` : 'Error'}`);
  console.log(`  ✓ Gifts Received: ${giftsReceived ? `${giftsReceived.length} records` : 'Error'}`);
  console.log(`  ✓ Followers: ${followerCount !== undefined ? followerCount : 'Error'}`);
  console.log(`  ✓ Following: ${followingCount !== undefined ? followingCount : 'Error'}`);
  console.log();
  console.log('✅ Data verification complete!');
  console.log('=' .repeat(80));
}

main().catch(console.error);

