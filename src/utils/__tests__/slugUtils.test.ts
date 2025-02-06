import { generateProductSlug, extractProductIdFromSlug } from "../slugUtils"

describe("slugUtils", () => {
  describe("generateProductSlug", () => {
    it("should generate a valid slug from a product name and ID", () => {
      expect(generateProductSlug("iPhone 12 Pro", 123)).toBe("iphone-12-pro-123")
      expect(generateProductSlug("Wireless Headphones (2023 Edition)", 456)).toBe(
        "wireless-headphones-2023-edition-456",
      )
      expect(generateProductSlug("Special $#@! Characters", 789)).toBe("special-characters-789")
    })
  })

  describe("extractProductIdFromSlug", () => {
    it("should extract the correct product ID from a slug", () => {
      expect(extractProductIdFromSlug("iphone-12-pro-123")).toBe(123)
      expect(extractProductIdFromSlug("wireless-headphones-2023-edition-456")).toBe(456)
      expect(extractProductIdFromSlug("special-characters-789")).toBe(789)
    })

    it("should return -1 for invalid slugs", () => {
      expect(extractProductIdFromSlug("invalid-slug")).toBe(-1)
      expect(extractProductIdFromSlug("no-number-at-end-")).toBe(-1)
    })
  })
})

