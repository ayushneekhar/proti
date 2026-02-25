export const FILE_TTL_SECONDS = 60 * 60;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export interface StoredFile {
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
  expiresAt: string;
}

type R2FileObjectLike = {
  size: number;
  customMetadata?: Record<string, string> | null;
  httpMetadata?: {
    contentType?: string | null;
  } | null;
};

export function getFileObjectKey(id: string): string {
  return `uploads/${id}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

export function isExpired(expiresAt: string): boolean {
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
}

export function createStoredFile(file: File, uploadedBy: string): StoredFile {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + FILE_TTL_SECONDS * 1000);

  return {
    name: file.name || 'clipboard-file',
    type: file.type || 'application/octet-stream',
    size: file.size,
    uploadedBy,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function toR2CustomMetadata(file: StoredFile): Record<string, string> {
  return {
    name: file.name,
    type: file.type,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt,
    expiresAt: file.expiresAt,
  };
}

export function parseStoredFileFromR2Object(object: R2FileObjectLike): StoredFile | null {
  const custom = object.customMetadata ?? {};

  const name = custom.name;
  const uploadedBy = custom.uploadedBy;
  const createdAt = custom.createdAt;
  const expiresAt = custom.expiresAt;
  const type = custom.type || object.httpMetadata?.contentType || 'application/octet-stream';

  if (!name || !uploadedBy || !createdAt || !expiresAt) {
    return null;
  }

  return {
    name,
    type,
    size: object.size,
    uploadedBy,
    createdAt,
    expiresAt,
  };
}
