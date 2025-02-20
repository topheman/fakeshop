import Image from "next/image";
import Link from "next/link";

import { getUserInfos, getCart } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { getProduct } from "@/lib/api";
import { generateProductSlug } from "@/utils/slugUtils";

export default async function CheckoutPage() {
  const userInfos = await getUserInfos();
  const cart = await getCart();

  const productsInCart =
    cart?.items && cart?.items.length > 0
      ? await Promise.all(cart?.items.map((item) => getProduct(item.id)))
      : [];

  if (!userInfos) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="mb-4 text-2xl font-semibold">
          Please Login to Continue
        </h2>
        <p className="mb-6 text-gray-600">
          You need to be logged in to access the checkout
        </p>
        <Link
          href="/login?redirectTo=/checkout"
          className="rounded-md bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h2 className="mb-4 text-2xl font-semibold">Your Cart is Empty</h2>
        <p className="mb-6 text-gray-600">
          Looks like you haven't added anything to your cart yet
        </p>
        <Button asChild>
          <Link
            href="/"
            className="rounded-md bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
          >
            Continue Shopping
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-primary">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Shipping Information */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Shipping Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Name
                </label>
                <p className="text-lg">
                  {userInfos.firstName} {userInfos.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <p className="text-lg">{userInfos.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Phone
                </label>
                <p className="text-lg">{userInfos.phoneNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Address
                </label>
                <p className="text-lg">{userInfos.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Country
                </label>
                <p className="text-lg">{userInfos.country}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Payment Method</h2>
            <p className="text-muted-foreground">
              This is a demo store. No actual payment will be processed.
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>
          <div className="divide-y">
            {cart.items.map((item, index) => {
              const product = productsInCart[index];
              return (
                <div key={item.id} className="flex items-center gap-4 py-4">
                  <div className="relative size-20 overflow-hidden rounded-md bg-gray-100">
                    <Link
                      href={`/product/${generateProductSlug(product.title, product.id)}`}
                    >
                      <Image
                        src={product.thumbnail || `/placeholder.svg`}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    </Link>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h3 className="font-medium">{product.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${(product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between border-t pt-4">
              <span className="font-medium">Subtotal</span>
              <span className="font-medium">
                $
                {cart.items
                  .reduce(
                    (total, item, index) =>
                      total + productsInCart[index].price * item.quantity,
                    0,
                  )
                  .toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex items-center justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>
              <span>
                $
                {cart.items
                  .reduce(
                    (total, item, index) =>
                      total + productsInCart[index].price * item.quantity,
                    0,
                  )
                  .toFixed(2)}
              </span>
            </div>

            <Button className="w-full" size="lg">
              Place Order
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              By placing your order, you agree to our{" "}
              <Link href="#" className="underline">
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link href="#" className="underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
