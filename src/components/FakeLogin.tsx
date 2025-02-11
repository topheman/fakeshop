"use client";

import { Button } from "./ui/button";
import type { UserSession } from "../lib/types";
import { login, logout } from "../actions/auth";

export default function FakeLogin({
  initialSession,
}: {
  initialSession: UserSession | null;
}) {
  if (initialSession) {
    return (
      <>
        <p className="text-green-600 font-semibold mb-4">
          You are logged in as {initialSession.infos.firstName}{" "}
          {initialSession.infos.lastName}
        </p>
        <form action={logout}>
          <Button
            type="submit"
            className="bg-primary text-white text-lg py-3 px-6 hover:bg-primary/90"
          >
            Logout
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <p className="mb-4 text-gray-600">
        Click the button below to simulate a user login. This will create a fake
        user session for demonstration purposes.
      </p>
      <form action={login}>
        <Button
          type="submit"
          className="bg-primary text-white text-lg py-3 px-6 hover:bg-primary/90"
        >
          Fake Login
        </Button>
      </form>
    </>
  );
}
