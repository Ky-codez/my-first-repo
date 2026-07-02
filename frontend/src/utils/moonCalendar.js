// Biodynamic lunar calendar
// Moon position: Jean Meeus "Astronomical Algorithms" Ch.47 (simplified)
// Sidereal zodiac (Maria Thun system)

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

// Fire=Fruit, Earth=Root, Air=Flower, Water=Leaf
const SIGN_TYPE = [
  'fruit','root','flower','leaf',
  'fruit','root','flower','leaf',
  'fruit','root','flower','leaf',
];

// Ascending path: Sagittarius(8) → Capricorn(9) → Aquarius(10) → Pisces(11) → Aries(0) → Taurus(1) → Gemini(2)
// Descending path: Cancer(3) → Leo(4) → Virgo(5) → Libra(6) → Scorpio(7) → Sagittarius(8)
const ASCENDING_SIGNS = new Set([0, 1, 2, 8, 9, 10, 11]); // Aries-Gemini + Sag-Pisces

export const TYPE_INFO = {
  fruit:  { label:'Fruit Day',  emoji:'🍇', color:'#e67e22', bg:'#1e0f00',
    desc:'Best day to open and taste wines. Fruit characters are most expressive and vibrant.' },
  root:   { label:'Root Day',   emoji:'🌱', color:'#c89a63', bg:'#120a00',
    desc:'Wines taste more closed, austere or earthy. Not recommended for important tastings.' },
  flower: { label:'Flower Day', emoji:'🌸', color:'#e91e8c', bg:'#1a0012',
    desc:'Floral aromas are most pronounced. Great for aromatic whites and elegant reds.' },
  leaf:   { label:'Leaf Day',   emoji:'🍃', color:'#27ae60', bg:'#001a08',
    desc:'Wines can show vegetal or herbal notes. Moderate day for casual drinking.' },
};

export const PHASE_INFO = {
  new:             { name:'New Moon',          emoji:'🌑', color:'#aaaaaa',
    desc:'New cycle begins. Wine can taste flat or very closed — save the good bottles.' },
  'waxing-crescent':{ name:'Waxing Crescent',  emoji:'🌒', color:'#c8c8a0',
    desc:'Energy building. Wines begin to open and show more character.' },
  'first-quarter': { name:'First Quarter',     emoji:'🌓', color:'#e0d88a',
    desc:'Good energy for tasting. Wine shows balanced and honest character.' },
  'waxing-gibbous':{ name:'Waxing Gibbous',    emoji:'🌔', color:'#f0e060',
    desc:'Wines increasingly expressive as the full moon approaches.' },
  full:            { name:'Full Moon',          emoji:'🌕', color:'#fffaaa',
    desc:'Peak lunar energy. Wines can taste more tannic and intense. Use with care.' },
  'waning-gibbous':{ name:'Waning Gibbous',    emoji:'🌖', color:'#f0e060',
    desc:'Great for tasting — wines are generous, open and expressive.' },
  'last-quarter':  { name:'Last Quarter',      emoji:'🌗', color:'#e0d88a',
    desc:'Wines becoming more reserved. Good for cellar work and inventory.' },
  'waning-crescent':{ name:'Waning Crescent',  emoji:'🌘', color:'#c8c8a0',
    desc:'Quiet introspective phase. Wines may taste a little more closed.' },
};

export const ASCENDING_INFO = {
  ascending:  { label:'Moon Ascending',  emoji:'↑', color:'#54a8e8',
    desc:'Moon rising higher each night. Wine opens up — perfect for tasting and sharing.' },
  descending: { label:'Moon Descending', emoji:'↓', color:'#b478d4',
    desc:'Moon moving lower each night. Wine more closed — ideal for cellar work and racking.' },
};

// ─────────────────────────────────────────────────────────────────────────────

export function getMoonInfo(date) {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const T  = (JD - 2451545.0) / 36525;
  const r  = Math.PI / 180;

  // Moon's fundamental arguments
  const L  = mod360(218.3164477 + 481267.88123421 * T);
  const M  = mod360(134.9633964 + 477198.8675055  * T);
  const Mp = mod360(357.5291092 + 35999.0502909   * T);
  const D  = mod360(297.8501921 + 445267.1114034  * T);
  const F  = mod360(93.2720950  + 483202.0175233  * T);

  // Longitude corrections
  const dL =
      6.288774 * Math.sin(M  * r)
    + 1.274027 * Math.sin((2*D - M)  * r)
    + 0.658314 * Math.sin(2*D  * r)
    + 0.213618 * Math.sin(2*M  * r)
    - 0.185116 * Math.sin(Mp  * r)
    - 0.114332 * Math.sin(2*F  * r)
    + 0.058793 * Math.sin((2*D - 2*M) * r)
    + 0.057066 * Math.sin((2*D - Mp - M) * r)
    + 0.053322 * Math.sin((2*D + M) * r)
    + 0.045758 * Math.sin((2*D - Mp) * r)
    - 0.040923 * Math.sin((M - Mp) * r)
    - 0.034720 * Math.sin(D  * r)
    - 0.030383 * Math.sin((Mp + M) * r);

  const tropLon = mod360(L + dL);

  // Sun's ecliptic longitude (for phase angle)
  const Ls = mod360(280.4665 + 36000.7698 * T);
  const Cs = 1.9146 * Math.sin(Mp * r) + 0.0200 * Math.sin(2 * Mp * r);
  const sunLon = mod360(Ls + Cs);

  // Phase angle (0=new → 180=full → 360=new again)
  const phaseAngle = mod360(tropLon - sunLon);

  // Illumination fraction 0–1
  const illumination = (1 - Math.cos(phaseAngle * r)) / 2;

  // Sidereal position
  const T_years   = T * 100;
  const ayanamsha = 23.85 + (T_years * 50.3 / 3600);
  const siderealLon = mod360(tropLon - ayanamsha);
  const signIndex   = Math.floor(siderealLon / 30);

  return {
    sign:        SIGNS[signIndex],
    signIndex,
    type:        SIGN_TYPE[signIndex],
    longitude:   siderealLon,
    phase:       getPhase(phaseAngle),
    phaseAngle,
    illumination,
    ascending:   ASCENDING_SIGNS.has(signIndex),
  };
}

function getPhase(a) {
  if (a < 22.5 || a >= 337.5)  return 'new';
  if (a < 67.5)                return 'waxing-crescent';
  if (a < 112.5)               return 'first-quarter';
  if (a < 157.5)               return 'waxing-gibbous';
  if (a < 202.5)               return 'full';
  if (a < 247.5)               return 'waning-gibbous';
  if (a < 292.5)               return 'last-quarter';
  return 'waning-crescent';
}

function mod360(x) { return ((x % 360) + 360) % 360; }
