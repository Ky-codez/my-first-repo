// One-time backfill: optimize images uploaded before the upload pipeline
// started doing it. Safe to re-run — already-small/WebP files are skipped.
//
//   node scripts/optimize-existing-images.js
//
// Idempotent and in-place. New uploads are optimized automatically by
// lib/optimizeImage.js, so this only matters for the existing back-catalogue.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { UPLOADS_DIR } = require('../lib/paths');

const TARGETS = [
  { dir: path.join(UPLOADS_DIR, 'wines'),   maxDim: 1280, quality: 80 },
  { dir: path.join(UPLOADS_DIR, 'avatars'), maxDim: 256,  quality: 82 },
];

async function run() {
  let done = 0, skipped = 0, saved = 0;
  for (const { dir, maxDim, quality } of TARGETS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (!fs.statSync(file).isFile()) continue;
      const before = fs.statSync(file).size;
      try {
        // Read into a buffer first — avoids sharp opening the same path twice
        // (which fails on Windows) and keeps the source decode self-contained.
        const input = fs.readFileSync(file);
        const meta = await sharp(input).metadata();
        // Skip files already small AND already WebP — nothing to gain.
        if (meta.format === 'webp' && before < 300 * 1024) { skipped++; continue; }
        const buf = await sharp(input)
          .rotate()
          .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        if (buf.length < before) {
          fs.writeFileSync(file, buf);
          saved += before - buf.length;
          done++;
          console.log(`✓ ${name}: ${(before/1024).toFixed(0)}KB → ${(buf.length/1024).toFixed(0)}KB`);
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`✗ ${name}: ${err.message}`);
        skipped++;
      }
    }
  }
  console.log(`\nOptimized ${done}, skipped ${skipped}. Freed ${(saved/1024/1024).toFixed(1)} MB.`);
}

run();
