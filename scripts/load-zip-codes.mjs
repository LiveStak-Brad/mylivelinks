/**
 * Load US Zip Codes into Supabase
 * 
 * Loads uszips.csv from project root into the zip_codes table.
 * 
 * Usage:
 *   node scripts/load-zip-codes.mjs
 * 
 * Requires:
 *   - uszips.csv in project root (from simplemaps.com)
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

import { createClient } from '@supabase/supabase-js';
import { createReadStream, existsSync } from 'fs';
import { createInterface } from 'readline';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load .env.local
config({ path: join(projectRoot, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CSV file path - check multiple locations
const CSV_PATHS = [
  join(projectRoot, 'uszips.csv'),
  join(projectRoot, 'scripts', 'uszips.csv'),
];

async function loadZipCodes() {
  // Find CSV file
  let csvPath = null;
  for (const path of CSV_PATHS) {
    if (existsSync(path)) {
      csvPath = path;
      break;
    }
  }

  if (!csvPath) {
    console.error('❌ uszips.csv not found');
    console.error('Please place uszips.csv in the project root folder');
    process.exit(1);
  }

  console.log(`📂 Loading from: ${csvPath}`);
  
  const fileStream = createReadStream(csvPath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let headers = null;
  let batch = [];
  let total = 0;
  let skipped = 0;
  const BATCH_SIZE = 500;

  for await (const line of rl) {
    if (!headers) {
      // Parse header row - handle quoted headers
      headers = line.split(',').map(h => h.replace(/"/g, '').trim());
      console.log('📋 Headers:', headers.slice(0, 6).join(', '), '...');
      continue;
    }

    // Parse CSV line with proper quote handling
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    // Create row object
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || null;
    });

    // Map to our table structure
    const zipData = {
      zip_code: row.zip,
      city: row.city,
      state_code: row.state_id,
      state_name: row.state_name,
      latitude: parseFloat(row.lat) || null,
      longitude: parseFloat(row.lng) || null,
      timezone: row.timezone || null
    };

    if (zipData.zip_code && zipData.latitude && zipData.longitude) {
      batch.push(zipData);
    } else {
      skipped++;
    }

    if (batch.length >= BATCH_SIZE) {
      const { error } = await supabase
        .from('zip_codes')
        .upsert(batch, { onConflict: 'zip_code' });
      
      if (error) {
        console.error('❌ Error inserting batch:', error.message);
      } else {
        total += batch.length;
        process.stdout.write(`\r⏳ Loaded ${total} zip codes...`);
      }
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    const { error } = await supabase
      .from('zip_codes')
      .upsert(batch, { onConflict: 'zip_code' });
    
    if (error) {
      console.error('❌ Error inserting final batch:', error.message);
    } else {
      total += batch.length;
    }
  }

  console.log(`\n\n✅ Loaded ${total} zip codes into database`);
  if (skipped > 0) {
    console.log(`⚠️  Skipped ${skipped} rows (missing data)`);
  }
}

async function main() {
  console.log('🚀 US Zip Code Loader\n');
  
  try {
    await loadZipCodes();
    console.log('\n🎉 Done! Nearby filtering is now ready to use.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
