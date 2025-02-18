import {
  QueryClient,
  QueryClientConfig,
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";

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

/**
 * A type that will let you add react-query specific options to your custom hooks
 * will still keeping the type inference for the queryFn, without being bothered by
 * TypeScript yelling about the queryKey and queryFn.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MyUseQueryOptions<TQueryFnData extends (...args: any) => any> =
  Omit<
    UseQueryOptions<
      unknown,
      Error,
      Awaited<ReturnType<TQueryFnData>>,
      readonly unknown[]
    >,
    "queryKey" | "queryFn"
  >;

/**
 * A type that will let you add react-query specific options to your custom hooks
 * will still keeping the type inference for the mutationFn, without being bothered by
 * TypeScript yelling about the mutationFn.
 *
 * Note: Only handles mutationFn with one argument
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MyUseMutationOptions<TQueryFnData extends (...args: any) => any> =
  Omit<
    UseMutationOptions<
      Awaited<ReturnType<TQueryFnData>>,
      Error,
      Parameters<TQueryFnData>[0]
    >,
    "mutationFn"
  >;
