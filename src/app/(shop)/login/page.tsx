import { Metadata } from "next";
import { redirect } from "next/navigation";

import { login } from "@/actions/auth";
import { getUserInfos } from "@/actions/session";
import { PageContainer } from "@/components/Layout";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Login - FakeShop",
  description: "Login to your FakeShop account",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  // Check if user is already logged in
  const session = await getUserInfos();
  if (session) {
    redirect(redirectTo || "/");
  }

  return (
    <PageContainer className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">Welcome Back</h1>
          <p className="mt-2 text-gray-600">
            Sign in to your account to continue shopping
          </p>

          <p className="mt-2 text-gray-600">
            This will create a <strong>fake user session</strong> for
            demonstration purposes.
          </p>
        </div>

        <form action={login} className="mt-8 space-y-6">
          <Button type="submit" className="w-full px-4 py-3">
            Fake Login
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}
