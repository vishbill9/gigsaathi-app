// Pure, DOM-free logic. Everything here is unit tested (see test/logic.test.js).

export const MOODS = [
  { emoji: '😫', label: 'exhausted', score: 1 },
  { emoji: '😕', label: 'low', score: 2 },
  { emoji: '😐', label: 'okay', score: 3 },
  { emoji: '🙂', label: 'good', score: 4 },
  { emoji: '🤩', label: 'amazing', score: 5 },
];

/** @typedef {{id:number,date:string,platform:string,orders:number,income:number,fuel:number,other:number,hours:number}} Entry */

export const net = r => r.income - r.fuel - r.other;

/** @param {Entry[]} rows */
export function totals(rows) {
  const t = rows.reduce(
    (a, r) => ({ orders: a.orders + r.orders, income: a.income + r.income, cost: a.cost + r.fuel + r.other, hours: a.hours + (r.hours || 0) }),
    { orders: 0, income: 0, cost: 0, hours: 0 },
  );
  t.net = t.income - t.cost;
  return t;
}

/** Local calendar day as YYYY-MM-DD, `offset` days before `from`. */
export function isoDay(offset = 0, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - offset);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Consecutive days with an entry, counting back from today (or yesterday if today is empty). */
export function streak(rows, today = new Date()) {
  const days = new Set(rows.map(r => r.date));
  let i = days.has(isoDay(0, today)) ? 0 : 1;
  let n = 0;
  while (days.has(isoDay(i, today))) { n++; i++; }
  return n;
}

export function badges(rows, today = new Date()) {
  const out = [];
  const s = streak(rows, today);
  if (s >= 2) out.push(`🔥 ${s}-day streak`);
  const nets = rows.map(net);
  if (nets.length > 1 && nets.at(-1) === Math.max(...nets)) out.push('🏆 Best day yet');
  const t = totals(rows);
  if (t.orders >= 100) out.push('💯 100+ orders');
  if (t.income && t.cost / t.income < 0.15) out.push('⛽ Fuel saver');
  if (rows.length >= 5) out.push('📒 Consistent logger');
  return out;
}

/** Percent of income that goes to costs. */
export const costShare = t => (t.income ? Math.round((t.cost / t.income) * 100) : 0);

/** Bar heights (0..1) for the last `n` entries. */
export function sparkBars(rows, n = 7) {
  const last = rows.slice(-n).map(r => ({ date: r.date, net: net(r) }));
  const max = Math.max(1, ...last.map(b => b.net));
  return last.map(b => ({ ...b, h: Math.max(b.net, 0) / max }));
}

/** Quick, offline scheme guidance. The AI then explains it in the worker's language. */
export function schemeCheck({ age, lowIncome, hasEshram, hasBank }) {
  const out = [];
  if (age < 16) out.push({ icon: 'ℹ️', text: 'e-Shram needs age 16 or more.' });
  else if (age > 59) out.push({ icon: 'ℹ️', text: 'e-Shram is for ages 16 to 59. Ask your labour office about other options.' });
  else if (hasEshram) out.push({ icon: '✅', text: 'e-Shram: you already have it. Keep your UAN safe.' });
  else out.push({ icon: '👉', text: 'Register on e-Shram first. It is free (eshram.gov.in, helpline 14434) and opens other schemes.' });

  if (age >= 18 && age <= 40 && lowIncome && hasBank) out.push({ icon: '👉', text: 'PM-SYM pension: you may be eligible. It pays a pension after age 60.' });
  else if (age > 40) out.push({ icon: 'ℹ️', text: 'PM-SYM is for ages 18 to 40.' });
  else if (!lowIncome) out.push({ icon: 'ℹ️', text: 'PM-SYM is for income up to ₹15,000 a month.' });
  else if (!hasBank) out.push({ icon: '👉', text: 'Open a bank account (Jan Dhan) to use pension and benefit schemes.' });

  if (hasEshram) out.push({ icon: '👉', text: 'Health cover (Ayushman Bharat): ask at a Common Service Centre or a listed hospital if you can get your card.' });
  out.push({ icon: '📎', text: 'Keep ready: Aadhaar, mobile number linked to Aadhaar, bank passbook. Please confirm everything on the official website.' });
  return out;
}

/** True when the last `n` moods were all at or below `threshold`. */
export function lowMoodRun(moods, n = 3, threshold = 2) {
  return moods.length >= n && moods.slice(-n).every(m => m.s <= threshold);
}

/** Split "riddle … Answer: x" into [question, answer|null]. */
export function splitAnswer(text) {
  const parts = text.split(/\s*\n?\s*(?:Answer|उत्तर|ਜਵਾਬ|Jawab|Uttar)\s*[:：]\s*/i);
  return parts.length > 1 ? [parts[0].trim(), parts.slice(1).join(' ').trim()] : [text.trim(), null];
}

/** Facts sent to the model as CONTEXT. Only modules that need personal data get any. */
export function buildContext(mod, rows, docSummary = '', moods = []) {
  if (!['earnings', 'grievance', 'buddy'].includes(mod)) return '';
  const t = totals(rows);
  const lines = rows.slice(-10).map(r => `${r.date} ${r.platform || '-'} orders=${r.orders} income=${r.income} fuel=${r.fuel} other=${r.other} hours=${r.hours || '?'} net=${net(r)}`);
  let ctx = `LEDGER (Rs):\n${lines.join('\n')}\nTOTAL income=${t.income} costs=${t.cost} net=${t.net} orders=${t.orders}`;
  if (t.orders) ctx += ` net/order=${Math.round(t.net / t.orders)}`;
  if (t.hours) ctx += ` net/hour=${Math.round(t.net / t.hours)}`;
  if (mod === 'grievance' && docSummary) ctx += `\n\nLAST DOCUMENT SUMMARY:\n${docSummary.slice(0, 1500)}`;
  if (mod === 'buddy' && moods.length) ctx += `\n\nMOOD HISTORY (1=exhausted, 5=amazing): ${moods.slice(-5).map(m => `${m.d}=${m.s}`).join(', ')}`;
  return ctx;
}
