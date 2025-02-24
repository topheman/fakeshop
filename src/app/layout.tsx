import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import type React from "react";

import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FakeShop - by topheman",
  description: "A demo e-commerce site built with Next.js 15",
  metadataBase: new URL("https://thefakeshop.vercel.app"),
  openGraph: {
    title: "FakeShop - by topheman",
    description: "A demo e-commerce site built with Next.js 15 latest features",
    url: "https://thefakeshop.vercel.app",
    siteName: "FakeShop",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "A demo e-commerce site built with Next.js 15 latest features",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FakeShop - by topheman",
    description: "A demo e-commerce site built with Next.js 15 latest features",
    images: ["/api/og"],
    creator: "@topheman",
    site: "@topheman",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon-64x64.png", sizes: "64x64" },
      { url: "/favicon-128x128.png", sizes: "128x128" },
      { url: "/favicon-144x144.png", sizes: "144x144" },
      { url: "/favicon-192x192.png", sizes: "192x192" },
      { url: "/favicon-256x256.png", sizes: "256x256" },
      { url: "/favicon-384x384.png", sizes: "384x384" },
      { url: "/favicon-512x512.png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120" },
      { url: "/apple-touch-icon-180x180.png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#900000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
