import Link from "next/link";

import { getCategories } from "@/lib/api";

import { CategoryIcon } from "./CategoryIcon";

export default async function CategoryList() {
  const categories = await getCategories();

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-2xl font-semibold">Categories</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-gray-50"
            title={category.name}
            prefetch={false}
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
