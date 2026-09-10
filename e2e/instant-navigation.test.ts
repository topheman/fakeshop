import { instant } from "@next/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * `instant()` freezes the app at the UI a navigation can commit without waiting
 * on the network — the prerendered shell on a page load, the prefetched shell
 * on a click — and releases it when the callback returns. So assertions inside
 * the callback describe the first paint, and assertions after it describe what
 * streamed in behind it.
 *
 * The skeletons are the discriminator: `animate-pulse` only ever appears in a
 * loading fallback, so its presence proves the shell is on screen and its
 * absence proves the real content replaced it.
 */
const skeleton = (page: Page) => page.locator("main .animate-pulse");

/** Product 1 in the dummyjson catalog. Any product would do. */
const productUrl = "/product/essence-mascara-lash-princess-1";
const categoryUrl = "/category/beauty";

/**
 * A prefetch starts when the link enters the viewport, so a click issued the
 * moment the element scrolls into view races it. `instant()` assumes a warm
 * cache and reports a cold one as a blocked navigation, which would make this
 * suite fail for a reason that has nothing to do with the app.
 */
async function warmPrefetch(page: Page, href: string) {
  await page.locator(`a[href="${href}"]`).scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
}

test.describe("app shell", () => {
  test("carries the header on a cold load of a dynamic route", async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto(productUrl);
        await expect(
          page.getByRole("banner").getByRole("link", { name: "Fake Shop" }),
        ).toBeVisible();
        // The signed-out user icon: the `cookies()` read that decides which
        // icon to show sits below it, in a Suspense child.
        await expect(
          page.getByRole("navigation").locator("[data-prerender-hint]"),
        ).toBeVisible();
      },
      { baseURL },
    );
  });
});

test.describe("product page", () => {
  test("paints its shell on a cold load", async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto(productUrl);
        await expect(skeleton(page).first()).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Add to Cart" }),
        ).toHaveCount(0);
      },
      { baseURL },
    );
    await expect(
      page.getByRole("button", { name: "Add to Cart" }),
    ).toBeVisible();
    await expect(skeleton(page)).toHaveCount(0);
  });

  test("is instant from a category page", async ({ page }) => {
    await page.goto(categoryUrl);
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await expect(firstProduct).toBeVisible();
    const href = await firstProduct.getAttribute("href");
    await warmPrefetch(page, href!);

    await instant(page, async () => {
      await firstProduct.click();
      await page.waitForURL((url) => url.pathname === href);
      await expect(skeleton(page).first()).toBeVisible();
    });

    await expect(skeleton(page)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Add to Cart" }),
    ).toBeVisible();
  });
});

test.describe("category page", () => {
  test("paints its shell on a cold load", async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto(categoryUrl);
        await expect(skeleton(page).first()).toBeVisible();
        await expect(page.locator('a[href^="/product/"]')).toHaveCount(0);
      },
      { baseURL },
    );
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
    await expect(skeleton(page)).toHaveCount(0);
  });

  test("is instant from the home page, with the right title", async ({
    page,
  }) => {
    await page.goto("/");
    await warmPrefetch(page, categoryUrl);

    await instant(page, async () => {
      await page.click(`a[href="${categoryUrl}"]`);
      await page.waitForURL((url) => url.pathname === categoryUrl);
      await expect(skeleton(page).first()).toBeVisible();
      // The fallback reads the slug off the URL, so the visitor sees which
      // category they asked for before any product arrives.
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Beauty",
      );
      await expect(page.locator('a[href^="/product/"]')).toHaveCount(0);
    });

    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  });
});

test.describe("home page", () => {
  /**
   * Nothing on `/` is request-time data: the category grid is a `use cache`
   * component with `cacheLife("max")`, so it is prerendered into the shell
   * rather than streamed in behind a fallback.
   */
  test("is fully static, category grid included", async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto("/");
        await expect(
          page.getByRole("heading", { level: 1, name: "Welcome to FakeShop" }),
        ).toBeVisible();
        await expect(page.locator(`a[href="${categoryUrl}"]`)).toBeVisible();
        await expect(skeleton(page)).toHaveCount(0);
      },
      { baseURL },
    );
  });
});
