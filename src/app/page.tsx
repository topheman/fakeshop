"use server";

import FakeLogin from "../components/FakeLogin";
import { getUserSession } from "../lib/session";

export default async function Home() {
  const session = await getUserSession();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-4 text-4xl font-bold text-primary">
        Welcome to FakeStore
      </h1>
      <p className="mb-4">
        FakeStore is a demo e-commerce website built with Next.js 15, where I
        test the latest features of the framework, like React Server Components,
        server actions, streaming, and progressive enhancement.
      </p>
      <p className="mb-4">
        The button below will let you login as a fake user.
      </p>
      <div className="text-center">
        <FakeLogin initialSession={session} />
      </div>
    </div>
  );
}
