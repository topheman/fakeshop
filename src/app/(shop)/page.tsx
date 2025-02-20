import CategoryList from "@/components/CategoryList";
import { PageContainer } from "@/components/Layout";

export default function Home() {
  return (
    <PageContainer>
      <h1 className="mb-4 text-4xl font-bold text-primary">
        Welcome to FakeShop
      </h1>
      <p className="mb-4">
        FakeShop is a demo e-commerce website built with Next.js 15, where I
        test the latest features of the framework, like:
      </p>
      <ul className="list-disc space-y-2 pl-8 leading-4">
        <li>React Server Components</li>
        <li>Server actions</li>
        <li>Progressive enhancement</li>
        <li>Streaming</li>
      </ul>
      <CategoryList />
    </PageContainer>
  );
}
