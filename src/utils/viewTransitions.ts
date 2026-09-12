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
 *
 * The types themselves are what the `:active-view-transition-type()` rules in
 * `globals.css` match; nothing here maps them onto view transition classes.
 */
export const NAV_FORWARD = ["nav-forward"];
export const NAV_BACK = ["nav-back"];

/**
 * A view transition class that applies to everything except a directional
 * navigation. The directional slide animates the page container's snapshot, and
 * any element a nested `<ViewTransition>` activates is named out of it, so an
 * animation about something else — a Suspense handoff, a search query changing
 * in place — has to stand down during a navigation or it punches a hole in the
 * page as it slides.
 */
export function exceptNavigation(className: string) {
  return { "nav-forward": "none", "nav-back": "none", default: className };
}
