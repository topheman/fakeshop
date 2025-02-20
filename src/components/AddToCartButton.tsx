import { ShoppingCartIcon } from "lucide-react";

import { Button } from "./ui/button";

export function AddToCartButton({
  id,
  title,
  variant = "default",
}: {
  id: number;
  title?: string;
  variant?: "default" | "small";
}) {
  console.log(id);
  const finalTitle = title ? `Add "${title}" to Cart` : "Add to Cart";

  if (variant === "default") {
    return (
      <Button className="bg-primary text-white" title={finalTitle}>
        <ShoppingCartIcon className="mr-2 size-4" strokeWidth={3} />
        Add to Cart
      </Button>
    );
  }
  return (
    <Button title={finalTitle} className="bg-primary text-white">
      <ShoppingCartIcon className="size-5" strokeWidth={3} />
    </Button>
  );
}
