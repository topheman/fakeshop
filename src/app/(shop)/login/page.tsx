import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { login } from "@/actions/auth";
import { getUserInfos } from "@/actions/session";
import { PageContainer } from "@/components/Layout";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Login - FakeShop",
  description: "Login to your FakeShop account",
};

// Async child component
async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  console.log("* LoginPage", { redirectTo });

  // Check if user is already logged in
  const session = await getUserInfos();
  if (session) {
    redirect(redirectTo || "/");
  }

  async function loginWithRedirect(formData: FormData) {
    "use server";
    await login(formData);
    redirect(redirectTo || "/");
  }

  return (
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

      <form action={loginWithRedirect} className="mt-8 space-y-6">
        <Button type="submit" className="w-full px-4 py-3">
          Fake Login
        </Button>
      </form>
    </div>
  );
}

// Sync root component
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  return (
    <PageContainer className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <Suspense fallback={<div>Loading login...</div>}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
