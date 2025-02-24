import { redirect } from "next/navigation";
import { Fragment, Suspense } from "react";

import { getCart, order } from "@/actions/session";
import { PageContainer } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { getProduct } from "@/lib/api";
import { PAYMENT_METHODS } from "@/utils/payment";

async function OrderContent() {
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    return (
      <Fragment>
        <h1 className="mb-8 text-3xl font-bold">Payment</h1>
        <div className="text-center">No cart found</div>
      </Fragment>
    );
  }

  const productsInCart =
    cart?.items && cart?.items.length > 0
      ? await Promise.all(cart?.items.map((item) => getProduct(item.id)))
      : [];

  const total = cart.items.reduce((sum, item, index) => {
    const product = productsInCart[index];
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const handleOrder = async (formData: FormData) => {
    "use server";
    await order(formData);
    redirect("/account");
  };

  return (
    <Fragment>
      <h1 className="mb-8 text-3xl font-bold">Payment</h1>

      <div className="mb-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">Total to pay</span>
          <span className="text-2xl font-bold">${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-semibold">
          Select Fake Payment Method
        </h2>
        <form action={handleOrder} className="space-y-4">
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
            FAKE pay ${total.toFixed(2)}
          </Button>
        </form>
      </div>
    </Fragment>
  );
}

// Sync root component
export default function OrderPage() {
  return (
    <PageContainer>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <OrderContent />
        </Suspense>
      </div>
    </PageContainer>
  );
}
