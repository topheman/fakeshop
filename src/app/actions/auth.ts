"use server"

import { createUserSession, setUserSessionCookie } from "../../lib/session"
import { revalidatePath } from "next/cache"

export async function handleFakeLogin(): Promise<{ success: boolean; error?: string }> {
  console.log("handleFakeLogin server side - Start", { env: process.env.NODE_ENV, time: new Date().toISOString() })
  try {
    const newSession = createUserSession()
    console.log("New session created:", JSON.stringify(newSession, null, 2))
    await setUserSessionCookie(newSession)
    console.log("Session cookie set")
    revalidatePath("/")
    console.log("Path revalidated")
    console.log("handleFakeLogin server side - End (Success)")
    return { success: true }
  } catch (error) {
    console.error("Error in handleFakeLogin:", error)
    console.log("handleFakeLogin server side - End (Error)")
    return { success: false, error: "Failed to create session" }
  }
}

