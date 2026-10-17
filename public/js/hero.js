// Hero: greeting plus "just talk": one box (or the mic) that routes to the right module.
import { S } from './state.js';
import { T } from './i18n.js';
import { $ } from './util.js';
import { streak } from './logic.js';
import { listen } from './voice.js';
import { routeText } from './api.js';
import { showTab } from './tabs.js';
import { ask } from './chat.js';
import { logFromText } from './ledger.js';
import { surprise } from './surprise.js';

const TAB_FOR = { earnings: 'earnings', safety: 'safety', rights: 'rights', docs: 'docs', grievance: 'grievance', surprise: 'saathi', buddy: 'saathi' };

export function renderHero() {
  const hour = new Date().getHours();
  const t = T[S.lang];
  const greeting = t.greet[hour < 12 ? 0 : hour < 17 ? 1 : 2];
  const days = streak(S.ledger);
  $('#greet').textContent = days >= 2 ? `${greeting} 👋  🔥 ${t.streak(days)}` : `${greeting} 👋`;
  $('#tagline').textContent = t.tagline;
}

async function talk(text) {
  const message = text.trim();
  if (!message) return;
  $('#heroText').value = '';
  const route = await routeText(message);
  showTab(TAB_FOR[route.module] ?? 'saathi');
  if (route.log) {
    $('#entryText').value = message;
    await logFromText(message);
    return;
  }
  if (route.module === 'surprise') return surprise('RANDOM', message);
  await ask(route.module, message);
}

export function initHero() {
  $('#heroForm').addEventListener('submit', e => { e.preventDefault(); talk($('#heroText').value); });
  $('#heroMic').addEventListener('click', () => listen($('#heroText'), $('#heroMic'), talk));
  document.addEventListener('data:changed', renderHero);
}
