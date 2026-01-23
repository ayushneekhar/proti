# proti

A minimal pastebin with syntax highlighting, built with Astro + CodeMirror on Cloudflare.

**Live:** [neekhar.dev/paste](https://neekhar.dev/paste)

## Features

- Syntax highlighting for 15+ languages
- Auto-indentation, bracket matching, code folding
- Light/dark theme
- 30-day auto-expiration
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

## Dev

```bash
bun install
bun run dev
```

## License

MIT
