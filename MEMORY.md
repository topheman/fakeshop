# FakeShop workshop memory

**Quick context**: see [`workshop/README.md`](workshop/README.md) for the full documentation, [`workshop/upgrade-plan.md`](workshop/upgrade-plan.md) for the plan.

## Current phase

**Phase 2: Toolchain** — not started.

Phase 1 is done on branch `workshop/phase-1`, not yet merged. Phase 2 covers ESLint 10 (blocked today, see below), TypeScript 7 for `next build` type checking via `useTypeScriptCli`, the Turbopack bundle analyzer at `next experimental-analyze`, and the open Tailwind 4 question.

## Baseline as of 2026-09-02

Measured on `master` at tag **`v1.0.1`** (`fa08514`), clean tree. That tag is the "before" marker for the whole workshop: every phase is a diff against it, and it is what a reader of the original article would find if they cloned the repo. The full captured output lives in [`workshop/phase-0.md`](workshop/phase-0.md).

`v1.0.1` is a version bump and nothing else. The dependency state it captures came in through PR #2 (`b212cbc`), the CVE-2026-23864 fix.

- `npm run typecheck` passes. `npm run build` passes but printed `Skipping validation of types`.
- Route table: `/`, `/account`, `/category/[slug]`, `/checkout`, `/login`, `/product/[slug]`, `/search` and `/_not-found` are all Partial Prerender. `/api/hello/world` is static, `/api/og` is dynamic. `/` revalidates at 15m, expires at 1y.
- Static generation of 11 pages takes ~400ms with 13 workers. Cold build 3.267s.
- One warning on every build, at `/api/og`: "During prerendering, fetch() rejects when the prerender is complete."
- Installed: `next` 16.1.6, `react` 19.0.4. Latest: 16.3.4 and 19.2.8.

## Completed phases

### Phase 0: Make the repo tell the truth

Branch `workshop/phase-0`, merged in PR #4. Route table came out byte-identical, which was the point. Cold build went from 3.267s to 4.368s because the build type checks again instead of skipping it.

- ESLint 8 + `.eslintrc.json` to ESLint 9 + `eslint.config.mjs`, `eslint-config-next` pinned to 16.1.6 to track `next` exactly. `next lint` no longer exists and `npm run lint` had been crashing since the Next 16 bump.
- `typescript.ignoreBuildErrors` removed. The `eslint` key was removed too, but it had already been inert — Next 16 rejects it outright and no longer lints during `next build`.
- Three real errors surfaced by linting for the first time: JSX built inside a `try`/`catch` in the category page, and `setState` inside an effect in `ProductGridLoading` and `ProductCardLoading`, both now `useSyncExternalStore`.
- `lucide-react` 0.344.0 to 1.38.0. v1 dropped brand icons, so `Github` became a local `src/components/GithubIcon.tsx`.
- `.nvmrc` to 24.20.0, `lint-staged.config.js` duplicate glob fixed, `tailwind.config.js` converted to ESM, `--force` dropped from the README.

### Phase 1: Reach 16.3 and React 19.2

Branch `workshop/phase-1`. `next` 16.1.6 to 16.3.4, `react`/`react-dom` 19.0.4 to 19.2.8, `eslint-config-next` to 16.3.4. No application code changed. Full write-up in [`workshop/phase-1.md`](workshop/phase-1.md).

- **Turbopack disk caching is the result.** On by default for dev and build in 16.3. Warm compile went from ~1200ms to ~230ms, warm build user CPU from 12.38s to 1.75s, and `.next/cache` from 212K to 74M with a real `turbopack/` directory. Cold compile got slower, 1219.7ms to 1683ms, which is the cost of writing the cache.
- Deleted `experimental.dynamicIO` (already rejected as an invalid key), the three webpack flags, and the commented-out `ppr`. `next.config.mjs` is now `images` plus `cacheComponents`.
- Route table is **not** byte-identical, but only in layout: on `/category/[slug]` and `/product/[slug]` the `◐` moved from the pattern row to the indented instance row. Same render modes, same counts, same lifetimes. 16.3 marks prerendered instances rather than patterns.
- `next build` rewrote `tsconfig.json` to `moduleResolution: "bundler"` and calls it mandatory. Committed rather than reverted, since reverting only invites the next build to rewrite it.
- `AGENTS.md` gained the managed `<!-- BEGIN:nextjs-agent-rules -->` block that `next dev` maintains from 16.3, pointing agents at the docs Next bundles at `node_modules/next/dist/docs/`. Committed on purpose: it regenerates on every dev run, so omitting it means a permanently dirty tree. Stale phase-0 facts in the same file were corrected.
- `next` and `eslint-config-next` are now exact pins rather than caret ranges, which is what `next upgrade` writes.
- Two build warnings survive on purpose: middleware deprecation (phase 3) and the `/api/og` prerender warning (phase 9).

## Decisions

- **Tutor mode**: I implement, Christophe learns. Concept explained before the code, subtleties explained after.
- **Scope**: stable and officially opt-in Next.js features only. No experimental flags (Rust React Compiler, `useOffline`, `cachedNavigations`).
- **Output**: phase docs in `workshop/`. No article rewrite for now.
- **PR strategy**: one phase, one branch, one PR, straight to `master`. Not stacked. Merging to `master` deploys production, so every phase must leave the app deployable, and CI gates the PR from phase 0 on. Tags at group boundaries.
- **ESLint moved from phase 2 into phase 0**, because CI cannot run a lint step that does not exist. Phase 2 keeps TypeScript 7, the bundle analyzer and the Tailwind question.
- **ESLint stays on 9, not 10.** Reconfirmed in phase 1 against `eslint-config-next@16.3.4`: it still depends on `eslint-plugin-import@^2.32.0`, whose peer range stops at `eslint ^9`, and 2.32.0 is still the latest release. `next upgrade` sets `eslint` to 10 and the install fails with `ERESOLVE`. Recheck at phase 2.
- **No `overrides` block.** `next upgrade` adds one pinning the React types across the tree. Dropped in phase 1 and the install resolved cleanly without it.
- **Skipped the `cache-components-instant-false` codemod** offered for 16.3. It adds `export const instant = false` to every page and layout as an adoption escape hatch, which phase 6 would only have to delete.
- **Open**: whether Tailwind 3 to 4 belongs in phase 2. Leaning no, it teaches nothing about Next.js.

## Environment notes

- Christophe manages Node with `fnm`, so `.nvmrc` is what actually drives his local version. Keep this out of the workshop docs, it is personal tooling.
- Node 24.20.0 is the current LTS. `.nvmrc` moved to it in phase 0. Phase 0's numbers were taken on 24.17.0, so phase 1 re-measured its own before state rather than carrying them over.
- His global `.npmrc` sets `min-release-age=2`, which holds back anything published in the last two days. That is why `@types/react-dom` is at 19.2.5 rather than 19.2.7. Personal tooling, keep it out of the workshop docs.
- Deployment is wired through the Vercel dashboard on `master`. There is no `vercel.json`. The `.github/workflows/ci.yml` added in phase 0 is the only workflow.
- Measure build performance with **user CPU time, not wall clock**. On a 12-core laptop wall clock is bounded by the longest chain and badly understates a change; phase 1's cache saved 86% of the CPU but only 1.3s of wall clock.
