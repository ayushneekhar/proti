/// <reference types="astro/client" />

type KVNamespace = import("@cloudflare/workers-types").KVNamespace;

type Runtime = import("@astrojs/cloudflare").Runtime<{
  PASTE_STORE: KVNamespace;
  SESSION: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI?: string;
  AUTH_SECRET: string;
}>;

declare namespace App {
  interface Locals extends Runtime {}
}
