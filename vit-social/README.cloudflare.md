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

This app reads **`NEXT_PUBLIC_SUPABASE_*`** in the browser and in server code. Next.js **inlines** those values into client JavaScript at **build time** (`bun run build:cloudflare`). If they are missing during that step, the deployed site can look “configured” on the server but the **browser Supabase client will be wrong or empty** — Google OAuth often fails or redirects incorrectly.

### Build-time (Workers Builds / CI)

In **Cloudflare Workers Builds** (or any CI that runs the OpenNext build), add the **same** variables you use on Vercel as **build environment variables**, for example:

- `NEXT_PUBLIC_SUPABASE_PROJECT_REF` or `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

This mirrors Vercel, where those values are available when `next build` runs.

### Runtime (Worker)

Also define the same keys for the **Worker** runtime (dashboard **Settings → Variables** for the worker, or `vars` in [`wrangler.jsonc`](./wrangler.jsonc) for public values, or `wrangler secret put` only for truly private server secrets). Server-side rendering and route handlers read `process.env` in the Worker.

### OAuth / redirects

After you know the public URL (custom domain or `*.workers.dev`), update:

1. **Supabase → Authentication → URL configuration** — **Site URL** and **Redirect URLs** including `https://<host>/auth/callback`.
2. **Google Cloud Console** — **Authorized JavaScript origins** must include `https://<host>` (no path).

See [Connect a custom domain on Cloudflare](./README.domain-cloudflare.md).

### Secrets vs public keys

- The **anon / publishable** key is **not** a server-only secret: it is shipped to the browser by design. Protect data with **Row Level Security** in Supabase, not by hiding the anon key.
- Use **Wrangler secrets** (or Cloudflare **Secrets**) only for values that must never reach the client (e.g. a **service role** key if you add server-only admin code). Do **not** commit real keys to git.

## Troubleshooting

| Error | Cause |
|-------|--------|
| `The entry-point file at ".open-next/worker.js" was not found` | Build step ran `next build` only. Switch the CI **build command** to `bun run build:cloudflare`. |
| Stale bundle | Ensure `.open-next/` is not committed; it is gitignored and must be produced on each deploy. |
| Google login works on Vercel but not on Cloudflare | Usually **missing `NEXT_PUBLIC_*` during the OpenNext build**, or **Supabase / Google OAuth** still only lists your Vercel URL. Add the Cloudflare URL to **Supabase redirect URLs**, **Google Authorized JavaScript origins**, and set **build** env vars in Workers Builds. See [Why OAuth differs by host](#google-oauth-on-cloudflare-vs-vercel) below. |
| Redirect to `/?error=auth` after Google | `exchangeCodeForSession` failed — often redirect URL mismatch, wrong Supabase URL/key in the environment that ran the callback, or clock/skew issues. Confirm `/auth/callback` is allowlisted in Supabase. |

### Google OAuth on Cloudflare vs Vercel

Both hosts run the same code, but:

1. **Build-time env:** Vercel injects `NEXT_PUBLIC_*` when building. Cloudflare must do the same during `build:cloudflare`, or the client bundle will not match your Supabase project.
2. **Allowlists:** OAuth uses `window.location.origin` for `redirectTo` (your Cloudflare domain on Cloudflare, Vercel domain on Vercel). Each new hostname must be added to **Supabase** and **Google** as above.
3. **Runtime-only vars** on the Worker do **not** fix a client bundle that was built without `NEXT_PUBLIC_*`; you must redeploy after fixing **build** env.

## Preview locally

```bash
bun run preview
```

This runs the OpenNext Cloudflare build, then the adapter’s preview server.
