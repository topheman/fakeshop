import Image from "next/image";

export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {/* Generate 8 skeleton cards */}
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="block animate-pulse rounded-lg border p-4 transition-shadow hover:shadow-lg"
        >
          <div className="w-full overflow-hidden rounded-lg bg-gray-200">
            <Image
              src="/placeholder.svg"
              blurDataURL="/placeholder.svg"
              alt={""}
              width={200}
              height={200}
              className="size-full object-cover object-center"
            />
          </div>
          {/* Title skeleton */}
          <div className="mt-4 h-7 w-3/4 rounded bg-gray-300 text-lg font-semibold" />
          {/* Price and button skeleton */}
          <div className="mt-1 flex items-center justify-between text-lg font-medium">
            <div className="h-7 w-24 rounded bg-gray-300" />
            <div className="size-9 rounded-full bg-gray-300" />
          </div>
        </div>
      ))}
    </div>
  );
}
