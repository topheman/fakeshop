"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";
import { Search } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useCallback, useRef } from "react";

import { useSearchProducts } from "@/hooks/products";
import { useIsMobile } from "@/hooks/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";
import { generateProductSlug } from "@/utils/slugUtils";

export function SearchCombobox({ initialQuery = "" }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Use react-query hook for search
  const { data } = useSearchProducts(
    { query },
    { enabled: !!query, networkMode: "always" },
  );
  const suggestions = data?.products ?? [];

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);
      return params.toString();
    },
    [searchParams],
  );

  const handleChange = (value: Product | string | null) => {
    if (value === null) {
      return;
    }

    if (typeof value === "string") {
      // Handle custom search query
      if (pathname === "/search") {
        // If already on search page, update the URL without navigation
        router.push("/search?" + createQueryString("q", value));
      } else {
        router.push(`/search?q=${encodeURIComponent(value)}`);
      }
    } else {
      // Handle product selection
      setSelectedProduct(value);
      const slug = generateProductSlug(value.title, value.id);
      router.push(`/product/${slug}`);
    }
    if (isMobile && inputRef.current) {
      inputRef.current.blur();
    }
    setQuery("");
  };

  return (
    <form role="search" action="/search">
      <div className="relative mx-4 max-w-md grow">
        <Combobox<Product | string | null>
          value={selectedProduct}
          onChange={handleChange}
          onClose={() => setQuery("")}
        >
          <div
            className={cn(
              "w-full cursor-default rounded-lg bg-white sm:text-sm",
              query === "" ? "" : "sm:rounded-b-none",
            )}
          >
            <ComboboxInput<Product>
              className="w-full rounded-lg border-none bg-white py-2 pl-3 pr-10 text-[16px] leading-5 text-gray-900 focus:outline-none focus:ring-0 sm:text-sm md:min-w-[400px]"
              displayValue={() => {
                // If there's a selected product, show empty string (cleared input)
                if (selectedProduct) return "";
                // Otherwise show the search query
                return query;
              }}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products..."
              name="q"
              ref={inputRef}
            />
            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
              <Search className="size-5 text-gray-400" aria-hidden="true" />
            </ComboboxButton>
          </div>

          {query === "" ? null : (
            <ComboboxOptions
              static
              className="fixed inset-x-0 mt-3 max-h-60 overflow-auto bg-white pb-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:absolute sm:inset-x-auto sm:mt-0 sm:w-full sm:rounded-b-md sm:text-sm"
            >
              <>
                <ComboboxOption
                  value={query}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 px-4 ${active ? "bg-[#900000] text-white" : "text-gray-900"}`
                  }
                >
                  {({ selected }) => (
                    <span
                      className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                    >
                      Search for "{query}"
                    </span>
                  )}
                </ComboboxOption>

                {suggestions.map((product) => (
                  <ComboboxOption
                    key={product.id}
                    value={product}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? "bg-[#900000] text-white" : "text-gray-900"
                      }`
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex items-center">
                          <Image
                            src={product.thumbnail || "/placeholder.svg"}
                            alt={product.title}
                            width={40}
                            height={40}
                            className="mr-2 rounded"
                          />
                          <span
                            className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                          >
                            {product.title}
                          </span>
                        </div>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? "text-white" : "text-primary"
                            }`}
                          >
                            <Search className="size-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </ComboboxOption>
                ))}
              </>
            </ComboboxOptions>
          )}
        </Combobox>
      </div>
    </form>
  );
}
