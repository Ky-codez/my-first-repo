// ─── Wine share-link slugs ───────────────────────────────────────────────────
// Pretty public URLs read /@username/<slug> instead of exposing the raw row id
// (/wine/8). The slug is the wine's name (+ vintage), transliterated to ASCII
// and dash-joined. Slugs are scoped unique PER AUTHOR, so two different users
// can each own "/pomerol-2016".
//
// A slug is generated once at creation and then left alone — even if the wine
// is later renamed — so links already shared in the wild keep resolving.

// "Château Le Pin" + 2016 → "chateau-le-pin-2016"
function slugifyBase(name, vintage) {
  const v = vintage === 'NV' || vintage === 'nv' ? 'nv'
          : (parseInt(vintage) ? String(parseInt(vintage)) : null);
  const raw = [name, v].filter(Boolean).join(' ');
  const slug = raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents: é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')                        // anything else -> dash
    .replace(/^-+|-+$/g, '')                            // trim leading/trailing
    .slice(0, 60).replace(/-+$/g, '');                  // cap length, retrim
  return slug || 'wine';
}

// Ensure `base` is unique for this author, appending -2, -3, … on collision.
// `excludeId` lets an edit/backfill keep its own row out of the check.
function uniqueSlug(db, userId, base, excludeId = null) {
  const taken = db.prepare(
    'SELECT 1 FROM wines WHERE user_id = ? AND slug = ? AND id != ? LIMIT 1'
  );
  let slug = base, n = 1;
  while (taken.get(userId, slug, excludeId ?? -1)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

module.exports = { slugifyBase, uniqueSlug };
