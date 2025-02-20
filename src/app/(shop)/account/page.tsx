import { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/actions/auth";
import { getUserInfos } from "@/actions/session";
import { PageContainer } from "@/components/Layout";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "My Account - FakeShop",
  description: "View and manage your FakeShop account",
};

export default async function AccountPage() {
  const userInfos = await getUserInfos();

  // Redirect to login if not authenticated
  if (!userInfos) {
    redirect("/login");
  }

  return (
    <PageContainer>
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

        <div className="mt-8 flex justify-end">
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
            >
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}
