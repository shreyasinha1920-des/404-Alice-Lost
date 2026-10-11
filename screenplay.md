# Down the Rabbit Hole: Interactive 404 Storybook

Oct 8, 2026 · @Shreya

## Concept

A visitor hits a missing page and falls down the rabbit hole with Alice: a 23-page illustrated book that retells her journey as the search for a lost page, ending at a door marked Home.

**Source book.** *Alice's Adventures in Wonderland* by Lewis Carroll (1865), with John Tenniel's 42 original illustrations. Both are public domain worldwide. Text comes from Project Gutenberg (eBook #11). Tenniel plates come from Wikimedia Commons or a Gutenberg illustrated edition. Only use the 1865 text and Tenniel art, never Disney visuals or later illustrators.

**Why it fits a 404.** Alice follows something she shouldn't, falls somewhere unexpected, meets doors that don't open, and asks a cat which way to go. Every one of those beats maps onto a broken link.

**The experience in one line.** Engraved, parchment-toned storybook pages, each with one living illustration and one interaction, carried by smooth scroll and page turns, with a Take me home button that never leaves the screen.

**Structure.** Four acts: The Fall (pages 1 to 6), Wrong Sizes (7 to 11), The Woods (12 to 17), The Court and Home (18 to 23).

## Screenplay

Each page has one Tenniel illustration cut into parallax layers, one short text block (Carroll's words plus a line of 404 copy), and one interaction. Quotes are from the 1865 public domain text.

| # | Scene | On-page text | Animation and interaction | Built with |
| --- | --- | --- | --- | --- |
| 1 | Cover: a closed clothbound book in drifting fog | Title: "Alice's Adventures in the Missing Page." Small line: "Error 404. The page you wanted has wandered off." | Book rotates slightly with the cursor. Click or scroll opens the cover in 3D. | ThreeUI Umbra 3D book, Vanta FOG behind |
| 2 | Riverbank, Alice bored beside her sister | "What is the use of a book without pictures or conversations?" / "You were looking for something. It isn't here." | Soft daylight clouds, grass sways, the sister's book pages flutter. | Vanta CLOUDS, CSS sway |
| 3 | The White Rabbit runs past checking his watch | "Oh dear! Oh dear! I shall be too late!" / "You followed a link. So did she." | Rabbit dashes across on page enter. Hovering makes him glance back at the cursor. The watch shows a ticking 4:04. | GSAP or CSS keyframes, SVG layers |
| 4 | The rabbit hole opens | "Down, down, down. Would the fall never come to an end?" | Lenis scroll becomes the fall. The page pins and a tunnel of type spirals toward the reader. | Lenis scroll progress, ThreeUI Typography Vortex |
| 5 | Mid-fall: jars, maps, clocks and books float past | "I wonder how many miles I've fallen by this time?" | The visitor's broken URL breaks into fragments that tumble with the falling objects. Scroll speed sets fall speed. | Lenis velocity, Three.js sprites |
| 6 | Thump. The long hall of locked doors | "There were doors all round the hall, but they were all locked." | Each door is labeled with a real section of the site (Home, Work, About, Contact). Hover rattles a door. A tiny golden key glints on the glass table. | DOM doors with CSS 3D hover |
| 7 | DRINK ME bottle; Alice shrinks | "DRINK ME" / "Maybe you're just too small for this page." | Clicking the bottle shrinks the whole page layout and text to a tiny scale, then eases back. | CSS transform scale with spring easing |
| 8 | EAT ME cake; Alice grows | "Curiouser and curiouser!" | Click the cake and the illustration grows past the page edges. The text overflows its box on purpose, then reflows. | CSS transform, overflow animation |
| 9 | The pool of tears | "I wish I hadn't cried so much!" / "Don't worry. Broken links happen to everyone." | Water surface fills the lower page. Cursor movement makes ripples; Alice and the mouse bob on it. | Vanta WAVES or ThreeUI Water Ripple shader |
| 10 | The Caucus Race | "Everybody has won, and all must have prizes." | Animals run in an endless loop around the page. Clicking anywhere makes them all stop and cheer. A nod to clicking in circles. | SVG path animation, looping |
| 11 | Alice stuck in the Rabbit's house | "Mary Ann! Mary Ann!" / "Too big for this page. Let's try another." | Her arm bursts out of the window illustration. The page shakes gently, then the next page button appears through the chimney. | Layered parallax, small screen shake |
| 12 | The Caterpillar on the mushroom | "Who are you?" | Smoke rises and forms the question. A text field asks "Where were you trying to go?" and runs a site search or suggests pages. | Vanta FOG, search input |
| 13 | Into the woods, signposts everywhere | "...as she wandered about in the wood." | Trees grow and sway with the cursor like wind. Signposts point in every direction, each one a link. | ThreeUI Generative Tree, Terrain Plume River as backdrop |
| 14 | The Cheshire Cat appears, grin first | "Would you tell me, please, which way I ought to go from here?" / "That depends a good deal on where you want to get to." | The grin fades in before the body. The cat's eyes follow the cursor. | Layered SVG with opacity staging |
| 15 | The Cat vanishes, leaving only the grin | "We're all mad here." | Hover makes the cat disappear piece by piece until only the grin floats. Click brings him back. | Masked fade, particles |
| 16 | The Mad Tea Party | "Why is a raven like a writing-desk?" / "It's always six o'clock now." | The long table rotates slowly to show the guests. All clocks are stuck at 6:04. Clicking "Move down" shifts everyone one seat. | Three.js turntable or CSS 3D carousel |
| 17 | A door in a tree trunk | "There's a door leading right into it." / "There's a way out. There always is." | A glowing thread draws itself through a small maze toward the tree door. The visitor can trace it with the cursor. | ThreeUI Orrery Labyrinth |
| 18 | The Queen's garden; gardeners painting roses red | "Would you tell me why you are painting those roses?" | Hover over white roses to paint them red, one brush stroke at a time. | Canvas paint mask |
| 19 | The Queen of Hearts | "Off with her head!" | The page flashes red, the text shakes, and the 404 code stamps across it like a royal seal. | CSS keyframes, stamp animation |
| 20 | The Trial | "Begin at the beginning, and go on till you come to the end: then stop." | The evidence on the stand is the broken URL itself, shown on a scroll of parchment. The jury scribbles on slates. | Parchment texture, typing effect |
| 21 | Cards fly up | "You're nothing but a pack of cards!" | All the cards burst into a storm and swirl across both pages, then settle as a deck. | Three.js instanced cards or particle system |
| 22 | Waking on the riverbank | "Wake up, Alice dear!" | Leaves drift down gently. Everything slows. The fog clears to warm light. | Vanta CLOUDS daylight, falling leaves |
| 23 | Back cover: the way home | "It's no use going back to yesterday, because I was a different person then." | One big Take me home button, plus small links to main pages. The book closes when clicked and the site loads. | ThreeUI Umbra book closing, button |

## Materials map

Three libraries do three different jobs: ThreeUI gives the hero 3D moments, Vanta gives cheap animated atmospheres, and Lenis drives scroll and pacing.

| Library | Piece | Used on pages | Role |
| --- | --- | --- | --- |
| [ThreeUI](https://threeui.com/browse?sort=recent) | Sketchbook landing page (curled page turns) | All | Reference for the page-turn mechanic and paper feel |
| ThreeUI | Umbra clothbound 3D book | 1, 23 | Opening and closing book |
| ThreeUI | Workshop Codex Shelf (parchment, engraved style) | All | Reference for texture, grain and engraved look that matches Tenniel |
| ThreeUI | Typography Vortex | 4 | The fall down the hole |
| ThreeUI | Generative Tree, Terrain Plume River | 13 | The woods |
| ThreeUI | Orrery Labyrinth (lit thread through a maze) | 17 | Finding the way out |
| ThreeUI | Water Ripple shader button (effect only) | 9 | Pool of tears, if Vanta WAVES feels too heavy |
| [Vanta](https://github.com/tengbao/vanta) | FOG | 1, 12 | Cover mist, Caterpillar's smoke |
| Vanta | CLOUDS | 2, 22 | Riverbank daylight, waking up |
| Vanta | WAVES | 9 | Pool of tears |
| [Lenis](https://github.com/darkroomengineering/lenis) | Smooth scroll + scroll progress | All, mainly 4 and 5 | Page progression, the fall's speed |

**Caveats to pass to Claude Code**

- **Three.js versions.** Vanta is built on an older Three.js release, while ThreeUI pieces use current versions. Load Vanta's Three.js as a separate global and import the modern one as a module, so the two never share an instance.
- **Licensing.** ThreeUI has a paid tier. Check each chosen piece is free to use before building on it. ThreeUI also offers an MCP server that Claude Code can connect to for pulling component source.
- **Performance.** Only the current page and its neighbours should have live effects. Destroy Vanta instances and pause Three.js loops on pages that are out of view.
- **Illustrations.** Tenniel plates are line engravings, so they need to be cut into layers (character, props, background) in Figma or Photoshop before Claude Code can animate them. Plan for that prep time.

## Claude Code prompt

Export this doc as Markdown, save it in the project root as `screenplay.md`, then paste the prompt below into Claude Code. It builds in phases and stops for your review after each one.

```text
You are building a standalone, highly interactive 404 page shaped like an illustrated storybook, based on Alice's Adventures in Wonderland (Lewis Carroll, 1865) with John Tenniel's public domain illustrations. The full page-by-page screenplay is in ./screenplay.md. Read it fully before writing code. It has 23 pages, each with a scene, on-page text, an animation and interaction, and the library to use.

GOAL
A visitor lands on a missing page and "falls down the rabbit hole" with Alice. Each page has one living illustration, one short text block and one interaction. The story ends at a door that takes them home. It must feel crafted and calm, never slow or confusing.

STACK
- Vite + vanilla TypeScript. No React unless a component truly needs it.
- three (latest) as an ES module for all ThreeUI-based scenes.
- Vanta (github.com/tengbao/vanta) for FOG, CLOUDS and WAVES backgrounds. Vanta needs an older three.js. Load the version its README specifies as a separate global script, used only by Vanta. Never let Vanta and the modern three share an instance.
- Lenis (github.com/darkroomengineering/lenis) for smooth scroll and scroll progress.
- GSAP + ScrollTrigger for timelines, synced to Lenis.
- ThreeUI (threeui.com) for these pieces: Umbra clothbound 3D book (pages 1, 23), Typography Vortex (page 4), Generative Tree and Terrain Plume River (page 13), Orrery Labyrinth (page 17). Use the Sketchbook and Workshop Codex Shelf pages as references for page-turn feel, parchment texture and engraved style. If the ThreeUI MCP server is connected, use it to pull source. Adapt components to the storybook style, do not paste them as-is.

ARCHITECTURE
- A BookEngine that owns navigation, page state and the page-turn effect.
- Each page is its own module in /src/pages/page-XX.ts exporting { mount(el), unmount(), onEnter(), onLeave(), onProgress(p) }.
- Only the current page and its two neighbours are mounted. Everything else is unmounted, with Vanta instances destroyed, three.js geometries and textures disposed, and animation loops stopped.
- Lazy-load each page module with dynamic import.
- One shared WebGLRenderer for the modern three.js scenes where possible.
- site.config.ts holds the site name, home URL and main sections (label + URL). Pages 6, 12, 13 and 23 read links from it.

NAVIGATION
- A tall Lenis scroll container with the book pinned in view. Scroll progress maps to page index and snaps to the nearest page.
- Also support: arrow keys, clicking the left or right page edge, swipe on touch, and a row of small page dots.
- Deep link with #page-N.
- Page turns: a soft 3D paper curl, like the ThreeUI Sketchbook. Mobile shows a single page with a simpler slide-and-fold.
- Page 4 and 5 are special: while on them, scroll drives the fall instead of turning pages, then releases.

ALWAYS-ON UI
- A "Take me home" button fixed in a corner on every page, links to the home URL. This is non-negotiable: a lost visitor must be able to leave in one click.
- A small "Skip the story" link that jumps to page 23.
- A page counter, e.g. "Page 7 of 23".
- No sound.

404 DETAILS
- Read window.location.pathname. On page 5 the broken URL breaks into fragments that fall with the objects. On page 20 the same URL appears as the evidence on parchment.
- Page 12 has a text field "Where were you trying to go?" that fuzzy-matches against site.config.ts sections and suggests links.
- Clocks on page 3 show 4:04 and on page 16 show 6:04.
- Serve correct HTTP 404 status. Include a vercel.json or netlify _redirects example so any unknown route renders this page with a 404 code.

VISUAL STYLE
- Parchment background with subtle grain and vignette. Ink colour near #2B2118, accent red #9E2A2B for the Queen pages, muted gold for keys and watch.
- Typography: IM Fell English (Google Fonts) for story text, with a serif fallback stack. A clean sans for UI buttons only.
- Illustrations: Tenniel engravings in /public/illustrations/page-XX/ as bg.png, mid.png, fg.png layers (transparent PNG or SVG). Add gentle cursor parallax between layers. If a layer file is missing, render a labeled placeholder box so the build never breaks.
- Animations feel hand-made: spring easing, small overshoot, nothing mechanical. Keep motion purposeful.

ACCESSIBILITY
- All story text is real DOM text, not canvas.
- Respect prefers-reduced-motion: no WebGL, no parallax, static illustrations, simple crossfade between pages.
- Full keyboard support with visible focus. Announce page changes with an aria-live region.
- Alt text for every illustration, describing the scene.
- Colour contrast passes WCAG AA for all text.

PERFORMANCE
- Cap devicePixelRatio at 1.5. Pause rendering when the tab is hidden.
- On low-end or mobile devices (detect via hardwareConcurrency, deviceMemory or a quick FPS check), swap heavy WebGL scenes for static illustrated versions.
- First page interactive in under 2.5s on a mid-range phone. Initial JS under 200 KB gzipped, with page modules loaded on demand.

HOW TO WORK
Build in phases. After each phase, stop, run it locally, summarise what you built and anything you were unsure about, and wait for my go-ahead.
1. Shell: project setup, BookEngine, navigation, page turn, always-on UI, placeholder pages 1 to 23 with their text from screenplay.md.
2. Act 1, The Fall: pages 1 to 6.
3. Act 2, Wrong Sizes: pages 7 to 11.
4. Act 3, The Woods: pages 12 to 17.
5. Act 4, The Court and Home: pages 18 to 23.
6. Polish: reduced motion, mobile, performance pass, 404 hosting config, README with how to swap illustrations and edit site.config.ts.

RULES
- Use only the 1865 text and Tenniel's art. No Disney imagery, characters or song lyrics.
- Before using any ThreeUI piece, check it is free to use and tell me if it is not.
- Ask me before adding any library not listed above.
- If something in screenplay.md is not technically feasible, propose the closest alternative instead of silently changing it.
```

## Before you build

The illustration prep is the biggest task outside Claude Code, so start it first.

- [ ] Download the 23 Tenniel plates that match each page from Wikimedia Commons or Project Gutenberg
- [ ] Cut each plate into bg, mid and fg layers and export to /public/illustrations/page-XX/
- [ ] Confirm every ThreeUI piece you plan to use is in the free tier
- [ ] Decide the hosting platform (Vercel or Netlify) so the 404 status config is right
- [ ] Fill in site.config.ts with your real home URL and sections
- [ ] Export this doc as Markdown and save it as screenplay.md in the project root
- [ ] Optional: connect the ThreeUI MCP server to Claude Code

## Revisions (Oct 8, 2026, after technical review)

These override anything above that conflicts.

1. **No ThreeUI components.** Umbra book, Orrery Labyrinth, Generative Tree, Terrain Plume River, Water Ripple and Workshop Codex Shelf are all ThreeUI Pro, and the package is React-only. We build our own equivalents in vanilla TS:
   - Pages 1 and 23: CSS 3D clothbound book (cover opens/closes).
   - Page 4: our own 2D-canvas typography vortex (Typography Vortex is MIT and may be used as a reference).
   - Page 13: canvas branching tree that sways with the cursor, plus a painted river backdrop.
   - Page 17: SVG maze whose lit thread draws itself (stroke-dashoffset); the visitor can trace it.
   - Page 9: small custom ripple shader (or canvas fallback).
2. **No Vanta.** It pins an old three.js (r134). Fog (1, 12), clouds (2, 22) and waves (9) become small custom shaders on one modern `three` instance, or CSS where that is enough. Only one three.js version ships, and only pages that need it load it.
3. **Navigation is discrete.** Wheel, keys, swipe, edge clicks and dots each trigger one page turn. Lenis is used only on pages 4 and 5, where scroll drives the fall, then releases.
4. **Layout.** On desktop each of the 23 entries is a two-page spread: illustration on the left, text on the right. Pages 1 and 23 are the closed front and back covers. Mobile shows one page with a slide-and-fold turn.
5. **Hosting: Vercel.** The build emits `404.html`, which Vercel serves for unknown routes with a real 404 status. All asset paths are root-absolute. A rewrite in `vercel.json` would return 200, so we do not use one.
6. **Illustrations.** Two layers are enough where three is too much work (`bg` and `fg`; `mid` optional). Pages without a Tenniel plate (2, 4, 5, 13, 17, 22, covers) use type-led or ornamental compositions until art is chosen.
7. **Safety and access.** The broken URL is always inserted as text, never HTML, and truncated. Page 19's flash stays under 3 flashes per second. Every hover interaction has a tap and keyboard equivalent. Muted gold is decorative only, never text. The page carries `noindex`.

## Revisions (Oct 9, 2026, author's direction)

8. **Two buttons replace Take me home and Skip the story.** The always-on bar has "Begin at the beginning" (returns to page 1) and "Meet the designer" (jumps to page 23). There is no longer an always-visible link out of the book; the author page carries a quiet link to shreyasinha.co.in and an email link.
9. **Page 23 is Meet the Designer, not the back cover** (Shreya designed this edition; she did not write the story, so the page never calls her the author). An open spread: an engraved portrait of Shreya (generated from her portfolio photo by `tools/engrave-portrait.mjs`, saved as `public/illustrations/page-23/fg.webp`), a short bio from `src/author.ts`, the "different person then" quote as an epigraph, and "Begin at the beginning". The book ends open; there is no closing-book animation.
10. **The front cover is whimsical, not a plain red cloth.** Midnight violet-to-teal binding, gold tooling, a striped Cheshire-grin moon with blinking eyes, enamel card-suit corners, vines with red and white roses, toadstools, a pocket watch at 4:04, a steaming teacup, twinkling coloured sparkles, and a holographic sheen that follows the cursor (`src/pages/cover-art.ts`).
11. **The room behind the book is interactive.** One canvas scene per act (fog, wrong-sized objects, branches and leaves, cards and petals), stirred by the cursor and gusted by page turns (`src/backdrop/`).
12. **Every page is fantastical, not plain parchment.** Each act has a palette (violet and teal, rose and mint, moss and saffron, crimson and blush) used for watercolour washes in the page corners, a gilt frame with enamel gems and twinkling sparkles, a ribbon act label, a gilded opening initial and gilt page edges (`src/styles/fantastical.css`). Scenes are hand-tinted: ink outlines with mottled watercolour fills.
13. **Illustrations are Tenniel's own plates, hand-tinted.** The first drawn-in-code scenes looked like children's clip art, so every page with a Tenniel plate now uses that plate: the ink exactly as engraved, with loose watercolour washes underneath in each act's palette (`tools/tint-plates.mjs`, `tools/plates.json`, source plates in `tools/tenniel/`). Pages Tenniel never illustrated get engraved-style compositions instead of cartoons: page 2 is an engraved chapter frontispiece, page 4 an engraved well, page 5 hatched objects in muted tints.
14. **No Lenis.** The fall on pages 4 and 5 is driven by the BookEngine's own scroll capture with eased progress (`scrollLength` on a page module); it needed no extra library.
15. **The doors (page 6) and signposts (page 13) link to the portfolio**, as confirmed.
16. **Art direction follows the "For 404 page" Pinterest board (Oct 10, 2026).** Riso and screen-print illustration: textures made of directional strokes (flow fields), limited saturated palettes (cobalt, lime and deep green, rose, vermilion and purple), flat silhouettes, glowing focal points, paper grain, and lines that "boil" a few times a second like hand-drawn animation. Scenes are drawn live in canvas (`src/riso/`) and react to the cursor. Tenniel's figures appear as silhouettes made from his own line work (`tools/silhouette.mjs`); the White Rabbit is a vector silhouette in his plate-02 pose. The hand-tinted plates (`tools/tint-plates.mjs`) are kept for possible use but no longer shown.
17. **Music (replaces "No sound").** Simple generative music in the Web Audio API (`src/audio/music.ts`): a music box over a soft pad, a different mode per act, plus quiet page-turn and interaction sounds. It starts only after the visitor's first interaction, can be turned off from the top bar, and that choice is remembered.
18. **Scenes are printed, not painted (Oct 10, 2026).** The first riso pass used flat vector shapes (a rabbit built from ellipses) in boxed panels. Pages 2 to 6 now draw through a riso press (`src/print/`, adapted from the MIT-licensed "animate" skill's riso kit): three grey plates per scene (cobalt, fluorescent pink, yellow), screened into halftone dots at their own angles in a WebGL pass, overprinted, slightly off register, with a few dropout specks. Wherever there is no ink the print is transparent, so every illustration prints straight onto the page's parchment and fades out at an irregular edge in shrinking dots; no frames. Marks are organic: tapered brush ribbons with pressure, leaf-shaped dabs for texture, wobbled hand-drawn outlines. Tenniel's figures are printed from his own engraved line work (`tools/figure.mjs`): the White Rabbit (plate 02) and Alice at the curtain (plate 03), knocked out to paper and hand-coloured in loose ink washes.
19. **Error 404 is prominent (Oct 10, 2026).** The cover is now printed in the same riso press as the pages: a midnight cloth with a gilt border, a striped Cheshire-grin moon whose eyes follow the cursor, twinkling stars, Tenniel's Rabbit hurrying along the bottom, and a giant printed **404** whose 0 is the Rabbit's pocket watch at 4:04 (clicking shakes printed stars out of the book). The top bar carries a large riso-style "404" badge, and a giant outlined 404 sits faintly in the room behind the book.
20. **Spreads are illustrated edge to edge.** One printed scene runs across both pages, with the copy in a clearing the picture leaves for it, guarded by a parchment halo so it is never hidden. Things leap out of the book into the room (leaves, brush flicks, jars and clocks, lantern dust, stars) on an overlay above it (`src/print/escape.ts`).
21. **The room follows the open page.** Each page sets the room's colours and a backdrop scene that echoes it (willow leaves for the riverbank, a cobalt swirl for the Rabbit, lantern dust for the hall).
22. **Pagination is a journey.** A winding dotted path with a printed stop per page (book, watches, bottles, toadstools, hearts, star); Tenniel's Rabbit hops along it to the current page; hand-drawn arrows; the count reads "page vii of xxiii".
23. **Skills installed:** "animate" (cth9191), "anidoodle" (alexgreensh, Apache-2.0) and "lemo-opuscar" (lemomo-ai, MIT). Anidoodle's riso and interactive-web guidance informed the press and the baked sprites; Lemo-Opuscar is for rendered films and is not used in the site.
24. **The hall's doors are haunted, and open onto the real portfolio (Oct 10, 2026).** On page 6 the four doors lead to the matching sections of shreyasinha.co.in: Work (`/#work`), About (`/#about`), Process (`/#process`) and Contact (`/#contact`). They are dark iron-strapped planks with cobwebs, a candlelit keyhole and a barred peephole where yellow eyes blink and glance about. On hover a door creaks ajar onto darkness and the eyes dart away. In the printed hall, eyes peer out of the far doors wherever the lantern isn't shining.
25. **Act 2, Wrong Sizes (pages 7 to 11), is built.** Page 7, DRINK ME: the bottle tilts toward the cursor, and clicking it shrinks the whole book and spills potion out. Page 8, EAT ME: clicking the cake sends Alice up through the ceiling with a bump, and the quote swells past its lines before reflowing. Page 9: a pool of tears with cursor ripples, falling tears and splashes. Page 10: a Caucus Race of brush-drawn birds and the Rabbit; clicking stops it for a cheer and comfits burst out. Page 11: the book shakes on arrival, the chimney kicks Bill out of the book, and a "Try another page" sign pops up.
26. **The buttons have whimsy.** "Begin at the beginning" is the Rabbit's pocket watch, whose hands run backwards on hover. "Meet the designer" is a luggage tag on a string. Music notes float up while it plays. "Open the book" has a golden key that turns.
27. **Hints and type (Oct 10, 2026).** Each interactive page carries a short italic hint under the copy, with a little twinkling wand (e.g. "Tap the little cake, if you dare"); the cover has one too. The Music and Begin at the beginning labels are set in IM Fell English small caps to match the book. Alice on the EAT ME page is re-cut from plate 05 with her whole skirt, both arms and both feet.
28. **The copy's backing melts into the picture (Oct 10, 2026).** The press's clearing is one smooth blurred fade (it used to be seven stepped rings). Behind the copy, the parchment is solid under every line, small print included, with only its outer edge blurred away, so it no longer reads as a card with a shadow. The copy box grows with its words.
29. **Alice grows out of the book.** Clicking the cake on page 8 makes Alice burst up out of the book into the room, past the top of the book, with her face kept on screen. She bumps the book, sways, then shrinks back into her page.
30. **The story adds up (Oct 10, 2026).** Every page, cover included, now opens with a line of narration in italics before Carroll's words, saying what has just happened (e.g. page 9: she grew to nine feet, cried a pool, shrank and fell in). The copy has one consistent vertical rhythm.
31. **Doors.** Work → `#work` ("Products built. Problems solved."), About → `#about-title` ("About me"), Process → `#process` ("How I work"), Contact → `#contact`. The doors are printed in the same riso press as the pictures (overprinted planks, iron straps and rivets, a candlelit keyhole, a cobweb), with printed eyes that blink and peer from the peephole.
32. **Page numbers** sit in one place on every spread: the bottom outer corner of the right-hand page (bottom centre on phones), on a soft parchment wash over pictures.
33. **The designer page.** Her contact details sit under the portrait with generous spacing (on phones, at the end of the text); "Begin at the beginning" is pinned to the foot of the page. Hovering (or tapping) her portrait bursts riso-printed flowers of six kinds and paper confetti out from behind her and out of the book, with a gold glint in her eyes.
34. **Act 3, The Woods (pages 12 to 17), is built.** 12: the Caterpillar's smoke spells "Who are you?", and a box asks where you were going and suggests the right pages. 13: trees grow and lean from the cursor; the signposts are links to the case studies. 14: the grin comes first, then the Cat, whose eyes follow you. 15: hover and he vanishes tail first until only the grin is left; click brings him back. 16: clocks stopped at six; "Move down!" shifts the cups along and tips the last one out of the book. 17: trace the golden thread to the door in the tree (or knock), and the door opens onto the next page.
35. **Reliability.** Every printed scene now releases its WebGL context when its page is put away, and the sprite press rebuilds itself if the browser drops it; this is what had left the cover's stars (and other flying sprites) blank after a few page turns. The cover's stars are bigger and slower, and show (fading in place) with reduced motion too.
36. **Fixes (Oct 11, 2026).** The cover's "Open the book" turns the page at once. Every page turn now finishes on time whatever the frame rate (animations follow the wall clock, and a turn that stalls snaps to its end), which is what had left the cover stuck. The cover's tap-for-stars hint is gone. The Cheshire Cat's eyes follow the cursor even outside the book; he fades out tail-first into soft, edgeless washes (no leaves), leaving the grin. The golden thread is fine and dashed until traced, then bold, gold and glowing. The pagination Rabbit is a crisp drawing (waistcoat, watch, pink eye) instead of a blurred print. The designer's hair blows in a breeze while her portrait is hovered.
37. **Act 4, The Court (pages 18 to 22), is built.** 18: brush over the white roses and they're painted red, stroke by stroke, dripping paint out of the book. 19: the spread flushes red, the words shake, and a red wax seal stamped 404 slams down (click for more). 20: the herald's trumpet sounds (notes fly out), his scroll unrolls with the reader's broken URL as Exhibit A, and the jury scribbles on their slates. 21: a storm of printed cards whirls across both pages and settles into a deck (click to throw them up again). 22: waking: fog clears to golden evening on the riverbank of page 2; the willow sways slower and slower; the last leaves drift out of the book. The whole book is now built.
38. **The story ends before the designer page (Oct 11, 2026).** On page 22, once the fog clears, "The End" prints itself in gold across the river with a curling flourish, the music settles into a falling cadence, and sparkles drift out; then a little sign pops up, "Who made this book?", which turns to the last page. Page 22 now closes with "And so the dream ended, where it began." The designer page is labelled as the book's colophon ("Colophon · this edition was designed by"), so it reads as back matter rather than another page of the story.
39. **Phones (Oct 11, 2026).** Nothing is cut off any more: the words half of each page scrolls when a page's words run long, the page number sits at its foot, and the signposts lay out two to a row. A sideways drag on a picture (brushing the willow, tracing the thread, painting a rose) no longer turns the page; swipes on the words or margins still do, and on the falling pages a drag anywhere is still the fall. Nothing fires on its own any more: the Queen's seal, the herald's trumpet, the card storm and the shake in the Rabbit's house all wait for a tap.
