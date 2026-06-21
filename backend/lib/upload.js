// ─── File uploads (multer) ───────────────────────────────────────────────────
// Two upload targets: avatars (5 MB) and wine photos (10 MB).
//
// SECURITY: only real image types are accepted. Without this filter an
// attacker could upload an .html or .svg file and have it served from
// /uploads — running their script in a victim's browser (stored XSS).

const multer = require('multer');
const path = require('path');
const { UPLOADS_DIR } = require('./paths');

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
]);

const imageFilter = (_req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files are allowed (jpeg, png, webp, gif, heic)'));
};

const avatarUpload = multer({
  dest: path.join(UPLOADS_DIR, 'avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const wineUpload = multer({
  dest: path.join(UPLOADS_DIR, 'wines'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
});

module.exports = { avatarUpload, wineUpload };
