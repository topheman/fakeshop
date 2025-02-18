export function generateProductSlug(
  productName: string,
  productId: number,
): string {
  // Convert the product name to lowercase and replace spaces and special characters with hyphens
  const nameSlug = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Append the product ID to the name slug
  return `${nameSlug}-${productId}`;
}

export function extractProductIdFromSlug(slug: string): number {
  const parts = slug.split("-");
  const id = Number.parseInt(parts[parts.length - 1], 10);
  return isNaN(id) ? -1 : id;
}

export function slugToDisplayName(slug: string): string {
  // Replace hyphens with spaces and capitalize each word
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
