import { Github, User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CategoryList } from "@/components/CategoryList";
import { CustomQRCode } from "@/components/CustomQRCode";
import { PageContainer } from "@/components/Layout";

export default function Home() {
  console.log("* Home");
  return (
    <PageContainer>
      <h1 className="mb-4 text-3xl font-bold text-primary md:text-4xl">
        Welcome to FakeShop
      </h1>
      <p className="mb-4">
        FakeShop is a demo e-commerce website built with Next.js 15, where I
        test the latest features of the framework, like:
      </p>
      <ul className="mb-4 list-disc space-y-2 pl-8 leading-4">
        <li>React Server Components</li>
        <li>Server actions</li>
        <li>Progressive enhancement</li>
        <li>Streaming</li>
      </ul>
      <p>
        Enjoy the demo and{" "}
        <a
          href="https://dev.to/topheman/react-server-components-in-practice-building-a-fake-e-commerce-site-with-nextjs-15-latest-features-73p"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
          title="React Server Components in Practice: Building a fake E-commerce Site with Next.js 15 latest features"
        >
          read the article I wrote on dev.to
        </a>{" "}
        for more details about the project.
      </p>
      <Suspense fallback={<div>Loading...</div>}>
        <CategoryList />
      </Suspense>
      <div className="mt-10 flex justify-center gap-4">
        <Link
          href="https://github.com/topheman/fakeshop"
          title="Source code on Github"
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-200"
        >
          <Github size={24} />
          <span>Github</span>
        </Link>
        <Link
          href="https://topheman.github.io/me/"
          title="My other projects"
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-200"
        >
          <User size={24} />
          <span>My other projects</span>
        </Link>
      </div>
      <div className="mt-6">
        <CustomQRCode payload="https://thefakeshop.vercel.app/" />
      </div>
    </PageContainer>
  );
}
