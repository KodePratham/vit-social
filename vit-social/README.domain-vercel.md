# Connect a custom domain (Vercel)

Vercel issues TLS certificates and routes traffic to your Next.js deployment when you add a domain to the project.

## Steps

1. Open your project in the [Vercel Dashboard](https://vercel.com/dashboard).
2. Go to **Settings** → **Domains**.
3. Enter your domain (e.g. `example.com` or `www.example.com`) and follow the prompts.
4. At your **DNS provider**, add the records Vercel shows (usually **A** / **CNAME** for Vercel’s edge). Wait for **Valid Configuration** in the dashboard.

**Apex (`example.com`)** and **www** often need two entries or a redirect rule; Vercel’s UI explains the exact records.

## After DNS validates

1. **Supabase:** **Authentication → URL configuration** — set **Site URL** to `https://your-domain` and add redirect URL `https://your-domain/auth/callback`.
2. **Google Cloud Console** — **Authorized JavaScript origins**: add `https://your-domain` (and `https://www...` if you use www). Origins have **no path**.
3. **Preview deployments:** If you use Supabase with preview URLs, add each preview origin or use a pattern Supabase allows; otherwise only production may sign in.

## Apex vs www

Pick one canonical URL for **Site URL** in Supabase and in Google **JavaScript origins**, and redirect the other in Vercel (**Settings → Domains** redirect) so users always land on one origin. Mixed origins can break OAuth cookies if redirects bounce between hostnames.

## See also

- [Deploy on Vercel](./README.vercel.md)
- [Google sign-in checklist](./README.md#google-sign-in-where-to-get-each-value)
