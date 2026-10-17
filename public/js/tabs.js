// Accessible tab list (WAI-ARIA tabs pattern): roving tabindex and arrow-key navigation.
import { S } from './state.js';
import { T, TAB_IDS, TAB_ICONS } from './i18n.js';
import { $ } from './util.js';

export function showTab(id) {
  for (const tabId of TAB_IDS) {
    const selected = tabId === id;
    const tab = $(`#t-${tabId}`);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(`#s-${tabId}`).hidden = !selected;
    if (selected) tab.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }
}

export function updateTabLabels() {
  for (const id of TAB_IDS) $(`#t-${id}`).textContent = `${TAB_ICONS[id]} ${T[S.lang].tabs[id]}`;
}

export function initTabs() {
  const nav = $('#tabs');
  const last = TAB_IDS.length - 1;
  for (const id of TAB_IDS) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `t-${id}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `s-${id}`);
    tab.addEventListener('click', () => showTab(id));
    tab.addEventListener('keydown', e => {
      const i = TAB_IDS.indexOf(id);
      const target = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
      if (target === undefined) return;
      e.preventDefault();
      showTab(TAB_IDS[target]);
      $(`#t-${TAB_IDS[target]}`).focus();
    });
    nav.append(tab);
  }
  updateTabLabels();
  showTab('saathi');
}
