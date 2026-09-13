"use client";

import { useSyncExternalStore } from "react";

import { slugToDisplayName } from "@/utils/slugUtils";

import { CategoryIcon } from "./CategoryIcon";
import { ProductGridSkeleton } from "./ProductGridSkeleton";

export const experimental_ppr = false;

/** The URL never changes while this fallback is on screen, so there is nothing to subscribe to. */
const subscribe = () => () => {};

const getServerTitle = () => "Loading ...";

function getCategorySlug() {
  const pathname = window.location.pathname;

  return pathname.startsWith("/category/")
    ? (pathname.split("/").pop() ?? null)
    : null;
}

function getClientTitle() {
  if (window.location.pathname === "/search") {
    const query = new URLSearchParams(window.location.search).get("q");
    return `Search results for "${query}"`;
  }
  const slug = getCategorySlug();
  if (slug) {
    return slugToDisplayName(slug);
  }
  return getServerTitle();
}

const getServerCategorySlug = () => null;

/** Read as its own snapshot so both stores keep returning a primitive. */
const getClientCategorySlug = () => getCategorySlug();

/**
 * This component is used to display a loading state for the product grid.
 * It's meant to be used for the /search and /category pages.
 * It will find the title of the page based on the pathname/search params at
 * runtime, client side.
 *
 * You can't use useRouter here because ppr will complain at build time, so the
 * URL is read as an external store: the server snapshot renders the generic
 * title, the client snapshot renders the real one after hydration.
 */
export function ProductGridLoading() {
  const title = useSyncExternalStore(subscribe, getClientTitle, getServerTitle);
  const categorySlug = useSyncExternalStore(
    subscribe,
    getClientCategorySlug,
    getServerCategorySlug,
  );

  console.log("* ProductGridLoading");
  return (
    <>
      <h1 className="mb-8 flex items-center text-3xl font-bold text-primary">
        {categorySlug ? (
          <CategoryIcon
            category={categorySlug}
            className="mr-2 size-6 shrink-0"
          />
        ) : null}
        <span>{title}</span>
      </h1>
      <ProductGridSkeleton />
    </>
  );
}
