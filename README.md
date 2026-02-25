# proti

A minimal pastebin with syntax highlighting, built with Astro + CodeMirror on Cloudflare.

**Live:** [paste.neekhar.dev](https://paste.neekhar.dev)

## Features

- Syntax highlighting for 15+ languages
- Auto-indentation, bracket matching, code folding
- Light/dark theme
- 30-day auto-expiration
- Google sign-in for protected file uploads
- File upload portal with clipboard paste support (1-hour expiry, stored in Cloudflare R2)
- Shareable URLs

## Stack

- **Framework:** Astro 5 (SSR)
- **Editor:** CodeMirror 6
- **Syntax Highlighting:** Shiki
- **Hosting:** Cloudflare Pages
- **Storage:** Cloudflare KV

## Deploy Your Own

1. Fork this repo
2. Create KV namespaces:
   ```bash
   npx wrangler kv namespace create "PASTE_STORE"
   npx wrangler kv namespace create "SESSION"
   ```
3. Create R2 buckets:
   ```bash
   npx wrangler r2 bucket create proti-file-uploads
   npx wrangler r2 bucket create proti-file-uploads-preview
   ```
4. Connect to Cloudflare Pages
5. Add KV and R2 bindings in Settings → Functions → Bindings
6. Add auth secrets/vars:
   - `AUTH_SECRET` (strong random string for signing session cookies)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` (optional; defaults to `https://<your-domain>/api/auth/google/callback`)

## Dev

```bash
bun install
bun run dev
```

## License

MIT
