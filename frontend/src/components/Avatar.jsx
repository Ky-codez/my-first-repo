const API = '';

// Deterministic gradient pairs per username — same user always gets same colours
const GRADIENTS = [
  ['#c0392b', '#e74c3c'],
  ['#8e44ad', '#9b59b6'],
  ['#2471a3', '#3498db'],
  ['#1e8449', '#27ae60'],
  ['#d35400', '#e67e22'],
  ['#16a085', '#1abc9c'],
  ['#b7950b', '#f1c40f'],
  ['#922b21', '#cb4335'],
];

function getGradient(username) {
  const code = (username || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[code % GRADIENTS.length];
}

export default function Avatar({ user, size = 36 }) {
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';
  const [from, to] = getGradient(user?.username);

  // Story-style gradient ring; ring thickness scales with size
  const ringW  = Math.max(2, Math.round(size * 0.055));
  const gap    = ringW; // breathing room between ring and face
  const inner  = size - (ringW + gap) * 2;

  const ring = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: `linear-gradient(135deg, ${from}, ${to})`,
    padding: ringW,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const face = {
    width: inner + gap * 2, height: inner + gap * 2, borderRadius: '50%',
    border: `${gap}px solid var(--bg, #120608)`,
    objectFit: 'cover', boxSizing: 'border-box',
  };

  if (user?.avatar_path) {
    return (
      <div style={ring}>
        <img src={`${API}${user.avatar_path}`} alt={user.username} style={face} loading="lazy" decoding="async" />
      </div>
    );
  }
  return (
    <div style={ring}>
      <div style={{
        ...face,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: inner * 0.4, fontWeight: 700, color: '#fff',
        letterSpacing: '0.03em',
      }}>
        {initials}
      </div>
    </div>
  );
}
