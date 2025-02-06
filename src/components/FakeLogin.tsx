"use client";

import { useTransition } from "react";
import { Button } from "./ui/button";
import type { UserSession } from "../lib/session";
import React from "react";

export default function FakeLogin({
  login,
  logout,
  initialSession,
}: {
  login: () => Promise<{ session: UserSession } | { error: string }>;
  logout: () => Promise<{ session: null } | { error: string }>;
  initialSession: UserSession | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<UserSession | null>(
    initialSession,
  );

  if (session) {
    return (
      <>
        <p className="text-green-600 font-semibold mb-4">
          You are logged in as {session.infos.firstName}{" "}
          {session.infos.lastName}
        </p>
        <Button
          className="bg-primary text-white text-lg py-3 px-6 hover:bg-primary/90"
          onClick={() =>
            startTransition(async () => {
              const result = await logout();
              if (!("session" in result)) {
                setError(result.error || "Logout failed");
              } else {
                setSession(null);
              }
            })
          }
        >
          Logout
        </Button>
      </>
    );
  }

  return (
    <>
      <p className="mb-4 text-gray-600">
        Click the button below to simulate a user login. This will create a fake
        user session for demonstration purposes.
      </p>
      <Button
        onClick={() =>
          startTransition(async () => {
            const result = await login();
            if (!("session" in result)) {
              setError(result.error || "Login failed");
            } else {
              setSession(result.session);
            }
          })
        }
        className="bg-primary text-white text-lg py-3 px-6 hover:bg-primary/90"
        disabled={isPending}
      >
        {isPending ? "Logging in..." : "Fake Login"}
      </Button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </>
  );
}
