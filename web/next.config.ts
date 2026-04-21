import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],

	async redirects() {
		const defaultStoreId = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID?.trim();
		if (defaultStoreId) {
			return [
				{
					source: "/customized",
					destination: `/shop/${defaultStoreId}/customized`,
					permanent: true,
				},
				{
					source: "/customized/:productId",
					destination: `/shop/${defaultStoreId}/p/:productId/customizer`,
					permanent: true,
				},
				{
					source: "/shop/customized/:productId",
					destination: `/shop/${defaultStoreId}/p/:productId/customizer`,
					permanent: true,
				},
			];
		}
		return [
			{
				source: "/customized",
				destination: "/shop",
				permanent: true,
			},
			{
				source: "/customized/:productId",
				destination: "/shop",
				permanent: true,
			},
			{
				source: "/shop/customized/:productId",
				destination: "/shop",
				permanent: true,
			},
		];
	},

	allowedDevOrigins: ["192.168.2.5", "*.192.168.2.5"],
	turbopack: {
		rules: {
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
			// MDX is compiled via webpack when using `next build` (default). When Turbopack is used
			// (e.g. some tooling paths), register the loader so dynamic imports from `blog/api.ts` work.
			"*.mdx": {
				loaders: ["@mdx-js/loader"],
				as: "*.tsx",
			},
		},
		ignoreIssue: [
			{
				path: /next\.config\.(t|j)s$/,
				title: /unexpected file in NFT list/i,
			},
		],
	},
	transpilePackages: ["lucide-react", "better-auth"],
	serverExternalPackages: [
		"thread-stream",
		"pino",
		"pino-worker",
		"pino-file",
		"pino-pretty",
		"pg",
		"prisma",
		"@prisma/client",
		"@prisma/adapter-pg",
		"@aws-sdk/client-s3",
		"@google-cloud/recaptcha-enterprise",
		"bcrypt",
		"nodemailer",
		"stripe",
		"twilio",
	],
	outputFileTracingExcludes: {
		"/*": [
			"./node_modules/@swc/core-darwin-arm64/**/*",
			"./node_modules/@swc/core-darwin-x64/**/*",
			"./node_modules/@swc/core-linux-arm64-gnu/**/*",
			"./node_modules/@swc/core-linux-arm64-musl/**/*",
			"./node_modules/@swc/core-linux-x64-musl/**/*",
			"./node_modules/@swc/core-win32-arm64-msvc/**/*",
			"./node_modules/@swc/core-win32-ia32-msvc/**/*",
			"./node_modules/@swc/core-win32-x64-msvc/**/*",
		],
	},
	images: {
		formats: ["image/avif", "image/webp"],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		qualities: [25, 50, 75],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				protocol: "https",
				hostname: "profile.line-scdn.net",
				pathname: "**",
			},
			{
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
				protocol: "https",
				hostname: "5ik.tv",
			},
			{
				protocol: "https",
				hostname: "*.s3.*.amazonaws.com",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "*.s3.dualstack.*.amazonaws.com",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "s3.amazonaws.com",
				pathname: "**",
			},
		],
	},
} satisfies NextConfig;

const withMDX = createMDX({
	extension: /\.(md|mdx)$/,
});

export default withMDX(nextConfig);
