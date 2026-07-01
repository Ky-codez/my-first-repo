// ── One consistent icon language for the whole app ──────────────────────────
// We use Phosphor (the same set the bottom nav uses) instead of emojis, so the
// UI reads as a polished, professional product. The ONLY place emojis stay is
// the Lunar Calendar (moon phases / biodynamic day-types are intentional there).
//
// Import wine-type and mood icons from here; import any other glyph straight
// from '@phosphor-icons/react' with `weight` matching the surrounding UI.
import { Wine, Champagne, Martini, Smiley, SmileyWink, SmileyMeh, SmileyNervous, SmileySad } from '@phosphor-icons/react';

// Wine types → a small line glyph + a wine-toned accent colour so the type is
// still readable at a glance (the colour cue the old emojis carried).
const TYPE_META = {
  Red:        { Icon: Wine,      color: '#b23a48' },
  White:      { Icon: Wine,      color: '#c8a64b' },
  'Rosé':     { Icon: Wine,      color: '#d98fa8' },
  Rose:       { Icon: Wine,      color: '#d98fa8' },
  Sparkling:  { Icon: Champagne, color: '#c8a64b' },
  Champagne:  { Icon: Champagne, color: '#caa84b' },
  Dessert:    { Icon: Wine,      color: '#b5832e' },
  Fortified:  { Icon: Wine,      color: '#8a4b2a' },
  Orange:     { Icon: Wine,      color: '#cf7a32' },
  Spirit:     { Icon: Martini,   color: '#9a6f8a' },
};

export function WineTypeIcon({ type, size = 18, weight = 'fill', color, className }) {
  const m = TYPE_META[type] || TYPE_META.Red;
  const Icon = m.Icon;
  return (
    <Icon
      size={size}
      weight={weight}
      color={color || m.color}
      className={className}
      style={{ verticalAlign: '-0.18em', flexShrink: 0 }}
    />
  );
}

// Mood log (one-tap rating) → friendly face icons.
export const MOOD_META = {
  love: { Icon: SmileyWink,    color: '#c0392b' },
  like: { Icon: Smiley,        color: '#d98324' },
  ok:   { Icon: SmileyMeh,     color: '#c9a227' },
  meh:  { Icon: SmileyNervous, color: '#8a8f98' },
  nope: { Icon: SmileySad,     color: '#6b7280' },
};

export function MoodIcon({ mood, size = 28, weight = 'fill', color }) {
  const m = MOOD_META[mood] || MOOD_META.ok;
  const Icon = m.Icon;
  return <Icon size={size} weight={weight} color={color || m.color} style={{ flexShrink: 0 }} />;
}
