import { expect, test, type Page } from "@playwright/test";

/**
 * A view transition leaves nothing behind to assert on: it runs on pseudo-
 * elements in an overlay torn down before the navigation settles, and neither
 * engine's Playwright capture includes that layer. So `startViewTransition` is
 * wrapped before app code runs, and `ready` is read — the one moment where the
 * types, the pseudo-element tree and the matched animations are all observable.
 *
 * All three are needed: the types prove the link's tag arrived, the pseudo-
 * elements prove the tree is the one the stylesheet expects, and the resolved
 * keyframe is the only place forward and back differ.
 *
 * `KeyframeEffect.pseudoElement` reports the transition *name*, not the class —
 * for an unnamed boundary a generated string like `_t_1_`.
 */
type RecordedTransition = {
  types: string[];
  animationNames: string[];
  pseudoElements: string[];
  /** Where `::view-transition-old(page)` starts its slide, e.g. `-60px`. */
  pageSlideFrom: string | null;
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
        pageSlideFrom: null,
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
              pseudoElement === "::view-transition-old(page)" &&
              name === "nav-slide"
            ) {
              const from = effect?.getKeyframes()[0] as
                | { translate?: string }
                | undefined;
              recorded.pageSlideFrom = from?.translate ?? null;
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
  expect(transition.pageSlideFrom).toContain("-60px");
  // The regression guard. One old and one new, both under the same name: a
  // boundary that names its two halves separately makes Safari build a second
  // pair of snapshots and draw both pages at once.
  // Deduplicated, because each snapshot carries both keyframe animations.
  const pageSnapshots = [
    ...new Set(transition.pseudoElements.filter((p) => p.endsWith("(page)"))),
  ].sort();
  expect(pageSnapshots).toEqual([
    "::view-transition-new(page)",
    "::view-transition-old(page)",
  ]);
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
  expect(transition.pageSlideFrom).toBe("60px");
  await expect(page).toHaveURL("/category/smartphones");
});

test("a link that leaves the catalog carries no direction", async ({
  page,
}) => {
  await page.goto("/");
  // The user icon steps out of the hierarchy rather than through it, so it is
  // deliberately untagged. With no type on the transition, none of the
  // `:active-view-transition-type()` rules match and the page swaps in place.
  const transition = await transitionFrom(page, async () => {
    await page.locator("header").getByTitle("Not logged in").click();
  });

  expect(transition.types).toEqual([]);
  expect(transition.animationNames).not.toContain("nav-slide");
  expect(transition.pageSlideFrom).toBeNull();
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
