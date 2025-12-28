/**
 * Generate PWA icons from the main logo
 * Run: node scripts/generate-icons.js
 * 
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Use the dedicated icon artwork (square) as the source so small sizes (16/32) stay bold in tabs.
// This should be a simple mark with minimal padding.
const SOURCE_IMAGE = path.join(__dirname, '../icon512.png');
const OUTPUT_DIR = path.join(__dirname, '../public/branding/favicon');

// Icon sizes needed for PWA and favicon
const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 167, name: 'icon-167x167.png' },
  { size: 180, name: 'icon-180x180.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Generating icons from:', SOURCE_IMAGE);
  console.log('Output directory:', OUTPUT_DIR);

  for (const { size, name } of sizes) {
    const outputPath = path.join(OUTPUT_DIR, name);
    
    try {
      // Trim transparent/near-transparent edges then fill the canvas (no extra padding).
      await sharp(SOURCE_IMAGE)
        .trim({ threshold: 8 })
        .resize(size, size, {
          fit: 'cover',
          position: 'centre',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (err) {
      console.error(`✗ Failed to generate ${name}:`, err.message);
    }
  }

  // Generate favicon.ico (multi-size ICO file)
  // Note: sharp doesn't support ICO directly, so we'll create a simple 32x32 PNG as fallback
  // For a proper favicon.ico, use an online converter or the 'to-ico' package
  console.log('\n📝 Note: For favicon.ico, copy favicon-32x32.png and rename to favicon.ico,');
  console.log('   or use an online converter like https://realfavicongenerator.net/');
  
  console.log('\n✅ Icon generation complete!');
}

generateIcons().catch(console.error);

