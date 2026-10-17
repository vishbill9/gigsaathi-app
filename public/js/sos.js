// SOS tab: location sharing, an offline-friendly fake call, and the accident checklist.
import { S } from './state.js';
import { $, esc, toast } from './util.js';
import { T } from './i18n.js';
import { speak } from './voice.js';
import { ask } from './chat.js';
import { showTab } from './tabs.js';

export function renderSos() {
  $('#checklist').innerHTML = T[S.lang].checklist.map(item => `<li>${esc(item)}</li>`).join('');
}

function shareLocation() {
  const send = place => window.open(`https://wa.me/?text=${encodeURIComponent(T[S.lang].sosMsg.replace('{url}', place))}`, '_blank', 'noopener');
  if (!navigator.geolocation) return send('(location not available)');
  toast('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    p => send(`https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}`),
    () => { toast('Location is blocked. Sending your message without it.'); send('(location not shared)'); },
    { timeout: 8000, maximumAge: 30_000 },
  );
}

let audio;
let ringTimer;

function beep() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 480;
    gain.gain.value = 0.12;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.35);
  } catch { /* audio blocked by the browser */ }
}
function startRing() {
  beep();
  ringTimer = setInterval(() => { beep(); setTimeout(beep, 450); }, 1800);
  navigator.vibrate?.([400, 200, 400]);
}
function stopRing() {
  clearInterval(ringTimer);
  navigator.vibrate?.(0);
}

export function initSos() {
  renderSos();
  $('#btnLoc').addEventListener('click', shareLocation);
  $('#btnAskSafety').addEventListener('click', () => {
    showTab('safety');
    ask('safety', 'I need help right now. What should I do first?');
  });

  const dialog = $('#fake');
  let clock;
  const setRinging = ringing => {
    $('#fakeAccept').hidden = !ringing;
    $('#fakeDecline').hidden = !ringing;
    $('#fakeEnd').hidden = ringing;
  };
  $('#btnFake').addEventListener('click', () => {
    setRinging(true);
    $('#fakeStatus').textContent = 'Incoming call…';
    dialog.showModal();
    startRing();
  });
  $('#fakeAccept').addEventListener('click', () => {
    stopRing();
    setRinging(false);
    let seconds = 0;
    const show = () => { $('#fakeStatus').textContent = `On call ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };
    show();
    clock = setInterval(() => { seconds += 1; show(); }, 1000);
    setTimeout(() => speak(T[S.lang].fakeLine), 700);
  });
  for (const id of ['#fakeDecline', '#fakeEnd']) $(id).addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    stopRing();
    clearInterval(clock);
    globalThis.speechSynthesis?.cancel();
  });
}
