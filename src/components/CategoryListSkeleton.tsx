/** Matches the grid in `CategoryList`: 24 tiles, an icon and a label each. */
export function CategoryListSkeleton() {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-2xl font-semibold">Categories</h2>
      <div className="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 24 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col items-center rounded-lg border p-4"
          >
            <div className="mb-2 size-8 rounded bg-gray-200" />
            <div className="h-5 w-20 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
