"use client";

import { Button } from "./ui/button";
import React from "react";
import { useLogin, useLogout, useUserSession } from "../hooks/session";

export default function FakeLogin() {
  const [error, setError] = React.useState<string | null>(null);
  const { mutate: loginMutation, isPending: isLoginPending } = useLogin();
  const { mutate: logoutMutation, isPending: isLogoutPending } = useLogout();
  const { userSession, isLoading } = useUserSession();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (userSession) {
    return (
      <>
        <p className="text-green-600 font-semibold mb-4">
          You are logged in as {userSession.infos.firstName}{" "}
          {userSession.infos.lastName}
        </p>
        <Button
          className="bg-primary text-white text-lg py-3 px-6 hover:bg-primary/90"
          onClick={() => {
            logoutMutation(undefined, {
              onError: (error) => {
                setError("Logout failed");
                console.error("Logout failed", error);
              },
            });
          }}
          disabled={isLogoutPending}
        >
          {isLogoutPending ? "Logging out..." : "Logout"}
        </Button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
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
        onClick={() => {
          loginMutation(undefined, {
            onError: (error) => {
              setError("Login failed");
              console.error("Login failed", error);
            },
          });
        }}
        className="bg-primary text-white text-lg py-3 px-6 hover:bg-primary/90"
        disabled={isLoginPending}
      >
        {isLoginPending ? "Logging in..." : "Fake Login"}
      </Button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </>
  );
}
