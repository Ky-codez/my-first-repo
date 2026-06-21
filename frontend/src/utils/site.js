// Canonical public URL for share & referral links.
//
// Share/referral links must point at wherever the app is actually reachable,
// so a friend who taps the link lands on the running app — not on a domain
// you don't own yet.
//
// Resolution order:
//   1. VITE_SITE_URL — explicit override. Set this once you own the real
//      domain (e.g. VITE_SITE_URL=https://sipiary.app) to force every link onto
//      it regardless of which host served the bundle.
//   2. window.location.origin — follow the serving origin. During tunnel/preview
//      testing this is the public test URL; in production served from your
//      domain it's that domain; in local dev it's localhost (fine — you don't
//      share those links anyway).
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || window.location.origin
).replace(/\/+$/, '');

// Build an absolute share URL: shareUrl('/share/wine/42') etc.
export const shareUrl = (path = '') =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

// Canonical public link for a wine. Prefers the pretty, author-crediting
// /@username/<slug> form (e.g. /@ky_codez/pomerol-2016); falls back to the
// id-based forms for older data that has no slug yet, so no link ever breaks.
export const wineShareUrl = (wine) => {
  if (wine?.username && wine?.slug) return shareUrl(`/@${wine.username}/${wine.slug}`);
  if (wine?.username)               return shareUrl(`/@${wine.username}/wine/${wine.id}`);
  return shareUrl(`/share/wine/${wine.id}`);
};
