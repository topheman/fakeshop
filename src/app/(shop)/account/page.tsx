import { Home } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getUserInfos, getOrders } from "@/actions/session";
import { PageContainer } from "@/components/Layout";
import { LogoutButton } from "@/components/LogoutButton";
import { ScrollTo } from "@/components/ScrollTo";
import { Button } from "@/components/ui/button";
import { getLanguage } from "@/utils/language";
import { PAYMENT_METHODS } from "@/utils/payment";

export const metadata: Metadata = {
  title: "My Account - FakeShop",
  description: "View and manage your FakeShop account",
};

// Async child component
async function AccountContent() {
  const userInfos = await getUserInfos();
  const orders = await getOrders();
  const language = await getLanguage();

  // Redirect to login if not authenticated
  if (!userInfos) {
    redirect("/login");
  }

  return (
    <>
      <ScrollTo />
      <h1 className="mb-6 text-3xl font-bold text-primary">My Account</h1>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Personal Information</h2>
            <div className="space-y-3">
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
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold">Shipping Address</h2>
            <div className="space-y-3">
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
        </div>

        <div className="mt-8" id="order-history">
          <h2 className="mb-4 text-xl font-semibold">Order History</h2>
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => {
                const paymentMethod = PAYMENT_METHODS.find(
                  (method) => method.id === order.paymentMethod,
                );
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">
                        Order from{" "}
                        <time dateTime={new Date(order.date).toISOString()}>
                          {new Intl.DateTimeFormat(language).format(
                            new Date(order.date),
                          )}
                        </time>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Payment Method:{" "}
                        {paymentMethod?.name || order.paymentMethod}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">
                      ${order.amount.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 flex justify-between">
        <Button asChild>
          <Link href="/" title="Back Home">
            <Home className="mr-2 size-4" />
            Home
          </Link>
        </Button>
        <LogoutButton />
      </div>
    </>
  );
}

// Sync root component
export default function AccountPage() {
  return (
    <PageContainer>
      <Suspense fallback={<div>Loading account...</div>}>
        <AccountContent />
      </Suspense>
    </PageContainer>
  );
}
