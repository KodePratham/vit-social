# Architecture

This document is the "how does it all fit together" tour for new
contributors. For the classroom-friendly version (PK/FK/RLS vocab, rubric
mapping) see the Database lecture cheatsheet in the root
[`README.md`](../../README.md).

For the Atlas side of the MongoDB story, see
[`mongodb-setup.md`](./mongodb-setup.md). For deployment, see
[`../README.cloudflare.md`](../README.cloudflare.md) or
[`../README.vercel.md`](../README.vercel.md).

## 1. The big picture

```
┌─────────────────────────┐
│  Browser                │  React 19 + Tailwind v4, retro-FB UI
│  (Next.js client)       │
└──────────┬──────────────┘
           │ cookies (Supabase session, PKCE)
           ▼
┌─────────────────────────┐       ┌──────────────────────────┐
│  Next.js server         │──────▶│  Supabase                │
│  (App Router, Route     │       │  - Postgres: users,      │
│   Handlers, Middleware) │       │    friend_requests       │
│                         │       │  - Auth (Google OAuth)   │
│                         │       │  - RLS policies          │
│                         │       └──────────────────────────┘
│                         │       ┌──────────────────────────┐
│                         │──────▶│  MongoDB Atlas           │
│                         │       │  - posts collection      │
└─────────────────────────┘       └──────────────────────────┘
```

- The browser talks to the Next.js server; the browser never speaks
  directly to MongoDB.
- Auth cookies are managed by `@supabase/ssr`. `src/middleware.ts`
  refreshes the session on every request.
- Server routes (route handlers, page loaders) read friendship data from
  Supabase, then — for the feed — query Mongo filtered by friend ids.

## 2. Runtime stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Strict mode. No `pages/` directory. |
| Language | TypeScript 5 | `tsconfig.json` strict. |
| UI | React 19 + Tailwind v4 | Retro-FB utilities live in `src/app/globals.css` (`fb-btn-*`, `fb-panel*`, `fb-input`, `fb-nav-link`). |
| Auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | PKCE flow via `/auth/callback`. |
| SQL store | Supabase Postgres | Migrations under `sql/`, applied in numerical order. |
| Doc store | MongoDB Atlas (`mongodb` driver) | `runtime = "nodejs"` on `/api/posts`. |
| Package manager | [Bun](https://bun.sh/) | Lockfile `bun.lock`. npm works too but may diverge. |
| Linter | ESLint + `eslint-config-next` | Run with `bun run lint`. |

## 3. Source layout

```
vit-social/
├── src/
│   ├── app/
│   │   ├── page.tsx             Landing + Google sign-in card
│   │   ├── layout.tsx           Root HTML / metadata
│   │   ├── globals.css          Tailwind + fb-* retro utilities
│   │   ├── auth/callback/       PKCE exchange route handler
│   │   ├── feed/                Friend-only feed page
│   │   ├── friends/             Friends list + people-you-may-know
│   │   ├── profile/             Profile edit + friend requests + search
│   │   ├── find-roommate/       Roommate-matching page
│   │   └── api/posts/route.ts   GET/POST for the Mongo-backed feed
│   ├── components/
│   │   ├── site-header.tsx      Shared navy header + nav tabs (client)
│   │   └── profile-avatar.tsx   Avatar with initials fallback
│   ├── lib/
│   │   ├── auth/email-domain.ts Domain allow-list ("@vit.edu")
│   │   ├── supabase/            Browser + server Supabase clients, config
│   │   ├── mongodb.ts           Singleton Mongo client + helpers
│   │   ├── post-friends.ts      Friend-id loader for the feed
│   │   ├── profile-shared.ts    Types + display helpers for profiles
│   │   ├── friend-suggestions.ts People-you-may-know scoring
│   │   ├── branches.ts          VIT branch + division config
│   │   └── roommate-finder.ts   Campuses + gender option types
│   └── middleware.ts            Session refresh via Supabase helpers
├── sql/                         Numbered Postgres migrations
├── docs/                        This folder
├── public/                      Favicon + static assets
├── open-next.config.ts          OpenNext adapter config for Cloudflare
├── wrangler.jsonc               Worker config (entry, compat flags)
└── package.json                 Scripts: dev, build, build:cloudflare, …
```

## 4. Auth flow

1. User clicks "Log in with Google (@vit.edu)" on `/`.
2. Browser calls
   `supabase.auth.signInWithOAuth({ provider: "google", ... })` with
   `redirectTo = <origin>/auth/callback?next=/profile` and Google `hd`
   hint set to `vit.edu`.
3. Google redirects back to **Supabase's** callback
   (`https://<ref>.supabase.co/auth/v1/callback`).
4. Supabase then redirects the browser to this app's `/auth/callback`
   which runs `exchangeCodeForSession` and sets auth cookies.
5. On every subsequent request, `src/middleware.ts` ensures the session
   cookie is fresh.
6. The client-side `Home`, `Profile`, etc. pages also double-check that
   the email ends in `@vit.edu` and sign out otherwise.

SQL migration `005_enforce_vit_email_domain.sql` backs this up at the
database layer so non-VIT accounts cannot exist as rows in `users`.

## 5. Data model

### PostgreSQL — `users`

Synced from `auth.users` via the trigger in
`sql/002_sync_auth_users_trigger.sql`. Profile fields are added in later
migrations (`004_...`, `006_...`, `007_...`, `008_...`). See
`src/lib/profile-shared.ts` for the TypeScript shape used by the UI.

### PostgreSQL — `friend_requests`

- `requester_id`, `receiver_id` → `users.id` (UUID).
- `status ∈ {pending, accepted, rejected}`.
- Partial unique index prevents duplicate active requests per unordered
  pair.
- RLS policies restrict who can read/update which rows.

### MongoDB — `posts`

```json
{
  "_id": ObjectId("…"),
  "authorId": "<supabase-user-uuid>",
  "body": "Hello VIT!",
  "createdAt": ISODate("…")
}
```

`authorId` is application-enforced — there is no SQL foreign key across
stores. `src/app/api/posts/route.ts` always filters by the current user's
friends union `{ self }` to enforce privacy.

Recommended index at scale: `{ authorId: 1, createdAt: -1 }`. See
[`mongodb-setup.md`](./mongodb-setup.md).

## 6. Feed request, end-to-end

`GET /api/posts` (simplified):

1. Reject if `MONGODB_URI` is missing → HTTP 503.
2. Fetch current Supabase user; reject if missing → HTTP 401.
3. `getAcceptedFriendIds(supabase, user.id)` — one SQL query on
   `friend_requests`.
4. Mongo `find({ authorId: { $in: [user.id, ...friendIds] } })`, sorted
   by `createdAt` descending, limit configurable.
5. Pull author profiles from Supabase `users` for display names / avatars.
6. Return `{ posts: [...] }` as JSON.

`POST /api/posts` validates the body (non-empty, ≤ 8000 chars), sets
`authorId` from the server session (never trusted from the client), and
`insertOne` into Mongo.

## 7. Front-end conventions

- **Client vs server:** pages live under `src/app/**/page.tsx`. Any page
  that uses hooks, event handlers or `window` starts with `"use client"`.
  Data mutations and external I/O belong in server route handlers or
  server actions, not the browser (except via Supabase's anon key where
  RLS is the security boundary).
- **Shared header:** every signed-in page renders `<SiteHeader />` from
  `src/components/site-header.tsx`. It knows the current route via
  `usePathname()` and highlights the active tab.
- **Retro FB look:** use the `fb-*` utility classes declared in
  `src/app/globals.css`:
  - Buttons: `fb-btn-primary`, `fb-btn-secondary`, `fb-btn-danger`;
    combine with `fb-btn-lg` for hero CTAs.
  - Layout: `fb-panel`, `fb-panel-header`, `fb-panel-subheader`.
  - Inputs: `fb-input`, `fb-nav-link`.
  - Section titles: `fb-section-title` (classic navy Tahoma bold).
- **Colour tokens:** the palette is declared as CSS variables
  (`--fb-blue`, `--fb-link`, `--fb-bg`, …). Prefer
  `text-[color:var(--fb-link)]` over hard-coding `#385898` everywhere.

## 8. Deployment surfaces

- **Vercel** — standard Next.js build. Set the Supabase (and optionally
  Mongo) env vars, then deploy. Notes in
  [`../README.vercel.md`](../README.vercel.md).
- **Cloudflare Workers (OpenNext)** — build with
  `bun run build:cloudflare` so `.open-next/worker.js` and
  `.open-next/assets/` are produced. Notes in
  [`../README.cloudflare.md`](../README.cloudflare.md). The feed route
  pins `runtime = "nodejs"` and we rely on `nodejs_compat` +
  `nodejs_compat_v2` in [`wrangler.jsonc`](../wrangler.jsonc).

Both hosts need:

- `NEXT_PUBLIC_SUPABASE_PROJECT_REF` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `MONGODB_URI` (**server-only**, never `NEXT_PUBLIC_`)

## 9. Testing (current state)

There is no automated test suite yet. Contributions that add unit /
integration tests are welcome — start with the helpers in
`src/lib/profile-shared.ts`, `src/lib/friend-suggestions.ts` and
`src/lib/branches.ts`, which are pure functions with clear inputs /
outputs.

Any test runner that fits well with Next.js 16 + Bun is fair game; propose
your choice in an issue before committing a framework, so maintainers can
align on it.
