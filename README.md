# vitsocial.xyz

> A retro-Facebook-inspired campus social network for **VIT students**, built
> with Next.js 16, Supabase and MongoDB Atlas.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Stack: Next.js + Supabase + MongoDB](https://img.shields.io/badge/stack-Next.js%20%7C%20Supabase%20%7C%20MongoDB-3b5998)](#architecture-at-a-glance)
[![Deploy: Vercel or Cloudflare](https://img.shields.io/badge/deploy-Vercel%20%7C%20Cloudflare%20Workers-3b5998)](#deploy)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

vitsocial.xyz is a small open-source social app scoped to `@vit.edu`
accounts. Sign in with Google, fill your profile (branch + division, bio,
socials), send friend requests, share posts with friends, and find a
roommate on the same campus.

The UI is deliberately **old-school Facebook (circa 2008–2010)** — navy
header, Tahoma, boxy panels, no rounded bubbles — because it's fun and
because it keeps the interaction model simple.

> The Next.js app lives in [`vit-social/`](./vit-social). Most commands in
> this document assume you have `cd`'d into that folder.

## Table of contents

- [Features](#features)
- [Architecture at a glance](#architecture-at-a-glance)
- [Quick start (local)](#quick-start-local)
- [Google sign-in setup](#google-sign-in-setup)
- [Domain restriction](#domain-restriction)
- [Deploy](#deploy)
- [Project layout](#project-layout)
- [Database cheatsheet (DBMS lecture companion)](#database-lecture-cheatsheet)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Features

- **Google sign-in through Supabase**, restricted to `@vit.edu` emails.
- **Profile** with bio, social links (Instagram / Twitter / LinkedIn /
  GitHub) and VIT branch + division.
- **Directory / search** across all VIT students on the site.
- **Friend requests** (send / accept / reject) with a friends-only graph.
- **People you may know** — mutual-friend + branch/division scoring.
- **Friend-only feed** backed by MongoDB Atlas.
- **Roommate finder** that matches on hostel campus and gender preference.
- **Row-Level Security** in Supabase and server-side filtering for the
  MongoDB feed.

## Architecture at a glance

```
┌───────────────────────────────┐
│  Next.js 16 (App Router)      │   React 19 client, Tailwind v4
│  + Supabase SSR + PKCE auth   │
└──────────────┬────────────────┘
               │
               ▼
┌──────────────────────┐      ┌──────────────────────────┐
│  PostgreSQL          │◀────▶│  MongoDB Atlas           │
│  via Supabase        │      │  (feed posts)            │
│  - users             │      │  - posts {              │
│  - friend_requests   │      │      authorId,         │
│  (+ RLS policies)    │      │      body, createdAt }  │
└──────────────────────┘      └──────────────────────────┘
```

- **Supabase (PostgreSQL)** holds identities and the friendship graph,
  enforced with Row-Level Security and numbered migrations under
  [`vit-social/sql/`](./vit-social/sql).
- **MongoDB Atlas** stores the free-form post bodies. `/api/posts` reads
  friends from Supabase first, then queries MongoDB filtered by those
  author ids, so friendship is always enforced server-side.

See [`vit-social/docs/architecture.md`](./vit-social/docs/architecture.md)
for the longer write-up, and
[`vit-social/docs/mongodb-setup.md`](./vit-social/docs/mongodb-setup.md)
for the Atlas walkthrough.

## Quick start (local)

```bash
cd vit-social

# 1. Install deps (Bun is the canonical package manager)
bun install

# 2. Copy the env template and fill values from Supabase (and optionally Mongo)
cp .env.example .env.local
# Windows PowerShell:
#   Copy-Item .env.example .env.local

# 3. Apply SQL migrations in Supabase (paste each file from sql/ in order
#    into Supabase → SQL editor and run them).

# 4. Start the dev server
bun run dev
```

Then open <http://localhost:3000> and sign in with a `@vit.edu` Google
account.

At minimum `.env.local` needs either
`NEXT_PUBLIC_SUPABASE_PROJECT_REF` or `NEXT_PUBLIC_SUPABASE_URL`, plus one
public API key. The feed additionally needs `MONGODB_URI`. See
[`vit-social/.env.example`](./vit-social/.env.example).

## Google sign-in setup

This app uses **Supabase** as the OAuth bridge: users sign in with Google
**through** Supabase. You create **one OAuth client in Google Cloud** and
paste its credentials into **Supabase**, not into this repo's `.env`.

### 1) Supabase — enable Google and read the callback URL

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **Authentication → Sign In / Providers → Google** → turn on
   **Enable Sign in with Google**.
3. On that same page, note the **Client IDs** and **Client Secret (for
   OAuth)** fields — you'll fill these in step 3.
4. **Callback URL for Google Cloud:** Supabase displays a redirect URL that
   your Google OAuth client must allow. It looks like:

   `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

   Your project ref is the same value as
   `NEXT_PUBLIC_SUPABASE_PROJECT_REF` in `.env.local` (Project Settings →
   General → Reference ID).

You do **not** paste the Google client id/secret in this repo's `.env` —
only in the Supabase provider screen.

### 2) Google Cloud — create a Web application OAuth 2.0 client

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and
   select or create a project.
2. **APIs & Services → OAuth consent screen:** configure user type, app
   name, support email, developer contact. For testing you can add test
   users. Save.
3. **APIs & Services → Credentials → Create credentials → OAuth client
   ID**.
4. Application type: **Web application**.
5. **Name:** e.g. `vit-social Supabase` (any label).
6. **Authorized JavaScript origins** (required for the browser / local
   dev):
   - `http://localhost:3000`
   - Your production site origin, e.g. `https://yourdomain.com` (no path).
7. **Authorized redirect URIs** (must match Supabase exactly):
   - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
     — the same URL Supabase shows on the Google provider page. No
     trailing slash.
8. **Create** → copy the **Client ID** and **Client secret**.

### 3) Supabase — paste Google credentials and save

1. **Authentication → Sign In / Providers → Google**.
2. Paste **Client ID** and **Client Secret** from Google Cloud.
3. Save.

### 4) Supabase — site URL and app redirect

1. **Authentication → URL configuration** (or **Site URL** / **Redirect
   URLs** in older layouts).
2. **Site URL:** `http://localhost:3000` for local dev (set to your real
   site URL in production).
3. **Redirect URLs** — add the routes this app may use after auth (PKCE
   return path):
   - `http://localhost:3000/auth/callback`
   - In production, add `https://yourdomain.com/auth/callback` as well.

This is separate from the Google Cloud redirect: Google redirects to
**Supabase** (`...supabase.co/auth/v1/callback`); then Supabase redirects
the user's browser to your app (e.g. `.../auth/callback`).

Production-specific tips (Cloudflare, `vitsocial.xyz`, etc.) live in
[`vit-social/googleauth.md`](./vit-social/googleauth.md).

## Domain restriction

The app currently allows only users with emails ending in `@vit.edu`.

- The login request includes a Google `hd` hint for `vit.edu`.
- After login, the app verifies the email domain client-side.
- A SQL policy also rejects non-`@vit.edu` rows at the database level (see
  [`vit-social/sql/005_enforce_vit_email_domain.sql`](./vit-social/sql/005_enforce_vit_email_domain.sql)).

Client-side checks improve UX but should never be your only security
boundary. For production-grade enforcement, keep the SQL policy in place
and enforce at the API layer as well.

## Deploy

This repo supports two targets. Use the guide that matches your host:

- [Cloudflare Workers (OpenNext)](./vit-social/README.cloudflare.md) — the
  build must run `opennextjs-cloudflare`, **not** plain `next build`.
- [Vercel](./vit-social/README.vercel.md) — standard Next.js build.

### Custom domains

- [Cloudflare Workers — connect your domain](./vit-social/README.domain-cloudflare.md)
- [Vercel — connect your domain](./vit-social/README.domain-vercel.md)

## Project layout

```
.
├── README.md                 <- you are here
├── LICENSE                   <- MIT
├── CONTRIBUTING.md           <- how to contribute
├── CODE_OF_CONDUCT.md        <- community standards
├── SECURITY.md               <- private disclosure process
├── .github/                  <- issue & PR templates
└── vit-social/               <- the Next.js app
    ├── src/
    │   ├── app/              <- routes (/, /feed, /profile, /friends, …)
    │   ├── components/       <- SiteHeader, ProfileAvatar, …
    │   ├── lib/              <- Supabase client, MongoDB, domain helpers
    │   └── middleware.ts     <- Supabase session refresh
    ├── sql/                  <- numbered Postgres migrations
    ├── docs/                 <- MongoDB setup, architecture, …
    ├── public/               <- static assets
    └── README.cloudflare.md, README.vercel.md, googleauth.md, …
```

---

# Database lecture cheatsheet

> The rest of this README is a classroom companion for the **Database
> Management Systems** / **Integrated Data Systems** rubrics. Subject:
> *how we built vitsocial.xyz*. Feel free to skip it unless you're in that
> class — nothing below changes how the app runs.

## TL;DR — what this project does

A campus social network for VIT students: Google sign-in, profiles,
directory, friend requests, and a friends-only feed. **Profiles and
relationships live in PostgreSQL (Supabase). Post text lives in
MongoDB.**

## Part 1 — two databases together

```
┌─────────────────────────────────┐
│   PostgreSQL (Supabase)         │   Users + friend graph (relational / SQL)
│   users, friend_requests        │
└─────────────────────────────────┘
              │
              │ authorId links to users.id (UUID from Supabase Auth)
              ▼
┌─────────────────────────────────┐
│   MongoDB (Atlas)               │   Post documents (NoSQL / document store)
│   posts collection              │
└─────────────────────────────────┘
```

**Why PostgreSQL *and* MongoDB?**

- **PostgreSQL:** strong schema, relationships, constraints, joins — great
  for identities and `friend_requests`.
- **MongoDB:** flexible documents for feed posts (`body`, timestamps). We
  store immutable-ish text blobs without adding many relational tables for
  every post variant.

## Part 2 — entities and schema

### PostgreSQL: `users`

| Column idea | Purpose |
|:---|:---|
| `id` (UUID, PK, FK → `auth.users`) | Same id as logged-in Supabase user |
| `email`, `full_name`, `avatar_url` | Profile basics |
| `bio`, social links (`github`, etc.) | Editable profile |
| `branch`, `division` | Discovery (same class/batch hints) |
| `created_at`, `updated_at` | Audit timestamps |

Indexed example: email lookup (directory).

### PostgreSQL: `friend_requests`

| Column idea | Purpose |
|:---|:---|
| `id` (UUID, PK) | Request row id |
| `requester_id` (FK → `users.id`) | Who sent it |
| `receiver_id` (FK → `users.id`) | Who receives it |
| `status` | `pending` / `accepted` / `rejected` |
| `created_at`, `responded_at` | When sent / when answered |

Indexes on requester/receiver for fast lookups. A partial unique index
limits each unordered pair to at most one "active" row (pending or
accepted), so duplicate spam requests are blocked.

**Constraints (examples):** `NOT NULL` on required fields; `CHECK` so
`requester_id <> receiver_id`; `CHECK status IN (...)`;
`FOREIGN KEY ... ON DELETE CASCADE` so orphaned friend rows disappear if
a user is removed.

### MongoDB: `posts` documents

Rough shape:

```json
{
  "authorId": "<uuid-from-supabase>",
  "body": "Post text …",
  "createdAt": "<ISODate>"
}
```

Recommended index for scale: `{ "authorId": 1, "createdAt": -1 }` (see
`vit-social/docs/mongodb-setup.md`). Feed query: filter by visible author
ids, sort by `createdAt` descending.

## Part 3 — data flow (feed example)

1. User logs in → Supabase Auth establishes session → `users` row keyed by
   Auth `id`.
2. **`GET /api/posts`** (simplified):
   - Read **accepted** `friend_requests` for the current user → list of
     friend user ids (plus self).
   - MongoDB
     `find({ authorId: { $in: visibleIds } }).sort({ createdAt: -1 })`.
   - Join display data: **`users` SELECT** for author ids → attach name /
     avatar to each post JSON.

Privacy: the browser never gets `MONGODB_URI`; filtering is server-side
based on friendships in SQL.

## Part 4 — DB terminology cheat sheet

| Term | Meaning | Our example |
|:---|:---|:---|
| Primary key (PK) | Unique row identifier | `users.id`, `friend_requests.id` |
| Foreign key (FK) | Points to PK in another table | `requester_id` → `users.id` |
| Index | Faster lookups / sorts | Indexes on FK columns and Mongo `{ authorId, createdAt }` |
| Constraint | Valid values / relationships | `CHECK`, `UNIQUE` partial index, FK |
| Trigger | Automatic column updates | e.g. `updated_at` on profile change (`sql/004_*`) |
| RLS | Row-Level Security | Supabase policies: who can SELECT / UPDATE which rows |
| Normalization | Avoid duplicate / inconsistent facts | Store user id references, not copy full names everywhere in the graph table |
| Document store | Flexible JSON-like records | Mongo `posts` |

## Part 5 — CRUD in plain language

- **Create:** new user row (trigger from auth), insert `friend_requests`,
  `insertOne` post in Mongo.
- **Read:** directory `SELECT` on `users`; feed reads Mongo + `users` for
  authors.
- **Update:** profile fields on `users`; accept/reject updates
  `friend_requests.status`.
- **Delete:** user removed from `auth.users` / `users` can cascade related
  `friend_requests` (per FK design).

## Part 6 — "intelligence" / analytics

- **Friend suggestions**
  (`vit-social/src/lib/friend-suggestions.ts`): score non-friends by
  **mutual friend count** and **same branch + division**, return the top
  few. A lightweight recommendation layer on top of graph + profile data.
- **Aggregations** in production could be moved to SQL or Mongo
  aggregation pipelines (counts per branch, top posters, etc.) for
  formal "advanced queries".

## Part 7 — ER-style summary

- **users** (1) ——< **friend_requests** (many): each request row ties two
  users with a status.
- **users** (1) ——< **posts** (many, logical): Mongo `authorId` references
  `users.id` (not a SQL FK, but application-enforced).

## Part 8 — normalization (3NF soundbite)

- One place for **identity** (`users`).
- **Friendship** is its own table (no repeating "list of friends" columns
  on `users`).
- Post content is a separate store (Mongo) keyed by `authorId` — avoids
  bloating SQL with huge text on every directory query.

## Part 9 — viva one-liners

**Why two databases?** Relational integrity and auth for people; document
store for high-churn feed text and simple horizontal scaling patterns for
posts.

**How is privacy enforced?** Server loads friend ids from SQL, then
restricts the Mongo query to those authors; RLS on SQL tables limits who
sees profile / graph rows.

**What if we delete a user?** `ON DELETE CASCADE` on FKs cleans
`friend_requests`; Mongo posts may still exist by `authorId` until you
add a cleanup job (design trade-off to mention honestly).

## Part 10 — rubric mapping (quick)

| Rubric area | Where it shows up |
|:---|:---|
| SQL + NoSQL + JSON / documents | Postgres + Mongo posts |
| Collections / indexing | `posts`; indexes in SQL + `{ authorId, createdAt }` in docs |
| Pipelines / mixed retrieval | Feed: SQL friends + Mongo posts + SQL author profiles |
| Analytics / recommendation | Mutual-friend + branch/division suggestion logic |
| Schema / keys / normalization | `users`, `friend_requests`, PK/FK/checks/triggers |
| CRUD | App + migrations under `sql/` |
| Constraints & integrity | `NOT NULL`, `UNIQUE` partial index, FK, `CHECK` |
| Presentation | This section + demo of login → profile → friends → feed |

## Part 11 — demo script suggestion

1. Show **Supabase**: `users` and `friend_requests` rows after sign-in /
   friend actions.
2. Show **MongoDB Atlas**: documents in `posts` with `authorId` and
   `createdAt`.
3. Open the app **feed**: same posts visible only for the friends graph
   you built in step 2.
4. Briefly cite **indexes** if asked about speed at scale.

## Study checklist

1. Draw **users ↔ friend_requests** with FK arrows.
2. Explain **Cascade** vs orphan **Mongo posts**.
3. One sentence each: **PK**, **FK**, **index**, **RLS**.
4. Walk through **feed** as: friends from SQL → filter Mongo → enrich from
   SQL.

Good luck with the lecture!

---

## Contributing

PRs are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) for the
local setup, conventions (Tailwind + `fb-*` utilities, numbered SQL
migrations, etc.) and commit / PR guidelines. Also please read the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Found a security issue? Please **do not open a public GitHub issue**. See
[SECURITY.md](./SECURITY.md) for the private disclosure process.

## License

[MIT](./LICENSE) © vitsocial.xyz contributors.
