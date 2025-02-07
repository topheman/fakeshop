import { QueryClient, QueryClientConfig } from "@tanstack/react-query";

export function makeQueryClient(options: QueryClientConfig = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...(["development", "test"].includes(process.env.NODE_ENV) && {
          retry: false,
        }),
        refetchOnWindowFocus: process.env.NODE_ENV === "production",
      },
      ...options,
    },
  });
}
