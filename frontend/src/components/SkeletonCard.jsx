// Grey animated placeholder shaped like a real wine card.
// Shown while the feed is loading so the layout never flashes empty.
// Pass `count` to render several at once: <SkeletonCard count={3} />.
export default function SkeletonCard({ count = 1 }) {
  if (count > 1) {
    return Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />);
  }
  return (
    <div className="wine-card skeleton-card" aria-hidden="true">
      {/* header: avatar circle + two text bars */}
      <div className="sk-header">
        <div className="sk sk-avatar" />
        <div className="sk-header-lines">
          <div className="sk sk-line" style={{ width: '38%' }} />
          <div className="sk sk-line" style={{ width: '24%' }} />
        </div>
        <div className="sk sk-badge" />
      </div>
      {/* photo block */}
      <div className="sk sk-photo" />
      {/* body: wine name, winery, notes */}
      <div className="sk-body">
        <div className="sk sk-line sk-line-lg" style={{ width: '55%' }} />
        <div className="sk sk-line" style={{ width: '35%' }} />
        <div className="sk sk-line" style={{ width: '92%' }} />
        <div className="sk sk-line" style={{ width: '78%' }} />
      </div>
    </div>
  );
}
