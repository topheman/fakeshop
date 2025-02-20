import { Cart } from "../actions/types";

/**
 * Prepare the cart for the update
 * @param cart - The cart to update
 * @param id - The id of the item to update
 * @param quantity - The quantity of the item to update
 * @returns The updated cart
 *
 * - quantity is null: remove item
 * - quantity is a number: update item with the quantity provided
 * - quantity is undefined: add item
 *   - if the item already exists, noop (will not update quantity)
 *   - if the item does not exist, add it with default quantity (1)
 */
export function prepareCart({
  cart,
  id,
  quantity,
}: {
  cart: Cart;
  id: number;
  quantity: number | null | undefined;
}) {
  if (quantity === null) {
    // Remove item if quantity is null
    cart.items = cart.items.filter((item) => item.id !== id);
  } else if (quantity === undefined) {
    // Add item with default quantity if it doesn't exist
    const existingItem = cart.items.find((item) => item.id === id);
    if (!existingItem) {
      cart.items.push({ id, quantity: 1 });
    }
  } else {
    // Update item with provided quantity
    const existingItem = cart.items.find((item) => item.id === id);
    if (existingItem) {
      existingItem.quantity = quantity;
    } else {
      cart.items.push({ id, quantity });
    }
  }

  return cart;
}
