#!/usr/bin/env node

/**
 * Markdown Policy Enforcer
 * 
 * Prevents documentation sprawl by enforcing strict rules on where .md files
 * can live and what patterns are banned.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Allowed locations (relative to repo root)
const ALLOWED_PATTERNS = [
  /^README\/.*\.md$/i,
  /^docs\/.*\.md$/i,
  /^README\.md$/i,
  /^components\/.*\/README\.md$/i,
  /^public\/.*\/README\.md$/i,
  /^lib\/.*\/README\.md$/i, // Allow lib docs like lib/live/README.md
];

// Hard-banned filename patterns (anywhere in repo)
const BANNED_PATTERNS = [
  /_COMPLETE\.md$/i,
  /_FIX.*\.md$/i,
  /_DELIVERABLE\.md$/i,
  /_AUDIT.*\.md$/i,
  /_GUIDE.*\.md$/i,
  /_SUMMARY\.md$/i,
  /_REPORT\.md$/i,
  /^DEBUG_.*\.md$/i,
  /^PHASE.*\.md$/i,
  /^AGENT_.*\.md$/i,
  /^FINAL_.*\.md$/i,
];

// Files to always ignore
const IGNORED_FILES = [
  'node_modules',
  '.git',
  '.expo',
  'apps/mobile/node_modules',
  'apps/mobile/.expo',
];

// Whitelist - files exempt from banned pattern checks
const WHITELISTED_FILES = [
  'README/AGENT_DOCS_POLICY.md',
];

function getAllMdFiles() {
  try {
    // Get all tracked and staged .md files from git
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.endsWith('.md') && f.trim() !== '');
    
    const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' })
      .split('\n')
      .filter(f => f.endsWith('.md') && f.trim() !== '');
    
    return [...new Set([...staged, ...untracked])];
  } catch (error) {
    // If git commands fail, fall back to checking all .md files
    console.warn('Git commands failed, checking all .md files in repo');
    return findAllMdFiles('.');
  }
}

function findAllMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative('.', filePath).replace(/\\/g, '/');
    
    // Skip ignored directories
    if (IGNORED_FILES.some(ignored => relativePath.includes(ignored))) {
      return;
    }
    
    if (fs.statSync(filePath).isDirectory()) {
      findAllMdFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(relativePath);
    }
  });
  
  return fileList;
}

function checkFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = path.basename(filePath);
  const errors = [];
  
  // Check if file is whitelisted
  if (WHITELISTED_FILES.includes(normalizedPath)) {
    return errors; // Skip all checks for whitelisted files
  }
  
  // Check banned patterns first (these fail even in allowed locations)
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(fileName)) {
      errors.push({
        file: filePath,
        reason: `Filename matches banned pattern: ${pattern}`,
        severity: 'error'
      });
      return errors; // Early return - banned pattern is always fatal
    }
  }
  
  // Check if file is in an allowed location
  const isAllowed = ALLOWED_PATTERNS.some(pattern => pattern.test(normalizedPath));
  
  if (!isAllowed) {
    errors.push({
      file: filePath,
      reason: 'File is not in an allowed location. Allowed: /README/**, /docs/**, README.md, components/**/README.md, public/**/README.md',
      severity: 'error'
    });
  }
  
  return errors;
}

function main() {
  console.log('🔍 Checking markdown policy...\n');
  
  const mdFiles = getAllMdFiles();
  const allErrors = [];
  
  if (mdFiles.length === 0) {
    console.log('✅ No new/changed .md files to check');
    process.exit(0);
  }
  
  console.log(`Checking ${mdFiles.length} markdown file(s)...\n`);
  
  for (const file of mdFiles) {
    const errors = checkFile(file);
    allErrors.push(...errors);
  }
  
  if (allErrors.length === 0) {
    console.log('✅ All markdown files comply with policy');
    process.exit(0);
  }
  
  // Report errors
  console.error('❌ Markdown policy violations found:\n');
  
  for (const error of allErrors) {
    console.error(`  ${error.file}`);
    console.error(`    → ${error.reason}\n`);
  }
  
  console.error(`\n📋 See README/AGENT_DOCS_POLICY.md for the full policy\n`);
  console.error(`Found ${allErrors.length} violation(s)`);
  
  process.exit(1);
}

main();
