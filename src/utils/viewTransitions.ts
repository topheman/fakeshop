/**
 * The transition name that pairs a product image across a navigation. The grid
 * thumbnail, the loading shell's placeholder and the product page's hero all
 * resolve it from the same product id, which is what makes the browser treat
 * them as one element moving rather than three unrelated images.
 */
export function productImageTransitionName(id: number): string {
  return `product-image-${id}`;
}

/**
 * The two directions a tagged navigation can carry, passed to `<Link
 * transitionTypes>` or `router.push(href, { transitionTypes })`.
 *
 * Forward means deeper into the catalog — home to a category, a category or a
 * search result to a product. Back means up towards the root. Everything else
 * stays untagged and animates not at all: the browser's own back button, the
 * cart, checkout. A direction is a claim about the app's hierarchy, so it has
 * to be made link by link rather than inferred.
 */
export const NAV_FORWARD = ["nav-forward"];
export const NAV_BACK = ["nav-back"];

/**
 * Maps those types onto the view transition classes the CSS in `globals.css`
 * targets. Shared by `enter` and `exit`, because a single navigation runs the
 * old page's exit and the new page's enter under the same type.
 */
export const NAV_DIRECTION = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};
