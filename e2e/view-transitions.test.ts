import { expect, test, type Page } from "@playwright/test";

/**
 * A view transition leaves nothing behind to assert on: it runs on
 * `::view-transition-*` pseudo-elements in an overlay tree that is torn down
 * before the navigation settles. So the suite records each one as it happens.
 * `document.startViewTransition` is wrapped before any app code runs, and the
 * `ready` promise is the single moment where the transition types, the classes
 * React resolved from them, and the animations the CSS matched are all
 * observable at once.
 *
 * Two things are captured because neither is sufficient alone. The class on the
 * page container proves the type reached the right branch of `NAV_DIRECTION` —
 * it is the only place `nav-forward` and `nav-back` are distinguishable, since
 * both run the same keyframes with a different offset. The animation names
 * prove the stylesheet actually matched that class rather than the browser
 * falling back to its own crossfade.
 *
 * Note that `KeyframeEffect.pseudoElement` reports the transition *name*, which
 * for an unnamed `<ViewTransition>` is a generated string like `_t_1_`. It is
 * not the class, so it cannot be asserted against.
 */
type RecordedTransition = {
  types: string[];
  pageTransitionClass: string | null;
  animationNames: string[];
  pseudoElements: string[];
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
        pageTransitionClass: null,
        animationNames: [],
        pseudoElements: [],
      };
      window.__viewTransitions.push(recorded);

      const types = (update as { types?: Iterable<string> })?.types;
      if (types) recorded.types = Array.from(types);

      const transition = start(
        update as Parameters<typeof document.startViewTransition>[0],
      );
      transition.ready.then(
        () => {
          // The single element `PageContainer` renders, and the only one the
          // directional slide is attached to.
          const container = document.querySelector("main > div");
          if (container) {
            recorded.pageTransitionClass =
              getComputedStyle(container).viewTransitionClass ?? null;
          }
          for (const animation of document.getAnimations()) {
            const pseudoElement = (animation.effect as KeyframeEffect | null)
              ?.pseudoElement;
            if (!pseudoElement?.startsWith("::view-transition")) continue;
            recorded.pseudoElements.push(pseudoElement);
            recorded.animationNames.push(
              (animation as CSSAnimation).animationName,
            );
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
  expect(transition.pageTransitionClass).toBe("nav-forward");
  expect(transition.animationNames).toContain("nav-slide");
  expect(transition.animationNames).toContain("nav-fade");
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
  expect(transition.pageTransitionClass).toBe("nav-back");
  expect(transition.animationNames).toContain("nav-slide");
  await expect(page).toHaveURL("/category/smartphones");
});

test("a link that leaves the catalog carries no direction", async ({
  page,
}) => {
  await page.goto("/");
  // The user icon steps out of the hierarchy rather than through it, so it is
  // deliberately untagged and falls through `NAV_DIRECTION`'s `default: none`.
  const transition = await transitionFrom(page, async () => {
    await page.locator("header").getByTitle("Not logged in").click();
  });

  expect(transition.types).toEqual([]);
  expect(transition.pageTransitionClass).toBe("none");
  expect(transition.animationNames).not.toContain("nav-slide");
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
    await page.getByPlaceholder("Search products...").fill("laptop");
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
  expect(reveal?.pageTransitionClass).toBe("none");
});
