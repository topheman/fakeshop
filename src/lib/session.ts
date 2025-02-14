"use server";

import { cookies } from "next/headers";

import type { UserSession } from "./types";

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  console.log("getUserSession", sessionCookie);
  if (sessionCookie) {
    try {
      return JSON.parse(sessionCookie.value);
    } catch {
      return null;
    }
  }
  return null;
}

export async function setUserSessionCookie(
  session: UserSession,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "user_session",
    value: JSON.stringify(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}

export async function clearUserSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("user_session");
}
