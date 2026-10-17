// Optional Google sign-in. Guests keep working; signing in keeps the same data on every device.
import { S } from './state.js';
import { $, toast } from './util.js';
import { logout } from './api.js';

function render() {
  const box = $('#account');
  box.replaceChildren();
  const { enabled, user } = S.auth;
  box.hidden = !enabled;
  if (!enabled) return;
  if (user) {
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = user.name;
    who.title = user.email;
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'btn ghost';
    out.textContent = 'Log out';
    out.addEventListener('click', async () => {
      try { await logout(); location.reload(); } catch (e) { toast(e.message || 'Could not log out.'); }
    });
    box.append(who, out);
  } else {
    const a = document.createElement('a');
    a.className = 'btn ghost';
    a.href = '/auth/google';
    a.textContent = 'Sign in with Google';
    a.title = 'Optional. Keeps your data on all your devices.';
    box.append(a);
  }
}

export function initAccount() {
  const err = new URLSearchParams(location.search).get('auth_error');
  if (err) {
    toast(err);
    history.replaceState(null, '', '/');
  }
  render();
}
