# FakeShop workshop memory

**Quick context**: see [`workshop/README.md`](workshop/README.md) for the full documentation, [`workshop/upgrade-plan.md`](workshop/upgrade-plan.md) for the plan.

## Current phase

**Phase 8: Navigation polish** — not started. View Transitions with `<Link transitionTypes>`, and the reworked scroll and focus handling behind `appNewScrollHandler`. Category to product is the obvious transition to animate. `appNewScrollHandler` is experimental, so check whether it is in scope before turning it on.

Phase 7 is done on branch `workshop/phase-7`. Phases 0 through 7 are written up in `workshop/`.

## Baseline as of 2026-09-02

Measured on `master` at tag **`v1.0.1`** (`fa08514`), clean tree. That tag is the "before" marker for the whole workshop: every phase is a diff against it, and it is what a reader of the original article would find if they cloned the repo. The full captured output lives in [`workshop/phase-0.md`](workshop/phase-0.md).

`v1.0.1` is a version bump and nothing else. The dependency state it captures came in through PR #2 (`b212cbc`), the CVE-2026-23864 fix.

- `npm run typecheck` passes. `npm run build` passes but printed `Skipping validation of types`.
- Route table: `/`, `/account`, `/category/[slug]`, `/checkout`, `/login`, `/product/[slug]`, `/search` and `/_not-found` are all Partial Prerender. `/api/hello/world` is static, `/api/og` is dynamic. `/` revalidates at 15m, expires at 1y.
- Static generation of 11 pages takes ~400ms with 13 workers. Cold build 3.267s.
- One warning on every build, at `/api/og`: "During prerendering, fetch() rejects when the prerender is complete."
- Installed: `next` 16.1.6, `react` 19.0.4. Latest: 16.3.4 and 19.2.8.

## Completed phases

### Phase 7: Locking the behaviour down

Branch `workshop/phase-7`. Playwright plus `@next/playwright`, and six `instant()` assertions in `e2e/instant-navigation.test.ts` covering the app shell, both dynamic routes on a cold load and on a click, and the fully static home page. `generateStaticParams` was measured and not adopted. No application code changed. Full write-up in [`workshop/phase-7.md`](workshop/phase-7.md).

- **No lifecycle hook was needed to keep Chromium off Vercel.** `playwright@1.63.0` publishes no `install` script, verified against the registry and then observed: `npm install` added four packages and left the browser cache absent. The browser arrives only from an explicit `npm run test:e2e:install`, which local setup and CI run and Vercel never does. No `prepare` entry, no `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`.
- **`instant` names three separate things**: the property (a navigation that commits in the same frame as the click, showing the App Shell), `export const instant` (a route segment config that opts a segment into dev-time validation), and `instant()` (the `@next/playwright` helper). Only the helper is used here. No `instant` export was added: under `cacheComponents` the default `instantInsights.validationLevel: 'warning'` already validates every Page segment in `next dev`, so the export would restate the default.
- **`instant()` is one cookie**, `next-instant-navigation-testing`, and it is the same switch as **Pause on navigations** in the Navigation Inspector. Assertions inside the scope describe the first paint, assertions after it describe what streamed in — and the second set is what stops the first from being a tautology.
- **The suite must run against a production build**, because `next dev` never prefetches. `experimental.exposeTestingApiInProductionBuild` is gated on `NEXT_E2E_TESTING`, which only `playwright.config.ts` sets, for both halves of `npm run build && npm run start`. Verified from `.next/required-server-files.json`: `false` on a plain build, `true` on the e2e build.
- **Forgetting the flag fails loudly.** Against a server built without it, `instant()` does not throw — it just returns the fully rendered page (`skeletons: 0 | product links: 5`). Every test asserts a skeleton is visible inside the scope, so that configuration goes red rather than passing vacuously.
- **The regression probe that failed to fail is the instructive one.** Removing `"use cache"` from `CategoryList` kept the home test green, because `getCategories()` in `src/lib/catalog.ts` is itself cached and the render is still prerenderable. Replacing that scope with `await cookies()` made the data genuinely request-time, the build still passed, and the test went red — the quiet slowdown the phase exists to catch.
- **`next start` is the wrong place to evaluate `generateStaticParams`.** Its default cache handler keeps `use cache` entries in memory only: a URL already upgraded on disk re-rendered from scratch after a restart, re-running `getProduct`. TTFB was 2–4 ms prerendered or not, because the App Shell is what the first visitor gets either way.
- **The three-renders-then-one pattern in the server log is the ISR upgrade**, and it happens on every dynamic path whether or not its params were prerendered.
- Ports: the suite builds and serves on 3030 with `reuseExistingServer: false`. Reusing a dev server on 3000 would silently invalidate every assertion.
- `e2e/**` is excluded from Vitest, which would otherwise match the specs with its default include and fail on the `@playwright/test` import.
- Two elements carry `data-prerender-hint` (the search form and the user icon), so a bare attribute selector is a strict-mode violation. Scope it to the `<nav>`.

### Phase 6: Partial prefetching and instant navigations

`partialPrefetching: true` in `next.config.mjs`, alongside `cacheComponents` which it requires. Both audits from the adoption guide came back nearly empty: the app's only `prefetch` prop anywhere was `prefetch={false}` on the 24 category tiles (added Feb 2025, `d22a1e0`), and every page already reads `params`/`searchParams` inside a `<Suspense>` child rather than at the top, so no route ties its shell to one URL. Tested in `next dev`: no insights, no runtime errors.

Removed the `prefetch={false}` opt-out — measured, the whole grid costs 5 requests and ~3.8 KB and the router never reaches the other 19 links. The real work was the loading shells, since a Suspense fallback is now what a `<Link>` delivers _before_ the click rather than a mid-stream flash. Hoisted URL-independent UI above the boundary on `/checkout` (the `<h1>` was duplicated across three branches), `/account` and `/login` (only the form depends on `redirectTo`), and added `CheckoutSkeleton`, `AccountSkeleton` and `CategoryListSkeleton` in place of four `<div>Loading...</div>` fallbacks. Shell sizes grew ~3 KB per route, in an artifact shared by every link to that route.

Route table byte-identical — the flag is a client prefetch strategy, not a prerendering one. Write-up in [`workshop/phase-6.md`](workshop/phase-6.md).

### Phase 5: Error boundaries that can retry

Branch `workshop/phase-5`. Two `error.tsx` files, one per route group; a reusable `catchError` boundary in `src/components/CatalogErrorBoundary.tsx` used at the category grid, the search results and the homepage category list; and the `try/catch` plus its `cacheLife("seconds")` branch removed from both read sites. Route table byte-identical. Full write-up in [`workshop/phase-5.md`](workshop/phase-5.md).

- **The phase-4 open question is answered: a `use cache` scope that rejects writes no entry at all.** Measured with a fault injected into `src/lib/catalog.ts` — two consecutive failing requests both re-ran the read, then a success was cached normally. The `cacheLife("seconds")` failure branch existed only because a `catch` that returns JSX turns a failure into a cacheable _value_; let it throw and there is nothing to cache. There were two such branches, not the three this file previously recorded.
- **`retry()` versus `reset()`, measured in the browser**: `reset()` made zero network requests and re-rendered the same errored payload even with the fault already cleared; `retry()` issued one `?_rsc=` request, the server log showed the Server Component running again, and the grid swapped in without a navigation.
- **An error boundary never rescues a prerender.** Building with `getCategories` faulted fails the build (`Export encountered an error on /(shop)/page: /`) rather than baking the fallback into the 30d shell of `/`, and wrapping `CategoryList` in the `catchError` boundary does not change that. Both boundaries are request-time UI only.
- **The fallback is client-rendered and needs JavaScript.** The response ends with React's errored-row marker carrying only a digest — `2f:E{"digest":"2660648470"}` — and no fallback markup. `/category/[slug]` is a partial prerender, so the shell has already flushed and no server pass is left to render the fallback. Watch out when grepping a response for the fallback text: the `label` prop is serialized into the flight data on healthy pages too, so grep `role="alert"` instead.
- **`notFound()` and `redirect()` pass through `catchError` untouched**, verified from inside a `use cache` scope. A hand-rolled `componentDidCatch` in the same position swallows `notFound()` and renders its fallback — verified with a control test.
- **`ErrorInfo["error"]` is typed `unknown`, not `Error`.** The documented `catchError` example reads `error.message` off it and does not compile. Only `error.tsx` gets `Error & { digest?: string }`.

### Phase 4: Cache Components properly

Branch `workshop/phase-4`. New `src/lib/catalog.ts` cached read layer over a now-uncached `src/lib/api.ts`, `use cache` moved up from the data reads to the components, and an explicit `cacheLife` on every scope. Route table unchanged in shape; `/` went from 15m to 30d. Full write-up in [`workshop/phase-4.md`](workshop/phase-4.md).

- **The module split was forced by the compiler, not chosen.** `src/lib/api.ts` is isomorphic — TanStack Query calls it from the browser through `src/hooks/products.ts` — so it reaches the client bundle and cannot import `next/cache`. The build error names the Pages Router, which this app does not have; the import trace under it is the real message. The `next/cache` import is its own guard, so no `server-only` package is needed.
- **The measurement that is the point of the phase**: on a second request to a warm page, the baseline re-ran every data function and re-rendered; now `/category/[slug]` and `/product/[slug]` log only the uncached component that awaits `params`, and `/search?q=phone` logs nothing at all.
- **`force-cache` nested under `use cache` silently defeats `revalidateTag`.** Measured with three throwaway probe routes: after invalidating the tag, the `use cache` entry is dropped and the function re-runs, but the `force-cache` fetch inside it returns the same stale value, with no error. Same probe without the option returned fresh data. This is why `src/lib/api.ts` has no `cache` option now.
- **A default parameter value inside a `use cache` scope creates a second entry.** Keys are built from the arguments as passed, before defaults apply, so `f("x")` and `f("x", 10, 0)` ran the body twice. Hence the shape of `catalog.ts`: an uncached exported wrapper holds the defaults and delegates to a private cached function with required parameters.
- **One un-lifetimed `use cache` was pinning `/` to a 15 minute revalidate.** `CustomQRCode` had carried `"use cache"` with no `cacheLife` since the original article, taking the `default` profile; a route's revalidate is the shortest lifetime among the content it prerenders. One line took `/` to 30d.
- **Error branches get their own `cacheLife("seconds")`** so a failure is never cached at the success lifetime and never reaches a prerender. `SearchResults` needed a real fix rather than a lifetime: its catch fell through to "No products found", so a network blip rendered as a confident empty result set.
- **Component entries carry the same tags as the data functions under them.** An outer scope with an explicit `cacheLife` never re-reads an inner one until its own entry goes, so tagging only the data would leave the component serving markup built from invalidated JSON.
- Incidental: `getProducts` has no server-side caller and is browser-only. A directory named `_foo` under `app/` is a private folder and 404s. `export const dynamic` is rejected outright under Cache Components.

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
- **Two latent bugs came out with the seeding.** `updateCart` returned the cart it had _read_, correct only because `prepareCart` mutates in place — making `prepareCart` pure would have silently broken the optimistic cart UI in `src/hooks/cart.tsx`. And `setOrders` wrote the `orders` cookie with none of the `httpOnly`/`secure`/`sameSite`/`maxAge` attributes the seed had given it.
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
- **No revalidation webhook, decided in phase 4.** The plan said to wire cart and order mutations to invalidate tags, but cart, orders and user info live entirely in cookies, so there is no server-side cache for `updateTag` to invalidate — a call there would mislead the next reader about what is cached. The only cached data is the dummyjson catalog, which no mutation touches. The tags (`categories`, `products`, `product:${id}`, `category:${slug}`) are declared with no caller on purpose, so the surface exists the day there is a real backend. A guarded `POST /api/revalidate` was considered and rejected: it would be a public endpoint plus a deployment secret to demonstrate an invalidation that returns byte-identical data, and the instructive half of it was obtained from a throwaway probe instead.
- **The error fallback needs JavaScript, accepted in phase 5.** With the boundaries in place a catalog outage shows a no-JS visitor the loading skeleton and nothing else, where phase 4's `try/catch` server-rendered a readable paragraph. Christophe chose to ship the boundaries anyway and document it: the alternatives are to keep caching an error as a value and give up `retry()`, or to hand-roll a server-rendered message plus a `router.refresh()` button, and both give back the thing the phase is for. The failure mode is a catalog outage seen by a no-JS visitor, which is a narrow intersection.
- **`error.tsx` goes inside each route group, not at `src/app/`, decided in phase 5.** A boundary never wraps the `layout.tsx` beside it, so at `src/app/` it would sit above `(shop)/layout.tsx` and take the header, cart and footer down with the page. One directory lower the chrome survives. `(checkout)/error.tsx` is not decoration: `/checkout` calls `getProduct` per cart line with no handling anywhere in the path, so before phase 5 an outage there hit Next's built-in 500 page.
- **The app has no proxy, decided in phase 3.** `src/middleware.ts` was renamed to `src/proxy.ts` by the codemod and then deleted, because its only job — seeding empty `cart` and `orders` cookies — was a default that belongs in `src/actions/session.ts`. If a future phase wants a proxy back, the bar is something that genuinely has to run in front of the app.

- **No `overrides` block.** `next upgrade` adds one pinning the React types across the tree. Dropped in phase 1 and the install resolved cleanly without it.
- **Skipped the `cache-components-instant-false` codemod** offered for 16.3. It adds `export const instant = false` to every page and layout as an adoption escape hatch, which phase 6 would only have to delete. Vindicated: phase 6 needed no opt-out on any route.
- **`partialPrefetching` stays on despite being unmeasurable here, decided in phase 6.** Built and served the app with the flag both ways and drove the same browser script against the home page: byte-identical results, 5 requests and ~3778 B either way. Ruled out a stale build (`.next/required-server-files.json` reports `config.partialPrefetching`), the flag not reaching the client (a chunk in `.next/static/chunks/` references it by name), and prefetches being inlined by `experimental.prefetchInlining` (the served HTML carries no inlined payloads). The one-shell-per-route behaviour is visible in the build output — a single `category/[slug].segments/_full.segment.rsc` — but this app only ever prefetches four links, which is below the size where sharing pays. Do not re-run this measurement expecting a different answer; it needs a page with many links to distinct routes.
- **`generateStaticParams` stays off `/product/[slug]`, decided in phase 7.** Probed with the five `beauty` products; the build picked them up and the route table listed them, but request-time behaviour was identical to an unprerendered path. The instant first paint comes from the App Shell plus `use cache`, `cacheLife("hours")` re-warms the entry anyway, and the app has no ranking signal to choose which of ~194 products deserve build-time prerendering — "the beauty category" would be a demo artifact dressed as a product decision. Revisit the day a real catalog gives a reason to pick.
- **Tailwind 3.4 stays**, decided in phase 2. A CSS engine migration with real regression risk across every component, no Playwright suite at the time to catch what it breaks, and it teaches nothing about Next.js. Consequence: `eslint-plugin-tailwindcss` stays pinned at 3.18.3, because 4.x requires `tailwindcss ^4`.
- **Type checking runs once, in `npm run typecheck`, on TypeScript 7.** `next build` has `typescript.ignoreBuildErrors: true`, which is only safe because `vercel.json` sets `buildCommand` to `npm run typecheck && npm run build`. Do not remove that file without putting the gate somewhere else — merging to `master` is the production deploy.
- **TypeScript 6 keeps the `typescript` name; 7 is `typescript-native` and is invoked by explicit path.** TypeScript 7 ships no API, so anything that imports the compiler (`typescript-eslint`, the editor) needs 6. `typescript-estree` declares `>=4.8.4 <6.1.0`, so 6.0.3 is supported and 6.1 will need watching. npm gives `.bin/tsc` to the root `typescript` and creates no bin entry for the alias, silently — never call bare `tsc` in a script.

## Environment notes

- Christophe manages Node with `mise`, not `fnm`. His default shell runs Node 24.17.0 while `.nvmrc` pins 24.20.0, so `.nvmrc` is not currently driving his local version and CI is the only place it binds. Installs live under `/Users/tophe/.local/share/mise/installs/node/`, which is how to invoke a specific version when a measurement depends on it. Keep this out of the workshop docs, it is personal tooling.
- Node 24.20.0 is the current LTS. `.nvmrc` moved to it in phase 0. Phase 0's numbers were taken on 24.17.0, so phase 1 re-measured its own before state rather than carrying them over.
- His global `.npmrc` sets `min-release-age=2`, which holds back anything published in the last two days. That is why `@types/react-dom` is at 19.2.5 rather than 19.2.7. Personal tooling, keep it out of the workshop docs.
- Deployment is wired through the Vercel dashboard on `master`. Phase 2 added a `vercel.json` whose `buildCommand` is the production type-check gate. The `.github/workflows/ci.yml` added in phase 0 is the only workflow.
- Measure build performance with **user CPU time, not wall clock**. On a 12-core laptop wall clock is bounded by the longest chain and badly understates a change; phase 1's cache saved 86% of the CPU but only 1.3s of wall clock.
