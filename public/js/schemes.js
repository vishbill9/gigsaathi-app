// "Which schemes fit me?": instant rule-based check, then Saathi explains it in the worker's language.
import { $, esc } from './util.js';
import { schemeCheck } from './logic.js';
import { ask } from './chat.js';

export function initSchemes() {
  $('#quiz').addEventListener('submit', e => {
    e.preventDefault();
    const age = Number($('#qAge').value);
    if (!Number.isFinite(age) || age < 14 || age > 80) return $('#qAge').focus();
    const answers = { age, lowIncome: $('#qInc').value === 'lo', hasEshram: $('#qEs').checked, hasBank: $('#qBank').checked };
    $('#qOut').innerHTML = schemeCheck(answers).map(r => `<li><span aria-hidden="true">${r.icon}</span> ${esc(r.text)}</li>`).join('');
    ask('rights', `I am ${age} years old, income ${answers.lowIncome ? 'up to Rs 15000' : 'above Rs 15000'} a month, e-Shram card: ${answers.hasEshram ? 'yes' : 'no'}, bank account: ${answers.hasBank ? 'yes' : 'no'}. Which schemes can I apply for, and what are the first 3 steps?`);
  });
}
