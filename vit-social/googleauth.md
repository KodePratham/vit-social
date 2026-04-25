# Google sign-in prerequisites and setup (vitsocial.xyz on Cloudflare)

This app signs in with **Google through Supabase**. The browser talks to Supabase; Google’s OAuth client redirects to **Supabase’s callback URL**, not directly to your site. Your production domain (`https://vitsocial.xyz` and/or `https://www.vitsocial.xyz`) must still be allowlisted in **Google** and **Supabase** so the flow can start and finish on your hostname.

## Prerequisites checklist

| Prerequisite | Why it matters |
|--------------|----------------|
| **Supabase project** with Auth enabled | Hosts the Google provider and issues sessions to this app. |
| **Google Cloud project** with OAuth consent screen configured | Required before any OAuth client works. |
| **OAuth 2.0 “Web application” client** in Google Cloud | Provides Client ID and Client Secret you paste into Supabase (not into this repo’s `.env`). |
| **Supabase → Google provider** enabled with that Client ID + Secret | Without this, “Sign in with Google” cannot complete. |
| **Supabase → URL configuration** matches how users open the site | **Site URL** and **Redirect URLs** must include your real HTTPS origin(s) and `/auth/callback`. |
| **Google → Authorized JavaScript origins** includes each HTTPS origin users use | Must include **exact** origins (e.g. `https://vitsocial.xyz` and `https://www.vitsocial.xyz` if both are used). No path, no trailing slash on the path part. |
| **Google → Authorized redirect URIs** includes Supabase’s callback only | Typically `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback` — the URL Supabase shows on the Google provider page. **Not** `https://vitsocial.xyz/...`. |
| **Cloudflare Workers: `NEXT_PUBLIC_*` present at build time** | OpenNext inlines these into the client bundle during `bun run build:cloudflare`. If they are missing in **Workers Builds / CI**, the deployed site can break OAuth even when runtime vars look correct. |
| **Cloudflare Workers: same `NEXT_PUBLIC_*` at runtime** | Server routes (e.g. `/auth/callback`) must use the same Supabase URL and anon key as the browser. |
| **HTTPS on production** | OAuth and secure cookies expect `https://` for your live domain. |

Optional but important for this codebase:

- The app restricts sign-in to **`@vit.edu`** emails and passes a Google `hd` hint. Test users on the **OAuth consent screen** (or a published app) must be able to complete Google’s step with an allowed account.

---

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select (or create) a project.
2. **APIs & Services → OAuth consent screen**  
   - Configure app name, support email, developer contact.  
   - For **Testing**, add **Test users** who can sign in until the app is published.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**  
   - Application type: **Web application**.
4. **Authorized JavaScript origins** — add every origin where the app runs (each on its own line):

   - Local: `http://localhost:3000`
   - Production: `https://vitsocial.xyz`  
   - If you also serve `www`: `https://www.vitsocial.xyz`

   Use **origin only** (scheme + host + optional port). Do **not** append `/auth/callback` here.

5. **Authorized redirect URIs** — add **exactly** what Supabase documents for Google (see step 2 below). The usual hosted form is:

   `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

   No trailing slash. This is **not** your Cloudflare domain.

6. Create the client and copy **Client ID** and **Client secret**.

---

## 2. Supabase Dashboard

1. **Authentication → Sign In / Providers → Google**  
   - Enable **Sign in with Google**.  
   - Paste **Client ID** and **Client Secret** from Google Cloud.  
   - Note the **callback / redirect URL** Supabase shows for Google — it must match **Authorized redirect URIs** in Google Cloud character-for-character.

2. **Authentication → URL configuration** (names may vary slightly in the UI):

   - **Site URL:** the primary URL users use in production, e.g. `https://vitsocial.xyz` or `https://www.vitsocial.xyz` (pick one canonical entry point; redirect the other hostname in Cloudflare if needed).
   - **Redirect URLs:** must include the PKCE return path this app uses:

     `https://vitsocial.xyz/auth/callback`  
     `https://www.vitsocial.xyz/auth/callback`  

     (Include both if both hostnames are valid ways to open the app.)

   The app sets `redirectTo` to `${window.location.origin}/auth/callback?next=/dashboard`, so the origin in the browser **must** match an allowed redirect pattern in Supabase.

---

## 3. Cloudflare (Workers + OpenNext)

1. **Build environment variables** (Workers Builds / CI that runs `bun run build:cloudflare`):

   - `NEXT_PUBLIC_SUPABASE_PROJECT_REF` **or** `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` **or** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

   If these are missing at **build** time, the client bundle may point at the wrong or empty Supabase project; Google login often fails or redirects incorrectly.

2. **Worker runtime variables:** define the **same** `NEXT_PUBLIC_*` values for the deployed Worker so server-side auth (including `/auth/callback`) matches the browser.

3. After changing env vars, **redeploy** so a new bundle is produced.

4. **Custom domain:** ensure `vitsocial.xyz` (and `www` if used) is attached to the correct Worker and served over HTTPS. See [`README.domain-cloudflare.md`](./README.domain-cloudflare.md) for DNS, cache, and “stale `/_next/static`” issues that can look like a broken app but are separate from OAuth.

More detail: [`README.cloudflare.md`](./README.cloudflare.md).

---

## 4. Quick verification

1. Open the site exactly as users do (e.g. `https://www.vitsocial.xyz` vs apex) and try Google sign-in.
2. If you land on `/?error=auth`, the `/auth/callback` handler could not exchange the code — often **redirect URL mismatch**, **wrong Supabase URL/key in the environment that served the callback**, or **Supabase redirect allowlist** missing that origin’s `/auth/callback`.
3. In the browser **Network** tab, confirm requests go to your expected `*.supabase.co` project.

---

## 5. Common mistakes (Cloudflare + custom domain)

- **Only Vercel or localhost** in Supabase redirect URLs or Google JavaScript origins — add **`https://vitsocial.xyz`** (and `www` if applicable).
- **Google redirect URI** set to the app domain — it must be **Supabase’s** `/auth/v1/callback` URL.
- **`NEXT_PUBLIC_*` only set at Worker runtime** — client still built without them; fix **build** env and redeploy.
- **Apex vs `www`** — user opens one hostname but **Site URL** or redirect allowlist only lists the other; align or allow both.
- **OAuth consent** still in testing without your Google account as a **test user**.

For the full step-by-step that mirrors local dev, see [Google sign-in in `README.md`](./README.md#google-sign-in-where-to-get-each-value).
