/// <reference types="astro/client" />

type KVNamespace = import("@cloudflare/workers-types").KVNamespace;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

type Runtime = import("@astrojs/cloudflare").Runtime<{
  PASTE_STORE: KVNamespace;
  SESSION: KVNamespace;
  FILE_UPLOADS: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI?: string;
  AUTH_SECRET: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
