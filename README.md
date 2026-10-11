# Alice, Lost: an interactive 404

*The page you wanted has wandered off.*

A 404 page told as a 23-page picture book: *Alice's Adventures in Wonderland* (1865), set in
John Tenniel's original engravings, printed live in the browser in riso inks, with a page you
can turn, things that leap out of the book, and a music box that plays as you read. Every
spread has something to touch: drink the potion and the book shrinks, eat the cake and Alice
grows right out of it, trace a golden thread to a door in a tree, watch the Cheshire Cat fade
until only his grin is left.

It ends where it began, and then it gets you home: the hall of doors, the Caterpillar's
"where were you trying to go?", the signposts in the wood and the last page all lead to the
right places on [shreyasinha.co.in](https://www.shreyasinha.co.in).

Designed and built by [Shreya Sinha](https://www.shreyasinha.co.in).

## How it's made

- **Vite + TypeScript**, no framework. One small engine (`src/engine/`) turns the pages,
  mounts only the open spread and its neighbours, handles wheel, keys, swipes and deep links
  (`#page-12`), and announces page changes to screen readers.
- **A riso press in WebGL** (`src/print/press.ts`). Each scene is drawn into three grey
  plates (cobalt, pink, yellow) with a hand-made brush library (`src/print/brush.ts`:
  wobbled outlines, tapered ribbons, leaf dabs), then a fragment shader screens each plate
  as halftone at its own angle, overprints them multiply-style, misregisters them a little,
  and boils the lines at 12 fps like drawn animation.
- **Tenniel's engravings**, public domain, cut out with `tools/figure.mjs` (line work plus a
  shape mask) so the press can knock them back to paper and hand-colour them in washes.
- **Things leave the book** on a full-window overlay (`src/print/escape.ts`): leaves, stars,
  potion drops, Bill the Lizard, playing cards.
- **GSAP** for the page turns and the springy bits.
- **Web Audio**: a small generative music box and pad whose mode changes with each act, and
  every sound effect (page turns, creaks, chimes) synthesised; it only starts after you
  interact, and remembers if you turn it off.
- **Accessible by default**: real links and buttons, alt text for every picture, keyboard
  turning, and `prefers-reduced-motion` respected throughout.

## Run it

```bash
npm install
npm run dev
```

`npm run build` writes a static site to `dist/`, ready for any static host (it's on Vercel).

## Credits

Text from Lewis Carroll's *Alice's Adventures in Wonderland* (1865) and illustrations by
John Tenniel, both in the public domain (plates from Wikimedia Commons; see
`tools/tenniel/SOURCE.md`). Everything else © Shreya Sinha.
