"use server";

import {
  clearUserSessionCookie,
  setUserSessionCookie,
  getUserSession as getUserSessionFromLib,
} from "../lib/session";
import { createUserSession } from "../lib/sessionUtils";
import { revalidatePath } from "next/cache";
import type { UserSession } from "../lib/types";
import { redirect } from "next/navigation";
import { isIssuedByJS } from "@/utils/actions";

export async function getUserSession(): Promise<UserSession | null> {
  return getUserSessionFromLib();
}

export async function login(formData: FormData): Promise<void> {
  console.log("login", formData);
  try {
    const newSession = createUserSession();
    await setUserSessionCookie(newSession);
    revalidatePath("/");
  } catch (error) {
    console.error("Error in login:", error);
    throw new Error("Failed to create session");
  }
  if (!(await isIssuedByJS())) {
    redirect("/");
  }
}

export async function logout(formData: FormData): Promise<void> {
  console.log("logout", formData);
  try {
    await clearUserSessionCookie();
    revalidatePath("/");
  } catch (error) {
    console.error("Error in logout:", error);
    throw new Error("Failed to clear session");
  }
  if (!(await isIssuedByJS())) {
    redirect("/");
  }
}
