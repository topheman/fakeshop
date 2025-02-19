export function generateProductSlug(name: string, id: number): string {
  // Convert the product name to lowercase and replace spaces and special characters with hyphens
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Append the product ID to the name slug
  return `${slug}-${id}`;
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
