// Anonymous worker sessions: a random token in an HttpOnly cookie. Only its SHA-256 hash is stored.
// No name, phone or email is ever collected.
import crypto from 'node:crypto';

const COOKIE = 'gs';
const ATTRS = 'Path=/; HttpOnly; SameSite=Strict';

export const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('base64url');

/** Return the session token from the Cookie header, or null if absent or malformed. */
export function readToken(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) {
      const value = rest.join('=');
      return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
    }
  }
  return null;
}

export const cookieHeader = (token, secure) => `${COOKIE}=${token}; ${ATTRS}; Max-Age=31536000${secure ? '; Secure' : ''}`;
export const clearCookieHeader = () => `${COOKIE}=; ${ATTRS}; Max-Age=0`;
