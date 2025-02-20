import { PageContainer } from "@/components/Layout";
import ProductGrid from "@/components/ProductGrid";
import { getProductsByCategory } from "@/lib/api";
import { slugToDisplayName } from "@/utils/slugUtils";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const { products } = await getProductsByCategory(slug);

    return (
      <PageContainer>
        <h1 className="mb-8 text-3xl font-bold text-primary">
          {slugToDisplayName(slug)}
        </h1>
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p>No products found in this category.</p>
        )}
      </PageContainer>
    );
  } catch (error) {
    console.error("Error fetching category products:", error);
    return (
      <PageContainer>
        <p className="mt-4">Error loading products. Please try again later.</p>
      </PageContainer>
    );
  }
}
