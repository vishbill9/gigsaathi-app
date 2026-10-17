// Mood check-in: a one-tap way to say how the day feels. Saathi answers with care; moods are saved in the database.
import { S } from './state.js';
import { $, toast } from './util.js';
import { MOODS, isoDay, lowMoodRun } from './logic.js';
import { confetti, setMascot } from './fx.js';
import { ask } from './chat.js';
import { saveMood } from './api.js';

const FACE = { 1: '🫂', 2: '🫂', 3: '🛵', 4: '😊', 5: '🥳' };

const updateCare = () => { $('#careCard').hidden = !lowMoodRun(S.moods); };

export function initMood() {
  const root = $('#moods');
  for (const mood of MOODS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mood';
    button.textContent = mood.emoji;
    button.title = mood.label;
    button.setAttribute('aria-label', mood.label);
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', async () => {
      for (const other of root.children) other.setAttribute('aria-pressed', String(other === button));
      setMascot(FACE[mood.score]);
      if (mood.score === 5) confetti(90);
      ask('buddy', `Mood check-in: I feel ${mood.label} today.`);
      try {
        await saveMood(isoDay(0), mood.score);
        S.moods = [...S.moods, { d: isoDay(0), s: mood.score }].slice(-60);
        updateCare();
      } catch {
        toast('Your mood could not be saved right now.');
      }
    });
    root.append(button);
  }
  document.addEventListener('data:changed', updateCare);
  updateCare();
}
