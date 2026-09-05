# Phase 3: Middleware becomes proxy

The plan for this phase said "rename `src/middleware.ts` to `src/proxy.ts` and revisit what belongs there; the cookie seeding is the question, not the rename." The rename took one command and thirty seconds. Revisiting what belonged there ended with the file deleted, which is the honest answer to what Next 16 is actually telling us.

What shipped: the codemod rename in one commit, then the removal of the whole proxy in another, with the behaviour it was providing moved into `src/actions/session.ts` where it belongs, plus two bugs the seeding had been hiding.

## The before state

Measured on the `workshop/phase-3` branch cut from `master` at `fb4b4a8`. Node 24.20.0, matching `.nvmrc` and CI, clean tree.

```
▲ Next.js 16.3.4 (Turbopack)
- Cache Components enabled

⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.

  To migrate automatically, run:
  npx @next/codemod@canary middleware-to-proxy .

  Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

And at the bottom of the route table, one line that this phase makes disappear:

```
ƒ Proxy (Middleware)
```

## Concepts

### The rename is cosmetic, the message behind it is not

Next 16 renamed the `middleware` file convention to `proxy`. The functionality is identical — same `NextRequest`, same `NextResponse`, same `config.matcher`, same position in the routing chain. Only the file name and the exported function name changed.

The reasoning, which the bundled docs at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` state plainly, is that the word "middleware" reads as Express middleware — a composable request pipeline you hang application logic off — and people took the invitation. The new name describes what the feature actually is: a network hop *in front of* the app, which in optimized deployments runs on the CDN, outside the app's own runtime. The docs are blunt about the consequence: "this feature is recommended to be used as a last resort", "we recommend users avoid relying on Middleware unless no other options exist", and "you should not attempt relying on shared modules or globals."

Two behavioural changes came with 16.0 beyond the name. Proxy now defaults to the **Node.js runtime** where middleware defaulted to Edge, and setting `runtime` in the exported config object throws rather than being honoured. Neither affects this app, which never set a runtime.

### Where it sits in a request

Proxy is step 3 of the routing chain:

1. `headers` from `next.config.mjs`
2. `redirects` from `next.config.mjs`
3. **Proxy**
4. `beforeFiles` rewrites
5. Filesystem routes — `public/`, `_next/static/`, `app/`
6. `afterFiles` rewrites
7. Dynamic routes
8. `fallback` rewrites

Two things follow from that ordering, and both of them turned out to matter here.

First, the proxy runs **before the filesystem**, so `public/` is not excluded by anything the matcher didn't explicitly exclude. Our matcher was `/((?!api|_next/static|_next/image|favicon.ico).*)`, which names the two `_next` asset paths and `favicon.ico` and stops. There are sixteen files in `public/` and fifteen of them — every apple-touch icon, every placeholder image — ran the proxy and came back carrying two `Set-Cookie` headers.

Second, Server Functions are **not** separate routes in this chain. A Server Action is a POST to the route it is used on, so a matcher that excludes a path also silently removes proxy coverage from every Server Action on it. The docs call this out as a reason never to put authentication in a proxy: a later matcher tweak or a refactor that moves an action to another route removes the check with no error anywhere. This app has no auth in its proxy, but it is the single best argument for why the feature got renamed.

### What our proxy was actually for

The whole body was cookie seeding. If the incoming request had no `cart` cookie, set an empty one on the response; same for `orders`. Three things were wrong with it.

**The `orders` half was dead code.** `getOrders()` already returns `[]` when the cookie is absent. Nothing anywhere read that cookie in a way that required it to exist. It had been running on every request, including those fifteen images, to guarantee a condition nobody checked.

**The `cart` half did not help the request that performed the seeding.** This is the subtle one, and it falls straight out of the concept. A proxy writes to the *response*; `cookies()` during render reads the *request*. Those are two different objects, and the `Set-Cookie` header the proxy attaches does not retroactively appear in the request the page is already rendering. So on a visitor's very first request the app still saw no cart cookie. The arrangement only ever appeared to work because the first request a visitor makes is a page view and their add-to-cart is a later request, by which time the browser is sending the cookie back.

**It was a write on the read path.** A response carrying `Set-Cookie` is a response a shared cache should not store. This app spends phases 4 and 6 leaning hard on prerendered shells served from a CDN, and a proxy that unconditionally decorates every page response with two `Set-Cookie` headers is exactly the sort of thing that would have made those shells uncacheable for reasons nobody could find later.

### The guard it was propping up

What the seeding existed to satisfy was one line in `updateCart`:

```ts
const cart = await getCart();
if (cart) {
  const updatedCart = prepareCart({ cart, id, quantity });
  await setCart(updatedCart);
}
return cart;
```

With no cookie, `getCart()` returns `null`, the guard fails, and an add-to-cart is a silent no-op — no error, no write, nothing in the UI. The proxy was there so that the guard would always pass.

But "no cart cookie" means "empty cart", and that is a fact about this app's domain, not about its network. It belongs next to the code that reads the cookie. Once the default lives there, the proxy has nothing left to do and can be deleted, which is precisely the outcome the rename is trying to encourage.

## What changed

Two commits, deliberately, so the history shows both halves.

**`cb5bde2` — the rename.** `npx @next/codemod@canary middleware-to-proxy .` renamed the file and the exported function and touched nothing else: one insertion, one deletion, `export function middleware` to `export function proxy`. The deprecation warning is gone and the route table is byte-identical. The legend still prints `ƒ Proxy (Middleware)` — that string is hardcoded at `node_modules/next/dist/build/utils.js:499`, so it is cosmetic leftover, not a sign the rename didn't take.

**`369be3d` — the removal.** `src/proxy.ts` deleted, and `src/actions/session.ts` changed in three ways.

The default moved in:

```ts
/**
 * A visitor has no cart cookie until their first add to cart, and absent
 * means empty. Returns a fresh object every call because `prepareCart`
 * mutates the cart it is given — a shared constant would accumulate the
 * items of every visitor for as long as the server process lives.
 */
function emptyCart(): Cart {
  return { items: [] };
}

export async function updateCart({ id, quantity }): Promise<Cart> {
  const cart = (await getCart()) ?? emptyCart();
  const updatedCart = prepareCart({ cart, id, quantity });
  await setCart(updatedCart);
  return updatedCart;
}
```

The comment is the point of the function. `prepareCart` mutates the cart it is handed rather than returning a new one, so a module-level `const EMPTY_CART = { items: [] }` would be filled in by the first visitor to add something and handed, already populated, to the next visitor who arrives without a cookie. On a serverless deployment where processes are short-lived you might never notice; on a long-running Node server it is a cross-request data leak. This is the "do not rely on shared modules or globals" warning showing up in ordinary application code.

**`updateCart` was returning the wrong object, and it worked anyway.** The old body returned `cart`, the value it had *read*, not `updatedCart`. It was nonetheless correct, because `prepareCart` mutates in place and so `updatedCart === cart` — the same object under two names. `useUpdateOptimisticCart` in `src/hooks/cart.tsx` pushes that return value straight into `queryClient.setQueryData(["cart"], ...)`, so if `prepareCart` had ever been rewritten to return a new object — which is the obvious cleanup to make to it — the cart UI would have silently reverted to its pre-update state after every mutation. It now returns `updatedCart` explicitly and its type narrows from `Cart | null` to `Cart`.

**`setOrders` got its cookie attributes back.** The proxy seeded `orders` with `httpOnly`, `secure`, `sameSite: "strict"` and `maxAge`. `setOrders` overwrote it with none of them, so placing an order downgraded the cookie to a JS-readable session cookie that vanished when the browser closed. The seeding had been masking this by re-creating a protected cookie on the next page load. With the seed gone, `setOrders` is the only writer, so it now sets the attributes itself, matching `setCart`.

Also folded in: `COOKIE_MAX_AGE` in `src/utils/constants.ts` was commented "30 days" while computing one day, and the matcher comment in the renamed file still said "middleware".

## Tests

`src/actions/__tests__/session.test.ts` is new. It mocks `next/headers` with an in-memory `Map` standing in for the cookie store — enough `get`/`set`/`delete` for the session module, plus the options of the last write so cookie attributes can be asserted on.

Four tests, three of which fail against the old code, which was checked by temporarily restoring the old `updateCart` body and running the suite:

- adding an item works when the visitor has no cart cookie yet, which is the exact guarantee the proxy used to provide
- `updateCart` returns the updated cart rather than the one it read
- two visitors with no cart cookie do not see each other's items, which is the `emptyCart()`-as-a-function property
- `setOrders` writes the cookie with the same protections as the cart

## What changed in the build

The route table is unchanged except for the two lines that are now absent:

```diff
- ƒ Proxy (Middleware)
-
```

No deprecation warning, one fewer function deployed, and every request to `public/` now goes straight to the filesystem.

Two build warnings from phase 1's list of "survives on purpose" are down to one. The middleware deprecation is gone; the `/api/og` prerender warning stays for phase 9.

## Key files

- `src/actions/session.ts` — `emptyCart()`, `updateCart`, `setOrders`
- `src/actions/__tests__/session.test.ts` — the `next/headers` mock and the regression tests
- `src/hooks/cart.tsx` — `useUpdateOptimisticCart`, the consumer that depended on `updateCart`'s return value
- `src/utils/cart.ts` — `prepareCart`, the mutating function that both subtleties come back to
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — the reference, including the migration rationale

## Learning outcomes

- **Middleware became Proxy because the old name invited misuse.** The rename is free and mechanical; the intent behind it is that most middleware should not exist. Next's own guidance is "last resort".
- **A proxy writes to the response, the render reads the request.** Anything a proxy sets is invisible to the request that set it. That is enough to invalidate the whole "seed a default on the way in" pattern.
- **Proxy runs before the filesystem**, so `public/` is inside the matcher unless you exclude it by hand. Fifteen static images were paying for a cart cookie.
- **Server Actions inherit the matcher of the route they live on**, invisibly. Never put an authorization check in a proxy and consider the route protected.
- **`Set-Cookie` on a read is a caching hazard**, and this repo is about to depend on cached shells.
- **Defaults belong next to the reader, not in front of the app.** Moving one `?? emptyCart()` into the session module deleted an entire per-request function.
- **A mutating helper makes two unrelated things correct by accident.** `prepareCart` mutating in place is why returning the stale `cart` worked, and why a shared empty-cart constant would have leaked between visitors. Both were latent, and both are the kind of thing that only surfaces when someone makes the helper pure.
