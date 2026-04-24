# Deploy on Cloudflare (Workers + OpenNext)

This app uses [**OpenNext**](https://opennext.js.org/) with [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) so Next.js runs on Cloudflare Workers. A plain `next build` is **not** enough: Wrangler expects a generated worker at `.open-next/worker.js` (and static assets under `.open-next/assets`), which only appears after the OpenNext Cloudflare build.

## Prerequisites

- Cloudflare account and a Workers (or Workers Builds) setup for this repo
- [Bun](https://bun.sh/) or Node + your preferred package manager (lockfile is Bun)
- Supabase env vars available in the Worker environment (see below)

## Build command (critical)

In **Cloudflare Workers Builds** (or any CI), set the **build command** to:

```bash
bun run build:cloudflare
```

Do **not** use `bun run build` alone for deployments that run `wrangler deploy` / `wrangler versions upload`. The default `build` script is only `next build` (used for Vercel and local checks).

Install step should stay frozen-lockfile when possible, for example:

```bash
bun install --frozen-lockfile
```

## Deploy command

After a successful `build:cloudflare`, the deploy step can run Wrangler as you already configure it, for example:

```bash
npx wrangler deploy
```

or, for versioned uploads:

```bash
npx wrangler versions upload
```

Locally you can use:

```bash
bun run deploy
# or
bun run upload:version
```

## Configuration files

| File | Role |
|------|------|
| [`wrangler.jsonc`](./wrangler.jsonc) | Worker entry `main`: `.open-next/worker.js`, assets from `.open-next/assets` |
| [`open-next.config.ts`](./open-next.config.ts) | OpenNext Cloudflare adapter config |

If you rename the Worker in `wrangler.jsonc`, keep the **`services`** entry’s `service` name aligned with the top-level worker name when using the self-reference binding (required by this adapter).

## Environment variables

Set the same Supabase-related variables you use locally (see [`.env.example`](./.env.example)) in the Cloudflare dashboard for the Worker, or via Wrangler:

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
# …repeat for other secrets
```

Use `vars` in `wrangler.jsonc` only for non-secret **public** config (e.g. `NEXT_PUBLIC_*`). Never commit real secrets.

Also update **Supabase → Authentication → URL configuration** with your Cloudflare site URL and redirect URL `https://<your-domain>/auth/callback`.

## Troubleshooting

| Error | Cause |
|-------|--------|
| `The entry-point file at ".open-next/worker.js" was not found` | Build step ran `next build` only. Switch the CI **build command** to `bun run build:cloudflare`. |
| Stale bundle | Ensure `.open-next/` is not committed; it is gitignored and must be produced on each deploy. |

## Preview locally

```bash
bun run preview
```

This runs the OpenNext Cloudflare build, then the adapter’s preview server.
