"use client";

import { useQueryClient } from "@tanstack/react-query";

import { logout } from "@/actions/auth";

import { Button } from "./ui/button";

export function LogoutButton() {
  const queryClient = useQueryClient();

  async function handleLogout() {
    await logout();
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  }

  return (
    <div className="mt-8 flex justify-end">
      <form action={handleLogout}>
        <Button
          type="submit"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
        >
          Sign Out
        </Button>
      </form>
    </div>
  );
}
