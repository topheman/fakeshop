import { describe, expect, test, beforeEach } from "vitest";

import { Cart } from "@/actions/types";

import { prepareCart } from "../cart";

describe("prepareCart", () => {
  let cart: Cart;

  beforeEach(() => {
    // Reset cart before each test
    cart = {
      items: [
        { id: 1, quantity: 2 },
        { id: 2, quantity: 1 },
      ],
    };
  });

  test("removes item when quantity is null", () => {
    const result = prepareCart({ cart, id: 1, quantity: null });
    expect(result.items).toHaveLength(1);
    expect(result.items).not.toContainEqual(expect.objectContaining({ id: 1 }));
    expect(result.items).toContainEqual({ id: 2, quantity: 1 });
  });

  test("updates item quantity when quantity is provided", () => {
    const result = prepareCart({ cart, id: 1, quantity: 5 });
    expect(result.items).toHaveLength(2);
    expect(result.items).toContainEqual({ id: 1, quantity: 5 });
    expect(result.items).toContainEqual({ id: 2, quantity: 1 });
  });

  test("adds new item with quantity 1 when quantity is undefined and item does not exist", () => {
    const result = prepareCart({ cart, id: 3, quantity: undefined });
    expect(result.items).toHaveLength(3);
    expect(result.items).toContainEqual({ id: 3, quantity: 1 });
    expect(result.items).toContainEqual({ id: 1, quantity: 2 });
    expect(result.items).toContainEqual({ id: 2, quantity: 1 });
  });

  test("does not update quantity when quantity is undefined and item exists", () => {
    const result = prepareCart({ cart, id: 1, quantity: undefined });
    expect(result.items).toHaveLength(2);
    expect(result.items).toContainEqual({ id: 1, quantity: 2 }); // Original quantity remains
    expect(result.items).toContainEqual({ id: 2, quantity: 1 });
  });
});
