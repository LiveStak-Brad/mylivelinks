#!/usr/bin/env node

/**
 * UI Drift Detector
 * 
 * Scans TSX files for design system violations:
 * - Raw HTML elements (button, input, textarea) that should use components
 * - Hex colors (#xxx, #xxxxxx) instead of design tokens
 * - One-off spacing values that don't match the token scale
 * - Inline styles with hardcoded colors
 * 
 * Run: node scripts/ui-drift-detector.js
 * Or: npm run lint:ui
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Directories to scan
  scanDirs: ['app', 'components'],
  
  // Directories to ignore
  ignoreDirs: ['node_modules', '.next', 'dist', 'build'],
  
  // Files to ignore (patterns)
  ignoreFiles: [
    'ui-drift-detector.js',
    '.test.tsx',
    '.spec.tsx',
    '.stories.tsx',
  ],
  
  // Allowed spacing values (from token scale)
  allowedSpacing: [
    '0', '0.25rem', '0.5rem', '0.75rem', '1rem', '1.25rem', '1.5rem',
    '2rem', '2.5rem', '3rem', '4rem', '5rem', '6rem',
    '4px', '8px', '12px', '16px', '20px', '24px', '32px', '40px', '48px', '64px', '80px', '96px',
  ],
  
  // Raw HTML elements that should use design system components
  rawElements: [
    { tag: 'button', replacement: '<Button> from @/components/ui' },
    { tag: 'input', replacement: '<Input> from @/components/ui', exceptions: ['type="hidden"', 'type="file"', 'type="radio"', 'type="checkbox"'] },
    { tag: 'textarea', replacement: '<Textarea> from @/components/ui' },
    { tag: 'select', replacement: '<Select> from @/components/ui', exceptions: ['native select OK in some cases'] },
  ],
};

// Violation types
const VIOLATIONS = {
  RAW_ELEMENT: 'raw-element',
  HEX_COLOR: 'hex-color',
  ONE_OFF_SPACING: 'one-off-spacing',
  INLINE_COLOR: 'inline-color',
};

// Collect all violations
const allViolations = [];

/**
 * Check if a file should be scanned
 */
function shouldScanFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) {
    return false;
  }
  
  for (const pattern of CONFIG.ignoreFiles) {
    if (filePath.includes(pattern)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Recursively get all files in a directory
 */
function getFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!CONFIG.ignoreDirs.includes(entry.name)) {
        getFiles(fullPath, files);
      }
    } else if (shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Check for raw HTML elements
 */
function checkRawElements(content, filePath) {
  const violations = [];
  const lines = content.split('\n');
  
  for (const element of CONFIG.rawElements) {
    // Match <element but NOT <Element (capitalized = component)
    // Only match lowercase html tags followed by space, newline, or >
    const regex = new RegExp(`<${element.tag}(?=[\\s>])`, 'g');
    
    lines.forEach((line, index) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }
      
      // Skip if it's importing or defining the component
      if (line.includes('import') || line.includes('export') || line.includes('function')) {
        return;
      }
      
      // Skip JSDoc comments
      if (line.includes('@')) {
        return;
      }
      
      const matches = line.match(regex);
      if (matches) {
        // Check for exceptions
        const hasException = element.exceptions?.some(exc => line.includes(exc));
        if (!hasException) {
          violations.push({
            type: VIOLATIONS.RAW_ELEMENT,
            file: filePath,
            line: index + 1,
            message: `Raw <${element.tag}> found. Use ${element.replacement}`,
            code: line.trim().substring(0, 80),
          });
        }
      }
    });
  }
  
  return violations;
}

/**
 * Check for hex colors
 */
function checkHexColors(content, filePath) {
  const violations = [];
  const lines = content.split('\n');
  
  // Match hex colors: #xxx, #xxxx, #xxxxxx, #xxxxxxxx
  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    // Skip CSS variable declarations (these are OK in CSS files)
    if (line.includes('--') && line.includes(':')) {
      return;
    }
    
    const matches = line.match(hexRegex);
    if (matches) {
      matches.forEach(match => {
        violations.push({
          type: VIOLATIONS.HEX_COLOR,
          file: filePath,
          line: index + 1,
          message: `Hex color "${match}" found. Use Tailwind class or hsl(var(--token))`,
          code: line.trim().substring(0, 80),
        });
      });
    }
  });
  
  return violations;
}

/**
 * Check for one-off spacing values in Tailwind arbitrary values
 */
function checkOneOffSpacing(content, filePath) {
  const violations = [];
  const lines = content.split('\n');
  
  // Match Tailwind arbitrary spacing: p-[17px], m-[22px], gap-[13px], etc.
  const arbitraryRegex = /(?:p|m|px|py|mx|my|pt|pb|pl|pr|mt|mb|ml|mr|gap|space-x|space-y)-\[(\d+(?:\.\d+)?(?:px|rem))\]/g;
  
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    let match;
    while ((match = arbitraryRegex.exec(line)) !== null) {
      const value = match[1];
      if (!CONFIG.allowedSpacing.includes(value)) {
        violations.push({
          type: VIOLATIONS.ONE_OFF_SPACING,
          file: filePath,
          line: index + 1,
          message: `One-off spacing "${value}" found. Use token scale or Tailwind defaults`,
          code: line.trim().substring(0, 80),
        });
      }
    }
  });
  
  return violations;
}

/**
 * Check for inline color styles
 */
function checkInlineColors(content, filePath) {
  const violations = [];
  const lines = content.split('\n');
  
  // Match style={{ color: '...' }} or style={{ backgroundColor: '...' }}
  const inlineColorRegex = /(?:color|backgroundColor|background|borderColor):\s*['"](?!hsl|var|inherit|transparent|currentColor)([^'"]+)['"]/gi;
  
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }
    
    const matches = line.match(inlineColorRegex);
    if (matches) {
      matches.forEach(match => {
        violations.push({
          type: VIOLATIONS.INLINE_COLOR,
          file: filePath,
          line: index + 1,
          message: `Inline color found. Use hsl(var(--token)) or Tailwind classes`,
          code: line.trim().substring(0, 80),
        });
      });
    }
  });
  
  return violations;
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const violations = [
    ...checkRawElements(content, filePath),
    ...checkHexColors(content, filePath),
    ...checkOneOffSpacing(content, filePath),
    ...checkInlineColors(content, filePath),
  ];
  
  return violations;
}

/**
 * Format violations for output
 */
function formatViolations(violations) {
  if (violations.length === 0) {
    return '\n✅ No UI drift detected!\n';
  }
  
  let output = `\n❌ Found ${violations.length} UI drift violation(s):\n\n`;
  
  // Group by file
  const byFile = {};
  for (const v of violations) {
    if (!byFile[v.file]) {
      byFile[v.file] = [];
    }
    byFile[v.file].push(v);
  }
  
  for (const [file, fileViolations] of Object.entries(byFile)) {
    const relativePath = path.relative(process.cwd(), file);
    output += `📁 ${relativePath}\n`;
    
    for (const v of fileViolations) {
      const icon = {
        [VIOLATIONS.RAW_ELEMENT]: '🔘',
        [VIOLATIONS.HEX_COLOR]: '🎨',
        [VIOLATIONS.ONE_OFF_SPACING]: '📏',
        [VIOLATIONS.INLINE_COLOR]: '🖌️',
      }[v.type] || '⚠️';
      
      output += `   ${icon} Line ${v.line}: ${v.message}\n`;
      output += `      └─ ${v.code}\n`;
    }
    
    output += '\n';
  }
  
  output += `\n📖 See docs/UI_GOLDEN_RULES.md for guidelines\n`;
  
  return output;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Scanning for UI drift...\n');
  
  const rootDir = process.cwd();
  let allFiles = [];
  
  for (const dir of CONFIG.scanDirs) {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      allFiles = allFiles.concat(getFiles(dirPath));
    }
  }
  
  console.log(`📂 Found ${allFiles.length} files to scan\n`);
  
  let totalViolations = [];
  
  for (const file of allFiles) {
    const violations = scanFile(file);
    totalViolations = totalViolations.concat(violations);
  }
  
  console.log(formatViolations(totalViolations));
  
  // Summary by type
  if (totalViolations.length > 0) {
    const byType = {};
    for (const v of totalViolations) {
      byType[v.type] = (byType[v.type] || 0) + 1;
    }
    
    console.log('Summary:');
    if (byType[VIOLATIONS.RAW_ELEMENT]) {
      console.log(`  🔘 Raw elements: ${byType[VIOLATIONS.RAW_ELEMENT]}`);
    }
    if (byType[VIOLATIONS.HEX_COLOR]) {
      console.log(`  🎨 Hex colors: ${byType[VIOLATIONS.HEX_COLOR]}`);
    }
    if (byType[VIOLATIONS.ONE_OFF_SPACING]) {
      console.log(`  📏 One-off spacing: ${byType[VIOLATIONS.ONE_OFF_SPACING]}`);
    }
    if (byType[VIOLATIONS.INLINE_COLOR]) {
      console.log(`  🖌️  Inline colors: ${byType[VIOLATIONS.INLINE_COLOR]}`);
    }
    console.log('');
    
    // Exit with error code if violations found
    process.exit(1);
  }
  
  process.exit(0);
}

main();

