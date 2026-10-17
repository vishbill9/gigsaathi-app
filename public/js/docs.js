// Document help: paste or load a notice and get a plain-language explanation.
import { S } from './state.js';
import { $, toast } from './util.js';
import { ask } from './chat.js';
import { saveDocSummary } from './api.js';

export function initDocs() {
  $('#docFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) $('#docText').value = (await file.text()).slice(0, 3500);
  });

  $('#explainDoc').addEventListener('click', async () => {
    const text = $('#docText').value.trim();
    if (!text) return toast('Paste some text first');
    S.hist.docs = [];
    $('#m-docs').textContent = '';
    const reply = await ask('docs', `Explain this document:\n\n${text}`);
    if (!reply) return;
    S.docSummary = reply;
    try {
      await saveDocSummary(reply);
      toast('Saved. You can now write a complaint from this.');
    } catch {
      toast('Explained, but the summary could not be saved.');
    }
  });
}
