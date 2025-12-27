const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const canonicalMigrationsDir = path.join(repoRoot, 'supabase', 'migrations');

const forbiddenAnywhere = [
  'coin_' + 'ledger',
];

const canonicalFunctions = [
  'finalize_coin_purchase',
  'send_gift_v2',
  'send_gift_v2_with_message',
  'convert_diamonds_to_coins',
  'get_leaderboard',
];

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'mobile' || e.name === '.next') continue;
    if (e.name === '_archive_sql_do_not_apply') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function readTextSafe(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

function isSql(filePath) {
  return filePath.toLowerCase().endsWith('.sql');
}

function normalize(p) {
  return p.split(path.sep).join('/');
}

function main() {
  if (!fs.existsSync(canonicalMigrationsDir)) {
    console.error(`[verify:money-schema] Missing canonical migrations dir: ${canonicalMigrationsDir}`);
    process.exit(1);
  }

  const files = walk(repoRoot);

  const violations = [];

  for (const filePath of files) {
    const text = readTextSafe(filePath);
    if (text == null) continue;

    for (const token of forbiddenAnywhere) {
      if (text.toLowerCase().includes(token.toLowerCase())) {
        violations.push({
          type: 'forbidden_token',
          token,
          file: normalize(path.relative(repoRoot, filePath)),
        });
      }
    }

    if (isSql(filePath)) {
      const rel = normalize(path.relative(repoRoot, filePath));
      const isCanonical = rel.startsWith('supabase/migrations/');

      if (!isCanonical) {
        for (const fn of canonicalFunctions) {
          const re = new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${fn}\\b`, 'i');
          if (re.test(text)) {
            violations.push({
              type: 'duplicate_rpc_definition',
              function: fn,
              file: rel,
            });
          }
        }
      }
    }
  }

  if (violations.length) {
    console.error('[verify:money-schema] FAILED. Violations:');
    for (const v of violations) {
      if (v.type === 'forbidden_token') {
        console.error(`- forbidden token "${v.token}" in ${v.file}`);
      } else {
        console.error(`- canonical RPC defined outside supabase/migrations: public.${v.function} in ${v.file}`);
      }
    }
    process.exit(1);
  }

  console.log('[verify:money-schema] OK');
}

main();
