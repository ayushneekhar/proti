import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';
import { getSessionUser } from '../../../lib/auth';
import {
  MAX_UPLOAD_SIZE_BYTES,
  createStoredFile,
  formatFileSize,
  getFileObjectKey,
  toR2CustomMetadata,
} from '../../../lib/file-store';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const user = await getSessionUser(cookies, locals.runtime.env.AUTH_SECRET);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Authentication required for file uploads' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await request.formData();
    const fileInput = formData.get('file');

    if (!(fileInput instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Missing file upload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (fileInput.size <= 0) {
      return new Response(
        JSON.stringify({ error: 'File is empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (fileInput.size > MAX_UPLOAD_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `File too large. Max size is ${formatFileSize(MAX_UPLOAD_SIZE_BYTES)}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const storedFile = createStoredFile(fileInput, user.email);
    const id = nanoid(10);
    const objectKey = getFileObjectKey(id);

    await locals.runtime.env.FILE_UPLOADS.put(objectKey, await fileInput.arrayBuffer(), {
      httpMetadata: {
        contentType: storedFile.type,
      },
      customMetadata: toR2CustomMetadata(storedFile),
    });

    const origin = new URL(request.url).origin;

    return new Response(
      JSON.stringify({
        id,
        url: `${origin}/file/${id}`,
        name: storedFile.name,
        type: storedFile.type,
        size: storedFile.size,
        expiresIn: '1 hour',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to upload file', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upload file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
