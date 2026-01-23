import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';

interface PasteData {
  content: string;
  language: string;
  createdAt: string;
  expiresAt: string;
  burnAfterReading?: boolean;
  passwordHash?: string;
}

// Expiration options in seconds
const EXPIRATION_OPTIONS: Record<string, number> = {
  '1h': 60 * 60,
  '1d': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
};

// Simple hash function for password (for demo - in production use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { content, language, expiration, burnAfterReading, password } = body;

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

    // Validate and get expiration TTL
    const expirationKey = expiration || '30d';
    const ttlSeconds = EXPIRATION_OPTIONS[expirationKey] || EXPIRATION_OPTIONS['30d'];
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const id = nanoid(8);
    const pasteData: PasteData = {
      content,
      language: language || 'plaintext',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      burnAfterReading: burnAfterReading || false,
    };

    // Hash password if provided
    if (password && typeof password === 'string' && password.length > 0) {
      pasteData.passwordHash = await hashPassword(password);
    }

    // Get the KV binding from Cloudflare runtime
    const { env } = locals.runtime;
    
    await env.PASTE_STORE.put(id, JSON.stringify(pasteData), {
      expirationTtl: ttlSeconds,
    });

    // Human-readable expiration
    const expirationLabels: Record<string, string> = {
      '1h': '1 hour',
      '1d': '1 day',
      '7d': '7 days',
      '30d': '30 days',
    };

    return new Response(
      JSON.stringify({ 
        id, 
        url: `/paste/${id}`,
        expiresIn: expirationLabels[expirationKey] || '30 days',
        burnAfterReading: pasteData.burnAfterReading,
        hasPassword: !!pasteData.passwordHash,
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
