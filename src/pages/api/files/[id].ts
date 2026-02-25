import type { APIRoute } from 'astro';
import {
  getFileObjectKey,
  isExpired,
  parseStoredFileFromR2Object,
} from '../../../lib/file-store';

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
    const objectKey = getFileObjectKey(id);
    const object = await locals.runtime.env.FILE_UPLOADS.get(objectKey);

    if (!object) {
      return new Response(
        JSON.stringify({ error: 'File not found or expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const storedFile = parseStoredFileFromR2Object(object);
    if (!storedFile) {
      return new Response(
        JSON.stringify({ error: 'File metadata is invalid' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (isExpired(storedFile.expiresAt)) {
      await locals.runtime.env.FILE_UPLOADS.delete(objectKey);
      return new Response(
        JSON.stringify({ error: 'File not found or expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!object.body) {
      return new Response(
        JSON.stringify({ error: 'File body is unavailable' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const requestUrl = new URL(request.url);
    const download = requestUrl.searchParams.get('download') === '1';
    const dispositionType = download ? 'attachment' : 'inline';
    const safeFilename = sanitizeFilename(storedFile.name || 'file');

    return new Response(object.body, {
      status: 200,
      headers: {
        'Content-Type': storedFile.type || 'application/octet-stream',
        'Content-Length': String(object.size),
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
