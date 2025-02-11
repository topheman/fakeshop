import { headers } from "next/headers";

export async function isIssuedByJS() {
  const accept = (await headers()).get("Accept");
  return accept?.includes("text/x-component");
}
