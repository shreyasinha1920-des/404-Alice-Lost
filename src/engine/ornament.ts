import { el } from './dom';

/** One corner flourish; the other three are mirrored in CSS. Colours come from the act's CSS variables. */
const CORNER = `
<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">
  <path d="M4,56 L4,18 C4,9 9,4 18,4 L56,4" fill="none" stroke="var(--gilt-line)" stroke-width="1.6"/>
  <path d="M10,48 C10,30 14,22 22,16 C28,12 36,10 48,10" fill="none" stroke="var(--gilt-line)" stroke-width="0.9" opacity="0.8"/>
  <path d="M18,18 C24,10 34,14 30,22 C27,28 20,24 24,20" fill="none" stroke="var(--gilt-line)" stroke-width="1.1"/>
  <circle cx="11" cy="11" r="4.2" fill="var(--gem)" stroke="var(--gilt-line)" stroke-width="1"/>
  <circle cx="10" cy="10" r="1.3" fill="#fff" opacity="0.7"/>
  <path d="M40,4 l2,-3 l2,3 l-2,3z M4,40 l-3,2 l3,2 l3,-2z" fill="var(--gem-2)"/>
</svg>`;

const SPARKLE = `<svg viewBox="-10 -10 20 20" aria-hidden="true" focusable="false"><path d="M0,-10 Q1.6,-1.6 10,0 Q1.6,1.6 0,10 Q-1.6,1.6 -10,0 Q-1.6,-1.6 0,-10Z"/></svg>`;

/**
 * The gilt frame drawn around every story page: a double rule, four corner
 * flourishes with enamel gems, and a few sparkles that twinkle.
 */
export function ornament(): HTMLElement {
  const frame = el('div', { class: 'ornament', 'aria-hidden': 'true' });
  for (const pos of ['tl', 'tr', 'bl', 'br']) {
    const corner = el('span', { class: `ornament__corner ornament__corner--${pos}` });
    corner.innerHTML = CORNER; // static markup
    frame.append(corner);
  }
  for (let i = 0; i < 3; i++) {
    const s = el('span', { class: `ornament__sparkle ornament__sparkle--${i}` });
    s.innerHTML = SPARKLE;
    frame.append(s);
  }
  return frame;
}
