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

There are two routes from a type to an animation, and this phase ended up using the second one after the first broke in Safari.

The React route is a `<ViewTransition>` trigger, which normally takes a string — the view transition class to tag the pseudo-elements with — but also accepts an **object keyed by type**, `ViewTransitionClassPerType`, a `Record<"default" | string, "none" | "auto" | string>`. React reads the types active on the transition, finds the first key that matches, and applies that class. `default` is the fallback for a transition carrying no type, or carrying one the object does not name. The phase still uses this for the things that are _not_ the page slide.

The CSS route is `:active-view-transition-type()`, a pseudo-class on the root element that matches while a transition carrying that type is running. It needs no React involvement at all, so it can target pseudo-elements React never named — including `root`, which is the one this phase settled on:

```css
html:active-view-transition-type(nav-forward)::view-transition-old(root) {
  --nav-slide: calc(-1 * var(--nav-offset));
}
```

Both routes invert what the props look like they do. The trigger decides **whether** a boundary animates; the type decides **which** animation it gets. Opting in is per link, which is the right default: a direction is a claim about the app's hierarchy, and only the link knows whether it is going up or down it.

### Why the page boundary carries a name

`PageContainer` wraps its children in a `<ViewTransition>`, and the prop it carries is the whole phase in one line:

```tsx
<ViewTransition name="page">
```

Two facts decide that. First, **React only calls `document.startViewTransition` when a `<ViewTransition>` is part of the update.** Remove the boundary entirely and a tagged link changes the page with no transition at all — measured, not assumed: `home → /category/beauty` and `/category/beauty → /product/…` both stopped animating, and the only transition still recorded was the Suspense reveal that follows.

Second, and much less obvious, **`root` is not available to a React app.** React cancels the root snapshot on purpose whenever no boundary activates, and it does so thoroughly. See [the root dead end](#the-root-dead-end) for the measurements; the short version is that CSS written against `::view-transition-old(root)` is never painted.

So the animation has to run on a boundary React keeps, and a single stable `name` on both sides of the navigation is what makes that boundary safe: one name means one group, one image-pair, one old and one new, in every engine. That is the property `root` was chosen for in the first place, obtained a different way.

### Where the boundary has to live

Phase 8 established that `enter` and `exit` are dead in a `layout.tsx`, because a layout persists across navigations and is therefore never mounted or unmounted. The boundary that starts the transition needs a component the **page** mounts. FakeShop already has exactly one: `PageContainer`, rendered by all seven pages — `/`, `/account`, `/login`, `/search`, `/checkout`, `/category/[slug]` and `/product/[slug]` — and by nothing else. That makes it a single edit rather than seven, and it means a page added later gets the slide by rendering the container everyone else renders.

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

Everything not in that list stays untagged on purpose. The browser's own back button, `router.refresh()`, the cart and checkout carry no type, so no `:active-view-transition-type()` rule matches and the page snapshots keep the `animation: none` they are given by default.

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

The pair of animations is shared by both directions and only the sign of `--nav-slide` differs, so the rules are split: one pair of selectors carries the timing, four one-line rules carry the offset. `animation: none` on the bare `page` selectors is what keeps an untagged navigation still — without it the browser's own crossfade would run on every page change, which is not what the app asks for.

Three details in there were each arrived at by breaking something first.

**The fades overlap, and they blend additively.** The first version copied the reveal's sequencing from phase 8: exit over 150ms, enter starting at 150ms. Between two pages that leaves an instant where neither snapshot is painted, and the content area flashes empty — visible in a frozen frame at t=150ms as a blank white rectangle under the header. Making the fades merely overlap fixes the blank but not the wash: two half-transparent layers cover less than one opaque one, and a sweep of the resolved opacities bottomed out at 0.35 coverage in the middle of the transition. Complementary linear opacities plus `mix-blend-mode: plus-lighter` hold the painted result at full opacity from start to finish. This is what the browser's own crossfade does; overriding `animation` is exactly what drops it, and Chromium names the animation it drops `-ua-mix-blend-mode-plus-lighter` if you go looking.

**The group is pinned.** `::view-transition-group(page)` would otherwise animate from the outgoing page's box to the incoming one's, and the two pages rarely have the same height, so the content's bottom edge would drift around underneath the slide.

**The offset is 60px.** A full-width slide would be wrong here — these are not screens in a stack, they are pages in a document, and a small displacement is enough to say which way the hierarchy moved.

### Everything else has to stand down

Sliding a named page has a consequence that is easy to miss until something looks wrong: **any other `<ViewTransition>` that activates during the navigation is named out of the page snapshot**, so it stops sliding with the page and leaves a hole where it used to be. The Suspense reveal and the search crossfade are both capable of activating mid-navigation, so both are gated on the type:

```ts
export function exceptNavigation(className: string) {
  return { "nav-forward": "none", "nav-back": "none", default: className };
}
```

A Suspense boundary resolving after the navigation still gets `slide-up`, because that transition carries no type and falls through to `default`. One resolving _during_ a navigation gets `none` and rides the page snapshot with everything else.

### Anchoring the header

This was not planned. It came out of the first frozen frame of a forward navigation: the outgoing category grid was being **painted across the header bar**. The header sits outside `PageContainer`, so once the slide moved onto the `page` boundary it was already excluded from the snapshot that moves — but it keeps its own `view-transition-name` from an earlier phase, and the rules below are what hold that separate snapshot still rather than letting the browser crossfade it on every navigation.

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

Naming it gives it a group of its own, `z-index` puts that group above the sliding page, and `animation: none` holds it still — it is the fixed reference point the slide is read against, so it must not move. `display: none` on the old snapshot avoids two headers being briefly visible while both are in the tree.

## Measuring it

A view transition is unusually hard to assert on. It runs on pseudo-elements in a temporary tree that is torn down before the navigation settles, it leaves nothing in the DOM, and by the time a test can query anything it is over. The instrument is a wrapper installed with `page.addInitScript`, so it is in place before any app code runs:

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

`ready` is the single moment where every layer is observable at once: the types that were passed in, the pseudo-element tree the browser built, and the animations the stylesheet matched. Three things are recorded because none is sufficient alone. The **types** prove the tag on the link reached the transition. The **pseudo-elements** prove the browser built the tree the stylesheet expects — exactly one `old(page)` and one `new(page)`, and no generated `_t_N_` name beside them. The **resolved first keyframe** of `nav-slide` is read straight off `effect.getKeyframes()` and is the only place `nav-forward` and `nav-back` are distinguishable, since both run the same keyframes with the sign flipped: `-60px` forward, `60px` back.

Two things cost time here and are worth writing down.

**`KeyframeEffect.pseudoElement` reports the transition _name_, not the class.** The first version of the spec asserted on `::view-transition-old(.nav-forward)` and got `::view-transition-old(_t_0_)` — a generated name, because an unnamed `<ViewTransition>` has one. Three tests failed against a correct implementation. A throwaway probe confirmed the types were arriving and the computed `viewTransitionClass` was `nav-forward`; the assertions were wrong, not the code.

**Page loads run transitions of their own.** Every Suspense boundary that resolves is one, and they land after the content they revealed is already on screen. An assertion that grabs "the next transition" intermittently gets one of those instead of the navigation. A `settle()` helper polls until the recorded count stops growing before the action runs.

### Screenshots have to be frozen, and Playwright cannot take them

Headless screenshots taken after a transition were all identical, because the overlay tree is gone by then. Freezing every `::view-transition*` animation at its midpoint inside `ready` makes the mid-transition frame deterministic:

```js
for (const a of document.getAnimations()) {
  a.pause();
  a.currentTime = endTime * 0.5;
}
```

This deadlocks if it catches the initial load's reveal — the frozen overlay leaves `<html>` intercepting pointer events forever, and the next `.click()` times out — so the freeze is behind a flag set immediately before the click.

It also produced two wrong diagnoses worth recording.

The first: the outgoing page looked vertically offset, and the hypothesis was that the group's size morph was squashing it, so a rule was added to stop that. Re-measuring produced a **byte-identical** frame — the offset was Playwright having scrolled the home page down to reach the link. The rule was reverted, and the measurement redone at a viewport tall enough that no scroll was needed.

The second is worse, because the instrument itself was lying. Setting `currentTime = endTime * 0.5` on every animation independently puts the 150ms exit fade at 75ms and the 210ms enter fade at 180ms **at the same instant**, which manufactures an overlap the sequenced animation never has. Both engines' frozen frames looked broken, and neither was evidence of anything.

Then the fallback instruments turned out to be no better. Playwright's `page.screenshot` is slower than a 400ms transition and always lands on the settled page, and `recordVideo` at 25fps shows a **single-frame swap with no animation in it at all** — in Chromium as well as WebKit. Playwright's capture does not include the view transition layer. That is worth stating flatly, because a clean-looking recording was used earlier in this phase as evidence that Safari was fine, and it was never evidence of anything.

What does work is going outside the browser entirely: launch headed, freeze the transition at a chosen absolute time, raise the window, and let the operating system's own screen capture take the frame. macOS `screencapture` photographs what the compositor actually put on the display, view transition layer included. That is the instrument that produced every visual claim in this write-up, and it is the one that caught the blank frame the structural probes were blind to — `getAnimations()` reported four healthy animations at t=150ms and every one of them was resolving to opacity 0.

So there are two instruments and they answer different questions. **Structural introspection** — `document.getAnimations()` at `ready`, `pseudoElement`, `getKeyframes()`, `getComputedTiming()` — answers _did the right animations get created_. **An OS-level screenshot of a frozen frame** answers _does anything reach the screen_. The first is what the e2e suite can assert; the second is what tells you the feature works. Passing the first and skipping the second is how this phase shipped a PR in which no transition was visible in any browser.

### The phase-8 open question, answered

The Suspense reveal **does** animate on a cold product load. The same probe that diagnosed the class mismatch showed a second, untagged transition with two exit/enter pairs — the skeleton handing off to the content. It is now a test: a cold `/product/iphone-9-1` runs a transition with the `reveal-slide` and `reveal-fade` keyframes and no `nav-slide` anywhere in it, because a Suspense boundary resolving is not a navigation and the page must not slide underneath it.

## The Safari regression, and why the first design could not survive it

The phase was written, tested, documented and merged into a PR before anyone opened it in Safari. It was broken there: the outgoing page and the incoming page were drawn **on top of each other at full opacity** for the whole navigation, text colliding, both product grids visible at once.

### What the first design did

`PageContainer` was wrapped in `<ViewTransition enter={NAV_DIRECTION} exit={NAV_DIRECTION} default="none">`. That is the textbook use of the two triggers, and it activates the boundary, so React assigns it a `view-transition-name` — a generated one, because the boundary is unnamed. A navigation unmounts one page and mounts another, so React generates **two** names: `_t_0_` for the outgoing container, `_t_1_` for the incoming one. Both carry the `nav-forward` class, and the CSS animated `::view-transition-old(.nav-forward)` and `::view-transition-new(.nav-forward)`.

That relies on an assumption nobody states out loud: that a name which exists only in the old DOM produces only an old snapshot, and a name which exists only in the new DOM produces only a new one.

### What Safari actually does

Reading `document.getAnimations()` at `ready` in real Safari, for a single `home → /category/beauty` navigation:

| pseudo-element | Safari                                | Chrome |
| -------------- | ------------------------------------- | ------ |
| `old(_t_0_)`   | `nav-fade` 0/150, `nav-slide` 0/400   | same   |
| `new(_t_0_)`   | `nav-fade` 150/210, `nav-slide` 0/400 | absent |
| `old(_t_1_)`   | `nav-fade` 0/150, `nav-slide` 0/400   | absent |
| `new(_t_1_)`   | `nav-fade` 150/210, `nav-slide` 0/400 | same   |

Same types in both, same classes, same delays and durations — and **four** snapshots in Safari where Chrome has two. Safari builds both halves of the pair for both names. So `new(_t_0_)` fades the _outgoing_ page back in over the top of everything, and `old(_t_1_)` fades the _incoming_ page out from underneath it. Two full-page snapshots animating in each direction is exactly the double exposure on screen.

Nothing in the CSS was wrong. The design was wrong: it assumed a snapshot count the spec does not guarantee.

### The root dead end

`root` looks like the obvious answer, and it is the answer outside React. **It is the one name with exactly one old and one new snapshot by construction, in every engine** — not a name React assigns or the app invents, but the browser's own snapshot of everything that has no other name. There is no second pair for an engine to produce.

So the slide moved onto `root`, the boundary in `PageContainer` dropped to `default="none"` so the page would stay _inside_ that snapshot, and the direction reached the CSS through `:active-view-transition-type()`. The structural probes were green, the suite passed in both engines, the write-up was updated and the PR body with it.

Opened in a browser, **nothing animated at all** — not in Safari, and not in Chrome either. The double exposure was gone because the transition was gone.

Chromium reported no `::view-transition-new(root)` animation whatsoever, while WebKit reported one. Neither engine's behaviour was the cause. A minimal standalone page with the same CSS and a hand-written `document.startViewTransition({ update, types: ['fwd'] })` produced `old(root)` and `new(root)` correctly in both, which put the difference inside the app. Reading `getComputedStyle(document.documentElement).viewTransitionName` during the transition found `none` in FakeShop and `root` in the minimal page, and a `MutationObserver` on `<html>` caught who was doing it:

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

Measured in the running app, at `ready`, in both engines: `::view-transition-group(root)` at `opacity: 0`, the `::view-transition` overlay at `0px × 0px`, `<html>` unnamed. That accounts for both symptoms at once. Chromium loses the new root snapshot because the root has no name when the new state is captured, so there is nothing for the CSS to attach an animation to. WebKit still builds `old(root)` and `new(root)` and runs `nav-fade` and `nav-slide` on both — and paints neither, because they are inside a group pinned to zero opacity.

It is deliberate. React cancels the root exactly when nothing else claimed it:

```js
if (!viewTransitionContextChanged && !rootViewTransitionAffected) {
  cancelRootViewTransitionName(root.containerInfo);
}
```

React's model is that you animate named boundaries and it takes the root off the table so its own boundaries are the only thing moving. `default="none"` guarantees no boundary activates, which guarantees the branch is taken. **The two halves of the design were mutually exclusive**, and every instrument in use at the time reported on one half only.

### The fix

A single stable `name` on the page boundary:

```tsx
<ViewTransition name="page">
```

One name on both sides of the navigation means one group, one image-pair, one `old(page)` and one `new(page)` — the same structural guarantee `root` offered, on a boundary React has no reason to cancel. The CSS moved from `root` to `page` unchanged in shape. The `NAV_FORWARD` and `NAV_BACK` arrays on the links never moved at all.

Verified structurally in both engines — identical pseudo-element trees, identical resolved opacities and translations at every 10ms step across the 400ms — and then verified visually, with the transition frozen and photographed by the OS rather than by Playwright. At t=0 the address bar reads `/category/beauty` and the screen shows the home page, which is the outgoing snapshot painting and the only proof that matters.### What should have caught it

A `webkit` project in the Playwright config, which the suite now has. Two caveats came out of adding it, and both are recorded in the config rather than left as folklore:

- **The suite could not reproduce the original bug.** Playwright's WebKit showed the same four-snapshot structure real Safari does, but the frozen frames and the video never rendered it, for the capture reason above. What the suite _can_ do is assert the structure: the forward test now fails unless the navigation builds exactly one `old(page)` and one `new(page)` and no generated `_t_N_` name at all, which is the shape the bug needed.
- **`instant()` does not work in WebKit.** The navigation lock never engages, the dynamic data streams in as usual, and every skeleton assertion in `instant-navigation.test.ts` quietly describes a fully rendered page instead of a shell. Four tests failed outright and one passed for the wrong reason, so that file is scoped to Chromium. A test that passes for the wrong reason is worse than one that does not run.

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
- **26 e2e runs across two engines** — 13 in Chromium, and 13 in WebKit of which 6 are the Chromium-only `instant()` specs and therefore skipped, leaving 20 that actually execute.
- `npm run lint` and `npm run typecheck` clean.

The five new assertions are: a forward link carries `nav-forward`, runs the slide, resolves the keyframe to `-60px` and builds exactly one `old(page)` and one `new(page)` with no generated `_t_N_` name; a back link carries `nav-back` and resolves it to `60px`; a link out of the catalog carries no type and no slide; a query-only change crossfades `search-results` with no slide; and the Suspense reveal runs its own keyframes with no slide underneath.

Beyond the suite, in both engines: the pseudo-element tree is `group(page)`, `old(page)` and `new(page)` and nothing else page-shaped; the resolved opacities and translations match to five decimal places at every 10ms step; and OS-level screenshots of the frozen transition at t=0 and t=130ms show the outgoing page alone and then the two pages cross-blended over an opaque background, with the header stationary in both.

One of those is a small trap worth noting: the "leaves the catalog" test clicks the account icon and lands on `/login`, because `/account` redirects a logged-out visitor. The redirect target renders a `PageContainer` too, so it is still the untagged path being asserted.

## Key files

- [`src/utils/viewTransitions.ts`](../src/utils/viewTransitions.ts) — the two type arrays and `exceptNavigation()`
- [`src/components/Layout.tsx`](../src/components/Layout.tsx) — `PageContainer`, the `name="page"` boundary every page mounts
- [`src/app/(shop)/search/page.tsx`](<../src/app/(shop)/search/page.tsx>) — the keyed crossfade
- [`src/components/Reveal.tsx`](../src/components/Reveal.tsx) — the Suspense handoff, standing down during a navigation
- [`src/app/globals.css`](../src/app/globals.css) — the page slide, the type gating and the header anchoring
- [`e2e/view-transitions.test.ts`](../e2e/view-transitions.test.ts) — the `startViewTransition` recorder and the five assertions
- [`playwright.config.ts`](../playwright.config.ts) — the `webkit` project
- [`vitest.setup.ts`](../vitest.setup.ts) — the `<ViewTransition>` passthrough for the stable React

## Learning outcomes

- **Transition types are the channel for information the React tree does not contain.** Direction is the canonical example: forward and back produce identical commits, so no trigger, name or class can distinguish them. The type is attached to the transition rather than to an element.
- The trigger decides **whether** a boundary animates; the type decides **which** animation. A type reaches the CSS either through a `ViewTransitionClassPerType` map on the trigger or, with no React involvement at all, through `:active-view-transition-type()`.
- **Give a whole-page transition one stable name.** What matters is that the outgoing and incoming pages resolve to the _same_ name, so the engine has one old and one new snapshot and no room to invent more. A boundary that names its two halves separately is where Safari and Chrome diverge: Safari builds both halves of the pair for both names, so four full-page snapshots exist where the CSS assumed two and both pages draw at once.
- **`root` is not available to a React app.** React calls `cancelRootViewTransitionName` whenever no `<ViewTransition>` boundary activates, which unnames `<html>`, pins `::view-transition-group(root)` to `opacity: 0` and sizes the `::view-transition` overlay to zero. CSS written against `root` is never painted. `root` is the right answer everywhere else, and it looks right here until you open a browser.
- **`default="none"` is not the same as no boundary.** React only starts a view transition when a `<ViewTransition>` is part of the update, and `"none"` starts one without naming the element. It is a real distinction — and it is also precisely the condition that makes React cancel the root, so the two cannot be combined.
- **Naming an element removes it from the snapshot that contains it.** That is the mechanism behind both the header anchoring and `exceptNavigation()`: useful when it is deliberate, a hole in the page when it is not.
- **Overriding `animation` on a view transition snapshot throws away the blend mode too.** The UA crossfade runs complementary opacities under `mix-blend-mode: plus-lighter` so the composite stays fully opaque. Replace the animation and you own that problem: sequential fades leave a frame with nothing painted, and overlapping ones without the blend mode wash out towards the middle.
- **Opting in per link is the correct default.** A direction is a claim about the app's hierarchy, and only the link knows if it is going up or down. Everything untagged matches no type rule and animates not at all, which is why the browser back button and the cart stay still.
- **A same-route transition needs a `key`.** Without a remount there is no old/new pair, and React updates in place with nothing to animate.
- **Playwright cannot see a view transition, but the operating system can.** Playwright's screenshots land after the transition and its video does not capture the layer, in either engine. Freezing the animations at a chosen absolute time in a headed browser and calling macOS `screencapture` does photograph it, because that reads the compositor's output rather than the page's.
- **Structural evidence and visual evidence are different claims, and this phase confirmed it the expensive way.** `getAnimations()` at `ready` proves the right animations were _created_. It says nothing about whether they _paint_ — a root-based design passed every structural assertion in two engines while being completely invisible, and an overlapping-fade design passed them while flashing a blank frame. Anything user-facing needs the second check before it is called done.
- **Measure again before believing a diagnosis, and check the instrument first.** The "squashed page" was Playwright's scroll position. The "overlapping fades" in the frozen frames were the freeze itself, which puts two animations of different lengths at different points of their own timelines at the same instant. Neither was a defect in the app.
- `KeyframeEffect.pseudoElement` reports the transition **name**, not the class. For an unnamed boundary that is a generated string like `_t_0_`, so it cannot be asserted against — but its _presence_ is worth asserting against, since a page split across two generated names is exactly the regression this phase fixed.
- **A cross-engine test project is not optional for CSS this new.** Everything shipped green in Chromium and was visibly broken in Safari. Engine support for recent CSS lands at very different times and the failure mode is silent.
- **This repo runs two Reacts, and now it is visible.** The App Router uses the canary Next bundles; the unit tests use the stable one at the project root. They can diverge on canary APIs, and they cannot be forced together from the bundler, because Testing Library resolves `react-dom` through Node where aliases do not reach.
