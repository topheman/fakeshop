"use server";

import { cookies } from "next/headers";

import { prepareCart } from "@/utils/cart";
import { COOKIE_MAX_AGE } from "@/utils/constants";
import { PaymentType } from "@/utils/payment";

import type { Cart, Order, UserInfos } from "./types";

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
    maxAge: COOKIE_MAX_AGE,
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
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Add an item to the cart
 * @param id - The ID of the product to add
 * @param quantity - The quantity of the product to add
 * If quantity is null, the item will be removed from the cart
 */
export async function updateCart({
  id,
  quantity,
}: {
  id: number;
  quantity: number | null | undefined;
}): Promise<Cart | null> {
  const cart = await getCart();
  if (cart) {
    const updatedCart = prepareCart({ cart, id, quantity });
    await setCart(updatedCart);
  }
  return cart;
}

export async function clearCart(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("cart");
}

export async function getOrders(): Promise<Order[]> {
  const cookieStore = await cookies();
  const orders = cookieStore.get("orders");
  if (orders) {
    try {
      return JSON.parse(orders.value);
    } catch {
      return [];
    }
  }
  return [];
}

export async function setOrders(orders: Order[]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "orders",
    value: JSON.stringify(orders),
  });
}

export async function order(formData: FormData) {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) {
    return { error: "Cart is empty" };
  }

  const paymentMethod = formData.get("paymentMethod");
  if (!paymentMethod) {
    return { error: "Payment method is required" };
  }

  const orders = await getOrders();
  orders.push({
    date: new Date(),
    paymentMethod: paymentMethod as PaymentType,
    amount: Number(formData.get("amount")),
  });
  await setOrders(orders);
  await clearCart();
}
