const fs = require('fs');
const path = require('path');

const patchesDir = path.join(__dirname, '..', 'patches');

function normalizeFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const normalized = raw.replace(/\r\n/g, '\n');
  if (normalized !== raw) {
    fs.writeFileSync(filePath, normalized, 'utf8');
  }
}

try {
  if (!fs.existsSync(patchesDir)) {
    process.exit(0);
  }

  const files = fs
    .readdirSync(patchesDir)
    .filter((f) => f.endsWith('.patch'))
    .map((f) => path.join(patchesDir, f));

  for (const filePath of files) {
    normalizeFile(filePath);
  }
} catch (e) {
  // Don't fail installs over patch normalization.
  process.exit(0);
}
