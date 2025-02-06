import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import type React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FakeStore",
  description: "A demo e-commerce site built with Next.js 15",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // You can add async operations here if needed in the future
  // For example: const someData = await fetchSomeData();

  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Header />
        <main className="flex-grow bg-background">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
