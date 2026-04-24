# vit-social

Campus social app for VIT students using Next.js and Supabase Auth.

## Run Locally (Bun)

1. Install dependencies:

```bash
bun install
```

2. Copy the environment template and fill in values from the Supabase dashboard:

```bash
cp .env.example .env.local
# Windows (PowerShell): Copy-Item .env.example .env.local
```

Open `.env.local` and set at least `NEXT_PUBLIC_SUPABASE_PROJECT_REF` (this is the project **reference id** in **Project Settings** → **General** — the same id that appears in `https://<ref>.supabase.co`) and one public API key. You can set the full `NEXT_PUBLIC_SUPABASE_URL` instead of the ref if you prefer. See [`.env.example`](./.env.example) for all variables.

3. Start dev server:

```bash
bun run dev
```

4. Open `http://localhost:3000`

## Google sign-in: where to get each value

This app uses **Supabase** as the OAuth bridge: users sign in with Google **through** Supabase. You will create **one OAuth client in Google Cloud** and paste its credentials into **Supabase** (not into `.env`).

### 1) Supabase — enable Google and read the callback URL

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **Sign In / Providers** → **Google** → turn **Enable Sign in with Google** on.
3. On that same page, find **Client IDs** and **Client Secret (for OAuth)** — you will fill these in step 3.
4. **Important callback URL (for Google Cloud):** Supabase will show the redirect URL your Google OAuth client must allow. The standard hosted format is:
   - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
   - Your project ref is the same value as `NEXT_PUBLIC_SUPABASE_PROJECT_REF` in `.env.local` (Project Settings → General → Reference ID).

You do **not** put the Google client id/secret in this repo’s `.env` — only in the Supabase provider screen.

### 2) Google Cloud — create a Web application OAuth 2.0 client

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select or create a project.
2. **APIs & Services** → **OAuth consent screen**: configure the app (user type, app name, support email, developer contact). For testing you can add test users. Save.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. Application type: **Web application**.
5. **Name:** e.g. `vit-social Supabase` (any label).
6. **Authorized JavaScript origins** (required for the browser / local dev):
   - `http://localhost:3000`
   - Your production site origin, e.g. `https://yourdomain.com` (no path).
7. **Authorized redirect URIs** (critical — must match Supabase exactly):
   - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`  
   Use the same URL Supabase shows on the Google provider page. No trailing slash.
8. **Create** → copy the **Client ID** and **Client secret**.

If Google asks to configure the consent screen or enable an API, follow the links in the console until the OAuth client is created.

### 3) Supabase — paste Google credentials and save

1. **Authentication** → **Sign In / Providers** → **Google**.
2. Paste **Client ID** and **Client Secret** from Google Cloud.
3. Save.

### 4) Supabase — site URL and app redirect (this Next.js app)

1. **Authentication** → **URL configuration** (or **Site URL** / **Redirect URLs** in older layouts).
2. **Site URL:** `http://localhost:3000` for local dev (set to your real site URL in production).
3. **Redirect URLs** — add the routes this app may use after auth (PKCE return path):
   - `http://localhost:3000/auth/callback`
   - When you deploy, add `https://yourdomain.com/auth/callback` as well.

This is separate from the Google Cloud redirect: Google redirects to **Supabase** (`...supabase.co/auth/v1/callback`); then Supabase redirects the user’s browser to your app (e.g. `.../auth/callback`).

## Domain Restriction

This app currently allows only users with emails ending in `@vit.edu`.

- Login request includes a Google hosted domain hint for `vit.edu`.
- After login, the app verifies the user email domain.
- If email is not `@vit.edu`, the user is immediately signed out.

Important: client-side checks improve UX but are not a full security boundary. For production-grade enforcement, also enforce domain restrictions in your backend policies and auth rules.

## Deploy

This repo supports two targets. Use the guide that matches your host:

- [Cloudflare Workers (OpenNext)](./README.cloudflare.md) — build must run `opennextjs-cloudflare`, not plain `next build`.
- [Vercel](./README.vercel.md) — standard Next.js build.
