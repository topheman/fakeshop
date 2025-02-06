"use client"

import { useTransition } from "react"
import { Button } from "./ui/button"
import type { UserSession } from "../lib/session"
import React from "react"

export default function FakeLogin({
  login,
  initialSession,
}: {
  login: () => Promise<{ success: boolean; error?: string }>
  initialSession: UserSession | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [session, setSession] = React.useState<UserSession | null>(initialSession)

  if (session) {
    return (
      <p className="text-green-600 font-semibold">
        You are logged in as {session.infos.firstName} {session.infos.lastName}
      </p>
    )
  }

  return (
    <>
      <p className="mb-4 text-gray-600">
        Click the button below to simulate a user login. This will create a fake user session for demonstration
        purposes.
      </p>
      <Button
        onClick={() => startTransition(login)}
        className="bg-primary text-white text-lg py-3 px-6 hover:bg-primary/90"
        disabled={isPending}
      >
        {isPending ? "Logging in..." : "Fake Login"}
      </Button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </>
  )
}

