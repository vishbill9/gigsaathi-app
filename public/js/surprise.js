// Surprise generator, jokes and "hype me up".
import { S } from './state.js';
import { $, md } from './util.js';
import { splitAnswer } from './logic.js';
import { chatText } from './api.js';
import { confetti, setMascot } from './fx.js';
import { ask } from './chat.js';
import { speak } from './voice.js';

const TYPES = ['JOKE', 'COUPLET', 'FACT', 'RIGHT', 'RIDDLE', 'CHALLENGE'];

export async function surprise(type = 'RANDOM', extra = '') {
  const kind = type === 'RANDOM' ? TYPES[Math.floor(Math.random() * TYPES.length)] : type;
  const card = $('#surpriseCard');
  card.hidden = false;
  card.textContent = '🎁 Unwrapping…';
  setMascot('🎁');

  let text;
  try {
    const seed = Math.random().toString(36).slice(2, 7);
    const prompt = `Type: ${kind}. Surprise me! Make it fresh (seed ${seed}).${extra ? ` The user also said: ${extra}` : ''}`;
    ({ text } = await chatText('surprise', [{ role: 'user', content: prompt }]));
  } catch (e) {
    card.textContent = e.message || 'Could not reach the AI right now. Please try again in a moment.';
    return;
  }

  const [body, answer] = splitAnswer(text);
  card.innerHTML = `<div>${md(body)}</div>`
    + (answer ? `<div class="row"><button type="button" class="btn primary" data-act="reveal">👀 Reveal the answer</button></div><p data-role="answer" hidden><b>${md(answer)}</b></p>` : '')
    + '<div class="row wrap"><button type="button" class="btn soft" data-act="again">🎁 Another one</button><button type="button" class="btn ghost" data-act="share">Share on WhatsApp</button></div>';

  card.querySelector('[data-act=reveal]')?.addEventListener('click', e => {
    card.querySelector('[data-role=answer]').hidden = false;
    e.currentTarget.hidden = true;
    confetti(60);
  });
  card.querySelector('[data-act=again]').addEventListener('click', () => surprise());
  card.querySelector('[data-act=share]').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  confetti(50);
  setMascot('🥳');
  if (S.big) speak(text);
}

export function initSurprise() {
  $('#btnSurprise').addEventListener('click', () => surprise());
  $('#btnJoke').addEventListener('click', () => surprise('JOKE'));
  $('#btnHype').addEventListener('click', () => {
    confetti(80);
    setMascot('🔥');
    ask('buddy', 'Hype me up! Use my numbers this week, make me proud and smile, and add one funny line about gig life.');
  });
}
