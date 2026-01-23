import type { APIRoute } from 'astro';

interface PasteData {
  content: string;
  language: string;
  createdAt: string;
  expiresAt?: string;
  burnAfterReading?: boolean;
  passwordHash?: string;
}

// Simple hash function for password verification
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// GET - Returns paste metadata (without content if password protected)
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

    // If password protected, return metadata only (not content)
    if (pasteData.passwordHash) {
      return new Response(
        JSON.stringify({
          language: pasteData.language,
          createdAt: pasteData.createdAt,
          expiresAt: pasteData.expiresAt,
          burnAfterReading: pasteData.burnAfterReading,
          requiresPassword: true,
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // If burn after reading, delete after sending
    if (pasteData.burnAfterReading) {
      await env.PASTE_STORE.delete(id);
    }

    // Return full paste data (without passwordHash)
    const { passwordHash, ...safeData } = pasteData;
    return new Response(
      JSON.stringify(safeData),
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

// POST - Verify password and return full content
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Paste ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
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

    // Verify password
    const providedHash = await hashPassword(password);
    if (pasteData.passwordHash !== providedHash) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If burn after reading, delete after sending
    if (pasteData.burnAfterReading) {
      await env.PASTE_STORE.delete(id);
    }

    // Return full paste data (without passwordHash)
    const { passwordHash, ...safeData } = pasteData;
    return new Response(
      JSON.stringify(safeData),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error verifying paste password:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to verify password' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
