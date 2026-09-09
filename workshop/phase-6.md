# Phase 6: Partial prefetching and instant navigations

Branch `workshop/phase-6`. Phase 4 taught the app what to cache and phase 5 taught it what to do when the cache misses because the catalog is down. This phase is about the other half of a fast navigation: not how quickly the server can answer, but how much of the answer the browser already has when you click.

## The before state

`cacheComponents` has been on since phase 4, so a `<Link>` already prefetched the destination's cached render rather than a blocking server render. What it did not do was share anything between links. Twenty-four category tiles on `/` meant twenty-four independent prefetch targets, which is why the home page carried this since February 2025 (`d22a1e0`, "disable prefetching catery pages from home page"):

```tsx
<Link href={`/category/${category.slug}`} prefetch={false}>
```

That was the only `prefetch` prop in the entire codebase. The rest of the app took the default.

The route table at the head of the branch, which is also the route table at the end of it — nothing this phase does changes a route's shape:

```
Route (app)             Revalidate  Expire
┌ ◐ /                          30d      1y
├ ◐ /_not-found
├ ◐ /account
├ ○ /api/hello/world
├ ƒ /api/og
├   /category/[slug]
│ └ ◐ /category/[slug]
├ ◐ /checkout
├ ◐ /login
├   /product/[slug]
│ └ ◐ /product/[slug]
└ ◐ /search
```

## Concepts

### The App Shell is one artifact per route, not per link

Before Partial Prefetching, a page with N visible links to N routes produced roughly N route prefetches as those links entered the viewport. With `partialPrefetching: true`, Next builds one **App Shell** per route and every `<Link>` pointing at that route reuses it. The shell holds the route's static output plus any cached content that does not depend on the URL; anything that does depend on the URL resolves after the navigation instead.

The docs compare it to per-route code splitting in a single-page app: one artifact per route, shared by every link that points to it. That analogy is the useful one, because it tells you what the shell can and cannot contain. `/category/beauty` and `/category/furniture` are the same route, so whatever the shell holds has to be true for both.

You can see the one-shell-per-route claim in the build output. `.next/server/app/` grows a `*.segments/` directory per route, each with a single `_full.segment.rsc`, and the dynamic routes get exactly one between them:

```
    4786  .next/server/app/_global-error.segments/_full.segment.rsc
   12933  .next/server/app/_not-found.segments/_full.segment.rsc
   18859  .next/server/app/account.segments/_full.segment.rsc
   14889  .next/server/app/category/[slug].segments/_full.segment.rsc
   19518  .next/server/app/checkout.segments/_full.segment.rsc
   43788  .next/server/app/index.segments/_full.segment.rsc
   16928  .next/server/app/login.segments/_full.segment.rsc
   14887  .next/server/app/product/[slug].segments/_full.segment.rsc
   16906  .next/server/app/search.segments/_full.segment.rsc
```

There is one `category/[slug]` entry, not twenty-four.

### URL data is `params` and `searchParams`, and nothing else

The distinction that governs everything here is which request-time reads are _URL data_. `params` and `searchParams` vary per link, so content behind them cannot go in a shell shared by every link to the route. `cookies()` and `headers()` do not: they vary per session, not per URL, so the framework detects a session-dependent shell, renders it per session and caches it per session on the client. Session content still gets to ride in the shell.

That is a genuinely counterintuitive result, and it is the thing worth remembering from this phase. `/account` reads `cookies()` three times over and is still shell-eligible. `/login` reads one `searchParams` key and is not — `?redirectTo=/checkout` and `?redirectTo=/account` are different URLs pointing at one shell.

### The Suspense boundary is now a shell boundary

Reading `params` or `searchParams` above a `<Suspense>` boundary ties the whole shell to one URL. Next surfaces this in development as the `instant-shell-url-data` insight, with fix cards offering either "wrap in or move into Suspense" or `export const instant = false` to opt the route out of validation. The fix is the same shape every time: keep the URL-independent parts outside the boundary and push the `params` read into a child inside it, passing the promise down rather than awaiting it at the top.

This reframes what a Suspense fallback is for. It used to be the thing you saw while the server finished. Now it is also the thing a `<Link>` hands you _before_ the click — the first paint of the route, not a flash between two renders. A fallback of `<div>Loading...</div>` was defensible when it appeared for 80 ms mid-stream. As the prefetched first paint of `/checkout`, it is the whole page.

### `loading.tsx` stopped being the only way

Nothing in this app uses `loading.tsx`, and after this phase that is a deliberate position rather than an oversight. `loading.tsx` wraps the entire page in one boundary. Placing `<Suspense>` by hand lets the shell keep the parts of the page that do not need the request — which is exactly what makes the shell worth prefetching.

## What changed

### The flag

```js
cacheComponents: true,
partialPrefetching: true,
```

`partialPrefetching` requires `cacheComponents`; without it, `next dev` and `next build` throw at config validation.

### `src/components/CategoryList.tsx`

`prefetch={false}` removed from the twenty-four category tiles. The opt-out was protecting against a cost that no longer exists.

### The link audit found nothing else

The adoption guide's main task is sweeping every `<Link prefetch={true}>` and deciding, per destination, how to preserve what the full prefetch used to deliver. This app has none. The only `prefetch` prop anywhere was the `false` above, so the audit was one line long.

### The URL-data audit also found nothing

Every page already reads `params` or `searchParams` inside a `<Suspense>` child rather than at the top:

| Route                        | Reads URL data | Where                                  |
| ---------------------------- | -------------- | -------------------------------------- |
| `/category/[slug]`           | `params`       | `CategoryContent`, inside `<Suspense>` |
| `/product/[slug]`            | `params`       | `ProductContent`, inside `<Suspense>`  |
| `/search`                    | `searchParams` | `SearchContent`, inside `<Suspense>`   |
| `/login`                     | `searchParams` | `LoginContent`, inside `<Suspense>`    |
| `/`, `/account`, `/checkout` | none           | —                                      |

That "sync root component, async child inside Suspense" pattern is in the original March 2025 article, written for streaming. It happens to be exactly the shape the `instant-shell-url-data` insight pushes you toward. Testing in `next dev` confirmed it: no insights, no runtime errors.

### The loading shells, which was the actual work

Four routes had a fallback that was fine as a mid-stream flash and wrong as a prefetched first paint. The fix in each case was not "add a bigger skeleton" but "move the URL-independent UI above the boundary so the shared shell can carry it" — the same move phase 5 made when it lifted the category heading out of the cached component.

- **`/checkout`** — `<h1>Checkout</h1>` was duplicated across all three branches of `CheckoutContent` (logged out, empty cart, real checkout). It says the same thing whatever the session does, so it moved up into the page. `CheckoutSkeleton` replaces `<div>Loading...</div>` and mirrors the two-column layout so the streamed content lands in the boxes already on screen.
- **`/account`** — `<h1>My Account</h1>` moved up, `AccountSkeleton` replaces `<div>Loading account...</div>`. Everything below the boundary reads request headers three ways over (`getUserInfos`, `getOrders`, `getLanguage`), so the boundary itself was in the right place; only its fallback was wrong.
- **`/login`** — the entire "Welcome Back" block is static copy. Only the form depends on `redirectTo`, so the copy moved into the page and the boundary now wraps the form alone, with a button-shaped fallback.
- **`/`** — `CategoryListSkeleton` replaces `<div>Loading...</div>`. Lowest stakes of the four, since `CategoryList` is `use cache` with `cacheLife("max")` and lands in the shell, but the fallback still shows on a cold cache.

The three headings are now in the prerendered shells, which is checkable:

```
$ for r in checkout account login; do grep -o "Checkout\|My Account\|Welcome Back" ".next/server/app/$r.html" | sort -u; done
Checkout
My Account
Welcome Back
```

## Measurements

### Removing `prefetch={false}` costs about 3.8 KB

Built the app, served it with `npm start`, and drove a browser through the home page with all twenty-four tiles in the viewport:

|                          | Requests | Bytes |
| ------------------------ | -------- | ----- |
| `/category/*` prefetches | 5        | 3778  |
| `/account` prefetch      | 2        | 2135  |

Four distinct slugs get prefetched (`beauty`, `fragrances`, `furniture`, `groceries`) at 615 B each, plus one larger 1310 B fetch for the first. The router never reaches the other nineteen links — it is not trying to prefetch everything in the viewport. Whatever the 2025 opt-out was avoiding, this is not it.

### Shell sizes grew, on purpose

Cost of putting real UI in the shells:

| Route       | Before | After |
| ----------- | ------ | ----- |
| `/checkout` | 16341  | 19518 |
| `/account`  | 16655  | 18859 |
| `/`         | 38498  | 43788 |
| `/login`    | 16391  | 16928 |

About 3 KB per route to replace `Loading...` with a page-shaped skeleton, in an artifact that is fetched once and shared by every link to the route. Worth it.

### Finding: the flag made no measurable difference to prefetch traffic

This is the measurement that did not work, and it is worth recording as a negative result rather than dressing up.

Built and served the app twice, once with `partialPrefetching: true` and once with `false`, and ran the identical browser script against the home page both times. The results were byte-identical: 5 requests, ~3778 B, per-slug URLs in both. No shared-shell endpoint appeared in the network panel, and no request shape changed.

Ruled out, in order:

- **Stale build.** `.next/required-server-files.json` reports the flag under `config.partialPrefetching`, and it read `true` and `false` at the right moments.
- **Flag not reaching the client.** A client chunk in `.next/static/chunks/` references `partialPrefetching` by name.
- **Prefetches inlined into the HTML rather than fetched.** `experimental.prefetchInlining` (`maxSize: 2048`, `maxBundleSize: 10240`) is on by default in 16.3 and would explain a low request count, but the served home page HTML contains no inlined prefetch payloads — only the four ordinary `__next_f` chunks.

So the shared-shell behaviour is real in the build output — there is exactly one `category/[slug]` segment artifact — but it is not observable from this app's network panel. The most likely reading is that at four prefetched links the router never reaches the point where sharing would pay, and this app is too small for the flag to show its value. That is a fine reason to keep the flag on and a bad reason to claim a win. If this is ever re-run, the `Next-Router-Prefetch` level is a sharper probe than byte counts: the flag should move the default link from `1` to `3` even when the payload sizes do not budge.

### What changed in the build

The route table is byte-identical, with the same revalidate and expire on every line. That is the expected result: `partialPrefetching` changes a client prefetch strategy, not a prerendering one. The `/api/og` prerender warning is still there, still waiting for phase 9.

`npm run build`, `npm run lint`, `npm run typecheck` and `npm run test:ci` all clean, 23 tests across 5 files.

## Going further: per-link prefetching with `prefetch={true}`

Everything above uses the default `<Link>`, which under [Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching) fetches the route's [App Shell](https://nextjs.org/docs/app/glossary#app-shell). This section explores the opt-in alternative documented in [Optimizing prefetching](https://nextjs.org/docs/app/guides/optimizing-prefetching). Nothing here is adopted — it was run to understand what the mechanism can do, and reverted.

### The difference

The App Shell holds the route's static output plus its session-specific content, but not [URL data](https://nextjs.org/docs/app/glossary#url-data) — [`params`](https://nextjs.org/docs/app/api-reference/file-conventions/page#params-optional) and [`searchParams`](https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional). That is precisely what lets one artifact serve every link to the route. [`prefetch={true}`](https://nextjs.org/docs/app/api-reference/components/link#prefetch) asks the server to run the prerender one step further: it resolves that link's URL data, advances through anything static or cached below it, and stops at the first uncached read. The result is the shell plus this URL's content, so the click paints the real page instead of a skeleton.

The catch is in the arithmetic, not the mechanism. The shell is keyed by route and reused; a `prefetch={true}` payload is keyed by URL and reused by nobody.

|         | App Shell (default)                         | `prefetch={true}`                         |
| ------- | ------------------------------------------- | ----------------------------------------- |
| Scope   | one per route                               | one per visible link                      |
| Content | route's rendered output minus per-link data | same, plus this URL's data resolved       |
| Cost    | bounded by route count                      | bounded by visible-link count             |
| Server  | served from the static cache                | a server invocation per prefetchable link |

Measured on a production build of this app, driving a browser through the home page and the category grid:

| Page                              | Default        | With `prefetch={true}` |
| --------------------------------- | -------------- | ---------------------- |
| `/` product cards (5 links)       | 5 req / 5241 B | 10 req / 43136 B       |
| Product titles present in payload | 0 of 5         | 5 of 5                 |
| `/` category tiles (24 links)     | 5 req / 3778 B | 24 req / ~270 KB       |

It does deliver the final page — that part is not theoretical. But the category grid pays roughly seventy times the bytes to save a skeleton flash on the one tile in twenty-four that gets clicked, and the docs name that exact case: "when many links to a route are visible at once, such as a grid of cards ... prefetch on intent instead."

Worth it when part of the tree depends on URL data, that part has a cache lifetime expressible with [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache) or [`use cache: private`](https://nextjs.org/docs/app/api-reference/directives/use-cache-private), and the traffic justifies the per-link invocation. Not worth it here: the shells already make navigation instant, and the URL-dependent part is the catalog fetch, which streams in behind Suspense either way. If this app ever wants it, the defensible place is one high-intent link — a checkout CTA — not a grid.

### The `Next-Router-Prefetch` header

Prefetch requests are ordinary RSC requests (`RSC: 1`) distinguished by a `Next-Router-Prefetch` level. The level is chosen from the link's fetch strategy in `next/dist/client/components/segment-cache/cache.js`:

| Header value | Fetch strategy    | What comes back                             | Sent when                                     |
| ------------ | ----------------- | ------------------------------------------- | --------------------------------------------- |
| _(absent)_   | `Full`            | the whole page                              | `prefetch={true}` without partial prefetching |
| `2`          | `PPRRuntime`      | App Shell **plus this URL's resolved data** | `prefetch={true}` with partial prefetching    |
| `3`          | `RuntimeShell`    | the App Shell                               | the default `<Link>` — this app               |
| `1`          | `LoadingBoundary` | layout down to the nearest `loading.js`     | the pre-Partial-Prefetching model             |

A separate `Next-Router-Segment-Prefetch: /_tree` request (~600 B) fetches the route tree only, which is the small first request in every measurement above.

Two things make these hard to read in DevTools. The `?_rsc=` query parameter is a cache-buster, not a discriminator — the level lives in the headers, so refetching the URL by hand returns the default. And the response body cannot be reopened at all: the router consumes the stream as it arrives, so Chrome has nothing buffered to re-serve and shows "Failed to load response data". The request metadata survives, so **right-click → Copy → Copy as cURL** replays it faithfully, headers included.

### What triggers a prefetch

There is a built-in observer, and it is viewport-based rather than cursor-based. `next/dist/client/components/links.js` creates a single `IntersectionObserver` shared by every `<Link>`, with `rootMargin: '200px'` — links are prefetched 200 px before they scroll into view. That is what holds the category grid to five requests instead of twenty-four.

Hover and touch are wired in too, but they only reprioritize. `onMouseEnter` and `onTouchStart` both call `onNavigationIntent`, which reschedules the queued task at `PrefetchPriority.Intent` (2, above `Default` 1 and `Background` 0). Hovering a default link gets you the App Shell _sooner_, never more of it. Escalating the strategy on hover exists as `experimental.dynamicOnHover` plus `<Link unstable_dynamicOnHover>`, off by default, and it upgrades to `Full` rather than to level 2 — noted, not adopted. Nothing in Next predicts cursor _trajectory_; the docs point at [ForesightJS](https://foresightjs.com/docs/integrations/nextjs) for that.

The documented stable way to gate on intent is a [hover-triggered prefetch](https://nextjs.org/docs/app/guides/prefetching#hover-triggered-prefetch) wrapper flipping `prefetch={active ? null : false}`, and it comes with a mobile caveat worth stating plainly: `onMouseEnter` never fires on a touch device, so that wrapper trades away the IntersectionObserver for a trigger that does not exist there. `onTouchStart` is the substitute and fires at the start of the tap, buying only the touch-to-click delay. The viewport observer is the only prefetch heuristic that works on mobile unchanged, which makes replacing it a regression.

## Key files

- [`next.config.mjs`](../next.config.mjs) — the flag, and the `cacheComponents` requirement
- [`src/components/CategoryList.tsx`](../src/components/CategoryList.tsx) — `prefetch={false}` removed, with the reasoning
- [`src/app/(checkout)/checkout/page.tsx`](<../src/app/(checkout)/checkout/page.tsx>) — heading hoisted out of three branches
- [`src/app/(shop)/account/page.tsx`](<../src/app/(shop)/account/page.tsx>) — session-only subtree, heading hoisted
- [`src/app/(shop)/login/page.tsx`](<../src/app/(shop)/login/page.tsx>) — the boundary narrowed to the form
- [`src/components/CheckoutSkeleton.tsx`](../src/components/CheckoutSkeleton.tsx), [`AccountSkeleton.tsx`](../src/components/AccountSkeleton.tsx), [`CategoryListSkeleton.tsx`](../src/components/CategoryListSkeleton.tsx) — the new shells

## Learning outcomes

- **One App Shell per route, not per link.** Twenty-four tiles pointing at `/category/[slug]` share one artifact, which is why a per-link prefetch opt-out written in 2025 is dead weight in 16.3.
- **`cookies()` and `headers()` do not disqualify a route from having a shell.** They vary per session, so the shell is rendered and cached per session. Only `params` and `searchParams` vary per link and have to stream in after the navigation.
- **The Suspense fallback is now the route's first paint.** It arrives before the click, not during the render, which promotes every `<div>Loading...</div>` from a 80 ms flash to the whole page.
- **The fix is hoisting, not skeletons.** Every improvement in this phase was moving URL-independent UI above the boundary so the shared shell could carry it. The skeletons are what is left over once you have done that.
- **The streaming-era component shape was already the instant-navigation shape.** "Sync root component, async child inside Suspense" was written in March 2025 for streaming and passed the 16.3 URL-data audit untouched.
- **`prefetch={true}` buys real content at a cost that does not amortize.** The App Shell is one artifact per route; a per-link prefetch is one server invocation per visible link, reused by nobody. It delivers the final page, which is exactly why a grid of cards is the worst place to ask for it.
- **The prefetch level is visible in the request.** `Next-Router-Prefetch: 3` is the shared shell, `2` is the shell plus one URL's data. Reading the header tells you which strategy a link actually used, which is more reliable than inferring it from payload size.
- **Prefetch triggering is viewport-based, not cursor-based.** A single shared `IntersectionObserver` with a 200 px margin does the work; hover and touch only reprioritize what is already queued. Any hover-gated wrapper is a desktop optimization that costs mobile the only heuristic it has.
- **A flag can be correct and unmeasurable.** The build output proves one shell per route; the network panel showed nothing. A demo app with four prefetched links is below the size where the strategy pays.
