# proti

A minimal pastebin with syntax highlighting, built with Astro + CodeMirror on Cloudflare.

**Live:** [paste.neekhar.dev](https://paste.neekhar.dev)

## Features

- Syntax highlighting for 15+ languages
- Auto-indentation, bracket matching, code folding
- Light/dark theme
- 30-day auto-expiration
- Google sign-in for protected file uploads
- File upload portal with clipboard paste support (1-hour expiry)
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
3. Connect to Cloudflare Pages
4. Add KV bindings in Settings → Functions → KV namespace bindings
5. Add auth secrets/vars:
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
