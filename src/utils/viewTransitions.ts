/**
 * The transition name that pairs a product image across a navigation. The grid
 * thumbnail, the loading shell's placeholder and the product page's hero all
 * resolve it from the same product id, which is what makes the browser treat
 * them as one element moving rather than three unrelated images.
 */
export function productImageTransitionName(id: number): string {
  return `product-image-${id}`;
}
