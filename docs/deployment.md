# Stable deployment

Shufflow targets Cloudflare-compatible edge hosting. Build with `npm run build`.

For Cloudflare Workers, authenticate once with `npx wrangler login`, then run `npm run deploy:cloudflare`. Subsequent deployments update the same public URL.

The production output is generated in `.output/server` and `.output/public`. For Sites, run `npm run package:sites`; the adapter preserves the Worker module tree and serves the generated public assets through the Worker entry point.

Set `OPENAI_API_KEY` as a server-side secret to call GPT-4.1 directly. `LOVABLE_API_KEY` remains supported as an alternative for the Lovable AI gateway, and `OPENAI_API_KEY` takes precedence when both exist. Demo Mode remains deterministic and does not require either secret.

Never commit `.env`, `.dev.vars`, or a real key. Use `.env.example` only as the public template.
