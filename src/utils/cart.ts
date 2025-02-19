import { Cart } from "../actions/types";

/**
 * Prepare the cart for the update
 * @param cart - The cart to update
 * @param id - The id of the item to update
 * @param quantity - The quantity of the item to update
 * @returns The updated cart
 */
export function prepareCart({
  cart,
  id,
  quantity,
}: {
  cart: Cart;
  id: number;
  quantity: number | null;
}) {
  if (quantity === null) {
    // Remove item if quantity is null
    cart.items = cart.items.filter((item) => item.id !== id);
  } else {
    const existingItem = cart.items.find((item) => item.id === id);
    if (existingItem) {
      existingItem.quantity = quantity;
    } else {
      cart.items.push({ id, quantity });
    }
  }

  return cart;
}
