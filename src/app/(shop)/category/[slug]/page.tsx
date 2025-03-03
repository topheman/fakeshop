import { Suspense } from "react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { PageContainer } from "@/components/Layout";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductGridLoading } from "@/components/ProductGridLoading";
import { getProductsByCategory } from "@/lib/api";
import { slugToDisplayName } from "@/utils/slugUtils";

// Async child component
async function CategoryContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  console.log("* CategoryPage", { slug });

  try {
    const { products } = await getProductsByCategory(slug);

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
  } catch (error) {
    console.error("Error fetching category products:", error);
    return (
      <p className="mt-4">Error loading products. Please try again later.</p>
    );
  }
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
