# Phase 8b: Finishing the navigation polish

> **Reverted.** The animations this phase shipped caused problems in use and were taken back out on `workshop/revert-phase-8b`. The document stays as the record of what was learned. The concepts below are accurate, but nothing described under "Implementation" is in the tree any more — see [What survived the revert](#what-survived-the-revert) at the bottom.

Phase 8 left two of the four view transition patterns on the table — the **directional slide**, which needs `transitionTypes` and a notion of forward and back, and the **same-route crossfade** on `/search` — plus one unverified claim: that the Suspense reveal animates on a cold product load.

This phase builds both and answers the question (it does). Most of the work turned out to be measurement: the slide took three designs to get right, and two of them passed every automated test while being invisible or broken on screen.

## Concepts

### Transition types: a channel the browser already had

Everything in phase 8 was decided by the React tree. `share`, `enter` and `exit` fire on what mounted, unmounted or persisted, and none of that distinguishes "deeper into the catalog" from "back up" — both are one page unmounting and another mounting.

The browser's answer is **transition types**: `startViewTransition({ update, types })`. A type is a string attached to the transition rather than to any element, and CSS selects on it with `:active-view-transition-type(name)`. React exposes it as `addTransitionType`, and Next wires it to navigation in two places:

```tsx
<Link href="/category/smartphones" transitionTypes={["nav-forward"]}>
router.push("/search?q=laptop", { transitionTypes: ["nav-forward"] })
```

Both call `addTransitionType` inside the Transition the navigation already runs on. Same commit, same boundaries, same triggers — the type just rides along as information about _why_ the commit happened.

### How a type reaches an animation

There are two routes, and this phase uses both.

The **React route** is a `<ViewTransition>` trigger. It normally takes a view transition class as a string, but also accepts an object keyed by type — `ViewTransitionClassPerType`, a `Record<"default" | string, "none" | "auto" | string>`. React applies the first key matching an active type; `default` catches everything else. This phase uses it for the things that are _not_ the page slide.

The **CSS route** is `:active-view-transition-type()`, a pseudo-class on the root element that matches while a transition carrying that type runs. No React involvement, so it can target pseudo-elements React never named:

```css
html:active-view-transition-type(nav-forward)::view-transition-old(page) {
  --nav-slide: calc(-1 * var(--nav-offset));
}
```

Both invert what the props look like they do: the trigger decides **whether** a boundary animates, the type decides **which** animation. Opting in per link is the right default — a direction is a claim about the app's hierarchy, and only the link knows which way it goes.

### Why the page boundary carries a name

```tsx
<ViewTransition name="page">
```

Two facts decide that line. **React only calls `document.startViewTransition` when a `<ViewTransition>` is part of the update** — measured, not assumed: remove the boundary and `home → /category/beauty` stops animating entirely, leaving only the Suspense reveal that follows.

And **`root` is not available to a React app**: React cancels it whenever no boundary activates, so CSS written against `::view-transition-old(root)` is never painted. See [the root dead end](#the-root-dead-end).

So the animation needs a boundary React keeps, and one stable `name` across the navigation is what makes it safe — one name means one group, one image-pair, one old and one new, in every engine. That is what `root` was chosen for, obtained another way.

### Where the boundary has to live

Phase 8 established that `enter` and `exit` are dead in a `layout.tsx`, which persists across navigations and so is never mounted or unmounted. The boundary needs a component the **page** mounts, and FakeShop has exactly one: `PageContainer`, rendered by all seven pages and nothing else. One edit rather than seven, and any page added later gets the slide for free.

### The same-route crossfade needs a key

`/search?q=a` to `/search?q=b` is the only same-route navigation the UI can reach — category to category is not linked anywhere. Nothing moved through the hierarchy, so a slide would be a lie about what happened.

The subtlety: without a `key` there is no transition at all. React reconciles the grid in place — same component, same position, new props — so nothing mounts or unmounts and there is no old/new pair. Keying on the query forces a remount:

```tsx
<ViewTransition key={query} name="search-results" share="auto" enter="auto" default="none">
```

`share="auto"` makes it a crossfade rather than two independent fades: the name matches across the commit, so React promotes the pair into one object.

## Implementation

### Tagging the links

Forward is deeper into the catalog: the 24 tiles in `CategoryList`, every card in `ProductGrid`, and the combobox's push to a product. Back is up towards the root: the header logo and the category link on the product page. The combobox's push to `/search` is forward when it arrives from elsewhere and deliberately untagged when it is already there, which is the crossfade's case:

```tsx
if (pathname === "/search") {
  router.push("/search?" + createQueryString("q", value));
} else {
  router.push(`/search?q=${encodeURIComponent(value)}`, {
    transitionTypes: NAV_FORWARD,
  });
}
```

Everything else stays untagged on purpose. The browser's back button, `router.refresh()`, the cart and checkout carry no type, so no `:active-view-transition-type()` rule matches and the page snapshots keep their default `animation: none`.

### The CSS

```css
::view-transition-group(page) {
  animation: none;
}

::view-transition-old(page),
::view-transition-new(page) {
  animation: none;
}

html:active-view-transition-type(nav-forward)::view-transition-new(page),
html:active-view-transition-type(nav-back)::view-transition-new(page) {
  animation:
    var(--nav-fade) linear both nav-fade,
    var(--nav-move) ease-in-out both nav-slide;
  mix-blend-mode: plus-lighter;
}
```

Both directions share the same pair of animations and differ only in the sign of `--nav-slide`, so one pair of selectors carries the timing and four one-line rules carry the offset. `animation: none` on the bare `page` selectors is what keeps an untagged navigation still; without it the browser's own crossfade would run on every page change.

Three details were each arrived at by breaking something first.

**The fades overlap, and they blend additively.** The first version copied the reveal's sequencing from phase 8 — exit over 150ms, enter starting at 150ms — which leaves an instant where neither snapshot is painted, photographed at t=150ms as a blank white rectangle. Merely overlapping them fixes the blank but not the wash: a sweep of the resolved opacities bottomed out at 0.35 coverage. Complementary linear opacities plus `mix-blend-mode: plus-lighter` hold the composite fully opaque throughout. That is what the browser's own crossfade does, and overriding `animation` is exactly what drops it.

**The group is pinned.** `::view-transition-group(page)` would otherwise animate between the two pages' boxes, and they rarely have the same height, so the content's bottom edge would drift under the slide.

**The offset is 60px.** These are pages in a document, not screens in a stack, and a small displacement is enough to say which way the hierarchy moved.

### Everything else has to stand down

**Any other `<ViewTransition>` that activates during the navigation is named out of the page snapshot**, so it stops sliding with the page and leaves a hole where it used to be. The Suspense reveal and the search crossfade can both activate mid-navigation, so both are gated on the type:

```ts
export function exceptNavigation(className: string) {
  return { "nav-forward": "none", "nav-back": "none", default: className };
}
```

A Suspense boundary resolving after the navigation still gets `slide-up`, because that transition carries no type and falls through to `default`. One resolving _during_ a navigation gets `none` and rides the page snapshot with everything else.

### Anchoring the header

The first frozen frame of a forward navigation showed the outgoing category grid painted across the header bar. The header sits outside `PageContainer`, so the slide already excludes it — but it carries its own `view-transition-name` from an earlier phase, and these rules hold that separate snapshot still rather than letting the browser crossfade it on every navigation.

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

`z-index` puts the header's group above the sliding page, `animation: none` holds it still as the fixed reference the slide is read against, and `display: none` on the old snapshot avoids two headers being briefly visible.

## Measuring it

A view transition runs on pseudo-elements in a temporary tree that is torn down before the navigation settles, leaving nothing in the DOM to query afterwards. The instrument is a `startViewTransition` wrapper installed with `page.addInitScript`, so it is in place before any app code runs:

```ts
document.startViewTransition = (update) => {
  const recorded = {
    types: [],
    animationNames: [],
    pseudoElements: [],
    pageSlideFrom: null,
  };
  recorded.types = Array.from(update?.types ?? []);
  const transition = start(update);
  transition.ready.then(() => {
    /* read pseudo-elements, animation names and resolved keyframes */
  });
  return transition;
};
```

`ready` is the single moment where every layer is observable at once, and three things are recorded because none is sufficient alone. The **types** prove the tag on the link reached the transition. The **pseudo-elements** prove the browser built the tree the stylesheet expects — one `old(page)`, one `new(page)`, and no generated `_t_N_` name beside them. The **resolved first keyframe** of `nav-slide` is the only place the two directions are distinguishable, since both run the same keyframes with the sign flipped: `-60px` forward, `60px` back.

Two things cost time here.

**`KeyframeEffect.pseudoElement` reports the transition _name_, not the class.** The first spec asserted on `::view-transition-old(.nav-forward)` and got `::view-transition-old(_t_0_)`, a generated name — three tests failing against a correct implementation.

**Page loads run transitions of their own.** Every Suspense boundary that resolves is one, so an assertion that grabs "the next transition" intermittently gets one of those instead of the navigation. A `settle()` helper polls until the recorded count stops growing before the action runs.

### Screenshots have to be frozen, and Playwright cannot take them

Headless screenshots taken after a transition are all identical, because the overlay tree is gone by then. Freezing every `::view-transition*` animation at its midpoint inside `ready` makes the mid-transition frame deterministic:

```js
for (const a of document.getAnimations()) {
  a.pause();
  a.currentTime = endTime * 0.5;
}
```

This deadlocks if it catches the initial load's reveal — the frozen overlay leaves `<html>` intercepting pointer events forever, and the next `.click()` times out — so the freeze is behind a flag set immediately before the click.

It also produced two wrong diagnoses. The outgoing page looked vertically offset, and a rule added to stop the group's size morph produced a **byte-identical** frame: the offset was Playwright having scrolled the home page down to reach the link. Worse, setting `currentTime = endTime * 0.5` on every animation independently puts the 150ms exit fade at 75ms and the 210ms enter fade at 180ms **at the same instant**, manufacturing an overlap the sequenced animation never has. Both engines' frozen frames looked broken and neither was evidence of anything.

The fallback instruments were no better. `page.screenshot` is slower than a 400ms transition and always lands on the settled page, and `recordVideo` at 25fps shows a single-frame swap with no animation in it at all — in Chromium as well as WebKit. **Playwright's capture does not include the view transition layer.** That matters, because a clean-looking recording was used earlier in this phase as evidence that Safari was fine.

What works is leaving the browser entirely: launch headed, freeze the transition at a chosen absolute time, raise the window, and let macOS `screencapture` photograph what the compositor actually put on the display. That produced every visual claim in this write-up, and it caught the blank frame the structural probes were blind to — `getAnimations()` reported four healthy animations at t=150ms, every one of them resolving to opacity 0.

So there are two instruments answering different questions. **Structural introspection** — `getAnimations()` at `ready`, `pseudoElement`, `getKeyframes()` — answers _did the right animations get created_. **An OS-level screenshot of a frozen frame** answers _does anything reach the screen_. The first is what the e2e suite can assert; the second is what tells you the feature works. Passing the first and skipping the second is how this phase shipped a PR in which no transition was visible in any browser.

### The phase-8 open question, answered

The Suspense reveal **does** animate on a cold product load: the probe showed a second, untagged transition with two exit/enter pairs, the skeleton handing off to the content. It is now a test — a cold `/product/iphone-9-1` runs the `reveal-slide` and `reveal-fade` keyframes with no `nav-slide` anywhere in it, because a Suspense boundary resolving is not a navigation and the page must not slide underneath it.

## The Safari regression, and why the first design could not survive it

The phase was written, tested, documented and merged into a PR before anyone opened it in Safari. It was broken there: the outgoing and incoming pages drawn **on top of each other at full opacity** for the whole navigation, text colliding, both product grids visible at once.

### What the first design did

`PageContainer` was wrapped in `<ViewTransition enter={NAV_DIRECTION} exit={NAV_DIRECTION} default="none">`. That activates the boundary, so React assigns a generated `view-transition-name` — and a navigation unmounts one page and mounts another, so React generates **two**: `_t_0_` for the outgoing container, `_t_1_` for the incoming one. Both carry the `nav-forward` class, and the CSS animated `::view-transition-old(.nav-forward)` and `::view-transition-new(.nav-forward)`.

That relies on an assumption nobody states out loud: that a name which exists only in the old DOM produces only an old snapshot, and one which exists only in the new DOM produces only a new one.

### What Safari actually does

Reading `document.getAnimations()` at `ready` in real Safari, for a single `home → /category/beauty` navigation:

| pseudo-element | Safari                                | Chrome |
| -------------- | ------------------------------------- | ------ |
| `old(_t_0_)`   | `nav-fade` 0/150, `nav-slide` 0/400   | same   |
| `new(_t_0_)`   | `nav-fade` 150/210, `nav-slide` 0/400 | absent |
| `old(_t_1_)`   | `nav-fade` 0/150, `nav-slide` 0/400   | absent |
| `new(_t_1_)`   | `nav-fade` 150/210, `nav-slide` 0/400 | same   |

Same types, classes, delays and durations — and **four** snapshots in Safari where Chrome has two. Safari builds both halves of the pair for both names, so `new(_t_0_)` fades the _outgoing_ page back in over the top of everything and `old(_t_1_)` fades the _incoming_ page out from underneath it. Nothing in the CSS was wrong; the design assumed a snapshot count the spec does not guarantee.

### The root dead end

`root` looks like the obvious answer, and it is the answer outside React: **the one name with exactly one old and one new snapshot by construction, in every engine**, because it is the browser's own snapshot of everything that has no other name. So the slide moved onto `root`, the boundary in `PageContainer` dropped to `default="none"` so the page would stay _inside_ that snapshot, and the direction reached the CSS through `:active-view-transition-type()`. Structural probes green, suite passing in both engines.

Opened in a browser, **nothing animated at all** — not in Safari, and not in Chrome either. The double exposure was gone because the transition was gone.

Chromium reported no `::view-transition-new(root)` animation, WebKit reported one, and neither engine was the cause: a minimal standalone page with the same CSS and a hand-written `startViewTransition({ update, types: ['fwd'] })` produced `old(root)` and `new(root)` correctly in both. `getComputedStyle(document.documentElement).viewTransitionName` was `none` in FakeShop and `root` in the minimal page, and a `MutationObserver` on `<html>` caught who was doing it:

```
["HTML", "view-transition-name: none;", 1646]
["HTML", "", 1648]
```

React, twice per page load, for two milliseconds each time. The function is `cancelRootViewTransitionName`, and it does three things:

```js
rootContainer.style.viewTransitionName = "none";
rootContainer.animate(
  { opacity: [0, 0], pointerEvents: ["none", "none"] },
  {
    duration: 0,
    fill: "forwards",
    pseudoElement: "::view-transition-group(root)",
  },
);
rootContainer.animate(
  { width: [0, 0], height: [0, 0] },
  { duration: 0, fill: "forwards", pseudoElement: "::view-transition" },
);
```

Measured in the running app at `ready`, in both engines: `group(root)` at `opacity: 0`, the `::view-transition` overlay at `0px × 0px`, `<html>` unnamed. That accounts for both symptoms. Chromium loses the new root snapshot because the root has no name when the new state is captured, so there is nothing for the CSS to attach to; WebKit builds both and paints neither, because they sit inside a group pinned to zero opacity.

It is deliberate. React cancels the root exactly when nothing else claimed it:

```js
if (!viewTransitionContextChanged && !rootViewTransitionAffected) {
  cancelRootViewTransitionName(root.containerInfo);
}
```

React's model is that you animate named boundaries, and it takes the root off the table so its own boundaries are the only thing moving. `default="none"` guarantees no boundary activates, which guarantees the branch is taken. **The two halves of the design were mutually exclusive**, and every instrument in use at the time reported on one half only.

### The fix

A single stable `name` on the page boundary:

```tsx
<ViewTransition name="page">
```

One name on both sides of the navigation means one group, one image-pair, one `old(page)` and one `new(page)` — the same structural guarantee `root` offered, on a boundary React has no reason to cancel. The CSS moved from `root` to `page` unchanged in shape, and the type arrays on the links never moved at all.

Verified structurally in both engines — identical pseudo-element trees, identical resolved opacities and translations at every 10ms step across the 400ms — then visually, with the transition frozen and photographed by the OS rather than by Playwright. At t=0 the address bar reads `/category/beauty` and the screen shows the home page, which is the outgoing snapshot painting and the only proof that matters.

### What should have caught it

A `webkit` project in the Playwright config, which the suite now has. Two caveats came out of adding it, both recorded in the config rather than left as folklore:

- **The suite could not reproduce the original bug.** Playwright's WebKit showed the same four-snapshot structure real Safari does, but never rendered it into a frame, for the capture reason above. What it _can_ assert is the structure: the forward test fails unless the navigation builds exactly one `old(page)` and one `new(page)` and no generated `_t_N_` name, which is the shape the bug needed.
- **`instant()` does not work in WebKit.** The navigation lock never engages, so every skeleton assertion in `instant-navigation.test.ts` quietly describes a fully rendered page. Four tests failed and one passed for the wrong reason, so that file is scoped to Chromium.

## The unit test that broke, and why the obvious fix was wrong

Adding `<ViewTransition>` to `PageContainer` broke four unrelated tests: `RouteError` renders a `PageContainer`, and under Vitest the element type came back `undefined`.

There are two Reacts in this repo. The App Router runs on the canary Next bundles at `next/dist/compiled/react-experimental`, which is `19.3.0-experimental` and exports `ViewTransition`. The `react` at the top of `node_modules` is the stable `19.2.8` and does not. The tests had always run against a different React than the app; nothing had touched a difference before.

Aliasing `react` and `react-dom` onto Next's bundled copies in the Vitest config half worked: components got the canary React, then every hook threw `Cannot read properties of null (reading 'useEffect')`, with the stack running through the **stable** `react-dom`. Testing Library imports `react-dom/client` itself and Vitest externalizes it, so Node resolves that import and never consults the bundler's aliases — confirmed by aliasing to a path that does not exist and getting no resolution error at all. The result is a renderer on one React driving components on another.

So the tests stay on the stable React, whole and self-consistent, and get a passthrough for the one export they are missing:

```ts
const react: { ViewTransition?: unknown } = createRequire(import.meta.url)(
  "react",
);
react.ViewTransition ??= ({ children }) => children;
```

This costs nothing in fidelity: jsdom implements no view transitions, so even the real component would render its children and animate nothing. What the transition actually does is covered in a browser that runs it.

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

That is the expected result and the reason to check: transition types are a client-side concern layered on a navigation that already happened. A change in the table would mean something pulled request-time data above a boundary.

Everything is green:

- **23 unit tests**, including the four this phase broke and repaired.
- **26 e2e runs across two engines** — 13 in Chromium, and 13 in WebKit of which 6 are the Chromium-only `instant()` specs and therefore skipped, leaving 20 that execute.
- `npm run lint` and `npm run typecheck` clean.

The five new assertions are: a forward link carries `nav-forward`, runs the slide, resolves the keyframe to `-60px` and builds exactly one `old(page)` and one `new(page)` with no generated `_t_N_` name; a back link carries `nav-back` and resolves to `60px`; a link out of the catalog carries no type and no slide; a query-only change crossfades `search-results` with no slide; and the Suspense reveal runs its own keyframes with no slide underneath.

Beyond the suite, in both engines: the pseudo-element tree is `group(page)`, `old(page)` and `new(page)` and nothing else page-shaped; the resolved opacities and translations match to five decimal places at every 10ms step; and OS-level screenshots of the frozen transition at t=0 and t=130ms show the outgoing page alone, then the two cross-blended over an opaque background, with the header stationary in both.

One small trap: the "leaves the catalog" test clicks the account icon and lands on `/login`, because `/account` redirects a logged-out visitor. The redirect target renders a `PageContainer` too, so it is still the untagged path being asserted.

## Key files

These are the files the phase touched. The revert restored all of them except the last two, so the links describe what the code looked like at `826ccf9` rather than what is there now.

- [`src/utils/viewTransitions.ts`](../src/utils/viewTransitions.ts) — the two type arrays and `exceptNavigation()`
- [`src/components/Layout.tsx`](../src/components/Layout.tsx) — `PageContainer`, the `name="page"` boundary every page mounts
- [`src/app/(shop)/search/page.tsx`](<../src/app/(shop)/search/page.tsx>) — the keyed crossfade
- [`src/components/Reveal.tsx`](../src/components/Reveal.tsx) — the Suspense handoff, standing down during a navigation
- [`src/app/globals.css`](../src/app/globals.css) — the page slide, the type gating and the header anchoring
- [`e2e/view-transitions.test.ts`](../e2e/view-transitions.test.ts) — the `startViewTransition` recorder and the five assertions
- [`playwright.config.ts`](../playwright.config.ts) — the `webkit` project
- [`vitest.setup.ts`](../vitest.setup.ts) — the `<ViewTransition>` passthrough for the stable React

## Learning outcomes

- **Transition types are the channel for information the React tree does not contain.** Direction is the canonical example: forward and back produce identical commits, so no trigger, name or class can distinguish them.
- The trigger decides **whether** a boundary animates; the type decides **which** animation. A type reaches the CSS either through a `ViewTransitionClassPerType` map on the trigger or, with no React involvement, through `:active-view-transition-type()`.
- **Give a whole-page transition one stable name**, so the outgoing and incoming pages resolve to the _same_ name and the engine has no room to invent more snapshots. A boundary that names its two halves separately is where Safari and Chrome diverge: Safari builds both halves of the pair for both names, so four full-page snapshots exist where the CSS assumed two.
- **`root` is not available to a React app.** React calls `cancelRootViewTransitionName` whenever no `<ViewTransition>` boundary activates, which unnames `<html>`, pins `::view-transition-group(root)` to `opacity: 0` and sizes the overlay to zero. CSS written against `root` is never painted.
- **`default="none"` is not the same as no boundary.** React only starts a view transition when a `<ViewTransition>` is part of the update, and `"none"` starts one without naming the element — but it is also precisely the condition that makes React cancel the root, so the two cannot be combined.
- **Naming an element removes it from the snapshot that contains it.** That is the mechanism behind both the header anchoring and `exceptNavigation()`: useful when deliberate, a hole in the page when not.
- **Overriding `animation` on a snapshot throws away the blend mode too.** The UA crossfade runs complementary opacities under `mix-blend-mode: plus-lighter`. Replace the animation and you own that problem: sequential fades leave a frame with nothing painted, overlapping ones without the blend mode wash out.
- **Opting in per link is the correct default.** Only the link knows whether it goes up or down the hierarchy. Everything untagged matches no type rule and does not animate, which is why the back button and the cart stay still.
- **A same-route transition needs a `key`.** Without a remount there is no old/new pair, and React updates in place with nothing to animate.
- **Playwright cannot see a view transition, but the operating system can.** Its screenshots land after the transition and its video does not capture the layer, in either engine. Freezing the animations in a headed browser and calling macOS `screencapture` does photograph it, because that reads the compositor's output.
- **Structural evidence and visual evidence are different claims.** `getAnimations()` at `ready` proves the right animations were _created_, not that they _paint_ — a root-based design passed every structural assertion in two engines while being completely invisible, and an overlapping-fade design passed them while flashing a blank frame.
- **Measure again before believing a diagnosis, and check the instrument first.** The "squashed page" was Playwright's scroll position; the "overlapping fades" were the freeze itself, which puts animations of different lengths at different points of their own timelines at the same instant.
- `KeyframeEffect.pseudoElement` reports the transition **name**, not the class. For an unnamed boundary that is a generated string like `_t_0_`, so it cannot be asserted against — but its _presence_ can be, since a page split across two generated names is exactly the regression this phase fixed.
- **A cross-engine test project is not optional for CSS this new.** Everything shipped green in Chromium and was visibly broken in Safari, and the failure mode is silent.
- **This repo runs two Reacts.** The App Router uses the canary Next bundles, the unit tests the stable one at the project root. They can diverge on canary APIs, and they cannot be forced together from the bundler, because Testing Library resolves `react-dom` through Node where aliases do not reach.

## What survived the revert

The slide, the crossfade and everything that supported them are gone: the `name="page"` boundary on `PageContainer`, the header's own `view-transition-name`, every `transitionTypes` tag, `NAV_FORWARD` / `NAV_BACK` / `exceptNavigation()`, and the nav and header blocks in `globals.css`. Phase 8's morph and Suspense reveal are untouched, and `PageContainer` is a plain `<div>` again.

The measurement work stayed, because it is useful regardless of which animations exist:

- The `webkit` Playwright project and the `webkit` download in `test:e2e:install`. The lesson that shipped-green-in-Chromium can be visibly broken in Safari is the reason this phase existed.
- The Chromium-only `test.skip` guard in `e2e/instant-navigation.test.ts` — `instant()` does not hold a navigation in WebKit, so those assertions would pass for the wrong reason.
- `vitest.setup.ts`, the `<ViewTransition>` passthrough that reconciles the canary React the App Router runs on with the stable one Vitest resolves.
- `e2e/view-transitions.test.ts`, trimmed to the `startViewTransition` recorder and two assertions about phase 8: that the Suspense reveal runs its keyframes on a cold product load, and that the product image morph names its snapshot. The five slide and crossfade assertions went with the code they covered.
