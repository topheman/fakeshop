"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserSession, login, logout } from "../actions/auth";

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

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSession"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSession"] });
    },
  });
}
