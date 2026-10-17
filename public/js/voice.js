// Voice in (Web Speech recognition) and voice out (speech synthesis). Both degrade gracefully.
import { S } from './state.js';
import { toast } from './util.js';

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const LOCALE = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN', hing: 'hi-IN' };

/** Dictate into `input`. `onDone(text)` runs after a result so callers can auto-submit. */
export function listen(input, button, onDone) {
  if (!Recognition) return toast('Voice input works in Chrome or Edge. You can type instead.');
  const rec = new Recognition();
  rec.lang = LOCALE[S.lang];
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  const finish = () => button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-pressed', 'true');
  rec.onresult = e => {
    input.value = `${input.value} ${e.results[0][0].transcript}`.trim();
    onDone?.(input.value);
  };
  rec.onerror = e => {
    finish();
    if (e.error === 'not-allowed') toast('Microphone is blocked. Allow it in the browser, or type instead.');
  };
  rec.onend = finish;
  rec.start();
}

/** Read text aloud in the selected language. */
export function speak(text) {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_`]/g, ''));
  utterance.lang = LOCALE[S.lang];
  synth.speak(utterance);
}
