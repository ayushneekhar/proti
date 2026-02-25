import type { APIRoute, AstroCookies } from 'astro';
import { clearSessionCookie, sanitizeNextPath } from '../../../lib/auth';

function redirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
    },
  });
}

const logout = (request: Request, cookies: AstroCookies): Response => {
  clearSessionCookie(cookies);

  const requestUrl = new URL(request.url);
  const next = sanitizeNextPath(requestUrl.searchParams.get('next'));

  if (request.method === 'GET') {
    return redirectResponse(new URL(next, requestUrl.origin).toString());
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};

export const GET: APIRoute = async ({ request, cookies }) => logout(request, cookies);
export const POST: APIRoute = async ({ request, cookies }) => logout(request, cookies);
