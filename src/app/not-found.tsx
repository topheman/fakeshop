import { Layout } from "@/components/Layout";

export default function NotFound() {
  return (
    <Layout mode="shop">
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center"
        id="not-found"
      >
        <h2 className="mb-4 text-2xl font-bold">404 - Page Not Found</h2>
        <p>The page you are looking for does not exist.</p>
      </div>
    </Layout>
  );
}
