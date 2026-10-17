// Delight: confetti, the mascot's mood and a hidden surprise. All motion respects "reduce motion".
import { $, toast } from './util.js';

const COLORS = ['#0f766e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#22c55e'];
const reduceMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let canvas, ctx, pieces = [], frameId = 0;

function ensureCanvas() {
  if (canvas) return true;
  canvas = $('#confetti');
  if (!canvas) return false;
  ctx = canvas.getContext('2d');
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize();
  addEventListener('resize', resize);
  return true;
}

function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pieces = pieces.filter(p => p.life-- > 0);
  for (const p of pieces) {
    p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.rot += p.spin;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  }
  frameId = pieces.length ? requestAnimationFrame(frame) : 0;
  if (!frameId) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function confetti(count = 120) {
  if (reduceMotion() || !ensureCanvas()) return;
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: innerWidth / 2, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: -4 - Math.random() * 12,
      size: 5 + Math.random() * 6, color: COLORS[i % COLORS.length],
      rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.4, life: 90 + Math.random() * 50,
    });
  }
  if (!frameId) frame();
}

/** Change the mascot emoji with a little bounce. */
export function setMascot(emoji) {
  const mascot = $('#mascot');
  if (!mascot) return;
  mascot.textContent = emoji;
  mascot.classList.remove('pop');
  void mascot.offsetWidth; // restart the CSS animation
  mascot.classList.add('pop');
}

/** Tap the mascot five times for a surprise. */
export function initEasterEgg() {
  let taps = 0;
  let timer;
  $('#mascot').addEventListener('click', () => {
    taps += 1;
    clearTimeout(timer);
    timer = setTimeout(() => { taps = 0; }, 1500);
    if (taps < 5) return;
    taps = 0;
    document.body.classList.add('rainbow');
    setTimeout(() => document.body.classList.remove('rainbow'), 6000);
    confetti(220);
    setMascot('💃');
    toast('Secret unlocked: the Saathi dance! 💃🕺');
  });
}
