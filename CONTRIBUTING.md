# Contributing to vitsocial.xyz

First off — thanks for taking the time to contribute! vitsocial.xyz is a
student-built social app for VIT, and we welcome pull requests, bug reports
and new ideas from anyone.

This document covers the basics: how the project is laid out, how to run it
locally, and the conventions we try to follow.

> The Next.js app lives in the `vit-social/` subfolder. Most commands in this
> file assume `cd vit-social` first.

## Table of contents

- [Code of Conduct](#code-of-conduct)
- [Getting started locally](#getting-started-locally)
- [Project layout](#project-layout)
- [Coding conventions](#coding-conventions)
- [Commit and PR guidelines](#commit-and-pr-guidelines)
- [Reporting bugs](#reporting-bugs)
- [Suggesting features](#suggesting-features)
- [Security issues](#security-issues)
- [License](#license)

## Code of Conduct

This project and everyone participating in it is governed by the
[Code of Conduct](./CODE_OF_CONDUCT.md). By participating you agree to uphold
this code. Please report unacceptable behaviour as described there.

## Getting started locally

You need:

- [Bun](https://bun.sh/) (the lockfile is `bun.lock`) — or npm / pnpm
- A Supabase project (free tier is fine). See the README for setup.
- Optional: a MongoDB Atlas cluster for the `/api/posts` feed.

```bash
cd vit-social
bun install
cp .env.example .env.local   # then fill the values
bun run dev
```

Open `http://localhost:3000`. The first run will prompt you to sign in with a
`@vit.edu` Google account (configured via Supabase). See the main
[`README`](./README.md#google-sign-in-where-to-get-each-value) for OAuth setup.

## Project layout

```
vit-social/              Next.js app (App Router, Tailwind v4)
├── src/
│   ├── app/             Route segments: /, /feed, /profile, /friends, …
│   ├── components/      Shared React components (SiteHeader, ProfileAvatar …)
│   ├── lib/             Data + logic helpers (Supabase, MongoDB, branches …)
│   └── middleware.ts    Auth/session middleware
├── sql/                 Ordered migrations for Supabase (PostgreSQL)
├── docs/                Long-form docs (MongoDB setup, architecture …)
└── public/              Static assets
```

A longer walkthrough of how the two databases fit together is in
[`docs/architecture.md`](./vit-social/docs/architecture.md).

## Coding conventions

- **Language & runtime:** TypeScript strict mode on Next.js 16 (App Router) +
  React 19. Components that use hooks belong in `"use client"` files; server
  routes go under `src/app/api/`.
- **Styling:** Tailwind v4 via `@import "tailwindcss"`. Shared retro-Facebook
  button / panel / input utilities live in `src/app/globals.css` (classes
  prefixed `fb-…`). Prefer those over bespoke inline styles.
- **File structure:** one page per route (`page.tsx`); pure logic goes under
  `src/lib/`; reusable UI goes under `src/components/`.
- **Database:**
  - SQL migrations are numbered and append-only under `sql/`. Do not edit a
    migration after it has been merged; add a new one instead.
  - Server code that talks to MongoDB must run in the Node runtime
    (`export const runtime = "nodejs"`).
- **Secrets:** never commit real values. Only `.env.example` is tracked.
- **Linting:** `bun run lint` must pass. We use the Next.js ESLint preset
  (`eslint-config-next`) plus the project's `eslint.config.mjs`.

### Commands cheat sheet (run inside `vit-social/`)

| Command | What it does |
|---|---|
| `bun run dev` | Start Next.js dev server on `localhost:3000`. |
| `bun run lint` | Run ESLint across the repo. |
| `bun run build` | Standard Next.js build (used on Vercel). |
| `bun run build:cloudflare` | OpenNext build for Cloudflare Workers. |
| `bun run preview` | OpenNext build + local Worker preview. |

## Commit and PR guidelines

- **Branch from `main`** and keep PRs focused — prefer several small PRs over
  one sprawling branch.
- **Commit messages:** short imperative subject line
  (e.g. `feat(profile): add GitHub field`). A longer body is welcome.
- **Before you open a PR:**
  1. `bun run lint` passes.
  2. `bun run build` passes (or `bun run build:cloudflare` if your change
     touches Cloudflare-specific code).
  3. New SQL migrations are in a new numbered file under `sql/`, not a
     modification of an old one.
  4. UI changes include screenshots in the PR description when feasible.
- **Describe the change** in the PR template — what, why, and how you tested
  it. Link any related issue with `Closes #N`.

Reviewers may squash-merge, so your PR title will usually become the merge
commit subject.

## Reporting bugs

Please open a GitHub issue using the **Bug report** template. Include:

- What you were trying to do.
- What happened and what you expected instead.
- Minimal reproduction steps (URL / click path).
- Browser + OS, and whether you were signed in.
- Any console / network / server log snippets (redact anything sensitive).

If the bug involves deployment (Vercel / Cloudflare Workers), please mention
the host and, if possible, whether it reproduces locally with `bun run dev`.

## Suggesting features

Open a GitHub issue using the **Feature request** template. Focus on the
student-facing problem, not the implementation; smaller scoped suggestions
are much easier to land than sweeping redesigns.

Because the app targets `@vit.edu` accounts, please keep features compatible
with that constraint and with a student's privacy expectations.

## Security issues

**Do not open a public issue for a security bug.** See
[`SECURITY.md`](./SECURITY.md) for the private disclosure process.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE) that covers the project.
