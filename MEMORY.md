# FakeShop workshop memory

**Quick context**: see [`workshop/README.md`](workshop/README.md) for the full documentation, [`workshop/upgrade-plan.md`](workshop/upgrade-plan.md) for the plan.

## Current phase

**Phase 1: Reach 16.3 and React 19.2** — not started.

Phase 0 is done on branch `workshop/phase-0`, not yet merged. Phase 1 runs `next upgrade` to 16.3.4, moves React to 19.2.8, deletes the dead config flags (`dynamicIO` and the three webpack knobs, all still in `next.config.mjs` on purpose), and checks the route table is unchanged.

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

Branch `workshop/phase-0`. Route table came out byte-identical, which was the point. Cold build went from 3.267s to 4.368s because the build type checks again instead of skipping it.

- ESLint 8 + `.eslintrc.json` to ESLint 9 + `eslint.config.mjs`, `eslint-config-next` pinned to 16.1.6 to track `next` exactly. `next lint` no longer exists and `npm run lint` had been crashing since the Next 16 bump.
- `typescript.ignoreBuildErrors` removed. The `eslint` key was removed too, but it had already been inert — Next 16 rejects it outright and no longer lints during `next build`.
- Three real errors surfaced by linting for the first time: JSX built inside a `try`/`catch` in the category page, and `setState` inside an effect in `ProductGridLoading` and `ProductCardLoading`, both now `useSyncExternalStore`.
- `lucide-react` 0.344.0 to 1.38.0. v1 dropped brand icons, so `Github` became a local `src/components/GithubIcon.tsx`.
- `.nvmrc` to 24.20.0, `lint-staged.config.js` duplicate glob fixed, `tailwind.config.js` converted to ESM, `--force` dropped from the README, CI workflow added.

## Decisions

- **Tutor mode**: I implement, Christophe learns. Concept explained before the code, subtleties explained after.
- **Scope**: stable and officially opt-in Next.js features only. No experimental flags (Rust React Compiler, `useOffline`, `cachedNavigations`).
- **Output**: phase docs in `workshop/`. No article rewrite for now.
- **PR strategy**: one phase, one branch, one PR, straight to `master`. Not stacked. Merging to `master` deploys production, so every phase must leave the app deployable, and CI gates the PR from phase 0 on. Tags at group boundaries.
- **ESLint moved from phase 2 into phase 0**, because CI cannot run a lint step that does not exist. Phase 2 keeps TypeScript 7, the bundle analyzer and the Tailwind question.
- **ESLint stays on 9, not 10**, because `eslint-config-next@16.1.6` depends on `eslint-plugin-import`, whose peer range stops at `eslint ^9`. Recheck at phase 2.
- **Dead config flags stay until phase 1.** `dynamicIO` and the three webpack knobs are still in `next.config.mjs` so phase 1 has something to delete and explain.
- **Open**: whether Tailwind 3 to 4 belongs in phase 2. Leaning no, it teaches nothing about Next.js.

## Environment notes

- Christophe manages Node with `fnm`, so `.nvmrc` is what actually drives his local version. Keep this out of the workshop docs, it is personal tooling.
- Node 24.20.0 is the current LTS. `.nvmrc` moved to it in phase 0.
- Deployment is wired through the Vercel dashboard on `master`. There is no `vercel.json`. The `.github/workflows/ci.yml` added in phase 0 is the only workflow.
