#!/usr/bin/env node
/**
 * Seed the location_zip_lookup table with USPS ZIP -> city/region data.
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials.');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const csvPath = path.join(__dirname, '..', '..', 'supabase', 'seed-data', 'us_zip_lookup.csv');
const BATCH_SIZE = 500;

async function parseCsv() {
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(csvPath, 'utf-8');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const records = [];

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('zip,')) {
      continue;
    }

    const [zipRaw, cityRaw, regionRaw, countryRaw = 'US'] = trimmed.split(',').map((segment) => segment.trim());

    if (!zipRaw || !cityRaw || !regionRaw) {
      continue;
    }

    const zip = zipRaw.padStart(5, '0');
    const city = cityRaw.toUpperCase();
    const region = regionRaw.toUpperCase();
    const country = (countryRaw || 'US').toUpperCase();

    records.push({
      zip,
      city,
      region,
      country
    });
  }

  return records;
}

async function upsertBatches(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('location_zip_lookup')
      .upsert(batch, { onConflict: 'zip' });

    if (error) {
      console.error('❌ Failed batch upsert', error.message);
      throw error;
    }

    inserted += batch.length;
    console.log(`✅ Upserted ${inserted}/${rows.length}`);
  }
}

async function main() {
  console.log('🚀 Seeding ZIP lookup table');
  console.log(`📄 Source: ${csvPath}`);

  const rows = await parseCsv();

  if (!rows.length) {
    console.warn('⚠️ No rows parsed from CSV. Nothing to do.');
    return;
  }

  await upsertBatches(rows);
  console.log('🎉 Done seeding location_zip_lookup');
}

main().catch((err) => {
  console.error('Unexpected error while seeding ZIP lookup:', err);
  process.exit(1);
});
