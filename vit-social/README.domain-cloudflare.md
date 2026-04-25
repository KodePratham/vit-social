# Connect a custom domain (Cloudflare Workers)

Your Worker is deployed with Wrangler; visitors reach it either on a `*.workers.dev` hostname or on a **custom domain** you attach in Cloudflare DNS and routing.

## Option A — Domain already on Cloudflare DNS

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → select the **zone** (your domain).
2. Go to **Workers & Pages** → your Worker (`vit-social` or the name in [`wrangler.jsonc`](./wrangler.jsonc)).
3. Open **Settings** → **Domains & Routes** (or **Triggers** / **Custom Domains**, depending on UI).
4. Click **Add** / **Add Custom Domain** and enter e.g. `app.example.com` or `www.example.com`.
5. Cloudflare will create the DNS records and certificate automatically when the hostname is proxied (orange cloud).

No separate “A record to Vercel” step — traffic goes to the Worker.

## Option B — Domain on another registrar

1. Either **transfer** DNS to Cloudflare (recommended if you use Workers heavily) or keep the registrar and point **nameservers** to Cloudflare.
2. Add the zone in Cloudflare, wait for DNS to be active.
3. Follow **Option A** to bind the hostname to the Worker.

If you only add a CNAME at an external DNS provider, it must point to the hostname Cloudflare shows for your Worker/custom domain setup (follow the dashboard wizard).

## After the domain works

1. **HTTPS:** Custom domains on Cloudflare get TLS automatically. Your app should only be used on `https://` in production.
2. **Supabase:** In **Authentication → URL configuration**, set **Site URL** to `https://your-domain` and add **Redirect URL** `https://your-domain/auth/callback`.
3. **Google Cloud Console** (OAuth client): Under **Authorized JavaScript origins**, add `https://your-domain`. Do not add paths. For **Authorized redirect URIs**, keep Supabase’s URL (`https://<project-ref>.supabase.co/auth/v1/callback`), not your app URL — Google redirects to Supabase first.
4. **Rebuild / redeploy** if you changed build-time env vars (see [`README.cloudflare.md`](./README.cloudflare.md)).

## Workers on a path (advanced)

If you mount the Worker under a path instead of the apex, `redirectTo` in the app uses `window.location.origin`, so the path prefix must match how users open the site, and Supabase redirect URLs must match exactly (including path if you use path-based routing).

For most setups, use a dedicated hostname (e.g. `app.example.com`) at the root path.

## CSS or JS “broken” only on the custom domain (not on `*.workers.dev`)

`*.workers.dev` and your own hostname do **not** use the same Cloudflare settings. The zone for **vitsocial.xyz** can apply **Speed** and **Scrape Shield** features that never run on `*.workers.dev`, which often looks like unstyled pages or “half working” client JS.

1. **Confirm what failed (30 seconds in DevTools)**  
   On `https://www.vitsocial.xyz`, open **Network**, reload, and check requests under `/_next/static/` (CSS/JS/chunks).  
   - **404** on those URLs → routing, cache, or a stale HTML/asset mismatch; purge cache and redeploy, or confirm the custom domain is bound to the **same** Worker as `wrangler.jsonc` / Dashboard.  
   - **200** but the page is still unstyled → often **HTML/JS was altered** by a Cloudflare feature (next steps).

2. **Turn off features that break React / Next.js** (Dashboard → your **zone** → **vitsocial.xyz**, not the Worker screen):  
   - **Speed → Optimization:** disable **Rocket Loader** (it injects async script loading and often breaks modern bundles).  
   - **Speed → Optimization:** set **Auto Minify** to **off** for HTML, JS, and CSS (minifying already-built Next assets can corrupt them).  
   - **Scrape Shield:** disable **Email Address Obfuscation** for the app (it can rewrite HTML in ways that break hydration).

3. **Purge cache** (Caching → Configuration → **Purge Everything**) after a bad deploy or while debugging stale `/_next/static` references.

4. **Hostname coverage:** If you use both `www` and the apex, attach **both** in Workers → your Worker → **Custom domains** (or add a redirect rule) so you do not serve one hostname from a different service or an old record.

5. **Vercel** working does not imply DNS for `vitsocial.xyz` points at Workers. If the domain is still **double-assigned** (e.g. a leftover A/CNAME to another host) or only the apex is on Workers while `www` is not, you can get HTML from one place and failed or cached-wrong assets. Check **DNS** for `www` and `@` in the vitsocial.xyz zone.

## 404 on `/_next/static/...` (chunks, CSS, `turbopack-...js`)

That means the browser is requesting **file names** that are **not** in the current Worker deployment, almost always because **stale HTML** (from a previous build) is still being shown. The HTML still references those old hash names, but the new deploy’s `.open-next/assets` only contains the **new** hashes — so every `/_next/static/chunks/...` and CSS file 404s.

**Fix (in order):**

1. In the **vitsocial.xyz** zone: **Caching → Purge Everything**.
2. Look for a **Cache Rule** or **Page Rule** with **Cache Everything** on all URLs — that often caches the **HTML document** and breaks Next after each deploy. Remove or narrow it; long caching is correct for `/_next/static/*` (content-hashed), not necessarily for `HTML` of `/` and app routes.
3. **Redeploy** after a full `bun run build:cloudflare` so the Worker and all assets are one consistent release.
4. Test in a **private window** with DevTools **Network → Disable cache** on, then hard reload.

Adding Supabase or Google **redirect URIs** does **not** fix these 404s — that is a cache/deploy alignment issue, not auth configuration.

## Where to add app URLs (Supabase, Google)

Use these for **sign-in and OAuth** when login is enabled. They do not affect static `/_next/static` 404s.

| Where | Path in dashboard | What to set |
|--------|-------------------|------------|
| **Supabase** | **Authentication** → **URL configuration** | **Site URL:** your canonical production origin, e.g. `https://vitsocial.xyz` or `https://www.vitsocial.xyz`. **Redirect URLs:** include that origin’s `/auth/callback`, and include both apex and `www` callback URLs if users can open both hostnames. |
| **Google** | **APIs & Services** → **Credentials** → your **OAuth 2.0 Client ID** | **Authorized JavaScript origins:** every production origin users can open, e.g. `https://vitsocial.xyz` and/or `https://www.vitsocial.xyz` (origin only, no path). **Authorized redirect URIs:** the URL Supabase gives you for Google (typically `https://<project-ref>.supabase.co/auth/v1/callback`) — not your vitsocial domain, because the browser does not return to your app in the first Google hop. |

## See also

- [Deploy on Cloudflare](./README.cloudflare.md) — build command and env vars (critical for auth).
- [Google sign-in checklist](./README.md#google-sign-in-where-to-get-each-value) in the main README.
