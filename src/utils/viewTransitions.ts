/**
 * Pairs a product image across a navigation. The grid thumbnail, the loading
 * placeholder and the product hero resolve it from the same id, so the browser
 * treats them as one element moving.
 */
export function productImageTransitionName(id: number): string {
  return `product-image-${id}`;
}
