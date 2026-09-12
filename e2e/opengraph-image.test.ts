import { expect, test } from "@playwright/test";

/**
 * The route this replaced returned its failures through a `catch` as a plain
 * 500, so a broken image looked like a working deployment from everywhere
 * except a social card preview. These assertions read the bytes.
 */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test.describe("opengraph image", () => {
  test("serves a 1200x630 PNG", async ({ request }) => {
    const response = await request.get("/opengraph-image");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");

    const body = await response.body();
    expect(body.subarray(0, 4)).toEqual(PNG_MAGIC);

    // Width and height are big-endian uint32s in the IHDR chunk, which PNG
    // requires to be first: 8 bytes of signature, then 8 of chunk header.
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });

  test("is referenced by the home page metadata", async ({ page }) => {
    await page.goto("/");

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /\/opengraph-image(\?|$)/);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      /\/opengraph-image(\?|$)/,
    );
  });
});
