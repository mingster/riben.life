import type { NextConfig } from "next";
import createMDX from '@next/mdx'

/** Set NEXT_BUILD_LOW_MEMORY=1 (e.g. in deploy.sh) on small VPS to reduce parallel work during `next build`. */
const lowMemoryBuild = process.env.NEXT_BUILD_LOW_MEMORY === "1";

const nextConfig: NextConfig = {
	pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],

	...(lowMemoryBuild
		? {
				experimental: {
					// Default staticGenerationMaxConcurrency is 8 — too heavy for 2–4 GB RAM + spawn ENOMEM
					staticGenerationMaxConcurrency: 1,
					cpus: 1,
				},
			}
		: {}),

	allowedDevOrigins: ["192.168.2.5", "localhost", "riben.life"],
	turbopack: {
		rules: {
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
		},
	},
	/* config options here */
	// lucide-react: rely on Next default `optimizePackageImports` (listing it here doubled work in dev)
	transpilePackages: ["better-auth"],
	//clientInstrumentationHook: true,
	serverExternalPackages: [
		"thread-stream",
		"pino",
		"pino-worker",
		"pino-file",
		"pino-pretty",
		"twilio",
		"pg",
		"prisma",
		"@prisma/client",
		"@prisma/adapter-pg",
	],
	// Build optimizations
	compiler: {
		// Remove console.logs in production
		removeConsole: process.env.NODE_ENV === "production",
	},
	// Server deploy: set NEXT_IGNORE_ESLINT=1 only if `next build` fails on ESLint (prefer fixing lint locally).
	// @ts-expect-error `eslint` is valid in next.config; NextConfig type may omit it in some versions.
	eslint: {
		ignoreDuringBuilds: process.env.NEXT_IGNORE_ESLINT === "1",
	},

	/*
	video: {
		formats: ["video/mp4", "video/webm", "video/ogg"],
		qualities: [25, 50, 75],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "youtu.be",
			},
		],
	},
	*/
	images: {
		formats: ["image/avif", "image/webp"],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		qualities: [25, 50, 75],
		remotePatterns: [
			{
				// google user avatar
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				// line user avatar
				protocol: "https",
				hostname: "profile.line-scdn.net",
				pathname: "**",
			},
			{
				// facebook user avatar
				protocol: "https",
				hostname: "platform-lookaside.fbsbx.com",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "tailwindui.com",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "res.cloudinary.com",
				pathname: "**",
			},
			{
				// google user avatar
				protocol: "https",
				hostname: "riben.life",
			},
		],
	},
} satisfies NextConfig;

const withMDX = createMDX({
	// Add markdown plugins here, as desired
	extension: /\.(md|mdx)$/,
})

// Merge MDX config with Next.js config
export default withMDX(nextConfig);