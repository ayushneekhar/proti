import type { APIRoute } from 'astro';
import { base64ToBytes, type StoredFile, getFileKey } from '../../../lib/file-store';

const sanitizeFilename = (value: string): string => {
  return value.replace(/["\\\r\n]/g, '_');
};

export const GET: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'File ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const raw = await locals.runtime.env.PASTE_STORE.get(getFileKey(id));
    if (!raw) {
      return new Response(
        JSON.stringify({ error: 'File not found or expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const storedFile = JSON.parse(raw) as StoredFile;
    const expiresAt = new Date(storedFile.expiresAt).getTime();
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return new Response(
        JSON.stringify({ error: 'File not found or expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const bytes = base64ToBytes(storedFile.dataBase64);
    const requestUrl = new URL(request.url);
    const download = requestUrl.searchParams.get('download') === '1';
    const dispositionType = download ? 'attachment' : 'inline';
    const safeFilename = sanitizeFilename(storedFile.name || 'file');

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': storedFile.type || 'application/octet-stream',
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `${dispositionType}; filename="${safeFilename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Failed to fetch uploaded file', error);
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
