/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dummyjson.com",
      },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The `instant()` helper in `e2e/` drives a production server, and the
    // testing API it talks to is only compiled in when this is on. It must
    // never ship to a live site, so it is gated on an env var that only
    // `playwright.config.ts` sets.
    exposeTestingApiInProductionBuild: process.env.NEXT_E2E_TESTING === "1",
  },
  typescript: {
    // Type checking runs in `npm run typecheck` on TypeScript 7, which the
    // build cannot use: Next resolves `typescript` from the project root and
    // finds 6. `vercel.json` runs that script before `next build` so production
    // stays gated.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
