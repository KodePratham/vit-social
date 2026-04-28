# MongoDB Atlas setup for vit-social posts

The app stores **user profiles and friendships in Supabase (PostgreSQL)** and **post content in MongoDB Atlas**. Only the feed uses MongoDB: documents in a `posts` collection with fields such as `authorId` (Supabase user UUID), `body`, and `createdAt`.

This guide assumes you use **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** only (no self-hosted or local MongoDB).

## Atlas account and database user

You need a **free Atlas account** (an **M0** cluster is enough for dev and modest traffic).

**Database user** (Atlas → **Database Access** → **Add New Database User**):

- Choose password auth and save the password securely.
- That username and password go into the **`MONGODB_URI`** connection string (not into the Next.js UI).
- The app connects as this user; it is unrelated to your Atlas login email.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| **`MONGODB_URI`** | Yes, for feed/post API | Atlas connection string from **Database** → **Connect** → **Drivers**. Use a user with **read/write** on your app database. **Server-only** — never prefix with `NEXT_PUBLIC_`. |
| **`MONGODB_DB_NAME`** | No | Database name the app uses (default: `vit_social`). Set this if your URI does not include a database path or you want to override [`getMongoDbName()`](../src/lib/mongodb.ts). |

- **Local Next.js:** put both in **`.env.local`**, then restart `bun run dev`.
- **Production (e.g. Cloudflare):** set **`MONGODB_URI`** as an **encrypted secret** (see below). Optional `MONGODB_DB_NAME` can be a normal variable.

If `MONGODB_URI` is missing, **`GET /api/posts`** and **`POST /api/posts`** return **503** and the feed shows an error.

## Atlas quickstart (cluster → URI)

1. [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) — sign up / log in.
2. Create an **M0** cluster (pick a region close to your app).
3. **Database Access**: create the **database user** (see above).
4. **Network Access** → **Add IP Address**:
   - For **development** from varying networks, many teams use **`0.0.0.0/0`** (allow from anywhere). Use a strong database password.
   - For **serverless hosts** (e.g. Cloudflare Workers), outbound IPs are not fixed, so **`0.0.0.0/0` on Atlas** is common unless you use a connectivity pattern Atlas documents for your stack (e.g. private endpoints for VPC workloads).
5. **Database** → **Browse Collections** — you may create database **`vit_social`** in advance, or let the first **`POST /api/posts`** create data under that name.
6. **Database** → **Connect** → **Drivers** → copy the URI. Substitute the real password for `<password>` (URL-encode special characters if needed). Example:

   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/vit_social?appName=Cluster0`

7. Set **`MONGODB_URI`** in `.env.local` (local) or in your host’s secrets (production).

### Verify with mongosh (optional)

[`mongosh`](https://www.mongodb.com/docs/mongodb-shell/) only checks that the URI, user, and network access work — the running app still uses the **Node driver** in code.

```bash
mongosh "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/vit_social"
```

### Recommended index (optional)

Atlas → **Browse Collections** → **`posts`** → **Indexes**:

- `{ "authorId": 1, "createdAt": -1 }`

Helpful at scale; the app runs without it.

## Cloudflare Workers (OpenNext)

1. **Dashboard:** **Workers & Pages** → your worker → **Settings** → **Variables and Secrets** → add **`MONGODB_URI`** as an **encrypted** secret (Production and Preview if needed).
2. **CLI:** from the project directory,  
   `npx wrangler secret put MONGODB_URI`  
   paste the Atlas URI when prompted, then redeploy so the worker loads the new secret.

This is **not** a `NEXT_PUBLIC_*` variable; it does not need to be in the OpenNext **build** env for the client bundle, but it **must** exist at **Worker runtime** for `/api/posts`.

[`src/app/api/posts/route.ts`](../src/app/api/posts/route.ts) uses `export const runtime = "nodejs"` so the route targets Node-style APIs. This repo also sets **`nodejs_compat_v2`** in [`wrangler.jsonc`](../wrangler.jsonc) and uses a **small Mongo pool** in [`mongodb.ts`](../src/lib/mongodb.ts), which Cloudflare recommends for the official `mongodb` driver. **Redeploy after pulling** so Workers pick up `wrangler` changes.

More Cloudflare context: [`README.cloudflare.md`](../README.cloudflare.md).

### HTTP 500 with an HTML page (`<!DOCTYPE html>`, IE conditional comments)

That response is **Cloudflare’s generic error page**, not your API’s JSON. It usually means the **Worker crashed or hit a platform limit** before [`route.ts`](../src/app/api/posts/route.ts) could return `{ "error": ... }`. A common cause is **MongoDB’s Node driver + TCP/TLS** misbehaving on a given Workers + OpenNext build.

**Try in order:**

1. **Redeploy** with the latest repo `wrangler.jsonc` (**`nodejs_compat` + `nodejs_compat_v2`**) and driver pool options in `mongodb.ts`.
2. **Logs:** Cloudflare dashboard → your Worker → **Logs**, or run `npx wrangler tail` while opening `/feed` — copy the stack trace if any.
3. **Atlas:** confirm **Network Access** allows **`0.0.0.0/0`** (or your chosen rule) and the URI password is correct (special chars URL-encoded).
4. If it **still** returns HTML 500: host the app on a **full Node** platform for production (this repo supports **[Vercel](./README.vercel.md)** — the `mongodb` driver is well supported there), or run a tiny **separate Node service** only for `/api/posts` and point the frontend at it (larger change).

### “Could not read server response” / shorter non-JSON errors

Same checklist as above; the feed UI also shows **HTTP status** and a **text preview** when the body is not JSON.

## CLI vs the running app

**Atlas CLI** and **mongosh** are for **you**: manage clusters, run queries, create indexes.

The **Next.js app** must connect via the **Node.js driver** (already in the repo) and **`MONGODB_URI`**. Replacing that with “only CLI” is not supported.

## Security notes

- **`MONGODB_URI` must stay server-only.** The browser never talks to Atlas directly.
- **Friend visibility** is enforced in the API: the server reads **accepted** `friend_requests` from Supabase and only returns posts whose `authorId` is in **friends ∪ {self}**.
- **Creating a post** sets `authorId` from the Supabase session, not from untrusted client fields alone.
