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
        FakeStore is a demo e-commerce website built with Next.js 15, showcasing
        modern web development practices. It's designed to demonstrate the power
        of React Server Components, streaming, and progressive enhancement.
      </p>
      <p className="mb-8">
        This project is open-source and serves as an educational resource for
        developers interested in building high-performance, scalable web
        applications using the latest technologies.
      </p>
      <div className="text-center">
        <FakeLogin initialSession={session} />
      </div>
    </div>
  );
}
