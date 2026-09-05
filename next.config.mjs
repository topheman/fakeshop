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
  typescript: {
    // Type checking runs in `npm run typecheck` on TypeScript 7, which the
    // build cannot use: Next resolves `typescript` from the project root and
    // finds 6. `vercel.json` runs that script before `next build` so production
    // stays gated.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
