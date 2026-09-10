# Phase 7: Locking the behaviour down

Phase 6 made the navigations fast. Nothing in the repository could tell whether they stayed fast. This phase adds Playwright and the `instant()` helper from `@next/playwright`, so the shape phase 6 built — a prerendered App Shell that paints before any data arrives — is asserted rather than assumed. It also settles the `generateStaticParams` question the plan left open, by measuring it and then not adopting it.

## The before state

`npm run test:ci` ran 23 Vitest tests over pure functions, two error boundaries and the session actions. Every one of them runs in jsdom against a component in isolation. None of them starts a server, so none of them can observe the thing phase 6 changed: what the browser paints in the first frame after a click.

The route table is the other half of the before state. Both dynamic segments prerender exactly one artifact, with no concrete paths under them:

```
├   /category/[slug]
│ └ ◐ /category/[slug]
├   /product/[slug]
│ └ ◐ /product/[slug]
```

## Concepts

### An instant navigation is a claim about the first frame, not about total time

A page that finishes loading in 200 ms is fast. A page that paints its own chrome, its heading and its skeleton in the same frame as the click, then fills in, is _instant_ — and it can be instant while taking longer overall. The two properties are independent, which is why a stopwatch cannot test this. What has to be tested is a boundary: which parts of the UI were available without waiting on the network, and which were not.

Next.js draws that boundary at prerender time. Everything above the `<Suspense>` boundary that reads request-time data goes into the App Shell; everything below streams in. `instant()` makes the boundary observable by freezing the app on the shell side of it.

### `instant()` is one cookie

The whole mechanism is `next-instant-navigation-testing`. While that cookie is set, the router renders only what is in the prefetch cache and the server responds with only the static shell. `instant(page, fn)` sets it, awaits the callback, and clears it. This is the same switch the **Pause on navigations** toggle in the Navigation Inspector flips, so what a test asserts is exactly what the DevTools panel shows.

That makes the two halves of a test read very naturally. Assertions _inside_ the callback describe the first paint. Assertions _after_ it describe what streamed in behind it — and they are what proves the first set was not a tautology.

### A route can be reached two ways and only one of them may be instant

`page.goto()` exercises the static shell from the document response. Clicking a `<Link>` exercises the destination's _prefetched_ shell, which is a different artifact produced by a different code path. A `<Suspense>` boundary in the root layout covers the first and not the second, because on a client navigation the layout is already mounted and only the segments below it re-render. Both need their own test.

### The helper assumes a warm cache

`instant()` deliberately does not wait for prefetches. It asserts the route is _structured_ correctly for an instant navigation, independent of network timing — so a click issued before the link's prefetch has landed reads as a blocked navigation and fails the test for a reason that has nothing to do with the app. Prefetching starts when a link enters the viewport, which is why the two client-navigation tests scroll the link into view and settle the network before entering the scope.

## What changed

### The dependencies, and where the browser is not downloaded

```
@playwright/test  ^1.63.0
@next/playwright  16.3.4   (exact, tracking `next` like `eslint-config-next` does)
```

`@next/playwright` is versioned with Next.js, so it is pinned exactly for the same reason `next` and `eslint-config-next` are.

The thing worth knowing is that neither package downloads a browser. `playwright@1.63.0` publishes no `install` script — verified against the registry, and then observed: `npm install` added four packages and left the browser cache absent. Chromium arrives only when something explicitly runs `playwright install`, which is `npm run test:e2e:install`. So the three environments differ without any lifecycle hook, any `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`, and without touching `prepare`:

|        | install       | browser                                                 |
| ------ | ------------- | ------------------------------------------------------- |
| local  | `npm install` | `npm run test:e2e:install`, once                        |
| CI     | `npm ci`      | a cached `npm run test:e2e:install -- --with-deps` step |
| Vercel | `npm ci`      | never                                                   |

`--with-deps` is CI-only because the system libraries Chromium links against live outside `~/.cache/ms-playwright` and so are not restored by the cache step.

### `exposeTestingApiInProductionBuild`, behind an env var

In `next dev` the testing API is always on, but a dev server never prefetches, so a client-navigation assertion there would be meaningless. These tests have to run against a production build, and `next start` only exposes the API when the flag is set:

```js
experimental: {
  exposeTestingApiInProductionBuild: process.env.NEXT_E2E_TESTING === "1",
},
```

Its own documentation says it is "not meant to be deployed to live production sites", so it is gated rather than set to `true`. `playwright.config.ts` is the only thing that sets `NEXT_E2E_TESTING`, and it sets it for both halves of `npm run build && npm run start`, because the flag decides both what is compiled in and what the server exposes. Verified from the built config on each side:

```
plain build  → exposeTestingApiInProductionBuild = false
e2e build    → exposeTestingApiInProductionBuild = true
```

### The server the suite drives

`playwright.config.ts` builds and serves on port **3030**, never 3000, and never reuses an existing server. Reusing `next dev` on 3000 would silently invalidate every assertion in the file, because a dev server does not prefetch.

### The tests

Six tests in `e2e/instant-navigation.test.ts`. The discriminator throughout is the `animate-pulse` class: it only ever appears in a loading fallback, so its presence proves the shell is on screen and its absence proves real content replaced it.

- **the app shell carries the header on a cold load of a dynamic route** — the guard the plan asked for. A `cookies()` read added above the header's `<Suspense>` boundary would take the header out of the shell, and this test fails.
- **the product page paints its shell on a cold load** — skeleton visible, no _Add to Cart_ button; after the scope, the button is there and no skeleton is.
- **the product page is instant from a category page** — the same route reached by clicking, which is the artifact the first test does not cover.
- **the category page paints its shell on a cold load**.
- **the category page is instant from the home page, with the right title** — also asserts the `<h1>` reads _Beauty_ inside the scope. That heading is computed client-side from the pathname by `ProductGridLoading`, and it is the reason the fallback is worth having: the visitor sees which category they asked for before a single product arrives.
- **the home page is fully static, category grid included** — the one route with no dynamic data at all, so `instant()` should show the finished page and zero skeletons.

## Measurements

### The suite catches a regression that the build does not

The tests are only worth their runtime if they fail when the behaviour regresses. Two probes, both reverted.

The first one failed to fail, which was the more interesting result. Removing `"use cache"` from `CategoryList` changed nothing: the test stayed green, because `getCategories()` in `src/lib/catalog.ts` is _itself_ cached, so the render is still fully prerenderable. The component-level cache phase 4 added is an optimisation layered on an already-cached read — these tests assert the shape of the shell, not which layer produced it.

The second probe made the data genuinely request-time, by replacing that scope with an `await cookies()`. The build still succeeded and the page still worked; the category grid simply dropped out of the static shell:

```
✘ home page › is fully static, category grid included
  Locator: locator('a[href="/category/beauty"]')
  Expected: visible
  Error: element(s) not found
```

That is the exact failure mode the phase exists to catch — nothing breaks, the site just quietly stops being instant.

### Forgetting the flag fails loudly, not silently

A test suite that passes vacuously when misconfigured is worse than no suite. Driving `instant()` against a server built _without_ `exposeTestingApiInProductionBuild` returns a fully rendered page — `skeletons: 0 | product links: 5` — and the helper does not throw. Because every test asserts a skeleton is _visible_ inside the scope, that configuration goes red rather than green.

### `generateStaticParams`: measured, not adopted

Probed on `/product/[slug]`, returning the products of the `beauty` category. The build picked up five paths — the category only has five products — and the route table gained them alongside the shell:

```
├   /product/[slug]
│ ├ ◐ /product/[slug]
│ ├ ◐ /product/essence-mascara-lash-princess-1          1h      1d
│ ├ ◐ /product/eyeshadow-palette-with-mirror-2          1h      1d
│ └ ◐ [+3 more paths]
```

The `1h`/`1d` come from `cacheLife("hours")` on `ProductDetail`.

At request time, against `next start`, there was nothing to see. TTFB was 2–4 ms for a prerendered path and for an unprerendered one alike, because in both cases what the first visitor gets is the App Shell. The prerendered path even re-ran `getProduct` on its first request.

The reason is worth recording, because it is a property of the local server rather than of the feature. `next start`'s default cache handler holds `use cache` entries **in memory only**. A URL that had already been upgraded on demand, whose `.html` was sitting on disk, re-rendered from scratch after a server restart:

```
### after a server restart, URL already upgraded on disk (.html exists):
  > getProduct { id: 25 }
* ProductPage { slug: 'annibale-colombo-bed-25' }
* ProductPage { slug: 'annibale-colombo-bed-25' }
* ProductPage { slug: 'annibale-colombo-bed-25' }
```

Three renders on a cold visit, one on a warm one — that triple is the ISR behaviour the plan described, the shell going out first and the upgrade happening behind it. It is visible on _every_ dynamic path, with or without `generateStaticParams`.

So the decision is not to adopt it here. The instant first paint already comes from the App Shell plus `use cache`; `generateStaticParams` only warms a cache that `cacheLife("hours")` re-warms anyway; and the app has no ranking signal for choosing which of ~194 products deserve build-time prerendering, so "the beauty category" would be a demo artifact dressed up as a product decision. The surface stays available the day a real catalog gives a reason to pick.

## Key files

- [`playwright.config.ts`](../playwright.config.ts) — port 3030, no server reuse, `NEXT_E2E_TESTING` for the build and the server
- [`e2e/instant-navigation.test.ts`](../e2e/instant-navigation.test.ts) — the six assertions
- [`next.config.mjs`](../next.config.mjs) — the gated testing-API flag
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — the cached Chromium step
- [`vitest.config.mts`](../vitest.config.mts) — `e2e/**` excluded, so Vitest does not try to run Playwright specs

## Learning outcomes

- Instant is a claim about the first frame. It is tested by freezing the app at a boundary, not by timing it.
- The boundary is one cookie, and the same cookie drives the Navigation Inspector. The test and the DevTools panel show the same thing.
- A route reached by `goto()` and the same route reached by a click are two different artifacts, and a Suspense boundary can cover one without covering the other.
- Assertions after the `instant()` scope are not optional. Without them, a test that only checks "the skeleton is visible" would pass on a page that never loads at all.
- A regression test earns its place by being shown to fail. One of the two probes here did not, and that is what revealed the component cache sits on top of an already-cached read.
- `next start` is the wrong place to evaluate `generateStaticParams`: its `use cache` store does not survive a restart, so build-time prerendering has nothing to hand off to.
