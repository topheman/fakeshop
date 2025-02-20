import { Cart } from "./Cart";
import Footer from "./Footer";
import Header from "./Header";

export function Layout({
  children,
  mode = "shop",
}: {
  children: React.ReactNode;
  mode?: "shop" | "checkout";
}) {
  return (
    <>
      <Header mode={mode} />
      {mode === "shop" && <Cart />}
      <main className="mx-auto max-w-screen-xl grow bg-background">
        {children}
      </main>
      <Footer />
    </>
  );
}
