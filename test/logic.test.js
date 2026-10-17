import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, net, isoDay, streak, badges, costShare, sparkBars, schemeCheck, lowMoodRun, splitAnswer, buildContext } from '../public/js/logic.js';
import { esc, md, inr } from '../public/js/util.js';

const today = new Date(2026, 9, 17); // 17 Oct 2026, local time
const row = (ago, o = {}) => ({ id: ago, date: isoDay(ago, today), platform: 'Zomato', orders: 10, income: 1000, fuel: 100, other: 0, hours: 8, ...o });

test('totals sums income, costs, orders and hours', () => {
  const t = totals([row(1), row(2, { income: 500, fuel: 50, other: 10 })]);
  assert.deepEqual(t, { orders: 20, income: 1500, cost: 160, hours: 16, net: 1340 });
});

test('totals of nothing is all zeros', () => {
  assert.deepEqual(totals([]), { orders: 0, income: 0, cost: 0, hours: 0, net: 0 });
});

test('isoDay formats local dates and crosses month boundaries', () => {
  assert.equal(isoDay(0, today), '2026-10-17');
  assert.equal(isoDay(17, today), '2026-09-30');
});

test('streak counts back from today, or from yesterday when today is empty', () => {
  assert.equal(streak([row(0), row(1), row(2), row(4)], today), 3);
  assert.equal(streak([row(1), row(2)], today), 2);
  assert.equal(streak([row(3)], today), 0);
  assert.equal(streak([], today), 0);
});

test('badges reflect real data only', () => {
  assert.deepEqual(badges([], today), []);
  const rows = [row(4, { income: 900 }), row(3), row(2), row(1), row(0, { income: 2000 })];
  const out = badges(rows, today);
  assert.ok(out.includes('🔥 5-day streak'));
  assert.ok(out.includes('🏆 Best day yet'));
  assert.ok(out.includes('📒 Consistent logger'));
  assert.ok(out.includes('⛽ Fuel saver')); // costs are under 15% of income
});

test('costShare is a rounded percent and safe at zero income', () => {
  assert.equal(costShare({ income: 1000, cost: 183 }), 18);
  assert.equal(costShare({ income: 0, cost: 50 }), 0);
});

test('sparkBars scales to the best day and never goes negative', () => {
  const bars = sparkBars([row(2, { income: 100, fuel: 300 }), row(1, { income: 1100 })], 7);
  assert.equal(bars[1].h, 1);
  assert.equal(bars[0].h, 0);
  assert.equal(net(row(1)), 900);
});

test('schemeCheck gives age, income and bank specific guidance', () => {
  const young = schemeCheck({ age: 28, lowIncome: true, hasEshram: false, hasBank: true }).map(r => r.text).join(' ');
  assert.match(young, /Register on e-Shram/);
  assert.match(young, /PM-SYM pension: you may be eligible/);
  const senior = schemeCheck({ age: 62, lowIncome: true, hasEshram: false, hasBank: true }).map(r => r.text).join(' ');
  assert.match(senior, /ages 16 to 59/);
  assert.match(senior, /PM-SYM is for ages 18 to 40/);
  const noBank = schemeCheck({ age: 30, lowIncome: true, hasEshram: true, hasBank: false }).map(r => r.text).join(' ');
  assert.match(noBank, /bank account/);
  assert.match(noBank, /Ayushman/);
});

test('lowMoodRun needs a run of low moods', () => {
  const m = s => ({ d: 'x', s });
  assert.equal(lowMoodRun([m(2), m(1), m(2)]), true);
  assert.equal(lowMoodRun([m(2), m(4), m(2)]), false);
  assert.equal(lowMoodRun([m(1), m(1)]), false);
});

test('splitAnswer separates riddle answers in several languages', () => {
  assert.deepEqual(splitAnswer('What am I?\nAnswer: A bike'), ['What am I?', 'A bike']);
  assert.deepEqual(splitAnswer('पहेली\nउत्तर: बाइक'), ['पहेली', 'बाइक']);
  assert.deepEqual(splitAnswer('Just a joke'), ['Just a joke', null]);
});

test('buildContext only shares personal data with the modules that need it', () => {
  const rows = [row(1)];
  assert.equal(buildContext('rights', rows), '');
  assert.match(buildContext('earnings', rows), /TOTAL income=1000 costs=100 net=900 orders=10 net\/order=90/);
  assert.match(buildContext('grievance', rows, 'Deactivation notice'), /LAST DOCUMENT SUMMARY:\nDeactivation notice/);
  assert.match(buildContext('buddy', rows, '', [{ d: '2026-10-16', s: 2 }]), /MOOD HISTORY.*2026-10-16=2/);
  assert.doesNotMatch(buildContext('earnings', rows, 'secret', [{ d: 'x', s: 1 }]), /secret|MOOD/);
});

test('esc and md never let model output become HTML', () => {
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(md('**bold** <b>x</b>'), '<b>bold</b> &lt;b&gt;x&lt;/b&gt;');
  assert.equal(inr(1850), '₹1,850');
});
