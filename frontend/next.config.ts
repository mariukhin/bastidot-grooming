import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // /policy зустрічається в старих посиланнях і друкованих матеріалах —
  // ведемо на ту саму сторінку, щоб не ловити 404.
  redirects: async () => [{ source: '/policy', destination: '/privacy', permanent: true }],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
