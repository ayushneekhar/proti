import type { APIRoute } from 'astro';

interface PasteData {
  content: string;
  language: string;
  createdAt: string;
}

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Paste ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the KV binding from Cloudflare runtime
    const { env } = locals.runtime;
    
    const data = await env.PASTE_STORE.get(id);

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Paste not found or has expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pasteData: PasteData = JSON.parse(data);

    return new Response(
      JSON.stringify(pasteData),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error retrieving paste:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve paste' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
