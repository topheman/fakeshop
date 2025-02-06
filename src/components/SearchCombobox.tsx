"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { searchProducts } from "../lib/api";
import type { Product } from "../types";
import Image from "next/image";
import { Combobox } from "@headlessui/react";
import { generateProductSlug } from "../utils/slugUtils";

export default function SearchCombobox({ initialQuery = "" }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query) {
        const results = await searchProducts(query);
        setSuggestions(results.products.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [query]);

  const handleChange = (value: Product | string | null) => {
    if (value === null) {
      return;
    }

    if (typeof value === "string") {
      // Handle custom search query
      startTransition(() => {
        if (pathname === "/search") {
          // If already on search page, update the URL without navigation
          router.push("/search?" + createQueryString("q", value));
        } else {
          router.push(`/search?q=${encodeURIComponent(value)}`);
        }
      });
    } else {
      // Handle product selection
      setSelectedProduct(value);
      const slug = generateProductSlug(value.title, value.id);
      router.push(`/product/${slug}`);
    }
    setQuery("");
    setSuggestions([]);
  };

  return (
    <div className="relative flex-grow max-w-md mx-4">
      <Combobox value={selectedProduct} onChange={handleChange} nullable>
        <div className="relative">
          <Combobox.Input
            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 bg-white rounded-lg focus:ring-0 focus:outline-none"
            displayValue={(item: Product | null) => query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products..."
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Button>
        </div>
        {query !== "" && (
          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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
                          active ? "text-white" : "text-[#900000]"
                        }`}
                      >
                        <Search className="h-5 w-5" aria-hidden="true" />
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
  );
}
