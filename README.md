# GermStack

A compact Vite + React + Convex + Vercel starter designed for agent-assisted app development.

## Stack

- Vite, React, and strict TypeScript
- Tailwind v4 through the Vite plugin
- Base UI wrapped by local `src/components/ui` primitives
- Convex Auth and Convex data functions
- Vercel SPA rewrite
- Vitest plus Playwright and axe smoke checks

## Local Setup

```bash
npm install
npm run dev
```

The public demo is available at `/demo` and runs without Convex. The authenticated app requires `VITE_CONVEX_URL`.

Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_CONVEX_URL=
CONVEX_DEPLOYMENT=
SITE_URL=http://localhost:5173
```

## Convex And Auth

Run Convex locally with:

```bash
npm run convex
```

This starter uses `@convex-dev/auth` with password auth enabled by default. Follow the current [Convex Auth setup guide](https://docs.convex.dev/auth/convex-auth) when creating auth keys and deployment environment variables; depending on the current setup flow, `JWT_PRIVATE_KEY` and `JWKS` may be required.

Google OAuth is optional. Configure these Convex environment variables, then set `VITE_ENABLE_GOOGLE_AUTH=true` for the UI:

```bash
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

Private app allowlists are intentionally disabled by default. To add one, set `ALLOWED_EMAILS` in Convex; `assertAllowedEmailIfConfigured` will enforce it only when configured.

## Commands

```bash
npm run dev
npm run build
npm run test
npm run test:e2e
npm run deploy
```

## Deploy

`vercel.json` includes the SPA rewrite needed for React Router refreshes on Vercel.

## Extending The Example

The example domain is `convex/exampleItems.ts` plus the `exampleItems` table in `convex/schema.ts`. Replace it with your product model, but keep user-owned data scoped through `requireUser`.

## Design Rules

Use `src/components/ui` primitives before importing Base UI directly. Keep shared styling in semantic tokens and Tailwind utilities. Do not add component CSS files unless a component truly cannot be expressed cleanly otherwise.
