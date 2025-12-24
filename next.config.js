/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.splitlease.co.uk',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-112aac78c28540e8804e41f113416d30.r2.dev',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
