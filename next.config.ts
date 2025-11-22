/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tell Next/Turbopack not to bundle these; just use them as Node deps
    serverExternalPackages: ["@daytonaio/sdk", "ws"],
  },
};

module.exports = nextConfig;
