import type { APIRoute } from 'astro';
import {
  clearSessionCookie,
  createSessionToken,
  decodeOAuthState,
  isSecureRequest,
  popOAuthStateCookie,
  sanitizeNextPath,
  setSessionCookie,
} from '../../../../lib/auth';

interface GoogleTokenResponse {
  access_token?: string;
}

interface GoogleUserResponse {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
}

function redirectTo(path: string, origin: string): Response {
  return Response.redirect(new URL(path, origin).toString(), 302);
}

export const GET: APIRoute = async ({ request, locals, cookies }) => {
  const requestUrl = new URL(request.url);
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, AUTH_SECRET } = locals.runtime.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !AUTH_SECRET) {
    return redirectTo('/?auth=misconfigured', requestUrl.origin);
  }

  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const rawStateCookie = popOAuthStateCookie(cookies);
  const savedState = rawStateCookie ? decodeOAuthState(rawStateCookie) : null;

  if (!code || !state || !savedState || savedState.nonce !== state) {
    clearSessionCookie(cookies);
    return redirectTo('/?auth=failed', requestUrl.origin);
  }

  const redirectUri = GOOGLE_REDIRECT_URI || `${requestUrl.origin}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      clearSessionCookie(cookies);
      return redirectTo('/?auth=failed', requestUrl.origin);
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenData.access_token) {
      clearSessionCookie(cookies);
      return redirectTo('/?auth=failed', requestUrl.origin);
    }

    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      clearSessionCookie(cookies);
      return redirectTo('/?auth=failed', requestUrl.origin);
    }

    const profile = (await userResponse.json()) as GoogleUserResponse;
    if (!profile.sub || !profile.email) {
      clearSessionCookie(cookies);
      return redirectTo('/?auth=failed', requestUrl.origin);
    }

    const sessionToken = await createSessionToken(
      {
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      },
      AUTH_SECRET
    );

    setSessionCookie(cookies, sessionToken, isSecureRequest(request));
    return redirectTo(sanitizeNextPath(savedState.next), requestUrl.origin);
  } catch (error) {
    console.error('Google OAuth callback failed', error);
    clearSessionCookie(cookies);
    return redirectTo('/?auth=failed', requestUrl.origin);
  }
};
