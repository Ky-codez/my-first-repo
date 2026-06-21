// ─── Image optimization ──────────────────────────────────────────────────────
// Phone photos arrive multi-MB; we resize + re-encode to WebP in place so the
// feed loads fast on mobile data (a 2 MB JPEG → ~100–250 KB WebP).
//
// Runs after multer saves the temp file. Filenames stay extensionless — they're
// served as octet-stream and browsers decode <img> by content sniffing, so the
// stored image_path values are unaffected and WebP renders everywhere.

const fs = require('fs');
const sharp = require('sharp');

// maxDim = longest edge in px; quality = WebP quality (1–100).
async function optimizeImage(filePath, { maxDim = 1280, quality = 80 } = {}) {
  try {
    // Read into a buffer first so sharp never opens the path twice (which can
    // fail on Windows) and the write below can safely replace the same file.
    const input = fs.readFileSync(filePath);
    const buf = await sharp(input)
      .rotate()                                                   // honor EXIF orientation
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })                                          // also strips metadata
      .toBuffer();
    fs.writeFileSync(filePath, buf);
    return true;
  } catch (err) {
    // HEIC without libheif, corrupt upload, etc. — keep the original so the
    // upload still succeeds; it's just not optimized.
    console.error('Image optimize failed (keeping original):', err.message);
    return false;
  }
}

module.exports = { optimizeImage };
