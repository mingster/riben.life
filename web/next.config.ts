import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['lucide-react'],
  serverExternalPackages: ["thread-stream",
    "pino",
    "pino-worker",
    "pino-file",
    "pino-pretty"],
  images: {
    //formats: ['image/avif', 'image/webp'],
    //imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    //qualities: [25, 50, 75],
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
};

export default nextConfig;
