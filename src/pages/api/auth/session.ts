import type { APIRoute } from 'astro';
import { getSessionUser } from '../../../lib/auth';

export const GET: APIRoute = async ({ locals, cookies }) => {
  const user = await getSessionUser(cookies, locals.runtime.env.AUTH_SECRET);

  return new Response(
    JSON.stringify({
      authenticated: !!user,
      user: user ?? null,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
