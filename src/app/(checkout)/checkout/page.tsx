import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment, Suspense } from "react";

import { getUserInfos, getCart, order } from "@/actions/session";
import { PageContainer } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { getProduct } from "@/lib/api";
import { PAYMENT_METHODS } from "@/utils/payment";
import { generateProductSlug } from "@/utils/slugUtils";

// Async child component
async function CheckoutContent() {
  const userInfos = await getUserInfos();
  const cart = await getCart();

  const productsInCart =
    cart?.items && cart?.items.length > 0
      ? await Promise.all(cart?.items.map((item) => getProduct(item.id)))
      : [];

  const total = (
    cart?.items
      ? cart.items.reduce(
          (total, item, index) =>
            total + productsInCart[index].price * item.quantity,
          0,
        )
      : 0
  ).toFixed(2);

  if (!userInfos) {
    return (
      <Fragment>
        <h1 className="mb-8 text-3xl font-bold text-primary">Checkout</h1>
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
      </Fragment>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Fragment>
        <h1 className="mb-8 text-3xl font-bold text-primary">Checkout</h1>
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
      </Fragment>
    );
  }

  return (
    <Fragment>
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
            <form
              action={async (formData: FormData) => {
                "use server";
                await order(formData);
                redirect("/account?scrollTo=order-history");
              }}
              className="space-y-4"
            >
              <input type="hidden" name="amount" value={total} />
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  className="block cursor-pointer rounded-lg border p-4 transition-colors hover:border-gray-400 [&:has(input:checked)]:border-blue-500 [&:has(input:checked)]:bg-blue-50"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    className="sr-only"
                    required
                  />
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {method.description}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
              <Button type="submit" className="mt-8 w-full" size="lg">
                Pay ${total}
              </Button>
            </form>
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
              <span className="font-medium">${total}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex items-center justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>
              <span>${total}</span>
            </div>

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
    </Fragment>
  );
}

// Sync root component
export default function CheckoutPage() {
  return (
    <PageContainer>
      <Suspense fallback={<div>Loading...</div>}>
        <CheckoutContent />
      </Suspense>
    </PageContainer>
  );
}
