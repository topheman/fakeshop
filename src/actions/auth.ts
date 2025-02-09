"use server";

import {
  clearUserSessionCookie,
  createUserSession,
  setUserSessionCookie,
  getUserSession as getUserSessionFromLib,
  UserSession,
} from "../lib/session";
import { revalidatePath } from "next/cache";

export async function getUserSession(): Promise<UserSession | null> {
  return getUserSessionFromLib();
}

export async function login(): Promise<
  { session: UserSession } | { error: string }
> {
  try {
    const newSession = createUserSession();
    await setUserSessionCookie(newSession);
    revalidatePath("/");
    return { session: newSession };
  } catch (error) {
    console.error("Error in login:", error);
    return { error: "Failed to create session" };
  }
}

export async function logout(): Promise<{ session: null } | { error: string }> {
  try {
    await clearUserSessionCookie();
    revalidatePath("/");
    return { session: null };
  } catch (error) {
    console.error("Error in logout:", error);
    return { error: "Failed to clear session" };
  }
}
