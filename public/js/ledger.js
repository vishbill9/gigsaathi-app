// Earnings ledger: voice/text entry, stats, sparkline, badges and celebrations. Data lives in the server database.
import { S } from './state.js';
import { $, esc, inr, toast } from './util.js';
import { badges, costShare, isoDay, net, sparkBars, totals } from './logic.js';
import { confetti, setMascot } from './fx.js';
import { listen } from './voice.js';
import { parseEntry, saveEntry, removeEntry, deleteAllData } from './api.js';

const dataChanged = () => document.dispatchEvent(new CustomEvent('data:changed'));

export function renderLedger() {
  const t = totals(S.ledger);
  const stats = [
    ['Net earned', inr(t.net), 'main'],
    ['Income', inr(t.income), ''],
    ['Costs', inr(t.cost), ''],
    ['Net per order', t.orders ? inr(t.net / t.orders) : '–', ''],
    ['Net per hour', t.hours ? inr(t.net / t.hours) : '–', ''],
  ];
  $('#stats').innerHTML = stats.map(([k, v, cls]) => `<div class="stat ${cls}"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  $('#reality').textContent = t.income
    ? `Out of every ₹100 you earn, about ₹${costShare(t)} goes to fuel and costs.${t.hours ? ` Your real pay is ${inr(t.net / t.hours)} an hour.` : ''}`
    : 'Add your first day below and your numbers will appear here.';

  $('#badges').innerHTML = badges(S.ledger).map(b => `<li>${esc(b)}</li>`).join('');

  const bars = sparkBars(S.ledger, 7);
  const label = bars.map(b => `${b.date.slice(5)} ${inr(b.net)}`).join(', ');
  const W = 44;
  $('#spark').innerHTML = bars.length
    ? `<svg viewBox="0 0 ${bars.length * W} 76" role="img" aria-label="Net earnings per day: ${esc(label)}">${bars.map((b, i) => {
      const h = Math.max(3, b.h * 54);
      return `<rect class="bar" x="${i * W + 7}" y="${60 - h}" width="30" height="${h}" rx="6"><title>${esc(b.date.slice(5))}: ${inr(b.net)}</title></rect><text class="lbl" x="${i * W + 22}" y="73" text-anchor="middle">${esc(b.date.slice(8))}</text>`;
    }).join('')}</svg>`
    : '<p class="hint">Your chart appears after your first entry.</p>';

  const head = '<caption>All your days, newest first</caption><tr><th scope="col">Date</th><th scope="col">App</th><th scope="col">Orders</th><th scope="col">Income</th><th scope="col">Costs</th><th scope="col">Net</th><th scope="col"><span class="sr">Remove</span></th></tr>';
  const rows = S.ledger.slice().reverse().map(r => `<tr><td>${esc(r.date.slice(5))}</td><td>${esc(r.platform || '–')}</td><td>${r.orders}</td><td>${inr(r.income)}</td><td>${inr(r.fuel + r.other)}</td><td>${inr(net(r))}</td><td><button type="button" class="btn ghost small" data-del="${r.id}" aria-label="Remove entry for ${esc(r.date)}">✕</button></td></tr>`);
  $('#ledger').innerHTML = head + (rows.join('') || '<tr><td colspan="7">No entries yet.</td></tr>');
}

/** Parse a spoken or typed entry, save it to the database and celebrate wins. Resolves true on success. */
export async function logFromText(text) {
  const clean = text.trim();
  if (!clean) return false;
  const button = $('#addEntry');
  button.disabled = true;
  try {
    const parsed = await parseEntry(clean);
    if (!parsed.income && !parsed.orders) {
      toast('Could not find numbers. Try: 10 orders, 1200 rupees, petrol 200');
      return false;
    }
    const bestBefore = Math.max(0, ...S.ledger.map(net));
    const ordersBefore = totals(S.ledger).orders;
    const entry = await saveEntry({
      date: isoDay(0), platform: parsed.platform, orders: parsed.orders, income: parsed.income,
      fuel: parsed.fuel, other: parsed.other, hours: parsed.hours,
    });
    S.ledger.push(entry);
    renderLedger();
    dataChanged();
    $('#entryText').value = '';
    if (S.ledger.length > 1 && net(entry) > bestBefore) {
      confetti(); setMascot('🏆'); toast('🏆 New best day! Well done.');
    } else if (ordersBefore < 100 && totals(S.ledger).orders >= 100) {
      confetti(); setMascot('🎉'); toast('💯 100 orders logged! Amazing.');
    } else {
      toast(`Saved: ${entry.orders} orders, ${inr(entry.income)} income, ${inr(entry.fuel + entry.other)} costs${parsed.source === 'heuristic' ? ' (basic reading, please check)' : ''}`);
    }
    return true;
  } catch (e) {
    toast(e.message || 'Could not save. Please try again.');
    return false;
  } finally {
    button.disabled = false;
  }
}

export function initLedger() {
  $('#entryForm').addEventListener('submit', e => { e.preventDefault(); logFromText($('#entryText').value); });
  $('#micEntry').addEventListener('click', () => listen($('#entryText'), $('#micEntry')));

  $('#ledger').addEventListener('click', async e => {
    const button = e.target.closest('[data-del]');
    if (!button || !confirm('Remove this entry?')) return;
    try {
      await removeEntry(button.dataset.del);
      S.ledger = S.ledger.filter(r => String(r.id) !== button.dataset.del);
      renderLedger();
      dataChanged();
    } catch (err) {
      toast(err.message || 'Could not remove the entry.');
    }
  });

  $('#deleteData').addEventListener('click', async () => {
    if (!confirm('Delete all your saved entries, moods and notes from this app? This cannot be undone.')) return;
    try {
      await deleteAllData();
      S.ledger = []; S.moods = []; S.docSummary = '';
      renderLedger();
      dataChanged();
      toast('All your data was deleted.');
    } catch (err) {
      toast(err.message || 'Could not delete your data.');
    }
  });

  renderLedger();
}
