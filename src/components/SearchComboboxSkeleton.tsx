import { Search } from "lucide-react";

export function SearchComboboxSkeleton() {
  return (
    <form
      role="search"
      action="/search"
      data-prerender-hint="basic version prerendered"
    >
      <div className="relative mx-4 max-w-md grow">
        <div className="w-full cursor-default rounded-lg bg-white sm:text-sm">
          <input
            className="w-full rounded-lg border-none bg-white py-2 pl-3 pr-10 text-[16px] leading-5 text-gray-900 focus:outline-none focus:ring-0 sm:text-sm md:min-w-[400px]"
            placeholder="Search products..."
            type="text"
            name="q"
          />
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-2"
            type="button"
          >
            <Search className="size-5 text-gray-400" aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}
