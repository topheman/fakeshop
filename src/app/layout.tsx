import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import type React from "react";

import Footer from "../components/Footer";
import Header from "../components/Header";

import { Providers } from "./providers";

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
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_ENABLE_SCAN && (
          <Script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            async
          />
        )}
      </head>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Providers>
          <Header />
          <main className="grow bg-background">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
