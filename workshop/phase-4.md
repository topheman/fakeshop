# Phase 4: Cache Components properly

The plan for this phase said "move `src/lib/api.ts` from `fetch(cache: "force-cache")` to `use cache` scopes with `cacheLife` profiles and `cacheTag` keys, then wire the cart and order mutations in `src/actions/` to invalidate the right tags." The first half is what shipped. The second half turned out to rest on a false premise, which is written up under [Nothing to invalidate](#nothing-to-invalidate).

What shipped: a new `src/lib/catalog.ts` cached read layer over the now-uncached `src/lib/api.ts` transport, `use cache` moved up from the data reads to the components that render them, an explicit `cacheLife` on every scope in the app including one that had been silently costing us, and four measured findings that are the actual content of this phase.

## The before state

Measured on the `workshop/phase-4` branch cut from `master` at `386d593`. Node 24.20.0, matching `.nvmrc` and CI, clean tree. Cold build 4.48s real / 14.74s user.

```
Route (app)             Revalidate  Expire
┌ ◐ /                          15m      1y
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

Every data read went through one function, and every one of them was cached the Next 15 way:

```ts
const res = await fetch(`${BASE_URL}${endpoint}`, {
  /**
   * The data is static, so we can cache it indefinitely.
   * ...
   * This is a nextjs specific option.
   */
  cache: "force-cache",
  ...options,
});
```

The more interesting part of the before state is what `next start` did on a second request to the same URL. This is the measurement the rest of the phase is judged against — two identical passes over three routes, with the cumulative server log after each:

```
### after pass 1:
* Home
  > getCategories
* CategoryPage { slug: 'beauty' }
  > getProductsByCategory { category: 'beauty', limit: 10, skip: 0 }
* ProductPage { slug: 'essence-mascara-lash-princess-1' }
  > getProduct { id: 1 }
  > searchProducts { query: 'phone', limit: 5 }
### after pass 2:
  ... everything above, then:
* CategoryPage { slug: 'beauty' }
  > getProductsByCategory { category: 'beauty', limit: 10, skip: 0 }
* ProductPage { slug: 'essence-mascara-lash-princess-1' }
  > getProduct { id: 1 }
  > searchProducts { query: 'phone', limit: 5 }
```

Every data function ran again on the second request. `force-cache` was doing its job — the HTTP round trip to dummyjson was served from the fetch Data Cache — but that is all it was saving. The function body, the JSON parse, and the entire React render of the product grid happened again for a visitor asking for a page we had already built once.

That gap is what `use cache` closes, and it is why the phase moves the directive up from the fetch to the component.

## Concepts

### What a cache key is made of, and what it is not made of

A `use cache` entry's key is a serialized version of its inputs: the build ID, a hash of the function's location and signature, and the serializable arguments. Two things follow that are worth internalising.

**A deploy invalidates everything.** The build ID is part of the key, so there is no such thing as a `use cache` entry surviving a deployment. This is the main behavioural difference from the fetch Data Cache, which persists across deploys and across serverless instances. Anything that must survive a deploy needs `use cache: remote` or a cache handler.

**Closed-over variables become arguments.** A cached function that references something from an outer scope has that value captured and folded into its key. This is why a cached scope can be defined inside a component and still be keyed correctly per instance — and also why it is easy to accidentally widen a key by closing over something you did not think about.

### Where the boundary goes

The rule is short: a cached scope cannot read `cookies()`, `headers()`, `searchParams` or `params`, and the restriction follows the call stack, so a helper it calls that reads one of those fails the same way. The pattern is to read the runtime value *outside* the cached scope and pass it in as an argument.

That single rule determines the whole shape of this phase's diff. Every dynamic page in the app now has two components where it used to have one:

```
CategoryPage           sync, renders the Suspense boundary
└─ CategoryContent     awaits params ← the boundary. Uncached, runs every request.
   └─ CategoryProducts "use cache" ← a pure function of `slug`. Cached.
```

`CategoryContent` exists only to turn a request-time `Promise<{slug}>` into a plain string. Everything below it is deterministic given that string, so everything below it caches. You can see the boundary in the server log: `* CategoryPage` still prints on every request, and nothing under it does.

### `cacheLife` describes the data, not the fixture

The preset profiles are `seconds`, `minutes`, `hours`, `days`, `weeks`, `max`, plus `default`. Each carries three numbers:

| Profile | `stale` (client) | `revalidate` (server) | `expire` |
| --- | --- | --- | --- |
| `default` | 5 minutes | 15 minutes | never |
| `seconds` | 30 seconds | 1 second | 1 minute |
| `hours` | 5 minutes | 1 hour | 1 day |
| `max` | 5 minutes | 30 days | 1 year |

Two of these thresholds change *where* content can be served from rather than just how long it lives: a `revalidate` of 0 or an `expire` under 5 minutes drops the content out of prerenders entirely, and a `stale` under 30 seconds does the same because a prefetch would expire before anyone could click the link. Of the presets only `seconds` crosses either line. That makes `seconds` the tool for "cache this, but never bake it into a shell" — which is exactly what the error branches in this phase use it for.

The profiles in `src/lib/catalog.ts` describe the shape of an e-commerce catalog, not the fixture behind it. dummyjson never changes, so `max` everywhere would be truthful for *this app*; `hours` on product data is truthful for the kind of app this is demonstrating. Categories get `max` because a category list changes when someone restructures the shop, which in practice is a deploy — and a deploy drops every entry anyway.

### Tags and the two invalidation verbs

`cacheTag` attaches strings to an entry. Two functions consume them, and the difference is about who is waiting:

- `updateTag` — read-your-own-writes. A user submitted a form, and the very next read must reflect it. Server Functions only.
- `revalidateTag` — stale-while-revalidate is acceptable, or you are in a Route Handler where `updateTag` is not available.

Both are unregistered strings. Nothing validates that a tag you revalidate is one that any entry actually carries.

## What changed

### The module split, which the compiler chose for us

The first attempt was the obvious one: put `"use cache"` and `cacheTag` directly into `src/lib/api.ts`. The build refused:

```
./src/lib/api.ts:1:21
Error: You're importing a module that depends on "cacheTag". This API is only
available in Server Components in the App Router, but you are using it in the
Pages Router.

Import traces:
  Client Component Browser:
    ./src/lib/api.ts [Client Component Browser]
    ./src/hooks/products.ts [Client Component Browser]
    ./src/components/Cart.tsx [Client Component Browser]
```

The error text mentions the Pages Router, which this app does not have; ignore it and read the import trace, which is exact. `src/lib/api.ts` is isomorphic. TanStack Query calls `getProduct` and `searchProducts` from the browser through `src/hooks/products.ts`, so the module lands in the client bundle, and a client bundle cannot contain `next/cache`.

So the caching moved into a new module, `src/lib/catalog.ts`, and the two layers now have distinct jobs:

- `src/lib/api.ts` — the transport. Isomorphic. Types, `BASE_URL`, `fetchApi`, and the raw fetchers. No caching of any kind.
- `src/lib/catalog.ts` — the cached read layer. Server only. Every export is a `use cache` scope with an explicit `cacheLife` and `cacheTag`.

Worth noting that this needs no `server-only` package. The `next/cache` import *is* the guard: the build fails the moment this module reaches a client bundle, which is precisely the protection `server-only` would buy.

One incidental finding from the grep that mapped the call sites: `getProducts` has no server-side caller at all. It is used only by `useProducts` in the browser. It has no cached wrapper for that reason.

### `use cache` moved from the reads to the components

Caching `getProduct` saves a fetch. Caching the component that renders it saves the fetch *and* the render. Four components gained the directive: `CategoryProducts`, `ProductDetail`, `CategoryList`, and `SearchResultsFor`.

The component entries carry the same tags as the data functions underneath them, and that is not decorative. Nesting cached scopes means the outer entry holds the *complete output* including everything the inner one returned, and an outer scope with an explicit `cacheLife` never re-reads the inner one until its own entry goes. Tag only the data function and an invalidation drops the JSON while the component keeps serving markup built from it.

`ProductDetail` renders `AddToCartButton`, a Client Component, from inside a cached scope. That is fine and worth understanding: a cached scope stores the *reference* to a client component, not its behaviour. The button stays interactive.

### The error branches

Three components had a `try`/`catch` that rendered a fallback. Caching them unchanged would have meant caching a failure for an hour, so each catch now sets its own lifetime:

```tsx
} catch (error) {
  console.error("Error fetching category products:", error);
  cacheLife("seconds");
  return <p className="mt-4">Error loading products. Please try again later.</p>;
}
cacheLife("hours");
```

Calling `cacheLife` in different control-flow branches is explicitly sanctioned as long as exactly one runs per invocation — the docs' own example gives a missing post `minutes` and a published one `days`. `seconds` here means a failed read is retried within a minute and never reaches a prerender.

`SearchResults` needed a real fix rather than a lifetime. Its catch left `results` as `[]` and fell through to *"No products found for X"*, so a network blip rendered as a confident, wrong, empty result set. Harmless while nothing was cached. Caching it for an hour would have turned a blip into a lie, so the error branch now says so explicitly. This is a behaviour change, and it is one phase 4 forced rather than chose.

### Nothing to invalidate

The plan's second half — wire cart and order mutations to invalidate tags — does not apply to this codebase. The cart, the orders and the user info live entirely in cookies, read and written by `src/actions/session.ts`. There is no server-side cache of any of it, so there is nothing for `updateTag` to invalidate after `updateCart` or `order`. A call there would be decoration that misleads the next reader about what is cached.

The only cached data in the app is the dummyjson catalog, and dummyjson is a read-only fixture that no mutation in this app touches. So the tags — `categories`, `products`, `product:${id}`, `category:${slug}` — are declared with no caller. That is deliberate: tags cost nothing, they are the correct vocabulary to declare, and the surface is there the day a real backend exists.

A guarded webhook route was considered and rejected. In a real shop it is the right shape — a PIM or CMS `POST`s to `/api/revalidate` when a product changes, and the handler calls `revalidateTag`. Here it would be a public endpoint plus a deployment secret to demonstrate an invalidation that hands back byte-identical data. The instructive half of it — proving that tag invalidation actually reaches a `use cache` entry — was obtained from a throwaway probe instead, below.

## Measurements

### `getCategories` at build time, and the second prerender of `/`

The baseline build log ran `getCategories` twice, because `/` is prerendered more than once and the fetch Data Cache does not survive between workers:

```
* Home
  CategoryList
  > getCategories
  ...
* Home
  CategoryList
  > getCategories
```

With `getCategories` cached but `CategoryList` not yet, the second `getCategories` disappeared. With `CategoryList` cached too, the whole subtree did:

```
* Home
  CategoryList
  CustomQRCode
  > generateQRCode { url: 'https://thefakeshop.vercel.app/' }
  > getCategories
...
* Home
```

The second prerender of `/` now renders nothing but the page shell. Everything below it was already in the cache.

### The second request, which is the point of the phase

Same two-pass measurement as [the before state](#the-before-state), against the shipped tree:

```
### after pass 1:
* Home
* Home
* CategoryPage { slug: 'beauty' }
  > getProductsByCategory { category: 'beauty', limit: 10, skip: 0 }
* ProductPage { slug: 'essence-mascara-lash-princess-1' }
  > getProduct { id: 1 }
  > searchProducts { query: 'phone', limit: 5 }
* LoginPage { redirectTo: undefined }
### after pass 2:
  ... everything above, then:
* CategoryPage { slug: 'beauty' }
* ProductPage { slug: 'essence-mascara-lash-princess-1' }
```

Pass 2 adds two lines, and both of them are the uncached boundaries that read `params`. No data function ran. No component re-rendered. `/search?q=phone` logged nothing at all, because `SearchResultsFor` is keyed on the query string and `phone` was already warm.

That is the whole phase in six lines of log.

### Finding: a default parameter value inside a `use cache` scope creates a second entry

Cache keys are built from the arguments *as passed*, before parameter defaults are applied. A probe, built and run during the build's static generation pass:

```ts
export async function withDefaults(a: string, limit = 10, skip = 0) {
  "use cache";
  cacheLife("max");
  console.log(`  PROBE withDefaults ran #${++n}`, { a, limit, skip });
  return { a, limit, skip };
}
```

called three times from `/`:

```tsx
await withDefaults("x");
await withDefaults("x", 10, 0);
await withDefaults("x");
```

```
  PROBE withDefaults ran #1 { a: 'x', limit: 10, skip: 0 }
  PROBE withDefaults ran #2 { a: 'x', limit: 10, skip: 0 }
```

Two runs for three calls. The third call hit the entry the first one filled, and the second call — with arguments that resolve identically — got its own entry.

Hence the shape of `src/lib/catalog.ts`: the exported function carries the defaults and is *not* cached, and it delegates to a private cached function whose parameters are all required.

```ts
export function getProductsByCategory(category: string, limit = 10, skip = 0) {
  return cachedProductsByCategory(category, limit, skip);
}

async function cachedProductsByCategory(category: string, limit: number, skip: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `category:${category}`);
  return api.getProductsByCategory(category, limit, skip);
}
```

### Finding: `force-cache` under `use cache` silently defeats `revalidateTag`

The docs say the fetch Data Cache "keeps working as a separate layer". The consequence is not spelled out, so this was measured with three throwaway route handlers.

`/api/zprobe/now` returns a fresh timestamp, kept out of the build-time prerender by reading `headers()`:

```ts
import { headers } from "next/headers";

export async function GET() {
  await headers();
  return Response.json({ now: Date.now() });
}
```

`/api/zprobe/read` reads it twice through two identically tagged `use cache` scopes that differ only in the fetch option:

```ts
async function withForceCache() {
  "use cache";
  cacheLife("max");
  cacheTag("probe");
  const res = await fetch("http://localhost:3000/api/zprobe/now", { cache: "force-cache" });
  return res.json();
}

async function withoutForceCache() {
  "use cache";
  cacheLife("max");
  cacheTag("probe");
  const res = await fetch("http://localhost:3000/api/zprobe/now");
  return res.json();
}

export async function GET() {
  await headers(); // keep this route out of the build-time prerender
  return Response.json({ forced: await withForceCache(), plain: await withoutForceCache() });
}
```

`/api/zprobe/bust` calls `revalidateTag("probe")`. Against `next start`:

```
read #1: {"forced":{"now":1788610471665},"plain":{"now":1788610471672}}
read #2: {"forced":{"now":1788610471665},"plain":{"now":1788610471672}}
--- revalidateTag('probe') ---
read #3: {"forced":{"now":1788610471665},"plain":{"now":1788610471699}}
read #4: {"forced":{"now":1788610471665},"plain":{"now":1788610471699}}
```

`plain` moved from `…672` to `…699`. `forced` did not move at all. In both cases the tag invalidation worked and the `use cache` entry was dropped and the function re-ran — but the `force-cache` fetch inside the re-run came straight back from the untagged Data Cache underneath, so the caller received the same stale value with no error and no warning.

That is why `src/lib/api.ts` has no `cache` option any more. Two caching layers where the outer one is tagged and the inner one is not gives you an invalidation that appears to succeed and changes nothing.

(An aside from building the probe: the first attempt used `src/app/api/__probe/`, which 404s. A directory whose name starts with `_` is a *private folder* and is excluded from routing. And `export const dynamic = "force-dynamic"` is rejected outright under Cache Components — route segment configs are what `use cache` and `cacheLife` replace.)

### Finding: one un-lifetimed `use cache` was pinning the homepage to 15 minutes

`/` reported `Revalidate 15m` in the baseline, and it kept reporting it after the whole catalog moved to `cacheLife("max")`. The cause was already in the repo, written for the original article:

```tsx
export async function CustomQRCode({ payload }: CustomQRCodeProps) {
  "use cache";
  console.log("  CustomQRCode");
  const qrCodeDataUrl = await generateQRCode(payload);
```

A `use cache` with no `cacheLife` takes the `default` profile: 15 minutes revalidate. A route's revalidate is the shortest lifetime among the content it prerenders. So a QR code of a hardcoded, unchanging URL was setting the refresh interval for the entire homepage.

Adding `cacheLife("max")` to that one component:

```
- ┌ ◐ /                          15m      1y
+ ┌ ◐ /                          30d      1y
```

This is the concrete reason behind the docs' recommendation to set `cacheLife` in every `use cache` scope. An implicit lifetime is not local — it leaks upward into every route that renders the component.

## What changed in the build

The route table is unchanged in shape. One number moved:

```
  Route (app)             Revalidate  Expire
- ┌ ◐ /                          15m      1y
+ ┌ ◐ /                          30d      1y
```

`/category/[slug]` and `/product/[slug]` still list no revalidate, because their data is still read at request time behind the `params` boundary. Caching the render does not prerender it — prerendering instances of a dynamic route needs `generateStaticParams`, which is phase 7's business.

Cold build 4.48s → 3.92s real, 14.74s → 15.07s user. The wall-clock difference is within the noise of a build this size; the user CPU is flat. This phase is not a build-time optimisation and should not be read as one — its effect is on the second request, not the first.

`npm run typecheck`, `npm run lint` and `npm run test:ci` (15 tests) all pass. No new dependency.

## Key files

- [`src/lib/catalog.ts`](../src/lib/catalog.ts) — new. The cached read layer. The comment at the top explains why it exists rather than living in `api.ts`.
- [`src/lib/api.ts`](../src/lib/api.ts) — now purely transport, no `cache` option.
- [`src/app/(shop)/category/[slug]/page.tsx`](<../src/app/(shop)/category/[slug]/page.tsx>) and [`src/app/(shop)/product/[slug]/page.tsx`](<../src/app/(shop)/product/[slug]/page.tsx>) — the params boundary, split into an uncached reader and a cached renderer.
- [`src/components/SearchResults.tsx`](../src/components/SearchResults.tsx) — runtime data passed in as an argument, plus the error-branch fix.
- [`src/components/CustomQRCode.tsx`](../src/components/CustomQRCode.tsx) — one line, 15 minutes to 30 days on `/`.

## Learning outcomes

- **The directive belongs on the component, not only on the fetch.** `force-cache` saved a round trip. `use cache` on the component saved the round trip, the parse and the render, and the second request to a warm page now runs nothing but the `params` read.
- **A runtime read is a boundary, and the fix is always the same**: read it outside, pass the value in. Every dynamic page in this app now has a thin uncached component whose only job is to await `params`.
- **Never omit `cacheLife`.** An implicit lifetime leaks upward into the revalidate of every route that renders the scope, and `CustomQRCode` had been doing that since the app was written.
- **Do not stack the fetch Data Cache under a `use cache` scope.** Measured: `revalidateTag` drops the outer entry, the function re-runs, and `force-cache` hands back the stale value anyway.
- **Cache keys use arguments as passed.** Defaults belong in an uncached wrapper in front of the cached function.
- **Do not cache a failure at the same lifetime as a success.** Branch the `cacheLife`; `seconds` keeps an error out of prerenders and retries within the minute.
- **A plan item can be wrong about the codebase.** Cart and orders are cookies. There was no tag to invalidate, and inventing one would have taught the wrong thing.
