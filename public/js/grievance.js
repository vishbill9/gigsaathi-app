// Complaint drafting: facts from the real ledger and the last explained document go to the model as context.
import { S } from './state.js';
import { $, inr, toast } from './util.js';
import { totals } from './logic.js';
import { ask } from './chat.js';

const lastReply = () => S.hist.grievance.findLast(m => m.role === 'assistant')?.content ?? '';

export function initGrievance() {
  $('#fillG').addEventListener('click', () => {
    const last = S.ledger.at(-1);
    if (!last) return toast('Add an earnings entry first');
    const field = $('#gText');
    field.value = `${field.value ? `${field.value}\n` : ''}My last entry: ${last.date}, ${last.platform || 'platform'}, ${last.orders} orders, earned ${inr(last.income)}. Total net ${inr(totals(S.ledger).net)}.`;
  });

  $('#draftG').addEventListener('click', () => {
    const details = $('#gText').value.trim();
    if (!details) return toast('Add a few details first');
    ask('grievance', `Complaint type: ${$('#gType').value}\nDetails: ${details}\nPlease draft the complaint now. Use [fill in] for anything missing.`);
  });

  $('#copyG').addEventListener('click', async () => {
    const text = lastReply();
    if (!text) return toast('Nothing to copy yet');
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied');
    } catch {
      toast('Could not copy. Select the text and copy it.');
    }
  });

  $('#waG').addEventListener('click', () => {
    const text = lastReply();
    if (!text) return toast('Nothing to share yet');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
}
