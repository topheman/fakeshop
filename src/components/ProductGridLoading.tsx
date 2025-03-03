"use client";

import { useEffect, useState } from "react";

import { slugToDisplayName } from "@/utils/slugUtils";

import { ProductGridSkeleton } from "./ProductGridSkeleton";

export const experimental_ppr = false;

/**
 * This component is used to display a loading state for the product grid.
 * It's meant to be used for the /search and /category pages.
 * It will find the title of the page based on the pathname/search params at
 * runtime, client side.
 */
export function ProductGridLoading() {
  const [title, setTitle] = useState("Loading ...");

  /**
   * You can't use useRouter here because ppr will complain at build time.
   * I tried to `export const experimental_ppr = false;` but it didn't work.
   */
  useEffect(() => {
    const pathname = window.location.pathname;

    if (pathname === "/search") {
      const query = new URLSearchParams(window.location.search).get("q");
      setTitle(`Search results for "${query}"`);
    } else if (pathname.startsWith("/category/")) {
      const slug = pathname.split("/").pop();
      if (slug) {
        setTitle(slugToDisplayName(slug));
      }
    }
  }, []);

  console.log("* ProductGridLoading");
  return (
    <>
      <h1 className="mb-8 text-3xl font-bold text-primary">{title}</h1>
      <ProductGridSkeleton />
    </>
  );
}
