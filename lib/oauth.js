// Sign in with Google: OpenID Connect authorization-code flow with PKCE and a state/nonce check.
// No dependencies. The ID token is received straight from Google's token endpoint over TLS,
// so (per OIDC Core 3.1.3.7) its claims are validated without re-checking the signature.
import crypto from 'node:crypto';
import { HttpError } from './errors.js';

const b64 = buf => Buffer.from(buf).toString('base64url');
const rand = () => b64(crypto.randomBytes(32));
const FLOW_COOKIE = 'gs_oauth';
const FLOW_TTL_SEC = 600;

export const oauthEnabled = cfg => Boolean(cfg.googleId && cfg.googleSecret);

/** Start of the flow: returns the Google URL and the short-lived cookie value that remembers state, nonce and PKCE verifier. */
export function beginLogin(cfg, redirectUri) {
  const state = rand(), nonce = rand(), verifier = rand();
  const challenge = b64(crypto.createHash('sha256').update(verifier).digest());
  const url = new URL(cfg.googleAuthUrl);
  url.search = new URLSearchParams({
    client_id: cfg.googleId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state, nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return { url: url.toString(), flow: `${state}.${nonce}.${verifier}` };
}

export const flowCookie = (flow, secure) => `${FLOW_COOKIE}=${flow}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=${FLOW_TTL_SEC}${secure ? '; Secure' : ''}`;
export const clearFlowCookie = () => `${FLOW_COOKIE}=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0`;

export function readFlow(req) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === FLOW_COOKIE) {
      const bits = rest.join('=').split('.');
      return bits.length === 3 && bits.every(x => /^[A-Za-z0-9_-]{43}$/.test(x)) ? { state: bits[0], nonce: bits[1], verifier: bits[2] } : null;
    }
  }
  return null;
}

const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Finish the flow: check state, trade the code for an ID token, validate its claims, return the profile. */
export async function finishLogin(cfg, redirectUri, query, flow, fetchImpl = fetch) {
  if (query.get('error')) throw new HttpError(400, 'Google sign-in was cancelled.');
  const code = query.get('code'), state = query.get('state');
  if (!flow || !code || !state || !safeEqual(state, flow.state)) throw new HttpError(400, 'Sign-in session expired. Please try again.');

  let tokens;
  try {
    const r = await fetchImpl(cfg.googleTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: cfg.googleId, client_secret: cfg.googleSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: flow.verifier,
      }),
      signal: AbortSignal.timeout(15000),
    });
    tokens = await r.json();
    if (!r.ok || !tokens.id_token) throw new Error('token exchange failed');
  } catch {
    throw new HttpError(502, 'Could not complete Google sign-in. Please try again.');
  }

  let claims;
  try { claims = JSON.parse(Buffer.from(String(tokens.id_token).split('.')[1], 'base64url').toString('utf8')); }
  catch { throw new HttpError(502, 'Google sent an unreadable response.'); }

  const issOk = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com' || claims.iss === new URL(cfg.googleTokenUrl).origin;
  const audOk = claims.aud === cfg.googleId;
  const fresh = typeof claims.exp === 'number' && claims.exp * 1000 > Date.now();
  const nonceOk = typeof claims.nonce === 'string' && safeEqual(claims.nonce, flow.nonce);
  if (!issOk || !audOk || !fresh || !nonceOk || !claims.sub) throw new HttpError(400, 'Google sign-in could not be verified.');
  if (claims.email && claims.email_verified === false) throw new HttpError(400, 'Your Google email is not verified.');

  const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').slice(0, n);
  return { sub: clean(claims.sub, 64), email: clean(claims.email, 120), name: clean(claims.name || claims.given_name || claims.email, 80) };
}
