import { expect, test, type Page } from "@playwright/test";

/**
 * A view transition leaves nothing behind to assert on: it runs on pseudo-
 * elements in an overlay torn down before the navigation settles, and neither
 * engine's Playwright capture includes that layer. So `startViewTransition` is
 * wrapped before app code runs, and `ready` is read — the one moment where the
 * pseudo-element tree and the matched animations are both observable.
 *
 * `KeyframeEffect.pseudoElement` reports the transition *name*, not the class —
 * for an unnamed boundary a generated string like `_t_1_`.
 */
type RecordedTransition = {
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
        animationNames: [],
        pseudoElements: [],
      };
      window.__viewTransitions.push(recorded);

      const transition = start(
        update as Parameters<typeof document.startViewTransition>[0],
      );
      transition.ready.then(
        () => {
          for (const animation of document.getAnimations()) {
            const effect = animation.effect as KeyframeEffect | null;
            const pseudoElement = effect?.pseudoElement;
            if (!pseudoElement?.startsWith("::view-transition")) continue;
            recorded.pseudoElements.push(pseudoElement);
            recorded.animationNames.push(
              (animation as CSSAnimation).animationName,
            );
          }
        },
        () => {
          // A rejected transition records nothing. React aborts rather than
          // animating when the destination is not in the same commit, which is
          // a real outcome rather than a failure.
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

test.beforeEach(async ({ page }) => {
  await recordViewTransitions(page);
});

/**
 * Polls until a recorded transition matches. A page load runs several — every
 * Suspense boundary that resolves is one — and they arrive after the content
 * they reveal is already on screen, so waiting on the DOM is not enough.
 */
async function waitForTransition(
  page: Page,
  match: (transition: RecordedTransition) => boolean,
  message: string,
) {
  await expect
    .poll(async () => (await transitions(page)).some(match), {
      timeout: 10_000,
      message,
    })
    .toBe(true);
  return (await transitions(page)).find(match)!;
}

test("the loading shell animates its handoff to the content", async ({
  page,
}) => {
  await page.goto("/product/iphone-9-1");
  await page.getByRole("heading", { level: 1 }).waitFor();

  const reveal = await waitForTransition(
    page,
    (t) => t.animationNames.includes("reveal-slide"),
    "no transition ran the Suspense reveal keyframes",
  );

  expect(reveal.animationNames).toContain("reveal-fade");
});

test("the product image morphs from grid thumbnail to hero", async ({
  page,
}) => {
  await page.goto("/category/smartphones");
  await page
    .getByRole("link", { name: /iPhone/i })
    .first()
    .click();
  await page.getByRole("heading", { level: 1 }).waitFor();

  // The morph runs on the second transition, not the navigation: the hero is
  // inside a Suspense boundary, so the pair is the shell's placeholder and the
  // real image, and it only exists once the content resolves.
  const morph = await waitForTransition(
    page,
    (t) => t.pseudoElements.some((p) => p.includes("(product-image-")),
    "no transition named the product image",
  );

  expect(morph.animationNames).toContain("morph-blur");
});
