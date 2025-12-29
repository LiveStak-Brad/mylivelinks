#!/usr/bin/env node
/**
 * Apply Supabase Migrations Directly
 * Uses service role key to execute migration SQL files
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get migrations that need to be applied
const MIGRATIONS_TO_APPLY = [
  '20251229_fix_follower_count_sync.sql',
  '20251229_create_posts_table.sql'
];

async function applyMigrations() {
  console.log('🚀 APPLYING MIGRATIONS VIA SUPABASE CLIENT\n');
  console.log('=' .repeat(80));
  console.log(`Target: ${supabaseUrl}`);
  console.log('Method: Direct SQL execution with service role key');
  console.log('=' .repeat(80));
  console.log();

  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  
  for (const migrationFile of MIGRATIONS_TO_APPLY) {
    console.log(`\n📄 Applying: ${migrationFile}`);
    console.log('-'.repeat(80));
    
    try {
      const migrationPath = join(migrationsDir, migrationFile);
      const sql = readFileSync(migrationPath, 'utf-8');
      
      console.log(`Reading from: ${migrationPath}`);
      console.log(`SQL length: ${sql.length} characters`);
      
      // Execute the migration SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
        // If RPC doesn't exist, try direct query
        return supabase.from('_migrations').select('*').limit(0);
      });
      
      // Since we can't directly execute SQL via client, we need to use the REST API
      // Let's use fetch to hit the SQL endpoint directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql_query: sql })
      }).catch(async () => {
        // Fallback: Split by statement and execute via direct queries
        // This is a workaround since Supabase client doesn't have direct SQL execution
        console.log('⚠️  Using fallback: Executing statements individually...');
        
        // For now, output the SQL and instructions
        console.log('⚠️  Cannot execute complex migrations via REST API directly.');
        console.log('✅ Migration SQL is ready in:', migrationPath);
        return { ok: false };
      });
      
      if (response && response.ok) {
        console.log('✅ Migration applied successfully');
      } else {
        console.log('⚠️  Migration needs to be applied manually via Supabase Dashboard');
        console.log(`   Copy SQL from: ${migrationPath}`);
        console.log(`   Paste into: https://supabase.com/dashboard/project/dfiyrmqobjfsdsgklweg/sql/new`);
      }
      
    } catch (err) {
      console.error(`❌ Error applying ${migrationFile}:`, err.message);
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('Migration application attempt complete.');
  console.log('=' .repeat(80));
}

applyMigrations().catch(console.error);


