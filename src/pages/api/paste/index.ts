import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';

interface PasteData {
  content: string;
  language: string;
  createdAt: string;
}

// 30 days in seconds
const TTL_SECONDS = 30 * 24 * 60 * 60;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { content, language } = body;

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (content.length > 500000) {
      return new Response(
        JSON.stringify({ error: 'Content too large (max 500KB)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const id = nanoid(8);
    const pasteData: PasteData = {
      content,
      language: language || 'plaintext',
      createdAt: new Date().toISOString(),
    };

    // Get the KV binding from Cloudflare runtime
    const { env } = locals.runtime;
    
    await env.PASTE_STORE.put(id, JSON.stringify(pasteData), {
      expirationTtl: TTL_SECONDS,
    });

    return new Response(
      JSON.stringify({ 
        id, 
        url: `/paste/${id}`,
        expiresIn: '30 days'
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error creating paste:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create paste' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
