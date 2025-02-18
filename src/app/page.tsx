"use server";

import { getUserInfos } from "../actions/session";
import CategoryList from "../components/CategoryList";
import FakeLogin from "../components/FakeLogin";

export default async function Home() {
  const session = await getUserInfos();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-4 text-4xl font-bold text-primary">
        Welcome to FakeShop
      </h1>
      <p className="mb-4">
        FakeShop is a demo e-commerce website built with Next.js 15, where I
        test the latest features of the framework, like React Server Components,
        server actions, streaming, and progressive enhancement.
      </p>
      <p className="mb-4">
        The button below will let you login as a fake user.
      </p>
      <div className="text-center">
        <FakeLogin initialSession={session} />
      </div>
      <CategoryList />
    </div>
  );
}
