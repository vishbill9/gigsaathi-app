// Chat boxes with streaming replies, one per module.
import { S } from './state.js';
import { $, md, toast } from './util.js';
import { buildContext } from './logic.js';
import { chatStream } from './api.js';
import { listen, speak } from './voice.js';

const busy = new Set();

/** Render a chat box (log + input + mic) into #box-<module>. Labels are static, trusted strings. */
export function mkBox(mod, label, placeholder) {
  S.hist[mod] = [];
  $(`#box-${mod}`).innerHTML = `
    <div class="msgs" id="m-${mod}" role="log" aria-live="polite" aria-label="${label}"></div>
    <form class="row" id="f-${mod}" autocomplete="off">
      <label class="sr" for="i-${mod}">${label}</label>
      <input id="i-${mod}" maxlength="500" placeholder="${placeholder}">
      <button type="button" class="btn icon" id="mic-${mod}" aria-label="Speak your message" aria-pressed="false">🎤</button>
      <button class="btn primary" type="submit">Send</button>
    </form>`;
  const input = $(`#i-${mod}`);
  $(`#f-${mod}`).addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    ask(mod, text);
  });
  $(`#mic-${mod}`).addEventListener('click', () => listen(input, $(`#mic-${mod}`)));
}

/** Suggested questions as tap-to-ask buttons. */
export function mkChips(mod, items) {
  const root = $(`#chips-${mod}`);
  for (const text of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn soft';
    button.textContent = text;
    button.addEventListener('click', () => ask(mod, text));
    root.append(button);
  }
}

function bubble(mod, role, html) {
  const log = $(`#m-${mod}`);
  const el = document.createElement('div');
  el.className = `m ${role === 'user' ? 'u' : 'a'}`;
  el.innerHTML = html;
  log.append(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

/** Send a message and stream the reply into the box. Resolves to the full reply ('' on failure). */
export async function ask(mod, text) {
  if (busy.has(mod)) { toast('Saathi is still replying…'); return ''; }
  busy.add(mod);
  const history = S.hist[mod];
  history.push({ role: 'user', content: text });
  bubble(mod, 'user', md(text));
  const out = bubble(mod, 'assistant', '<span class="typing">…</span><span class="sr">Saathi is typing</span>');
  const log = out.parentElement;
  let reply = '';
  try {
    const res = await chatStream(mod, history.slice(-10), buildContext(mod, S.ledger, S.docSummary, S.moods));
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Something went wrong. Please try again.');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      reply += decoder.decode(value, { stream: true });
      out.innerHTML = md(reply);
      log.scrollTop = log.scrollHeight;
    }
    reply += decoder.decode();
    out.innerHTML = md(reply);
  } catch (e) {
    history.pop();
    out.classList.add('err');
    out.textContent = reply || e.message || 'Cannot reach the server. Please check your connection.';
    return '';
  } finally {
    busy.delete(mod);
  }
  history.push({ role: 'assistant', content: reply });
  if (S.big) speak(reply);
  return reply;
}
