"use server";

import { redirect } from "next/navigation";

import { isIssuedByJS } from "@/utils/actions";

import {
  clearUserInfos,
  setUserInfos,
  getUserInfos,
  getCart,
  clearOrders,
  clearCart,
} from "./session";
import { createUserInfos } from "./sessionUtils";
import type { Cart, UserInfos } from "./types";

export async function getUserSession(): Promise<{
  infos: UserInfos | null;
  cart: Cart | null;
}> {
  return {
    infos: await getUserInfos(),
    cart: await getCart(),
  };
}

export async function login(formData: FormData): Promise<void> {
  console.log("login", formData);
  try {
    const newSession = createUserInfos();
    await setUserInfos(newSession);
  } catch (error) {
    console.error("Error in login:", error);
    throw new Error("Failed to create session");
  }
  if (!(await isIssuedByJS())) {
    redirect("/");
  }
}

export async function logout(): Promise<void> {
  console.log("logout");
  try {
    await clearUserInfos();
    await clearCart();
    await clearOrders();
  } catch (error) {
    console.error("Error in logout:", error);
    throw new Error("Failed to clear session");
  }
  if (!(await isIssuedByJS())) {
    redirect("/");
  }
}
