import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";

import { getCategories } from "@/lib/catalog";
import { NAV_FORWARD } from "@/utils/viewTransitions";

import { CategoryIcon } from "./CategoryIcon";

/**
 * Takes no props, so it has exactly one cache entry — the whole nav renders
 * once and every route that mounts it reuses the same markup.
 *
 * The links prefetch, despite there being 24 of them. A prefetch only asks for
 * the App Shell of `/category/[slug]`, which is one artifact shared by every
 * tile whatever its slug, so the grid costs 5 requests and ~3.8 KB in total —
 * the router never even reaches the other 19 links.
 */
export async function CategoryList() {
  "use cache";
  cacheLife("max");
  cacheTag("categories");
  console.log("  CategoryList");
  const categories = await getCategories();

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-2xl font-semibold">Categories</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            transitionTypes={NAV_FORWARD}
            className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-gray-50"
            title={category.name}
          >
            <CategoryIcon
              category={category.slug}
              className="mb-2 size-8 text-gray-600"
            />
            <span className="text-center text-sm">{category.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
