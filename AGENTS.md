# Agent Instructions

This is a Vite + React + TypeScript + Tailwind v4 + Base UI + Convex + Vercel starter.

Use `src/components/ui` primitives before importing `@base-ui/react` directly.

Keep styling in Tailwind utilities and semantic tokens in `src/styles/tokens.css`. Do not create scattered component CSS files.

Keep TypeScript strict. Do not weaken compiler options to make an error disappear.

Convex functions must scope user data through `requireUser` unless the route is intentionally public.

After completing a feature, run relevant tests. For UI work, include the Playwright smoke/a11y check when feasible.
