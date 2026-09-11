# Phase 8: Navigation polish

Phases 6 and 7 made navigations commit in the first frame and then locked that down with tests. What they commit to is a skeleton. This phase is about the 400 ms that follow: making the jump from grid to product read as one continuous movement rather than two unrelated screens, using React's `<ViewTransition>` over the browser's View Transitions API.

It also produced the most interesting negative result of the workshop so far, which is that the architecture phases 6 and 7 built is partly at odds with the transition phase 8 wants. That tension, and why it is a real trade-off rather than a bug, is the centre of this document.

## Concepts

### What the browser gives you

`document.startViewTransition(cb)` is a browser API with a very physical model. When you call it, the browser:

1. Takes a **screenshot** of the current page.
2. Runs your callback, which mutates the DOM.
3. Takes a screenshot of the **new** page.
4. Builds a temporary pseudo-element tree on top of the real document, holding both screenshots.
5. Animates between them, then tears the tree down.

Everything you can style lives in that temporary tree:

```
::view-transition
└── ::view-transition-group(name)
    └── ::view-transition-image-pair(name)
        ├── ::view-transition-old(name)   ← the before screenshot
        └── ::view-transition-new(name)   ← the after screenshot
```

The default behaviour is a crossfade of the whole page, as one big group named `root`. It gets interesting when you give an element `view-transition-name: something`. That element is lifted out of the page screenshot into its own group, and if an element with the **same name** exists on both sides, the browser treats them as one object that moved: it animates the group's position and size from the old rectangle to the new one. That is a morph, and the browser does it without being told anything about the two elements beyond the shared name.

Two constraints fall directly out of this design and explain most of the work below. A name must be **unique per document at any moment** — two live elements sharing one name abort the transition. And the animation is over **screenshots**, so an element that has not painted anything yet contributes an empty rectangle.

### What React adds

React's `<ViewTransition>` is not a thin wrapper over `startViewTransition`. It exists because the browser API has no idea what a React tree is: you would have to know, before the DOM mutation, which elements are about to appear, disappear or persist. React already knows that from reconciliation, so it assigns the pseudo-element classes for you.

A `<ViewTransition>` takes up to five props, four of which are **triggers**. React picks exactly one per transition, based on what happened to that boundary in the commit:

| trigger   | fires when                                                                     |
| --------- | ------------------------------------------------------------------------------ |
| `enter`   | the boundary **mounted**, and nothing with the same `name` unmounted elsewhere |
| `exit`    | the boundary **unmounted**, and nothing with the same `name` mounted elsewhere |
| `share`   | it mounted **and** another with the same `name` unmounted elsewhere            |
| `update`  | it persisted, but its contents changed or a child resized                      |
| `default` | the catch-all for whichever of the four you did not set                        |

The important rule is the precedence: **`share` outranks `enter` and `exit`**. If a name matches across the commit, React calls it one object moving; only when nothing matches does it fall back to mount/unmount semantics. That single rule is the difference between the two commits in this phase — the product images are named and pair, the reveal wrappers are unnamed and cannot.

The **value** of a trigger is a view transition class, not an animation. `share="morph"` means "tag this transition `morph`", and the CSS is yours to write: `::view-transition-group(.morph)`. Two values are special, `"none"` and `"auto"`. A value may also be an object keyed by transition type, which is how `<Link transitionTypes>` picks between animations.

Two things about `<ViewTransition>` are easy to get wrong:

- **It never fires `enter` or `exit` in a `layout.tsx`.** A layout persists across navigations, so it is never mounted or unmounted. Wrappers that animate a navigation belong in `page.tsx`.
- **Only Transitions, `<Suspense>` and `useDeferredValue` activate it.** A plain `setState` will not. App Router navigations are Transitions, which is why `<Link>` works with no extra wiring.

### Which patterns fit this app

The guide Next bundles at `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` lists four patterns. Only two of them describe something FakeShop actually does:

| pattern              | fits here?                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| shared element morph | **yes** — every product page is reached by clicking that product's own thumbnail                      |
| Suspense reveal      | **yes** — phase 6 made a skeleton the first paint of every route, so there is a handoff on every page |
| directional slide    | not yet — needs `transitionTypes` on the links and a sense of forward/back the catalog does not have  |
| same-route crossfade | not yet — would apply to `/search` as results change                                                  |

This phase ships the first two.

## Implementation

### The morph: one name in three places

The morph needs the same `view-transition-name` on the grid thumbnail and on the product hero. A typo in either place does not error — it silently produces two unrelated groups and a crossfade. So the name is a function rather than a template literal at each site:

```ts
export function productImageTransitionName(id: number): string {
  return `product-image-${id}`;
}
```

It is called from three places: [`ProductGrid`](../src/components/ProductGrid.tsx), the product page's hero, and the loading shell. Every call site passes `share="morph"` and `default="none"` together, which is a pairing the docs warn about explicitly: `default` is the fallback for unset triggers, so `default="none"` **on its own** disables `share` too, and a named pair quietly stops morphing.

### The destination has not loaded yet

This is the question that shaped the whole commit. The morph animates towards the hero image. On the frame React commits the navigation, that hero is an `<img>` whose bytes are still in flight — an empty rectangle. The morph would fly the thumbnail into a blank box and pop the photo in afterwards.

The first thing to check was whether the bytes really are in flight. They are not, and the reason is local to this app: `next.config.mjs` sets `images.unoptimized: true`, so `next/image` emits **no `srcSet`** (`node_modules/next/dist/shared/lib/get-img-props.js:96`). The grid thumbnail and the hero request the byte-identical URL, so on a warm navigation the hero is a memory-cache hit and paints in the same frame. Turning image optimisation on would break this — the two would request different widths and the hero would be a fresh download.

That leaves the cold case, and for that the fix is `placeholder="blur"`:

```tsx
<Image
  src={product.thumbnail || "/placeholder.svg"}
  placeholder="blur"
  blurDataURL={IMAGE_BLUR_PLACEHOLDER}
  ...
/>
```

`next/image` renders `blurDataURL` as a CSS `backgroundImage` on the `<img>` itself and clears it on `blurComplete` (`get-img-props.js:519`). So the element paints **something** on its first frame, and the morph has a surface to land on. `IMAGE_BLUR_PLACEHOLDER` is a 1×1 PNG of the same grey as the `bg-gray-200` wrapper, inlined as a data URI so it costs no request.

This also fixed a latent bug from before the phase: `ProductGrid` and `ProductCardLoading` both passed `blurDataURL` with **no `placeholder` prop**, which `next/image` ignores outright. The blur everyone assumed was there had never rendered.

### The skeleton has to know which product it is

Phase 6's rule is that the App Shell must be param-independent — it is one artifact shared by every URL of the route, so nothing above the `<Suspense>` boundary may read `params`. But the morph's destination on a cold navigation **is** the shell, and it needs the product id to build the name.

[`ProductCardLoading`](../src/components/ProductCardLoading.tsx) resolves it the way it already resolved the product title: from `window.location` through `useSyncExternalStore`, on the client, after the shell has been served.

```tsx
const productId = useSyncExternalStore(
  subscribe,
  getClientProductId,
  getServerProductId,
);
```

The server snapshot is `null`, so the prerendered shell carries no name and stays one artifact for every product. The client snapshot reads the id out of the slug. `subscribe` is a no-op, because the URL cannot change while this fallback is on screen.

### The reveal

The second commit animates the other seam: the skeleton handing off to the content it was standing in for. [`Reveal.tsx`](../src/components/Reveal.tsx) is two wrappers used as a pair, one on the fallback and one on the children of the same `<Suspense>`:

```tsx
export function RevealFallback({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="slide-down" default="none">
      {children}
    </ViewTransition>
  );
}

export function RevealContent({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="slide-up" default="none">
      {children}
    </ViewTransition>
  );
}
```

They are unnamed on purpose. Nothing can pair with them, so the fallback's disappearance is a genuine unmount and the content's arrival a genuine mount, and the `exit`/`enter` triggers fire rather than `share`.

The direction lives entirely in the CSS, and both halves share one pair of keyframes:

```css
::view-transition-old(.slide-down) {
  animation:
    var(--reveal-exit) ease-out both reveal-fade reverse,
    var(--reveal-exit) ease-out both reveal-slide reverse;
}

::view-transition-new(.slide-up) {
  animation:
    var(--reveal-enter) ease-in var(--reveal-exit) both reveal-fade,
    var(--reveal-move) ease-in both reveal-slide;
}
```

`reveal-slide` runs `translateY(10px) → 0`. Played forwards the content rises into place; played `reverse` the placeholder settles downward. The enter fade is delayed by `var(--reveal-exit)` so the two do not overlap, and `both` is not decoration — without it the incoming content would sit fully opaque during that delay instead of holding its `opacity: 0` start.

`default="none"` on both wrappers is doing real work too. Without it they would animate on every transition anywhere on the page, and the product image morph is nested **inside** them.

### Two rules in the stylesheet that are not animations

```css
::view-transition {
  pointer-events: none;
}
```

The transition overlay covers the viewport for the length of the animation. Without this, a click landing mid-animation is swallowed instead of reaching the link underneath — a 400 ms dead zone on every navigation.

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
  }
}
```

Zeroing the durations rather than disabling transitions, so the page still updates correctly and just does it instantly.

## The result, and the part that does not work

On a navigation to a product page **that the router has already visited**, the morph runs: the thumbnail grows out of the grid and lands as the hero.

On the **first** navigation to a product, it does not, and the reason is structural. The commit that performs that navigation suspends — it renders the App Shell, because the product data is not there yet. React does not degrade gracefully when a transition's commit suspends; it **skips the transition entirely**. There is exactly one `startViewTransition` call, it rejects with `InvalidStateError: Transition was aborted because of invalid state`, and no second call happens when the content later streams in.

That was diagnosed by elimination, over five rounds of probes in a real production build. Ruled out: reduced motion (false), a hidden document (visible), duplicate `view-transition-name` values (there is exactly one name per side), and the environment simply not supporting the API (a hand-rolled `startViewTransition` resolved fine in the same tab).

The obvious fix does not work either. Naming the skeleton's placeholder so the morph has a destination on the cold path is exactly what `ProductCardLoading` now does — and it cannot help, because React is not failing to _pair_ the elements, it is skipping the transition before pairing is considered.

So this is a genuine trade-off rather than a defect. Shared-element morphing wants the destination to render in the same commit as the click. Phases 6 and 7 deliberately made the first commit render a shared, param-independent shell instead, because that is what makes the navigation instant. The app gets the instant first paint always, and the morph on warm navigations — and that ordering is the right one, because an instant skeleton beats a pretty animation on a slow page.

There is a visible effect on the cold path, but it is not a view transition: the hero's `placeholder="blur"` background is swapped for the decoded photo, with no animation attached. It reads as a blur-in because a blurred 1×1 PNG scaled to 500 px is what was on screen a moment earlier.

## The flicker underneath the animations

Throttled to Slow 4G, every route visibly reflowed when its skeleton handed off to the real content — not a vertical shift but a horizontal one, the whole page body changing width. No animation can hide that, and it predates this phase.

The cause is one missing class in `src/components/Layout.tsx`. `<body>` is `flex min-h-screen flex-col`, and `<main>` was `mx-auto max-w-screen-xl grow` with no width. In a column flex container the cross axis is horizontal, and the flexbox spec is explicit that `align-self: stretch` applies only when the cross size is `auto` **and neither cross-axis margin is `auto`**. `mx-auto` makes both of them auto. So `<main>` was never stretched — it was sized to fit its own content, then centred.

That makes the width of the page a function of whatever is currently inside it. Measured on `/login` in a 1683 px viewport, `<main>` was **480 px**; forcing `width: 100%` on it took it straight to its 1280 px cap. A skeleton has a narrow max-content width and the real content has a wide one, so every first paint ended with the entire body jumping outward.

The fix is `w-full`, which gives the element a definite cross size so the auto margins go back to being pure centring:

```tsx
<main className="mx-auto w-full max-w-screen-xl grow bg-background">
```

With that in place the handoff is geometrically identical on both sides. Measured by fetching the served shell HTML and swapping it into the loaded page, `/product/[slug]` reports the same numbers in both states — `<main>` 1280, the grid 1248×676 at the same origin, the image box 624×624 at the same origin.

Two smaller mismatches were left over on the category grid, worth 32 px of card height. The real card title was free to wrap to a second line while the skeleton reserved one, and the skeleton's cart button was `size-9` against a real `Button` that is `h-10`. The title is now `line-clamp-2 h-14` in both, which also stops cards in the same row disagreeing about their height, and the button placeholder matches. Skeleton and content cards now measure 416 px alike.

One thing the screenshots showed is a dev-only artifact: `/` flashes its category skeleton in `next dev` but never in production, because `/` prerenders `CategoryList` at build time and serves it complete in the shell.

## Measurements

The route table is **byte-identical** to phase 7 after both commits. Neither `<ViewTransition>` nor the CSS moves anything in or out of Partial Prerendering:

```
├   /category/[slug]
│ └ ◐ /category/[slug]
├   /product/[slug]
│ └ ◐ /product/[slug]
```

`<ViewTransition>` **serializes through a `use cache` boundary**, which was not obvious — it is a component rendered inside a cached scope, and its props have to survive into the cached RSC payload. Verified with `curl` against a production server: the payload for a category page contains `{"name":"product-image-5","share":"morph","default":"none"}` inside the cached `CategoryProducts` scope. The reveal wiring ships the same way, `"exit":"slide-down"` and `"enter":"slide-up"` twice each.

All the CSS reaches the built stylesheet — `::view-transition-group(.morph)`, `::view-transition-image-pair(.morph)`, `::view-transition-old(.slide-down)`, `::view-transition-new(.slide-up)`, the three `@keyframes` and the reduced-motion block. Worth checking rather than assuming: these selectors reference pseudo-elements that do not exist in the document, so nothing would complain if a build step dropped them.

`npm run lint`, `npm run typecheck`, the 23 unit tests and all six `instant()` assertions from phase 7 stay green. The e2e suite is the one that matters here: a `<ViewTransition>` wrapper around a Suspense boundary is exactly the kind of change that could push content out of the App Shell, and it did not.

One thing is **not** verified. Whether the Suspense reveal animates on a cold product load was never confirmed in a browser — the automation tab became unusable at that point, reporting zero-size rects for every link and `img.complete === false` throughout, because it renders offscreen. The wiring ships and the CSS ships; whether React runs that second transition when the content streams in is open. The check is one line in a real browser, on a cold product page, just after the content appears:

```js
document
  .getAnimations()
  .filter((a) => a.effect?.pseudoElement?.includes("view-transition"));
```

## Key files

- [`src/utils/viewTransitions.ts`](../src/utils/viewTransitions.ts) — the shared name, so a typo cannot silently disable the morph
- [`src/components/Reveal.tsx`](../src/components/Reveal.tsx) — the `enter`/`exit` pair
- [`src/app/globals.css`](../src/app/globals.css) — every animation, plus the `pointer-events` and reduced-motion rules
- [`src/components/ProductCardLoading.tsx`](../src/components/ProductCardLoading.tsx) — the URL read that keeps the shell param-independent
- [`src/types/react-canary.d.ts`](../src/types/react-canary.d.ts) — `@types/react` only declares `ViewTransition` in its canary entry point

## Learning outcomes

- The browser API animates **screenshots**, not elements. Almost every practical problem with it follows from that: names must be unique, and an element that has not painted has nothing to animate.
- React's four triggers are about **mount, unmount and persistence**, not about navigation direction. `enter` means "this subtree was added", which is why it is dead in a layout and alive in a `page.tsx`.
- `share` outranks `enter` and `exit`. A matching `name` across the commit is what promotes two elements into one moving object.
- The trigger value is a **CSS class**, not an animation. `default="none"` without an explicit `share` silently turns a morph into a crossfade.
- A `<ViewTransition>`'s props serialize through a `use cache` scope, so transitions and Cache Components compose without special handling.
- **Instant navigation and shared-element morphing pull in opposite directions.** A morph needs the destination in the same commit; an instant paint needs a shell that commits without the destination. React resolves it by skipping the transition, and this app keeps the instant paint.
- `blurDataURL` without `placeholder="blur"` is ignored by `next/image`. Two components here had carried that dead prop since before the workshop.
- `images.unoptimized: true` is why the grid and hero share a URL at all. Switching image optimisation on would give them different `srcSet` widths and cost the morph its warm-cache destination.
