/**
 * The 23 pages of the storybook, from screenplay.md.
 * Quotes are from the 1865 text of Alice's Adventures in Wonderland (public domain).
 */
export type Act = 'The Fall' | 'Wrong Sizes' | 'The Woods' | 'The Court and Home';

/** Short keys for CSS hooks: html[data-act], .spread[data-act]. */
export const ACT_KEY: Record<Act, 'fall' | 'sizes' | 'woods' | 'court'> = {
  'The Fall': 'fall',
  'Wrong Sizes': 'sizes',
  'The Woods': 'woods',
  'The Court and Home': 'court',
};

export interface StoryPage {
  n: number;
  act: Act;
  /** Short name, used in the page-change announcement. */
  title: string;
  /** What has just happened, in a sentence or two, so the story follows from page to page. */
  bridge?: string;
  /** Carroll's words. Each entry is its own paragraph. */
  quote: string[];
  /** Our 404 line, set apart from the quote. */
  line?: string;
  /** What the illustration shows; used as placeholder label and alt text. */
  alt: string;
  /** The interaction this page will have, shown on placeholders during development. */
  interaction: string;
  /** A small nudge shown under the copy, telling the reader what to try. */
  hint?: string;
  /** Front or back cover rather than a spread. */
  cover?: 'front';
}

export const story: StoryPage[] = [
  {
    n: 1, act: 'The Fall', cover: 'front',
    title: 'Cover',
    bridge: 'Once, a girl named Alice followed a White Rabbit down a hole and lost her way. Open the book, and follow her.',
    quote: [],
    line: 'The page you wanted has wandered off.',
    alt: 'A closed clothbound book, its gilt title stamped on the cover, resting in drifting fog.',
    interaction: 'Book tilts with the cursor. Click or scroll to open the cover.',
  },
  {
    n: 2, act: 'The Fall',
    title: 'The riverbank',
    bridge: 'One drowsy afternoon, Alice sat on the riverbank beside her sister, who was reading a book.',
    quote: ['“What is the use of a book without pictures or conversations?”'],
    line: 'You were looking for something. It isn’t here.',
    alt: 'An afternoon riverbank printed in greens: a weeping willow of hanging lime strands, its reflection broken in the water, and Alice and her sister sitting in silhouette on the bank.',
    interaction: 'The cursor is a breeze through the willow. Click the water for ripples. A white rabbit sometimes dashes along the far bank.',
    hint: 'Brush through the willow, and tap the river.',
  },
  {
    n: 3, act: 'The Fall',
    title: 'The White Rabbit',
    bridge: 'Then a White Rabbit with pink eyes ran close by her, took a watch out of its waistcoat pocket, and hurried on.',
    quote: ['“Oh dear! Oh dear! I shall be too late!”'],
    line: 'You followed a link. So did she.',
    alt: 'The White Rabbit in silhouette, white with a pink waistcoat and a gold pocket watch, standing in a swirling field of cobalt strokes.',
    interaction: 'He dashes in, looks round when you come near, and hops when clicked, rippling the field. His watch reads 4:04.',
    hint: 'Creep up behind the Rabbit, or give him a tap.',
  },
  {
    n: 4, act: 'The Fall',
    title: 'Down the rabbit hole',
    bridge: 'Burning with curiosity, she ran after it and popped down a large rabbit hole under the hedge.',
    quote: ['Down, down, down. Would the fall never come to an end?'],
    alt: 'A tunnel of cobalt strokes spiralling into darkness, with the White Rabbit tumbling down it and jars, clocks and books flying past.',
    interaction: 'Scroll to fall: the tunnel rushes toward you and the Rabbit tumbles away. Click to drop a golden key after him.',
  },
  {
    n: 5, act: 'The Fall',
    title: 'Falling',
    bridge: 'The hole went straight down, and she fell past cupboards and bookshelves, jars and maps.',
    quote: ['“I wonder how many miles I’ve fallen by this time?”'],
    alt: 'The walls of a deep well, hatched in cobalt and lined with shelves, with jars, clocks, books and gold tags drifting past under the stars.',
    interaction: 'Things drift past as you fall; click one to catch it. Your broken link floats by in pieces.',
  },
  {
    n: 6, act: 'The Fall',
    title: 'The hall of doors',
    bridge: 'At last she landed on a heap of sticks and dry leaves, in a long, low hall lit by lamps.',
    quote: ['There were doors all round the hall, but they were all locked.'],
    alt: 'A dark hall lit by lantern light, with arched doors along the far wall, and Alice in silhouette at a rose curtain, lit by a small glowing door behind it.',
    interaction: 'The cursor is a lantern. Hovering a door below the text lights its twin in the hall.',
    hint: 'Carry the lantern about. Each door opens somewhere real.',
  },
  {
    n: 7, act: 'Wrong Sizes',
    title: 'Drink me',
    bridge: 'Behind a curtain she found a little door, far too small for her, and on a glass table, a bottle.',
    quote: ['DRINK ME'],
    line: 'Maybe you’re just too small for this page.',
    alt: 'Alice holds a little bottle with a paper label tied around its neck reading DRINK ME.',
    interaction: 'Click the bottle and the whole page shrinks, then eases back.',
    hint: 'Tap the bottle. It isn’t marked poison.',
  },
  {
    n: 8, act: 'Wrong Sizes',
    title: 'Eat me',
    bridge: 'She drank, and shut up like a telescope, ten inches high, but she had left the key up on the table. So she ate a little cake…',
    quote: ['“Curiouser and curiouser!”'],
    alt: 'Alice has grown enormously tall, her neck stretched so high her head nearly touches the ceiling.',
    interaction: 'Click the cake and the illustration grows past the page edges; the text overflows, then reflows.',
    hint: 'Tap the little cake, if you dare.',
  },
  {
    n: 9, act: 'Wrong Sizes',
    title: 'The pool of tears',
    bridge: '…and shot up to nine feet tall. Too big for the door, she cried until a pool of tears spread round her. Then she shrank again, slipped, and fell into it, splash.',
    quote: ['“I wish I hadn’t cried so much!”'],
    line: 'Don’t worry. Broken links happen to everyone.',
    alt: 'Alice swims in a pool of her own tears; big tears fall and ripple across the water.',
    interaction: 'Water fills the lower page. Your cursor makes ripples; Alice and the mouse bob.',
    hint: 'Trail through the water, and tap to splash.',
  },
  {
    n: 10, act: 'Wrong Sizes',
    title: 'The Caucus Race',
    bridge: 'She swam ashore with a crowd of birds and beasts, all dripping wet. To get them dry, the Dodo proposed a race.',
    quote: ['“Everybody has won, and all must have prizes.”'],
    alt: 'The Dodo hands Alice a thimble while the creatures crowd round; beside them, birds and the White Rabbit run round and round a ring of footprints.',
    interaction: 'Animals run in an endless loop. Click and they all stop and cheer.',
    hint: 'Tap anywhere to stop the race.',
  },
  {
    n: 11, act: 'Wrong Sizes',
    title: 'The Rabbit’s house',
    bridge: 'The White Rabbit came looking for his gloves and fan, took her for his housemaid, and sent her to his house. There she drank from another bottle, and grew, and grew.',
    quote: ['“Mary Ann! Mary Ann!”'],
    line: 'Too big for this page. Let’s try another.',
    alt: 'Alice, grown huge inside the White Rabbit’s house, reaches an enormous hand out over the cucumber frame; beside it, a smoking chimney.',
    interaction: 'Her arm bursts out of the window, the page shakes gently, and the next-page button appears through the chimney.',
    hint: 'Something’s stuck up the chimney. Tap it.',
  },
  {
    n: 12, act: 'The Woods',
    title: 'The Caterpillar',
    bridge: 'Little cakes thrown through the window shrank her back down, and she ran off into the wood. On top of a mushroom sat a large blue Caterpillar.',
    quote: ['“Who are you?”'],
    alt: 'A large blue caterpillar sits on top of a mushroom smoking a long hookah, looking down at Alice.',
    interaction: 'Smoke rises and forms the question. A field asks where you were trying to go and suggests pages.',
    hint: 'Tap the Caterpillar for a smoke ring, then tell him where you were going.',
  },
  {
    n: 13, act: 'The Woods',
    title: 'The wood',
    bridge: '“One side will make you grow taller, and the other side will make you grow shorter.” With a nibble of mushroom she found her own size again, and walked on.',
    quote: ['…as she wandered about in the wood.'],
    alt: 'A tangled wood with signposts pointing in every direction.',
    interaction: 'Trees grow and sway with the cursor. Each signpost is a link.',
    hint: 'Wave through the trees. Every signpost leads somewhere real.',
  },
  {
    n: 14, act: 'The Woods',
    title: 'The Cheshire Cat',
    bridge: 'In the branches of a tree sat the Cheshire Cat, grinning from ear to ear.',
    quote: [
      '“Would you tell me, please, which way I ought to go from here?”',
      '“That depends a good deal on where you want to get to,” said the Cat.',
    ],
    alt: 'The Cheshire Cat grins down at Alice from the branch of a tree.',
    interaction: 'The grin fades in before the body. The cat’s eyes follow the cursor.',
    hint: 'Look around: he’s watching you. Tap for a grin.',
  },
  {
    n: 15, act: 'The Woods',
    title: 'The grin',
    bridge: 'He told her which way the Hatter lived, and which way the March Hare, and that they were both mad. Then he began to vanish.',
    quote: ['“We’re all mad here.”'],
    alt: 'Only the Cheshire Cat’s grin remains, floating among the branches.',
    interaction: 'Hover and the cat vanishes piece by piece until only the grin floats. Click brings him back.',
    hint: 'Hover over the Cat to watch him vanish. Tap to bring him back.',
  },
  {
    n: 16, act: 'The Woods',
    title: 'The Mad Tea Party',
    bridge: 'She came to the March Hare’s house, where a tea table was set out under a tree.',
    quote: ['“Why is a raven like a writing-desk?”'],
    line: 'It’s always six o’clock now.',
    alt: 'The Hatter, the March Hare and the sleeping Dormouse crowd one end of a long tea table under a tree.',
    interaction: 'The table turns slowly. Every clock is stuck at 6:04. “Move down” shifts everyone one seat.',
    hint: 'Shout “Move down!” and everyone shifts along.',
  },
  {
    n: 17, act: 'The Woods',
    title: 'The door in the tree',
    bridge: '“The stupidest tea party I ever was at in all my life!” She walked off into the wood, and noticed a tree with a door in it.',
    quote: ['“There’s a door leading right into it.”'],
    line: 'There’s a way out. There always is.',
    alt: 'A small door set into the trunk of a great tree.',
    interaction: 'A glowing thread draws itself through a maze toward the tree door. You can trace it.',
    hint: 'Trace the golden thread to the door, or just knock.',
  },
  {
    n: 18, act: 'The Court and Home',
    title: 'Painting the roses',
    bridge: 'The door led back to the hall. This time she took the little key, nibbled the mushroom down to size, and stepped into the lovely garden at last.',
    quote: ['“Would you tell me why you are painting those roses?”'],
    alt: 'Three playing-card gardeners, Two, Five and Seven, hurriedly paint the white roses on a rose tree red.',
    interaction: 'Hover over white roses to paint them red, one stroke at a time.',
    hint: 'Brush over the white roses to paint them red, before the Queen sees.',
  },
  {
    n: 19, act: 'The Court and Home',
    title: 'The Queen of Hearts',
    bridge: 'Then came the Queen, with her soldiers and courtiers and the royal children, all in a long procession.',
    quote: ['“Off with her head!”'],
    alt: 'The Queen of Hearts points and shouts, the King and the court behind her, while Alice stands her ground.',
    interaction: 'The page flushes red, the text shakes, and 404 stamps across it like a royal seal.',
    hint: 'Tap anywhere for the royal seal. She has plenty.',
  },
  {
    n: 20, act: 'The Court and Home',
    title: 'The trial',
    bridge: 'Someone had stolen the Queen’s tarts, and the Knave of Hearts stood trial for it.',
    quote: ['“Begin at the beginning, and go on till you come to the end: then stop.”'],
    alt: 'The White Rabbit, as herald, blows a trumpet and unrolls a parchment scroll: the evidence.',
    interaction: 'The evidence is your broken URL, written out on parchment. The jury scribbles.',
    hint: 'Tap the Rabbit\'s trumpet. The evidence is the link that brought you here.',
  },
  {
    n: 21, act: 'The Court and Home',
    title: 'A pack of cards',
    bridge: 'Called as a witness, Alice had been growing all through the trial, and now she was her full size.',
    quote: ['“You’re nothing but a pack of cards!”'],
    alt: 'The whole pack of cards rises into the air and comes flying down upon Alice.',
    interaction: 'The cards burst into a storm across both pages, then settle into a deck.',
    hint: 'Tap to throw the whole pack in the air again.',
  },
  {
    n: 22, act: 'The Court and Home',
    title: 'Waking',
    bridge: 'The whole pack rose into the air and came flying down upon her. She gave a little scream, and found herself lying on the bank.',
    quote: ['“Wake up, Alice dear!”'],
    line: 'And so the dream ended, where it began.',
    alt: 'Golden evening on the riverbank, under the willow, as Alice wakes and the last leaves drift down.',
    interaction: 'Leaves drift down. Everything slows. The fog clears to warm light.',
    hint: 'Tap the willow to shake loose the last leaves.',
  },
  {
    n: 23, act: 'The Court and Home',
    title: 'Meet the designer',
    quote: ['\u201CIt\u2019s no use going back to yesterday, because I was a different person then.\u201D'],
    alt: 'An engraved portrait of Shreya Sinha, who designed this edition, looking back over her shoulder, her long dark hair falling past her shoulders.',
    interaction: 'The designer\u2019s portrait and a short note about her, with a way back to the first page.',
  },
];

export const PAGE_COUNT = story.length;
