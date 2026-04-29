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

**MongoDB (feed / posts):** The friend-only feed uses **MongoDB Atlas**. Set **`MONGODB_URI`** (server-only) in `.env.local`. See **[docs/mongodb-setup.md](./docs/mongodb-setup.md)** for Atlas setup, secrets on Cloudflare, and security notes.

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

### Custom domains

- [Cloudflare Workers — connect your domain](./README.domain-cloudflare.md)
- [Vercel — connect your domain](./README.domain-vercel.md)

---

# Database lecture cheatsheet

Quick reference for **Database Management Systems** presentations (aligned with Integrated Data Systems and DBMS rubrics). Subject: **how we built vit-social**.

## TL;DR — what this project does

A campus social network for VIT students: Google sign-in, profiles, directory, friend requests, and a friends-only feed. **Profiles and relationships live in PostgreSQL (Supabase). Post text lives in MongoDB.**

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

**Why PostgreSQL and MongoSQL?**

- **PostgreSQL:** Strong schema, relationships, constraints, joins — good for identities and `friend_requests`.
- **MongoDB:** Flexible documents for feed posts (`body`, timestamps). We store immutable-ish text blobs without adding many relational tables for every post variant.

---

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

Indexes on requester/receiver for fast lookups. Partial unique index: at most one “active” relationship per unordered pair (pending or accepted), so duplicate spam requests are blocked.

**Constraints (examples):** `NOT NULL` on required fields; `CHECK` so `requester_id <> receiver_id`; `CHECK status IN (...)`; `FOREIGN KEY ... ON DELETE CASCADE` so orphaned friend rows disappear if a user is removed.

### MongoDB: `posts` documents

Rough shape:

```json
{
  "authorId": "<uuid-from-supabase>",
  "body": "Post text …",
  "createdAt": "<ISODate>"
}
```

Recommended index for scale: `{ "authorId": 1, "createdAt": -1 }` (see `docs/mongodb-setup.md`). Feed query: filter by visible author ids, sort by `createdAt` descending.

---

## Part 3 — data flow (feed example)

1. User logs in → Supabase Auth establishes session → `users` row keyed by Auth `id`.
2. **`GET /api/posts`** (simplified):  
   - Read **accepted** `friend_requests` for the current user → list of friend user ids (plus self).
   - MongoDB `find({ authorId: { $in: visibleIds } }).sort({ createdAt: -1 })`.
   - Join display data: **`users` SELECT** for author ids → attach name/avatar to each post JSON.

Privacy: the browser never gets `MONGODB_URI`; filtering is server-side based on friendships in SQL.

---

## Part 4 — DB terminology cheat sheet

| Term | Meaning | Our example |
|:---|:---|:---|
| Primary key (PK) | Unique row identifier | `users.id`, `friend_requests.id` |
| Foreign key (FK) | Points to PK in another table | `requester_id` → `users.id` |
| Index | Faster lookups / sorts | Indexes on FK columns and Mongo `{ authorId, createdAt }` |
| Constraint | Valid values / relationships | `CHECK`, `UNIQUE` partial index, FK |
| Trigger | Automatic column updates | e.g. `updated_at` on profile change (`sql/004_*`) |
| RLS | Row-Level Security | Supabase policies: who can SELECT/UPDATE which rows |
| Normalization | Avoid duplicate / inconsistent facts | Store user id references, not copy full names everywhere in graph table |
| Document store | Flexible JSON-like records | Mongo `posts` |

---

## Part 5 — CRUD in plain language

- **Create:** New user row (trigger from auth), insert `friend_requests`, `insertOne` post in Mongo.
- **Read:** Directory `SELECT` on `users`; feed reads Mongo + `users` for authors.
- **Update:** Profile fields on `users`; accept/reject updates `friend_requests.status`.
- **Delete:** User removed from `auth.users` / `users` can cascade related `friend_requests` (per FK design).

---

## Part 6 — “intelligence” / analytics (rubric angle)

- **Friend suggestions** (in app code, `src/lib/friend-suggestions.ts`): score non-friends by **mutual friend count** and **same branch + division**, return top few. This is a lightweight **recommendation** layer on top of graph + profile data.
- **Aggregations** in production could be moved to SQL or Mongo aggregation pipelines (counts per branch, top posters, etc.) if you need formal “advanced queries” for grading.

---

## Part 7 — ER-style summary (whiteboard)

- **users** (1) ——< **friend_requests** (many): each request row ties two users with a status.
- **users** (1) ——< **posts** (many, logical): Mongo `authorId` references `users.id` (not a SQL FK, but application-enforced).

---

## Part 8 — normalization (3NF soundbite)

- One place for **identity** (`users`).
- **Friendship** is its own table (no repeating “list of friends” columns on `users`).
- Post content is separate store (Mongo) keyed by `authorId` — avoids bloating SQL with huge text on every directory query.

---

## Part 9 — viva one-liners

**Why two databases?** Relational integrity and auth for people; document store for high-churn feed text and simple horizontal scaling patterns for posts.

**How is privacy enforced?** Server loads friend ids from SQL, then restricts Mongo query to those authors; RLS on SQL tables limits who sees profile/graph rows.

**What if we delete a user?** CASCADE on FKs cleans `friend_requests`; Mongo posts may still exist by `authorId` until you add a cleanup job (design tradeoff to mention honestly).

---

## Part 10 — rubric mapping (quick)

| Rubric area | Where it shows up |
|:---|:---|
| SQL + NoSQL + JSON/documents | Postgres + Mongo posts |
| Collections / indexing | `posts`; indexes in SQL + `{ authorId, createdAt }` in docs |
| Pipelines / mixed retrieval | Feed: SQL friends + Mongo posts + SQL author profiles |
| Analytics / recommendation | Mutual-friend + branch/division suggestion logic |
| Schema / keys / normalization | `users`, `friend_requests`, PK/FK/checks/triggers |
| CRUD | App + migrations under `sql/` |
| Constraints & integrity | `NOT NULL`, `UNIQUE` partial index, FK, `CHECK` |
| Presentation | This section + demo of login → profile → friends → feed |

---

## Part 11 — demo script suggestion

1. Show **Supabase**: `users` and `friend_requests` rows after sign-in / friend actions.
2. Show **MongoDB Atlas**: documents in `posts` with `authorId` and `createdAt`.
3. Open the app **feed**: same posts visible only for friends graph you built in step 2.
4. Briefly cite **indexes** if asked about speed at scale.

---

## Study checklist

1. Draw **users ↔ friend_requests** with FK arrows.
2. Explain **Cascade** vs orphan **Mongo posts**.
3. One sentence each: **PK**, **FK**, **index**, **RLS**.
4. Walk through **feed** as: friends from SQL → filter Mongo → enrich from SQL.

Good luck with the lecture.
