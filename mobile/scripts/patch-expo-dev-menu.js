const fs = require('fs');
const path = require('path');

function tryPatchDevMenu() {
  const targetPath = path.join(
    __dirname,
    '..',
    'node_modules',
    'expo-dev-menu',
    'ios',
    'DevMenuViewController.swift'
  );

  if (!fs.existsSync(targetPath)) {
    return;
  }

  const src = fs.readFileSync(targetPath, 'utf8');

  // Old (invalid in Swift): let isSimulator = TARGET_IPHONE_SIMULATOR > 0
  // New: use Swift compile-time environment check.
  const oldLineRegex = /^\s*let\s+isSimulator\s*=\s*TARGET_IPHONE_SIMULATOR\s*>\s*0\s*$/m;

  if (!oldLineRegex.test(src)) {
    return;
  }

  const replacement = [
    '    let isSimulator: Bool = {',
    '      #if targetEnvironment(simulator)',
    '      return true',
    '      #else',
    '      return false',
    '      #endif',
    '    }()'
  ].join('\n');

  const next = src.replace(oldLineRegex, replacement);
  fs.writeFileSync(targetPath, next, 'utf8');
}

try {
  tryPatchDevMenu();
} catch (e) {
  // Never fail installs because of this patch.
  process.exit(0);
}
