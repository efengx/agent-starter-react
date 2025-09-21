import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/livekit/:path*',
        destination: 'http://8.219.68.173:7880/:path*',
      },
    ];
  },
};

export default nextConfig;
