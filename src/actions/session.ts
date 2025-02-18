"use server";

import { cookies } from "next/headers";

import type { Cart, UserInfos } from "./types";

export async function getUserInfos(): Promise<UserInfos | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_infos");
  if (sessionCookie) {
    try {
      return JSON.parse(sessionCookie.value);
    } catch {
      return null;
    }
  }
  return null;
}

export async function setUserInfos(session: UserInfos): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "user_infos",
    value: JSON.stringify(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}

export async function clearUserInfos(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("user_infos");
}

export async function getCart(): Promise<Cart | null> {
  const cookieStore = await cookies();
  const cartCookie = cookieStore.get("cart");
  if (cartCookie) {
    try {
      return JSON.parse(cartCookie.value);
    } catch {
      return null;
    }
  }
  return null;
}

export async function setCart(cart: Cart): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "cart",
    value: JSON.stringify(cart),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}

/**
 * Add an item to the cart
 * @param productId - The ID of the product to add
 * @param quantity - The quantity of the product to add
 * If quantity is null, the item will be removed from the cart
 */
export async function addToCart({
  productId,
  quantity,
}: {
  productId: number;
  quantity: number | null;
}): Promise<Cart | null> {
  const cart = await getCart();
  if (cart) {
    if (quantity === null) {
      // Remove item if quantity is null
      cart.items = cart.items.filter((item) => item.id !== productId);
    } else {
      const existingItem = cart.items.find((item) => item.id === productId);
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ id: productId, quantity });
      }
    }
    await setCart(cart);
  }
  return cart;
}

export async function clearCart(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("cart");
}
