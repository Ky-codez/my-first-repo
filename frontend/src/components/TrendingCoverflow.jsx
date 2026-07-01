import { useRef, useEffect } from 'react';
import { Medal, Heart } from '@phosphor-icons/react';
import { WineTypeIcon } from './wineIcons.jsx';

const API = '';

// Gold / silver / bronze medals for ranks 1–3.
const RANK_COLOR = [null, '#e0a020', '#9aa3ad', '#b87333'];
const rankMedal = (rank) => RANK_COLOR[rank]
  ? <Medal size={20} weight="fill" color={RANK_COLOR[rank]} />
  : null;

function TrendingTile({ wine, rank, tall, onWineClick }) {
  return (
    <button
      className={`tcf-tile${tall ? ' tcf-tile-featured' : ' tcf-tile-small'}`}
      onClick={() => onWineClick?.({ name: wine.name, winery: wine.winery })}
      title={`${wine.name} — ${Number(wine.rating).toFixed(1)}★`}
    >
      {wine.image_path
        ? <img className="tcf-img" src={`${API}${wine.image_path}`} alt="" draggable="false" loading="lazy" decoding="async" />
        : <div className="tcf-placeholder"><WineTypeIcon type={wine.type} size={40} /></div>
      }
      <div className="tcf-shade" />
      <span className="tcf-rank-medal">{rankMedal(rank)}</span>
      <div className="tcf-info">
        <span className="tcf-name">{wine.name}</span>
        <span className="tcf-meta">★ {Number(wine.rating).toFixed(1)} · <Heart size={12} weight="fill" style={{ verticalAlign: '-0.1em' }} /> {wine.like_count}</span>
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
