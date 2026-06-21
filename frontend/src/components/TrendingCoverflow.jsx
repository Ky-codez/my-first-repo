import { useRef, useEffect } from 'react';

const API = '';
const TYPE_EMOJI = { Red: '🍷', White: '🥂', 'Rosé': '🌸', Sparkling: '✨', Champagne: '🍾', Dessert: '🍯', Fortified: '🏺', Spirit: '🥃' };

const RANK_LABEL = ['', '🥇', '🥈', '🥉'];

function TrendingTile({ wine, rank, tall, onWineClick }) {
  return (
    <button
      className={`tcf-tile${tall ? ' tcf-tile-featured' : ' tcf-tile-small'}`}
      onClick={() => onWineClick?.({ name: wine.name, winery: wine.winery })}
      title={`${wine.name} — ${Number(wine.rating).toFixed(1)}★`}
    >
      {wine.image_path
        ? <img className="tcf-img" src={`${API}${wine.image_path}`} alt="" draggable="false" loading="lazy" decoding="async" />
        : <div className="tcf-placeholder">{TYPE_EMOJI[wine.type] || '🍷'}</div>
      }
      <div className="tcf-shade" />
      <span className="tcf-rank-medal">{RANK_LABEL[rank]}</span>
      <div className="tcf-info">
        <span className="tcf-name">{wine.name}</span>
        <span className="tcf-meta">★ {Number(wine.rating).toFixed(1)} · ❤️ {wine.like_count}</span>
      </div>
    </button>
  );
}

export default function TrendingCoverflow({ wines, onWineClick }) {
  if (!wines || wines.length === 0) return null;

  const [first, ...rest] = wines;

  return (
    <div className="tcf-bento">
      {/* #1 — large featured tile on the left */}
      <TrendingTile wine={first} rank={1} tall onWineClick={onWineClick} />

      {/* #2 and #3 — stacked on the right */}
      {rest.length > 0 && (
        <div className="tcf-bento-col">
          {rest.slice(0, 2).map((w, i) => (
            <TrendingTile key={w.id} wine={w} rank={i + 2} onWineClick={onWineClick} />
          ))}
        </div>
      )}
    </div>
  );
}
