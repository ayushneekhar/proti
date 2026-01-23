import type { APIRoute } from 'astro';

interface PasteData {
  content: string;
  language: string;
  createdAt: string;
  expiresAt?: string;
  burnAfterReading?: boolean;
  viewCount?: number;
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

    // Handle burn after reading with view count
    // First view (creator) = viewCount 0 -> 1, don't burn
    // Second view (recipient) = viewCount 1 -> burn
    let willBurn = false;
    if (pasteData.burnAfterReading) {
      const currentViewCount = pasteData.viewCount || 0;
      
      if (currentViewCount === 0) {
        // First view (creator) - increment count, don't burn yet
        pasteData.viewCount = 1;
        // Calculate remaining TTL
        const expiresAt = pasteData.expiresAt ? new Date(pasteData.expiresAt) : null;
        const remainingTtl = expiresAt 
          ? Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
          : 30 * 24 * 60 * 60;
        await env.PASTE_STORE.put(id, JSON.stringify(pasteData), {
          expirationTtl: remainingTtl,
        });
      } else {
        // Second+ view (recipient) - delete after sending
        willBurn = true;
        await env.PASTE_STORE.delete(id);
      }
    }

    // Return full paste data (without passwordHash)
    const { passwordHash, viewCount, ...safeData } = pasteData;
    return new Response(
      JSON.stringify({ ...safeData, willBurn }),
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

    // Handle burn after reading with view count
    let willBurn = false;
    if (pasteData.burnAfterReading) {
      const currentViewCount = pasteData.viewCount || 0;
      
      if (currentViewCount === 0) {
        // First view (creator) - increment count, don't burn yet
        pasteData.viewCount = 1;
        const expiresAt = pasteData.expiresAt ? new Date(pasteData.expiresAt) : null;
        const remainingTtl = expiresAt 
          ? Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
          : 30 * 24 * 60 * 60;
        await env.PASTE_STORE.put(id, JSON.stringify(pasteData), {
          expirationTtl: remainingTtl,
        });
      } else {
        // Second+ view (recipient) - delete after sending
        willBurn = true;
        await env.PASTE_STORE.delete(id);
      }
    }

    // Return full paste data (without passwordHash and viewCount)
    const { passwordHash, viewCount, ...safeData } = pasteData;
    return new Response(
      JSON.stringify({ ...safeData, willBurn }),
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
