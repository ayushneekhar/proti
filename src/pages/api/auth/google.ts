import type { APIRoute } from 'astro';
import {
  encodeOAuthState,
  isSecureRequest,
  sanitizeNextPath,
  setOAuthStateCookie,
} from '../../../lib/auth';

function redirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
    },
  });
}

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  const { GOOGLE_CLIENT_ID } = locals.runtime.env;

  if (!GOOGLE_CLIENT_ID) {
    return new Response(
      JSON.stringify({ error: 'Google OAuth is not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const requestUrl = new URL(request.url);
  const next = sanitizeNextPath(requestUrl.searchParams.get('next'));
  const nonce = crypto.randomUUID();
  const encodedState = encodeOAuthState({ nonce, next });

  setOAuthStateCookie(cookies, encodedState, isSecureRequest(request));

  const redirectUri =
    locals.runtime.env.GOOGLE_REDIRECT_URI || `${requestUrl.origin}/api/auth/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'online');
  authUrl.searchParams.set('state', nonce);
  authUrl.searchParams.set('prompt', 'select_account');

  return redirectResponse(authUrl.toString());
};
