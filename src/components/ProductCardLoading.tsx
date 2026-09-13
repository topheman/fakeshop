"use client";

import Image from "next/image";
import { useSyncExternalStore, ViewTransition } from "react";

import { extractProductIdFromSlug, slugToDisplayName } from "@/utils/slugUtils";
import { productImageTransitionName } from "@/utils/viewTransitions";

import { RevealFallback } from "./Reveal";

/** The URL never changes while this fallback is on screen, so there is nothing to subscribe to. */
const subscribe = () => () => {};

const getServerTitle = () => "Loading...";

function getProductSlug() {
  const pathname = window.location.pathname;
  if (pathname.startsWith("/product/")) {
    return pathname.split("/").pop() ?? null;
  }
  return null;
}

function getClientTitle() {
  const slug = getProductSlug();
  if (slug) {
    // Remove the ID from the slug to get a readable title
    return slugToDisplayName(slug.split("-").slice(0, -1).join("-"));
  }
  return getServerTitle();
}

const getServerProductId = () => null;

function getClientProductId() {
  const slug = getProductSlug();
  if (!slug) {
    return null;
  }
  const id = extractProductIdFromSlug(slug);
  return id === -1 ? null : id;
}

export function ProductCardLoading() {
  const title = useSyncExternalStore(subscribe, getClientTitle, getServerTitle);
  const productId = useSyncExternalStore(
    subscribe,
    getClientProductId,
    getServerProductId,
  );

  return (
    <>
      <h1 className="mb-1 flex items-center text-3xl font-bold text-primary md:mb-4">
        {/*
          A product URL carries no category, so the icon cannot be rendered
          here. The slot is held open at its size so the title lands on the
          same x as the loaded page puts it.
        */}
        <span aria-hidden="true" className="mr-2 size-6 shrink-0" />
        <span>{title}</span>
      </h1>
      <RevealFallback>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="w-full overflow-hidden rounded-lg bg-gray-200">
            {/*
            Carries the same transition name as the thumbnail that was clicked,
            so the morph lands on content that is already painted. The real photo
            may still be in flight here; this placeholder is a local asset and is
            not.
          */}
            <ViewTransition
              name={
                productId === null
                  ? undefined
                  : productImageTransitionName(productId)
              }
              share="morph"
              default="none"
            >
              <Image
                src="/placeholder.svg"
                alt=""
                width={500}
                height={500}
                className="size-full object-cover object-center"
              />
            </ViewTransition>
          </div>
          <div className="flex flex-col">
            {/* Description skeleton */}
            <div className="my-2 space-y-2 md:my-0">
              <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-11/12 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-gray-200" />
            </div>
            {/* Price and button container */}
            <div className="mt-8 flex items-center justify-between">
              <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-40 animate-pulse rounded bg-primary/20" />
            </div>
          </div>
        </div>
      </RevealFallback>
    </>
  );
}
