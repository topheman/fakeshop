import { headers } from "next/headers";

/**
 * Get the language from the headers
 * @returns The language from the headers
 *
 * This is a naive implementation (you should account for weights and other stuff ...)
 */
export async function getLanguage() {
  const headersList = await headers();
  const language = headersList.get("accept-language");
  if (language) {
    return language.split(",")[0];
  }
  return "en";
}
