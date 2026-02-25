import type { APIRoute, AstroCookies } from 'astro';
import { clearSessionCookie, sanitizeNextPath } from '../../../lib/auth';

const logout = (request: Request, cookies: AstroCookies): Response => {
  clearSessionCookie(cookies);

  const requestUrl = new URL(request.url);
  const next = sanitizeNextPath(requestUrl.searchParams.get('next'));

  if (request.method === 'GET') {
    return Response.redirect(new URL(next, requestUrl.origin).toString(), 302);
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
