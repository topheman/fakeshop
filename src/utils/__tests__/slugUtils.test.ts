import {
  generateProductSlug,
  extractProductIdFromSlug,
  slugToDisplayName,
} from "../slugUtils";

describe("generateProductSlug", () => {
  it("should generate a valid slug from product name and id", () => {
    expect(generateProductSlug("iPhone 9", 1)).toBe("iphone-9-1");
    expect(generateProductSlug("Samsung Universe 9", 2)).toBe(
      "samsung-universe-9-2",
    );
    expect(generateProductSlug("Special! Product @ Store", 3)).toBe(
      "special-product-store-3",
    );
  });
});

describe("extractProductIdFromSlug", () => {
  it("should extract product id from valid slugs", () => {
    expect(extractProductIdFromSlug("iphone-9-1")).toBe(1);
    expect(extractProductIdFromSlug("samsung-universe-9-2")).toBe(2);
    expect(extractProductIdFromSlug("special-product-store-3")).toBe(3);
  });

  it("should return -1 for invalid slugs", () => {
    expect(extractProductIdFromSlug("invalid-slug")).toBe(-1);
    expect(extractProductIdFromSlug("")).toBe(-1);
    expect(extractProductIdFromSlug("product-abc")).toBe(-1);
  });
});

describe("slugToDisplayName", () => {
  it("should convert simple slugs to display names", () => {
    expect(slugToDisplayName("smartphones")).toBe("Smartphones");
    expect(slugToDisplayName("laptop")).toBe("Laptop");
  });

  it("should handle multi-word slugs", () => {
    expect(slugToDisplayName("mens-watches")).toBe("Mens Watches");
    expect(slugToDisplayName("home-decoration")).toBe("Home Decoration");
    expect(slugToDisplayName("kitchen-accessories")).toBe(
      "Kitchen Accessories",
    );
  });

  it("should handle empty and single-character inputs", () => {
    expect(slugToDisplayName("")).toBe("");
    expect(slugToDisplayName("a")).toBe("A");
  });
});
