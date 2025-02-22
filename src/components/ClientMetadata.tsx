"use client";

/**
 * See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#unsupported-metadata
 *
 * The meta preconnect, dns-prefetch and preload are not supported by the Metadata api of NextJS
 * Here is the way to do it.
 *
 * I disactivated it, I don't think it makes a very big difference in performance. Must do more tests.
 */

import { memo } from "react";
import ReactDOM from "react-dom";

export const ClientMetadata = memo(() => {
  ReactDOM.preconnect("https://cdn.dummyjson.com");
  ReactDOM.prefetchDNS("https://dummyjson.com");
  return null;
});

ClientMetadata.displayName = "ClientMetadata";
