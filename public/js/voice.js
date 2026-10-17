// Voice in (Web Speech recognition) and voice out (speech synthesis). Both degrade gracefully,
// and every failure tells the worker what happened and what to do.
import { S } from './state.js';
import { toast } from './util.js';

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const LOCALE = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN', hing: 'hi-IN' };

const ERRORS = {
  'not-allowed': 'Microphone is blocked. Click the lock icon in the address bar, allow the microphone, then try again.',
  'service-not-allowed': 'Voice input is not allowed here. Please type instead.',
  'no-speech': 'I did not hear anything. Tap the mic and speak a little closer.',
  'audio-capture': 'No microphone was found. Plug one in, or type instead.',
  network: 'Voice input needs an internet connection. Please check it, or type instead.',
  'language-not-supported': 'This language is not supported for voice. Please type instead.',
};

let active = null; // the recognition currently listening, so a second tap stops it

/** Ask the browser for the microphone first so the permission prompt (or a clear refusal) appears. */
async function ensureMic() {
  if (!navigator.mediaDevices?.getUserMedia) return true; // let recognition ask for itself
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (e) {
    const name = e?.name || '';
    toast(name === 'NotFoundError' || name === 'DevicesNotFoundError'
      ? ERRORS['audio-capture']
      : ERRORS['not-allowed']);
    return false;
  }
}

/** Dictate into `input`. `onDone(text)` runs after a result so callers can auto-submit. */
export async function listen(input, button, onDone) {
  if (active) { active.stop(); return; }
  if (!Recognition) return toast('Voice input works in Chrome or Edge. You can type instead.');
  if (!globalThis.isSecureContext) return toast('Voice input needs a secure (https) page.');
  if (!(await ensureMic())) return;

  const rec = new Recognition();
  rec.lang = LOCALE[S.lang];
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  const finish = () => {
    button.setAttribute('aria-pressed', 'false');
    if (active === rec) active = null;
  };
  rec.onresult = e => {
    input.value = `${input.value} ${e.results[0][0].transcript}`.trim();
    onDone?.(input.value);
  };
  rec.onerror = e => {
    finish();
    toast(ERRORS[e.error] || 'Voice input stopped. Please try again or type instead.');
  };
  rec.onend = finish;
  try {
    button.setAttribute('aria-pressed', 'true');
    active = rec;
    rec.start();
    toast('Listening… speak now.');
  } catch {
    finish();
    toast('Could not start voice input. Please try again or type instead.');
  }
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
