import { expect, test, type Page } from "@playwright/test";

/**
 * A view transition leaves nothing behind to assert on: it runs on
 * `::view-transition-*` pseudo-elements in an overlay tree that is torn down
 * before the navigation settles. So the suite records each one as it happens.
 * `document.startViewTransition` is wrapped before any app code runs, and the
 * `ready` promise is the single moment where the transition types, the
 * pseudo-elements the browser built, and the animations the CSS matched are all
 * observable at once. Screenshots and video are not an option — neither
 * Chromium's nor WebKit's Playwright capture includes the view transition
 * layer, so a recorded navigation looks like an instant swap either way.
 *
 * Three things are captured because none is sufficient alone. The types prove
 * the tag on the link reached the transition. The pseudo-elements prove the
 * browser built the tree the stylesheet expects — one `root` pair and nothing
 * page-shaped beside it. The resolved keyframe offset is the only place
 * `nav-forward` and `nav-back` are distinguishable, since both run the same
 * keyframes with the sign flipped.
 *
 * Note that `KeyframeEffect.pseudoElement` reports the transition *name*, which
 * for an unnamed `<ViewTransition>` is a generated string like `_t_1_`. It is
 * not the class, so it cannot be asserted against.
 */
type RecordedTransition = {
  types: string[];
  animationNames: string[];
  pseudoElements: string[];
  /** Where `::view-transition-old(root)` starts its slide, e.g. `-60px`. */
  rootSlideFrom: string | null;
};

declare global {
  interface Window {
    __viewTransitions: RecordedTransition[];
  }
}

async function recordViewTransitions(page: Page) {
  await page.addInitScript(() => {
    window.__viewTransitions = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = ((update: unknown) => {
      const recorded: RecordedTransition = {
        types: [],
        animationNames: [],
        pseudoElements: [],
        rootSlideFrom: null,
      };
      window.__viewTransitions.push(recorded);

      const types = (update as { types?: Iterable<string> })?.types;
      if (types) recorded.types = Array.from(types);

      const transition = start(
        update as Parameters<typeof document.startViewTransition>[0],
      );
      transition.ready.then(
        () => {
          for (const animation of document.getAnimations()) {
            const effect = animation.effect as KeyframeEffect | null;
            const pseudoElement = effect?.pseudoElement;
            if (!pseudoElement?.startsWith("::view-transition")) continue;
            const name = (animation as CSSAnimation).animationName;
            recorded.pseudoElements.push(pseudoElement);
            recorded.animationNames.push(name);
            if (
              pseudoElement === "::view-transition-old(root)" &&
              name === "nav-slide"
            ) {
              const from = effect?.getKeyframes()[0] as
                | { translate?: string }
                | undefined;
              recorded.rootSlideFrom = from?.translate ?? null;
            }
          }
        },
        () => {
          // A rejected transition records nothing but its types. React aborts
          // rather than animating when the destination is not in the same
          // commit, which is a real outcome rather than a failure.
        },
      );
      return transition;
    }) as typeof document.startViewTransition;
  });
}

/** Every transition recorded so far, oldest first. */
function transitions(page: Page) {
  return page.evaluate(() => window.__viewTransitions);
}

/**
 * Waits until no new transition has been recorded for a beat. Loading a page
 * runs transitions of its own — every Suspense boundary that resolves is one —
 * and they arrive after the content they reveal is already on screen. Without
 * this, one of them lands in the slot reserved for the navigation below.
 */
async function settle(page: Page) {
  let last = -1;
  await expect
    .poll(
      async () => {
        const count = (await transitions(page)).length;
        const stable = count === last;
        last = count;
        return stable;
      },
      { timeout: 10_000, intervals: [400] },
    )
    .toBe(true);
}

/**
 * Runs `action` and returns the transition it started. Animations are collected
 * from a `ready` callback, so the entry exists before it is populated — the
 * wait is for the class, not for the entry.
 */
async function transitionFrom(page: Page, action: () => Promise<void>) {
  await settle(page);
  const before = (await transitions(page)).length;
  await action();
  await expect
    .poll(async () => (await transitions(page)).length, { timeout: 5_000 })
    .toBeGreaterThan(before);
  await page.waitForTimeout(300);
  return (await transitions(page))[before];
}

test.beforeEach(async ({ page }) => {
  await recordViewTransitions(page);
});

test("a link deeper into the catalog slides forward", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Smartphones" }).waitFor();

  const transition = await transitionFrom(page, async () => {
    await page.getByRole("link", { name: "Smartphones" }).click();
  });

  expect(transition.types).toEqual(["nav-forward"]);
  expect(transition.animationNames).toContain("nav-slide");
  expect(transition.animationNames).toContain("nav-fade");
  // Negative on the forward branch, positive on the back one.
  expect(transition.rootSlideFrom).toContain("-60px");
  // The whole page rides the root snapshot. A generated `_t_N_` here would mean
  // it had been named out of root into a group of its own, which is the shape
  // that made Safari build a second pair of snapshots and draw both pages at
  // once.
  expect(transition.pseudoElements.join(" ")).not.toMatch(/\(_t_/i);
  await expect(page).toHaveURL("/category/smartphones");
});

test("a link back up the hierarchy slides the other way", async ({ page }) => {
  await page.goto("/category/smartphones");
  await page
    .getByRole("link", { name: /iPhone/i })
    .first()
    .click();
  await page.getByTitle("View all smartphones products").waitFor();

  const transition = await transitionFrom(page, async () => {
    await page.getByTitle("View all smartphones products").click();
  });

  expect(transition.types).toEqual(["nav-back"]);
  expect(transition.animationNames).toContain("nav-slide");
  expect(transition.rootSlideFrom).toBe("60px");
  await expect(page).toHaveURL("/category/smartphones");
});

test("a link that leaves the catalog carries no direction", async ({
  page,
}) => {
  await page.goto("/");
  // The user icon steps out of the hierarchy rather than through it, so it is
  // deliberately untagged. With no type on the transition, none of the
  // `:active-view-transition-type()` rules match and the root stays put.
  const transition = await transitionFrom(page, async () => {
    await page.locator("header").getByTitle("Not logged in").click();
  });

  expect(transition.types).toEqual([]);
  expect(transition.animationNames).not.toContain("nav-slide");
  expect(transition.rootSlideFrom).toBeNull();
  // `/account` redirects a logged-out visitor, and the redirect target is
  // wrapped in a `PageContainer` too, so it is still the untagged path.
  await expect(page).toHaveURL(/\/login/);
});

test("changing only the query crossfades the results in place", async ({
  page,
}) => {
  await page.goto("/search?q=phone");
  await page.getByRole("heading", { name: /Search Results/ }).waitFor();

  const transition = await transitionFrom(page, async () => {
    const input = page.getByPlaceholder("Search products...");
    await input.click();
    // Typed rather than filled: the combobox opens off the keystrokes, and a
    // programmatic value set leaves WebKit showing no suggestions at all.
    await input.pressSequentially("laptop");
    await page.getByText('Search for "laptop"').click();
  });

  await expect(page).toHaveURL("/search?q=laptop");
  // Named, so the pseudo-element carries the name rather than a generated one.
  expect(transition.pseudoElements.join(" ")).toContain("(search-results)");
  // Same place, different content: no direction, and no page-level slide.
  expect(transition.types).toEqual([]);
  expect(transition.animationNames).not.toContain("nav-slide");
});

test("the loading shell animates its handoff to the content", async ({
  page,
}) => {
  await page.goto("/product/iphone-9-1");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.waitForTimeout(300);

  const all = await transitions(page);
  const reveal = all.find((t) => t.animationNames.includes("reveal-slide"));

  expect(
    reveal,
    "no transition ran the Suspense reveal keyframes",
  ).toBeTruthy();
  expect(reveal?.animationNames).toContain("reveal-fade");
  // The reveal is a Suspense boundary resolving, not a navigation, so the page
  // must not slide underneath it.
  expect(reveal?.animationNames).not.toContain("nav-slide");
});
