"use client";

import { Combobox } from "@headlessui/react";
import { Search } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useCallback } from "react";

import { useSearchProducts } from "@/hooks/products";

import type { Product } from "../types";
import { generateProductSlug } from "../utils/slugUtils";

export default function SearchCombobox({ initialQuery = "" }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
    setQuery("");
  };

  return (
    <form role="search" action="/search">
      <div className="relative mx-4 max-w-md grow">
        <Combobox value={selectedProduct} onChange={handleChange} nullable>
          <div className="relative">
            <Combobox.Input
              className="w-full rounded-lg border-none bg-white py-2 pl-3 pr-10 text-[16px] leading-5 text-gray-900 focus:outline-none focus:ring-0 sm:text-sm"
              displayValue={() => query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products..."
              name="q"
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <Search className="size-5 text-gray-400" aria-hidden="true" />
            </Combobox.Button>
          </div>
          {query !== "" && (
            <Combobox.Options className="fixed inset-x-0 mt-1 max-h-60 overflow-auto bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:absolute sm:inset-x-auto sm:w-full sm:rounded-md sm:text-sm">
              <Combobox.Option
                value={query}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 px-4 ${active ? "bg-[#900000] text-white" : "text-gray-900"}`
                }
              >
                Search for "{query}"
              </Combobox.Option>
              {suggestions.map((product) => (
                <Combobox.Option
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
                </Combobox.Option>
              ))}
            </Combobox.Options>
          )}
        </Combobox>
      </div>
    </form>
  );
}
