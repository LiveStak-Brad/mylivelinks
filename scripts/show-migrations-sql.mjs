#!/usr/bin/env node
/**
 * FORCE APPLY MIGRATIONS VIA SQL
 * Directly execute migration SQL against Supabase
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MIGRATIONS = [
  '20251229_fix_follower_count_sync.sql',
  '20251229_create_posts_table.sql'
];

async function applySQL(sql, migrationName) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc`;
  
  // Try using pg_stat_statements or direct execution
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql
    })
  });

  return response;
}

async function main() {
  console.log('🚀 FORCE APPLYING MIGRATIONS\n');
  console.log('⚠️  This will apply migrations directly via SQL execution');
  console.log('=' .repeat(80));

  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

  for (const migrationFile of MIGRATIONS) {
    console.log(`\n📄 ${migrationFile}`);
    console.log('-'.repeat(80));
    
    const migrationPath = join(migrationsDir, migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log(`File: ${migrationPath}`);
    console.log(`Size: ${sql.length} bytes`);
    console.log('\n📋 SQL Content:\n');
    console.log(sql);
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n⚠️  MANUAL ACTION REQUIRED:');
  console.log('Since Supabase REST API doesn\'t support direct SQL execution,');
  console.log('copy the SQL above and run it in:');
  console.log('\nhttps://supabase.com/dashboard/project/dfiyrmqobjfsdsgklweg/sql/new\n');
}

main().catch(console.error);


