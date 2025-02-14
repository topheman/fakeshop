"use client";

import { useQuery } from "@tanstack/react-query";

import { getUserSession } from "../actions/auth";

export function useUserSession() {
  const {
    data: userSession,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["userSession"],
    queryFn: getUserSession,
  });

  return {
    userSession: userSession ?? null,
    isLoading,
    error,
  };
}
