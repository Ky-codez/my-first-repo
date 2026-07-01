import { Star } from '@phosphor-icons/react';

// Ambassador badge — a gold star inside a wine-red seal, shown next to the
// username of Sipiary Ambassadors (verified-style, but on-brand and distinct
// from a normal verified tick). Admin-granted via the is_ambassador flag.
// Render only when the user is an ambassador:  {user.is_ambassador ? <AmbassadorBadge/> : null}
export default function AmbassadorBadge({ size = 16, title = 'Sipiary Ambassador' }) {
  const inner = Math.round(size * 0.62);
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%', background: '#993C1D',
        flexShrink: 0, verticalAlign: 'middle', marginLeft: 4, position: 'relative', top: '-0.06em',
      }}
    >
      <Star size={inner} weight="fill" color="#FAC775" />
    </span>
  );
}
