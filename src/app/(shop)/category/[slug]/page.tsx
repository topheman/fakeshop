import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { PageContainer } from "@/components/Layout";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductGridLoading } from "@/components/ProductGridLoading";
import { getProductsByCategory } from "@/lib/catalog";
import { slugToDisplayName } from "@/utils/slugUtils";

/**
 * Reads `params`, which is request-time data. This is the cache boundary:
 * nothing above it can be cached, and everything below it is a pure function
 * of `slug`.
 */
async function CategoryContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  console.log("* CategoryPage", { slug });

  return <CategoryProducts slug={slug} />;
}

/**
 * Caches the rendered output, not just the fetch underneath it.
 *
 * It carries the same tags as `getProductsByCategory` on purpose. A cached
 * component holds the result of the whole subtree, so invalidating only the
 * data entry would leave this one serving the old markup — an outer scope with
 * an explicit `cacheLife` never re-reads an inner one until its own entry goes.
 */
async function CategoryProducts({ slug }: { slug: string }) {
  "use cache";
  cacheTag("products", `category:${slug}`);

  let products;
  try {
    ({ products } = await getProductsByCategory(slug));
  } catch (error) {
    console.error("Error fetching category products:", error);
    // Never cache a failure for an hour. `seconds` expires after a minute,
    // which also keeps the error out of any prerender.
    cacheLife("seconds");
    return (
      <p className="mt-4">Error loading products. Please try again later.</p>
    );
  }
  cacheLife("hours");

  return (
    <>
      <h1 className="mb-8 flex items-center text-3xl font-bold text-primary">
        <span className="mr-2">{slugToDisplayName(slug)}</span>
        <CategoryIcon category={slug} className="size-6" />
      </h1>
      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <p>No products found in this category.</p>
      )}
    </>
  );
}

// Sync root component
export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <PageContainer>
      <Suspense fallback={<ProductGridLoading />}>
        <CategoryContent params={params} />
      </Suspense>
    </PageContainer>
  );
}
