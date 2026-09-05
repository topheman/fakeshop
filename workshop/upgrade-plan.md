# Upgrade plan: from a Next 15 canary app to Next 16.3

## Where the project actually is

Two CVE bumps carried `next` from `15.2.1-canary.1` to `^16.0.11` without touching a line of application code. Nothing broke, which says something good about Next 16's compatibility, but it means the app never adopted anything the major version introduced.

Tag `v1.0.1` (`fa08514`) marks that state, so every phase below is a diff against a fixed point.

State on 2026-09-02:

| | Installed | Current |
|---|---|---|
| `next` | 16.1.6 (range `^16.0.11`) | 16.3.4 |
| `react` / `react-dom` | 19.0.4 | 19.2.8 |
| `typescript` | 5.7.3 | 7.0.2 |
| `tailwindcss` | 3.4.1 | 4.3.3 |
| `eslint` | 8.57.0 with `.eslintrc.json` | flat config, `next lint` is gone |

`npm run build` and `npm run typecheck` both pass today. That is the baseline we have to keep passing.

### What the audit turned up

**`next.config.mjs` is a museum.** It carries `experimental.dynamicIO` next to a top-level `cacheComponents: true`. `dynamicIO` was the canary-era name for the feature that shipped as Cache Components, so the app is asking for the same thing twice under two names. `webpackBuildWorker`, `parallelServerCompiles` and `parallelServerBuildTraces` are webpack-era knobs and Turbopack is the default bundler in 16. Three flags that do nothing.

**Two escape hatches hide errors.** `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` are both `true`. The article explains why: on a canary build the types were in flux. That reason expired. We do not know what they are hiding until we turn them off.

**`src/middleware.ts` is now called a proxy.** The build output already prints `ƒ Proxy (Middleware)`. The file itself seeds `cart` and `orders` cookies on every non-API request, which is a lot of work to do in a proxy.

**Data fetching predates the caching model it runs under.** `src/lib/api.ts` puts `cache: "force-cache"` on every `fetch`. Under Cache Components the unit of caching is a `use cache` scope with a lifetime and tags, not a per-request fetch option. The five API functions are the natural place to learn that.

**Every page hand-rolls its Suspense boundary.** `page.tsx` is a sync shell that wraps an async child, and the `params` promise gets passed down rather than awaited at the top. That was the `dynamicIO` idiom, and it is close to what Partial Prefetching wants, but there is not a single `loading.tsx` in the tree. Worth measuring before changing.

**There is no `error.tsx` anywhere.** `CategoryContent` catches its own fetch failure and renders a paragraph. Next 16.3 has `catchError` for exactly this.

**`/api/og` warns during prerender.** "During prerendering, fetch() rejects when the prerender is complete." It appears on every build. `ImageResponse` also got much faster in 16.2 and changed its default font.

**Copy is stale.** The README, the homepage body text, and the OpenGraph metadata all say "Next.js 15".

**No AGENTS.md until now.** From 16.3, `next dev` maintains a version-matched docs block for coding agents, so agents read docs that match the installed version instead of guessing.

## How we organize

**Commit one is markdown only.** The plan, the workshop docs and `AGENTS.md`, nothing else. It gets reviewed as a plan before any code moves.

**One phase, one branch, one PR, straight to `master`.** Not a stack. Stacking would mean the preview deploy for phase N contains phases 1 through N, which destroys the one thing this workshop is for: reading a single phase's effect in isolation. It also means rebasing nine open PRs every time an early one changes. The discipline that replaces stacking is that a phase which cannot stand alone gets split, never parked on an integration branch.

**Merging to `master` deploys production.** So the rule above has teeth: every phase has to leave the app deployable. Two things protect the live site. CI gates the PR from phase 0 onward, and a failed Vercel build keeps the previous deploy live rather than shipping a broken one. Per-PR preview deploys are also where the before and after screenshots come from.

**Tag at group boundaries**, not at every phase. `v1.1.0` after the groundwork phases, `v1.2.0` after the caching model, `v1.3.0` after instant navigations. `v1.0.1` is the zero point.

## Phases

Ten phases, all measured against `v1.0.1`. The early ones are mechanical and clear the ground. The interesting ones are 4, 6 and 7.

### Phase 0: Make the repo tell the truth

Nothing about Next.js here. This phase fixes the things that would make every later measurement unreliable.

- Record the "before" state: build output, route table, terminal logs for a cold navigation. Everything later compares against this.
- `.nvmrc` from Node 22 to 24.20.0, the current LTS.
- Fix `lint-staged.config.js`. It declares `"*.{js,jsx,ts,tsx}"` twice, so the `eslint --fix` entry is silently overwritten by the `vitest related` one and ESLint has never run on commit.
- Bump `lucide-react` from 0.344.0 to 1.39.0. Its old peer range stops at React 18, and it is the only reason `npm install` needs `--force`. 1.39 lists `^19.0.0`. Twelve files import icons from it, so `tsc` will find any renamed exports. Then delete the `--force` instruction from the README.
- Remove `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` from `next.config.mjs` and fix whatever falls out.
- Add the CI workflow, which only becomes meaningful once the two lines above are gone and `npm ci` resolves without `--force`.

Concepts: what Next 16 changed by default. Turbopack as the default bundler, the proxy rename, `next lint` removal, async request APIs.

### Phase 1: Reach 16.3 and React 19.2

`next upgrade` (new in 16.1) to 16.3.4, React to 19.2.8, then delete the dead config flags. Verify the route table is unchanged. Turbopack disk caching for both dev and build is on by default in 16.3, so this phase should also be visible as a build time change worth recording.

Concepts: what `cacheComponents` means now that `dynamicIO` is gone, and how the route table symbols map to the render modes.

### Phase 2: Toolchain

> Superseded by [`phase-2.md`](./phase-2.md). Two items below turned out not to be work at all: the ESLint flat config moved to phase 0, and `useTypeScriptCli` is already the default in 16.3.4. Kept as written, as a record of what was expected.

ESLint flat config, since `next lint` no longer exists. TypeScript 7 for `next build` type checking via `useTypeScriptCli`. A look through the new Turbopack bundle analyzer at `next experimental-analyze`, which will have opinions about `@faker-js/faker` and `lucide-react`. `next dev --inspect` when we need it.

Open question for this phase: Tailwind 3.4 to 4 is a separate migration with its own risk. My instinct is to leave it, because it teaches nothing about Next.js. Decide when we get there.

### Phase 3: Middleware becomes proxy

Rename `src/middleware.ts` to `src/proxy.ts` and revisit what belongs there. The cookie seeding is the question, not the rename.

Concepts: what a proxy is for in 16, why the name changed, what it costs to run on every request.

### Phase 4: Cache Components properly

The heart of the workshop, and the phase that replaces the article's `dynamicIO` experiments with what actually shipped. Move `src/lib/api.ts` from `fetch(cache: "force-cache")` to `use cache` scopes with `cacheLife` profiles and `cacheTag` keys, then wire cart and order mutations in `src/actions/` to invalidate the right tags.

Concepts: `use cache` as a directive on functions and files, what a cache scope closes over, why cache keys are derived from arguments, `cacheLife` profiles, tag-based invalidation, and where a request-time read like `cookies()` forces a boundary.

### Phase 5: Error boundaries that can retry

Add `error.tsx`, then replace `CategoryContent`'s try/catch with a `catchError` boundary from `next/error`. The `retry()` it hands you re-runs the Server Component, which the old `reset()` could not do.

Concepts: why a plain React error boundary breaks `notFound()` and `redirect()`, and the difference between clearing client state and refetching server data. `dummyjson.com` going down is a real failure mode here, not a hypothetical.

### Phase 6: Partial prefetching and instant navigations

Turn on `partialPrefetching`, open Instant Insights in the DevTools, and work through what it flags. Product and category pages already stream inside Suspense, so this is mostly about whether the loading shells are the right shape and where `cookies()` reads de-opt a route.

Concepts: how a loading shell gets extracted from any route's UI, what `<Link prefetch>` now controls, and why `loading.tsx` stopped being the only way.

### Phase 7: Locking the behaviour down

Add Playwright and write `instant()` assertions for the navigations phase 6 made fast, so a later refactor that adds a `cookies()` read to the header fails a test instead of quietly slowing the site. Then look at `generateStaticParams` on `/product/[slug]` with the new ISR behaviour, where an unprerendered page serves a shell to its first visitor and upgrades in the background.

This adds a dependency. Confirm before installing.

### Phase 8: Navigation polish

View Transitions with `<Link transitionTypes>`, and the reworked scroll and focus handling behind `appNewScrollHandler`. Category to product is the obvious transition to animate.

### Phase 9: Root params and the OG image

`getLanguage()` reads `accept-language` from headers today. Introduce a `[lang]` root param and read it with `next/root-params` from any Server Component, no prop drilling. Then fix the `/api/og` prerender warning and take the free `ImageResponse` speedup from 16.2.

This phase is a genuine feature addition rather than an upgrade, so it is the first candidate to cut if the workshop is running long.

## Deliberately out of scope

- Migrating off TanStack Query. Cache Components now caches on the client too, which makes the search box worth a conversation, but ripping out a working library to prove a point is not an upgrade.
- The experimental flags: Rust React Compiler, `useOffline`, `cachedNavigations`. Stable and officially opt-in only, by your call.
- Tailwind 4. See phase 2.

## Sources

- [Next.js 16](https://nextjs.org/blog/next-16)
- [Next.js 16.1](https://nextjs.org/blog/next-16-1)
- [Next.js 16.2](https://nextjs.org/blog/next-16-2)
- [Next.js 16.3](https://nextjs.org/blog/next-16-3)
- [Instant Navigations](https://nextjs.org/blog/next-16-3-instant-navigations)
- [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components)
