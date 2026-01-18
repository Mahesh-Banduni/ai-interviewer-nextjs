/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [{ hostname: 'f005.backblazeb2.com' }],
  },
  productionBrowserSourceMaps: false,
  reactCompiler: true,
  experimental: {
    serverSourceMaps: false,
  },
};

export default nextConfig;

