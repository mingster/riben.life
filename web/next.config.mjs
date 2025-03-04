import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react'],
  serverExternalPackages: ["thread-stream",
    "pino",
    "pino-worker",
    "pino-file",
    "pino-pretty"],
  experimental: {
    //ppr: true,  //https://nextjs.org/learn/dashboard-app/partial-prerendering
    //serverComponentsExternalPackages: ['pino', 'pino-pretty'],
    turbo: {
      resolveExtensions: [
        '.mdx',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json',
      ],
    }
  },
  images: {
    remotePatterns: [
      {
        // google user avatar
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        // line user avatar
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
        pathname: '**',
      },
      {
        // facebook user avatar
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'tailwindui.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**',
      },
    ],
  },
  reactStrictMode: true,
  //swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    } else {
      config.experiments = { ...config.experiments, topLevelAwait: true };
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }

    // Add path alias
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": ".",
    };

    return config;
  },
};

export default nextConfig;
//module.exports = nextConfig;
