# Phase 5: Error boundaries that can retry

Branch `workshop/phase-5`. Phase 4 taught the app to cache; this phase teaches it what to do when the thing it is caching does not answer. `dummyjson.com` going down is a real failure mode for this app, not a hypothetical, and until now two of the three places that read it swallowed the failure into a paragraph and the third had no handling at all.

## The before state

Three code paths read the catalog, and all three handled failure differently.

| Path | Reads | On failure before phase 5 |
|---|---|---|
| `/category/[slug]` | `getProductsByCategory` | `try/catch` rendered `Error loading products. Please try again later.`, scope downgraded to `cacheLife("seconds")` |
| `/search?q=` | `searchProducts` | `try/catch` rendered `Search is unavailable right now.`, scope downgraded to `cacheLife("seconds")` |
| `/product/[slug]`, `/checkout`, `/` | `getProduct`, `getCategories` | nothing — the throw reached Next's built-in 500 page |

There was no `error.tsx` anywhere in the tree. `MEMORY.md` recorded three `cacheLife("seconds")` failure branches carried over from phase 4; there were two.

The route table at the head of the branch, which is also the route table at the end of it — this phase changes no route's shape:

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

### `retry()` is not `reset()`

React error boundaries have always had a reset: clear the error state, render the children again. That works when the error came from the client — a bad prop, a null dereference in a `useEffect` — because rendering again with the same inputs can genuinely produce a different result once the state that caused it is gone.

It does nothing for a Server Component. The children of a route segment are not code the client can re-run; they are a payload the server produced. If that payload contains an errored row, re-rendering it produces the same errored row forever. `reset()` never asks the server for anything.

`retry()`, stable in 16.3 (`unstable_retry` in 16.2), asks the server for the segment again. The failed render actually runs a second time, and if it succeeds the fallback is replaced in place, inside a Transition, so Client Component state outside the boundary survives. That is why the two buttons this phase could have shipped are not equivalent, and why only `retry` is wired up.

### Why not a hand-rolled boundary

`notFound()` and `redirect()` are not return values. Both work by throwing a sentinel error that Next catches further up the tree. A plain `componentDidCatch` cannot tell that sentinel apart from a network failure, so it catches it and renders "something went wrong" where a 404 or a redirect should have happened.

`error.tsx` and `catchError` both re-throw those sentinels. This is the single strongest argument for using the framework's boundary rather than writing the six-line class yourself, and it is now covered by a test.

### Two boundaries, two scopes

`error.tsx` is scoped to a **route segment**. It wraps the `page.tsx`, the `loading.tsx`, the `not-found.tsx` and any nested `layout.tsx` below it — but never the `layout.tsx` sitting next to it in the same segment. That last part decides where the file goes: an `error.tsx` at `src/app/` would sit above `(shop)/layout.tsx` and take the header, the cart sheet and the footer down with the page. One directory lower, inside the route group, the chrome survives and only the page content is replaced.

`catchError` is scoped to a **subtree**. It returns a component you place anywhere, which is what lets the category heading stay on screen while only the product grid is replaced. It takes a fallback of the unusual shape `(props, errorInfo)` and hands back a component accepting those props plus `children`.

They compose: `catchError` handles what it wraps, and anything it does not wrap keeps bubbling to the nearest `error.tsx`.

### What a `use cache` scope does with a rejection

This is the question phase 4 left open. Phase 4 wrapped each read in a `try/catch` and gave the failure branch `cacheLife("seconds")`, reasoning that a failure rendered as a return value is a cacheable value and must not be cached for an hour.

The reasoning was right and the premise is what changes here. A `catch` that returns JSX turns a failure into a successful render — of course that gets cached. Let the error throw instead and there is no value to store: **a `use cache` scope that rejects writes no entry at all**. There is no failure lifetime left to choose, because there is no failure entry. Measured below.

## What changed

### `src/components/RouteError.tsx` and the two `error.tsx` files

One shared client component behind `src/app/(shop)/error.tsx` and `src/app/(checkout)/error.tsx`. Both are inside their route group so the chrome survives. Error boundaries must be Client Components — React needs `getDerivedStateFromError` on the client and the retry button is an event handler — so the fallback for a Server Component failure is itself a Client Component.

`(checkout)/error.tsx` closes a real gap rather than improving an existing message. `/checkout` reads the cart from a cookie and then calls `getProduct` for every line with no handling anywhere in the path, so before this phase a catalog outage there fell through to Next's built-in 500 page.

The fallback prints `error.digest` when there is one. In production `error.message` is a generic string by design, to avoid leaking server detail to the client, and the digest is the hash that matches the real message in the server log. Printing it is the only thing that makes a production report actionable.

### `src/components/CatalogErrorBoundary.tsx`

The `catchError` boundary, used in three places with a different `label` each time: the category grid, the search results, and the homepage category list. Only `retry` is exposed; `reset` is deliberately absent, for the reason above.

### The three read sites

`CategoryProducts` and `SearchResultsFor` lost their `try/catch` and their `cacheLife("seconds")` branch. Both now declare `cacheLife("hours")` once at the top of the scope, which is the ordinary shape, and let the read throw.

The category heading moved up out of the cached component into `CategoryContent`. It is pure string work on a slug already in hand — no I/O, cheaper to render than to look up in a cache — and keeping it outside the boundary is the entire point of a component-level fallback: during an outage the visitor still sees which category they asked for.

## Measurements

A throwaway probe injected the fault, reverted before commit: an `existsSync("/tmp/fakeshop-fault")` check inside each cached function in `src/lib/catalog.ts`, so the outage could be switched on and off against a running production server without a rebuild. Nothing shipped for this.

### A rejected `use cache` scope is not cached

Fault on, two requests to `/category/beauty`, then fault off and two more:

| Request | Fault | `!! FAULT` logged | `> getProductsByCategory` logged |
|---|---|---|---|
| 1 | on | yes | — |
| 2 | on | **yes** | — |
| 3 | off | — | yes |
| 4 | off | — | **no** |

Request 2 re-ran the cached scope and hit the network again: the rejection from request 1 was never written. Request 4 did not: the success from request 3 was. A `use cache` scope caches values and only values, which is exactly what makes the phase-4 failure branch unnecessary once the failure is a throw rather than a return.

### `retry()` versus `reset()`, measured in the browser

Both buttons were rendered side by side in a throwaway build, with the fault cleared first so a working retry would definitely succeed:

| Button | `fetch` calls | Boundary after | Products |
|---|---|---|---|
| `reset()` | **0** | still errored | 0 |
| `retry()` | `/category/smartphones?_rsc=1ZONHGKMR9hPBNFX` | recovered | 10 |

`reset()` made no network request at all and re-rendered the same errored payload. `retry()` issued one RSC request, and the server log showed the Server Component running again — `* CategoryPage { slug: 'smartphones' }` followed by `> getProductsByCategory` — with the grid swapping into place without a navigation.

### The component-level boundary keeps the page

`/category/groceries` with the fault on: `<h1>` renders `Groceries`, the `role="alert"` fallback sits where the grid was, zero product links. The route-level boundary is coarser by design — `/product/iphone-6-122` with the fault on replaces the whole page body with `This page could not be loaded … Reference: 2377060459`, while the header, the cart button and the footer stay, and that digest matches the one in the server log.

### Finding: an error boundary never rescues a prerender

Building with `getCategories` faulted does not bake the error UI into the static shell of `/`. The build fails:

```
Error occurred prerendering page "/". Read more: https://nextjs.org/docs/messages/prerender-error
Error: API request failed: injected fault (getCategories)
Export encountered an error on /(shop)/page: /, exiting the build.
⨯ Next.js build worker exited with code: 1 and signal: null
```

Wrapping `CategoryList` in the `catchError` boundary does not change this — same failure, same exit code. Both boundaries are strictly request-time UI. This is the reassuring answer: there is no way for a transient outage during a deploy to end up as a 30-day-cached "Categories could not be loaded" page, because the deploy fails instead and Vercel keeps the previous build live.

It also means the homepage boundary is the least likely of the three to ever fire. `/` prerenders its category list at build time, so the boundary only matters once the 30d entry expires and the background regeneration is what fails.

### Finding: the fallback is client-rendered, so it needs JavaScript

The fallback markup is not in the HTML. The server streams an errored row and lets the client boundary render the UI. The tail of a failing `/category/skin-care` response, after the `<h1>` and the boundary's client reference:

```
26:[["$","h1",null,{...,"children":"Skin Care"}]...]
...
2f:E{"digest":"2660648470"}
```

`2f` is the boundary's children, and `E{...}` is React's errored-row marker carrying nothing but the digest. There is no `role="alert"`, no `Try again`, no message anywhere in the response. Because `/category/[slug]` is a partial prerender, the shell has already flushed by the time the read fails, so there is no server pass left that could render a fallback into HTML.

With JavaScript off, a visitor during a catalog outage sees the loading skeleton and nothing else. Phase 4's `try/catch` server-rendered a readable paragraph, so this is a real regression on the progressive-enhancement axis the original article cares about — accepted deliberately, because the alternative is to go back to caching an error as a value and to give up `retry()`, which is what the phase is for. The failure mode is a catalog outage seen by a no-JS visitor, and that intersection is narrow.

A measurement trap on the way to this: the `label` string *does* appear in the HTML of a perfectly healthy page. It is a prop of a Client Component, so it is serialized into the flight data whether or not the boundary ever renders. Grepping the response for the fallback text finds it on success too. Grep for `role="alert"` instead.

### Finding: `notFound()` and `redirect()` survive the boundary, and a hand-rolled one eats them

A probe made `CategoryProducts` — inside both the `use cache` scope and the `catchError` boundary — call each signal:

- `notFound()` rendered the app's own `src/app/not-found.tsx`, `404 - Page Not Found`, with no fallback in sight. HTTP status is 200 because the shell was prerendered.
- `redirect("/")` landed on the homepage, `<h1>Welcome to FakeShop</h1>`, no `role="alert"` anywhere.

The contrast is what makes it worth knowing. A six-line `componentDidCatch` class in the same position renders its fallback for `notFound()` — verified with a control test before deleting it — turning a 404 into an error screen.

### Finding: `ErrorInfo["error"]` is typed `unknown`

The documented `catchError` example reads `error.message` straight off the fallback's second argument. That does not compile: the shipped type is `{ error: unknown; reset: () => void; retry: () => void }`. `error.tsx` is the one that gets `Error & { digest?: string }`, because Next generates the types for the file convention itself. The fallback narrows with `error instanceof Error` before touching `.message`.

## What changed in the build

Nothing. Route table byte-identical, same revalidate and expire on every line, `npm run build`, `npm run lint`, `npm run typecheck` and `npm run test:ci` all clean. 23 tests across 5 files, up from 17 across 3.

## Key files

- [`src/components/CatalogErrorBoundary.tsx`](../src/components/CatalogErrorBoundary.tsx) — the `catchError` subtree boundary
- [`src/components/RouteError.tsx`](../src/components/RouteError.tsx) — the shared route-level fallback
- [`src/app/(shop)/error.tsx`](<../src/app/(shop)/error.tsx>) and [`src/app/(checkout)/error.tsx`](<../src/app/(checkout)/error.tsx>) — one per route group, inside the group so the chrome survives
- [`src/app/(shop)/category/[slug]/page.tsx`](<../src/app/(shop)/category/[slug]/page.tsx>) — heading out of the cached scope, `try/catch` gone
- [`src/components/SearchResults.tsx`](../src/components/SearchResults.tsx) — same treatment
- [`src/components/__tests__/CatalogErrorBoundary.test.tsx`](../src/components/__tests__/CatalogErrorBoundary.test.tsx) — including the `notFound()`/`redirect()` pass-through

## Learning outcomes

- **`reset()` cannot fix a Server Component.** It clears client state and re-renders a payload the client already has. `retry()` asks the server to run the render again. Measured: zero network requests versus one.
- **A `use cache` scope caches values, not rejections.** Letting a read throw is what removes the need for a short failure lifetime, because there is no failure entry to expire.
- **Put `error.tsx` inside the route group, not at `src/app/`.** A boundary never wraps the layout beside it, so one directory decides whether the header and footer survive the error.
- **A boundary is request-time UI and never rescues a prerender.** A build-time catalog outage fails the build, which is the outcome you want.
- **The fallback needs JavaScript.** The server sends an errored RSC row carrying only a digest; the client renders the UI. A partial-prerendered route has already flushed its shell, so nothing can server-render the fallback.
- **Use the framework's boundary, not a class you wrote.** `notFound()` and `redirect()` are thrown sentinels, and a hand-rolled `componentDidCatch` swallows them.
- **Print `error.digest`.** It is the only link between what the user saw and what the server logged, because production strips the message.
