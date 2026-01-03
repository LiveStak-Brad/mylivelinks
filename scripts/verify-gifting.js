const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');

const requiredFiles = [
  'supabase/migrations/20260110b_lock_send_gift_v2_signature.sql',
  'supabase/verification/GIFTING_SMOKE_TEST.sql',
  'README_DO_NOT_TOUCH_GIFTING.md',
];

const expectedParams = [
  'p_sender_id uuid',
  'p_recipient_id uuid',
  'p_coins_amount bigint',
  'p_gift_type_id bigint',
  'p_stream_id bigint',
  'p_request_id varchar(255)',
  'p_room_id text',
];

function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function listSqlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) continue;
    if (e.isFile() && e.name.toLowerCase().endsWith('.sql')) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function main() {
  const missing = requiredFiles.filter((p) => !fs.existsSync(path.join(repoRoot, p)));
  if (missing.length) {
    console.error('[verify:gifting] FAILED. Missing required files:');
    for (const m of missing) console.error(`- ${m}`);
    process.exit(1);
  }

  if (!fs.existsSync(migrationsDir)) {
    console.error(`[verify:gifting] FAILED. Missing migrations dir: ${migrationsDir}`);
    process.exit(1);
  }

  const files = listSqlFiles(migrationsDir);

  let lastMatch = null;
  for (const fp of files) {
    const text = fs.readFileSync(fp, 'utf8');
    const idx = text.toLowerCase().lastIndexOf('create or replace function public.send_gift_v2');
    if (idx !== -1) lastMatch = { fp, text };
  }

  if (!lastMatch) {
    console.error('[verify:gifting] FAILED. No CREATE OR REPLACE FUNCTION public.send_gift_v2 found in migrations.');
    process.exit(1);
  }

  const snippet = lastMatch.text.slice(
    lastMatch.text.toLowerCase().lastIndexOf('create or replace function public.send_gift_v2'),
    lastMatch.text.length
  );

  const m = snippet.match(/create\s+or\s+replace\s+function\s+public\.send_gift_v2\s*\(([^]*?)\)\s*returns/i);
  if (!m) {
    console.error('[verify:gifting] FAILED. Could not parse send_gift_v2 signature from: ' + path.relative(repoRoot, lastMatch.fp));
    process.exit(1);
  }

  const paramsRaw = normalize(m[1]);

  for (const p of expectedParams) {
    if (!paramsRaw.includes(normalize(p))) {
      console.error('[verify:gifting] FAILED. send_gift_v2 signature missing expected param:', p);
      console.error('File:', path.relative(repoRoot, lastMatch.fp));
      console.error('Parsed params:', paramsRaw);
      process.exit(1);
    }
  }

  console.log('[verify:gifting] OK');
}

main();
