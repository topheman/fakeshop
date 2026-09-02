# FakeShop workshop memory

**Quick context**: see [`workshop/README.md`](workshop/README.md) for the full documentation, [`workshop/upgrade-plan.md`](workshop/upgrade-plan.md) for the plan.

## Current phase

**Phase 0: Make the repo tell the truth** — not started.

The plan is written and the audit is done. Nothing in `src/` has changed yet.

## Baseline as of 2026-09-02

Measured on `master` at tag **`v1.0.1`** (`fa08514`), clean tree. That tag is the "before" marker for the whole workshop: every phase is a diff against it, and it is what a reader of the original article would find if they cloned the repo.

`v1.0.1` is a version bump and nothing else. The dependency state it captures came in through PR #2 (`b212cbc`), the CVE-2026-23864 fix.

- `npm run typecheck` passes.
- `npm run build` passes. Route table: `/`, `/account`, `/category/[slug]`, `/checkout`, `/login`, `/product/[slug]`, `/search` and `/_not-found` are all Partial Prerender. `/api/hello/world` is static, `/api/og` is dynamic. `/` revalidates at 15m, expires at 1y.
- Static generation of 11 pages takes ~400ms with 13 workers.
- One warning on every build, at `/api/og`: "During prerendering, fetch() rejects when the prerender is complete."
- Installed: `next` 16.1.6, `react` 19.0.4. Latest: 16.3.4 and 19.2.8.

Both build escape hatches (`eslint.ignoreDuringBuilds`, `typescript.ignoreBuildErrors`) are still on, so the passing build proves less than it looks. Phase 0 turns them off and finds out.

## Completed phases

None yet.

## Decisions

- **Tutor mode**: I implement, Christophe learns. Concept explained before the code, subtleties explained after.
- **Scope**: stable and officially opt-in Next.js features only. No experimental flags (Rust React Compiler, `useOffline`, `cachedNavigations`).
- **Output**: phase docs in `workshop/`. No article rewrite for now.
- **PR strategy**: one phase, one branch, one PR, straight to `master`. Not stacked. Merging to `master` deploys production, so every phase must leave the app deployable, and CI gates the PR from phase 0 on. Tags at group boundaries.
- **First commit is markdown only**: plan and workshop docs, no code.
- **`npm install --force`** is caused by `lucide-react@0.344.0` alone, whose peer range stops at React 18. Fixed in phase 0 by bumping to 1.39.0, which has to happen before CI because `npm ci` fails the same way.
- **Open**: whether Tailwind 3 to 4 belongs in phase 2. Leaning no, it teaches nothing about Next.js.

## Environment notes

- Christophe manages Node with `fnm`, so `.nvmrc` is what actually drives his local version. Keep this out of the workshop docs, it is personal tooling.
- Node 24.20.0 is the current LTS. The repo is on 22 until phase 0.
- Deployment is wired through the Vercel dashboard on `master`. There is no `vercel.json` and no `.github/` directory in the repo yet.
