export const PAYMENT_METHODS = [
  {
    id: "stripe",
    name: "Credit Card",
    icon: "💳",
    description: "Don't pay anything with Stripe",
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: "🌐",
    description: "Safe and secure payment - no payment required",
  },
  {
    id: "apple-pay",
    name: "Apple Pay",
    icon: "🍎",
    description: "Quick and secure checkout - everything is free",
  },
];

export type PaymentType = "stripe" | "paypal" | "apple-pay";

export function getPaymentMethodById(id: PaymentType) {
  return PAYMENT_METHODS.find((method) => method.id === id);
}
