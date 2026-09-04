# FakeShop

FakeShop is a demo e-commerce site I built in early 2025 to try out what was then the newest Next.js work: React Server Components, Server Actions, streaming, progressive enhancement, and the `dynamicIO` experiment on a `next@15.2.1-canary.1` build. I wrote it up in [ARTICLE.md](ARTICLE.md).

The code has since been bumped twice for CVEs, which carried it to Next 16 without anyone adapting it. It runs, but it is a Next 15 canary app wearing a Next 16 dependency. That gap is the workshop.

## How we work

We pair on this project. My goal is to learn what Next.js changed between 15.2 canary and 16.3, and you write the implementation.

- **Explain the concept before you build.** What the Next.js feature does, where it runs (build, request, client), what it replaces, and why the design we are about to write fits this app. Diagrams and request timelines are welcome.
- **Explain what you built afterwards.** Especially anything that is correct for a non-obvious reason: cache scoping, prerender versus request-time boundaries, what a `use cache` scope closes over, why a Suspense boundary sits where it does.
- **Show me the before and after.** Route table from `next build`, terminal logs, DevTools panels. This app is a demo, so the observable behaviour is the point.
- **Ask before large refactors.** Renaming across modules, moving data fetching between layers, restructuring the route groups. Small local cleanups as you go are fine.
- **Prefer the idiomatic Next.js API.** If the framework now has a first-party answer for something this app hand-rolls, say so.
- One phase per branch, one phase per PR.

## Context recovery for fresh sessions

Invoked by the `/resume` skill at the start of a new session.

**Only read these if I say we are continuing the workshop:**

1. [`MEMORY.md`](MEMORY.md) — start here. Current phase, what is done, what is next.
2. [`workshop/README.md`](workshop/README.md) — phase index and links.
3. [`workshop/upgrade-plan.md`](workshop/upgrade-plan.md) — the full plan and the audit of what the app looks like today.
4. [`workshop/phase-N.md`](workshop/) for phases already finished.

When a phase is done, write `workshop/phase-N.md` covering the concepts, what changed, and what I learned, then mark it complete in `workshop/README.md` and update `MEMORY.md`.

## Tech stack

- Next.js App Router, 16.3.4, pinned exactly
- React 19.2.8
- TypeScript 5.7, Tailwind CSS 3.4, `shadcn/ui` components under `src/components/ui`
- TanStack Query for the client-side search box
- Vitest with React Testing Library
- ESLint 9 with a flat `eslint.config.mjs`, Prettier as a plugin
- Data comes from the public `https://dummyjson.com` API, wrapped in `src/lib/api.ts`

## Guidelines

- ALWAYS ASK FOR CONFIRMATION before installing a new dependency.
- `npm run lint`, `npm run lint:fix`, `npm run test`, `npm run typecheck`, `npm run build`.
- Write tests for logic you add. The existing suite is thin, which is fine.
- Format on save is on, pre-commit hooks run lint, format, tests and typecheck on staged files.
- DO NOT start a dev server on your own. I will run it at http://localhost:3000.
- `npm install` resolves without `--force`. If it stops doing so, that is a regression worth investigating rather than working around.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
