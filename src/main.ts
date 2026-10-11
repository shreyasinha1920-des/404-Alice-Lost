import './styles/base.css';
import './styles/book.css';
import './styles/ui.css';
import './styles/fantastical.css';
import './styles/ctas.css';
import gsap from 'gsap';
import { BookEngine } from './engine/BookEngine';
import { bindInput } from './engine/input';
import { createChrome } from './ui/chrome';
import { Backdrop } from './backdrop/Backdrop';
import { story } from './story';
import { music } from './audio/music';

const app = document.getElementById('app')!;
const stage = app.querySelector<HTMLElement>('.stage')!;

const backdrop = new Backdrop(app);

const pageFromHash = () => {
  const match = /^#page-(\d+)$/.exec(location.hash);
  return match ? Number(match[1]) : 1;
};

// Animations follow the wall clock: a slow frame shouldn't stretch a one-second page turn out to ten.
gsap.ticker.lagSmoothing(0);

const engine = new BookEngine({
  host: stage,
  onTurnStart(_from, to, dir) {
    backdrop.setPage(to, story[to - 1].act);
    backdrop.gust(dir);
    music.setAct(story[to - 1].act);
    music.turn();
  },
  onChange(n) {
    backdrop.setPage(n, story[n - 1].act);
    music.setAct(story[n - 1].act);
    chrome.update(n);
    const hash = n === 1 ? '' : `#page-${n}`;
    if (location.hash !== hash) {
      // replaceState keeps the history clean: Back leaves the 404 rather than flipping pages.
      history.replaceState(null, '', location.pathname + location.search + hash);
    }
  },
});
const chrome = createChrome(app, engine);
bindInput(engine, stage);

addEventListener('hashchange', () => engine.goTo(pageFromHash()));

engine.start(pageFromHash()).then(() => document.documentElement.classList.add('is-ready'));
