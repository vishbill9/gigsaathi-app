// Entry point: wires every module together and loads the worker's saved data from the database.
import { S, persist } from './state.js';
import { HTML_LANG } from './i18n.js';
import { $, toast } from './util.js';
import { loadRemote } from './api.js';
import { initTabs, updateTabLabels } from './tabs.js';
import { mkBox, mkChips } from './chat.js';
import { initLedger, renderLedger } from './ledger.js';
import { initMood } from './mood.js';
import { initSurprise } from './surprise.js';
import { initDocs } from './docs.js';
import { initGrievance } from './grievance.js';
import { initSchemes } from './schemes.js';
import { initSos, renderSos } from './sos.js';
import { initHero, renderHero } from './hero.js';
import { initEasterEgg } from './fx.js';

const CHIPS = {
  earnings: ['Explain my week', 'Which day was my worst and why?', 'How can I cut my fuel cost?'],
  safety: ['Tips for night deliveries', 'I had a small accident, what now?', 'Heavy rain and I still have orders'],
  rights: ['What is e-Shram and how do I register?', 'Am I eligible for the PM-SYM pension?', 'Health insurance for gig workers'],
};

function applyLang() {
  document.documentElement.lang = HTML_LANG[S.lang];
  updateTabLabels();
  renderHero();
  renderSos();
}

function applyEasyMode() {
  document.body.classList.toggle('big', S.big);
  $('#big').setAttribute('aria-pressed', String(S.big));
}

initTabs();
mkBox('buddy', 'Chat with Saathi', 'Tell Saathi anything');
mkBox('earnings', 'Ask about your earnings', 'Ask about your earnings');
mkBox('safety', 'Ask a safety question', 'Ask a safety question');
mkBox('rights', 'Ask about schemes and rights', 'Ask about schemes and rights');
mkBox('docs', 'Ask a follow-up about the document', 'Ask a follow-up');
mkBox('grievance', 'Answer questions or add details', 'Answer questions or add details');
for (const [mod, items] of Object.entries(CHIPS)) mkChips(mod, items);

initLedger();
initMood();
initSurprise();
initDocs();
initGrievance();
initSchemes();
initSos();
initHero();
initEasterEgg();

$('#lang').value = S.lang;
applyLang();
applyEasyMode();

$('#lang').addEventListener('change', e => {
  S.lang = e.target.value;
  persist('lang');
  applyLang();
});
$('#big').addEventListener('click', () => {
  S.big = !S.big;
  persist('big');
  applyEasyMode();
  toast(S.big ? 'Easy mode on: bigger text and replies read aloud' : 'Easy mode off');
});

if (!(await loadRemote())) toast('Could not load your saved data. Please check your connection.');
renderLedger();
document.dispatchEvent(new CustomEvent('data:changed'));
