# FakeShop workshop memory

**Quick context**: see [`workshop/README.md`](workshop/README.md) for the full documentation, [`workshop/upgrade-plan.md`](workshop/upgrade-plan.md) for the plan.

## Current phase

**Phase 4: Cache Components properly** — not started. The heart of the workshop. Move `src/lib/api.ts` from `fetch(cache: "force-cache")` to `use cache` scopes with `cacheLife` profiles and `cacheTag` keys, then wire the cart and order mutations in `src/actions/` to invalidate the right tags.

Phase 3 is done on branch `workshop/phase-3`. Phases 0, 1, 2 and 3 are written up in `workshop/`.

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

### Phase 3: Middleware becomes proxy

Branch `workshop/phase-3`. Two commits: the codemod rename, then the deletion of the whole proxy. The cart default moved into `src/actions/session.ts`. Route table unchanged except that the `ƒ Proxy (Middleware)` line is gone. Full write-up in [`workshop/phase-3.md`](workshop/phase-3.md).

- **The app now has no proxy at all.** That is the honest migration, not a shortcut. Next 16's own guidance is "last resort", and the rename exists to discourage the feature rather than to bless it. Proxy also defaults to the Node.js runtime from 16.0, and setting `runtime` in the config object throws.
- **A proxy writes to the response; the render reads the request.** The seeding never helped the request that performed it, so a visitor's very first request still saw no cart cookie. It only appeared to work because the first request is a page view and the add-to-cart is a later one.
- **Proxy runs before the filesystem.** The matcher excluded `api`, `_next/static`, `_next/image` and `favicon.ico`, but not `public/` — 15 of the 16 files there ran the proxy and came back with two `Set-Cookie` headers. `Set-Cookie` on a read makes a response uncacheable by a shared cache, which matters for phases 4 and 6.
- **Server Actions are POSTs to the route they live on**, so a matcher that excludes a path silently removes proxy coverage from its actions. Reason enough never to put auth in a proxy.
- **Two latent bugs came out with the seeding.** `updateCart` returned the cart it had *read*, correct only because `prepareCart` mutates in place — making `prepareCart` pure would have silently broken the optimistic cart UI in `src/hooks/cart.tsx`. And `setOrders` wrote the `orders` cookie with none of the `httpOnly`/`secure`/`sameSite`/`maxAge` attributes the seed had given it.
- **`emptyCart()` is a function, not a constant**, for the same mutation reason: a shared constant would accumulate every visitor's items for the life of the server process.
- `src/actions/__tests__/session.test.ts` mocks `next/headers` with an in-memory `Map`. Three of its four tests fail against the old code, verified by restoring the old body.
- The build legend still prints `ƒ Proxy (Middleware)` while a proxy exists — hardcoded at `node_modules/next/dist/build/utils.js:499`, cosmetic only.

### Phase 2: Toolchain

Branch `workshop/phase-2`. TypeScript 5.7.3 to 6.0.3 plus `typescript-native` (`npm:typescript@7.0.2`) side by side, the build's type check moved out to `vercel.json`, and the first run of the Turbopack bundle analyzer. No application code changed, route table byte-identical. Full write-up in [`workshop/phase-2.md`](workshop/phase-2.md).

- **`useTypeScriptCli` was never work.** Already the default in 16.3.4 (`node_modules/next/dist/server/config-shared.js:257`); the flag only turns the CLI checker off. The plan had budgeted a phase item for it.
- **TypeScript 7 is 4x faster and ESLint is what stops it being the only compiler.** Cold full-project typecheck on Node 24.20.0: 5.7.3 ~1.25s real / ~2.49s user, 6.0.3 1.30s / 2.58s, 7.0.2 0.30s / 0.78s. TS 6 is not faster than 5.7 and was never going to be — 6.0 is the last JavaScript implementation.
- **Cold `next build`** with TS 6 held constant: 5.27–5.40s real / ~16.6s user with the type check, 3.97–4.03s / ~14.1s without. The `Running TypeScript ... 1518ms` line is replaced by `Skipping validation of types` plus a 4ms `tsc --showConfig` call, which is why the build still needs a resolvable `typescript`.
- `tsconfig.json` lost `"target": "es5"` for `"ES2017"` — TS 6 warns `TS5107`, TS 7 errors `TS5108`. ES2017 is Next's own suggested value.
- `lint-staged.config.js` called bare `tsc`; now calls `npm run typecheck`, so the compiler path is written down once.
- **The bundle analyzer's findings**: the app is 2% of its own client bundle (11.1 KB gz of 524.9 KB); fonts are 40.7% but are seven `unicode-range` subsets of which a browser downloads one; `polyfill-nomodule.js` is 38.5 KB nobody fetches; `@faker-js/faker` is 962.8 KB gz of _server_ bundle on `/account` and `/login`, correctly absent from every client chunk, for six lines in `src/actions/sessionUtils.ts`; `/api/og` is 20.6 MB gz of server bundle, a second reason for phase 9 to look at it. `lucide-react` tree-shakes perfectly — three icons, 1.7 KB gz — so phase 0's v1 upgrade needs no follow-up.
- `npm run analyze` added. Use `-o` to write to `.next/diagnostics/analyze` instead of serving a UI.

### Phase 1: Reach 16.3 and React 19.2

Branch `workshop/phase-1`. `next` 16.1.6 to 16.3.4, `react`/`react-dom` 19.0.4 to 19.2.8, `eslint-config-next` to 16.3.4. No application code changed. Full write-up in [`workshop/phase-1.md`](workshop/phase-1.md).

- **Turbopack disk caching is the result.** On by default for dev and build in 16.3. Warm compile went from ~1200ms to ~230ms, warm build user CPU from 12.38s to 1.75s, and `.next/cache` from 212K to 74M with a real `turbopack/` directory. Cold compile got slower, 1219.7ms to 1683ms, which is the cost of writing the cache.
- Deleted `experimental.dynamicIO` (already rejected as an invalid key), the three webpack flags, and the commented-out `ppr`. `next.config.mjs` is now `images` plus `cacheComponents`.
- Route table is **not** byte-identical, but only in layout: on `/category/[slug]` and `/product/[slug]` the `◐` moved from the pattern row to the indented instance row. Same render modes, same counts, same lifetimes. 16.3 marks prerendered instances rather than patterns.
- `next build` rewrote `tsconfig.json` to `moduleResolution: "bundler"` and calls it mandatory. Committed rather than reverted, since reverting only invites the next build to rewrite it.
- `AGENTS.md` gained the managed `<!-- BEGIN:nextjs-agent-rules -->` block that `next dev` maintains from 16.3, pointing agents at the docs Next bundles at `node_modules/next/dist/docs/`. Committed on purpose: it regenerates on every dev run, so omitting it means a permanently dirty tree. Stale phase-0 facts in the same file were corrected.
- `next` and `eslint-config-next` are now exact pins rather than caret ranges, which is what `next upgrade` writes.
- Two build warnings survived on purpose at the time: middleware deprecation (removed in phase 3) and the `/api/og` prerender warning (phase 9, still open).

## Decisions

- **Tutor mode**: I implement, Christophe learns. Concept explained before the code, subtleties explained after.
- **Scope**: stable and officially opt-in Next.js features only. No experimental flags (Rust React Compiler, `useOffline`, `cachedNavigations`).
- **Output**: phase docs in `workshop/`. No article rewrite for now.
- **PR strategy**: one phase, one branch, one PR, straight to `master`. Not stacked. Merging to `master` deploys production, so every phase must leave the app deployable, and CI gates the PR from phase 0 on. Tags at group boundaries.
- **ESLint moved from phase 2 into phase 0**, because CI cannot run a lint step that does not exist. Phase 2 keeps TypeScript 7, the bundle analyzer and the Tailwind question.
- **ESLint stays on 9, not 10 — blocked upstream, not a per-phase recheck.** Three of `eslint-config-next`'s dependencies cap at `eslint ^9` and all are at their latest release: `eslint-plugin-import@2.32.0`, `eslint-plugin-jsx-a11y@6.10.2`, `eslint-plugin-react@7.37.5`. `npm install` reports whichever it hits first, which is why phase 1 recorded only one. Verified in phase 2 as real breakage, not stale metadata: forcing `eslint@10.9.1` in makes `eslint-plugin-react` throw `contextOrFilename.getFilename is not a function` from its React version auto-detection; pinning `settings.react.version` gets past that and then `eslint-plugin-tailwindcss` throws `context.getSourceCode is not a function`. It is a queue of removed APIs, not one package. `eslint@9.39.5` is already the newest 9.x — the npm deprecation warning only means 9.x moved to the `maintenance` dist-tag. The recheck is one command: `npm view eslint-plugin-react peerDependencies.eslint`.
- **The app has no proxy, decided in phase 3.** `src/middleware.ts` was renamed to `src/proxy.ts` by the codemod and then deleted, because its only job — seeding empty `cart` and `orders` cookies — was a default that belongs in `src/actions/session.ts`. If a future phase wants a proxy back, the bar is something that genuinely has to run in front of the app.

- **No `overrides` block.** `next upgrade` adds one pinning the React types across the tree. Dropped in phase 1 and the install resolved cleanly without it.
- **Skipped the `cache-components-instant-false` codemod** offered for 16.3. It adds `export const instant = false` to every page and layout as an adoption escape hatch, which phase 6 would only have to delete.
- **Tailwind 3.4 stays**, decided in phase 2. A CSS engine migration with real regression risk across every component, no Playwright suite until phase 7 to catch what it breaks, and it teaches nothing about Next.js. Consequence: `eslint-plugin-tailwindcss` stays pinned at 3.18.3, because 4.x requires `tailwindcss ^4`.
- **Type checking runs once, in `npm run typecheck`, on TypeScript 7.** `next build` has `typescript.ignoreBuildErrors: true`, which is only safe because `vercel.json` sets `buildCommand` to `npm run typecheck && npm run build`. Do not remove that file without putting the gate somewhere else — merging to `master` is the production deploy.
- **TypeScript 6 keeps the `typescript` name; 7 is `typescript-native` and is invoked by explicit path.** TypeScript 7 ships no API, so anything that imports the compiler (`typescript-eslint`, the editor) needs 6. `typescript-estree` declares `>=4.8.4 <6.1.0`, so 6.0.3 is supported and 6.1 will need watching. npm gives `.bin/tsc` to the root `typescript` and creates no bin entry for the alias, silently — never call bare `tsc` in a script.

## Environment notes

- Christophe manages Node with `mise`, not `fnm`. His default shell runs Node 24.17.0 while `.nvmrc` pins 24.20.0, so `.nvmrc` is not currently driving his local version and CI is the only place it binds. Installs live under `/Users/tophe/.local/share/mise/installs/node/`, which is how to invoke a specific version when a measurement depends on it. Keep this out of the workshop docs, it is personal tooling.
- Node 24.20.0 is the current LTS. `.nvmrc` moved to it in phase 0. Phase 0's numbers were taken on 24.17.0, so phase 1 re-measured its own before state rather than carrying them over.
- His global `.npmrc` sets `min-release-age=2`, which holds back anything published in the last two days. That is why `@types/react-dom` is at 19.2.5 rather than 19.2.7. Personal tooling, keep it out of the workshop docs.
- Deployment is wired through the Vercel dashboard on `master`. Phase 2 added a `vercel.json` whose `buildCommand` is the production type-check gate. The `.github/workflows/ci.yml` added in phase 0 is the only workflow.
- Measure build performance with **user CPU time, not wall clock**. On a 12-core laptop wall clock is bounded by the longest chain and badly understates a change; phase 1's cache saved 86% of the CPU but only 1.3s of wall clock.
