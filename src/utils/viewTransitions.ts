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
 * The strings are matched by `:active-view-transition-type()` in `globals.css`
 * and are the keys `exceptNavigation()` maps, so renaming one means editing
 * both.
 */
export const NAV_FORWARD = ["nav-forward"];
export const NAV_BACK = ["nav-back"];

/**
 * A view transition class for everything except a directional navigation. Any
 * boundary that activates is named out of the page snapshot and leaves a hole
 * in it as it slides, so the Suspense reveal and the search crossfade stand
 * down. The product image morph opts out of this on purpose: flying out of the
 * sliding page is the effect there.
 */
export function exceptNavigation(className: string) {
  return { "nav-forward": "none", "nav-back": "none", default: className };
}
