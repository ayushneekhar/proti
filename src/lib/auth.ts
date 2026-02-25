import type { AstroCookies } from 'astro';

export interface SessionUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface SessionPayload extends SessionUser {
  iat: number;
  exp: number;
}

interface OAuthStatePayload {
  nonce: string;
  next: string;
}

const SESSION_COOKIE_NAME = 'proti_auth_session';
const OAUTH_STATE_COOKIE_NAME = 'proti_oauth_state';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToString(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return decoder.decode(bytes);
}

function safeStringEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function signHmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function toSessionUser(payload: SessionPayload): SessionUser {
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

export function sanitizeNextPath(candidate?: string | null): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return '/';
  }

  return candidate;
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  return stringToBase64Url(JSON.stringify(payload));
}

export function decodeOAuthState(value: string): OAuthStatePayload | null {
  try {
    const parsed = JSON.parse(base64UrlToString(value)) as OAuthStatePayload;
    if (!parsed?.nonce || typeof parsed.nonce !== 'string') return null;
    if (!parsed?.next || typeof parsed.next !== 'string') return null;
    return {
      nonce: parsed.nonce,
      next: sanitizeNextPath(parsed.next),
    };
  } catch {
    return null;
  }
}

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

export async function createSessionToken(user: SessionUser, secret: string): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...user,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
  };

  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const signature = await signHmac(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

async function verifySessionToken(token: string, secret: string): Promise<SessionPayload | null> {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  const expectedSignature = await signHmac(payloadPart, secret);
  if (!safeStringEquals(signaturePart, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlToString(payloadPart)) as SessionPayload;
    if (!payload?.sub || !payload?.email) return null;
    if (typeof payload.exp !== 'number') return null;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser(
  cookies: AstroCookies,
  secret?: string
): Promise<SessionUser | null> {
  if (!secret) return null;

  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token, secret);
  if (!payload) return null;

  return toSessionUser(payload);
}

export function setSessionCookie(cookies: AstroCookies, token: string, secure: boolean): void {
  cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export function setOAuthStateCookie(cookies: AstroCookies, state: string, secure: boolean): void {
  cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    path: '/',
    maxAge: OAUTH_STATE_TTL_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure,
  });
}

export function popOAuthStateCookie(cookies: AstroCookies): string | null {
  const value = cookies.get(OAUTH_STATE_COOKIE_NAME)?.value ?? null;
  cookies.delete(OAUTH_STATE_COOKIE_NAME, { path: '/' });
  return value;
}
