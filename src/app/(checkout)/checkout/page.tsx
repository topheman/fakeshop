import Link from "next/link";

import { getUserInfos } from "@/actions/session";

export default async function CheckoutPage() {
  const userInfos = await getUserInfos();

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

  return <div>Checkout</div>;
}
