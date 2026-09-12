# Phase 8b: Finishing the navigation polish

Phase 8 shipped two of the four view transition patterns the Next guide describes, and left two on the table: the **directional slide**, which needs `transitionTypes` on the links and a notion of forward and back the catalog did not yet have, and the **same-route crossfade**, which applies to `/search` as the query changes. It also ended with one thing unverified — whether the Suspense reveal actually animates on a cold product load, or whether the wiring ships and nothing runs.

This phase builds both patterns and answers the open question. The answer is yes, and the way it was answered turned out to matter more than the answer: the instrument built to see the transition became the regression test for all of them, and the first frame it captured exposed a real defect nobody had noticed by eye.

## Concepts

### Transition types: a channel the browser already had

Everything in phase 8 was decided by the React tree. `share`, `enter` and `exit` fire on what mounted, unmounted or persisted in a commit, and none of those facts distinguish "the user went deeper into the catalog" from "the user came back up". Both are one page unmounting and another mounting. The tree looks identical in each direction, so no amount of styling on the boundary can tell them apart.

The browser's answer is **transition types**, the second argument shape of `startViewTransition({ update, types })`. A type is an arbitrary string attached to the transition itself rather than to any element, and CSS can select on it with `:active-view-transition-type(name)`. React exposes it as `addTransitionType`, and Next wires it to navigation in two places:

```tsx
<Link href="/category/smartphones" transitionTypes={["nav-forward"]}>
router.push("/search?q=laptop", { transitionTypes: ["nav-forward"] })
```

Both call `addTransitionType` inside the Transition that the navigation already runs on. Nothing else changes: the same commit, the same boundaries, the same triggers. The type rides along as extra information about _why_ the commit happened.

### How a type reaches an animation

A `<ViewTransition>` trigger normally takes a string, the view transition class to tag the pseudo-elements with. It also accepts an **object keyed by type**, which is where the two halves meet:

```ts
export const NAV_DIRECTION = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};
```

React reads the types active on the transition, finds the first key that matches, and applies that class. `default` is the fallback for a transition carrying no type — or carrying one this object does not name. Its type is `ViewTransitionClassPerType`, a `Record<"default" | string, "none" | "auto" | string>`.

This is worth stating plainly because it inverts what the props look like they do. `enter` and `exit` decide **whether** a boundary animates; the type decides **which** animation it gets. A single `enter={NAV_DIRECTION}` covers both directions, and a navigation the app has not tagged gets `none` and does not animate at all. Opting in is per link, which is the right default: a direction is a claim about the app's hierarchy, and only the link knows whether it is going up or down it.

### Why the same object is passed to both `enter` and `exit`

One navigation is two boundaries in one commit: the old page's `PageContainer` unmounts and the new page's mounts. React fires `exit` on the first and `enter` on the second, in the same transition, under the same types. So both need the class, and both get the same map. The direction is carried by the CSS, not by the trigger — `::view-transition-old(.nav-forward)` slides left, `::view-transition-new(.nav-forward)` comes in from the right, and `.nav-back` swaps the signs.

### Where the boundary has to live

Phase 8 established that `enter` and `exit` are dead in a `layout.tsx`, because a layout persists across navigations and is therefore never mounted or unmounted. A directional slide needs a component that the **page** mounts. FakeShop already has exactly one: `PageContainer`, rendered by all seven pages — `/`, `/account`, `/login`, `/search`, `/checkout`, `/category/[slug]` and `/product/[slug]` — and by nothing else. That makes it a single edit rather than seven, and it means a page added later gets the slide by rendering the container everyone else renders.

### The same-route crossfade needs a key

`/search?q=a` to `/search?q=b` is the only same-route navigation the UI can actually reach. Category to category is not linked anywhere; the combobox pushes this one when it is already on the results page. It is a genuinely different case from the others: nothing moved through the hierarchy, the same container is showing different contents, and a slide would be an outright lie about what happened.

The subtlety is that without a `key`, there is no transition at all. React reconciles the results grid in place — same component, same position, new props — so nothing mounts and nothing unmounts, and there is no old/new pair to animate. Keying the boundary on the query forces a remount, which is what turns a props change into something the browser can screenshot on both sides:

```tsx
<ViewTransition key={query} name="search-results" share="auto" enter="auto" default="none">
```

`share="auto"` is what makes it a crossfade rather than two independent fades: the name matches across the commit, so React promotes the pair into one object and the browser interpolates between the two snapshots.

## Implementation

### Tagging the links

Forward is deeper into the catalog: the 24 tiles in `CategoryList`, every card in `ProductGrid`, and the combobox's push to a product. Back is up towards the root: the header logo, and the category link on the product page. The combobox's push to `/search` is forward when it arrives from elsewhere and deliberately untagged when it is already there, which is the crossfade's case:

```tsx
if (pathname === "/search") {
  router.push("/search?" + createQueryString("q", value));
} else {
  router.push(`/search?q=${encodeURIComponent(value)}`, {
    transitionTypes: NAV_FORWARD,
  });
}
```

Everything not in that list stays untagged on purpose. The browser's own back button, `router.refresh()`, the cart and checkout all fall through `default: "none"`.

### The CSS

The timings mirror the reveal from phase 8, for the same reason: the outgoing page leaves quickly so it stops competing for attention, the incoming fade waits for it to finish, and the slide runs longer than both so the movement reads as continuous rather than as two events.

```css
::view-transition-new(.nav-forward) {
  --nav-slide: var(--nav-offset);
  animation:
    var(--nav-enter) ease-out var(--nav-exit) both nav-fade,
    var(--nav-move) ease-in-out both nav-slide;
}
```

The offset is 60px. A full-width slide would be wrong here — these are not screens in a stack, they are pages in a document, and a small displacement is enough to say which way the hierarchy moved.

### Anchoring the header

This was not planned. It came out of the first frozen frame of a forward navigation: the outgoing category grid was being **painted across the header bar**. The header is not in its own group, so it is part of the root snapshot, and the page group is drawn over the root. Nothing was wrong with the slide; the header simply had nothing keeping it above the thing sliding past it.

```css
::view-transition-group(site-header) {
  animation: none;
  z-index: 100;
}
::view-transition-old(site-header) {
  display: none;
}
::view-transition-new(site-header) {
  animation: none;
}
```

Naming it lifts it into its own group, `z-index` puts that group above the page, and `animation: none` holds it still — it is the fixed reference point the slide is read against, so it must not move. `display: none` on the old snapshot avoids two headers being briefly visible while both are in the tree.

## Measuring it

A view transition is unusually hard to assert on. It runs on pseudo-elements in a temporary tree that is torn down before the navigation settles, it leaves nothing in the DOM, and by the time a test can query anything it is over. The instrument is a wrapper installed with `page.addInitScript`, so it is in place before any app code runs:

```ts
document.startViewTransition = (update) => {
  const recorded = {
    types: [],
    pageTransitionClass: null,
    animationNames: [],
    pseudoElements: [],
  };
  recorded.types = Array.from(update?.types ?? []);
  const transition = start(update);
  transition.ready.then(() => {
    /* read classes and animations */
  });
  return transition;
};
```

`ready` is the single moment where all three layers are observable at once: the types that were passed in, the class React resolved from them, and the animations the stylesheet matched. Two of those are recorded because neither is sufficient. The class on the page container proves the type reached the right branch of `NAV_DIRECTION` — it is the only place `nav-forward` and `nav-back` differ, since both run the same keyframes with an opposite offset. The animation names prove the stylesheet matched that class rather than the browser falling back to its own crossfade.

Two things cost time here and are worth writing down.

**`KeyframeEffect.pseudoElement` reports the transition _name_, not the class.** The first version of the spec asserted on `::view-transition-old(.nav-forward)` and got `::view-transition-old(_t_0_)` — a generated name, because an unnamed `<ViewTransition>` has one. Three tests failed against a correct implementation. A throwaway probe confirmed the types were arriving and the computed `viewTransitionClass` was `nav-forward`; the assertions were wrong, not the code.

**Page loads run transitions of their own.** Every Suspense boundary that resolves is one, and they land after the content they revealed is already on screen. An assertion that grabs "the next transition" intermittently gets one of those instead of the navigation. A `settle()` helper polls until the recorded count stops growing before the action runs.

### Screenshots have to be frozen

Headless screenshots taken after a transition were all identical, because the overlay tree is gone by then. Freezing every `::view-transition*` animation at its midpoint inside `ready` makes the mid-transition frame deterministic:

```js
for (const a of document.getAnimations()) {
  a.pause();
  a.currentTime = endTime * 0.5;
}
```

This deadlocks if it catches the initial load's reveal — the frozen overlay leaves `<html>` intercepting pointer events forever, and the next `.click()` times out — so the freeze is behind a flag set immediately before the click.

It also produced one wrong diagnosis worth recording. The outgoing page looked vertically offset, and the hypothesis was that the group's size morph was squashing it, so a rule was added to stop that. Re-measuring produced a **byte-identical** frame: the offset was Playwright having scrolled the home page down to reach the link. The rule was reverted, and the measurement redone at a viewport tall enough that no scroll was needed.

### The phase-8 open question, answered

The Suspense reveal **does** animate on a cold product load. The same probe that diagnosed the class mismatch showed a second, untagged transition with two exit/enter pairs — the skeleton handing off to the content. It is now a test: a cold `/product/iphone-9-1` runs a transition with the `reveal-slide` and `reveal-fade` keyframes, and its page container class is `none`, because a Suspense boundary resolving is not a navigation and the page must not slide underneath it.

## The unit test that broke, and why the obvious fix was wrong

Adding `<ViewTransition>` to `PageContainer` broke four unrelated tests. `RouteError` renders a `PageContainer`, and under Vitest the element type came back `undefined`.

The cause is that there are two Reacts in this repo. The App Router runs on the canary Next bundles at `next/dist/compiled/react-experimental`, which is `19.3.0-experimental` and exports `ViewTransition`. The `react` at the top of `node_modules` is `19.2.8`, the stable release, and does not. The tests had always been running against a different React than the app — the components just never touched anything that differed.

The obvious fix is to alias `react` and `react-dom` onto Next's bundled copies in the Vitest config. It half worked: components got the canary React, and then every hook threw `Cannot read properties of null (reading 'useEffect')`, with the stack running through the **stable** `react-dom`. Testing Library imports `react-dom/client` itself, and Vitest externalizes it, so Node resolves that import and never consults the bundler's aliases. Confirmed by pointing the alias at a path that does not exist and getting no resolution error at all. Inlining Testing Library did not change it either. The result is a renderer on one React driving components on another, with a null dispatcher between them.

So the tests stay on the stable React, whole and self-consistent, and get a passthrough for the one export they are missing:

```ts
const react: { ViewTransition?: unknown } = createRequire(import.meta.url)(
  "react",
);
react.ViewTransition ??= ({ children }) => children;
```

This costs nothing in fidelity. jsdom implements no view transitions, so even the real component would render its children and animate nothing — there is no behaviour here for a unit test to observe. What the transition actually does is covered in a browser that runs it.

## Measurements

The route table is byte-identical to before the phase. `/` is still fully static with its 30-day and 1-year cache entries, `/opengraph-image` is still `○`, and everything else is still `◐` with the same shells:

```
Route (app)
┌ ◐ /
├ ○ /opengraph-image
├ ◐ /category/[slug]
├ ◐ /product/[slug]
├ ◐ /search
```

This is the expected result and the reason to check: transition types are a client-side concern layered on a navigation that already happened, so nothing about prerendering, caching or the shells should move. If the table had changed, something would have pulled request-time data above a boundary.

Everything is green:

- **23 unit tests**, including the four that this phase broke and repaired.
- **13 e2e tests** — 6 `instant()` assertions from phase 7, 2 opengraph from phase 9, and 5 new view transition assertions. Stable at `--repeat-each=2`.
- `npm run lint` and `npm run typecheck` clean.

The five new assertions are: a forward link carries `nav-forward` and runs the slide, a back link carries `nav-back`, a link out of the catalog carries no type and resolves to `none`, a query-only change crossfades `search-results` with no slide, and the Suspense reveal runs its own keyframes.

One of those is a small trap worth noting: the "leaves the catalog" test clicks the account icon and lands on `/login`, because `/account` redirects a logged-out visitor. The redirect target renders a `PageContainer` too, so it is still the untagged path being asserted.

## Key files

- [`src/utils/viewTransitions.ts`](../src/utils/viewTransitions.ts) — the two type arrays and the map from types to classes
- [`src/components/Layout.tsx`](../src/components/Layout.tsx) — `PageContainer`, the one boundary every page mounts
- [`src/app/(shop)/search/page.tsx`](<../src/app/(shop)/search/page.tsx>) — the keyed crossfade
- [`src/app/globals.css`](../src/app/globals.css) — the directional keyframes and the header anchoring
- [`e2e/view-transitions.test.ts`](../e2e/view-transitions.test.ts) — the `startViewTransition` recorder and the five assertions
- [`vitest.setup.ts`](../vitest.setup.ts) — the `<ViewTransition>` passthrough for the stable React

## Learning outcomes

- **Transition types are the channel for information the React tree does not contain.** Direction is the canonical example: forward and back produce identical commits, so no trigger, name or class can distinguish them. The type is attached to the transition rather than to an element.
- The trigger decides **whether** a boundary animates; the type decides **which** animation. `enter={NAV_DIRECTION}` is one prop covering both directions and an untagged fallback.
- **Opting in per link is the correct default.** A direction is a claim about the app's hierarchy, and only the link knows if it is going up or down. Everything untagged falls through `default: "none"` and animates not at all, which is why the browser back button and the cart stay still.
- **A same-route transition needs a `key`.** Without a remount there is no old/new pair, and React updates in place with nothing to animate.
- **Anything not in its own group is part of the root snapshot, and the page group paints over it.** A persistent chrome element that should stay put during a page animation has to be named, given a `z-index` and told not to animate — it is not automatic.
- **Freeze the animation to see it.** A screenshot after the transition shows nothing, because the overlay tree is already gone. Pausing every view transition animation at its midpoint inside `ready` is what makes the frame both visible and deterministic — and it caught a real paint-order defect that had gone unnoticed by eye.
- **Measure again before believing a diagnosis.** The "squashed page" was Playwright's scroll position, and the fix for it changed nothing: the re-measured frame was byte-identical.
- `KeyframeEffect.pseudoElement` reports the transition **name**, not the class. For an unnamed boundary that is a generated string like `_t_0_`, so it cannot be asserted against. Assert on the computed `viewTransitionClass` and the animation names instead.
- **This repo runs two Reacts, and now it is visible.** The App Router uses the canary Next bundles; the unit tests use the stable one at the project root. They can diverge on canary APIs, and they cannot be forced together from the bundler, because Testing Library resolves `react-dom` through Node where aliases do not reach.
