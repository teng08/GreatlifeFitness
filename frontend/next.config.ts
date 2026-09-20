import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendOrigin = (process.env.BACKEND_ORIGIN || 'http://localhost:5000').replace(/\/+$/, '');
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactCompiler: false,
  turbopack: {
    root: frontendRoot,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.kym-cdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
