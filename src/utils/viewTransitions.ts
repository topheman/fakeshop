/**
 * Pairs a product image across a navigation. The grid thumbnail, the loading
 * placeholder and the product hero resolve it from the same id, so the browser
 * treats them as one element moving.
 */
export function productImageTransitionName(id: number): string {
  return `product-image-${id}`;
}

/**
 * The two directions a tagged navigation can carry, passed to `<Link
 * transitionTypes>` or `router.push(href, { transitionTypes })`. Forward is
 * deeper into the catalog, back is up towards the root; everything else stays
 * untagged and does not animate.
 *
 * These are matched by the `:active-view-transition-type()` rules in
 * `globals.css`, not mapped onto view transition classes.
 */
export const NAV_FORWARD = ["nav-forward"];
export const NAV_BACK = ["nav-back"];

/**
 * A view transition class for everything except a directional navigation. Any
 * element a nested `<ViewTransition>` activates is named out of the page
 * snapshot, which punches a hole in the page as it slides.
 */
export function exceptNavigation(className: string) {
  return { "nav-forward": "none", "nav-back": "none", default: className };
}
