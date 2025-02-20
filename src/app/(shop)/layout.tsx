import { Layout } from "@/components/Layout";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout mode="shop">{children}</Layout>;
}
