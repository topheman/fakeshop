/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ["dummyjson.com"],
  },
}

module.exports = nextConfig

