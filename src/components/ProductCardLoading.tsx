"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

import { slugToDisplayName } from "@/utils/slugUtils";

/** The URL never changes while this fallback is on screen, so there is nothing to subscribe to. */
const subscribe = () => () => {};

const getServerTitle = () => "Loading...";

function getClientTitle() {
  const pathname = window.location.pathname;
  if (pathname.startsWith("/product/")) {
    const slug = pathname.split("/").pop();
    if (slug) {
      // Remove the ID from the slug to get a readable title
      return slugToDisplayName(slug.split("-").slice(0, -1).join("-"));
    }
  }
  return getServerTitle();
}

export function ProductCardLoading() {
  const title = useSyncExternalStore(subscribe, getClientTitle, getServerTitle);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2">
      <h1 className="mb-1 text-3xl font-bold text-primary md:col-span-2 md:mb-4">
        {title}
      </h1>
      <div className="w-full overflow-hidden rounded-lg bg-gray-200">
        <Image
          src="/placeholder.svg"
          blurDataURL="/placeholder.svg"
          alt=""
          width={500}
          height={500}
          className="size-full object-cover object-center"
        />
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
  );
}
