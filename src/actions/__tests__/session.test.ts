import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Minimal stand-in for the cookie store `next/headers` hands to a Server
 * Action: enough of `get`/`set`/`delete` for the session module, plus the
 * options of the last write so we can assert on cookie attributes.
 */
const store = new Map<string, { value: string; options: object }>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const entry = store.get(name);
      return entry ? { name, value: entry.value } : undefined;
    },
    set: ({ name, value, ...options }: { name: string; value: string }) => {
      store.set(name, { value, options });
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

const { getCart, updateCart, setOrders } = await import("../session");

describe("updateCart", () => {
  beforeEach(() => {
    store.clear();
  });

  test("adds an item when the visitor has no cart cookie yet", async () => {
    // Until phase 3 the proxy seeded this cookie on every page response, and
    // without it `updateCart` silently did nothing.
    expect(await getCart()).toBeNull();

    const cart = await updateCart({ id: 42, quantity: undefined });

    expect(cart.items).toEqual([{ id: 42, quantity: 1 }]);
    expect(await getCart()).toEqual({ items: [{ id: 42, quantity: 1 }] });
  });

  test("returns the updated cart rather than the one it read", async () => {
    await updateCart({ id: 1, quantity: 3 });

    const cart = await updateCart({ id: 1, quantity: 7 });

    expect(cart.items).toEqual([{ id: 1, quantity: 7 }]);
  });

  test("does not carry items across visitors with no cart cookie", async () => {
    await updateCart({ id: 1, quantity: undefined });
    store.clear();

    const cart = await updateCart({ id: 2, quantity: undefined });

    expect(cart.items).toEqual([{ id: 2, quantity: 1 }]);
  });
});

describe("setOrders", () => {
  beforeEach(() => {
    store.clear();
  });

  test("writes the orders cookie with the same protections as the cart", async () => {
    await setOrders([{ date: new Date(), paymentMethod: "card", amount: 10 }]);

    expect(store.get("orders")?.options).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
    });
  });
});
