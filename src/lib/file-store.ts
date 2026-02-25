export const FILE_KEY_PREFIX = 'file:';
export const FILE_TTL_SECONDS = 60 * 60;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export interface StoredFile {
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
  expiresAt: string;
  dataBase64: string;
}

export function getFileKey(id: string): string {
  return `${FILE_KEY_PREFIX}${id}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export async function createStoredFile(file: File, uploadedBy: string): Promise<StoredFile> {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + FILE_TTL_SECONDS * 1000);
  const bytes = new Uint8Array(await file.arrayBuffer());

  return {
    name: file.name || 'clipboard-file',
    type: file.type || 'application/octet-stream',
    size: file.size,
    uploadedBy,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    dataBase64: bytesToBase64(bytes),
  };
}
