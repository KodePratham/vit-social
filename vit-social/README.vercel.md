# Deploy on Vercel

This project is a standard **Next.js** app. Vercel’s default detection and build settings work with no Cloudflare-specific steps.

## Quick setup

1. Import the Git repository in the [Vercel dashboard](https://vercel.com/new).
2. **Framework preset:** Next.js (auto-detected).
3. **Build command:** leave default (`next build`) or explicitly `bun run build` / `npm run build` depending on your package manager.
4. **Install command:** for this repo, Bun is recommended, e.g. `bun install --frozen-lockfile`. If you use npm, run `npm install` (you may want to generate a `package-lock.json` for reproducible installs).
5. **Output:** Next.js default (no static `output: 'export'` in this project).

Do **not** set the Cloudflare OpenNext build (`build:cloudflare`) as the Vercel build command — that target is only for Cloudflare Workers. See [`README.cloudflare.md`](./README.cloudflare.md).

## Environment variables

In the Vercel project → **Settings → Environment Variables**, add the variables from [`.env.example`](./.env.example), at least:

- `NEXT_PUBLIC_SUPABASE_PROJECT_REF` or full `NEXT_PUBLIC_SUPABASE_URL`
- Your public Supabase anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` or as documented in `.env.example`)

Apply them to **Production** (and **Preview** if you use preview deployments).

Then in **Supabase → Authentication → URL configuration**:

- Set **Site URL** to your Vercel production URL (and preview URL patterns if needed).
- Add redirect URL: `https://<your-vercel-domain>/auth/callback`.

## Custom domain

Add the domain in Vercel, then add the same origin to Google OAuth **Authorized JavaScript origins** and update Supabase redirect URLs to match.

## Local parity

```bash
bun install
cp .env.example .env.local   # then fill values
bun run build
bun run start
```

`bun run build` matches what Vercel runs for a typical Next.js deployment.
